import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { SecurityModule } from './security/security.module';
import { UsersModule } from './users/users.module';
import { UploadsModule } from './uploads/uploads.module';
import { QueueModule } from './queue/queue.module';
import { CompressionModule } from './compression/compression.module';
import { FilesModule } from './files/files.module';

@Module({
  imports: [
    CommonModule,
    SecurityModule,
    UsersModule,
    UploadsModule,
    QueueModule,
    CompressionModule,
    FilesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
