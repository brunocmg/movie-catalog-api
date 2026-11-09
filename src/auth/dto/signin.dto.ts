import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { NormalizeEmail } from '../../common/transformers/normalize-email.transformer';

export class SignInDto {
  @ApiProperty({
    example: 'joao@email.com',
    description: 'User email (case-insensitive)',
  })
  @NormalizeEmail()
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '123456',
    description: 'User password',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
