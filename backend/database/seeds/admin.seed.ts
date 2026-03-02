import * as bcrypt from 'bcryptjs';
import dataSource from '../../src/config/data-source';

interface SeedUser {
  email: string;
  password: string;
  role: string;
  firstName: string;
  lastName: string;
}

const SEED_USERS: SeedUser[] = [
  {
    email: 'admin@bbb.local',
    password: 'Admin1234!',
    role: 'admin',
    firstName: 'Admin',
    lastName: 'System',
  },
  {
    email: 'viewer@bbb.local',
    password: 'Viewer1234!',
    role: 'viewer',
    firstName: 'Viewer',
    lastName: 'Test',
  },
];

async function seed(): Promise<void> {
  await dataSource.initialize();
  console.info('DataSource initialized');

  const rounds = parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10);

  for (const user of SEED_USERS) {
    const passwordHash = await bcrypt.hash(user.password, rounds);

    await dataSource.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         role = EXCLUDED.role,
         updated_at = NOW()`,
      [user.email, passwordHash, user.firstName, user.lastName, user.role],
    );

    console.info(`Created/Updated ${user.email} (${user.role})`);
  }

  await dataSource.destroy();
  console.info('Seeding complete');
}

seed()
  .then(() => {
    process.exit(0);
  })
  .catch((error: Error) => {
    console.error('Seeding failed:', error.message);
    process.exit(1);
  });
