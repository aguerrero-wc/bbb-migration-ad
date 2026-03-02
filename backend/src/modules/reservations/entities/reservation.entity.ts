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

import { Room } from '../../rooms/entities/room.entity';
import { User } from '../../users/entities/user.entity';

@Entity('reservations')
export class Reservation {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: 'Room this reservation belongs to', type: () => Room })
  @ManyToOne(() => Room, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room!: Room;

  @ApiProperty({ description: 'Reservation title' })
  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @ApiProperty({ description: 'Reservation description', nullable: true })
  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @ApiProperty({ description: 'Start time of the reservation' })
  @Column({ name: 'start_time', type: 'timestamp with time zone' })
  startTime!: Date;

  @ApiProperty({ description: 'End time of the reservation' })
  @Column({ name: 'end_time', type: 'timestamp with time zone' })
  endTime!: Date;

  @ApiProperty({ description: 'iCal recurrence rule', nullable: true })
  @Column({
    name: 'recurrence_rule',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  recurrenceRule!: string | null;

  @ApiProperty({ description: 'User who created the reservation', type: () => User })
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
