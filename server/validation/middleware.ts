import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import logger from '../logger/winston.config.js';

/**
 * Express middleware factory for request body validation
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const validated = await schema.parseAsync(req.body);

      // Replace body with validated data
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

/**
 * Validate query parameters
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export const validateQuery = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.query);
      req.query = validated as any;
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

/**
 * Validate URL parameters
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export const validateParams = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.params);
      req.params = validated as any;
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
