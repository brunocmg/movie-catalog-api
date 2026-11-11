import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/dto/pagination.dto';
import { ResponseTitleDto } from '../../titles/dto/response-title.dto';

export class WatchedCountsDto {
  @ApiProperty({ example: 42 })
  movies: number;

  @ApiProperty({
    example: 5,
    description: 'Series with at least one episode watched',
  })
  series: number;

  @ApiProperty({ example: 120 })
  episodes: number;
}

export class WatchTimeDto {
  @ApiProperty({ example: 9870 })
  minutes: number;

  @ApiProperty({ example: 164.5, description: 'Minutes in hours, one decimal' })
  hours: number;
}

export class TopGenreDto {
  @ApiProperty({ example: 'Drama' })
  name: string;

  @ApiProperty({ example: 'drama' })
  slug: string;

  @ApiProperty({ example: 17, description: 'Watched titles in this genre' })
  count: number;
}

export class RatingsGivenDto {
  @ApiProperty({ example: 30 })
  count: number;

  @ApiProperty({ example: 7.6, nullable: true })
  average: number | null;
}

export class StatsDto {
  @ApiProperty({ type: WatchedCountsDto })
  watched: WatchedCountsDto;

  @ApiProperty({
    type: WatchTimeDto,
    description:
      'Movies plus watched episodes. An episode without a runtime uses the series runtime.',
  })
  watchTime: WatchTimeDto;

  @ApiProperty({
    type: [TopGenreDto],
    description: 'Up to 5, most watched first',
  })
  topGenres: TopGenreDto[];

  @ApiProperty({ type: RatingsGivenDto })
  ratings: RatingsGivenDto;
}

export class RecommendationDto {
  @ApiProperty({ type: ResponseTitleDto })
  title: ResponseTitleDto;

  @ApiProperty({ example: 2.41, description: 'Higher is a better match' })
  score: number;

  @ApiProperty({
    type: [String],
    example: ['Drama', 'Crime'],
    description: 'Genres of this title that match the taste profile',
  })
  because: string[];
}

export class PaginatedRecommendationsDto {
  @ApiProperty({ type: [RecommendationDto] })
  data: RecommendationDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
