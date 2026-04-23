import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { FilesRepository } from './files.repository';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [CommonModule],
  providers: [FilesService, FilesRepository],
  controllers: [FilesController],
})
export class FilesModule {}
