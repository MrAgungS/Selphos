import { Role } from './role.model';

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: Role;
}
