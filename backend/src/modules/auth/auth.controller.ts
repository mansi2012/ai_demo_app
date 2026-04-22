import type { Request, Response, NextFunction } from 'express';
import { changePasswordSchema } from './auth.schema';
import { AuthService } from './auth.service';

export class AuthController {
  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = changePasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          details: parsed.error.flatten(),
        });
      }

      const { currentPassword, newPassword } = parsed.data;

      if (!req.user) {
        return res.status(401).json({ success: false, error: 'UNAUTHENTICATED' });
      }
      const { userId, businessId } = req.user;

      const user = await AuthService.findUserByIdScoped(userId, businessId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'USER_NOT_FOUND' });
      }

      const ok = await AuthService.verifyPassword(currentPassword, user.passwordHash);
      if (!ok) {
        return res.status(401).json({ success: false, error: 'INVALID_CURRENT_PASSWORD' });
      }

      if (currentPassword === newPassword) {
        return res
          .status(400)
          .json({ success: false, error: 'NEW_PASSWORD_MUST_DIFFER' });
      }

      const updated = await AuthService.updatePassword(userId, businessId, newPassword);
      if (!updated) {
        return res.status(500).json({ success: false, error: 'UPDATE_FAILED' });
      }

      await AuthService.logAuditEvent({
        event: 'password_changed',
        userId,
        businessId,
        ip: req.ip ?? null,
        metadata: { userAgent: req.get('user-agent') ?? null },
      });

      // Per product decision: do NOT invalidate other sessions on password change.

      return res.status(200).json({ success: true, data: { updated: true } });
    } catch (err) {
      return next(err);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken =
        (req.cookies && req.cookies.refreshToken) || req.body?.refreshToken;

      if (refreshToken) {
        await AuthService.deleteRefreshToken(refreshToken);
      }

      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });

      if (req.user) {
        await AuthService.logAuditEvent({
          event: 'user_logout',
          userId: req.user.userId,
          businessId: req.user.businessId,
          ip: req.ip ?? null,
        });
      }

      return res.status(200).json({ success: true, data: { loggedOut: true } });
    } catch (err) {
      return next(err);
    }
  }
}
