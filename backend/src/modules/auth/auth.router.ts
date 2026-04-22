import { Router } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware';
import { AuthController } from './auth.controller';
import { changePasswordRateLimiter } from './auth.rateLimit';

const router = Router();

router.post(
  '/change-password',
  authMiddleware,
  changePasswordRateLimiter,
  AuthController.changePassword
);

router.post('/logout', authMiddleware, AuthController.logout);

export default router;
