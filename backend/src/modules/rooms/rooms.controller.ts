import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateRoomDto } from './dto/create-room.dto';
import {
  JoinResponseDto,
  RoomListResponseDto,
  RoomResponseDto,
  RoomStatusDto,
} from './dto/room-response.dto';
import { RoomQueryDto } from './dto/room-query.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomsService } from './rooms.service';

@ApiTags('Rooms')
@ApiBearerAuth()
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  @ApiOperation({ summary: 'List rooms with pagination, search, and status filter' })
  @ApiResponse({ status: 200, description: 'Paginated list of rooms', type: RoomListResponseDto })
  async findAll(
    @Query() query: RoomQueryDto,
    @CurrentUser() user: { id: string; email: string; role: string },
    @Res() res: Response,
  ): Promise<void> {
    const { items, pagination } = await this.roomsService.findAll(query, user.id);
    res.json({
      data: items,
      meta: {
        timestamp: new Date().toISOString(),
        pagination,
      },
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get room details by ID' })
  @ApiResponse({ status: 200, description: 'Room details', type: RoomResponseDto })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RoomResponseDto> {
    return this.roomsService.findOne(id) as unknown as RoomResponseDto;
  }

  @Post()
  @Roles('admin', 'moderator')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new room and register it with BBB' })
  @ApiResponse({ status: 201, description: 'Room created', type: RoomResponseDto })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async create(
    @Body() dto: CreateRoomDto,
    @CurrentUser() user: { id: string; email: string; role: string },
  ): Promise<RoomResponseDto> {
    return this.roomsService.create(dto, user) as unknown as RoomResponseDto;
  }

  @Patch(':id')
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Update room configuration' })
  @ApiResponse({ status: 200, description: 'Room updated', type: RoomResponseDto })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoomDto,
    @CurrentUser() user: { id: string; email: string; role: string },
  ): Promise<RoomResponseDto> {
    return this.roomsService.update(id, dto, user) as unknown as RoomResponseDto;
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a room (ends BBB meeting if running)' })
  @ApiResponse({ status: 204, description: 'Room deleted' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; email: string; role: string },
  ): Promise<void> {
    await this.roomsService.remove(id, user);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join a room — creates BBB meeting if needed and returns join URL' })
  @ApiResponse({ status: 200, description: 'Join URL generated', type: JoinResponseDto })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async join(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; email: string; role: string },
  ): Promise<JoinResponseDto> {
    return this.roomsService.join(id, user);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get real-time room status from BBB server' })
  @ApiResponse({ status: 200, description: 'Room status', type: RoomStatusDto })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async getStatus(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RoomStatusDto> {
    return this.roomsService.getStatus(id) as unknown as RoomStatusDto;
  }
}
