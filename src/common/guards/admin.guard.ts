import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';

type RequestWithUser = Request & {
  user?: {
    role?: string;
  };
};

@Injectable()
export class AuthAdminGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    console.log(request.user);

    if (request.user?.role === 'admin') return true;

    return false;
  }
}
