import {
  ExecutionContext,
  NestInterceptor,
  CallHandler,
  Injectable,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';

type RequestWithUser = Request & {
  user?: unknown;
};

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> | Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const method = request.method;
    const url = request.url;
    const now = Date.now();

    console.log(request.user);
    console.log(`[REQUEST] ${method} ${url} - Inicio da req`);

    return next.handle().pipe(
      tap(() => {
        console.log(`[RESPONSE] ${method} ${url} - ${Date.now() - now}ms`);
      }),
    );
  }
}
