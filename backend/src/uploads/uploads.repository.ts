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
}
