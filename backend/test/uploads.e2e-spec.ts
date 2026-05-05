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

interface InitiateUploadResponse {
  data: {
    upload_id: string;
    file_id: string;
    presigned_url: string;
    expires_at: string;
  };
}

interface ConfirmUploadResponse {
  data: {
    version_id: string;
    compression_status: 'pending' | 'skipped';
  };
}

interface UploadStatusResponse {
  data: {
    upload_id: string;
    upload_status: string;
    version_id: string | null;
    compression_status: string | null;
    created_at: string;
    updated_at: string;
  };
}

// Helpers
async function loginAndGetToken(app: INestApplication<App>): Promise<string> {
  const res = await request(app.getHttpServer()).post('/api/users/login').send({
    email: TestService.USER_EMAIL,
    password: TestService.USER_PASSWORD,
  });
  return (res.body as { data: { access_token: string } }).data.access_token;
}

// Suite

describe('UploadsController (e2e)', () => {
  let app: INestApplication<App>;
  let logger: Logger;
  let testService: TestService;

  let accessToken: string;
  let userId: string;

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

  // POST /api/s3/uploads/initiate  — Initiate Upload
  describe('POST /api/s3/uploads/initiate', () => {
    beforeEach(async () => {
      await testService.deleteUser();
      userId = await testService.createUser();
      accessToken = await loginAndGetToken(app);
    });

    afterEach(async () => {
      await testService.deleteUser();
    });

    it('should be rejected if no token is provided', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/s3/uploads/initiate')
        .send({
          filename: 'photo.jpg',
          mime_type: 'image/jpeg',
          size: 2048576,
        });

      logger.info(res.body);

      expect(res.status).toBe(401);
      expect((res.body as ErrorResponse).errors).toBeDefined();
    });

    it('should be rejected when required fields are missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/s3/uploads/initiate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ filename: '' }); // mime_type and size missing

      logger.info(res.body);

      expect(res.status).toBe(400);
      expect((res.body as ErrorResponse).errors).toBeDefined();
    });

    it('should initiate a brand-new upload (no file_id)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/s3/uploads/initiate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          filename: 'photo.jpg',
          mime_type: 'image/jpeg',
          size: 2048576,
        });

      logger.info(res.body);

      expect(res.status).toBe(201);
      const body = res.body as InitiateUploadResponse;
      expect(body.data.upload_id).toBeDefined();
      expect(body.data.file_id).toBeDefined();
      expect(body.data.presigned_url).toBeDefined();
      expect(body.data.expires_at).toBeDefined();
    });

    it('should initiate a new version upload for an existing file', async () => {
      const { file_id } = await testService.createFile(userId);

      const res = await request(app.getHttpServer())
        .post('/api/s3/uploads/initiate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          filename: 'photo_v2.jpg',
          mime_type: 'image/jpeg',
          size: 1024000,
          file_id,
        });

      logger.info(res.body);

      expect(res.status).toBe(201);
      const body = res.body as InitiateUploadResponse;
      expect(body.data.file_id).toBe(file_id);
      expect(body.data.presigned_url).toBeDefined();
    });

    it('should be rejected if file_id does not belong to the user', async () => {
      const fakeFileId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app.getHttpServer())
        .post('/api/s3/uploads/initiate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          filename: 'photo.jpg',
          mime_type: 'image/jpeg',
          size: 2048576,
          file_id: fakeFileId,
        });

      logger.info(res.body);

      // The service should reject with 403 or 404 for unknown file_id
      expect([403, 404]).toContain(res.status);
      expect((res.body as ErrorResponse).errors).toBeDefined();
    });
  });

  // POST /api/s3/uploads/:upload_id/confirm  — Confirm Upload
  describe('POST /api/s3/uploads/:upload_id/confirm', () => {
    let upload_id: string;
    let file_id: string;

    // Valid confirm payload
    const confirmBody = {
      filename: 'photo.jpg',
      mime_type: 'image/jpeg',
      size: 2048576,
      etag: '686897696a7c876b7e',
    };

    beforeEach(async () => {
      await testService.deleteUser();
      userId = await testService.createUser();
      accessToken = await loginAndGetToken(app);

      // Seed a file and a fresh INITIATED upload linked to it
      ({ file_id } = await testService.createFile(userId));
      upload_id = await testService.createUpload(userId, file_id);
    });

    afterEach(async () => {
      await testService.deleteUser();
    });

    it('should be rejected if no token is provided', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/s3/uploads/${upload_id}/confirm`)
        .send(confirmBody);

      logger.info(res.body);

      expect(res.status).toBe(401);
    });

    it('should return 404 if upload_id does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .post(`/api/s3/uploads/${fakeId}/confirm`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(confirmBody);

      logger.info(res.body);

      expect(res.status).toBe(404);
      expect((res.body as ErrorResponse).errors).toBeDefined();
    });

    it('should return 409 if upload is already confirmed', async () => {
      const completedUploadId = await testService.createUpload(
        userId,
        file_id,
        {
          status: 'COMPLETED',
        },
      );

      const res = await request(app.getHttpServer())
        .post(`/api/s3/uploads/${completedUploadId}/confirm`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(confirmBody);

      logger.info(res.body);

      expect(res.status).toBe(409);
      expect((res.body as ErrorResponse).errors).toBeDefined();
    });

    it('should return 410 if upload has expired', async () => {
      const expiredUploadId = await testService.createExpiredUpload(userId);

      const res = await request(app.getHttpServer())
        .post(`/api/s3/uploads/${expiredUploadId}/confirm`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(confirmBody);

      logger.info(res.body);

      expect(res.status).toBe(410);
      expect((res.body as ErrorResponse).errors).toBeDefined();
    });

    it('should confirm a valid upload (compressible mime → pending)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/s3/uploads/${upload_id}/confirm`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(confirmBody);

      logger.info(res.body);

      expect(res.status).toBe(201);
      const body = res.body as ConfirmUploadResponse;
      expect(body.data.version_id).toBeDefined();
      // Image is compressible — compression should be queued
      expect(body.data.compression_status).toBe('pending');
    });

    it('should confirm a valid upload (non-compressible mime → skipped)', async () => {
      // Seed an upload for a PDF file
      const { file_id: pdfFileId } = await testService.createFile(userId, {
        filename: 'doc.pdf',
        mime_type: 'application/pdf',
      });
      const pdfUploadId = await testService.createUpload(userId, pdfFileId);

      const res = await request(app.getHttpServer())
        .post(`/api/s3/uploads/${pdfUploadId}/confirm`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          filename: 'doc.pdf',
          mime_type: 'application/pdf',
          size: 512000,
          etag: 'etag-pdf-001',
        });

      logger.info(res.body);

      expect(res.status).toBe(201);
      const body = res.body as ConfirmUploadResponse;
      expect(body.data.compression_status).toBe('skipped');
    });
  });

  // GET /api/s3/uploads/:upload_id/status  — Get Upload Status
  describe('GET /api/s3/uploads/:upload_id/status', () => {
    let upload_id: string;
    let file_id: string;

    beforeEach(async () => {
      await testService.deleteUser();
      userId = await testService.createUser();
      accessToken = await loginAndGetToken(app);
      ({ file_id } = await testService.createFile(userId));
      upload_id = await testService.createUpload(userId, file_id);
    });

    afterEach(async () => {
      await testService.deleteUser();
    });

    it('should be rejected if no token is provided', async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/s3/uploads/${upload_id}/status`,
      );

      logger.info(res.body);

      expect(res.status).toBe(401);
    });

    it('should return 404 if upload_id does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .get(`/api/s3/uploads/${fakeId}/status`)
        .set('Authorization', `Bearer ${accessToken}`);

      logger.info(res.body);

      expect(res.status).toBe(404);
      expect((res.body as ErrorResponse).errors).toBeDefined();
    });

    it('should return INITIATED status for a fresh upload', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/s3/uploads/${upload_id}/status`)
        .set('Authorization', `Bearer ${accessToken}`);

      logger.info(res.body);

      expect(res.status).toBe(200);
      const body = res.body as UploadStatusResponse;
      expect(body.data.upload_id).toBe(upload_id);
      expect(body.data.upload_status).toBe('INITIATED');
      expect(body.data.created_at).toBeDefined();
    });

    it('should return COMPLETED status after confirmation', async () => {
      // Create a fresh INITIATED upload and confirm it via the API
      const freshUploadId = await testService.createUpload(userId, file_id);

      await request(app.getHttpServer())
        .post(`/api/s3/uploads/${freshUploadId}/confirm`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          filename: 'photo.jpg',
          mime_type: 'image/jpeg',
          size: 2048576,
          etag: '686897696a7c876b7e',
        });

      const res = await request(app.getHttpServer())
        .get(`/api/s3/uploads/${freshUploadId}/status`)
        .set('Authorization', `Bearer ${accessToken}`);

      logger.info(res.body);

      expect(res.status).toBe(200);
      const body = res.body as UploadStatusResponse;
      expect(body.data.upload_status).toBe('COMPLETED');
      expect(body.data.version_id).toBeDefined();
      expect(body.data.compression_status).toBeDefined();
    });

    it('should include version_id and compression_status when upload is completed', async () => {
      const completedUploadId = await testService.createUpload(
        userId,
        file_id,
        {
          status: 'COMPLETED',
        },
      );

      const res = await request(app.getHttpServer())
        .get(`/api/s3/uploads/${completedUploadId}/status`)
        .set('Authorization', `Bearer ${accessToken}`);

      logger.info(res.body);

      expect(res.status).toBe(200);
      const body = res.body as UploadStatusResponse;
      expect(body.data.upload_status).toBe('COMPLETED');
      // version_id should be populated once file version exists for this file
      expect(body.data.version_id).toBeDefined();
    });
  });
});
