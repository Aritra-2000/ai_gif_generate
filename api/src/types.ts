import { Context } from 'hono';
import { Server } from 'http';

declare module 'hono' {
  interface ContextVariableMap {
    server: Server;
  }
} 