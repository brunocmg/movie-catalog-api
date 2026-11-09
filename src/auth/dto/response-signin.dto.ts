import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class TokensDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Short-lived JWT for the Authorization: Bearer header',
  })
  accessToken: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType: 'Bearer';

  @ApiProperty({ example: 900, description: 'Access token lifetime (seconds)' })
  expiresIn: number;

  @ApiProperty({
    example: 'q3J9yXr3x6m0Lw1cJ8m5yJ0b9oVQ2bqvCq1o2s3t4u8',
    description:
      'Opaque token for POST /auth/refresh. Single use: every refresh returns a new one.',
  })
  refreshToken: string;

  @ApiProperty({ example: '2026-01-08T12:00:00.000Z' })
  refreshTokenExpiresAt: Date;
}

class SignedInUserDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Joao' })
  name: string;

  @ApiProperty({ example: 'joao@email.com' })
  email: string;

  @ApiProperty({ enum: Role, example: Role.USER })
  role: Role;
}

export class ResponseSignInDto extends TokensDto {
  @ApiProperty({ type: SignedInUserDto })
  user: SignedInUserDto;
}
