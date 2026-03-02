import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';

import { HttpExceptionFilter } from '@backend/common/filters/http-exception.filter';
import { TransformInterceptor } from '@backend/common/interceptors/transform.interceptor';

export async function createTestApp(container: StartedPostgreSqlContainer): Promise<INestApplication> {
  process.env.POSTGRES_HOST = container.getHost();
  process.env.POSTGRES_PORT = String(container.getMappedPort(5432));
  process.env.POSTGRES_USER = container.getUsername();
  process.env.POSTGRES_PASSWORD = container.getPassword();
  process.env.POSTGRES_DB = container.getDatabase();
  process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
  process.env.JWT_ACCESS_EXPIRY = '15m';
  process.env.JWT_REFRESH_EXPIRY = '7d';
  process.env.BCRYPT_ROUNDS = '4';
  process.env.BBB_SERVER_URL = 'http://bbb.test/bigbluebutton/';
  process.env.BBB_SECRET = 'test-bbb-secret';
  process.env.NODE_ENV = 'test';
  process.env.CORS_ORIGIN = 'http://localhost:3000';
  process.env.THROTTLE_LIMIT = '1000';

  const { AppModule } = await import('@backend/app.module');

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  await app.init();
  return app;
}
