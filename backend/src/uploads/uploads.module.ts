import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { UploadsRepository } from './uploads.repository';

@Module({
  controllers: [UploadsController],
  providers: [UploadsService, UploadsRepository],
  exports: [UploadsRepository],
})
export class UploadsModule {}
