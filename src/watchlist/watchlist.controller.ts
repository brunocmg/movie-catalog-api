import {
  Body,
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
import { WatchlistService } from './watchlist.service';
import { AddToWatchlistDto, PaginatedWatchlistDto } from './dto/watchlist.dto';

@ApiTags('watchlist')
@Controller('me/watchlist')
@Auth()
export class WatchlistController {
  constructor(private readonly watchlist: WatchlistService) {}

  @Get()
  @ApiOperation({
    summary: 'List the watchlist (highest priority first, then most recent)',
  })
  @ApiOkResponse({ type: PaginatedWatchlistDto })
  @ApiBadRequestResponse({
    description: 'Invalid query params',
    type: ErrorResponseDto,
  })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() { type, ...pagination }: TitleQueryDto,
  ) {
    return this.watchlist.list(user.id, pagination, type);
  }

  @Put(':titleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Add a title to the watchlist or change its priority',
    description:
      'Idempotent. Marking the title as watched removes it from the watchlist.',
  })
  @ApiNoContentResponse({ description: 'Title is on the watchlist' })
  @ApiBadRequestResponse({
    description: 'Invalid id or priority',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Title not found',
    type: ErrorResponseDto,
  })
  add(
    @CurrentUser() user: AuthenticatedUser,
    @Param('titleId', ParseIdPipe) titleId: number,
    @Body() dto: AddToWatchlistDto,
  ) {
    return this.watchlist.add(user.id, titleId, dto.priority);
  }

  @Delete(':titleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a title from the watchlist (idempotent)' })
  @ApiNoContentResponse({ description: 'Title is not on the watchlist' })
  @ApiBadRequestResponse({ description: 'Invalid id', type: ErrorResponseDto })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('titleId', ParseIdPipe) titleId: number,
  ) {
    return this.watchlist.remove(user.id, titleId);
  }
}
