import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import * as fs from 'fs';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);

  private s3 = new S3Client({
    endpoint: process.env.RUSTFS_ENDPOINT!,
    region: 'auto',
    credentials: {
      accessKeyId: process.env.RUSTFS_ACCESS_KEY!,
      secretAccessKey: process.env.RUSTFS_SECRET_KEY!,
    },
    forcePathStyle: true,
  });

  async generatePresignedUrl(object_key: string, mime_type: string) {
    const command = new PutObjectCommand({
      Bucket: process.env.RUSTFS_BUCKET!,
      Key: object_key,
      ContentType: mime_type,
    });

    return getSignedUrl(this.s3, command, { expiresIn: 900 });
  }

  async downloadToFile(
    bucket: string,
    object_key: string,
    destination: string,
  ) {
    this.logger.log(
      `Downloading s3://${bucket}/${object_key} to ${destination}`,
    );

    const command = new GetObjectCommand({ Bucket: bucket, Key: object_key });
    const response = await this.s3.send(command);
    const stream = response.Body as Readable;
    await pipeline(stream, fs.createWriteStream(destination));
  }

  async uploadFromFile(
    bucket: string,
    object_key: string,
    file_path: string,
    mime_type: string,
  ): Promise<void> {
    this.logger.log(`Uploading ${file_path} to s3://${bucket}/${object_key}`);
    const fileStream = fs.createReadStream(file_path);
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: object_key,
      Body: fileStream,
      ContentType: mime_type,
    });
    await this.s3.send(command);
  }

  async generateDownloadUrl(
    bucket: string,
    object_key: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    const command = new GetObjectCommand({ Bucket: bucket, Key: object_key });
    return getSignedUrl(this.s3, command, { expiresIn });
  }
}
