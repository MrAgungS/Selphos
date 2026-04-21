import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UploadsRepository } from './uploads.repository';
import { S3Service } from 'src/common/s3/s3.service';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { ConfirmUploadDto, InitiateUploadDto } from 'src/model/uploads.model';
import { UploadsValidation } from './uploads.validation';
import { ValidationService } from 'src/common/validation/validation.service';
import {
  CompressionStatus,
  UploadsStatus,
} from './interfaces/uploads.interface';
import { InjectQueue } from '@nestjs/bullmq';
import {
  COMPRESSION_QUEUE,
  CompressionJobData,
} from 'src/queue/queue.constants';
import { Queue } from 'bullmq';

// Compressible MIME types
const COMPRESSIBLE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
];

// logger.debug must be disabled in production
@Injectable()
export class UploadsService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private readonly uploadsRepository: UploadsRepository,
    private readonly s3Service: S3Service,
    private readonly validationService: ValidationService,
    @InjectQueue(COMPRESSION_QUEUE) private readonly compressionQueue: Queue,
  ) {}

  async initiateUpload(user_id: string, request: InitiateUploadDto) {
    const bucket = process.env.RUSTFS_BUCKET!;
    this.logger.info('Initiating upload', {
      user_id,
      filename: request.filename,
      mime_type: request.mime_type,
    });
    const initiateRequest = this.validationService.validate(
      UploadsValidation.INITIATE,
      request,
    ) as InitiateUploadDto;

    if (request.file_id) {
      this.logger.debug('Checking file ownership', {
        user_id,
        file_id: request.file_id,
      });
      const owned = await this.uploadsRepository.findFileByIdAndUser(
        request.file_id,
        user_id,
      );
      if (!owned) {
        this.logger.warn('Unauthorized file access attempt', {
          user_id,
          file_id: request.file_id,
        });
        throw new ForbiddenException(
          'File not found or you do not have permission to access this file.',
        );
      }
    }

    // Object key: uploads/raw/{user_id}/{timestamp}-{filename}
    const object_key = `uploads/raw/${user_id}/${Date.now()}-${initiateRequest.filename}`;
    this.logger.debug('Generating presigned URL', {
      user_id,
      object_key,
      mime_type: initiateRequest.mime_type,
    });
    // The presigned URL is valid for 15 minutes
    const presigned_url = await this.s3Service.generatePresignedUrl(
      object_key,
      initiateRequest.mime_type,
    );
    const expires_at = new Date(Date.now() + 15 * 60 * 1000);
    // Create a new file if file_id is not provided
    const file_id =
      request.file_id ?? (await this.uploadsRepository.createFile(user_id));

    const upload = await this.uploadsRepository.createUpload(
      user_id,
      object_key,
      bucket,
      expires_at,
      file_id,
    );
    this.logger.info('Upload initiated successfully', {
      user_id,
      upload_id: upload.id,
      file_id,
      object_key,
      expires_at: expires_at.toISOString(),
    });

    return {
      upload_id: upload.id,
      presigned_url,
      file_id,
      expires_at: expires_at.toISOString(),
    };
  }

  async confirmUpload(
    user_id: string,
    upload_id: string,
    request: ConfirmUploadDto,
  ) {
    this.logger.info('Confirming upload', {
      user_id,
      upload_id,
      filename: request.filename,
    });
    const confirmRequest = this.validationService.validate(
      UploadsValidation.CONFIRM,
      request,
    ) as ConfirmUploadDto;

    const upload = await this.uploadsRepository.findById(upload_id);
    if (!upload) {
      this.logger.warn('Upload not found', { user_id, upload_id });
      throw new NotFoundException('Upload not found.');
    }
    // Status validation
    if (upload.status === UploadsStatus.COMPLETED) {
      this.logger.warn('Upload already confirmed', {
        user_id,
        upload_id,
        status: upload.status,
      });
      throw new ConflictException('Upload already confirmed');
    }
    if (
      upload.status === UploadsStatus.FAILED ||
      new Date() > upload.expires_at
    ) {
      this.logger.warn('Upload expired or failed', {
        user_id,
        upload_id,
        status: upload.status,
        expires_at: upload.expires_at,
      });
      throw new GoneException('Upload has expired');
    }

    // Set compression_status based on mime_type
    const isCompressible = COMPRESSIBLE_MIME_TYPES.includes(
      confirmRequest.mime_type,
    );
    const compressionStatus = isCompressible
      ? CompressionStatus.PENDING
      : CompressionStatus.SKIPPED;

    this.logger.debug('Creating file version', {
      user_id,
      upload_id,
      file_id: upload.file_id,
      mime_type: confirmRequest.mime_type,
      compression_status: compressionStatus,
    });

    const version = await this.uploadsRepository.createFileVersion(
      upload.file_id!,
      upload.bucket,
      upload.object_key,
      confirmRequest.filename,
      confirmRequest.mime_type,
      confirmRequest.size,
      compressionStatus,
      confirmRequest.etag,
    );
    // Update file current_version & upload status
    await this.uploadsRepository.updateFileCurrentVersion(
      upload.file_id!,
      version.id,
    );
    await this.uploadsRepository.updateStatus(
      upload_id,
      UploadsStatus.COMPLETED,
    );

    // Dispatch the compression job if necessary
    if (compressionStatus === CompressionStatus.PENDING) {
      const jobData: CompressionJobData = {
        version_id: version.id,
        file_id: upload.file_id!,
        object_key: upload.object_key,
        bucket_raw: upload.bucket,
        bucket_compressed: process.env.RUSTFS_COMPRESSED_BUCKET!,
        mime_type: confirmRequest.mime_type,
        filename: confirmRequest.filename,
      };

      await this.compressionQueue.add('compress', jobData, {
        attempts: 3, // Maximum retry: 3 times
        backoff: {
          type: 'exponential',
          delay: 5000, // First retry after 5s, then 10s, then 20s
        },
        removeOnComplete: 100, // Save the last 100 completed jobs
        removeOnFail: 50, // Remove the last 50 failed jobs
      });
    }

    this.logger.info('Upload confirmed successfully', {
      user_id,
      upload_id,
      version_id: version.id,
      compression_status: compressionStatus,
    });

    return {
      version_id: version.id,
      compression_status: compressionStatus,
    };
  }

  async getUploadStatus(upload_id: string) {
    this.logger.debug('Fetching upload status', { upload_id });

    const result = await this.uploadsRepository.findUploadStatus(upload_id);
    if (!result) {
      this.logger.warn('Upload not found when fetching status', { upload_id });
      throw new NotFoundException('Upload not found');
    }

    const { upload, version } = result;
    this.logger.debug('Upload status fetched', {
      upload_id: upload.id,
      upload_status: upload.status,
      version_id: version?.id ?? null,
      compression_status: version?.compression_status ?? null,
    });

    return {
      upload_id: upload.id,
      upload_status: upload.status,
      version_id: version?.id ?? null,
      compression_status: version?.compression_status ?? null,
      created_at: upload.created_at.toISOString(),
      updated_at:
        version?.created_at.toISOString() ?? upload.created_at.toISOString(),
    };
  }
}
