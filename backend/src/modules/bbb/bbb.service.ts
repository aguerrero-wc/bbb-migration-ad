import { createHash } from 'node:crypto';

import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { firstValueFrom } from 'rxjs';

import { BbbApiException } from './bbb-api.exception';
import { BbbCreateParams, BbbJoinParams } from './interfaces/bbb-params';
import {
  BbbAttendee,
  BbbCreateResponse,
  BbbMeetingInfo,
} from './interfaces/bbb-responses';

/**
 * Low-level wrapper around the BigBlueButton HTTP/XML API.
 *
 * Every public method corresponds to a single BBB API call (except
 * `joinMeeting`, which only builds a signed URL without making an HTTP
 * request).
 */
@Injectable()
export class BbbService {
  private readonly logger = new Logger(BbbService.name);
  private readonly baseUrl: string;
  private readonly secret: string;
  private readonly xmlParser: XMLParser;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    const rawUrl = this.configService.get<string>('BBB_SERVER_URL', '');
    this.baseUrl = rawUrl.replace(/\/+$/, '') + '/api/';
    this.secret = this.configService.get<string>('BBB_SECRET', '');
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      parseTagValue: true,
    });
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Creates (or re-uses) a meeting on the BBB server.
   * The call is idempotent: calling it twice with the same `meetingID` returns
   * the existing meeting.
   *
   * @param params - Meeting creation parameters.
   * @returns Parsed BBB create-meeting response.
   */
  async createMeeting(params: BbbCreateParams): Promise<BbbCreateResponse> {
    const queryParams: Record<string, string> = this.flattenParams(params);

    if (!queryParams['moderatorPW']) {
      queryParams['moderatorPW'] = this.deriveModeratorPassword(
        params.meetingID,
      );
    }

    if (!queryParams['attendeePW']) {
      queryParams['attendeePW'] = this.deriveAttendeePassword(
        params.meetingID,
      );
    }

    const url = this.buildUrl('create', queryParams);
    this.logger.debug(`createMeeting URL (without secret): create?${new URLSearchParams(queryParams).toString()}`);

    const xml = await this.httpGet(url);
    return this.parseCreateResponse(xml);
  }

  /**
   * Builds a signed join URL. **No HTTP call is made.**
   *
   * The caller is responsible for redirecting the user to the returned URL.
   *
   * @param params - Join parameters (meetingID, fullName, role, etc.).
   * @returns Fully-qualified, signed BBB join URL.
   */
  joinMeeting(params: BbbJoinParams): string {
    const queryParams: Record<string, string> = {};

    queryParams['meetingID'] = params.meetingID;
    queryParams['fullName'] = params.fullName;
    queryParams['password'] = this.derivePassword(
      params.meetingID,
      params.role,
    );

    if (params.userID) queryParams['userID'] = params.userID;
    if (params.redirect !== undefined)
      queryParams['redirect'] = String(params.redirect);
    if (params.createTime !== undefined)
      queryParams['createTime'] = String(params.createTime);
    if (params.avatarURL) queryParams['avatarURL'] = params.avatarURL;

    const url = this.buildUrl('join', queryParams);
    this.logger.debug(`joinMeeting URL built for ${params.fullName} (${params.role})`);
    return url;
  }

  /**
   * Forcefully ends an active meeting.
   *
   * @param meetingId - The BBB `meetingID` to terminate.
   */
  async endMeeting(meetingId: string): Promise<void> {
    const queryParams: Record<string, string> = {
      meetingID: meetingId,
      password: this.deriveModeratorPassword(meetingId),
    };

    const url = this.buildUrl('end', queryParams);
    this.logger.debug(`endMeeting URL (without secret): end?${new URLSearchParams(queryParams).toString()}`);

    const xml = await this.httpGet(url);
    this.parseXml(xml);
  }

  /**
   * Checks whether the given meeting is currently running.
   *
   * @param meetingId - The BBB `meetingID`.
   * @returns `true` when at least one user has joined and the meeting is active.
   */
  async isMeetingRunning(meetingId: string): Promise<boolean> {
    const url = this.buildUrl('isMeetingRunning', { meetingID: meetingId });
    const xml = await this.httpGet(url);
    const parsed = this.parseXml<{ running: boolean | string }>(xml);
    return parsed.running === true || parsed.running === 'true';
  }

  /**
   * Retrieves detailed information about a specific meeting.
   *
   * @param meetingId - The BBB `meetingID`.
   * @returns Parsed meeting info including attendee list.
   */
  async getMeetingInfo(meetingId: string): Promise<BbbMeetingInfo> {
    const url = this.buildUrl('getMeetingInfo', { meetingID: meetingId });
    const xml = await this.httpGet(url);
    const parsed = this.parseXml<BbbMeetingInfo & { attendees?: unknown }>(xml);
    parsed.attendees = this.normalizeAttendees(parsed.attendees);
    return parsed;
  }

  /**
   * Lists all active meetings on the BBB server.
   *
   * @returns Array of meeting info objects (empty when no meetings exist).
   */
  async getMeetings(): Promise<BbbMeetingInfo[]> {
    const url = this.buildUrl('getMeetings', {});
    const xml = await this.httpGet(url);
    const parsed = this.parseXml<{ meetings?: unknown }>(xml);

    if (!parsed.meetings) return [];

    const meetingsNode = parsed.meetings as { meeting?: unknown };
    if (!meetingsNode.meeting) return [];

    const raw = meetingsNode.meeting;
    const list: BbbMeetingInfo[] = Array.isArray(raw)
      ? (raw as BbbMeetingInfo[])
      : [raw as BbbMeetingInfo];

    return list.map((m) => ({
      ...m,
      attendees: this.normalizeAttendees(
        (m as BbbMeetingInfo & { attendees?: unknown }).attendees,
      ),
    }));
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Builds a fully-signed BBB API URL.
   *
   * @param callName - BBB API method name (e.g. `create`, `join`).
   * @param params - Key-value query parameters (values already stringified).
   * @returns Signed URL ready for an HTTP GET.
   */
  private buildUrl(
    callName: string,
    params: Record<string, string>,
  ): string {
    const qs = new URLSearchParams(params).toString();
    const checksum = createHash('sha256')
      .update(callName + qs + this.secret)
      .digest('hex');
    const separator = qs ? '&' : '';
    return `${this.baseUrl}${callName}?${qs}${separator}checksum=${checksum}`;
  }

  /**
   * Performs an HTTP GET to the given URL and returns the raw response body.
   *
   * @param url - Fully-qualified URL (already signed).
   * @returns Raw XML string.
   * @throws BbbApiException on network or HTTP errors.
   */
  private async httpGet(url: string): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<string>(url, { responseType: 'text' }),
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        const status = error.response?.status ?? 'unknown';
        this.logger.error(
          `BBB HTTP error (status=${status}): ${error.message}`,
        );
        throw new BbbApiException(
          `BBB server returned HTTP ${status}: ${error.message}`,
        );
      }
      throw new BbbApiException(
        `Unexpected error calling BBB API: ${String(error)}`,
      );
    }
  }

  /**
   * Parses a BBB XML response body, validates `returncode`, and returns the
   * typed payload nested under the `<response>` root element.
   *
   * @param xml - Raw XML string from BBB.
   * @returns Parsed response body (without the `<response>` wrapper).
   * @throws BbbApiException when `returncode` is not `SUCCESS`.
   */
  private parseXml<T>(xml: string): T {
    const raw = this.xmlParser.parse(xml) as { response?: Record<string, unknown> };
    const response = raw.response;

    if (!response) {
      this.logger.error('BBB returned unexpected XML (no <response> element)');
      throw new BbbApiException('Invalid XML response from BBB server');
    }

    if (response['returncode'] !== 'SUCCESS') {
      const messageKey = (response['messageKey'] as string) ?? 'unknown';
      const message =
        (response['message'] as string) ?? 'BBB API call failed';
      this.logger.error(`BBB API error: ${messageKey} — ${message}`);
      throw new BbbApiException(message, messageKey);
    }

    return response as unknown as T;
  }

  /**
   * Parses a BBB create response, treating `idNotUnique` as a success
   * (the meeting already exists with compatible passwords).
   *
   * @param xml - Raw XML from BBB create endpoint.
   * @returns Parsed create response.
   * @throws BbbApiException for non-recoverable errors.
   */
  private parseCreateResponse(xml: string): BbbCreateResponse {
    const raw = this.xmlParser.parse(xml) as { response?: Record<string, unknown> };
    const response = raw.response;

    if (!response) {
      this.logger.error('BBB returned unexpected XML (no <response> element)');
      throw new BbbApiException('Invalid XML response from BBB server');
    }

    if (response['returncode'] === 'SUCCESS') {
      return response as unknown as BbbCreateResponse;
    }

    const messageKey = (response['messageKey'] as string) ?? 'unknown';

    if (messageKey === 'idNotUnique') {
      this.logger.debug(`Meeting already exists (idNotUnique), treating as success`);
      return response as unknown as BbbCreateResponse;
    }

    const message = (response['message'] as string) ?? 'BBB API call failed';
    this.logger.error(`BBB API error: ${messageKey} — ${message}`);
    throw new BbbApiException(message, messageKey);
  }

  /**
   * Derives a deterministic moderator password from the meeting ID so we can
   * call `end` without persisting passwords.
   */
  private deriveModeratorPassword(meetingId: string): string {
    return createHash('sha256')
      .update(`mod-${meetingId}-${this.secret}`)
      .digest('hex')
      .slice(0, 24);
  }

  /**
   * Derives a deterministic attendee password from the meeting ID.
   */
  private deriveAttendeePassword(meetingId: string): string {
    return createHash('sha256')
      .update(`att-${meetingId}-${this.secret}`)
      .digest('hex')
      .slice(0, 24);
  }

  /**
   * Derives a deterministic password for a given role.
   */
  private derivePassword(
    meetingId: string,
    role: 'MODERATOR' | 'VIEWER',
  ): string {
    if (role === 'MODERATOR') return this.deriveModeratorPassword(meetingId);
    return this.deriveAttendeePassword(meetingId);
  }

  /**
   * Converts BBB's `<attendees>` node into a consistent array.
   *
   * BBB returns nothing when there are no attendees, a single object when
   * there is one, and an array when there are multiple.
   */
  private normalizeAttendees(raw: unknown): BbbAttendee[] {
    if (!raw) return [];
    const node = raw as { attendee?: unknown };
    if (!node.attendee) return [];
    return Array.isArray(node.attendee)
      ? (node.attendee as BbbAttendee[])
      : [node.attendee as BbbAttendee];
  }

  /**
   * Converts a `BbbCreateParams` object into a flat `Record<string, string>`
   * suitable for URLSearchParams.
   */
  private flattenParams(params: BbbCreateParams): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        result[key] = String(value);
      }
    }
    return result;
  }
}
