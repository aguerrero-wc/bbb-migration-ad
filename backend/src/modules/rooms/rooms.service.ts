import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';

import { AuditLog } from '../auth/entities/audit-log.entity';
import { BbbService } from '../bbb/bbb.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomQueryDto } from './dto/room-query.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { Room } from './entities/room.entity';

interface JwtUser {
  id: string;
  email: string;
  role: string;
}

interface PaginatedRooms {
  items: Room[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);

  constructor(
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly bbbService: BbbService,
  ) {}

  /**
   * Lists rooms with pagination, search, and status filtering.
   * @param query - Query parameters for filtering and pagination
   * @param userId - ID of the requesting user
   * @returns Paginated list of rooms with creator info
   */
  async findAll(query: RoomQueryDto, userId: string): Promise<PaginatedRooms> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.roomRepository
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.createdBy', 'creator')
      .orderBy('room.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.search) {
      qb.andWhere('room.name ILIKE :search', { search: `%${query.search}%` });
    }

    if (query.status) {
      qb.andWhere('room.status = :status', { status: query.status });
    }

    const [items, total] = await qb.getManyAndCount();

    this.logger.debug(`User ${userId} listed rooms: page=${page}, total=${total}`);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves a single room by ID with creator relation.
   * @param id - Room UUID
   * @returns The room entity with creator loaded
   * @throws NotFoundException if room does not exist
   */
  async findOne(id: string): Promise<Room> {
    const room = await this.roomRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!room) {
      throw new NotFoundException(`Room with ID "${id}" not found`);
    }

    return room;
  }

  /**
   * Creates a new room and registers it with the BBB server.
   * @param dto - Room creation data
   * @param user - Authenticated user from JWT
   * @returns The created room entity
   */
  async create(dto: CreateRoomDto, user: JwtUser): Promise<Room> {
    const meetingId = randomUUID();

    await this.bbbService.createMeeting({
      name: dto.name,
      meetingID: meetingId,
      welcome: dto.welcomeMessage,
      maxParticipants: dto.maxParticipants,
      record: dto.record,
      autoStartRecording: dto.autoStartRecording,
      muteOnStart: dto.muteOnStart,
      webcamsOnlyForModerator: dto.webcamsOnlyForModerator,
      guestPolicy: dto.guestPolicy,
      meetingLayout: dto.meetingLayout,
      disabledFeatures: dto.disabledFeatures?.join(','),
    });

    const room = this.roomRepository.create({
      ...dto,
      meetingId,
      createdBy: { id: user.id },
    });

    const saved = await this.roomRepository.save(room);

    await this.auditLog(user.id, 'room.created', 'room', saved.id, {
      name: saved.name,
      meetingId,
    });

    this.logger.log(`Room "${saved.name}" created by ${user.email} (${saved.id})`);

    return this.findOne(saved.id);
  }

  /**
   * Updates an existing room's configuration.
   * @param id - Room UUID
   * @param dto - Partial room update data
   * @param user - Authenticated user from JWT
   * @returns The updated room entity
   * @throws NotFoundException if room does not exist
   */
  async update(id: string, dto: UpdateRoomDto, user: JwtUser): Promise<Room> {
    const room = await this.findOne(id);

    Object.assign(room, dto);
    const saved = await this.roomRepository.save(room);

    await this.auditLog(user.id, 'room.updated', 'room', saved.id, {
      updatedFields: Object.keys(dto),
    });

    this.logger.log(`Room "${saved.name}" updated by ${user.email} (${saved.id})`);

    return saved;
  }

  /**
   * Deletes a room. Ends the BBB meeting if the room is active.
   * @param id - Room UUID
   * @param user - Authenticated user from JWT
   * @throws NotFoundException if room does not exist
   */
  async remove(id: string, user: JwtUser): Promise<void> {
    const room = await this.findOne(id);

    if (room.status === 'active') {
      try {
        await this.bbbService.endMeeting(room.meetingId);
      } catch (error) {
        this.logger.warn(`Failed to end BBB meeting ${room.meetingId} during room deletion: ${error}`);
      }
    }

    await this.roomRepository.remove(room);

    await this.auditLog(user.id, 'room.deleted', 'room', id, {
      name: room.name,
      meetingId: room.meetingId,
    });

    this.logger.log(`Room "${room.name}" deleted by ${user.email} (${id})`);
  }

  /**
   * Joins a room by creating/reusing the BBB meeting and generating a join URL.
   * @param id - Room UUID
   * @param user - Authenticated user from JWT
   * @returns Object containing the BBB join URL
   * @throws NotFoundException if room does not exist
   */
  async join(id: string, user: JwtUser): Promise<{ joinUrl: string }> {
    const room = await this.findOne(id);

    await this.bbbService.createMeeting({
      name: room.name,
      meetingID: room.meetingId,
      welcome: room.welcomeMessage ?? undefined,
      maxParticipants: room.maxParticipants ?? undefined,
      record: room.record,
      autoStartRecording: room.autoStartRecording,
      muteOnStart: room.muteOnStart,
      webcamsOnlyForModerator: room.webcamsOnlyForModerator,
      guestPolicy: room.guestPolicy,
      meetingLayout: room.meetingLayout,
      disabledFeatures: room.disabledFeatures?.join(','),
    });

    const bbbRole: 'MODERATOR' | 'VIEWER' =
      user.role === 'admin' || user.role === 'moderator' ? 'MODERATOR' : 'VIEWER';

    const joinUrl = this.bbbService.joinMeeting({
      meetingID: room.meetingId,
      fullName: user.email,
      role: bbbRole,
      userID: user.id,
    });

    if (room.status !== 'active') {
      room.status = 'active';
      await this.roomRepository.save(room);
    }

    await this.auditLog(user.id, 'room.joined', 'room', room.id, {
      role: bbbRole,
    });

    this.logger.log(`User ${user.email} joined room "${room.name}" as ${bbbRole}`);

    return { joinUrl };
  }

  /**
   * Gets real-time status of a room from the BBB server.
   * @param id - Room UUID
   * @returns Meeting status information
   * @throws NotFoundException if room does not exist
   */
  async getStatus(id: string): Promise<{
    isRunning: boolean;
    participantCount: number;
    moderatorCount: number;
    listenerCount: number;
    voiceParticipantCount: number;
    videoCount: number;
    hasUserJoined: boolean;
    recording: boolean;
    startTime: number | null;
    duration: number;
  }> {
    const room = await this.findOne(id);

    try {
      const info = await this.bbbService.getMeetingInfo(room.meetingId);

      return {
        isRunning: info.running,
        participantCount: info.participantCount,
        moderatorCount: info.moderatorCount,
        listenerCount: info.listenerCount,
        voiceParticipantCount: info.voiceParticipantCount,
        videoCount: info.videoCount,
        hasUserJoined: info.hasUserJoined,
        recording: info.recording,
        startTime: info.startTime || null,
        duration: info.duration,
      };
    } catch {
      return {
        isRunning: false,
        participantCount: 0,
        moderatorCount: 0,
        listenerCount: 0,
        voiceParticipantCount: 0,
        videoCount: 0,
        hasUserJoined: false,
        recording: false,
        startTime: null,
        duration: 0,
      };
    }
  }

  /**
   * Writes an entry to the audit log.
   * @param userId - ID of the user performing the action
   * @param action - Action identifier
   * @param entityType - Type of the affected entity
   * @param entityId - ID of the affected entity
   * @param details - Additional metadata
   */
  private async auditLog(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    details: Record<string, unknown>,
  ): Promise<void> {
    const log = this.auditLogRepository.create({
      userId,
      action,
      entityType,
      entityId,
      details,
    });
    await this.auditLogRepository.save(log);
  }
}
