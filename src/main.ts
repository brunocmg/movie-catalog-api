import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { setupApp } from './app/app.setup';
import { EnvironmentVariables } from './config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  const config =
    app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);

  setupApp(app);
  app.enableShutdownHooks();

  if (config.get('SWAGGER_ENABLED', { infer: true })) {
    const document = new DocumentBuilder()
      .setTitle('Movie Catalog API')
      .setDescription('Movies, users and watch history')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    SwaggerModule.setup('docs', app, () =>
      SwaggerModule.createDocument(app, document),
    );
  }

  await app.listen(config.get('PORT', { infer: true }));
}
void bootstrap();
