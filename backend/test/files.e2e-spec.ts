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

interface FileSummary {
  file_id: string;
  filename: string;
  mime_type: string;
  size: number;
  compression_status: string;
  version_count: number;
  created_at: string;
  updated_at: string;
}

interface ListFilesResponse {
  data: {
    files: FileSummary[];
    total: number;
    page: number;
    limit: number;
  };
}

interface FileVersionDetail {
  version_id: string;
  is_current: boolean;
  object_key: string;
  compressed_object_key: string | null;
  compression_status: string;
  mime_type: string;
  size: number;
  etag: string;
  created_at: string;
}

interface GetVersionsResponse {
  data: {
    file_id: string;
    filename: string;
    versions: FileVersionDetail[];
  };
}

interface DownloadUrlResponse {
  data: {
    file_id: string;
    filename: string;
    download_url: string;
    expires_at: string;
    mime_type: string;
    size: number;
  };
}

interface RestoreResponse {
  data: {
    file_id: string;
    restored_version_id: string;
    message: string;
  };
}

interface DeleteResponse {
  data: boolean;
}

// Helpers

// Login with the standard test credentials and return a Bearer token.
async function loginAndGetToken(app: INestApplication<App>): Promise<string> {
  const res = await request(app.getHttpServer()).post('/api/users/login').send({
    email: TestService.USER_EMAIL,
    password: TestService.USER_PASSWORD,
  });
  return (res.body as { data: { access_token: string } }).data.access_token;
}

// Suite

describe('FilesController (e2e)', () => {
  let app: INestApplication<App>;
  let logger: Logger;
  let testService: TestService;

  // Populated per-describe block
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

  //  GET /api/s3/files  — List All Files
  describe('GET /api/s3/files', () => {
    beforeEach(async () => {
      await testService.deleteUser();
      userId = await testService.createUser();
      accessToken = await loginAndGetToken(app);
    });

    afterEach(async () => {
      await testService.deleteUser();
    });

    it('should be rejected if no token is provided', async () => {
      const res = await request(app.getHttpServer()).get('/api/s3/files');

      logger.info(res.body);

      expect(res.status).toBe(401);
      expect((res.body as ErrorResponse).errors).toBeDefined();
    });

    it('should return an empty list when user has no files', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/s3/files')
        .set('Authorization', `Bearer ${accessToken}`);

      logger.info(res.body);

      expect(res.status).toBe(200);
      const body = res.body as ListFilesResponse;
      expect(body.data.files).toHaveLength(0);
      expect(body.data.total).toBe(0);
      expect(body.data.page).toBe(1);
      expect(body.data.limit).toBe(20);
    });

    it('should return the user files with default pagination', async () => {
      await testService.createFile(userId);
      await testService.createFile(userId, {
        filename: 'doc.pdf',
        mime_type: 'application/pdf',
      });

      const res = await request(app.getHttpServer())
        .get('/api/s3/files')
        .set('Authorization', `Bearer ${accessToken}`);

      logger.info(res.body);

      expect(res.status).toBe(200);
      const body = res.body as ListFilesResponse;
      expect(body.data.files).toHaveLength(2);
      expect(body.data.total).toBe(2);

      const file = body.data.files[0];
      expect(file.file_id).toBeDefined();
      expect(file.filename).toBeDefined();
      expect(file.mime_type).toBeDefined();
      expect(file.size).toBeDefined();
      expect(file.compression_status).toBeDefined();
      expect(file.version_count).toBeGreaterThanOrEqual(1);
      expect(file.created_at).toBeDefined();
      expect(file.updated_at).toBeDefined();
    });

    it('should filter files by mime_type', async () => {
      await testService.createFile(userId, {
        filename: 'photo.jpg',
        mime_type: 'image/jpeg',
      });
      await testService.createFile(userId, {
        filename: 'doc.pdf',
        mime_type: 'application/pdf',
      });

      const res = await request(app.getHttpServer())
        .get('/api/s3/files')
        .query({ mime_type: 'image/jpeg' })
        .set('Authorization', `Bearer ${accessToken}`);

      logger.info(res.body);

      expect(res.status).toBe(200);
      const body = res.body as ListFilesResponse;
      expect(
        body.data.files.every((f) => f.mime_type.startsWith('image/jpeg')),
      ).toBe(true);
    });

    it('should paginate correctly', async () => {
      // Create 3 files then request page 2 with limit 2
      await testService.createFile(userId);
      await testService.createFile(userId);
      await testService.createFile(userId, {
        filename: 'extra.png',
        mime_type: 'image/png',
      });

      const res = await request(app.getHttpServer())
        .get('/api/s3/files')
        .query({ page: 2, limit: 2 })
        .set('Authorization', `Bearer ${accessToken}`);

      logger.info(res.body);

      expect(res.status).toBe(200);
      const body = res.body as ListFilesResponse;
      expect(body.data.page).toBe(2);
      expect(body.data.limit).toBe(2);
      expect(body.data.total).toBe(3);
      expect(body.data.files).toHaveLength(1);
    });

    it('should not return soft-deleted files', async () => {
      const { file_id } = await testService.createFile(userId);
      await testService.softDeleteFile(file_id);

      const res = await request(app.getHttpServer())
        .get('/api/s3/files')
        .set('Authorization', `Bearer ${accessToken}`);

      logger.info(res.body);

      expect(res.status).toBe(200);
      const body = res.body as ListFilesResponse;
      expect(body.data.files).toHaveLength(0);
      expect(body.data.total).toBe(0);
    });
  });

  // GET /api/s3/files/:file_id/versions  — Get File Versions
  describe('GET /api/s3/files/:file_id/versions', () => {
    let file_id: string;
    let version_id: string;

    beforeEach(async () => {
      await testService.deleteUser();
      userId = await testService.createUser();
      accessToken = await loginAndGetToken(app);
      ({ file_id, version_id } = await testService.createFile(userId));
    });

    afterEach(async () => {
      await testService.deleteUser();
    });

    it('should be rejected if no token is provided', async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/s3/files/${file_id}/versions`,
      );

      logger.info(res.body);

      expect(res.status).toBe(401);
    });

    it('should return 404 if file does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .get(`/api/s3/files/${fakeId}/versions`)
        .set('Authorization', `Bearer ${accessToken}`);

      logger.info(res.body);

      expect(res.status).toBe(404);
      expect((res.body as ErrorResponse).errors).toBeDefined();
    });

    it('should return all versions for a valid file', async () => {
      // Add a second version
      await testService.addFileVersion(file_id);

      const res = await request(app.getHttpServer())
        .get(`/api/s3/files/${file_id}/versions`)
        .set('Authorization', `Bearer ${accessToken}`);

      logger.info(res.body);

      expect(res.status).toBe(200);
      const body = res.body as GetVersionsResponse;
      expect(body.data.file_id).toBe(file_id);
      expect(body.data.filename).toBeDefined();
      expect(body.data.versions).toHaveLength(2);

      const current = body.data.versions.find((v) => v.is_current);
      expect(current).toBeDefined();
      expect(current!.version_id).toBe(version_id);
    });

    it('should mark compressed_object_key as null when compression is pending', async () => {
      const { file_id: pendingFileId } = await testService.createFile(userId, {
        compression_status: 'pending',
      });

      const res = await request(app.getHttpServer())
        .get(`/api/s3/files/${pendingFileId}/versions`)
        .set('Authorization', `Bearer ${accessToken}`);

      logger.info(res.body);

      expect(res.status).toBe(200);
      const body = res.body as GetVersionsResponse;
      expect(body.data.versions[0].compressed_object_key).toBeNull();
    });
  });

  // GET /api/s3/files/:file_id/download  — Get Download URL
  describe('GET /api/s3/files/:file_id/download', () => {
    let file_id: string;

    beforeEach(async () => {
      await testService.deleteUser();
      userId = await testService.createUser();
      accessToken = await loginAndGetToken(app);
      ({ file_id } = await testService.createFile(userId));
    });

    afterEach(async () => {
      await testService.deleteUser();
    });

    it('should be rejected if no token is provided', async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/s3/files/${file_id}/download`,
      );

      logger.info(res.body);

      expect(res.status).toBe(401);
    });

    it('should return 404 if file does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .get(`/api/s3/files/${fakeId}/download`)
        .set('Authorization', `Bearer ${accessToken}`);

      logger.info(res.body);

      expect(res.status).toBe(404);
      expect((res.body as ErrorResponse).errors).toBeDefined();
    });

    it('should return 410 if file has been soft-deleted', async () => {
      await testService.softDeleteFile(file_id);

      const res = await request(app.getHttpServer())
        .get(`/api/s3/files/${file_id}/download`)
        .set('Authorization', `Bearer ${accessToken}`);

      logger.info(res.body);

      expect(res.status).toBe(410);
      expect((res.body as ErrorResponse).errors).toBeDefined();
    });

    it('should return a presigned download URL for a valid file', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/s3/files/${file_id}/download`)
        .set('Authorization', `Bearer ${accessToken}`);

      logger.info(res.body);

      expect(res.status).toBe(200);
      const body = res.body as DownloadUrlResponse;
      expect(body.data.file_id).toBe(file_id);
      expect(body.data.filename).toBeDefined();
      expect(body.data.download_url).toBeDefined();
      expect(body.data.expires_at).toBeDefined();
      expect(body.data.mime_type).toBeDefined();
      expect(body.data.size).toBeDefined();
    });

    it('should point to raw file when compression is still pending', async () => {
      const { file_id: pendingId } = await testService.createFile(userId, {
        compression_status: 'pending',
      });

      const res = await request(app.getHttpServer())
        .get(`/api/s3/files/${pendingId}/download`)
        .set('Authorization', `Bearer ${accessToken}`);

      logger.info(res.body);

      expect(res.status).toBe(200);
      // The download_url should reference the raw path, not a compressed path
      const body = res.body as DownloadUrlResponse;
      expect(body.data.download_url).toContain('raw');
    });
  });

  // POST /api/s3/files/:file_id/versions/:version_id/restore  — Restore
  describe('POST /api/s3/files/:file_id/versions/:version_id/restore', () => {
    let file_id: string;
    // let version_id: string; // current (latest) version
    let old_version_id: string; // the version we will restore to

    beforeEach(async () => {
      await testService.deleteUser();
      userId = await testService.createUser();
      accessToken = await loginAndGetToken(app);

      // Create file (version_id is current)
      ({ file_id } = await testService.createFile(userId));

      // Add an older version (not yet set as current)
      old_version_id = await testService.addFileVersion(file_id);
    });

    afterEach(async () => {
      await testService.deleteUser();
    });

    it('should be rejected if no token is provided', async () => {
      const res = await request(app.getHttpServer()).post(
        `/api/s3/files/${file_id}/versions/${old_version_id}/restore`,
      );

      logger.info(res.body);

      expect(res.status).toBe(401);
    });

    it('should return 404 if version does not exist', async () => {
      const fakeVersionId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .post(`/api/s3/files/${file_id}/versions/${fakeVersionId}/restore`)
        .set('Authorization', `Bearer ${accessToken}`);

      logger.info(res.body);

      expect(res.status).toBe(404);
      expect((res.body as ErrorResponse).errors).toBeDefined();
    });

    it('should return 403 if version does not belong to the file', async () => {
      // Create a completely different file → its version belongs to that file only
      const { version_id: foreignVersionId } =
        await testService.createFile(userId);

      const res = await request(app.getHttpServer())
        .post(`/api/s3/files/${file_id}/versions/${foreignVersionId}/restore`)
        .set('Authorization', `Bearer ${accessToken}`);

      logger.info(res.body);

      expect(res.status).toBe(403);
      expect((res.body as ErrorResponse).errors).toBeDefined();
    });

    it('should restore a valid older version', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/s3/files/${file_id}/versions/${old_version_id}/restore`)
        .set('Authorization', `Bearer ${accessToken}`);

      logger.info(res.body);

      expect(res.status).toBe(200);
      const body = res.body as RestoreResponse;
      expect(body.data.file_id).toBe(file_id);
      expect(body.data.restored_version_id).toBe(old_version_id);
      expect(body.data.message).toBe('File restored to selected version');
    });
  });

  // DELETE /api/s3/files/:file_id  — Soft Delete
  describe('DELETE /api/s3/files/:file_id', () => {
    let file_id: string;

    beforeEach(async () => {
      await testService.deleteUser();
      userId = await testService.createUser();
      accessToken = await loginAndGetToken(app);
      ({ file_id } = await testService.createFile(userId));
    });

    afterEach(async () => {
      await testService.deleteUser();
    });

    it('should be rejected if no token is provided', async () => {
      const res = await request(app.getHttpServer()).delete(
        `/api/s3/files/${file_id}`,
      );

      logger.info(res.body);

      expect(res.status).toBe(401);
    });

    it('should return 404 if file does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .delete(`/api/s3/files/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      logger.info(res.body);

      expect(res.status).toBe(404);
      expect((res.body as ErrorResponse).errors).toBeDefined();
    });

    it('should return 409 if file is already deleted', async () => {
      // First delete
      await request(app.getHttpServer())
        .delete(`/api/s3/files/${file_id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      // Second delete
      const res = await request(app.getHttpServer())
        .delete(`/api/s3/files/${file_id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      logger.info(res.body);

      expect(res.status).toBe(409);
      expect((res.body as ErrorResponse).errors).toBeDefined();
    });

    it('should soft-delete the file successfully', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/s3/files/${file_id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      logger.info(res.body);

      expect(res.status).toBe(200);
      expect((res.body as DeleteResponse).data).toBe(true);
    });
  });
});
