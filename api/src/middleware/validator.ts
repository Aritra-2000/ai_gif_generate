import { Context } from 'hono'
import { z } from 'zod'
import { ValidationError } from '../utils/errors'

export const validate = (schema: z.ZodSchema) => {
  return async (c: Context, next: () => Promise<void>) => {
    try {
      const contentType = c.req.header('content-type')
      let data: unknown

      if (contentType?.includes('application/json')) {
        data = await c.req.json()
      } else if (contentType?.includes('multipart/form-data')) {
        data = await c.req.formData()
      } else {
        const query = c.req.query()
        data = Object.fromEntries(Object.entries(query))
      }

      // Validate data against schema
      const validated = await schema.parseAsync(data)
      
      // Add validated data to context
      c.set('validated', validated)
      
      await next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(
          error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
        )
      }
      throw error
    }
  }
} 