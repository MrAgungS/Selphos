export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
}

export interface FileItem {
  id: string;
  name: string;
  mime_type: string;
  size: number;
  created_at: string;
  updated_at: string;
  url?: string;
}

export interface FileVersion {
  id: string;
  file_id: string;
  version_number: number;
  size: number;
  created_at: string;
}

export interface UploadStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_name: string;
  progress?: number;
}

export interface InitiateUploadDTO {
  file_name: string;
  mime_type: string;
  size: number;
}

export interface ConfirmUploadDTO {
  etag: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
