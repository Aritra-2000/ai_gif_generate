import { PrismaClient } from '@prisma/client';
import ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';
import { HTTPException } from 'hono/http-exception';

const prisma = new PrismaClient();

interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  format: string;
  size: number;
}

export const videoProcessingService = {
  async validateVideo(filepath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filepath, (err, metadata) => {
        if (err) {
          reject(new HTTPException(400, { message: 'Invalid video file' }));
          return;
        }

        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        if (!videoStream) {
          reject(new HTTPException(400, { message: 'No video stream found' }));
          return;
        }

        // Validate duration (max 10 minutes)
        const duration = metadata.format.duration || 0;
        if (duration > 600) {
          reject(new HTTPException(400, { message: 'Video duration exceeds 10 minutes' }));
          return;
        }

        // Validate resolution (max 1080p)
        const width = videoStream.width || 0;
        const height = videoStream.height || 0;
        if (height > 1080) {
          reject(new HTTPException(400, { message: 'Video resolution exceeds 1080p' }));
          return;
        }

        resolve({
          duration,
          width,
          height,
          format: metadata.format.format_name || '',
          size: metadata.format.size || 0
        });
      });
    });
  },

  async generateThumbnail(videoId: string, filepath: string): Promise<string> {
    const timestamp = Math.floor(Math.random() * 10); // Random frame in first 10 seconds
    const thumbnailPath = filepath.replace(/\.[^/.]+$/, '_thumb.jpg');

    return new Promise((resolve, reject) => {
      ffmpeg(filepath)
        .screenshots({
          timestamps: [timestamp],
          filename: thumbnailPath,
          size: '320x180'
        })
        .on('end', () => {
          // Update video record with thumbnail path
          prisma.video.update({
            where: { id: videoId },
            data: { thumbnail: thumbnailPath }
          }).then(() => resolve(thumbnailPath))
            .catch(reject);
        })
        .on('error', reject);
    });
  },

  async getVideoMetadata(filepath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filepath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        if (!videoStream) {
          reject(new Error('No video stream found'));
          return;
        }

        resolve({
          duration: metadata.format.duration || 0,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          format: metadata.format.format_name || '',
          size: metadata.format.size || 0
        });
      });
    });
  }
}; 