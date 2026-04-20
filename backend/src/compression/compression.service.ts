import { Injectable, Logger } from '@nestjs/common';
import ffmpegStatic from 'ffmpeg-static';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

@Injectable()
export class CompressionService {
  private readonly logger = new Logger(CompressionService.name);
  private readonly ffmpegPath = ffmpegStatic as unknown as string;

  buildCompressionObjectKey(original_key: string, mime_type: string): string {
    const extension = mime_type.startsWith('video') ? '.mp4' : '.webp';
    const base = path.basename(original_key, path.extname(original_key));
    const dir = path.dirname(original_key);
    return `${dir}/${base}${extension}`;
  }

  async compressFile(
    input_path: string,
    mime_type: string,
    output_dir: string,
    filename: string,
  ): Promise<string> {
    const isVideo = mime_type.startsWith('video');
    const isImage = mime_type.startsWith('image');
    const extension = isVideo ? '.mp4' : '.webp';
    const output_path = path.join(
      output_dir,
      `compressed-${filename}${extension}`,
    );
    if (isImage) {
      await this.runFfmpeg(this.buildImageArgs(input_path, output_path));
    } else if (isVideo) {
      await this.runFfmpeg(this.buildVideoArgs(input_path, output_path));
    } else {
      throw new Error(`Unsupported mime type: ${mime_type}`);
    }

    return output_path;
  }

  // FFmpeg command-line arguments for converting images to WebP
  private buildImageArgs(input: string, output: string): string[] {
    return [
      '-i',
      input,
      '-vf',
      'scale=iw:ih',
      '-quality',
      '80',
      '-y', // Overwrite output without confirmation
      output,
    ];
  }

  // FFmpeg command-line options for converting video to MP4 H.264
  private buildVideoArgs(input: string, output: string): string[] {
    return [
      '-i',
      input,
      '-c:v',
      'libx264',
      '-crf',
      '28',
      '-preset',
      'fast',
      '-c:a',
      'aac',
      '-movflags',
      '+faststart',
      '-y',
      output,
    ];
  }
  // Start FFmpeg as a child process
  private runFfmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.logger.log(`Running ffmpeg ${args.join(' ')}`);

      const proc = spawn(this.ffmpegPath, args);
      const stderr: string[] = [];

      // FFmpeg outputs progress to stderr
      proc.stderr.on('data', (chunk: Buffer) => {
        stderr.push(chunk.toString());
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          const err_msg = stderr.slice(-5).join(''); // Take the last 5 lines
          this.logger.error(`FFmpeg exited with code ${code}: ${err_msg}`);
          reject(new Error(`FFmpeg failed with code ${code}`));
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`Failed to spawn FFmpeg: ${err.message}`));
      });
    });
  }

  createTempDir(): string {
    const tmp_dir = path.join(os.tmpdir(), `compress-${Date.now()}`);
    fs.mkdirSync(tmp_dir, { recursive: true });
    return tmp_dir;
  }

  cleanupTempDir(dir_path: string): void {
    try {
      fs.rmSync(dir_path, { recursive: true, force: true });
    } catch {
      this.logger.warn(`Failed to cleanup temp dir: ${dir_path}`);
    }
  }
}
