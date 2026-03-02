import * as fs from 'node:fs';
import * as path from 'node:path';

import { INestApplication } from '@nestjs/common';
import * as nock from 'nock';
import * as request from 'supertest';

import { setupTestDatabase, teardownTestDatabase, getTestContainer, getTestDataSource } from '../../../helpers/db.helper';
import { createTestApp } from '../../../helpers/app.helper';
import { createTestUser, generateTestToken } from '../../../helpers/auth.helper';

const MOCKS_DIR = path.resolve(__dirname, '../../bbb/mocks');

function loadMock(filename: string): string {
  return fs.readFileSync(path.join(MOCKS_DIR, filename), 'utf-8');
}

function mockBbbCreate(): void {
  nock('http://bbb.test')
    .get((uri) => uri.startsWith('/bigbluebutton/api/create'))
    .reply(200, loadMock('create-success.xml'));
}

function mockBbbEnd(): void {
  nock('http://bbb.test')
    .get((uri) => uri.startsWith('/bigbluebutton/api/end'))
    .reply(200, loadMock('end-success.xml'));
}

function mockBbbMeetingInfo(): void {
  nock('http://bbb.test')
    .get((uri) => uri.startsWith('/bigbluebutton/api/getMeetingInfo'))
    .reply(200, loadMock('meeting-info-with-attendees.xml'));
}

function mockBbbMeetingInfoNotFound(): void {
  nock('http://bbb.test')
    .get((uri) => uri.startsWith('/bigbluebutton/api/getMeetingInfo'))
    .reply(200, loadMock('error-not-found.xml'));
}

describe('Rooms API (integration)', () => {
  let app: INestApplication;
  let adminToken: string;
  let moderatorToken: string;
  let viewerToken: string;

  beforeAll(async () => {
    await setupTestDatabase();
    const container = getTestContainer();
    const ds = getTestDataSource();

    // Set env and create app
    app = await createTestApp(container);

    // Create test users directly in DB
    const admin = await createTestUser(ds, {
      email: 'admin-rooms@test.local',
      firstName: 'Admin',
      lastName: 'Rooms',
      role: 'admin',
    });
    const moderator = await createTestUser(ds, {
      email: 'mod-rooms@test.local',
      firstName: 'Mod',
      lastName: 'Rooms',
      role: 'moderator',
    });
    const viewer = await createTestUser(ds, {
      email: 'viewer-rooms@test.local',
      firstName: 'Viewer',
      lastName: 'Rooms',
      role: 'viewer',
    });

    adminToken = generateTestToken(admin);
    moderatorToken = generateTestToken(moderator);
    viewerToken = generateTestToken(viewer);
  }, 120000);

  afterAll(async () => {
    nock.cleanAll();
    if (app) await app.close();
    await teardownTestDatabase();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('POST /api/rooms', () => {
    it('should create a room as admin (201)', async () => {
      mockBbbCreate();

      const res = await request(app.getHttpServer())
        .post('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Admin Room', description: 'Created by admin' })
        .expect(201);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.name).toBe('Admin Room');
      expect(res.body.data.description).toBe('Created by admin');
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.meetingId).toBeDefined();
      expect(res.body.data.status).toBe('inactive');
      expect(res.body.meta.timestamp).toBeDefined();
    });

    it('should create a room as moderator (201)', async () => {
      mockBbbCreate();

      const res = await request(app.getHttpServer())
        .post('/api/rooms')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({ name: 'Moderator Room' })
        .expect(201);

      expect(res.body.data.name).toBe('Moderator Room');
    });

    it('should return 403 when viewer creates a room', async () => {
      await request(app.getHttpServer())
        .post('/api/rooms')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ name: 'Viewer Room' })
        .expect(403);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .post('/api/rooms')
        .send({ name: 'No Auth Room' })
        .expect(401);
    });

    it('should return 400 when name is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });

    it('should return 400 when name is too short', async () => {
      await request(app.getHttpServer())
        .post('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'X' })
        .expect(400);
    });

    it('should create a room with all optional fields', async () => {
      mockBbbCreate();

      const res = await request(app.getHttpServer())
        .post('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Full Room',
          description: 'All options set',
          welcomeMessage: 'Welcome!',
          maxParticipants: 50,
          record: true,
          autoStartRecording: true,
          muteOnStart: true,
          webcamsOnlyForModerator: true,
          meetingLayout: 'SMART_LAYOUT',
          guestPolicy: 'ASK_MODERATOR',
        })
        .expect(201);

      expect(res.body.data.name).toBe('Full Room');
      expect(res.body.data.record).toBe(true);
      expect(res.body.data.muteOnStart).toBe(true);
    });
  });

  describe('GET /api/rooms', () => {
    beforeAll(async () => {
      // Create a few rooms for listing tests
      for (let i = 0; i < 3; i++) {
        mockBbbCreate();
        await request(app.getHttpServer())
          .post('/api/rooms')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: `List Room ${i + 1}` });
      }
    });

    it('should list rooms with pagination (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/rooms')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.pagination).toBeDefined();
      expect(res.body.meta.pagination.page).toBe(1);
      expect(res.body.meta.pagination.total).toBeGreaterThan(0);
      expect(res.body.meta.pagination.totalPages).toBeGreaterThan(0);
    });

    it('should paginate with page and limit parameters', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/rooms?page=1&limit=2')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.meta.pagination.limit).toBe(2);
    });

    it('should filter by search term', async () => {
      mockBbbCreate();
      await request(app.getHttpServer())
        .post('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Searchable Unique Room' });

      const res = await request(app.getHttpServer())
        .get('/api/rooms?search=Searchable+Unique')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
      expect(
        res.body.data.every((room: { name: string }) =>
          room.name.toLowerCase().includes('searchable unique'),
        ),
      ).toBe(true);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/api/rooms')
        .expect(401);
    });
  });

  describe('GET /api/rooms/:id', () => {
    let roomId: string;

    beforeAll(async () => {
      mockBbbCreate();
      const res = await request(app.getHttpServer())
        .post('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Get By ID Room' });
      roomId = res.body.data.id;
    });

    it('should get room by ID (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/rooms/${roomId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

      expect(res.body.data.id).toBe(roomId);
      expect(res.body.data.name).toBe('Get By ID Room');
      expect(res.body.meta.timestamp).toBeDefined();
    });

    it('should return 404 for non-existent room', async () => {
      await request(app.getHttpServer())
        .get('/api/rooms/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(404);
    });

    it('should return 400 for invalid UUID', async () => {
      await request(app.getHttpServer())
        .get('/api/rooms/not-a-uuid')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(400);
    });
  });

  describe('PATCH /api/rooms/:id', () => {
    let roomId: string;

    beforeAll(async () => {
      mockBbbCreate();
      const res = await request(app.getHttpServer())
        .post('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Update Room' });
      roomId = res.body.data.id;
    });

    it('should update room as admin (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/rooms/${roomId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Room Name', description: 'Updated description' })
        .expect(200);

      expect(res.body.data.name).toBe('Updated Room Name');
      expect(res.body.data.description).toBe('Updated description');
    });

    it('should return 403 when viewer updates a room', async () => {
      await request(app.getHttpServer())
        .patch(`/api/rooms/${roomId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ name: 'Viewer Update' })
        .expect(403);
    });

    it('should return 404 when updating non-existent room', async () => {
      await request(app.getHttpServer())
        .patch('/api/rooms/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Ghost Room' })
        .expect(404);
    });
  });

  describe('DELETE /api/rooms/:id', () => {
    it('should delete room as admin (204)', async () => {
      mockBbbCreate();
      const createRes = await request(app.getHttpServer())
        .post('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Delete Me Room' });
      const roomId = createRes.body.data.id;

      await request(app.getHttpServer())
        .delete(`/api/rooms/${roomId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verify it's gone
      await request(app.getHttpServer())
        .get(`/api/rooms/${roomId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 403 when moderator deletes a room', async () => {
      mockBbbCreate();
      const createRes = await request(app.getHttpServer())
        .post('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Mod Cannot Delete' });
      const roomId = createRes.body.data.id;

      await request(app.getHttpServer())
        .delete(`/api/rooms/${roomId}`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .expect(403);
    });

    it('should return 403 when viewer deletes a room', async () => {
      mockBbbCreate();
      const createRes = await request(app.getHttpServer())
        .post('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Viewer Cannot Delete' });
      const roomId = createRes.body.data.id;

      await request(app.getHttpServer())
        .delete(`/api/rooms/${roomId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);
    });

    it('should end BBB meeting when deleting an active room', async () => {
      mockBbbCreate();
      const createRes = await request(app.getHttpServer())
        .post('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Active Room To Delete' });
      const roomId = createRes.body.data.id;

      // Mark room as active in DB
      const ds = getTestDataSource();
      await ds.query('UPDATE rooms SET status = $1 WHERE id = $2', ['active', roomId]);

      mockBbbEnd();

      await request(app.getHttpServer())
        .delete(`/api/rooms/${roomId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });
  });

  describe('POST /api/rooms/:id/join', () => {
    let roomId: string;

    beforeAll(async () => {
      mockBbbCreate();
      const res = await request(app.getHttpServer())
        .post('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Join Room' });
      roomId = res.body.data.id;
    });

    it('should return join URL for authenticated user', async () => {
      mockBbbCreate();

      const res = await request(app.getHttpServer())
        .post(`/api/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(201);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.joinUrl).toBeDefined();
      expect(res.body.data.joinUrl).toContain('http://bbb.test/bigbluebutton/api/join');
    });

    it('should return join URL with MODERATOR role for admin', async () => {
      mockBbbCreate();

      const res = await request(app.getHttpServer())
        .post(`/api/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(res.body.data.joinUrl).toContain('http://bbb.test/bigbluebutton/api/join');
    });

    it('should return 404 for non-existent room', async () => {
      await request(app.getHttpServer())
        .post('/api/rooms/00000000-0000-0000-0000-000000000000/join')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(404);
    });

    it('should return 401 without auth', async () => {
      await request(app.getHttpServer())
        .post(`/api/rooms/${roomId}/join`)
        .expect(401);
    });
  });

  describe('GET /api/rooms/:id/status', () => {
    let roomId: string;

    beforeAll(async () => {
      mockBbbCreate();
      const res = await request(app.getHttpServer())
        .post('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Status Room' });
      roomId = res.body.data.id;
    });

    it('should return room status (200)', async () => {
      mockBbbMeetingInfo();

      const res = await request(app.getHttpServer())
        .get(`/api/rooms/${roomId}/status`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.isRunning).toBe(true);
      expect(res.body.data.participantCount).toBe(2);
      expect(res.body.data.moderatorCount).toBe(1);
      expect(res.body.meta.timestamp).toBeDefined();
    });

    it('should return default status when BBB returns error', async () => {
      mockBbbMeetingInfoNotFound();

      const res = await request(app.getHttpServer())
        .get(`/api/rooms/${roomId}/status`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

      expect(res.body.data.isRunning).toBe(false);
      expect(res.body.data.participantCount).toBe(0);
      expect(res.body.data.moderatorCount).toBe(0);
    });

    it('should return 404 for non-existent room', async () => {
      await request(app.getHttpServer())
        .get('/api/rooms/00000000-0000-0000-0000-000000000000/status')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(404);
    });
  });
});
