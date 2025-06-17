import { PrismaClient, GifStatus } from '@prisma/client';
import { Context } from 'hono';
import { contentAnalysisService } from '../services/contentAnalysisService';
import { transcriptionService } from '../services/transcriptionService';
import { HTTPException } from 'hono/http-exception';
import { gifService } from '../services/gifService';
import { videoProcessingService } from '../services/videoProcessingService';

const prisma = new PrismaClient();

export const videoController = {
  async uploadVideo(c: Context) {
    const { title, description } = await c.req.json();
    const userId = c.get('userId');
    const uploadedFile = c.get('uploadedFile');

    if (!uploadedFile) {
      throw new HTTPException(400, { message: 'No file uploaded' });
    }

    try {
      // Validate video
      const metadata = await videoProcessingService.validateVideo(uploadedFile.filepath);

      // Create video record
      const video = await prisma.video.create({
        data: {
          title,
          description,
          url: uploadedFile.filepath,
          user: {
            connect: { id: userId }
          }
        }
      });

      // Generate thumbnail
      await videoProcessingService.generateThumbnail(video.id, uploadedFile.filepath);

      // Transcribe video
      const transcript = await transcriptionService.transcribeVideo(video.id, uploadedFile.filepath);

      // Analyze transcript for GIF moments
      const gifMoments = await transcriptionService.analyzeTranscript(transcript);

      return c.json({
        message: 'Video uploaded successfully',
        video: {
          ...video,
          metadata,
          transcript,
          gifMoments
        }
      });
    } catch (error: any) {
      throw new HTTPException(400, { message: error.message });
    }
  },

  async generateGif(c: Context) {
    const { videoId, startTime, endTime, title, description } = await c.req.json();
    const userId = c.get('user').userId;

    // Verify video ownership
    const video = await prisma.video.findFirst({
      where: {
        id: videoId,
        userId
      }
    });

    if (!video) {
      throw new HTTPException(404, { message: 'Video not found' });
    }

    // Create GIF record
    const duration = Number(endTime) - Number(startTime);
    const gif = await prisma.gif.create({
      data: {
        title,
        description,
        startTime,
        endTime,
        status: GifStatus.pending,
        userId,
        videoId,
        prompt: title,
        url: '', // Temporary empty URL until GIF is generated
        duration: duration
      }
    });

    // Start GIF generation process
    gifService.generateGif(videoId, Number(startTime), duration);

    return c.json({
      message: 'GIF generation started',
      gif
    });
  },

  async getVideo(c: Context) {
    const videoId = c.req.param('id');
    const userId = c.get('userId');

    const video = await prisma.video.findFirst({
      where: {
        id: videoId,
        userId
      },
      include: {
        gifs: true
      }
    });

    if (!video) {
      throw new HTTPException(404, { message: 'Video not found' });
    }

    return c.json(video);
  },

  async getVideos(c: Context) {
    const userId = c.get('userId');
    const videos = await prisma.video.findMany({
      where: { userId },
      include: {
        gifs: true
      }
    });

    return c.json(videos);
  },

  async getGifs(c: Context) {
    const { id } = c.req.param();
    const userId = c.get('user').userId;

    // Verify video ownership
    const video = await prisma.video.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!video) {
      throw new HTTPException(404, { message: 'Video not found' });
    }

    const gifs = await prisma.gif.findMany({
      where: {
        videoId: id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return c.json(gifs);
  },

  async deleteVideo(c: Context) {
    const videoId = c.req.param('id');
    const userId = c.get('userId');

    const video = await prisma.video.findFirst({
      where: {
        id: videoId,
        userId
      }
    });

    if (!video) {
      throw new HTTPException(404, { message: 'Video not found' });
    }

    await prisma.video.delete({
      where: { id: videoId }
    });

    return c.json({ message: 'Video deleted successfully' });
  }
};