import bcrypt from 'bcrypt';
import { pool } from '../../db/pool';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

const BCRYPT_COST = 12;

interface UserRow extends RowDataPacket {
  id: bigint;
  businessId: bigint;
  passwordHash: string;
}

export class AuthService {
  static async findUserByIdScoped(userId: bigint | string, businessId: bigint | string) {
    const [rows] = await pool.query<UserRow[]>(
      'SELECT id, businessId, passwordHash FROM users WHERE id = ? AND businessId = ? LIMIT 1',
      [userId, businessId]
    );
    return rows[0] ?? null;
  }

  static async verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  static async updatePassword(
    userId: bigint | string,
    businessId: bigint | string,
    newPassword: string
  ): Promise<boolean> {
    const newHash = await bcrypt.hash(newPassword, BCRYPT_COST);
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE users SET passwordHash = ?, updatedAt = NOW() WHERE id = ? AND businessId = ?',
      [newHash, userId, businessId]
    );
    return result.affectedRows === 1;
  }

  static async deleteRefreshToken(tokenId: string): Promise<void> {
    await pool.query('DELETE FROM refresh_tokens WHERE token = ?', [tokenId]);
  }

  static async logAuditEvent(params: {
    event: string;
    userId: bigint | string;
    businessId: bigint | string;
    ip: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await pool.query(
        'INSERT INTO audit_logs (event, userId, businessId, ip, metadata, createdAt) VALUES (?, ?, ?, ?, ?, NOW())',
        [
          params.event,
          params.userId,
          params.businessId,
          params.ip,
          params.metadata ? JSON.stringify(params.metadata) : null,
        ]
      );
    } catch (err) {
      // Never fail the request on audit log insertion issues
      // eslint-disable-next-line no-console
      console.error('[audit] failed to write event', params.event, err);
    }
  }
}
