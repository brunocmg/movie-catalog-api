import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { join } from 'node:path';
import { MoviesModule } from '../movies/movies.module';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { HealthModule } from '../health/health.module';
import { LoggerInterceptor } from '../common/interceptors/logger.interceptor';
import { throttlerOptions } from '../common/throttling/throttling';
import { validateEnv } from '../config/env.validation';

const nodeEnv = process.env.NODE_ENV ?? 'development';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Tests read only .env.test so they never touch the dev database.
      envFilePath:
        nodeEnv === 'test' ? ['.env.test'] : [`.env.${nodeEnv}`, '.env'],
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: throttlerOptions,
    }),
    MoviesModule,
    UsersModule,
    AuthModule,
    HealthModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'files'),
      serveRoot: '/files',
    }),
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggerInterceptor },
  ],
})
export class AppModule {}
