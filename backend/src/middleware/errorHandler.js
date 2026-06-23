// Known error codes mapped to HTTP status codes
const ERROR_STATUS_MAP = {
  AUTH_REQUIRED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  EXTERNAL_SERVICE_UNAVAILABLE: 503,
  AI_SERVICE_UNAVAILABLE: 503,
  RATE_LIMITED: 429,
  MEMBER_NOT_PENDING: 409,
  HANDLE_NOT_FOUND: 404,
  INSUFFICIENT_DATA: 422,
};

/**
 * Creates an application error with a structured code and message.
 * @param {string} code - Error code (e.g., 'NOT_FOUND')
 * @param {string} message - Human-readable description
 * @param {object} details - Optional additional context
 * @returns {Error}
 */
const createAppError = (code, message, details = {}) => {
  const err = new Error(message);
  err.code = code;
  err.details = details;
  err.statusCode = ERROR_STATUS_MAP[code] || 500;
  return err;
};

/**
 * Express error-handling middleware (must have 4 parameters).
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  const code = err.code || 'INTERNAL_ERROR';
  const statusCode = err.statusCode || ERROR_STATUS_MAP[code] || 500;
  const message = err.message || 'An unexpected error occurred';
  const details = err.details || {};

  res.status(statusCode).json({
    error: {
      code,
      message,
      details,
    },
  });
};

module.exports = { errorHandler, createAppError, ERROR_STATUS_MAP };
