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
import { FavoritesService } from './favorites.service';
import { PaginatedFavoritesDto } from './dto/favorite.dto';

@ApiTags('favorites')
@Controller('me/favorites')
@Auth()
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'List favorites (most recent first)' })
  @ApiOkResponse({ type: PaginatedFavoritesDto })
  @ApiBadRequestResponse({
    description: 'Invalid query params',
    type: ErrorResponseDto,
  })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() { type, ...pagination }: TitleQueryDto,
  ) {
    return this.favorites.list(user.id, pagination, type);
  }

  @Put(':titleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Add a title to the favorites (idempotent)' })
  @ApiNoContentResponse({ description: 'Title is a favorite' })
  @ApiBadRequestResponse({ description: 'Invalid id', type: ErrorResponseDto })
  @ApiNotFoundResponse({
    description: 'Title not found',
    type: ErrorResponseDto,
  })
  add(
    @CurrentUser() user: AuthenticatedUser,
    @Param('titleId', ParseIdPipe) titleId: number,
  ) {
    return this.favorites.add(user.id, titleId);
  }

  @Delete(':titleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a title from the favorites (idempotent)' })
  @ApiNoContentResponse({ description: 'Title is not a favorite' })
  @ApiBadRequestResponse({ description: 'Invalid id', type: ErrorResponseDto })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('titleId', ParseIdPipe) titleId: number,
  ) {
    return this.favorites.remove(user.id, titleId);
  }
}
