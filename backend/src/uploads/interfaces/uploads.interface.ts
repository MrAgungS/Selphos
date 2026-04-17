export enum UploadsStatus {
  INITIATED = 'INITIATED',
  UPLOADING = 'UPLOADING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum CompressionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  DONE = 'done',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

export class Uploads {
  id: string;
  user_id: string;
  file_id: string | null;
  object_key: string;
  bucket: string;
  status: UploadsStatus;
  expires_at: Date;
  created_at: Date;
}

export interface FileVersion {
  id: string;
  file_id: string;
  bucket: string;
  object_key: string;
  compressed_object_key: string | null;
  compression_status: CompressionStatus;
  filename: string;
  mime_type: string;
  size: number;
  etag: string | null;
  created_at: Date;
}
