import { z } from 'zod';

export const forgotPasswordSchema = z.object({
  email: z.string().email().max(255).toLowerCase().trim(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10).max(256),
  newPassword: z.string().min(8).max(128),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
