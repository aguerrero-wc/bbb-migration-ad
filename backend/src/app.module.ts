import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';

import { getDatabaseConfig } from './config/database.config';
import { AuthModule } from './modules/auth/auth.module';
import { BbbModule } from './modules/bbb/bbb.module';
import { HealthModule } from './modules/health/health.module';
import { RecordingsModule } from './modules/recordings/recordings.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { RoomParticipantsModule } from './modules/room-participants/room-participants.module';
import { UsersModule } from './modules/users/users.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    AuthModule,
    HealthModule,
    UsersModule,
    RoomsModule,
    ReservationsModule,
    RecordingsModule,
    RoomParticipantsModule,
    BbbModule,
    WebhooksModule,
  ],
})
export class AppModule {}
