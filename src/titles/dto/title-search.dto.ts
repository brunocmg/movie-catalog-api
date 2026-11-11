import { ApiPropertyOptional } from '@nestjs/swagger';
import { TitleType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export enum TitleSortBy {
  Id = 'id',
  Name = 'name',
  Year = 'year',
  CreatedAt = 'createdAt',
}

export enum SortOrder {
  Asc = 'asc',
  Desc = 'desc',
}

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class TitleSearchDto extends PaginationDto {
  @ApiPropertyOptional({
    example: 'fight',
    description: 'Case-insensitive search in the name',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({
    example: 'sci-fi',
    description: 'Genre slug or name (see GET /genres)',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  genre?: string;

  @ApiPropertyOptional({ example: 1999, description: 'Exact year' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1888)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({ example: 1990, description: 'From this year' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1888)
  @Max(2100)
  yearFrom?: number;

  @ApiPropertyOptional({ example: 1999, description: 'Up to this year' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1888)
  @Max(2100)
  yearTo?: number;

  @ApiPropertyOptional({ enum: TitleSortBy, default: TitleSortBy.Id })
  @IsOptional()
  @IsEnum(TitleSortBy)
  sortBy?: TitleSortBy;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.Asc })
  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder;
}

export class ListTitlesQueryDto extends TitleSearchDto {
  @ApiPropertyOptional({ enum: TitleType })
  @IsOptional()
  @IsEnum(TitleType)
  type?: TitleType;
}
