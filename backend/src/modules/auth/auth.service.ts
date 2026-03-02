import {
  ConflictException,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { Repository } from 'typeorm';

import { User } from '../users/entities/user.entity';
import { AuthResponseDto, UserProfileDto } from './dto/auth-response.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuditLog } from './entities/audit-log.entity';
import { RefreshToken } from './entities/refresh-token.entity';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const bcryptRounds = parseInt(
      this.configService.get<string>('BCRYPT_ROUNDS', '12'),
      10,
    );
    const passwordHash = await hash(dto.password, bcryptRounds);

    const user = this.userRepository.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: 'viewer',
    });

    const savedUser = await this.userRepository.save(user);

    const tokens = await this.generateTokens(savedUser);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        userId: savedUser.id,
        action: 'user.registered',
        entityType: 'user',
        entityId: savedUser.id,
      }),
    );

    return {
      user: this.mapToProfile(savedUser),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  }

  async login(
    dto: LoginDto,
    ip: string,
    userAgent: string,
  ): Promise<AuthResponseDto> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new HttpException(
        'Account is temporarily locked due to too many failed login attempts',
        423,
      );
    }

    const isPasswordValid = await compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      user.failedLoginCount = (user.failedLoginCount ?? 0) + 1;

      if (user.failedLoginCount >= MAX_FAILED_ATTEMPTS) {
        user.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      }

      await this.userRepository.save(user);

      throw new UnauthorizedException('Invalid credentials');
    }

    user.failedLoginCount = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    const tokens = await this.generateTokens(user, ip, userAgent);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        userId: user.id,
        action: 'user.login',
        entityType: 'user',
        entityId: user.id,
        ipAddress: ip,
        userAgent,
      }),
    );

    return {
      user: this.mapToProfile(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  }

  async refreshTokens(
    refreshToken: string,
    ip: string,
    userAgent: string,
  ): Promise<AuthResponseDto> {
    const tokenHash = this.hashToken(refreshToken);

    const storedToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash, isRevoked: false },
      relations: ['user'],
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!storedToken.user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    storedToken.isRevoked = true;
    await this.refreshTokenRepository.save(storedToken);

    const tokens = await this.generateTokens(storedToken.user, ip, userAgent);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        userId: storedToken.user.id,
        action: 'token.refreshed',
        entityType: 'refresh_token',
        entityId: storedToken.id,
        ipAddress: ip,
        userAgent,
      }),
    );

    return {
      user: this.mapToProfile(storedToken.user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  }

  async logout(refreshToken: string, userId: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);

    const storedToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash, userId, isRevoked: false },
    });

    if (storedToken) {
      storedToken.isRevoked = true;
      await this.refreshTokenRepository.save(storedToken);
    }

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        userId,
        action: 'user.logout',
        entityType: 'user',
        entityId: userId,
      }),
    );
  }

  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.mapToProfile(user);
  }

  private async generateTokens(
    user: User,
    ip?: string,
    userAgent?: string,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshTokenRaw = randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(refreshTokenRaw);

    const refreshExpiry = this.configService.get<string>(
      'JWT_REFRESH_EXPIRY',
      '7d',
    );
    const expiresAt = new Date(
      Date.now() + this.parseExpiryToMs(refreshExpiry),
    );

    await this.refreshTokenRepository.save(
      this.refreshTokenRepository.create({
        userId: user.id,
        tokenHash,
        expiresAt,
        ipAddress: ip ?? null,
        userAgent: userAgent ?? null,
      }),
    );

    const accessExpiry = this.configService.get<string>(
      'JWT_ACCESS_EXPIRY',
      '15m',
    );
    const expiresIn = this.parseExpiryToSeconds(accessExpiry);

    return {
      accessToken,
      refreshToken: refreshTokenRaw,
      expiresIn,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private mapToProfile(user: User): UserProfileDto {
    const profile = new UserProfileDto();
    profile.id = user.id;
    profile.email = user.email;
    profile.firstName = user.firstName;
    profile.lastName = user.lastName;
    profile.role = user.role;
    profile.avatarUrl = user.avatarUrl;
    profile.isActive = user.isActive;
    profile.lastLoginAt = user.lastLoginAt;
    profile.createdAt = user.createdAt;
    profile.updatedAt = user.updatedAt;
    return profile;
  }

  private parseExpiryToMs(expiry: string): number {
    return this.parseExpiryToSeconds(expiry) * 1000;
  }

  private parseExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 900;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    return value * (multipliers[unit] ?? 60);
  }
}
