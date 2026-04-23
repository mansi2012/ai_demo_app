'use strict';
const nodemailer = require('nodemailer');
const config = require('../config/index');

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: Number(config.smtp.port),
  secure: Number(config.smtp.port) === 465,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass
  }
});

async function sendPasswordResetEmail(toEmail, resetUrl) {
  const expiryMinutes = config.resetTokenExpiryMinutes;
  await transporter.sendMail({
    from: config.smtp.from,
    to: toEmail,
    subject: 'Reset your password',
    text: `Click the link below to reset your password. It expires in ${expiryMinutes} minutes.\n\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
    html: `<p>Click the link below to reset your password. It expires in <strong>${expiryMinutes} minutes</strong>.</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, ignore this email.</p>`
  });
}

module.exports = { sendPasswordResetEmail };
