import { Module } from '@nestjs/common';
import { CompressionService } from './compression.service';
import { CompressionProcessor } from './compression.processor';
import { BullModule } from '@nestjs/bullmq';
import { COMPRESSION_QUEUE } from 'src/queue/queue.constants';
import { UploadsModule } from 'src/uploads/uploads.module';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: COMPRESSION_QUEUE,
    }),
    CommonModule,
    UploadsModule,
  ],
  providers: [CompressionService, CompressionProcessor],
})
export class CompressionModule {}
