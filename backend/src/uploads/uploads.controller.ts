import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/security/guards/jwt-auth.guard';
import { UploadsService } from './uploads.service';
import { InitiateUploadDto } from 'src/model/uploads.model';
import { CurrentUser } from 'src/security/decorators/current-user.decorator';
import { ConfirmUploadDto } from 'src/model/uploads.model';
import type { RequestUser } from 'src/users/interfaces/user.interface';

// CurrentUser is a custom decorator for retrieving authenticated user data from a JWT.
@Controller('/api/s3/uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('initiate')
  async initiateUpload(
    @CurrentUser() user: RequestUser,
    @Body() dto: InitiateUploadDto,
  ) {
    const data = await this.uploadsService.initiateUpload(user.id, dto);
    return { data };
  }

  @Post(':upload_id/confirm')
  async confirmUpload(
    @CurrentUser() user: RequestUser,
    @Param('upload_id') uploadId: string,
    @Body() dto: ConfirmUploadDto,
  ) {
    const data = await this.uploadsService.confirmUpload(
      uploadId,
      user.id,
      dto,
    );
    return { data };
  }
  @Get(':upload_id/status')
  async getUploadStatus(@Param('upload_id') uploadId: string) {
    const data = await this.uploadsService.getUploadStatus(uploadId);
    return { data };
  }
}
