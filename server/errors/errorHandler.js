import logger from '../logger/winston.config.js';
import AppError from './AppError.js';

/**
 * Global error handling middleware
 * Must be defined LAST, after all other middleware and routes
 */
export const errorHandler = (err, req, res, next) => {
  const requestId = req.id;

  // Handle known operational errors
  if (err instanceof AppError) {
    logger.warn('Application error', {
      requestId,
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
    });

    return res.status(err.statusCode).json(err.toJSON());
  }

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && 'body' in err) {
    logger.warn('JSON parsing error', {
      requestId,
      path: req.path,
      message: err.message,
    });

    return res.status(400).json({
      error: 'Invalid JSON',
      code: 'INVALID_JSON',
      statusCode: 400,
    });
  }

  // Log unexpected errors with stack trace
  logger.error('Unexpected error', {
    requestId,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userAgent: req.get('user-agent'),
  });

  // Return generic error response to client
  const isDevelopment = process.env.NODE_ENV === 'development';
  const statusCode = 'statusCode' in err && typeof err.statusCode === 'number' ? err.statusCode : 500;

  return res.status(statusCode).json({
    error: isDevelopment ? err.message : 'Internal server error',
    code: 'INTERNAL_ERROR',
    statusCode,
    ...(isDevelopment && { stack: err.stack }),
  });
};

/**
 * Async error wrapper for Express route handlers
 * Catches promise rejections and passes them to error handler
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 handler - must be added AFTER all routes
 */
export const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Route not found: ${req.method} ${req.path}`,
    404,
    'ROUTE_NOT_FOUND'
  );
  next(error);
};
