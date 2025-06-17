import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import jwt from 'jsonwebtoken';

interface JWTPayload {
  userId: string;
  email: string;
}

declare module 'hono' {
  interface ContextVariableMap {
    user: JWTPayload;
  }
}

export const auth = async (c: Context, next: Next) => {
  try {
    const authHeader = c.req.header('authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      throw new HTTPException(401, { message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
    
    // Add user info to context
    c.set('user', decoded);
    
    await next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new HTTPException(401, { message: 'Invalid token' });
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new HTTPException(401, { message: 'Token expired' });
    }
    throw error;
  }
}; 