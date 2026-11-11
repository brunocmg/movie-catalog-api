import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/dto/pagination.dto';
import { ResponseTitleDto } from '../../titles/dto/response-title.dto';

export class FavoriteDto {
  @ApiProperty({ type: ResponseTitleDto })
  title: ResponseTitleDto;

  @ApiProperty()
  favoritedAt: Date;
}

export class PaginatedFavoritesDto {
  @ApiProperty({ type: [FavoriteDto] })
  data: FavoriteDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
