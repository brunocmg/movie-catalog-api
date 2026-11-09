import { ApiProperty } from '@nestjs/swagger';
import { ResponseMovieDto } from './response-movie.dto';
import { PaginationMetaDto } from '../../common/dto/pagination.dto';

export class PaginatedMoviesDto {
  @ApiProperty({ type: [ResponseMovieDto] })
  data: ResponseMovieDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
