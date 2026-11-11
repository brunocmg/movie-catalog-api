import { ApiProperty } from '@nestjs/swagger';
import { TitleType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class TmdbSearchQueryDto {
  @ApiProperty({ example: 'fight club', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  q: string;

  @ApiProperty({ enum: TitleType })
  @IsEnum(TitleType)
  type: TitleType;
}

export class ImportTmdbDto {
  @ApiProperty({ example: 550, description: 'Id on themoviedb.org' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly tmdbId: number;

  @ApiProperty({
    enum: TitleType,
    description: 'TMDB ids are only unique within a type',
  })
  @IsEnum(TitleType)
  readonly type: TitleType;
}

export class TmdbSearchResultDto {
  @ApiProperty({ example: 550 })
  tmdbId: number;

  @ApiProperty({ enum: TitleType })
  type: TitleType;

  @ApiProperty({ example: 'Fight Club' })
  name: string;

  @ApiProperty({ example: 1999, nullable: true })
  year: number | null;

  @ApiProperty({ nullable: true })
  overview: string | null;

  @ApiProperty({ nullable: true })
  posterUrl: string | null;
}

export class CastMemberDto {
  @ApiProperty({ example: 'Brad Pitt' })
  name: string;

  @ApiProperty({ example: 'Tyler Durden', nullable: true })
  character: string | null;

  @ApiProperty({ example: 0 })
  position: number;

  @ApiProperty({ nullable: true })
  profileUrl: string | null;
}
