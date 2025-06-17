import { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  max: number // Max requests per window
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

export const rateLimiter = (config: RateLimitConfig) => {
  return async (c: Context, next: Next) => {
    const ip = c.req.header('x-forwarded-for') || 'unknown'
    const key = `${ip}:${c.req.path}`
    const now = Date.now()

    // Initialize or reset if window has passed
    if (!store[key] || now > store[key].resetTime) {
      store[key] = {
        count: 0,
        resetTime: now + config.windowMs,
      }
    }

    // Increment counter
    store[key].count++

    // Check if limit exceeded
    if (store[key].count > config.max) {
      const retryAfter = Math.ceil((store[key].resetTime - now) / 1000)
      throw new HTTPException(429, {
        message: 'Too many requests',
        res: new Response('Too many requests', {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': config.max.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': store[key].resetTime.toString(),
          },
        }),
      })
    }

    // Add rate limit headers
    c.header('X-RateLimit-Limit', config.max.toString())
    c.header('X-RateLimit-Remaining', (config.max - store[key].count).toString())
    c.header('X-RateLimit-Reset', store[key].resetTime.toString())

    await next()
  }
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  Object.keys(store).forEach(key => {
    if (now > store[key].resetTime) {
      delete store[key]
    }
  })
}, 60000) // Clean up every minute 