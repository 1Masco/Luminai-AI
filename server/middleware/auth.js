import { supabase } from '../config/supabase.js';
import { AppError } from '../errors/AppError.js';
import logger from '../logger/winston.config.js';

/**
 * Authentication middleware
 * Extracts and validates token from Authorization header
 * Attaches user to req.user if token is valid
 *
 * @throws {AppError} UNAUTHORIZED if token is missing or invalid
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      throw new AppError('No token provided', 401, 'AUTH_UNAUTHORIZED');
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.warn('Invalid token attempt', {
        requestId: req.id,
        error: error?.message
      });
      throw new AppError('Invalid or expired token', 401, 'AUTH_UNAUTHORIZED');
    }

    // Attach user to request for use in route handlers
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      logger.error('Authentication error', {
        requestId: req.id,
        error: error.message
      });
      next(new AppError('Authentication failed', 401, 'AUTH_UNAUTHORIZED'));
    }
  }
};

export default authenticateToken;
