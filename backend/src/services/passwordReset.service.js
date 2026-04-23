'use strict';
const crypto = require('crypto');
const { Op } = require('sequelize');
const { User, PasswordResetToken } = require('../models/index');
const { sendPasswordResetEmail } = require('../utils/mailer');
const ApiError = require('../utils/ApiError');
const config = require('../config/index');

async function requestPasswordReset(email) {
  // Always resolve without revealing whether the email exists
  const user = await User.findOne({ where: { email } });
  if (!user) {
    return { message: 'If that email is registered, a reset link has been sent.' };
  }

  // Invalidate all existing unused tokens for this user
  await PasswordResetToken.update(
    { usedAt: new Date() },
    { where: { userId: user.id, usedAt: null } }
  );

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + config.resetTokenExpiryMinutes * 60 * 1000);

  await PasswordResetToken.create({ userId: user.id, tokenHash, expiresAt });

  const resetUrl = `${config.frontendUrl}/reset-password?token=${rawToken}`;
  await sendPasswordResetEmail(user.email, resetUrl);

  return { message: 'If that email is registered, a reset link has been sent.' };
}

async function resetPassword(token, newPassword) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const resetRecord = await PasswordResetToken.findOne({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { [Op.gt]: new Date() }
    }
  });

  if (!resetRecord) {
    throw new ApiError(400, 'This reset link is invalid or has expired.');
  }

  const user = await User.findByPk(resetRecord.userId);
  if (!user) {
    throw new ApiError(400, 'This reset link is invalid or has expired.');
  }

  // Use the model helper to hash and store the new password
  await user.setPassword(newPassword);
  await user.save();

  // Mark the token as used
  await resetRecord.update({ usedAt: new Date() });

  return { message: 'Password has been reset successfully.' };
}

module.exports = { requestPasswordReset, resetPassword };
