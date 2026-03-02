/** Parameters accepted by the BBB `create` API call. */
export interface BbbCreateParams {
  name: string;
  meetingID: string;
  welcome?: string;
  maxParticipants?: number;
  record?: boolean;
  duration?: number;
  autoStartRecording?: boolean;
  muteOnStart?: boolean;
  webcamsOnlyForModerator?: boolean;
  guestPolicy?: string;
  meetingLayout?: string;
  disabledFeatures?: string;
  moderatorPW?: string;
  attendeePW?: string;
  [metaKey: `meta_${string}`]: string;
}

/** Parameters accepted by the BBB `join` URL builder. */
export interface BbbJoinParams {
  meetingID: string;
  fullName: string;
  role: 'MODERATOR' | 'VIEWER';
  userID?: string;
  redirect?: boolean;
  createTime?: number;
  avatarURL?: string;
}
