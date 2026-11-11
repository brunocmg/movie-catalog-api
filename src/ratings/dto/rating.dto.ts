import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationMetaDto } from '../../common/dto/pagination.dto';
import { ResponseTitleDto } from '../../titles/dto/response-title.dto';

export class RateTitleDto {
  @ApiProperty({ example: 9, minimum: 1, maximum: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  readonly score: number;

  @ApiPropertyOptional({
    example: 'Still holds up.',
    maxLength: 2000,
    description: 'Omitting it (or sending an empty text) clears the review',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(2000)
  readonly review?: string;
}

export class RatingDto {
  @ApiProperty({ example: 1 })
  titleId: number;

  @ApiProperty({ example: 9 })
  score: number;

  @ApiProperty({ example: 'Still holds up.', nullable: true })
  review: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class MyRatingDto extends RatingDto {
  @ApiProperty({ type: ResponseTitleDto })
  title: ResponseTitleDto;
}

export class PaginatedMyRatingsDto {
  @ApiProperty({ type: [MyRatingDto] })
  data: MyRatingDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

export class ReviewAuthorDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Joao' })
  name: string;
}

export class ReviewDto {
  @ApiProperty({ type: ReviewAuthorDto })
  user: ReviewAuthorDto;

  @ApiProperty({ example: 9 })
  score: number;

  @ApiProperty({ example: 'Still holds up.' })
  review: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PaginatedReviewsDto {
  @ApiProperty({ type: [ReviewDto] })
  data: ReviewDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
