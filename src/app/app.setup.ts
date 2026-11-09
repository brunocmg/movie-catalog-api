import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Express } from 'express';
import helmet from 'helmet';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { EnvironmentVariables, NodeEnv } from '../config/env.validation';

/**
 * HTTP hardening, global pipes and filters shared by main.ts and the E2E
 * tests, so the tests exercise the same request pipeline as production.
 */
export function setupApp(app: INestApplication): INestApplication {
  const config =
    app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);

  // Behind Render/Nginx the client IP comes from X-Forwarded-For. Rate
  // limiting would otherwise see every request as coming from the proxy.
  const express = app.getHttpAdapter().getInstance() as Express;
  express.set('trust proxy', config.get('TRUST_PROXY', { infer: true }));
  express.disable('x-powered-by');

  const nodeEnv = config.get('NODE_ENV', { infer: true });
  const isProduction = nodeEnv === NodeEnv.Production;

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          // Only upgrade to HTTPS where it exists. Over plain HTTP it would
          // break Swagger UI assets.
          upgradeInsecureRequests: isProduction ? [] : null,
        },
      },
    }),
  );

  const cors = corsOrigin(config.get('CORS_ORIGINS', { infer: true }), nodeEnv);
  if (cors !== undefined) app.enableCors({ origin: cors });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  return app;
}

/**
 * CORS_ORIGINS="*"               -> any origin
 * CORS_ORIGINS="https://a,https://b" -> only those
 * unset                          -> any origin outside production,
 *                                   CORS disabled in production
 */
export function corsOrigin(
  value: string | undefined,
  nodeEnv: NodeEnv,
): string | string[] | boolean | undefined {
  const origins = (value ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    return nodeEnv === NodeEnv.Production ? undefined : true;
  }
  if (origins.includes('*')) return '*';
  return origins;
}
