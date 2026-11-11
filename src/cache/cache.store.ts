export abstract class CacheStore {
  /** Returns the raw value, or null when missing or expired. */
  abstract get(key: string): Promise<string | null>;

  abstract set(key: string, value: string, ttlSeconds: number): Promise<void>;

  /** Removes every key that starts with the prefix. */
  abstract deleteByPrefix(prefix: string): Promise<void>;

  async close(): Promise<void> {}
}
