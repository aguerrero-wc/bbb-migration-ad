import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as nock from 'nock';

import { BbbApiException } from '@backend/modules/bbb/bbb-api.exception';
import { BbbService } from '@backend/modules/bbb/bbb.service';
import { BbbMeetingInfo } from '@backend/modules/bbb/interfaces/bbb-responses';

const BBB_URL = 'http://bbb.test';
const BBB_SECRET = 'test-bbb-secret';
const MOCKS_DIR = path.resolve(__dirname, 'mocks');

function loadMock(filename: string): string {
  return fs.readFileSync(path.join(MOCKS_DIR, filename), 'utf-8');
}

function computeChecksum(callName: string, qs: string): string {
  return createHash('sha256')
    .update(callName + qs + BBB_SECRET)
    .digest('hex');
}

function deriveModeratorPassword(meetingId: string): string {
  return createHash('sha256')
    .update(`mod-${meetingId}-${BBB_SECRET}`)
    .digest('hex')
    .slice(0, 24);
}

function deriveAttendeePassword(meetingId: string): string {
  return createHash('sha256')
    .update(`att-${meetingId}-${BBB_SECRET}`)
    .digest('hex')
    .slice(0, 24);
}

describe('BbbService', () => {
  let service: BbbService;
  let module: TestingModule;

  beforeAll(async () => {
    process.env.BBB_SERVER_URL = 'http://bbb.test/bigbluebutton/';
    process.env.BBB_SECRET = BBB_SECRET;

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
        }),
        HttpModule,
      ],
      providers: [BbbService],
    }).compile();

    service = module.get<BbbService>(BbbService);
  });

  afterAll(async () => {
    await module.close();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('Checksum generation', () => {
    it('should produce a valid SHA-256 checksum in join URL', () => {
      const meetingID = 'checksum-test-meeting';
      const fullName = 'Test User';
      const password = deriveModeratorPassword(meetingID);

      const url = service.joinMeeting({
        meetingID,
        fullName,
        role: 'MODERATOR',
      });

      const params = new URLSearchParams({ meetingID, fullName, password });
      const qs = params.toString();
      const expectedChecksum = computeChecksum('join', qs);

      expect(url).toContain(`checksum=${expectedChecksum}`);
    });
  });

  describe('createMeeting', () => {
    it('should create a meeting and return parsed response on SUCCESS', async () => {
      const xml = loadMock('create-success.xml');

      nock(BBB_URL)
        .get((uri) => uri.startsWith('/bigbluebutton/api/create'))
        .reply(200, xml);

      const result = await service.createMeeting({
        name: 'Test Meeting',
        meetingID: 'test-meeting-id',
      });

      expect(result.meetingID).toBe('test-meeting-id');
      expect(result.internalMeetingID).toBe('abc123def456');
      expect(result.attendeePW).toBe('ap');
      expect(result.moderatorPW).toBe('mp');
      expect(result.createTime).toBe(1709280000000);
    });

    it('should throw BbbApiException on FAILED returncode', async () => {
      const xml = loadMock('create-failed.xml');

      nock(BBB_URL)
        .get((uri) => uri.startsWith('/bigbluebutton/api/create'))
        .reply(200, xml);

      await expect(
        service.createMeeting({
          name: 'Bad Meeting',
          meetingID: 'bad-meeting-id',
        }),
      ).rejects.toThrow(BbbApiException);
    });

    it('should auto-derive moderatorPW if not provided', async () => {
      const meetingID = 'auto-derive-test';
      const expectedPW = deriveModeratorPassword(meetingID);
      const xml = loadMock('create-success.xml');

      const scope = nock(BBB_URL)
        .get((uri) => {
          if (!uri.startsWith('/bigbluebutton/api/create')) return false;
          return uri.includes(`moderatorPW=${expectedPW}`);
        })
        .reply(200, xml);

      await service.createMeeting({
        name: 'Auto-derive test',
        meetingID,
      });

      expect(scope.isDone()).toBe(true);
    });

    it('should use provided moderatorPW if explicitly set', async () => {
      const customPW = 'custom-moderator-pw';
      const xml = loadMock('create-success.xml');

      const scope = nock(BBB_URL)
        .get((uri) => {
          if (!uri.startsWith('/bigbluebutton/api/create')) return false;
          return uri.includes(`moderatorPW=${customPW}`);
        })
        .reply(200, xml);

      await service.createMeeting({
        name: 'Custom PW Meeting',
        meetingID: 'custom-pw-meeting',
        moderatorPW: customPW,
      });

      expect(scope.isDone()).toBe(true);
    });
  });

  describe('joinMeeting', () => {
    it('should build a URL with moderator password for MODERATOR role', () => {
      const meetingID = 'join-test-meeting';
      const expectedPW = deriveModeratorPassword(meetingID);

      const url = service.joinMeeting({
        meetingID,
        fullName: 'Mod User',
        role: 'MODERATOR',
      });

      expect(url).toContain('http://bbb.test/bigbluebutton/api/join');
      expect(url).toContain(`password=${expectedPW}`);
      expect(url).toContain(`meetingID=${meetingID}`);
      expect(url).toContain('fullName=Mod+User');
    });

    it('should build a URL with attendee password for VIEWER role', () => {
      const meetingID = 'join-test-meeting';
      const expectedPW = deriveAttendeePassword(meetingID);

      const url = service.joinMeeting({
        meetingID,
        fullName: 'Viewer User',
        role: 'VIEWER',
      });

      expect(url).toContain(`password=${expectedPW}`);
    });

    it('should include optional parameters when provided', () => {
      const url = service.joinMeeting({
        meetingID: 'optional-params-meeting',
        fullName: 'Test User',
        role: 'MODERATOR',
        userID: 'user-123',
        redirect: true,
        createTime: 1709280000000,
        avatarURL: 'https://example.com/avatar.png',
      });

      expect(url).toContain('userID=user-123');
      expect(url).toContain('redirect=true');
      expect(url).toContain('createTime=1709280000000');
      expect(url).toContain(encodeURIComponent('https://example.com/avatar.png'));
    });

    it('should NOT make an HTTP call', () => {
      const scope = nock(BBB_URL)
        .get(() => true)
        .reply(200, '<response><returncode>SUCCESS</returncode></response>');

      service.joinMeeting({
        meetingID: 'no-http-call',
        fullName: 'Test',
        role: 'VIEWER',
      });

      expect(scope.isDone()).toBe(false);
      nock.cleanAll();
    });
  });

  describe('endMeeting', () => {
    it('should call end with derived moderator password', async () => {
      const meetingID = 'end-test-meeting';
      const expectedPW = deriveModeratorPassword(meetingID);
      const xml = loadMock('end-success.xml');

      const scope = nock(BBB_URL)
        .get((uri) => {
          if (!uri.startsWith('/bigbluebutton/api/end')) return false;
          return uri.includes(`meetingID=${meetingID}`) &&
            uri.includes(`password=${expectedPW}`);
        })
        .reply(200, xml);

      await service.endMeeting(meetingID);

      expect(scope.isDone()).toBe(true);
    });

    it('should throw BbbApiException when meeting not found', async () => {
      const xml = loadMock('error-not-found.xml');

      nock(BBB_URL)
        .get((uri) => uri.startsWith('/bigbluebutton/api/end'))
        .reply(200, xml);

      await expect(service.endMeeting('nonexistent')).rejects.toThrow(BbbApiException);
    });
  });

  describe('isMeetingRunning', () => {
    it('should return true when running is true', async () => {
      const xml = loadMock('is-running-true.xml');

      nock(BBB_URL)
        .get((uri) => uri.startsWith('/bigbluebutton/api/isMeetingRunning'))
        .reply(200, xml);

      const result = await service.isMeetingRunning('test-meeting-id');
      expect(result).toBe(true);
    });

    it('should return false when running is false', async () => {
      const xml = loadMock('is-running-false.xml');

      nock(BBB_URL)
        .get((uri) => uri.startsWith('/bigbluebutton/api/isMeetingRunning'))
        .reply(200, xml);

      const result = await service.isMeetingRunning('test-meeting-id');
      expect(result).toBe(false);
    });
  });

  describe('getMeetingInfo', () => {
    it('should parse meeting info with multiple attendees', async () => {
      const xml = loadMock('meeting-info-with-attendees.xml');

      nock(BBB_URL)
        .get((uri) => uri.startsWith('/bigbluebutton/api/getMeetingInfo'))
        .reply(200, xml);

      const result = await service.getMeetingInfo('test-meeting-id');

      expect(result.meetingName).toBe('Test Meeting');
      expect(result.running).toBe(true);
      expect(result.participantCount).toBe(2);
      expect(result.attendees).toHaveLength(2);
      expect(result.attendees[0].fullName).toBe('Moderator User');
      expect(result.attendees[0].role).toBe('MODERATOR');
      expect(result.attendees[1].fullName).toBe('Viewer User');
      expect(result.attendees[1].role).toBe('VIEWER');
    });

    it('should normalize single attendee from object to array', async () => {
      const xml = loadMock('meeting-info-single-attendee.xml');

      nock(BBB_URL)
        .get((uri) => uri.startsWith('/bigbluebutton/api/getMeetingInfo'))
        .reply(200, xml);

      const result = await service.getMeetingInfo('test-meeting-id');

      expect(result.attendees).toHaveLength(1);
      expect(result.attendees[0].fullName).toBe('Solo User');
      expect(result.attendees[0].role).toBe('MODERATOR');
    });

    it('should return empty array when no attendees', async () => {
      const xml = loadMock('meeting-info-no-attendees.xml');

      nock(BBB_URL)
        .get((uri) => uri.startsWith('/bigbluebutton/api/getMeetingInfo'))
        .reply(200, xml);

      const result = await service.getMeetingInfo('test-meeting-id');

      expect(result.running).toBe(false);
      expect(result.attendees).toEqual([]);
    });
  });

  describe('getMeetings', () => {
    it('should return array of meetings when multiple exist', async () => {
      const xml = loadMock('get-meetings-multiple.xml');

      nock(BBB_URL)
        .get((uri) => uri.startsWith('/bigbluebutton/api/getMeetings'))
        .reply(200, xml);

      const result = await service.getMeetings();

      expect(result).toHaveLength(2);
      expect(result[0].meetingName).toBe('Meeting One');
      expect(result[0].running).toBe(true);
      expect(result[1].meetingName).toBe('Meeting Two');
      expect(result[1].running).toBe(false);
    });

    it('should normalize single meeting from object to array', async () => {
      const singleMeetingXml = `
<response>
  <returncode>SUCCESS</returncode>
  <meetings>
    <meeting>
      <meetingName>Solo Meeting</meetingName>
      <meetingID>solo-meeting</meetingID>
      <internalMeetingID>int-solo</internalMeetingID>
      <running>true</running>
      <participantCount>1</participantCount>
      <moderatorCount>1</moderatorCount>
      <listenerCount>0</listenerCount>
      <voiceParticipantCount>1</voiceParticipantCount>
      <videoCount>0</videoCount>
      <hasUserJoined>true</hasUserJoined>
      <recording>false</recording>
      <startTime>1709280000000</startTime>
      <endTime>0</endTime>
      <duration>0</duration>
      <attendees></attendees>
    </meeting>
  </meetings>
</response>`;

      nock(BBB_URL)
        .get((uri) => uri.startsWith('/bigbluebutton/api/getMeetings'))
        .reply(200, singleMeetingXml);

      const result = await service.getMeetings();

      expect(result).toHaveLength(1);
      expect(result[0].meetingName).toBe('Solo Meeting');
    });

    it('should return empty array when no meetings exist', async () => {
      const xml = loadMock('get-meetings-empty.xml');

      nock(BBB_URL)
        .get((uri) => uri.startsWith('/bigbluebutton/api/getMeetings'))
        .reply(200, xml);

      const result = await service.getMeetings();

      expect(result).toEqual([]);
    });

    it('should normalize attendees within each meeting', async () => {
      const xml = loadMock('get-meetings-multiple.xml');

      nock(BBB_URL)
        .get((uri) => uri.startsWith('/bigbluebutton/api/getMeetings'))
        .reply(200, xml);

      const result: BbbMeetingInfo[] = await service.getMeetings();

      for (const meeting of result) {
        expect(Array.isArray(meeting.attendees)).toBe(true);
      }
    });
  });

  describe('Error handling', () => {
    it('should throw BbbApiException on network error', async () => {
      nock(BBB_URL)
        .get((uri) => uri.startsWith('/bigbluebutton/api/isMeetingRunning'))
        .replyWithError('Connection refused');

      await expect(service.isMeetingRunning('test-meeting-id')).rejects.toThrow(
        BbbApiException,
      );
    });

    it('should throw BbbApiException on HTTP 500', async () => {
      nock(BBB_URL)
        .get((uri) => uri.startsWith('/bigbluebutton/api/isMeetingRunning'))
        .reply(500, 'Internal Server Error');

      await expect(service.isMeetingRunning('test-meeting-id')).rejects.toThrow(
        BbbApiException,
      );
    });

    it('should throw BbbApiException on invalid XML (no response element)', async () => {
      nock(BBB_URL)
        .get((uri) => uri.startsWith('/bigbluebutton/api/isMeetingRunning'))
        .reply(200, '<invalid>not a bbb response</invalid>');

      await expect(service.isMeetingRunning('test-meeting-id')).rejects.toThrow(
        BbbApiException,
      );
    });

    it('should throw BbbApiException with message from FAILED response', async () => {
      const xml = loadMock('error-not-found.xml');

      nock(BBB_URL)
        .get((uri) => uri.startsWith('/bigbluebutton/api/getMeetingInfo'))
        .reply(200, xml);

      try {
        await service.getMeetingInfo('nonexistent');
        fail('Expected BbbApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(BbbApiException);
        const bbbError = error as BbbApiException;
        const response = bbbError.getResponse() as { message: string; bbbMessageKey: string };
        expect(response.message).toBe('We could not find a meeting with that meeting ID');
        expect(response.bbbMessageKey).toBe('notFound');
      }
    });
  });
});
