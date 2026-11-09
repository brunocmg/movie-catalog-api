import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';

/**
 * Global pipes and filters shared by main.ts and the E2E tests, so the tests
 * exercise the same request pipeline as production.
 */
export function setupApp(app: INestApplication): INestApplication {
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
