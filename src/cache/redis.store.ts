import { Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { CacheStore } from './cache.store';

const COMMAND_TIMEOUT_MS = 500;

export class RedisStore extends CacheStore {
  private readonly logger = new Logger('Cache');
  private readonly client: Redis;

  constructor(url: string) {
    super();
    this.client = new Redis(url, {
      // a slow or dead Redis must never hold a request
      commandTimeout: COMMAND_TIMEOUT_MS,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (attempt) => Math.min(attempt * 500, 5000),
    });
    this.client.on('error', (err: Error) =>
      this.logger.warn(`Redis: ${err.message}`),
    );
  }

  get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    let cursor = '0';
    do {
      const [next, keys] = await this.client.scan(
        cursor,
        'MATCH',
        `${prefix}*`,
        'COUNT',
        200,
      );
      cursor = next;
      if (keys.length > 0) await this.client.unlink(...keys);
    } while (cursor !== '0');
  }

  async close(): Promise<void> {
    await this.client.quit().catch(() => this.client.disconnect());
  }
}
