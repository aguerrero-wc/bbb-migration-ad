/** Base shape returned by every BBB API call. */
export interface BbbBaseResponse {
  returncode: 'SUCCESS' | 'FAILED';
  messageKey?: string;
  message?: string;
}

/** Response from the `create` API call. */
export interface BbbCreateResponse extends BbbBaseResponse {
  meetingID: string;
  internalMeetingID: string;
  attendeePW: string;
  moderatorPW: string;
  createTime: number;
  voiceBridge: number;
}

/** Single attendee inside a meeting info response. */
export interface BbbAttendee {
  userID: string;
  fullName: string;
  role: string;
  isPresenter: boolean;
  hasJoinedVoice: boolean;
  hasVideo: boolean;
}

/** Detailed meeting information returned by `getMeetingInfo` / `getMeetings`. */
export interface BbbMeetingInfo {
  meetingName: string;
  meetingID: string;
  internalMeetingID: string;
  running: boolean;
  participantCount: number;
  moderatorCount: number;
  listenerCount: number;
  voiceParticipantCount: number;
  videoCount: number;
  hasUserJoined: boolean;
  recording: boolean;
  startTime: number;
  endTime: number;
  duration: number;
  attendees: BbbAttendee[];
}

/** Response from the `isMeetingRunning` API call. */
export interface BbbIsMeetingRunningResponse extends BbbBaseResponse {
  running: boolean;
}
