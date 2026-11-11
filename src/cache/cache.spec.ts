import { CacheService } from './cache.service';
import { CacheStore } from './cache.store';
import { MemoryStore } from './memory.store';
import { RedisStore } from './redis.store';

const redisClient = {
  get: jest.fn(),
  set: jest.fn(),
  scan: jest.fn(),
  unlink: jest.fn(),
  quit: jest.fn(),
  disconnect: jest.fn(),
  on: jest.fn(),
};
jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn(() => redisClient),
}));

describe('MemoryStore', () => {
  afterEach(() => jest.useRealTimers());

  it('returns what was stored until the ttl runs out', async () => {
    jest.useFakeTimers();
    const store = new MemoryStore();
    await store.set('a', '1', 10);

    expect(await store.get('a')).toBe('1');
    jest.advanceTimersByTime(10_001);
    expect(await store.get('a')).toBeNull();
  });

  it('deletes by prefix and keeps the rest', async () => {
    const store = new MemoryStore();
    await store.set('catalog:a', '1', 60);
    await store.set('catalog:b', '2', 60);
    await store.set('other:c', '3', 60);

    await store.deleteByPrefix('catalog:');

    expect(await store.get('catalog:a')).toBeNull();
    expect(await store.get('catalog:b')).toBeNull();
    expect(await store.get('other:c')).toBe('3');
  });

  it('evicts the oldest entry when full', async () => {
    const store = new MemoryStore();
    for (let i = 0; i <= 1000; i++) await store.set(`k${i}`, 'v', 60);

    expect(await store.get('k0')).toBeNull();
    expect(await store.get('k1000')).toBe('v');
  });
});

describe('RedisStore', () => {
  let store: RedisStore;

  beforeEach(() => {
    jest.clearAllMocks();
    redisClient.quit.mockResolvedValue('OK');
    store = new RedisStore('redis://localhost:6379');
  });

  it('writes with an expiry', async () => {
    redisClient.set.mockResolvedValue('OK');

    await store.set('k', 'v', 30);

    expect(redisClient.set).toHaveBeenCalledWith('k', 'v', 'EX', 30);
  });

  it('walks the whole keyspace when deleting by prefix', async () => {
    redisClient.scan
      .mockResolvedValueOnce(['7', ['catalog:a', 'catalog:b']])
      .mockResolvedValueOnce(['0', ['catalog:c']]);
    redisClient.unlink.mockResolvedValue(1);

    await store.deleteByPrefix('catalog:');

    expect(redisClient.scan).toHaveBeenNthCalledWith(
      2,
      '7',
      'MATCH',
      'catalog:*',
      'COUNT',
      200,
    );
    expect(redisClient.unlink).toHaveBeenCalledWith('catalog:a', 'catalog:b');
    expect(redisClient.unlink).toHaveBeenCalledWith('catalog:c');
  });

  it('does not log redis errors as crashes', () => {
    const calls = redisClient.on.mock.calls as [string, (e: Error) => void][];
    const onError = calls.find(([event]) => event === 'error');

    expect(onError).toBeDefined();
    expect(() => onError?.[1](new Error('x'))).not.toThrow();
  });
});

describe('CacheService', () => {
  const metrics = { cacheResult: jest.fn() };
  const store = {
    get: jest.fn(),
    set: jest.fn(),
    deleteByPrefix: jest.fn(),
    close: jest.fn(),
  };
  let cache: CacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    cache = new CacheService(
      store as unknown as CacheStore,
      120,
      metrics as never,
    );
  });

  it('runs the loader on a miss and stores the result under the prefix', async () => {
    store.get.mockResolvedValue(null);
    const loader = jest.fn().mockResolvedValue({ id: 1 });

    expect(await cache.wrap('titles:one:1', loader)).toEqual({ id: 1 });

    expect(store.set).toHaveBeenCalledWith(
      'catalog:titles:one:1',
      '{"id":1}',
      120,
    );
    expect(metrics.cacheResult).toHaveBeenCalledWith('miss');
  });

  it('serves a hit without running the loader', async () => {
    store.get.mockResolvedValue('{"id":1}');
    const loader = jest.fn();

    expect(await cache.wrap('k', loader)).toEqual({ id: 1 });

    expect(loader).not.toHaveBeenCalled();
    expect(metrics.cacheResult).toHaveBeenCalledWith('hit');
  });

  it('does not cache a loader that throws', async () => {
    store.get.mockResolvedValue(null);

    await expect(
      cache.wrap('k', () => Promise.reject(new Error('404'))),
    ).rejects.toThrow('404');
    expect(store.set).not.toHaveBeenCalled();
  });

  it('still answers when the store is down', async () => {
    store.get.mockRejectedValue(new Error('down'));
    store.set.mockRejectedValue(new Error('down'));
    store.deleteByPrefix.mockRejectedValue(new Error('down'));

    expect(await cache.wrap('k', () => Promise.resolve(5))).toBe(5);
    await expect(cache.invalidate()).resolves.toBeUndefined();
    expect(metrics.cacheResult).toHaveBeenCalledWith('error');
  });

  it('invalidates every catalog key', async () => {
    await cache.invalidate();

    expect(store.deleteByPrefix).toHaveBeenCalledWith('catalog:');
  });
});
