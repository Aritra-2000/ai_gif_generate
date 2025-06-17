import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { config } from '../config';
import { FFmpegService, ProcessingOptions } from './ffmpegService';
import { WebSocketService } from './websocketService';

export interface VideoSettings {
  startTime?: number;
  endTime?: number;
  quality: 'low' | 'medium' | 'high';
  fps?: number;
  scale?: number;
}

export interface VideoMetadata {
  id: string;
  originalName: string;
  filepath: string;
  duration: number;
  size: number;
  format: string;
  createdAt: Date;
}

export class VideoService {
  private ffmpegService: FFmpegService;
  private wsService: WebSocketService;

  constructor(wsService: WebSocketService) {
    this.ffmpegService = new FFmpegService();
    this.wsService = wsService;
  }

  async saveVideo(file: File): Promise<VideoMetadata> {
    const id = randomUUID();
    const filepath = path.join(config.uploadDir, `${id}${path.extname(file.name)}`);
    
    await fs.writeFile(filepath, Buffer.from(await file.arrayBuffer()));
    
    const videoInfo = await this.ffmpegService.getVideoInfo(filepath);
    
    return {
      id,
      originalName: file.name,
      filepath,
      duration: videoInfo.duration,
      size: videoInfo.size,
      format: videoInfo.format,
      createdAt: new Date(),
    };
  }

  async processVideo(id: string, settings: VideoSettings): Promise<void> {
    const videoPath = path.join(config.uploadDir, `${id}${path.extname(id)}`);
    const outputPath = path.join(config.uploadDir, `${id}.gif`);

    const options: ProcessingOptions = {
      startTime: settings.startTime,
      endTime: settings.endTime,
      quality: settings.quality,
      fps: settings.fps,
      scale: settings.scale,
    };

    try {
      await this.ffmpegService.processVideo(videoPath, outputPath, options, (progress) => {
        this.wsService.broadcastProgress(id, progress, 'processing');
      });
      
      this.wsService.broadcastProgress(id, 100, 'completed');
    } catch (error) {
      this.wsService.broadcastProgress(id, 0, 'error', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async getVideoStatus(id: string): Promise<{ status: 'processing' | 'completed' | 'error'; progress: number }> {
    const outputPath = path.join(config.uploadDir, `${id}.gif`);
    
    try {
      await fs.access(outputPath);
      return { status: 'completed', progress: 100 };
    } catch {
      return { status: 'processing', progress: 0 };
    }
  }

  async getVideoPath(id: string): Promise<string> {
    const filepath = path.join(config.uploadDir, `${id}.gif`);
    await fs.access(filepath);
    return filepath;
  }

  async deleteVideo(id: string): Promise<void> {
    const videoPath = path.join(config.uploadDir, `${id}${path.extname(id)}`);
    const gifPath = path.join(config.uploadDir, `${id}.gif`);
    
    try {
      await fs.unlink(videoPath);
    } catch (error) {
      console.error(`Error deleting video file: ${error}`);
    }
    
    try {
      await fs.unlink(gifPath);
    } catch (error) {
      console.error(`Error deleting GIF file: ${error}`);
    }
  }
}
