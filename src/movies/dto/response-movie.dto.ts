import { ApiProperty } from '@nestjs/swagger';

export class ResponseMovieDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '21' })
  name: string;

  @ApiProperty({ example: 'Drama', nullable: true })
  genre: string | null;

  @ApiProperty({ example: 'Robert Luketic', nullable: true })
  director: string | null;

  @ApiProperty({ example: 2008 })
  year: number;
}
