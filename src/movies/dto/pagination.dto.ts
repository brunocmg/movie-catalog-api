import { Type } from 'class-transformer';
import { IsOptional, IsPositive, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
  @ApiPropertyOptional({
    example: 10,
    minimum: 1,
    description: 'Maximum number of movies returned',
  })
  @Type(() => Number)
  @IsOptional()
  @IsPositive()
  limit?: number;

  @ApiPropertyOptional({
    example: 0,
    minimum: 0,
    description: 'Number of movies skipped before returning results',
  })
  @Type(() => Number)
  @IsOptional()
  @Min(0)
  offset?: number;
}
