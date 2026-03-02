import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';

@Entity('audit_logs')
export class AuditLog {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: 'User ID', format: 'uuid', nullable: true })
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @ApiProperty({ description: 'Action performed' })
  @Column({ type: 'varchar', length: 100 })
  action!: string;

  @ApiProperty({ description: 'Type of entity affected', nullable: true })
  @Column({ name: 'entity_type', type: 'varchar', length: 50, nullable: true })
  entityType!: string | null;

  @ApiProperty({ description: 'ID of entity affected', format: 'uuid', nullable: true })
  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId!: string | null;

  @ApiProperty({ description: 'Additional details', default: {} })
  @Column({ type: 'jsonb', default: '{}' })
  details!: Record<string, unknown>;

  @ApiProperty({ description: 'IP address of the client', nullable: true })
  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress!: string | null;

  @ApiProperty({ description: 'User agent of the client', nullable: true })
  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true })
  userAgent!: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
