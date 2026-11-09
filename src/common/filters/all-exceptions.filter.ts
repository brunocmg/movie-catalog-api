import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { STATUS_CODES } from 'node:http';
import {
  isPrismaKnownError,
  PrismaErrorCode,
} from '../../prisma/prisma-errors';

export type ErrorResponseBody = {
  statusCode: number;
  error: string;
  message: string;
  path: string;
  timestamp: string;
};

type ResolvedError = { status: number; message: string };

/**
 * Turns every exception into the same JSON shape.
 *
 * - HttpException: status and message are kept.
 * - Known Prisma errors (unique, FK, not found): mapped to 409/404 with a
 *   generic message. Driver details never reach the client.
 * - Anything else: 500 with a generic message, logged with the stack trace.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message } = this.resolve(exception);
    this.log(exception, status, request);

    const body: ErrorResponseBody = {
      statusCode: status,
      error: STATUS_CODES[status] ?? 'Error',
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(body);
  }

  private resolve(exception: unknown): ResolvedError {
    if (exception instanceof HttpException) {
      return {
        status: exception.getStatus(),
        message: this.httpExceptionMessage(exception),
      };
    }

    if (isPrismaKnownError(exception)) {
      switch (exception.code) {
        case PrismaErrorCode.UniqueConstraint:
          return {
            status: HttpStatus.CONFLICT,
            message: 'Resource already exists',
          };
        case PrismaErrorCode.ForeignKeyConstraint:
          return {
            status: HttpStatus.CONFLICT,
            message: 'Operation conflicts with related resources',
          };
        case PrismaErrorCode.RecordNotFound:
          return {
            status: HttpStatus.NOT_FOUND,
            message: 'Resource not found',
          };
      }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    };
  }

  private log(exception: unknown, status: number, request: Request) {
    const route = `${request.method} ${request.url}`;

    if (status >= 500) {
      this.logger.error(
        `${route} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
      return;
    }

    // Prisma errors that became 4xx usually mean a missing explicit check in a
    // service, so they are worth a warning. Regular 4xx are expected traffic.
    if (isPrismaKnownError(exception)) {
      this.logger.warn(`${route} -> ${status} (prisma ${exception.code})`);
    }
  }

  private httpExceptionMessage(exception: HttpException): string {
    const res = exception.getResponse();

    if (typeof res === 'string') return res;

    const message = (res as { message?: unknown }).message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;

    return exception.message;
  }
}
