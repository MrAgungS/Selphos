import { Request } from 'express';
import { Role } from './role.model';

export interface RequestUser {
  id: string;
  email: string;
  role: Role;
}

export interface RequestWithUser extends Request {
  user: RequestUser;
}
