import { Router } from 'express';
import {
  forgotPasswordController,
  resetPasswordController,
} from '../controllers/auth/passwordReset.controller';
import { forgotPasswordRateLimit } from '../middleware/rateLimit';

const router = Router();

/**
 * Public auth endpoints.
 * NOTE: forgot-password and reset-password must NOT use authMiddleware.
 */

router.post('/forgot-password', forgotPasswordRateLimit, forgotPasswordController);
router.post('/reset-password', resetPasswordController);

export default router;
