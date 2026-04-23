import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/security/guards/jwt-auth.guard';
import { FilesService } from './files.service';
import { CurrentUser } from 'src/security/decorators/current-user.decorator';
import type { RequestUser } from 'src/users/interfaces/user.interface';

@Controller('api/s3/files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get()
  async listFiles(
    @CurrentUser() user: RequestUser,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('mime_type') mime_type?: string,
  ) {
    const data = await this.filesService.listFiles({
      user_id: user.id,
      page: Number(page),
      limit: Number(limit),
      mime_type,
    });
    return { data };
  }

  @Get(':file_id/versions')
  async getFileVersions(
    @CurrentUser() user: RequestUser,
    @Param('file_id') file_id: string,
  ) {
    const data = await this.filesService.getFileVersions(file_id, user.id);
    return { data };
  }

  @Get(':file_id/download')
  async getDownloadUrl(
    @CurrentUser() user: RequestUser,
    @Param('file_id') file_id: string,
  ) {
    const data = await this.filesService.getDownloadUrl(file_id, user.id);
    return { data };
  }

  @Post(':file_id/versions/:version_id/restore')
  async restoreVersion(
    @CurrentUser() user: RequestUser,
    @Param('file_id') file_id: string,
    @Param('version_id') version_id: string,
  ) {
    const data = await this.filesService.restoreVersion({
      file_id,
      version_id,
      user_id: user.id,
    });
    return { data };
  }

  @Delete(':file_id')
  async deleteFile(
    @CurrentUser() user: RequestUser,
    @Param('file_id') file_id: string,
  ) {
    const data = await this.filesService.deleteFile(file_id, user.id);
    return { data };
  }
}
