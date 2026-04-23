import z, { ZodType } from 'zod';

export class FilesValidation {
  static readonly LIST_FILES: ZodType = z.object({
    user_id: z.string().min(1),
    page: z.number().min(1),
    limit: z.number().min(1),
    mime_type: z.string().min(1).optional(),
  });

  static readonly RESTORE_VERSION: ZodType = z.object({
    file_id: z.string().min(1),
    version_id: z.string().min(1),
    user_id: z.string().min(1),
  });
}
