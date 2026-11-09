import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ example: 'q3J9yXr3x6m0Lw1cJ8m5yJ0b9oVQ2bqvCq1o2s3t4u8' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  refreshToken: string;
}
