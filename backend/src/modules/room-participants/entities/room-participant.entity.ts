import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Room } from '../../rooms/entities/room.entity';
import { User } from '../../users/entities/user.entity';

@Entity('room_participants')
export class RoomParticipant {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: 'Room the participant joined', type: () => Room })
  @ManyToOne(() => Room, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room!: Room;

  @ApiProperty({ description: 'User who joined the room', type: () => User })
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;

  @ApiProperty({ description: 'BBB internal user ID', nullable: true })
  @Column({
    name: 'bbb_internal_user_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  bbbInternalUserId!: string | null;

  @ApiProperty({ description: 'Timestamp when the user joined' })
  @Column({
    name: 'joined_at',
    type: 'timestamp with time zone',
    default: () => 'NOW()',
  })
  joinedAt!: Date;

  @ApiProperty({ description: 'Timestamp when the user left', nullable: true })
  @Column({
    name: 'left_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  leftAt!: Date | null;

  @ApiProperty({ description: 'Participant role in the room' })
  @Column({ type: 'varchar', length: 20 })
  role!: string;

  @ApiProperty({ description: 'Whether the participant is a presenter', default: false })
  @Column({ name: 'is_presenter', type: 'boolean', default: false })
  isPresenter!: boolean;
}
