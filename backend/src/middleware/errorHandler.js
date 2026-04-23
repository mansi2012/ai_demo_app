'use strict';
const { UniqueConstraintError, ValidationError } = require('sequelize');
const ApiError = require('../utils/ApiError');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details && err.details.length > 0 ? err.details : undefined
    });
  }

  if (err instanceof UniqueConstraintError) {
    const details = err.errors.map((e) => ({ field: e.path, message: e.message }));
    return res.status(409).json({
      success: false,
      message: 'A record with that value already exists.',
      details
    });
  }

  if (err instanceof ValidationError) {
    const details = err.errors.map((e) => ({ field: e.path, message: e.message }));
    return res.status(400).json({
      success: false,
      message: 'Validation error.',
      details
    });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({
    success: false,
    message: 'Internal server error.'
  });
}

module.exports = errorHandler;
