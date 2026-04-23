import { Request, Response, NextFunction } from 'express';
import { forgotPasswordSchema, resetPasswordSchema } from '../../schemas/auth.schema';
import {
  handleForgotPassword,
  handleResetPassword,
  PasswordResetError,
} from '../../services/auth/passwordReset.service';
import { logger } from '../../utils/logger';

export async function forgotPasswordController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Invalid email', details: parsed.error.flatten() });
      return;
    }

    const { email } = parsed.data;
    const result = await handleForgotPassword(email);

    if (!result.found) {
      res.status(404).json({
        success: false,
        error: 'No account found for that email address.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { message: 'A password reset link has been sent to your email.' },
    });
  } catch (err) {
    logger.error({ err }, 'forgot-password failed');
    next(err);
  }
}

export async function resetPasswordController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: parsed.error.flatten(),
      });
      return;
    }

    const { token, newPassword } = parsed.data;
    await handleResetPassword(token, newPassword);

    res.status(200).json({
      success: true,
      data: { message: 'Password reset successful' },
    });
  } catch (err) {
    if (err instanceof PasswordResetError) {
      res.status(err.status).json({ success: false, error: err.message });
      return;
    }
    logger.error({ err }, 'reset-password failed');
    next(err);
  }
}
