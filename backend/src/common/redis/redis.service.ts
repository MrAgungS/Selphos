import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { InjectRedis } from '@nestjs-modules/ioredis';

@Injectable()
export class RedisService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @InjectRedis() private readonly redis: Redis,
  ) {
    // Log connection events from the injected Redis instance
    this.redis.on('connect', () => {
      this.logger.info('Redis connected');
    });
    this.redis.on('error', (err) => {
      this.logger.error('Redis error', { error: err.message });
    });
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redis.set(key, value, 'EX', ttl);
    } else {
      await this.redis.set(key, value);
    }
  }
  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }
  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
