import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { BbbService } from './bbb.service';

@Module({
  imports: [HttpModule],
  providers: [BbbService],
  exports: [BbbService],
})
export class BbbModule {}
