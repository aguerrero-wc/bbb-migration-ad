import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({ description: 'Room display name', minLength: 2, maxLength: 255 })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ description: 'Room description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Welcome message shown to participants' })
  @IsOptional()
  @IsString()
  welcomeMessage?: string;

  @ApiPropertyOptional({ description: 'Maximum number of participants', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxParticipants?: number;

  @ApiPropertyOptional({ description: 'Whether recording is enabled', default: false })
  @IsOptional()
  @IsBoolean()
  record?: boolean;

  @ApiPropertyOptional({ description: 'Auto-start recording on join', default: false })
  @IsOptional()
  @IsBoolean()
  autoStartRecording?: boolean;

  @ApiPropertyOptional({ description: 'Mute participants on start', default: false })
  @IsOptional()
  @IsBoolean()
  muteOnStart?: boolean;

  @ApiPropertyOptional({ description: 'Only moderator can see webcams', default: false })
  @IsOptional()
  @IsBoolean()
  webcamsOnlyForModerator?: boolean;

  @ApiPropertyOptional({
    description: 'BBB meeting layout',
    enum: [
      'CUSTOM_LAYOUT',
      'SMART_LAYOUT',
      'PRESENTATION_FOCUS',
      'VIDEO_FOCUS',
      'CAMERAS_ONLY',
      'PRESENTATION_ONLY',
      'MEDIA_ONLY',
    ],
    default: 'CUSTOM_LAYOUT',
  })
  @IsOptional()
  @IsIn([
    'CUSTOM_LAYOUT',
    'SMART_LAYOUT',
    'PRESENTATION_FOCUS',
    'VIDEO_FOCUS',
    'CAMERAS_ONLY',
    'PRESENTATION_ONLY',
    'MEDIA_ONLY',
  ])
  meetingLayout?: string;

  @ApiPropertyOptional({
    description: 'Guest access policy',
    enum: ['ALWAYS_ACCEPT', 'ALWAYS_DENY', 'ASK_MODERATOR'],
    default: 'ALWAYS_ACCEPT',
  })
  @IsOptional()
  @IsIn(['ALWAYS_ACCEPT', 'ALWAYS_DENY', 'ASK_MODERATOR'])
  guestPolicy?: string;

  @ApiPropertyOptional({
    description: 'List of disabled BBB features',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  disabledFeatures?: string[];
}
