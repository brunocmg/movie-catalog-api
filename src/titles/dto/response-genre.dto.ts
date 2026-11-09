import { ApiProperty } from '@nestjs/swagger';

export class ResponseGenreDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Science Fiction' })
  name: string;

  @ApiProperty({ example: 'science-fiction' })
  slug: string;
}
