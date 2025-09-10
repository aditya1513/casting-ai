/**
 * Validation Middleware
 * Request validation using Zod schemas
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

/**
 * Validation middleware factory
 */
export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request against schema
      const validated = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      
      // Replace request properties with validated and transformed data
      req.body = validated.body || req.body;
      req.query = validated.query || req.query;
      req.params = validated.params || req.params;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format validation errors
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        
        const validationError = new ValidationError(
          'Validation failed',
          formattedErrors
        );
        
        next(validationError);
      } else {
        next(error);
      }
    }
  };
};

/**
 * Sanitize middleware to clean input data
 */
export const sanitize = (fields: string[] = ['body']) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    fields.forEach(field => {
      if (field === 'body' && req.body) {
        req.body = sanitizeObject(req.body);
      } else if (field === 'query' && req.query) {
        req.query = sanitizeObject(req.query);
      } else if (field === 'params' && req.params) {
        req.params = sanitizeObject(req.params);
      }
    });
    next();
  };
};

/**
 * Recursively sanitize object values
 */
const sanitizeObject = (obj: any): any => {
  if (typeof obj === 'string') {
    // Remove potential XSS vectors
    return obj
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
};