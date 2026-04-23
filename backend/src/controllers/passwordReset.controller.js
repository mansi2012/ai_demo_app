'use strict';
const passwordResetService = require('../services/passwordReset.service');

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const data = await passwordResetService.requestPasswordReset(email);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;
    const data = await passwordResetService.resetPassword(token, newPassword);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = { forgotPassword, resetPassword };
