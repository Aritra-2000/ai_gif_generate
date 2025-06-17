import { z } from 'zod'

// Video upload schema
export const videoUploadSchema = z.object({
  url: z.string().url('Invalid video URL'),
  title: z.string().min(1, 'Title is required'),
  userId: z.string().min(1, 'User ID is required'),
})

// GIF generation schema
export const gifGenerationSchema = z.object({
  videoId: z.string().min(1, 'Video ID is required'),
  prompt: z.string().min(1, 'Prompt is required'),
  startTime: z.number().nonnegative('Start time must be positive'),
  endTime: z.number().nonnegative('End time must be positive'),
  userId: z.string().min(1, 'User ID is required'),
}).refine(data => data.endTime > data.startTime, {
  message: 'End time must be greater than start time',
})

// Video ID param schema
export const videoIdParamSchema = z.object({
  id: z.string().min(1, 'Video ID is required'),
}) 