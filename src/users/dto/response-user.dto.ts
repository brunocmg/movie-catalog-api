import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PaginationMetaDto } from '../../common/dto/pagination.dto';

export class ResponseUserDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Joao' })
  name: string;

  @ApiProperty({ example: 'joao@email.com' })
  email: string;

  @ApiProperty({ enum: Role, example: Role.USER })
  role: Role;

  @ApiProperty({ example: '1.png', nullable: true })
  avatar: string | null;

  @ApiProperty({ example: ['21', 'Fight Club'], type: [String] })
  watchedMovies: string[];
}

export class UserSummaryDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Joao' })
  name: string;

  @ApiProperty({ example: 'joao@email.com' })
  email: string;

  @ApiProperty({ enum: Role, example: Role.USER })
  role: Role;

  @ApiProperty({ example: true })
  active: boolean;

  @ApiProperty({ example: '2026-01-01T12:00:00.000Z' })
  createdAt: Date;
}

export class PaginatedUsersDto {
  @ApiProperty({ type: [UserSummaryDto] })
  data: UserSummaryDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
