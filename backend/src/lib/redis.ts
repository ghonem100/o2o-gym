import Redis from 'ioredis';
import logger from '../utils/logger';

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    // Upstash (and other managed Redis) use the rediss:// scheme over TLS.
    const useTls = url.startsWith('rediss://');
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      ...(useTls ? { tls: {} } : {}),
    });

    redisClient.on('connect', () => logger.info('Redis connected'));
    redisClient.on('error', (err) => logger.error('Redis error', { err }));
  }
  return redisClient;
}

export async function connectRedis(): Promise<void> {
  const client = getRedis();
  await client.connect();
}

export async function setCache(
  key: string,
  value: unknown,
  ttlSeconds?: number
): Promise<void> {
  const client = getRedis();
  const serialized = JSON.stringify(value);
  if (ttlSeconds) {
    await client.setex(key, ttlSeconds, serialized);
  } else {
    await client.set(key, serialized);
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  const client = getRedis();
  const value = await client.get(key);
  if (!value) return null;
  return JSON.parse(value) as T;
}

export async function deleteCache(key: string): Promise<void> {
  await getRedis().del(key);
}

export async function deleteCachePattern(pattern: string): Promise<void> {
  const client = getRedis();
  const keys = await client.keys(pattern);
  if (keys.length > 0) {
    await client.del(...keys);
  }
}
