import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateMovieDto {
  @ApiProperty({
    example: 'Fight Club',
    description: 'Movie title',
  })
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @ApiPropertyOptional({
    example: 'Drama',
    description: 'Movie genre',
  })
  @IsOptional()
  @IsString()
  readonly genre?: string;

  @ApiPropertyOptional({
    example: 'David Fincher',
    description: 'Movie director',
  })
  @IsOptional()
  @IsString()
  readonly director?: string;

  @ApiProperty({
    example: 1999,
    description: 'Movie release year',
    minimum: 1888,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1888)
  readonly year: number;
}
