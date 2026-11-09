import { applyDecorators, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthTokenGuard } from '../guards/auth-token.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from './roles.decorator';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';

/**
 * Requires a valid bearer token and, when roles are given, one of them.
 *
 *   @Auth()            any authenticated user
 *   @Auth(Role.ADMIN)  admins only
 */
export function Auth(...roles: Role[]) {
  const decorators = [
    UseGuards(AuthTokenGuard, RolesGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({
      description: 'Missing, invalid or expired token',
      type: ErrorResponseDto,
    }),
  ];

  if (roles.length > 0) {
    decorators.push(
      Roles(...roles),
      ApiForbiddenResponse({
        description: `Requires role: ${roles.join(' or ')}`,
        type: ErrorResponseDto,
      }),
    );
  }

  return applyDecorators(...decorators);
}
