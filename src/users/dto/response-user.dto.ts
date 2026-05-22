import { ApiProperty } from '@nestjs/swagger';

export class ResponseUserDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Joao' })
  name: string;

  @ApiProperty({ example: 'joao@email.com' })
  email: string;

  @ApiProperty({
    example: ['21', 'Fight Club'],
    type: [String],
  })
  watchedMovies: string[];
}

export class ResponseUpdateAvatarDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Joao' })
  name: string;

  @ApiProperty({ example: 'joao@email.com' })
  email: string;

  @ApiProperty({
    example: ['21', 'Fight Club'],
    type: [String],
  })
  watchedMovies: string[];

  @ApiProperty({
    example: '1.png',
    nullable: true,
  })
  avatar: string | null;
}
