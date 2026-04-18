import { Module } from '@nestjs/common';
import { CompressionService } from './compression.service';

@Module({
  providers: [CompressionService],
})
export class CompressionModule {}
