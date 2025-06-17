import { Context, Next } from 'hono';
import { config } from '../config';

export const uploadMiddleware = async (c: Context, next: Next) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    // Check file size
    const maxSize = parseInt(config.maxFileSize);
    if (file.size > maxSize) {
      return c.json({ error: 'File too large' }, 400);
    }

    // Check file type
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: 'Invalid file type' }, 400);
    }

    // Add file to context for route handlers
    c.set('file', file);
    await next();
  } catch (error) {
    console.error('Error in upload middleware:', error);
    return c.json({ error: 'Failed to process upload' }, 500);
  }
}; 