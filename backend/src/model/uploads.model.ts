export class InitiateUploadDto {
  filename: string;
  mime_type: string;
  size: number;
  file_id?: string;
}

export class ConfirmUploadDto {
  filename: string;
  mime_type: string;
  size: number;
  etag?: string;
}
