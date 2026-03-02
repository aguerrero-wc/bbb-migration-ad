import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RoomCreatorDto {
  @ApiProperty({ description: 'Creator user ID', format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Creator first name' })
  firstName!: string;

  @ApiProperty({ description: 'Creator last name' })
  lastName!: string;
}

export class RoomResponseDto {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Room display name' })
  name!: string;

  @ApiPropertyOptional({ description: 'Room description', nullable: true })
  description!: string | null;

  @ApiProperty({ description: 'BBB meeting identifier' })
  meetingId!: string;

  @ApiPropertyOptional({ description: 'Room image URL', nullable: true })
  imageUrl!: string | null;

  @ApiPropertyOptional({ description: 'Welcome message', nullable: true })
  welcomeMessage!: string | null;

  @ApiPropertyOptional({ description: 'Maximum participants', nullable: true })
  maxParticipants!: number | null;

  @ApiProperty({ description: 'Whether recording is enabled' })
  record!: boolean;

  @ApiProperty({ description: 'Auto-start recording on join' })
  autoStartRecording!: boolean;

  @ApiProperty({ description: 'Mute participants on start' })
  muteOnStart!: boolean;

  @ApiProperty({ description: 'Only moderator can see webcams' })
  webcamsOnlyForModerator!: boolean;

  @ApiProperty({ description: 'BBB meeting layout' })
  meetingLayout!: string;

  @ApiProperty({ description: 'Guest access policy' })
  guestPolicy!: string;

  @ApiPropertyOptional({ description: 'Disabled BBB features', type: [String], nullable: true })
  disabledFeatures!: string[] | null;

  @ApiProperty({ description: 'Room status', enum: ['active', 'inactive'] })
  status!: string;

  @ApiPropertyOptional({ description: 'User who created the room', type: RoomCreatorDto, nullable: true })
  createdBy!: RoomCreatorDto | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;
}

export class PaginationDto {
  @ApiProperty({ description: 'Current page number' })
  page!: number;

  @ApiProperty({ description: 'Items per page' })
  limit!: number;

  @ApiProperty({ description: 'Total number of items' })
  total!: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages!: number;
}

export class RoomListResponseDto {
  @ApiProperty({ description: 'List of rooms', type: [RoomResponseDto] })
  data!: RoomResponseDto[];

  @ApiProperty({ description: 'Response metadata' })
  meta!: {
    timestamp: string;
    pagination: PaginationDto;
  };
}

export class JoinResponseDto {
  @ApiProperty({ description: 'BBB join URL for redirect' })
  joinUrl!: string;
}

export class RoomStatusDto {
  @ApiProperty({ description: 'Whether the meeting is currently running' })
  isRunning!: boolean;

  @ApiProperty({ description: 'Total number of participants' })
  participantCount!: number;

  @ApiProperty({ description: 'Number of moderators' })
  moderatorCount!: number;

  @ApiProperty({ description: 'Number of listeners' })
  listenerCount!: number;

  @ApiProperty({ description: 'Number of voice participants' })
  voiceParticipantCount!: number;

  @ApiProperty({ description: 'Number of video streams' })
  videoCount!: number;

  @ApiProperty({ description: 'Whether any user has joined' })
  hasUserJoined!: boolean;

  @ApiProperty({ description: 'Whether recording is active' })
  recording!: boolean;

  @ApiPropertyOptional({ description: 'Meeting start time (Unix ms)', nullable: true })
  startTime!: number | null;

  @ApiProperty({ description: 'Meeting duration in seconds' })
  duration!: number;
}
