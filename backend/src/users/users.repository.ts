import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/common/database/database.service';
import { Role, User } from './interfaces/user.interface';
import { UuidUtils } from 'src/common/utils/uuid.utils';

// Shape of a raw user row returned from the database
interface UserRow {
  id: Buffer; // Stored as binary UUID in MySQL
  name: string;
  email: string;
  password: string; // Hashed password
  role: string; // Raw string from DB, cast to Role enum after mapping
  created_at: Date;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  // Maps a raw DB row to a typed User object
  private mapToUsers(row: UserRow): User {
    return {
      id: UuidUtils.toUuidString(row.id),
      name: row.name,
      email: row.email,
      password: row.password,
      role: row.role as Role,
      created_at: row.created_at,
    };
  }

  // Find a single user by their UUID string
  async findById(id: string): Promise<User | null> {
    // Convert string UUID to binary for MySQL WHERE clause
    const rows = await this.databaseService.query<UserRow>(
      'SELECT * FROM users WHERE id = ?',
      [UuidUtils.toUuidBinary(id)],
    );

    if (rows.length === 0) return null;
    return this.mapToUsers(rows[0]);
  }

  // Find a single user by their email address
  async findByEmail(email: string): Promise<User | null> {
    const rows = await this.databaseService.query<UserRow>(
      'SELECT * FROM users WHERE email = ?',
      [email],
    );

    if (rows.length === 0) return null;
    return this.mapToUsers(rows[0]);
  }

  // Insert a new user row and return the constructed User object
  async create(
    name: string,
    email: string,
    password: string, // Should already be hashed before calling this method
    role: Role = Role.USER, // Default role is USER
  ): Promise<User> {
    // Generate a new binary UUID for the primary key
    const binaryId = UuidUtils.generateBinary();
    // Execute INSERT — returns ResultSetHeader, not rows
    await this.databaseService.execute(
      'INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [binaryId, name, email, password, role],
    );

    // Return constructed User without re-querying the DB
    return {
      id: UuidUtils.toUuidString(binaryId),
      name,
      email,
      password,
      role,
      created_at: new Date(),
    };
  }
}
