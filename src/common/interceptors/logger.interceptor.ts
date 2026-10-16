import {
  ExecutionContext,
  NestInterceptor,
  CallHandler,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggerInterceptor.name);

  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> | Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url } = request;
    const now = Date.now();

    this.logger.log(`[REQUEST] ${method} ${url} - Inicio da req`);

    return next.handle().pipe(
      tap(() => {
        this.logger.log(`[RESPONSE] ${method} ${url} - ${Date.now() - now}ms`);
      }),
    );
  }
}
