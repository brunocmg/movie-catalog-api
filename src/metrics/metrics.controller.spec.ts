import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

const build = (env: Record<string, unknown>) =>
  new MetricsController(
    { render: () => Promise.resolve('metrics') } as unknown as MetricsService,
    { get: (key: string) => env[key] } as unknown as ConfigService,
  );

describe('MetricsController', () => {
  it('serves the metrics when enabled without a token', async () => {
    await expect(build({}).scrape()).resolves.toBe('metrics');
  });

  it.each([false, 'false', ' FALSE '])(
    'is a 404 when disabled (%p)',
    async (v) => {
      await expect(
        build({ METRICS_ENABLED: v }).scrape(),
      ).rejects.toBeInstanceOf(NotFoundException);
    },
  );

  it('checks the bearer token when one is set', async () => {
    const controller = build({ METRICS_TOKEN: 'secret' });

    await expect(controller.scrape()).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(controller.scrape('Bearer nope')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(controller.scrape('Bearer secrets')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(controller.scrape('Bearer secret')).resolves.toBe('metrics');
  });
});
