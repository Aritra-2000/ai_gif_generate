import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  DATABASE_URL: z.string(),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.string().default('100mb'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
});

const env = envSchema.parse(process.env);

export const config = {
  env: env.NODE_ENV,
  port: parseInt(env.PORT, 10),
  databaseUrl: env.DATABASE_URL,
  uploadDir: env.UPLOAD_DIR,
  maxFileSize: env.MAX_FILE_SIZE,
  allowedOrigins: env.ALLOWED_ORIGINS.split(','),
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
} as const;

export type Config = typeof config; 