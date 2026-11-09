import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trimStrings = ({ value }: { value: unknown }): unknown =>
  Array.isArray(value)
    ? value.map((v: unknown) => (typeof v === 'string' ? v.trim() : v))
    : value;

export class CreateTitleDto {
  @ApiProperty({ example: 'Fight Club' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  readonly name: string;

  @ApiProperty({ example: 1999, minimum: 1888, maximum: 2100 })
  @Type(() => Number)
  @IsInt()
  @Min(1888)
  @Max(2100)
  readonly year: number;

  @ApiPropertyOptional({ example: 'David Fincher' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  readonly director?: string;

  @ApiPropertyOptional({ example: 'An insomniac office worker...' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  readonly synopsis?: string;

  @ApiPropertyOptional({
    example: 'https://image.tmdb.org/t/p/w500/poster.jpg',
  })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  readonly posterUrl?: string;

  @ApiPropertyOptional({
    example: 139,
    description: 'Movie duration, or the usual episode duration for a series',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  readonly runtimeMinutes?: number;

  @ApiPropertyOptional({
    type: [String],
    example: ['Drama', 'Thriller'],
    description:
      'Genre names. Unknown genres are created. On update, replaces the list.',
  })
  @IsOptional()
  @Transform(trimStrings)
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(50, { each: true })
  readonly genres?: string[];
}
