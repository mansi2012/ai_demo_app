import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import {
  PASSWORD_RESET_EMAIL_QUEUE,
  PasswordResetEmailJob,
} from '../queues/passwordResetEmail.queue';
import { getMailer, MAIL_FROM } from '../config/mailer';
import { logger } from '../utils/logger';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderHtml(name: string, resetUrl: string): string {
  const safeName = escapeHtml(name || 'there');
  const safeUrl = escapeHtml(resetUrl);
  return `<!doctype html>
<html>
  <body style="font-family: Arial, sans-serif; background:#f5f5f5; padding:24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:auto;background:#fff;border-radius:8px;padding:32px;">
      <tr><td>
        <h2 style="margin:0 0 16px;color:#111;">Reset your LocalChat password</h2>
        <p style="color:#333;font-size:15px;line-height:1.5;">Hi ${safeName},</p>
        <p style="color:#333;font-size:15px;line-height:1.5;">
          We received a request to reset the password for your LocalChat account.
          Click the button below to choose a new password.
        </p>
        <p style="text-align:center;margin:28px 0;">
          <a href="${safeUrl}" style="background:#25D366;color:#fff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:600;display:inline-block;">Reset password</a>
        </p>
        <p style="color:#555;font-size:13px;line-height:1.5;">
          Or copy and paste this link into your browser:<br/>
          <a href="${safeUrl}" style="color:#1a73e8;word-break:break-all;">${safeUrl}</a>
        </p>
        <p style="color:#b00;font-size:13px;margin-top:24px;">
          This link will expire in 12 hours. If you did not request a password reset, you can safely ignore this email.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
        <p style="color:#888;font-size:12px;">LocalChat &mdash; WhatsApp automation for local businesses</p>
      </td></tr>
    </table>
  </body>
</html>`;
}

function renderText(name: string, resetUrl: string): string {
  return [
    `Hi ${name || 'there'},`,
    '',
    'We received a request to reset the password for your LocalChat account.',
    'Use the link below to choose a new password:',
    '',
    resetUrl,
    '',
    'This link will expire in 12 hours.',
    'If you did not request a password reset, you can safely ignore this email.',
    '',
    '— LocalChat',
  ].join('\n');
}

export const passwordResetEmailWorker = new Worker<PasswordResetEmailJob>(
  PASSWORD_RESET_EMAIL_QUEUE,
  async (job: Job<PasswordResetEmailJob>) => {
    const { to, name, resetUrl } = job.data;
    if (!to || !resetUrl) {
      throw new Error('Missing required email fields');
    }

    const mailer = getMailer();
    const info = await mailer.sendMail({
      from: MAIL_FROM,
      to,
      subject: 'Reset your LocalChat password',
      text: renderText(name, resetUrl),
      html: renderHtml(name, resetUrl),
    });

    logger.info(
      { jobId: job.id, to, messageId: info.messageId },
      'password reset email sent'
    );
  },
  {
    connection: redisConnection,
    concurrency: parseInt(process.env.PASSWORD_RESET_WORKER_CONCURRENCY || '5', 10),
  }
);

passwordResetEmailWorker.on('failed', (job, err) => {
  logger.error(
    { jobId: job?.id, attempt: job?.attemptsMade, err: err.message },
    'password reset email job failed'
  );
});

passwordResetEmailWorker.on('completed', (job) => {
  logger.debug({ jobId: job.id }, 'password reset email job completed');
});
