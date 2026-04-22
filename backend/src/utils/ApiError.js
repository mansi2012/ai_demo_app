class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }

  static conflict(message, details) {
    return new ApiError(409, message, details);
  }

  static notFound(message = 'Not Found') {
    return new ApiError(404, message);
  }
}

module.exports = ApiError;
