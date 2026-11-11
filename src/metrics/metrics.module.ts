import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

@Global()
@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule implements NestModule {
  constructor(private readonly metrics: MetricsService) {}

  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply((req: Request, res: Response, next: NextFunction) => {
        const start = process.hrtime.bigint();
        res.on('finish', () => {
          // the matched pattern keeps ids out of the labels
          const route = req.route as { path?: string } | undefined;
          if (!route?.path || route.path === '/metrics') return;

          const seconds = Number(process.hrtime.bigint() - start) / 1e9;
          this.metrics.observeRequest(
            req.method,
            `${req.baseUrl}${route.path}`,
            res.statusCode,
            seconds,
          );
        });
        next();
      })
      .forRoutes('*');
  }
}
