import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthTokenGuard } from './auth-token.guard';
import { AuthenticatedRequest } from '../types/authenticated-user';

/** Lets anonymous requests through; a token that is sent must still be valid. */
@Injectable()
export class OptionalAuthGuard extends AuthTokenGuard {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.headers.authorization) return true;
    return super.canActivate(context);
  }
}
