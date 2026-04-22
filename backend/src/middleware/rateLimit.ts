import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface RateBucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateBucket>();

function cleanup() {
  const now = Date.now();
  for (const [key, bucket] of store.entries()) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}

setInterval(cleanup, 5 * 60 * 1000).unref?.();

interface RateLimitOpts {
  windowMs: number;
  max: number;
  keyFn: (req: Request) => string[];
  name: string;
}

export function rateLimit(opts: RateLimitOpts) {
  return (req: Request, res: Response, next: NextFunction) => {
    const keys = opts.keyFn(req).filter(Boolean).map((k) => `${opts.name}:${k}`);
    const now = Date.now();
    for (const key of keys) {
      let bucket = store.get(key);
      if (!bucket || bucket.resetAt <= now) {
        bucket = { count: 0, resetAt: now + opts.windowMs };
        store.set(key, bucket);
      }
      bucket.count += 1;
      if (bucket.count > opts.max) {
        logger.warn({ name: opts.name, key }, 'rate limit exceeded');
        return res.status(429).json({
          success: false,
          error: 'Too many requests. Please try again later.',
        });
      }
    }
    next();
  };
}

export const forgotPasswordRateLimit = rateLimit({
  name: 'forgot-password',
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyFn: (req) => {
    const ip = (req.ip || req.socket.remoteAddress || 'unknown').toString();
    const email = ((req.body && req.body.email) || '').toString().toLowerCase().trim();
    return [`ip:${ip}`, email ? `email:${email}` : ''];
  },
});
