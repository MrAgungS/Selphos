import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';

@Injectable()
export class S3Service {
  private s3 = new S3Client({
    endpoint: process.env.RUSTFS_ENDPOINT!,
    region: 'auto',
    credentials: {
      accessKeyId: process.env.RUSTFS_ACCESS_KEY!,
      secretAccessKey: process.env.RUSTFS_SECRET_KEY!,
    },
    forcePathStyle: true,
  });

  async generatePresignedUrl(objectKey: string, mimeType: string) {
    const command = new PutObjectCommand({
      Bucket: process.env.RUSTFS_BUCKET!,
      Key: objectKey,
      ContentType: mimeType,
    });

    return getSignedUrl(this.s3, command, { expiresIn: 900 });
  }
}
