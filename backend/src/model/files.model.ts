export class ListFiles {
  user_id: string;
  page: number;
  limit: number;
  mime_type?: string;
}

export class RestoreVersion {
  file_id: string;
  version_id: string;
  user_id: string;
}
