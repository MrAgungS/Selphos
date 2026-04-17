import z, { ZodType } from 'zod';

export class UploadsValidation {
  static readonly INITIATE: ZodType = z.object({
    filename: z.string().min(1),
    mime_type: z.string().min(1),
    size: z.number().min(1).positive(),
    file_id: z.string().min(1).optional(),
  });

  static readonly CONFIRM: ZodType = z.object({
    filename: z.string().min(1),
    mime_type: z.string().min(1),
    size: z.number().min(1).positive(),
    etag: z.string().min(1).optional(),
  });
}
