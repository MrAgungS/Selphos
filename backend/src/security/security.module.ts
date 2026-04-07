import { getRedisConnectionToken } from '@nestjs-modules/ioredis';
import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import Redis from 'ioredis';
import { ThrottlerRedisStorage } from './service/throttler-redis.storage';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtBlacklistService } from './service/jwt-blacklist.service';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
    ThrottlerModule.forRootAsync({
      inject: [getRedisConnectionToken()],
      useFactory: (redis: Redis) => ({
        throttlers: [
          { name: 'default', ttl: 60000, limit: 60 },
          { name: 'strict', ttl: 60000, limit: 5 },
        ],
        storage: new ThrottlerRedisStorage(redis),
      }),
    }),
  ],
  providers: [
    JwtStrategy,
    JwtRefreshStrategy,
    JwtBlacklistService,
    ThrottlerRedisStorage,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [JwtModule, JwtBlacklistService],
})
export class SecurityModule {}
