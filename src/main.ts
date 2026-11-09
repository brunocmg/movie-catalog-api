import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { setupApp } from './app/app.setup';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT ?? 3000);

  app.enableCors({
    origin: '*',
  });

  setupApp(app);

  const configSwagger = new DocumentBuilder()
    .setTitle('Movies List')
    .setDescription('Movies list API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const documentFactory = () =>
    SwaggerModule.createDocument(app, configSwagger);
  SwaggerModule.setup('docs', app, documentFactory);

  await app.listen(port);
}
void bootstrap();
