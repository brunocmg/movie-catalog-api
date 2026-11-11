import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationMetaDto } from '../../common/dto/pagination.dto';
import { ResponseTitleDto } from '../../titles/dto/response-title.dto';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateListDto {
  @ApiProperty({ example: 'Sunday night classics', maxLength: 100 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly name: string;

  @ApiPropertyOptional({
    example: 'Old movies for a slow evening',
    maxLength: 500,
    description: 'An empty text clears it',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  readonly description?: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Public lists can be read by anyone',
  })
  @IsOptional()
  @IsBoolean()
  readonly isPublic?: boolean;
}

export class UpdateListDto extends PartialType(CreateListDto) {}

export class ListOwnerDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Joao' })
  name: string;
}

export class ListDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Sunday night classics' })
  name: string;

  @ApiProperty({ example: 'Old movies for a slow evening', nullable: true })
  description: string | null;

  @ApiProperty({ example: true })
  isPublic: boolean;

  @ApiProperty({ example: 12 })
  itemCount: number;

  @ApiProperty({ type: ListOwnerDto })
  owner: ListOwnerDto;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PaginatedListsDto {
  @ApiProperty({ type: [ListDto] })
  data: ListDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

export class ListItemDto {
  @ApiProperty({ type: ResponseTitleDto })
  title: ResponseTitleDto;

  @ApiProperty()
  addedAt: Date;
}

export class PaginatedListItemsDto {
  @ApiProperty({ type: [ListItemDto] })
  data: ListItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
