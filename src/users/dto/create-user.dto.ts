import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { NormalizeEmail } from '../../common/transformers/normalize-email.transformer';

export class CreateUserDto {
  @ApiProperty({
    example: 'Joao',
    description: 'User name',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'joao@example.com',
    description: 'User email (stored lower-cased)',
  })
  @NormalizeEmail()
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '123456',
    description: 'User password (6 to 72 characters)',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  // bcrypt ignores everything after 72 bytes
  @MaxLength(72)
  @IsNotEmpty()
  password: string;
}
