import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Priority } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationMetaDto } from '../../common/dto/pagination.dto';
import { ResponseTitleDto } from '../../titles/dto/response-title.dto';

export class AddToWatchlistDto {
  @ApiPropertyOptional({
    enum: Priority,
    description: 'Omit to keep the current priority',
  })
  @IsOptional()
  @IsEnum(Priority)
  readonly priority?: Priority;
}

export class WatchlistItemDto {
  @ApiProperty({ type: ResponseTitleDto })
  title: ResponseTitleDto;

  @ApiProperty({ enum: Priority, nullable: true })
  priority: Priority | null;

  @ApiProperty()
  addedAt: Date;
}

export class PaginatedWatchlistDto {
  @ApiProperty({ type: [WatchlistItemDto] })
  data: WatchlistItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
