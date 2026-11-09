import { ApiPropertyOptional } from '@nestjs/swagger';
import { TitleType } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class TitleQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: TitleType })
  @IsOptional()
  @IsEnum(TitleType)
  type?: TitleType;
}
