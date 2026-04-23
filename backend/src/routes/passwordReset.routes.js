'use strict';
const { Router } = require('express');
const passwordResetController = require('../controllers/passwordReset.controller');
const { forgotPasswordValidator, resetPasswordValidator } = require('../validators/passwordReset.validator');
const validate = require('../middleware/validate');

const router = Router();

// POST /api/auth/forgot-password
router.post(
  '/forgot-password',
  forgotPasswordValidator,
  validate,
  passwordResetController.forgotPassword
);

// POST /api/auth/reset-password
router.post(
  '/reset-password',
  resetPasswordValidator,
  validate,
  passwordResetController.resetPassword
);

module.exports = router;
