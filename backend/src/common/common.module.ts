import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis/redis.service';
import { ValidationService } from './validation/validation.service';
import { DatabaseService } from './database/database.service';
import { WinstonModule } from 'nest-winston';
import winston from 'winston';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { ErrorFilter } from './error/error.filter';
import { UuidUtils } from './utils/uuid.utils';
import { S3Service } from './s3/s3.service';

@Global()
@Module({
  imports: [
    WinstonModule.forRoot({
      level: 'debug',
      format: winston.format.json(),
      transports: [new winston.transports.Console()],
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        options: {
          host: configService.get('REDIS_HOST'),
          port: configService.get<number>('REDIS_PORT'),
          db: configService.get<number>('REDIS_DB'),
        },
      }),
    }),
  ],
  providers: [
    DatabaseService,
    RedisService,
    ValidationService,
    UuidUtils,
    {
      provide: APP_FILTER,
      useClass: ErrorFilter,
    },
    S3Service,
  ],
  exports: [
    RedisService,
    ValidationService,
    DatabaseService,
    UuidUtils,
    S3Service,
  ],
})
export class CommonModule {}
