import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/common/database/database.service';
import { UuidUtils } from 'src/common/utils/uuid.utils';
import {
  FileRow,
  FileSummary,
  FileVersionDetail,
  FileVersionRow,
} from './interfaces/files.interfaces';

@Injectable()
export class FilesRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  // List the user's files with pagination and a MIME type filter
  async findAllByUser(
    user_id: string,
    page: number,
    limit: number,
    mime_type?: string,
  ): Promise<{ files: FileSummary[]; total: number }> {
    const offset = (page - 1) * limit;
    let mime_filter = '';
    const mime_params: unknown[] = [];
    if (mime_type) {
      mime_filter = `AND mime_type = ?`;
      mime_params.push(mime_type);
    }

    // Query Data
    const rows = await this.databaseService.query<FileRow>(
      `SELECT 
          f.id,
          f.created_at,
          f.updated_at,
          fv.filename,
          fv.mime_type,
          fv.size,
          fv.compression_status,
          COUNT(all_fv.id) AS version_count
        FROM files f
        INNER JOIN file_versions fv ON fv.id = f.current_version_id
        LEFT JOIN file_versions all_fv ON all_fv.file_id = f.id
        WHERE f.user_id = ?
          AND f.is_deleted = FALSE
          ${mime_filter}
        GROUP BY f.id, fv.filename, fv.mime_type, fv.size, fv.compression_status
        ORDER BY f.updated_at DESC
        LIMIT ? OFFSET ?`,
      [UuidUtils.toUuidBinary(user_id), ...mime_params, limit, offset],
    );

    // Query total count
    const count_row = await this.databaseService.query<{ total: number }>(
      `SELECT COUNT(DISTINCT f.id) as total
        FROM files f
        INNER JOIN file_versions fv ON fv.id = f.current_version_id
        WHERE f.user_id = ?
          AND f.is_deleted = FALSE
          ${mime_filter}`,
      [UuidUtils.toUuidBinary(user_id), ...mime_params],
    );

    const files: FileSummary[] = rows.map((row) => ({
      file_id: UuidUtils.toUuidString(row.id),
      filename: row.filename!,
      mime_type: row.mime_type!,
      size: row.size!,
      compression_status: row.compression_status!,
      version_count: Number(row.version_count),
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return { files, total: Number(count_row[0].total) };
  }

  // Get all versions of a file
  async findVersionsByFileId(
    file_id: string,
    user_id: string,
  ): Promise<{
    filename: string;
    current_version_id: string | null;
    versions: FileVersionDetail[];
  } | null> {
    // Check file ownership
    const fileRows = await this.databaseService.query<{
      id: Buffer;
      current_version_id: Buffer | null;
      is_deleted: boolean;
    }>(
      'SELECT id, current_version_id, is_deleted FROM files WHERE id = ? AND user_id = ?',
      [UuidUtils.toUuidBinary(file_id), UuidUtils.toUuidBinary(user_id)],
    );
    if (fileRows.length === 0) {
      return null;
    }

    const file = fileRows[0];
    const current_version_id = file.current_version_id
      ? UuidUtils.toUuidString(file.current_version_id)
      : null;

    // Get all versions
    const versionsRows = await this.databaseService.query<FileVersionRow>(
      `SELECT * FROM file_versions WHERE file_id = ? ORDER BY created_at DESC`,
      [UuidUtils.toUuidBinary(file_id)],
    );
    if (versionsRows.length === 0) return null;

    const versions: FileVersionDetail[] = versionsRows.map((row) => ({
      version_id: UuidUtils.toUuidString(row.id),
      is_current: UuidUtils.toUuidString(row.id) === current_version_id,
      object_key: row.object_key,
      compressed_object_key: row.compressed_object_key,
      compression_status: row.compression_status,
      mime_type: row.mime_type,
      size: row.size,
      etag: row.etag,
      created_at: row.created_at,
      bucket: row.bucket,
    }));

    return {
      filename: versionsRows[0].filename,
      current_version_id,
      versions,
    };
  }

  // Get the current version to download
  async findCurrentVersionByFileId(
    file_id: string,
    user_id: string,
  ): Promise<(FileVersionDetail & { is_deleted: boolean }) | null> {
    const rows = await this.databaseService.query<
      FileVersionDetail & { is_deleted: boolean }
    >(
      `SELECT fv.*, f.is_deleted
             FROM files f
             INNER JOIN file_versions fv ON fv.id = f.current_version_id
             WHERE f.id = ? AND f.user_id = ?`,
      [UuidUtils.toUuidBinary(file_id), UuidUtils.toUuidBinary(user_id)],
    );
    if (rows.length === 0) return null;
    const row = rows[0] as unknown as FileVersionRow & { is_deleted: boolean };

    return {
      version_id: UuidUtils.toUuidString(row.id),
      is_current: true,
      is_deleted: row.is_deleted,
      object_key: row.object_key,
      compressed_object_key: row.compressed_object_key,
      compression_status: row.compression_status,
      mime_type: row.mime_type,
      size: row.size,
      etag: row.etag,
      created_at: row.created_at,
      bucket: row.bucket,
    };
  }

  // Check if version_id belongs to file_id
  async findVersionByIdAndFile(
    version_id: string,
    file_id: string,
    user_id: string,
  ): Promise<boolean> {
    // First, make sure the file belongs to the user
    const filesRows = await this.databaseService.query<{ id: Buffer }>(
      'SELECT id FROM files WHERE id = ? AND user_id = ? AND is_deleted = FALSE',
      [UuidUtils.toUuidBinary(file_id), UuidUtils.toUuidBinary(user_id)],
    );
    if (filesRows.length === 0) return false;

    const versionRows = await this.databaseService.query<{ id: Buffer }>(
      'SELECT id FROM file_versions WHERE id = ? AND file_id = ?',
      [UuidUtils.toUuidBinary(version_id), UuidUtils.toUuidBinary(file_id)],
    );
    return versionRows.length > 0;
  }

  // Update current_version_id (for restore)
  async restoreVersion(file_id: string, version_id: string): Promise<void> {
    await this.databaseService.execute(
      'UPDATE files SET current_version_id = ? WHERE id = ?',
      [UuidUtils.toUuidBinary(version_id), UuidUtils.toUuidBinary(file_id)],
    );
  }

  // Soft delete
  async softDelete(
    file_id: string,
    user_id: string,
  ): Promise<'not_found' | 'already_deleted' | 'ok'> {
    const rows = await this.databaseService.query<{
      id: Buffer;
      is_deleted: boolean;
    }>('SELECT id, is_deleted FROM files WHERE id = ? AND user_id = ?', [
      UuidUtils.toUuidBinary(file_id),
      UuidUtils.toUuidBinary(user_id),
    ]);

    if (rows.length === 0) return 'not_found';
    if (rows[0].is_deleted) return 'already_deleted';

    await this.databaseService.execute(
      'UPDATE files SET is_deleted = TRUE WHERE id = ?',
      [UuidUtils.toUuidBinary(file_id)],
    );
    return 'ok';
  }
}
