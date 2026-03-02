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

@Entity('refresh_tokens')
export class RefreshToken {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: 'User ID', format: 'uuid' })
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ApiProperty({ description: 'SHA-256 hash of the refresh token' })
  @Column({ name: 'token_hash', type: 'varchar', length: 64 })
  tokenHash!: string;

  @ApiProperty({ description: 'Token expiration timestamp' })
  @Column({ name: 'expires_at', type: 'timestamp with time zone' })
  expiresAt!: Date;

  @ApiProperty({ description: 'Whether the token has been revoked', default: false })
  @Column({ name: 'is_revoked', type: 'boolean', default: false })
  isRevoked!: boolean;

  @ApiProperty({ description: 'User agent of the client', nullable: true })
  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true })
  userAgent!: string | null;

  @ApiProperty({ description: 'IP address of the client', nullable: true })
  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress!: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
