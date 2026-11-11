import { applyDecorators, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthTokenGuard } from '../guards/auth-token.guard';
import { OptionalAuthGuard } from '../guards/optional-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from './roles.decorator';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';

/** The route is public, but the user is loaded when a valid token is sent. */
export function OptionalAuth() {
  return applyDecorators(
    UseGuards(OptionalAuthGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({
      description: 'A token was sent but it is invalid or expired',
      type: ErrorResponseDto,
    }),
  );
}

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
