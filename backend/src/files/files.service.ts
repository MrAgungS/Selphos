import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FilesRepository } from './files.repository';
import { S3Service } from 'src/common/s3/s3.service';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { ValidationService } from 'src/common/validation/validation.service';
import { ListFiles, RestoreVersion } from 'src/model/files.model';
import { FilesValidation } from './files.validation';

const COMPRESSIBLE_STATUSES = ['pending', 'processing', 'failed'];

@Injectable()
export class FilesService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private readonly filesRepository: FilesRepository,
    private readonly s3Service: S3Service,
    private readonly validationService: ValidationService,
  ) {}

  async listFiles(request: ListFiles) {
    const listFilesReq = this.validationService.validate(
      FilesValidation.LIST_FILES,
      request,
    ) as ListFiles;

    const safePage = Math.max(1, listFilesReq.page);
    const safeLimit = Math.max(1, listFilesReq.limit);

    const { files, total } = await this.filesRepository.findAllByUser(
      listFilesReq.user_id,
      safePage,
      safeLimit,
      listFilesReq.mime_type,
    );

    return {
      files: files.map((f) => ({
        ...f,
        created_at: f.created_at.toISOString(),
        updated_at: f.updated_at.toISOString(),
      })),
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  async getFileVersions(file_id: string, user_id: string) {
    const result = await this.filesRepository.findVersionsByFileId(
      file_id,
      user_id,
    );
    if (!result) throw new NotFoundException('File not found');

    return {
      file_id: file_id,
      filename: result.filename,
      versions: result.versions.map((v) => ({
        version_id: v.version_id,
        is_current: v.is_current,
        object_key: v.object_key,
        // Hide the compressed_object_key if it's not finished yet
        compressed_object_key: COMPRESSIBLE_STATUSES.includes(
          v.compression_status,
        )
          ? null
          : v.compressed_object_key,
        compression_status: v.compression_status,
        mime_type: v.mime_type,
        size: v.size,
        etag: v.etag,
        created_at: v.created_at.toISOString(),
      })),
    };
  }

  async getDownloadUrl(file_id: string, user_id: string) {
    const version = await this.filesRepository.findCurrentVersionByFileId(
      file_id,
      user_id,
    );
    if (!version) throw new NotFoundException('File version not found');
    if (version.is_deleted) throw new GoneException('File has been deleted');

    // Select the bucket and object key: use “compressed” if ready; use “raw” as an alternative
    const useCompressed =
      version.compression_status === 'done' && version.compressed_object_key;
    const bucket = useCompressed
      ? process.env.RUSTFS_COMPRESSED_BUCKET!
      : version.bucket;
    const objectKey = useCompressed
      ? version.compressed_object_key!
      : version.object_key;

    // Presigned GET URLs are valid for 1 hour
    const expiresIn = 60 * 60;
    const downloadUrl = await this.s3Service.generateDownloadUrl(
      bucket,
      objectKey,
      expiresIn,
    );
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return {
      file_id,
      filename: version.object_key.split('/').pop(),
      download_url: downloadUrl,
      expires_at: expiresAt.toISOString(),
      mime_type: version.mime_type,
      size: version.size,
    };
  }

  async restoreVersion(request: RestoreVersion) {
    const restoreVersionReq = this.validationService.validate(
      FilesValidation.RESTORE_VERSION,
      request,
    ) as RestoreVersion;

    const fileExists = await this.filesRepository.findVersionByIdAndFile(
      restoreVersionReq.version_id,
      restoreVersionReq.user_id,
      restoreVersionReq.file_id,
    );
    if (!fileExists) {
      // Check whether the file is missing or the version is incorrect
      const versions = await this.filesRepository.findVersionsByFileId(
        restoreVersionReq.file_id,
        restoreVersionReq.user_id,
      );
      if (!versions) throw new NotFoundException('File not found');
      throw new ForbiddenException('Version does not belong to this file');
    }

    await this.filesRepository.restoreVersion(
      restoreVersionReq.file_id,
      restoreVersionReq.version_id,
    );

    return {
      file_id: restoreVersionReq.file_id,
      RestoreVersion: restoreVersionReq.version_id,
      message: 'File restored to selected version',
    };
  }

  async deleteFile(file_id: string, user_id: string) {
    const result = await this.filesRepository.softDelete(file_id, user_id);

    if (result === 'not_found') throw new NotFoundException('File not found');
    if (result === 'already_deleted')
      throw new ConflictException('File is already deleted');

    return true;
  }
}
