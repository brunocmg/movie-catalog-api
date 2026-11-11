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
import { PaginationDto } from '../common/dto/pagination.dto';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { TitleQueryDto } from '../titles/dto/title-query.dto';
import { RatingsService } from './ratings.service';
import {
  PaginatedMyRatingsDto,
  PaginatedReviewsDto,
  RateTitleDto,
  RatingDto,
} from './dto/rating.dto';

@ApiTags('ratings')
@Controller('me/ratings')
@Auth()
export class MyRatingsController {
  constructor(private readonly ratings: RatingsService) {}

  @Get()
  @ApiOperation({ summary: 'List my ratings (most recently changed first)' })
  @ApiOkResponse({ type: PaginatedMyRatingsDto })
  @ApiBadRequestResponse({
    description: 'Invalid query params',
    type: ErrorResponseDto,
  })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() { type, ...pagination }: TitleQueryDto,
  ) {
    return this.ratings.listMine(user.id, pagination, type);
  }

  @Get(':titleId')
  @ApiOperation({ summary: 'Get my rating of a title' })
  @ApiOkResponse({ type: RatingDto })
  @ApiNotFoundResponse({
    description: 'Title not rated',
    type: ErrorResponseDto,
  })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('titleId', ParseIdPipe) titleId: number,
  ) {
    return this.ratings.findMine(user.id, titleId);
  }

  @Put(':titleId')
  @ApiOperation({
    summary: 'Rate a title from 1 to 10, with an optional review',
    description:
      'One rating per user and title. Sending it again replaces the score and the review.',
  })
  @ApiOkResponse({ type: RatingDto })
  @ApiBadRequestResponse({
    description: 'Invalid id or body',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Title not found',
    type: ErrorResponseDto,
  })
  rate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('titleId', ParseIdPipe) titleId: number,
    @Body() dto: RateTitleDto,
  ) {
    return this.ratings.rate(user.id, titleId, dto);
  }

  @Delete(':titleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove my rating (idempotent)' })
  @ApiNoContentResponse({ description: 'Title is not rated' })
  @ApiBadRequestResponse({ description: 'Invalid id', type: ErrorResponseDto })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('titleId', ParseIdPipe) titleId: number,
  ) {
    return this.ratings.remove(user.id, titleId);
  }
}

@ApiTags('ratings')
@Controller('titles/:id/reviews')
export class ReviewsController {
  constructor(private readonly ratings: RatingsService) {}

  @Get()
  @ApiOperation({ summary: 'List the written reviews of a title' })
  @ApiOkResponse({ type: PaginatedReviewsDto })
  @ApiBadRequestResponse({
    description: 'Invalid id or query params',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Title not found',
    type: ErrorResponseDto,
  })
  list(
    @Param('id', ParseIdPipe) id: number,
    @Query() pagination: PaginationDto,
  ) {
    return this.ratings.listReviews(id, pagination);
  }
}
