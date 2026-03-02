import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import * as path from 'path';

let container: StartedPostgreSqlContainer;
let dataSource: DataSource;

export async function setupTestDatabase(): Promise<DataSource> {
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('bbb_test')
    .withUsername('test')
    .withPassword('test')
    .start();

  dataSource = new DataSource({
    type: 'postgres',
    host: container.getHost(),
    port: container.getMappedPort(5432),
    username: container.getUsername(),
    password: container.getPassword(),
    database: container.getDatabase(),
    entities: [path.resolve(__dirname, '../../../backend/src/modules/**/entities/*.entity{.ts,.js}')],
    migrations: [path.resolve(__dirname, '../../../backend/database/migrations/*{.ts,.js}')],
    synchronize: false,
    logging: false,
  });

  await dataSource.initialize();
  await dataSource.runMigrations();

  return dataSource;
}

export async function teardownTestDatabase(): Promise<void> {
  if (dataSource?.isInitialized) {
    await dataSource.destroy();
  }
  if (container) {
    await container.stop();
  }
}

export function getTestDataSource(): DataSource {
  return dataSource;
}

export function getTestContainer(): StartedPostgreSqlContainer {
  return container;
}
