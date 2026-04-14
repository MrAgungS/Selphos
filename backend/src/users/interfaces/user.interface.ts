export enum Role {
  ADMIN = 'admin',
  USER = 'user',
}

export interface RequestUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  created_at: Date;
}
