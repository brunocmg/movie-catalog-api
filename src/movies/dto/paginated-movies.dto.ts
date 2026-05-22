import { ApiProperty } from '@nestjs/swagger';
import { ResponseMovieDto } from './response-movie.dto';

class PaginationMetaDto {
  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 0 })
  offset: number;

  @ApiProperty({ example: 25 })
  total: number;
}

export class PaginatedMoviesDto {
  @ApiProperty({ type: [ResponseMovieDto] })
  data: ResponseMovieDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
