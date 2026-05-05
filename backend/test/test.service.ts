import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/common/database/database.service';
import { UuidUtils } from 'src/common/utils/uuid.utils';
import * as bcrypt from 'bcrypt';

// TestService
// Provides direct-DB helpers for e2e tests.
// All "seed" helpers insert minimal rows needed to exercise an endpoint.
// All "delete" helpers clean up in dependency order (child → parent).
@Injectable()
export class TestService {
  // Shared test fixtures
  static readonly USER_EMAIL = 'test@example.com';
  static readonly USER_PASSWORD = 'test123';
  static readonly USER_NAME = 'test';

  constructor(private readonly databaseService: DatabaseService) {}

  // Insert the standard test user (hashed password). Returns user UUID string.
  async createUser(): Promise<string> {
    const binaryId = UuidUtils.generateBinary();
    const hashed = await bcrypt.hash(TestService.USER_PASSWORD, 10);

    await this.databaseService.execute(
      `INSERT INTO users (id, name, email, password, role)
       VALUES (?, ?, ?, ?, 'USER')`,
      [binaryId, TestService.USER_NAME, TestService.USER_EMAIL, hashed],
    );

    return UuidUtils.toUuidString(binaryId);
  }

  // Remove the standard test user and all owned data (cascade-safe).
  async deleteUser(): Promise<void> {
    const rows = await this.databaseService.query<{ id: Buffer }>(
      'SELECT id FROM users WHERE email = ?',
      [TestService.USER_EMAIL],
    );
    if (rows.length === 0) return;

    const binaryId = rows[0].id;
    // const userId = UuidUtils.toUuidString(binaryId);

    // Uploads FK → files, delete first
    await this.databaseService.execute(
      'DELETE FROM uploads WHERE user_id = ?',
      [binaryId],
    );

    // NULL current_version_id so file_versions can be deleted
    const fileRows = await this.databaseService.query<{ id: Buffer }>(
      'SELECT id FROM files WHERE user_id = ?',
      [binaryId],
    );
    for (const f of fileRows) {
      await this.databaseService.execute(
        'UPDATE files SET current_version_id = NULL WHERE id = ?',
        [f.id],
      );
      await this.databaseService.execute(
        'DELETE FROM file_versions WHERE file_id = ?',
        [f.id],
      );
    }

    await this.databaseService.execute('DELETE FROM files WHERE user_id = ?', [
      binaryId,
    ]);
    await this.databaseService.execute('DELETE FROM users WHERE email = ?', [
      TestService.USER_EMAIL,
    ]);
  }

  // Seed a complete file with one current version for the given user.
  //
  // @returns { file_id, version_id } as UUID strings
  async createFile(
    userId: string,
    opts: {
      filename?: string;
      mime_type?: string;
      size?: number;
      compression_status?:
        | 'pending'
        | 'processing'
        | 'done'
        | 'failed'
        | 'skipped';
      is_deleted?: boolean;
    } = {},
  ): Promise<{ file_id: string; version_id: string }> {
    const {
      filename = 'photo.jpg',
      mime_type = 'image/jpeg',
      size = 2048576,
      compression_status = 'done',
      is_deleted = false,
    } = opts;

    const fileBin = UuidUtils.generateBinary();
    const file_id = UuidUtils.toUuidString(fileBin);

    // Create parent file row (current_version_id set after version insert)
    await this.databaseService.execute(
      `INSERT INTO files (id, user_id, is_deleted) VALUES (?, ?, ?)`,
      [fileBin, UuidUtils.toUuidBinary(userId), is_deleted],
    );

    // Create first version
    const versionBin = UuidUtils.generateBinary();
    const objectKey = `uploads/raw/${file_id}/${filename}`;
    const compressedKey =
      compression_status === 'done'
        ? `uploads/compressed/${file_id}/${filename.replace(/\.[^.]+$/, '.webp')}`
        : null;

    await this.databaseService.execute(
      `INSERT INTO file_versions
         (id, file_id, bucket, object_key, compressed_object_key,
          filename, mime_type, size, etag, compression_status)
       VALUES (?, ?, 'my-bucket', ?, ?, ?, ?, ?, 'abc123etag', ?)`,
      [
        versionBin,
        fileBin,
        objectKey,
        compressedKey,
        filename,
        mime_type,
        size,
        compression_status,
      ],
    );

    // Point current_version_id → the new version
    await this.databaseService.execute(
      'UPDATE files SET current_version_id = ? WHERE id = ?',
      [versionBin, fileBin],
    );

    return {
      file_id,
      version_id: UuidUtils.toUuidString(versionBin),
    };
  }

  // Append an additional version to an existing file.
  // Does NOT update current_version_id — caller decides if it should be current.
  //
  // @returns version_id of the new version as UUID string
  async addFileVersion(
    fileId: string,
    opts: {
      filename?: string;
      mime_type?: string;
      size?: number;
      compression_status?:
        | 'pending'
        | 'processing'
        | 'done'
        | 'failed'
        | 'skipped';
    } = {},
  ): Promise<string> {
    const {
      filename = 'photo_v2.jpg',
      mime_type = 'image/jpeg',
      size = 1024000,
      compression_status = 'done',
    } = opts;

    const versionBin = UuidUtils.generateBinary();
    const objectKey = `uploads/raw/${fileId}/${filename}`;
    const compressedKey =
      compression_status === 'done'
        ? `uploads/compressed/${fileId}/${filename.replace(/\.[^.]+$/, '.webp')}`
        : null;

    await this.databaseService.execute(
      `INSERT INTO file_versions
         (id, file_id, bucket, object_key, compressed_object_key,
          filename, mime_type, size, etag, compression_status)
       VALUES (?, ?, 'my-bucket', ?, ?, ?, ?, ?, 'def456etag', ?)`,
      [
        versionBin,
        UuidUtils.toUuidBinary(fileId),
        objectKey,
        compressedKey,
        filename,
        mime_type,
        size,
        compression_status,
      ],
    );

    return UuidUtils.toUuidString(versionBin);
  }

  // Soft-delete a file directly in DB (sets is_deleted = TRUE).
  async softDeleteFile(fileId: string): Promise<void> {
    await this.databaseService.execute(
      'UPDATE files SET is_deleted = TRUE WHERE id = ?',
      [UuidUtils.toUuidBinary(fileId)],
    );
  }

  // Hard-delete all files (+ versions) owned by a user.
  async deleteFilesByUser(userId: string): Promise<void> {
    const fileRows = await this.databaseService.query<{ id: Buffer }>(
      'SELECT id FROM files WHERE user_id = ?',
      [UuidUtils.toUuidBinary(userId)],
    );
    for (const f of fileRows) {
      await this.databaseService.execute(
        'UPDATE files SET current_version_id = NULL WHERE id = ?',
        [f.id],
      );
      await this.databaseService.execute(
        'DELETE FROM file_versions WHERE file_id = ?',
        [f.id],
      );
    }
    await this.databaseService.execute('DELETE FROM files WHERE user_id = ?', [
      UuidUtils.toUuidBinary(userId),
    ]);
  }

  // Seed an upload record.
  //
  // @returns upload_id as UUID string
  async createUpload(
    userId: string,
    fileId?: string,
    opts: {
      status?: 'INITIATED' | 'COMPLETED' | 'FAILED';
      expires_at?: Date;
    } = {},
  ): Promise<string> {
    const {
      status = 'INITIATED',
      expires_at = new Date(Date.now() + 15 * 60 * 1000), // +15 min
    } = opts;

    const uploadBin = UuidUtils.generateBinary();
    const objectKey = `uploads/raw/${userId}/photo.jpg`;

    await this.databaseService.execute(
      `INSERT INTO uploads (id, user_id, file_id, object_key, bucket, status, expires_at)
       VALUES (?, ?, ?, ?, 'my-bucket', ?, ?)`,
      [
        uploadBin,
        UuidUtils.toUuidBinary(userId),
        fileId ? UuidUtils.toUuidBinary(fileId) : null,
        objectKey,
        status,
        expires_at,
      ],
    );

    return UuidUtils.toUuidString(uploadBin);
  }

  // Seed an already-expired upload (expires_at 1 minute in the past).
  async createExpiredUpload(userId: string): Promise<string> {
    return this.createUpload(userId, undefined, {
      expires_at: new Date(Date.now() - 60 * 1000),
    });
  }

  // Hard-delete all uploads owned by a user.
  async deleteUploadsByUser(userId: string): Promise<void> {
    await this.databaseService.execute(
      'DELETE FROM uploads WHERE user_id = ?',
      [UuidUtils.toUuidBinary(userId)],
    );
  }
}
