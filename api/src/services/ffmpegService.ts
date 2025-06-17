import ffmpeg from 'fluent-ffmpeg';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { config } from '../config';

export interface ProcessingOptions {
  startTime?: number;
  endTime?: number;
  quality: 'low' | 'medium' | 'high';
  fps?: number;
  scale?: number;
}

export class FFmpegService {
  private outputDir: string;

  constructor() {
    this.outputDir = join(config.uploadDir, 'processed');
    this.ensureOutputDir();
  }

  private async ensureOutputDir() {
    if (!existsSync(this.outputDir)) {
      await mkdir(this.outputDir, { recursive: true });
    }
  }

  private getQualitySettings(quality: 'low' | 'medium' | 'high') {
    switch (quality) {
      case 'low':
        return { fps: 10, scale: 320 };
      case 'medium':
        return { fps: 15, scale: 480 };
      case 'high':
        return { fps: 20, scale: 720 };
      default:
        return { fps: 15, scale: 480 };
    }
  }

  async processVideo(
    inputPath: string,
    outputPath: string,
    options: ProcessingOptions,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const { startTime, endTime, quality, fps, scale } = options;
    const qualitySettings = this.getQualitySettings(quality);

    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath);

      // Set input options
      if (startTime) {
        command = command.setStartTime(startTime);
      }
      if (endTime) {
        command = command.setDuration(endTime - (startTime || 0));
      }

      // Set output options
      command
        .outputOptions([
          '-vf', `fps=${fps || qualitySettings.fps},scale=${scale || qualitySettings.scale}:-1`,
          '-loop', '0',
          '-final_delay', '500',
          '-y'
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('Started FFmpeg with command:', commandLine);
        })
        .on('progress', (progress) => {
          if (onProgress) {
            const percent = Math.round(progress.percent || 0);
            onProgress(percent);
          }
        })
        .on('error', (err) => {
          console.error('Error processing video:', err);
          reject(err);
        })
        .on('end', () => {
          console.log('Video processing finished');
          resolve(outputPath);
        })
        .run();
    });
  }

  async getVideoInfo(inputPath: string): Promise<{
    duration: number;
    size: number;
    format: string;
  }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const { duration, size, format } = metadata.format;
        resolve({
          duration: duration || 0,
          size: size || 0,
          format: format || 'unknown',
        });
      });
    });
  }
} 