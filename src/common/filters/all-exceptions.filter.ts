import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

type PrismaKnownRequestError = {
  name: 'PrismaClientKnownRequestError';
  code: string;
  message?: string;
};

type HttpErrorResponse = {
  message?: string | string[];
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = this.getHttpExceptionMessage(res);
    } else if (this.isPrismaKnownRequestError(exception)) {
      const prismaError = exception;
      const code = prismaError.code;
      switch (code) {
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Resource not found';
          break;
        case 'P2002':
          status = HttpStatus.CONFLICT;
          message = 'Unique constraint failed';
          break;
        default:
          status = HttpStatus.BAD_REQUEST;
          message = prismaError.message ?? 'Database error';
      }
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }

  private isPrismaKnownRequestError(
    exception: unknown,
  ): exception is PrismaKnownRequestError {
    return (
      typeof exception === 'object' &&
      exception !== null &&
      'name' in exception &&
      'code' in exception &&
      (exception as PrismaKnownRequestError).name ===
        'PrismaClientKnownRequestError'
    );
  }

  private getHttpExceptionMessage(
    response: string | HttpErrorResponse,
  ): string {
    if (typeof response === 'string') {
      return response;
    }

    const message = response.message;

    if (Array.isArray(message)) {
      return message.join(', ');
    }

    return message ?? 'Request failed';
  }
}
