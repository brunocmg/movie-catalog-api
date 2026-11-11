import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { TitleQueryDto } from '../titles/dto/title-query.dto';
import { WatchHistoryService } from './watch-history.service';
import {
  PaginatedWatchedDto,
  WatchedEpisodeDto,
  WatchedTitleDto,
} from './dto/watched.dto';

@ApiTags('watch-history')
@Controller('me/watched')
@Auth()
export class WatchHistoryController {
  constructor(private readonly history: WatchHistoryService) {}

  @Get()
  @ApiOperation({
    summary: 'List watched movies and series (most recent first)',
  })
  @ApiOkResponse({ type: PaginatedWatchedDto })
  @ApiBadRequestResponse({
    description: 'Invalid query params',
    type: ErrorResponseDto,
  })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() { type, ...pagination }: TitleQueryDto,
  ) {
    return this.history.list(user.id, pagination, type);
  }

  @Put('episodes/:episodeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Mark an episode as watched (idempotent)',
    description: 'Also adds the series to the watched list.',
  })
  @ApiNoContentResponse({ description: 'Episode marked as watched' })
  @ApiNotFoundResponse({
    description: 'Episode not found',
    type: ErrorResponseDto,
  })
  markEpisode(
    @CurrentUser() user: AuthenticatedUser,
    @Param('episodeId', ParseIdPipe) episodeId: number,
  ) {
    return this.history.markEpisode(user.id, episodeId);
  }

  @Delete('episodes/:episodeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Unmark an episode (idempotent)',
    description:
      'The series leaves the watched list when its last episode is unmarked.',
  })
  @ApiNoContentResponse({ description: 'Episode unmarked' })
  @ApiNotFoundResponse({
    description: 'Episode not found',
    type: ErrorResponseDto,
  })
  unmarkEpisode(
    @CurrentUser() user: AuthenticatedUser,
    @Param('episodeId', ParseIdPipe) episodeId: number,
  ) {
    return this.history.unmarkEpisode(user.id, episodeId);
  }

  @Get(':titleId')
  @ApiOperation({ summary: 'Get a watched title, with progress for series' })
  @ApiOkResponse({ type: WatchedTitleDto })
  @ApiNotFoundResponse({
    description: 'Title not marked as watched',
    type: ErrorResponseDto,
  })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('titleId', ParseIdPipe) titleId: number,
  ) {
    return this.history.findOne(user.id, titleId);
  }

  @Get(':titleId/episodes')
  @ApiOperation({ summary: 'List the episodes of a series with watched flag' })
  @ApiOkResponse({ type: [WatchedEpisodeDto] })
  @ApiNotFoundResponse({
    description: 'Series not found',
    type: ErrorResponseDto,
  })
  listEpisodes(
    @CurrentUser() user: AuthenticatedUser,
    @Param('titleId', ParseIdPipe) titleId: number,
  ) {
    return this.history.listEpisodes(user.id, titleId);
  }

  @Put(':titleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Mark a movie or a whole series as watched (idempotent)',
  })
  @ApiNoContentResponse({ description: 'Title marked as watched' })
  @ApiNotFoundResponse({
    description: 'Title not found',
    type: ErrorResponseDto,
  })
  mark(
    @CurrentUser() user: AuthenticatedUser,
    @Param('titleId', ParseIdPipe) titleId: number,
  ) {
    return this.history.markTitle(user.id, titleId);
  }

  @Delete(':titleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Unmark a title and all its episodes (idempotent)',
  })
  @ApiNoContentResponse({ description: 'Title unmarked' })
  unmark(
    @CurrentUser() user: AuthenticatedUser,
    @Param('titleId', ParseIdPipe) titleId: number,
  ) {
    return this.history.unmarkTitle(user.id, titleId);
  }
}
