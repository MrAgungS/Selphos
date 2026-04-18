import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/common/database/database.service';
import {
  CompressionStatus,
  FileVersion,
  Uploads,
  UploadsStatus,
} from './interfaces/uploads.interface';
import { UuidUtils } from 'src/common/utils/uuid.utils';

interface UploadRow {
  id: Buffer;
  user_id: Buffer;
  file_id: Buffer | null;
  object_key: string;
  bucket: string;
  status: UploadsStatus;
  expires_at: Date;
  created_at: Date;
}

interface FileVersionRow {
  id: Buffer;
  file_id: Buffer;
  bucket: string;
  object_key: string;
  compressed_object_key: string | null;
  compression_status: string;
  filename: string;
  mime_type: string;
  size: number;
  etag: string | null;
  created_at: Date;
}

@Injectable()
export class UploadsRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  private mapToUpload(row: UploadRow): Uploads {
    return {
      id: UuidUtils.toUuidString(row.id),
      user_id: UuidUtils.toUuidString(row.user_id),
      file_id: row.file_id ? UuidUtils.toUuidString(row.file_id) : null,
      object_key: row.object_key,
      bucket: row.bucket,
      status: row.status,
      expires_at: row.expires_at,
      created_at: row.created_at,
    };
  }

  private mapToFileVersion(row: FileVersionRow): FileVersion {
    return {
      id: UuidUtils.toUuidString(row.id),
      file_id: UuidUtils.toUuidString(row.file_id),
      bucket: row.bucket,
      object_key: row.object_key,
      compressed_object_key: row.compressed_object_key,
      compression_status: row.compression_status as CompressionStatus,
      filename: row.filename,
      mime_type: row.mime_type,
      size: row.size,
      etag: row.etag,
      created_at: row.created_at,
    };
  }

  // Create a new upload record
  async createUpload(
    user_id: string,
    object_key: string,
    bucket: string,
    expires_at: Date,
    file_id?: string,
  ) {
    const id = UuidUtils.generateBinary();
    await this.databaseService.execute(
      `
      INSERT INTO uploads (id, user_id, file_id, object_key, bucket, status, expires_at)
      VALUES (?, ?, ?, ?, ?, 'INITIATED', ?)
    `,
      [
        id,
        UuidUtils.toUuidBinary(user_id),
        file_id ? UuidUtils.toUuidBinary(file_id) : null,
        object_key,
        bucket,
        expires_at,
      ],
    );

    return {
      id: UuidUtils.toUuidString(id),
      user_id,
      file_id,
      object_key,
      bucket,
      status: 'INITIATED',
      expires_at,
      created_at: new Date(),
    };
  }

  async findById(upload_id: string): Promise<Uploads | null> {
    const row = await this.databaseService.query<UploadRow>(
      `
      SELECT * FROM uploads WHERE id = ?
    `,
      [UuidUtils.toUuidBinary(upload_id)],
    );
    if (!row[0]) return null;
    return this.mapToUpload(row[0]);
  }

  async updateStatus(upload_id: string, status: UploadsStatus): Promise<void> {
    await this.databaseService.execute(
      `
      UPDATE uploads SET status = ? WHERE id = ?
    `,
      [status, UuidUtils.toUuidBinary(upload_id)],
    );
  }

  // Create a new file (if this is your first upload)
  async createFile(user_id: string) {
    const file_id = UuidUtils.generateBinary();
    await this.databaseService.execute(
      `
      INSERT INTO file_versions (upload_id, file_id)
      VALUES (?, ?)
    `,
      [UuidUtils.toUuidBinary(user_id), file_id],
    );
    return UuidUtils.toUuidString(file_id);
  }

  // Set the current_version_id in the files
  async updateFileCurrentVersion(file_id: string, upload_id: string) {
    await this.databaseService.execute(
      'UPDATE files SET current_version_id = ? WHERE id = ?',
      [UuidUtils.toUuidBinary(file_id), UuidUtils.toUuidBinary(upload_id)],
    );
  }

  // Check if the file belongs to the user
  async findFileByIdAndUser(
    file_id: string,
    user_id: string,
  ): Promise<boolean> {
    const rows = await this.databaseService.query<{ id: Buffer }>(
      'SELECT id FROM files WHERE id = ? AND user_id = ? AND is_deleted = FALSE',
      [UuidUtils.toUuidBinary(file_id), UuidUtils.toUuidBinary(user_id)],
    );
    return rows.length > 0;
  }

  // Create the file_version file after confirmation
  async createFileVersion(
    file_id: string,
    bucket: string,
    object_key: string,
    filename: string,
    mime_type: string,
    size: number,
    compressionStatus: CompressionStatus,
    etag?: string,
  ): Promise<FileVersion> {
    const id = UuidUtils.generateBinary();
    await this.databaseService.execute(
      `INSERT INTO file_versions 
       (id, file_id, bucket, object_key, filename, mime_type, size, etag, compression_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        UuidUtils.toUuidBinary(file_id),
        bucket,
        object_key,
        filename,
        mime_type,
        size,
        etag ?? null,
        compressionStatus,
      ],
    );

    return {
      id: UuidUtils.toUuidString(id),
      file_id,
      bucket,
      object_key,
      compressed_object_key: null,
      compression_status: compressionStatus,
      filename,
      mime_type,
      size,
      etag: etag ?? null,
      created_at: new Date(),
    };
  }

  // For the GET status request — include uploads and file_versions
  async findUploadStatus(uploadId: string): Promise<{
    upload: Uploads;
    version: FileVersion | null;
  } | null> {
    const rows = await this.databaseService.query<UploadRow>(
      'SELECT * FROM uploads WHERE id = ?',
      [UuidUtils.toUuidBinary(uploadId)],
    );
    if (rows.length === 0) return null;
    const upload = this.mapToUpload(rows[0]);

    // Find the latest file_version based on file_id
    let version: FileVersion | null = null;
    if (upload.file_id) {
      const versionRows = await this.databaseService.query<FileVersionRow>(
        `SELECT fv.* FROM file_versions fv
           INNER JOIN files f ON f.current_version_id = fv.id
           WHERE f.id = ?`,
        [UuidUtils.toUuidBinary(upload.file_id)],
      );
      if (versionRows.length > 0) {
        version = this.mapToFileVersion(versionRows[0]);
      }
    }
    return { upload, version };
  }

  // Update the compression status for file_versions (optional: update the object key as well)
  async updateCompressionStatus(
    version_id: string,
    status: CompressionStatus,
    compressed_object_key?: string,
  ): Promise<void> {
    await this.databaseService.execute(
      `UPDATE file_versions 
       SET compression_status = ?, compressed_object_key = COALESCE(?, compressed_object_key)
       WHERE id = ?`,
      [
        status,
        compressed_object_key ?? null,
        UuidUtils.toUuidBinary(version_id),
      ],
    );
  }

  // Retrieve the file_version based on the ID
  async findVersionById(version_id: string): Promise<FileVersion | null> {
    const rows = await this.databaseService.query<FileVersionRow>(
      'SELECT * FROM file_versions WHERE id = ?',
      [UuidUtils.toUuidBinary(version_id)],
    );
    if (rows.length === 0) return null;
    return this.mapToFileVersion(rows[0]);
  }
}
