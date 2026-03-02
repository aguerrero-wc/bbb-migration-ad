export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'moderator' | 'viewer';
  avatarUrl: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface Room {
  id: string;
  name: string;
  description: string | null;
  meetingId: string;
  imageUrl: string | null;
  welcomeMessage: string | null;
  maxParticipants: number | null;
  record: boolean;
  autoStartRecording: boolean;
  muteOnStart: boolean;
  webcamsOnlyForModerator: boolean;
  meetingLayout: string;
  guestPolicy: string;
  disabledFeatures: string[] | null;
  status: 'active' | 'inactive';
  createdBy: { id: string; firstName: string; lastName: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoomStatus {
  isRunning: boolean;
  participantCount: number;
  moderatorCount: number;
  listenerCount: number;
  voiceParticipantCount: number;
  videoCount: number;
  hasUserJoined: boolean;
  recording: boolean;
  startTime: number | null;
  duration: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Reservation {
  id: string;
  roomId: string;
  title: string;
  startTime: string;
  endTime: string;
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Recording {
  id: string;
  roomId: string;
  recordId: string;
  name: string;
  state: 'processing' | 'processed' | 'published' | 'unpublished' | 'deleted';
  startTime: string;
  endTime: string;
  playbackUrl: string;
  size: number;
  createdAt: string;
  updatedAt: string;
}
