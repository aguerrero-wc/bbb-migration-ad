import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';

@Entity('rooms')
export class Room {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: 'Room display name' })
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @ApiProperty({ description: 'Room description', nullable: true })
  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @ApiProperty({ description: 'BBB meeting identifier', uniqueItems: true })
  @Column({ name: 'meeting_id', type: 'varchar', length: 256, unique: true })
  meetingId!: string;

  @ApiProperty({ description: 'Room image URL', nullable: true })
  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl!: string | null;

  @ApiProperty({ description: 'Welcome message shown to participants', nullable: true })
  @Column({ name: 'welcome_message', type: 'text', nullable: true })
  welcomeMessage!: string | null;

  @ApiProperty({ description: 'Maximum number of participants', nullable: true })
  @Column({ name: 'max_participants', type: 'integer', nullable: true })
  maxParticipants!: number | null;

  @ApiProperty({ description: 'Whether recording is enabled', default: false })
  @Column({ type: 'boolean', default: false })
  record!: boolean;

  @ApiProperty({ description: 'Auto-start recording on join', default: false })
  @Column({ name: 'auto_start_recording', type: 'boolean', default: false })
  autoStartRecording!: boolean;

  @ApiProperty({ description: 'Mute participants on start', default: false })
  @Column({ name: 'mute_on_start', type: 'boolean', default: false })
  muteOnStart!: boolean;

  @ApiProperty({
    description: 'Only moderator can see webcams',
    default: false,
  })
  @Column({
    name: 'webcams_only_for_moderator',
    type: 'boolean',
    default: false,
  })
  webcamsOnlyForModerator!: boolean;

  @ApiProperty({ description: 'Room lock settings', type: 'object', default: {} })
  @Column({ name: 'lock_settings', type: 'jsonb', default: {} })
  lockSettings!: Record<string, unknown>;

  @ApiProperty({
    description: 'List of disabled BBB features',
    type: [String],
    nullable: true,
  })
  @Column({ name: 'disabled_features', type: 'text', array: true, nullable: true })
  disabledFeatures!: string[] | null;

  @ApiProperty({ description: 'BBB meeting layout', default: 'CUSTOM_LAYOUT' })
  @Column({
    name: 'meeting_layout',
    type: 'varchar',
    length: 50,
    default: 'CUSTOM_LAYOUT',
  })
  meetingLayout!: string;

  @ApiProperty({ description: 'Guest access policy', default: 'ALWAYS_ACCEPT' })
  @Column({
    name: 'guest_policy',
    type: 'varchar',
    length: 20,
    default: 'ALWAYS_ACCEPT',
  })
  guestPolicy!: string;

  @ApiProperty({ description: 'Additional metadata', type: 'object', default: {} })
  @Column({ type: 'jsonb', default: {} })
  meta!: Record<string, unknown>;

  @ApiProperty({
    description: 'Room status',
    enum: ['active', 'inactive'],
    default: 'inactive',
  })
  @Column({ type: 'varchar', length: 20, default: 'inactive' })
  status!: string;

  @ApiProperty({ description: 'User who created the room', type: () => User })
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy!: User | null;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
