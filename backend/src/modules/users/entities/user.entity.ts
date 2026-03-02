import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: 'User email address', uniqueItems: true })
  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @ApiProperty({ description: 'Hashed password' })
  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @ApiProperty({ description: 'First name' })
  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName!: string;

  @ApiProperty({ description: 'Last name' })
  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName!: string;

  @ApiProperty({
    description: 'User role',
    enum: ['admin', 'moderator', 'viewer'],
    default: 'viewer',
  })
  @Column({ type: 'varchar', length: 20, default: 'viewer' })
  role!: string;

  @ApiProperty({ description: 'URL to user avatar image', nullable: true })
  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
  avatarUrl!: string | null;

  @ApiProperty({ description: 'Whether the user account is active', default: true })
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @ApiProperty({ description: 'Last login timestamp', nullable: true })
  @Column({
    name: 'last_login_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  lastLoginAt!: Date | null;

  @ApiProperty({ description: 'Number of consecutive failed login attempts', default: 0 })
  @Column({ name: 'failed_login_count', type: 'integer', default: 0 })
  failedLoginCount!: number;

  @ApiProperty({ description: 'Account locked until this timestamp', nullable: true })
  @Column({ name: 'locked_until', type: 'timestamp with time zone', nullable: true })
  lockedUntil!: Date | null;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
