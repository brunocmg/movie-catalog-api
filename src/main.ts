import { NestFactory } from '@nestjs/core';
import { MoviesModule } from './movies/movies.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(MoviesModule);
  new ValidationPipe({
    whitelist: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
