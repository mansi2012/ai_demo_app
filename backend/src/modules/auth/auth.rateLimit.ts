import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

/**
 * Per-user rate limiter for password change attempts.
 * 5 attempts per 15 minutes, keyed by authenticated userId (falls back to IP).
 */
export const changePasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const userId = req.user?.userId;
    if (userId) return `user:${String(userId)}`;
    return `ip:${req.ip ?? 'unknown'}`;
  },
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: 'TOO_MANY_REQUESTS',
      message: 'Too many password change attempts. Please try again later.',
    });
  },
});
