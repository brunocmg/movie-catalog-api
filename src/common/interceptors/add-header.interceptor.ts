import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';

@Injectable()
export class AddHeaderInterceptior implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> | Promise<Observable<unknown>> {
    const response = context.switchToHttp().getResponse<Response>();

    response.setHeader('X-Custom', 'Valor chave 123');

    return next.handle();
  }
}
