import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { S3Service } from 'src/common/s3/s3.service';
import {
  COMPRESSION_QUEUE,
  CompressionJobData,
} from 'src/queue/queue.constants';
import { CompressionService } from './compression.service';
import { UploadsRepository } from 'src/uploads/uploads.repository';
import { Job } from 'bullmq';
import { CompressionStatus } from 'src/uploads/interfaces/uploads.interface';
import path from 'path';

@Processor(COMPRESSION_QUEUE, {
  concurrency: 2,
})
export class CompressionProcessor extends WorkerHost {
  private readonly logger: Logger = new Logger(CompressionProcessor.name);
  constructor(
    private readonly s3Service: S3Service,
    private readonly compressionService: CompressionService,
    private readonly uploadsRepository: UploadsRepository,
  ) {
    super();
  }

  async process(job: Job<CompressionJobData>): Promise<void> {
    const {
      version_id,
      object_key,
      bucket_raw,
      bucket_compressed,
      mime_type,
      filename,
    } = job.data;
    this.logger.log(
      `Processing compression job ${job.id} — version ${version_id}`,
    );

    // Update status to processing
    await this.uploadsRepository.updateCompressionStatus(
      version_id,
      CompressionStatus.PROCESSING,
    );
    const tmp_dir = this.compressionService.createTempDir();

    try {
      // Download the raw file from RustFS to the temp directory
      const input_path = path.join(tmp_dir, filename);
      await this.s3Service.downloadToFile(bucket_raw, object_key, input_path);

      // Compress with FFmpeg
      const output_path = await this.compressionService.compressFile(
        input_path,
        mime_type,
        tmp_dir,
        filename,
      );

      // Build compressed object key and upload to bucket compressed
      const compressed_object_key =
        this.compressionService.buildCompressionObjectKey(
          object_key,
          mime_type,
        );
      const output_mime_type = mime_type.startsWith('video')
        ? 'video/mp4'
        : 'image/webp';
      await this.s3Service.uploadFromFile(
        bucket_compressed,
        compressed_object_key,
        output_path,
        output_mime_type,
      );

      // Update status to done
      await this.uploadsRepository.updateCompressionStatus(
        version_id,
        CompressionStatus.DONE,
        compressed_object_key,
      );
      this.logger.log(`Compression done for version ${version_id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Compression failed for version ${version_id}: ${message}`,
      );
      // If all attempts have been used up, the status is “failed”
      // BullMQ will automatically retry if attemptsMade < maxAttempts
      if (job.attemptsMade >= (job.opts.attempts ?? 1) - 1) {
        await this.uploadsRepository.updateCompressionStatus(
          version_id,
          CompressionStatus.FAILED,
        );
      }
      // // Re-send so that BullMQ knows this job failed and needs to be retried
      throw err;
    } finally {
      // Always clean up temporary files
      this.compressionService.cleanupTempDir(tmp_dir);
    }
  }
}
