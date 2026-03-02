import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RoomParticipant } from './entities/room-participant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RoomParticipant])],
  exports: [TypeOrmModule],
})
export class RoomParticipantsModule {}
