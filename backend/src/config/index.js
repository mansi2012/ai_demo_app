'use strict';

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    name: process.env.DB_NAME || 'auth_demo',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'changeme',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d'
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200'
  },

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'no-reply@authdemo.local'
  },

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200',

  resetTokenExpiryMinutes: Number(process.env.RESET_TOKEN_EXPIRY_MINUTES) || 1440
};
