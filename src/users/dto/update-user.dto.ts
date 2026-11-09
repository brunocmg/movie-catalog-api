import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

// E-mail changes are not supported: sending `email` is rejected with 400
// instead of being silently ignored.
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['email'] as const),
) {}
