import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { createPool, PoolConnection, ResultSetHeader } from 'mysql2/promise';
import type { Pool } from 'mysql2/promise';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private configService: ConfigService,
  ) {}

  onModuleInit() {
    this.pool = createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 2,
    });
    this.logger.info('Database pool initialized');
  }

  async onModuleDestroy() {
    await this.pool.end();
    this.logger.info('Database pool closed');
  }

  // Query with rows as results
  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const [rows] = await this.pool.execute(sql, params);
    return rows as T[];
  }

  // Queries for INSERT / UPDATE / DELETE return metadata
  async execute(sql: string, params?: any[]): Promise<ResultSetHeader> {
    const [result] = await this.pool.execute(sql, params);
    return result as ResultSetHeader;
  }

  // Transaction helper
  async transaction<T>(
    callback: (conn: PoolConnection) => Promise<T>,
  ): Promise<T> {
    const conn = await this.pool.getConnection();
    await conn.beginTransaction();
    try {
      const result = await callback(conn);
      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}
