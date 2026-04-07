import { InjectRedis } from '@nestjs-modules/ioredis';
import { Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import Redis from 'ioredis';

@Injectable()
export class ThrottlerRedisStorage implements ThrottlerStorage {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  // Called on every incoming request to track and enforce rate limits.
  async increment(key: string, ttl: number): Promise<ThrottlerStorageRecord> {
    const fullKey = `throttle:${key}`;

    const totalHits = await this.redis.incr(fullKey);

    if (totalHits === 1) {
      await this.redis.pexpire(fullKey, ttl);
    }
    const timeToExpire = await this.redis.pttl(fullKey);

    return {
      totalHits,
      timeToExpire,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }
}
