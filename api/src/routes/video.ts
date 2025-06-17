import { Hono } from 'hono'
import { videoController } from '../controllers/videoController'
import { validate } from '../middleware/validator'
import { uploadMiddleware } from '../middleware/upload'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { VideoService, VideoSettings } from '../services/videoService'
import { WebSocketService } from '../services/websocketService'
import { Server } from 'http'

const videoRoutes = new Hono()

// Create video service instance
let videoService: VideoService

// Initialize video service with WebSocket
videoRoutes.use('*', async (c, next) => {
  if (!videoService) {
    const server = c.get('server') as Server
    if (!server) {
      throw new Error('Server instance not found in context')
    }
    const wsService = new WebSocketService(server)
    videoService = new VideoService(wsService)
  }
  await next()
})

// Validation schemas
const videoUploadSchema = {
  title: { type: 'string', required: true, minLength: 1, maxLength: 100 },
  description: { type: 'string', maxLength: 500 }
}

const gifGenerationSchema = {
  videoId: { type: 'string', required: true },
  startTime: { type: 'number', required: true, min: 0 },
  endTime: { type: 'number', required: true, min: 0 },
  title: { type: 'string', required: true, minLength: 1, maxLength: 100 },
  description: { type: 'string', maxLength: 500 }
}

const videoIdParamSchema = z.object({
  id: z.string()
})

// Schema for video upload
const uploadSchema = z.object({
  file: z.instanceof(File),
  settings: z.object({
    startTime: z.number().optional(),
    endTime: z.number().optional(),
    quality: z.enum(['low', 'medium', 'high']),
    fps: z.number().optional(),
    scale: z.number().optional(),
  }).optional(),
})

// Routes
videoRoutes.post('/upload', async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File
    const settings = formData.get('settings') ? JSON.parse(formData.get('settings') as string) : undefined

    const result = await videoService.saveVideo(file)
    return c.json(result)
  } catch (error) {
    console.error('Error uploading video:', error)
    return c.json({ error: 'Failed to upload video' }, 500)
  }
})

videoRoutes.post('/process/:id', async (c) => {
  const id = c.req.param('id')
  const settings = await c.req.json() as VideoSettings
  
  try {
    await videoService.processVideo(id, settings)
    return c.json({ message: 'Video processing started' })
  } catch (error) {
    console.error('Error processing video:', error)
    return c.json({ error: 'Failed to process video' }, 500)
  }
})

videoRoutes.get('/', videoController.getVideos)
videoRoutes.get('/:id', validate(videoIdParamSchema), videoController.getVideo)
videoRoutes.get('/:id/gifs', validate(videoIdParamSchema), videoController.getGifs)
videoRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id')
  
  try {
    await videoService.deleteVideo(id)
    return c.json({ message: 'Video deleted successfully' })
  } catch (error) {
    console.error('Error deleting video:', error)
    return c.json({ error: 'Failed to delete video' }, 500)
  }
})

// Get video status endpoint
videoRoutes.get('/status/:id', async (c) => {
  const id = c.req.param('id')
  
  try {
    const status = await videoService.getVideoStatus(id)
    return c.json(status)
  } catch (error) {
    console.error('Error getting video status:', error)
    return c.json({ error: 'Failed to get video status' }, 500)
  }
})

// Download video endpoint
videoRoutes.get('/download/:id', async (c) => {
  const id = c.req.param('id')
  
  try {
    const filepath = await videoService.getVideoPath(id)
    return c.body(filepath)
  } catch (error) {
    console.error('Error downloading video:', error)
    return c.json({ error: 'Failed to download video' }, 500)
  }
})

export default videoRoutes
