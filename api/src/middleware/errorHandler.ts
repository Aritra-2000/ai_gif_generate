import { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

export const errorHandler = async (c: Context, next: Next) => {
  try {
    await next()
  } catch (error) {
    console.error('Error:', error)

    if (error instanceof HTTPException) {
      return c.json({
        error: error.message,
        status: error.status
      }, error.status)
    }

    if (error instanceof PrismaClientKnownRequestError) {
      // Handle Prisma errors
      switch (error.code) {
        case 'P2002':
          return c.json({
            error: 'A record with this value already exists',
            field: error.meta?.target
          }, 409)
        case 'P2025':
          return c.json({
            error: 'Record not found'
          }, 404)
        default:
          return c.json({
            error: 'Database error occurred'
          }, 500)
      }
    }

    // Handle validation errors
    if (error instanceof Error && error.name === 'ValidationError') {
      return c.json({
        error: error.message
      }, 400)
    }

    // Handle file system errors
    if (error instanceof Error && error.name === 'ENOENT') {
      return c.json({
        error: 'File not found'
      }, 404)
    }

    // Default error response
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return c.json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, 500)
  }
} 