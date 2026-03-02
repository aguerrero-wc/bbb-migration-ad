import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as nock from 'nock';

import { setupTestDatabase, teardownTestDatabase, getTestContainer } from '../../../helpers/db.helper';
import { createTestApp } from '../../../helpers/app.helper';

describe('Auth API (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    await setupTestDatabase();
    const container = getTestContainer();

    // Intercept any BBB calls that might happen during startup
    nock('http://bbb.test')
      .get(() => true)
      .reply(200, '<response><returncode>SUCCESS</returncode></response>')
      .persist();

    app = await createTestApp(container);
  }, 120000);

  afterAll(async () => {
    nock.cleanAll();
    if (app) await app.close();
    await teardownTestDatabase();
  });

  afterEach(() => {
    nock.cleanAll();
    // Re-enable BBB mock for potential background calls
    nock('http://bbb.test')
      .get(() => true)
      .reply(200, '<response><returncode>SUCCESS</returncode></response>')
      .persist();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user and return 201 with tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'newuser@test.local',
          password: 'SecureP@ss1!',
          firstName: 'New',
          lastName: 'User',
        })
        .expect(201);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe('newuser@test.local');
      expect(res.body.data.user.firstName).toBe('New');
      expect(res.body.data.user.lastName).toBe('User');
      expect(res.body.data.user.role).toBe('viewer');
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.expiresIn).toBeGreaterThan(0);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.timestamp).toBeDefined();
    });

    it('should return 409 for duplicate email', async () => {
      const email = 'duplicate@test.local';

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email,
          password: 'SecureP@ss1!',
          firstName: 'First',
          lastName: 'User',
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email,
          password: 'SecureP@ss1!',
          firstName: 'Second',
          lastName: 'User',
        })
        .expect(409);

      expect(res.body.statusCode).toBe(409);
    });

    it('should return 400 for missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'missing@test.local',
        })
        .expect(400);
    });

    it('should return 400 for password too short', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'short@test.local',
          password: 'Sh1!',
          firstName: 'Short',
          lastName: 'Pass',
        })
        .expect(400);
    });

    it('should return 400 for password missing complexity requirements', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'weak@test.local',
          password: 'weakpassword',
          firstName: 'Weak',
          lastName: 'Pass',
        })
        .expect(400);
    });

    it('should return 400 for invalid email', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: 'SecureP@ss1!',
          firstName: 'Bad',
          lastName: 'Email',
        })
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    const loginEmail = 'loginuser@test.local';
    const loginPassword = 'LoginP@ss1!';

    beforeAll(async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: loginEmail,
          password: loginPassword,
          firstName: 'Login',
          lastName: 'User',
        });
    });

    it('should login successfully with valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: loginEmail, password: loginPassword })
        .expect(200);

      expect(res.body.data.user.email).toBe(loginEmail);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.expiresIn).toBeGreaterThan(0);
      expect(res.body.meta.timestamp).toBeDefined();
    });

    it('should return 401 for wrong password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: loginEmail, password: 'WrongP@ss1!' })
        .expect(401);

      expect(res.body.statusCode).toBe(401);
    });

    it('should return 401 for non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'ghost@test.local', password: 'SecureP@ss1!' })
        .expect(401);
    });

    it('should reset failed login count on successful login', async () => {
      const resetEmail = 'resetcount@test.local';
      const resetPassword = 'ResetP@ss1!';

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: resetEmail,
          password: resetPassword,
          firstName: 'Reset',
          lastName: 'Count',
        });

      // Fail twice
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: resetEmail, password: 'WrongP@ss1!' });
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: resetEmail, password: 'WrongP@ss1!' });

      // Succeed → resets count
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: resetEmail, password: resetPassword })
        .expect(200);

      // Fail 4 more times → should NOT trigger lockout (count was reset)
      for (let i = 0; i < 4; i++) {
        await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ email: resetEmail, password: 'WrongP@ss1!' });
      }

      // Should still be able to login (4 < 5)
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: resetEmail, password: resetPassword })
        .expect(200);
    });

    it('should lock account after 5 failed attempts and return 423', async () => {
      const lockEmail = 'lockout@test.local';
      const lockPassword = 'LockP@ss1!';

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: lockEmail,
          password: lockPassword,
          firstName: 'Lock',
          lastName: 'Out',
        });

      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ email: lockEmail, password: 'WrongP@ss1!' });
      }

      // Now account should be locked
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: lockEmail, password: lockPassword })
        .expect(423);

      expect(res.body.statusCode).toBe(423);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh tokens successfully', async () => {
      const registerRes = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'refresh@test.local',
          password: 'RefreshP@ss1!',
          firstName: 'Refresh',
          lastName: 'User',
        });

      const { refreshToken } = registerRes.body.data;

      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      // New refresh token should differ from old one (rotation)
      expect(res.body.data.refreshToken).not.toBe(refreshToken);
    });

    it('should revoke old refresh token after rotation', async () => {
      const registerRes = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'rotation@test.local',
          password: 'RotateP@ss1!',
          firstName: 'Rotation',
          lastName: 'User',
        });

      const oldRefreshToken = registerRes.body.data.refreshToken;

      // Use it once — succeeds
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(200);

      // Use the same old token again — should fail (revoked)
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(401);
    });

    it('should return 401 for invalid/random refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'completely-invalid-random-token' })
        .expect(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout and revoke refresh token', async () => {
      const registerRes = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'logout@test.local',
          password: 'LogoutP@ss1!',
          firstName: 'Logout',
          lastName: 'User',
        });

      const { accessToken, refreshToken } = registerRes.body.data;

      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      // Refresh with the revoked token should fail
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .send({ refreshToken: 'some-token' })
        .expect(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user profile with valid token', async () => {
      const registerRes = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'me@test.local',
          password: 'MeP@ssw0rd!',
          firstName: 'Me',
          lastName: 'Profile',
        });

      const { accessToken } = registerRes.body.data;

      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.email).toBe('me@test.local');
      expect(res.body.data.firstName).toBe('Me');
      expect(res.body.data.lastName).toBe('Profile');
      expect(res.body.data.role).toBe('viewer');
      expect(res.body.data.isActive).toBe(true);
      expect(res.body.meta.timestamp).toBeDefined();
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-jwt-token')
        .expect(401);
    });
  });

  describe('Protected endpoints', () => {
    it('should return 401 for GET /api/rooms without token', async () => {
      await request(app.getHttpServer())
        .get('/api/rooms')
        .expect(401);
    });
  });
});
