import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSeasonDto {
  @ApiProperty({ example: 1, minimum: 0, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  readonly number: number;

  @ApiPropertyOptional({ example: 'Season 1' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  readonly name?: string;
}

export class UpdateSeasonDto extends PartialType(CreateSeasonDto) {}
