import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/dto/pagination.dto';
import { ResponseTitleDto } from '../../titles/dto/response-title.dto';

export class ProgressDto {
  @ApiProperty({ example: 3 })
  watched: number;

  @ApiProperty({ example: 7 })
  total: number;
}

export class WatchedTitleDto {
  @ApiProperty({ type: ResponseTitleDto })
  title: ResponseTitleDto;

  @ApiProperty()
  watchedAt: Date;

  @ApiProperty({
    type: ProgressDto,
    nullable: true,
    description: 'Episodes watched out of the total. Null for movies.',
  })
  progress: ProgressDto | null;
}

export class PaginatedWatchedDto {
  @ApiProperty({ type: [WatchedTitleDto] })
  data: WatchedTitleDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

export class WatchedEpisodeDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  seasonNumber: number;

  @ApiProperty({ example: 1 })
  number: number;

  @ApiProperty({ example: 'Pilot' })
  name: string;

  @ApiProperty({ example: true })
  watched: boolean;
}
