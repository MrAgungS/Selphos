import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from 'src/common/redis/redis.service';

@Injectable()
export class JwtBlacklistService {
  constructor(
    private redisService: RedisService,
    private readonly jwt: JwtService,
  ) {}

  // This ensures the blacklist entry is automatically cleaned up when the token expires.
  async blackListToken(token: string): Promise<void> {
    const decoded = this.jwt.decode<{ exp: number }>(token);
    const now = Math.floor(Date.now() / 1000);
    const ttl = decoded.exp - now;

    if (ttl > 0) {
      await this.redisService.set(`blacklist:${token}`, '1', ttl);
    }
  }
  async IsBlackListed(token: string): Promise<boolean> {
    const result = await this.redisService.get(`blacklist:${token}`);
    return result !== null;
  }
}
