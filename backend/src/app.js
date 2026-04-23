'use strict';
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('./config/index');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const passwordResetRoutes = require('./routes/passwordReset.routes');

const app = express();

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true
  })
);

// Rate limiting for auth-related routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' }
});

// Mount routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/auth', authLimiter, passwordResetRoutes);

// Central error handler — must be last
app.use(errorHandler);

module.exports = app;
