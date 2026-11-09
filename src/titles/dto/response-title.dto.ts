import { ApiProperty } from '@nestjs/swagger';
import { TitleType } from '@prisma/client';
import { PaginationMetaDto } from '../../common/dto/pagination.dto';

export class ResponseTitleDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ enum: TitleType, example: TitleType.MOVIE })
  type: TitleType;

  @ApiProperty({ example: 'Fight Club' })
  name: string;

  @ApiProperty({ example: 1999 })
  year: number;

  @ApiProperty({ example: 'David Fincher', nullable: true })
  director: string | null;

  @ApiProperty({ example: 'An insomniac office worker...', nullable: true })
  synopsis: string | null;

  @ApiProperty({
    example: 'https://image.tmdb.org/t/p/w500/poster.jpg',
    nullable: true,
  })
  posterUrl: string | null;

  @ApiProperty({ example: 139, nullable: true })
  runtimeMinutes: number | null;

  @ApiProperty({ type: [String], example: ['Drama', 'Thriller'] })
  genres: string[];

  @ApiProperty({ example: '2026-01-01T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-01T12:00:00.000Z' })
  updatedAt: Date;
}

export class PaginatedTitlesDto {
  @ApiProperty({ type: [ResponseTitleDto] })
  data: ResponseTitleDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
