import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { ConfigService } from '@nestjs/config';
import type { Params } from 'nestjs-pino';
import { EnvironmentVariables, NodeEnv } from '../../config/env.validation';

export const REQUEST_ID_HEADER = 'x-request-id';

// Accept an upstream id only if it is short and harmless to log.
const SAFE_ID = /^[A-Za-z0-9._-]{1,64}$/;

export function requestIdFor(req: IncomingMessage): string {
  const incoming = req.headers[REQUEST_ID_HEADER];
  return typeof incoming === 'string' && SAFE_ID.test(incoming)
    ? incoming
    : randomUUID();
}

export function loggerOptions(
  config: ConfigService<EnvironmentVariables, true>,
): Params {
  const isDevelopment =
    config.get('NODE_ENV', { infer: true }) === NodeEnv.Development;

  return {
    pinoHttp: {
      level: config.get('LOG_LEVEL', { infer: true }),
      transport: isDevelopment
        ? { target: 'pino-pretty', options: { singleLine: true } }
        : undefined,
      genReqId: (req: IncomingMessage, res: ServerResponse) => {
        const id = requestIdFor(req);
        res.setHeader(REQUEST_ID_HEADER, id);
        return id;
      },
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      autoLogging: {
        ignore: (req) => req.url === '/health',
      },
      serializers: {
        req: (req: { id: string; method: string; url: string }) => ({
          id: req.id,
          method: req.method,
          url: req.url,
        }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    },
  };
}
