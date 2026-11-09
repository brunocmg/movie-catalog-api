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

  @ApiProperty({ example: '2026-01-01T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-01T12:00:00.000Z' })
  updatedAt: Date;
}
