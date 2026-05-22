import { ApiProperty } from '@nestjs/swagger';

export class ResponseSignInDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Joao' })
  name: string;

  @ApiProperty({ example: 'joao@email.com' })
  email: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  token: string;
}
