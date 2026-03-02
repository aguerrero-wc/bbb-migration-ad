import * as jwt from 'jsonwebtoken';
import { hash } from 'bcryptjs';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';

const TEST_JWT_SECRET = 'test-jwt-secret-for-testing-only';

export interface TestUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  passwordHash: string;
}

export function generateTestToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    TEST_JWT_SECRET,
    { expiresIn: '15m' },
  );
}

export async function createTestUser(
  dataSource: DataSource,
  overrides: Partial<{
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    password: string;
    isActive: boolean;
  }> = {},
): Promise<TestUser> {
  const id = randomUUID();
  const email = overrides.email ?? `test-${id}@test.local`;
  const firstName = overrides.firstName ?? 'Test';
  const lastName = overrides.lastName ?? 'User';
  const role = overrides.role ?? 'viewer';
  const password = overrides.password ?? 'TestPassword1!';
  const isActive = overrides.isActive ?? true;
  const passwordHash = await hash(password, 4);

  await dataSource.query(
    `INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, email, passwordHash, firstName, lastName, role, isActive],
  );

  return { id, email, firstName, lastName, role, passwordHash };
}
