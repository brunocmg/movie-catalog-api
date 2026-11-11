import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetricsService } from '../metrics/metrics.service';
import { CacheService } from './cache.service';
import { CacheStore } from './cache.store';
import { MemoryStore } from './memory.store';
import { RedisStore } from './redis.store';

@Global()
@Module({
  providers: [
    {
      provide: CacheStore,
      inject: [ConfigService],
      useFactory: (config: ConfigService): CacheStore => {
        const url = config.get<string>('REDIS_URL');
        return url ? new RedisStore(url) : new MemoryStore();
      },
    },
    {
      provide: CacheService,
      inject: [CacheStore, ConfigService, MetricsService],
      useFactory: (
        store: CacheStore,
        config: ConfigService,
        metrics: MetricsService,
      ) =>
        new CacheService(
          store,
          config.get<number>('CACHE_TTL_SECONDS') ?? 120,
          metrics,
        ),
    },
  ],
  exports: [CacheService],
})
export class CacheModule {}
