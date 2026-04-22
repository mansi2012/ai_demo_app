import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { pool } from '../../config/db';
import { logger } from '../../utils/logger';
import { passwordResetEmailQueue } from '../../queues/passwordResetEmail.queue';
import type { PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const BCRYPT_ROUNDS = 12;

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

interface UserRow extends RowDataPacket {
  id: string;
  businessId: string;
  email: string;
  name: string;
}

interface TokenRow extends RowDataPacket {
  id: string;
  userId: string;
  businessId: string;
  expiresAt: Date;
  usedAt: Date | null;
}

export class PasswordResetError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function handleForgotPassword(email: string): Promise<{ found: boolean }> {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query<UserRow[]>(
      'SELECT id, businessId, email, name FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    if (rows.length === 0) {
      logger.info({ email }, 'forgot-password: user not found');
      return { found: false };
    }
    const user = rows[0];

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    await conn.query<ResultSetHeader>(
      `INSERT INTO password_reset_tokens (userId, businessId, tokenHash, expiresAt)
       VALUES (?, ?, ?, ?)`,
      [user.id, user.businessId, tokenHash, expiresAt]
    );

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const resetUrl = `${appUrl.replace(/\/$/, '')}/reset-password?token=${rawToken}`;

    await passwordResetEmailQueue.add('send-password-reset-email', {
      to: user.email,
      name: user.name,
      resetUrl,
    });

    logger.info(
      { userId: user.id.toString(), businessId: user.businessId.toString() },
      'password reset token issued and email enqueued'
    );
    return { found: true };
  } finally {
    conn.release();
  }
}

export async function handleResetPassword(rawToken: string, newPassword: string): Promise<void> {
  const tokenHash = sha256(rawToken);
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [tokenRows] = await conn.query<TokenRow[]>(
      `SELECT id, userId, businessId, expiresAt, usedAt
       FROM password_reset_tokens
       WHERE tokenHash = ? AND usedAt IS NULL AND expiresAt > NOW()
       LIMIT 1
       FOR UPDATE`,
      [tokenHash]
    );

    if (tokenRows.length === 0) {
      await conn.rollback();
      logger.warn('password reset attempt with invalid or expired token');
      throw new PasswordResetError('Invalid or expired reset link', 400);
    }

    const tokenRow = tokenRows[0];

    const [userRows] = await conn.query<UserRow[]>(
      'SELECT id, businessId, email, name FROM users WHERE id = ? AND businessId = ? LIMIT 1',
      [tokenRow.userId, tokenRow.businessId]
    );
    if (userRows.length === 0) {
      await conn.rollback();
      logger.warn({ userId: tokenRow.userId.toString() }, 'password reset: user not found for token');
      throw new PasswordResetError('Invalid or expired reset link', 400);
    }
    const user = userRows[0];

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await conn.query<ResultSetHeader>(
      'UPDATE users SET passwordHash = ?, updatedAt = NOW() WHERE id = ? AND businessId = ?',
      [passwordHash, user.id, user.businessId]
    );

    await conn.query<ResultSetHeader>(
      'UPDATE password_reset_tokens SET usedAt = NOW() WHERE id = ?',
      [tokenRow.id]
    );

    // Invalidate all refresh tokens for this user (multi-tenant scoped)
    await conn.query<ResultSetHeader>(
      `UPDATE refresh_tokens
       SET revokedAt = NOW()
       WHERE userId = ? AND businessId = ? AND revokedAt IS NULL`,
      [user.id, user.businessId]
    );

    await conn.commit();

    logger.info(
      { userId: user.id.toString(), businessId: user.businessId.toString() },
      'password reset successful; refresh tokens invalidated'
    );
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
}
