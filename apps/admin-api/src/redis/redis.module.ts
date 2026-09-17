import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS = Symbol('REDIS');

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      useFactory: () => {
        const url = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
        return new Redis(url, {
          maxRetriesPerRequest: 1,
          lazyConnect: true,
          enableOfflineQueue: false,
          connectTimeout: 1500,
        });
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}

export async function withRedisLock<T>(
  redis: Redis,
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<T> {
  const token = `${Date.now()}-${Math.random()}`;
  const acquired = await redis.set(key, token, 'PX', ttlMs, 'NX');
  if (acquired !== 'OK') {
    throw new Error('LOCK_NOT_ACQUIRED');
  }
  try {
    return await fn();
  } finally {
    const current = await redis.get(key);
    if (current === token) await redis.del(key);
  }
}
