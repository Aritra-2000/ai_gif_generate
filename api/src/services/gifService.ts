import { PrismaClient } from '@prisma/client'
import ffmpeg from 'fluent-ffmpeg'
import { HTTPException } from 'hono/http-exception'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import { v2 as cloudinary } from 'cloudinary'

const prisma = new PrismaClient()
const mkdir = promisify(fs.mkdir)
const writeFile = promisify(fs.writeFile)
const unlink = promisify(fs.unlink)

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

interface CloudinaryUploadResult {
  secure_url: string
  public_id: string
}

export const gifService = {
  // Generate GIF from video
  async generateGif(videoId: string, startTime: number, duration: number = 3): Promise<string> {
    try {
      // Get video details
      const video = await prisma.video.findUnique({
        where: { id: videoId }
      })

      if (!video) {
        throw new HTTPException(404, { message: 'Video not found' })
      }

      // Create output directory if it doesn't exist
      const outputDir = path.join(process.cwd(), 'uploads', 'gifs')
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }

      // Generate unique filename
      const gifPath = path.join(outputDir, `${videoId}_${Date.now()}.gif`)

      // Generate GIF using FFmpeg
      await this.createGif(video.url, gifPath, startTime, duration)

      // Create GIF record in database
      const gif = await prisma.gif.create({
        data: {
          url: gifPath,
          duration,
          videoId,
          userId: video.userId,
          startTime: startTime,
          endTime: startTime + duration,
          title: video.title
        }
      })

      return gifPath
    } catch (error: any) {
      throw new HTTPException(500, { 
        message: `GIF generation failed: ${error.message}` 
      })
    }
  },

  // Download video from URL
  async downloadVideo(url: string): Promise<string> {
    try {
      // Ensure temp directory exists
      await mkdir(process.env.TEMP_DIR || './temp', { recursive: true })

      const videoPath = path.join(process.env.TEMP_DIR || './temp', `${Date.now()}.mp4`)
      const response = await fetch(url)
      const buffer = await response.arrayBuffer()
      await writeFile(videoPath, Buffer.from(buffer))
      return videoPath
    } catch (error) {
      console.error('Error downloading video:', error)
      throw error
    }
  },

  // Create GIF from video using ffmpeg
  async createGif(
    videoPath: string, 
    outputPath: string, 
    startTime: number, 
    duration: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .setStartTime(startTime)
        .setDuration(duration)
        .fps(15)
        .size('320x?') // Maintain aspect ratio
        .outputOptions([
          '-vf', 'split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
          '-loop', '0'
        ])
        .on('end', () => resolve())
        .on('error', reject)
        .save(outputPath)
    })
  },

  // Upload GIF to Cloudinary
  async uploadToCloudinary(filePath: string): Promise<CloudinaryUploadResult> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        filePath,
        {
          resource_type: 'auto',
          folder: 'focusflow/gifs',
        },
        (error, result) => {
          if (error) {
            reject(error)
          } else if (result) {
            resolve({
              secure_url: result.secure_url,
              public_id: result.public_id,
            })
          }
        }
      )
    })
  },

  // Update GIF status
  async updateGifStatus(
    gifId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    url?: string,
    caption?: string,
    error?: string
  ) {
    return prisma.gif.update({
      where: { id: gifId },
      data: {
        status,
        url,
        caption,
        error,
      },
    })
  },

  async getGifs(videoId: string): Promise<any[]> {
    const gifs = await prisma.gif.findMany({
      where: { videoId },
      orderBy: { createdAt: 'desc' }
    })

    return gifs
  },

  async deleteGif(gifId: string): Promise<void> {
    const gif = await prisma.gif.findUnique({
      where: { id: gifId }
    })

    if (!gif) {
      throw new HTTPException(404, { message: 'GIF not found' })
    }

    // Delete file from filesystem
    await unlink(gif.url || '').catch(() => {})

    // Delete from database
    await prisma.gif.delete({
      where: { id: gifId }
    })
  }
} 