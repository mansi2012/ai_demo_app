import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '../utils/logger';

let transporter: Transporter | null = null;

export function getMailer(): Transporter {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = (process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';

  if (!host || !user || !pass) {
    logger.warn('SMTP credentials incomplete; emails will fail until configured');
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });

  return transporter;
}

export const MAIL_FROM =
  process.env.SMTP_FROM || 'LocalChat <no-reply@localchat.app>';
