export const COMPRESSION_QUEUE = 'compression';

export interface CompressionJobData {
  version_id: string;
  file_id: string;
  object_key: string; // RustFS raw file key
  bucket_raw: string; // source bucket
  bucket_compressed: string; // destination bucket
  mime_type: string;
  filename: string;
}
