import '@nestjs/platform-express';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { TestService } from './test.service';
import { TestModule } from './test.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import { CompressionProcessor } from 'src/compression/compression.processor';

// Response shapes
interface ErrorResponse {
  errors: string;
}

interface RegisterResponse {
  data: {
    email: string;
    name: string;
  };
}

interface LoginResponse {
  data: {
    email: string;
    name: string;
    access_token: string;
    refresh_token: string;
  };
}

interface TokenResponse {
  data: {
    access_token: string;
    refresh_token: string;
  };
}

interface LogoutResponse {
  data: boolean;
}

// Suite
describe('UsersController (e2e)', () => {
  let app: INestApplication<App>;
  let logger: Logger;
  let testService: TestService;

  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, TestModule],
    })
      .overrideProvider(CompressionProcessor)
      .useValue({ process: jest.fn() })
      .compile();

    app = moduleFixture.createNestApplication(new ExpressAdapter());
    await app.init();

    logger = app.get(WINSTON_MODULE_PROVIDER);
    testService = app.get(TestService);
  });

  afterAll(async () => {
    await app.close();
  });

  // POST /api/auth/register
  describe('POST /api/users/register', () => {
    beforeEach(async () => {
      await testService.deleteUser();
    });

    afterEach(async () => {
      await testService.deleteUser();
    });

    it('should be rejected if request body is invalid', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users/register')
        .send({ name: '', email: 'not-an-email', password: '123' });

      logger.info(res.body);

      expect(res.status).toBe(400);
      expect((res.body as ErrorResponse).errors).toBeDefined();
    });

    it('should be rejected if email is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users/register')
        .send({ name: 'test', password: 'test123' });

      logger.info(res.body);

      expect(res.status).toBe(400);
      expect((res.body as ErrorResponse).errors).toBeDefined();
    });

    it('should be rejected if password is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users/register')
        .send({ name: 'test', email: 'test@example.com' });

      logger.info(res.body);

      expect(res.status).toBe(400);
      expect((res.body as ErrorResponse).errors).toBeDefined();
    });

    it('should be able to register', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users/register')
        .send({
          name: TestService.USER_NAME,
          email: TestService.USER_EMAIL,
          password: TestService.USER_PASSWORD,
        });

      logger.info(res.body);

      expect(res.status).toBe(201);
      const body = res.body as RegisterResponse;
      expect(body.data.email).toBe(TestService.USER_EMAIL);
      expect(body.data.name).toBe(TestService.USER_NAME);
    });

    it('should be rejected if email already exists', async () => {
      await testService.createUser();

      const res = await request(app.getHttpServer())
        .post('/api/users/register')
        .send({
          name: TestService.USER_NAME,
          email: TestService.USER_EMAIL,
          password: TestService.USER_PASSWORD,
        });

      logger.info(res.body);

      expect(res.status).toBe(409);
      expect((res.body as ErrorResponse).errors).toBeDefined();
    });
  });

  // POST /api/users/login
  describe('POST /api/users/login', () => {
    beforeEach(async () => {
      await testService.deleteUser();
      await testService.createUser();
    });

    afterEach(async () => {
      await testService.deleteUser();
    });

    it('should be rejected if request body is invalid', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({ email: '', password: '' });

      logger.info(res.body);

      expect(res.status).toBe(400);
      expect((res.body as ErrorResponse).errors).toBeDefined();
    });

    it('should be rejected if email is not found', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({
          email: 'nobody@example.com',
          password: TestService.USER_PASSWORD,
        });

      logger.info(res.body);

      expect(res.status).toBe(409);
      expect((res.body as ErrorResponse).errors).toBeDefined();
    });

    it('should be rejected if password is wrong', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({ email: TestService.USER_EMAIL, password: 'wrongpassword' });

      logger.info(res.body);

      expect(res.status).toBe(409);
      expect((res.body as ErrorResponse).errors).toBeDefined();
    });

    it('should be able to login and return tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({
          email: TestService.USER_EMAIL,
          password: TestService.USER_PASSWORD,
        });

      logger.info(res.body);

      expect(res.status).toBe(200);
      const body = res.body as LoginResponse;
      expect(body.data.email).toBe(TestService.USER_EMAIL);
      expect(body.data.name).toBe(TestService.USER_NAME);
      expect(body.data.access_token).toBeDefined();
      expect(body.data.refresh_token).toBeDefined();

      accessToken = body.data.access_token;
      refreshToken = body.data.refresh_token;
    });
  });

  // POST /api/users/refresh
  describe('POST /api/users/refresh', () => {
    beforeEach(async () => {
      await testService.deleteUser();
      await testService.createUser();

      // Login to get fresh tokens
      const loginRes = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({
          email: TestService.USER_EMAIL,
          password: TestService.USER_PASSWORD,
        });

      const body = loginRes.body as LoginResponse;
      accessToken = body.data.access_token;
      refreshToken = body.data.refresh_token;
    });

    afterEach(async () => {
      await testService.deleteUser();
    });

    it('should be rejected if no token is provided', async () => {
      const res = await request(app.getHttpServer()).post('/api/users/refresh');

      logger.info(res.body);

      expect(res.status).toBe(401);
      expect((res.body as ErrorResponse).errors).toBeDefined();
    });

    it('should be rejected if refresh token is invalid', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users/refresh')
        .set('Authorization', 'Bearer invalidtoken');

      logger.info(res.body);

      expect(res.status).toBe(401);
      expect((res.body as ErrorResponse).errors).toBeDefined();
    });

    it('should be rejected if access token is used instead of refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users/refresh')
        .set('Authorization', `Bearer ${accessToken}`);

      logger.info(res.body);

      // Access token must not be accepted on the refresh endpoint
      expect([401, 403]).toContain(res.status);
      expect((res.body as ErrorResponse).errors).toBeDefined();
    });

    it('should return new tokens with a valid refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users/refresh')
        .set('Authorization', `Bearer ${refreshToken}`);

      logger.info(res.body);

      expect(res.status).toBe(200);
      const body = res.body as TokenResponse;
      expect(body.data.access_token).toBeDefined();
      expect(body.data.refresh_token).toBeDefined();
    });
  });

  // POST /api/users/logout
  describe('POST /api/users/logout', () => {
    beforeEach(async () => {
      await testService.deleteUser();
      await testService.createUser();

      const loginRes = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({
          email: TestService.USER_EMAIL,
          password: TestService.USER_PASSWORD,
        });

      const body = loginRes.body as LoginResponse;
      accessToken = body.data.access_token;
    });

    afterEach(async () => {
      await testService.deleteUser();
    });

    it('should be rejected if no token is provided', async () => {
      const res = await request(app.getHttpServer()).post('/api/users/logout');

      logger.info(res.body);

      expect(res.status).toBe(401);
      expect((res.body as ErrorResponse).errors).toBeDefined();
    });

    it('should be rejected if access token is invalid', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users/logout')
        .set('Authorization', 'Bearer invalidtoken');

      logger.info(res.body);

      expect(res.status).toBe(401);
      expect((res.body as ErrorResponse).errors).toBeDefined();
    });

    it('should be able to logout successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      logger.info(res.body);

      expect(res.status).toBe(200);
      expect((res.body as LogoutResponse).data).toBe(true);
    });

    it('should be rejected if token is used again after logout (blacklisted)', async () => {
      // First logout — should succeed
      await request(app.getHttpServer())
        .post('/api/users/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      // Second logout with same token — token is now blacklisted
      const res = await request(app.getHttpServer())
        .post('/api/users/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      logger.info(res.body);

      expect(res.status).toBe(401);
      expect((res.body as ErrorResponse).errors).toBeDefined();
    });
  });
});
