/**
 * Custom application error class
 * Allows standardized error handling across the application
 */
export class AppError extends Error {
  constructor(
    message,
    statusCode = 500,
    code = 'INTERNAL_ERROR',
    isOperational = true
  ) {
    super(message);

    Object.setPrototypeOf(this, AppError.prototype);

    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert to JSON for API responses
   */
  toJSON() {
    return {
      error: this.message,
      code: this.code,
      statusCode: this.statusCode,
    };
  }
}

/**
 * Common application errors
 */
export const AppErrors = {
  // Authentication errors
  INVALID_CREDENTIALS: () =>
    new AppError('Invalid email or password', 401, 'AUTH_INVALID_CREDENTIALS'),
  ACCOUNT_NOT_FOUND: () =>
    new AppError('Account not found', 404, 'AUTH_ACCOUNT_NOT_FOUND'),
  TOKEN_EXPIRED: () =>
    new AppError('Authentication token expired', 401, 'AUTH_TOKEN_EXPIRED'),
  UNAUTHORIZED: () =>
    new AppError('Unauthorized access', 401, 'AUTH_UNAUTHORIZED'),
  PERMISSION_DENIED: () =>
    new AppError('Permission denied', 403, 'AUTH_PERMISSION_DENIED'),

  // Validation errors
  INVALID_INPUT: (field) =>
    new AppError(`Invalid input: ${field}`, 400, 'VALIDATION_INVALID_INPUT'),
  MISSING_REQUIRED_FIELD: (field) =>
    new AppError(`Missing required field: ${field}`, 400, 'VALIDATION_MISSING_FIELD'),
  EMAIL_ALREADY_EXISTS: () =>
    new AppError('Email already registered', 409, 'VALIDATION_EMAIL_EXISTS'),

  // Resource errors
  NOT_FOUND: (resource) =>
    new AppError(`${resource} not found`, 404, 'NOT_FOUND'),
  ALREADY_EXISTS: (resource) =>
    new AppError(`${resource} already exists`, 409, 'ALREADY_EXISTS'),

  // Processing errors
  TRANSCRIPTION_FAILED: () =>
    new AppError('Failed to transcribe audio', 500, 'PROCESSING_TRANSCRIPTION_FAILED'),
  SUMMARY_GENERATION_FAILED: () =>
    new AppError('Failed to generate summary', 500, 'PROCESSING_SUMMARY_FAILED'),
  PDF_PROCESSING_FAILED: () =>
    new AppError('Failed to process PDF', 500, 'PROCESSING_PDF_FAILED'),

  // External service errors
  EXTERNAL_SERVICE_ERROR: (service) =>
    new AppError(`${service} service error`, 502, 'EXTERNAL_SERVICE_ERROR'),
  API_RATE_LIMITED: () =>
    new AppError('API rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED'),

  // Server errors
  INTERNAL_SERVER_ERROR: () =>
    new AppError('Internal server error', 500, 'INTERNAL_ERROR'),
  DATABASE_ERROR: () =>
    new AppError('Database error', 500, 'DATABASE_ERROR'),
};

export default AppError;
