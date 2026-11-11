import { ApiProperty } from '@nestjs/swagger';

export class ResponseEpisodeDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  seasonId: number;

  @ApiProperty({ example: 1 })
  number: number;

  @ApiProperty({ example: 'Pilot' })
  name: string;

  @ApiProperty({ example: 58, nullable: true })
  runtimeMinutes: number | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ResponseSeasonDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  titleId: number;

  @ApiProperty({ example: 1 })
  number: number;

  @ApiProperty({ example: 'Season 1', nullable: true })
  name: string | null;

  @ApiProperty({ example: 7 })
  episodeCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
