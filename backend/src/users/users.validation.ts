import z, { ZodType } from 'zod';

export class UserValidation {
  static readonly REGISTER: ZodType = z.object({
    email: z.string().min(1).max(255),
    password: z.string().min(1).max(100),
    name: z.string().min(1).max(100),
  });

  static readonly LOGIN: ZodType = z.object({
    email: z.string().min(1).max(255),
    password: z.string().min(1).max(100),
  });

  static readonly LOGOUT: ZodType = z.object({
    user_id: z.string().min(1),
    access_token: z.string().min(1),
  });
}
