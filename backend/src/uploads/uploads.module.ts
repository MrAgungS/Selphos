import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { UploadsRepository } from './uploads.repository';
import { CommonModule } from 'src/common/common.module';
import { COMPRESSION_QUEUE } from 'src/queue/queue.constants';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    CommonModule,
    BullModule.registerQueue({ name: COMPRESSION_QUEUE }),
  ],
  controllers: [UploadsController],
  providers: [UploadsService, UploadsRepository],
  exports: [UploadsRepository],
})
export class UploadsModule {}
