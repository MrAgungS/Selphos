export interface FileRow {
  id: Buffer;
  user_id: Buffer;
  current_version_id: Buffer | null;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  // JOIN fields dari file_versions
  filename?: string;
  mime_type?: string;
  size?: number;
  compression_status?: string;
  version_count?: number;
}

export interface FileVersionRow {
  id: Buffer;
  file_id: Buffer;
  object_key: string;
  compressed_object_key: string | null;
  compression_status: string;
  filename: string;
  mime_type: string;
  size: number;
  etag: string | null;
  created_at: Date;
  bucket: string;
}

export interface FileSummary {
  file_id: string;
  filename: string;
  mime_type: string;
  size: number;
  compression_status: string;
  version_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface FileVersionDetail {
  version_id: string;
  is_current: boolean;
  object_key: string;
  compressed_object_key: string | null;
  compression_status: string;
  mime_type: string;
  size: number;
  etag: string | null;
  created_at: Date;
  bucket: string;
}
