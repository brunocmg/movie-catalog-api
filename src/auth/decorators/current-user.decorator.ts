import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  AuthenticatedRequest,
  AuthenticatedUser,
} from '../types/authenticated-user';

/** Injects the user loaded by AuthTokenGuard. Only valid on @Auth() routes. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const { user } = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!user) {
      // A route used @CurrentUser() without @Auth(): a programming error.
      throw new InternalServerErrorException('Authenticated user not found');
    }

    return user;
  },
);
