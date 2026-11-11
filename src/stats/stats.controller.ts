import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { TitleQueryDto } from '../titles/dto/title-query.dto';
import { StatsService } from './stats.service';
import { RecommendationsService } from './recommendations.service';
import { PaginatedRecommendationsDto, StatsDto } from './dto/stats.dto';

@ApiTags('stats')
@Controller('me')
@Auth()
export class StatsController {
  constructor(
    private readonly stats: StatsService,
    private readonly recommendations: RecommendationsService,
  ) {}

  @Get('stats')
  @ApiOperation({
    summary: 'My watch stats: totals, time watched, top genres, ratings',
  })
  @ApiOkResponse({ type: StatsDto })
  getStats(@CurrentUser() user: AuthenticatedUser) {
    return this.stats.getStats(user.id);
  }

  @Get('recommendations')
  @ApiOperation({
    summary: 'Titles I have not watched, ranked by my taste and the ratings',
    description:
      'The taste profile comes from what I watched, favorited and rated. Without history it falls back to the best rated titles.',
  })
  @ApiOkResponse({ type: PaginatedRecommendationsDto })
  @ApiBadRequestResponse({
    description: 'Invalid query params',
    type: ErrorResponseDto,
  })
  recommend(
    @CurrentUser() user: AuthenticatedUser,
    @Query() { type, ...pagination }: TitleQueryDto,
  ) {
    return this.recommendations.list(user.id, pagination, type);
  }
}
