import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { MetricsService } from '../metrics/metrics.service';
import { CacheStore } from './cache.store';

export const CACHE_PREFIX = 'catalog:';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);

  constructor(
    private readonly store: CacheStore,
    private readonly ttlSeconds: number,
    private readonly metrics?: MetricsService,
  ) {}

  /**
   * Returns the cached value or runs the loader and caches its result.
   * A failing store only costs the cache: the loader still answers.
   */
  async wrap<T>(key: string, loader: () => Promise<T>): Promise<T> {
    const fullKey = CACHE_PREFIX + key;

    try {
      const cached = await this.store.get(fullKey);
      if (cached !== null) {
        this.metrics?.cacheResult('hit');
        return JSON.parse(cached) as T;
      }
      this.metrics?.cacheResult('miss');
    } catch (err) {
      this.metrics?.cacheResult('error');
      this.logger.warn(`Read failed for ${key}: ${String(err)}`);
    }

    const value = await loader();
    try {
      await this.store.set(fullKey, JSON.stringify(value), this.ttlSeconds);
    } catch (err) {
      this.logger.warn(`Write failed for ${key}: ${String(err)}`);
    }
    return value;
  }

  /** Drops every cached catalog entry. Called after any write that changes it. */
  async invalidate(): Promise<void> {
    try {
      await this.store.deleteByPrefix(CACHE_PREFIX);
    } catch (err) {
      // entries still expire by TTL
      this.logger.warn(`Invalidation failed: ${String(err)}`);
    }
  }

  onModuleDestroy(): Promise<void> {
    return this.store.close();
  }
}
