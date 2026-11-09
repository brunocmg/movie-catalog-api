import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Express } from 'express';
import helmet from 'helmet';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { EnvironmentVariables, NodeEnv } from '../config/env.validation';

export function setupApp(app: INestApplication): INestApplication {
  const config =
    app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);

  const express = app.getHttpAdapter().getInstance() as Express;
  // real client IP for rate limiting behind Render
  express.set('trust proxy', config.get('TRUST_PROXY', { infer: true }));
  express.disable('x-powered-by');

  const nodeEnv = config.get('NODE_ENV', { infer: true });
  const isProduction = nodeEnv === NodeEnv.Production;

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          upgradeInsecureRequests: isProduction ? [] : null, // breaks Swagger over plain http
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
