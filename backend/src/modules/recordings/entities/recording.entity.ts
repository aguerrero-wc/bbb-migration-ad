import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Room } from '../../rooms/entities/room.entity';

@Entity('recordings')
export class Recording {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({
    description: 'Room this recording belongs to',
    type: () => Room,
    nullable: true,
  })
  @ManyToOne(() => Room, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'room_id' })
  room!: Room | null;

  @ApiProperty({ description: 'BBB recording ID', uniqueItems: true })
  @Column({
    name: 'bbb_record_id',
    type: 'varchar',
    length: 255,
    unique: true,
  })
  bbbRecordId!: string;

  @ApiProperty({ description: 'BBB internal meeting ID', nullable: true })
  @Column({
    name: 'bbb_internal_meeting_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  bbbInternalMeetingId!: string | null;

  @ApiProperty({ description: 'Recording name', nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  name!: string | null;

  @ApiProperty({
    description: 'Recording state',
    default: 'processing',
  })
  @Column({ type: 'varchar', length: 20, default: 'processing' })
  state!: string;

  @ApiProperty({ description: 'Whether the recording is published', default: false })
  @Column({ type: 'boolean', default: false })
  published!: boolean;

  @ApiProperty({ description: 'Recording start time', nullable: true })
  @Column({
    name: 'start_time',
    type: 'timestamp with time zone',
    nullable: true,
  })
  startTime!: Date | null;

  @ApiProperty({ description: 'Recording end time', nullable: true })
  @Column({
    name: 'end_time',
    type: 'timestamp with time zone',
    nullable: true,
  })
  endTime!: Date | null;

  @ApiProperty({ description: 'Number of participants', nullable: true })
  @Column({ name: 'participants_count', type: 'integer', nullable: true })
  participantsCount!: number | null;

  @ApiProperty({ description: 'Playback URL', nullable: true })
  @Column({
    name: 'playback_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  playbackUrl!: string | null;

  @ApiProperty({ description: 'Playback format', nullable: true })
  @Column({
    name: 'playback_format',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  playbackFormat!: string | null;

  @ApiProperty({ description: 'Duration in seconds', nullable: true })
  @Column({ name: 'duration_seconds', type: 'integer', nullable: true })
  durationSeconds!: number | null;

  @ApiProperty({ description: 'Size in bytes', nullable: true })
  @Column({ name: 'size_bytes', type: 'bigint', nullable: true })
  sizeBytes!: string | null;

  @ApiProperty({ description: 'Thumbnail URLs', type: 'array', default: [] })
  @Column({ type: 'jsonb', default: [] })
  thumbnails!: unknown[];

  @ApiProperty({ description: 'Additional metadata', type: 'object', default: {} })
  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;
}
