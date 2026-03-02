import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Recording } from './entities/recording.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Recording])],
  exports: [TypeOrmModule],
})
export class RecordingsModule {}
