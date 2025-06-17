import { Context, Next } from 'hono';

export const requestLogger = async (c: Context, next: Next) => {
  const start = Date.now();
  const { method, url } = c.req;
  const userAgent = c.req.header('user-agent') || 'unknown';
  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';

  try {
    await next();
  } finally {
    const duration = Date.now() - start;
    const status = c.res.status;
    const contentLength = c.res.headers.get('content-length') || '0';

    // Log request details
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        method,
        url,
        status,
        duration: `${duration}ms`,
        contentLength,
        userAgent,
        ip,
        userId: c.get('userId') || 'anonymous'
      })
    );

    // Log errors with more details
    if (status >= 400) {
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          method,
          url,
          status,
          duration: `${duration}ms`,
          userAgent,
          ip,
          userId: c.get('userId') || 'anonymous',
          error: c.res.statusText
        })
      );
    }
  }
}; 