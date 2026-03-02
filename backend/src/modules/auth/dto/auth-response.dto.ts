import { ApiProperty } from '@nestjs/swagger';

export class UserProfileDto {
  @ApiProperty({ description: 'User ID', format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'User email address' })
  email!: string;

  @ApiProperty({ description: 'User first name' })
  firstName!: string;

  @ApiProperty({ description: 'User last name' })
  lastName!: string;

  @ApiProperty({
    description: 'User role',
    enum: ['admin', 'moderator', 'viewer'],
  })
  role!: string;

  @ApiProperty({ description: 'URL to user avatar image', nullable: true })
  avatarUrl!: string | null;

  @ApiProperty({ description: 'Whether the user account is active' })
  isActive!: boolean;

  @ApiProperty({ description: 'Last login timestamp', nullable: true })
  lastLoginAt!: Date | null;

  @ApiProperty({ description: 'Account creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'User profile', type: UserProfileDto })
  user!: UserProfileDto;

  @ApiProperty({ description: 'JWT access token' })
  accessToken!: string;

  @ApiProperty({ description: 'Opaque refresh token' })
  refreshToken!: string;

  @ApiProperty({ description: 'Access token expiration time in seconds' })
  expiresIn!: number;
}
