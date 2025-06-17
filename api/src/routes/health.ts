import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const router = new Hono();
const prisma = new PrismaClient();

router.get('/', async (c) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Check disk space
    const tempDir = process.env.TEMP_DIR || './temp';
    const gifDir = path.join(process.cwd(), 'uploads', 'gifs');
    
    // Ensure directories exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    if (!fs.existsSync(gifDir)) {
      fs.mkdirSync(gifDir, { recursive: true });
    }

    // Get system stats
    const stats = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV,
      database: 'connected',
      directories: {
        temp: fs.existsSync(tempDir),
        gifs: fs.existsSync(gifDir)
      }
    };

    return c.json(stats);
  } catch (error) {
    return c.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

export default router; 