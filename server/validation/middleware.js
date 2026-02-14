import { ZodError } from 'zod';
import logger from '../logger/winston.config.js';

/**
 * Express middleware factory for request body validation.
 */
export const validateRequest = (schema) => {
  return async (req, res, next) => {
    try {
      const validated = await schema.parseAsync(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        logger.warn('Validation error', {
          requestId: req.id,
          path: req.path,
          method: req.method,
          errors: fieldErrors,
        });

        return res.status(422).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: fieldErrors,
        });
      }

      logger.error('Unexpected validation error', {
        requestId: req.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(500).json({
        error: 'Validation error',
        code: 'INTERNAL_ERROR',
      });
    }
  };
};

export const validateQuery = (schema) => {
  return async (req, res, next) => {
    try {
      const validated = await schema.parseAsync(req.query);
      req.query = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return res.status(422).json({
          error: 'Query validation failed',
          code: 'VALIDATION_ERROR',
          details: fieldErrors,
        });
      }

      return res.status(500).json({
        error: 'Query validation error',
        code: 'INTERNAL_ERROR',
      });
    }
  };
};

export const validateParams = (schema) => {
  return async (req, res, next) => {
    try {
      const validated = await schema.parseAsync(req.params);
      req.params = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return res.status(422).json({
          error: 'Parameter validation failed',
          code: 'VALIDATION_ERROR',
          details: fieldErrors,
        });
      }

      return res.status(500).json({
        error: 'Parameter validation error',
        code: 'INTERNAL_ERROR',
      });
    }
  };
};
