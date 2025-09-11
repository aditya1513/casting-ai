/**
 * Global Error Handler Middleware
 * Centralized error handling for the application
 */

import { Request, Response, NextFunction } from 'express';
import { AppError, isOperationalError, handlePrismaError } from '../utils/errors';
import { logger, LogContext } from '../utils/logger';
import { config } from '../config/config';
import { ZodError } from 'zod';

/**
 * Error response interface
 */
interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    statusCode: number;
    details?: any;
    stack?: string;
    timestamp: string;
    path: string;
    method: string;
    requestId?: string;
  };
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let appError: AppError;
  
  // Handle different error types
  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof ZodError) {
    // Handle Zod validation errors
    const formattedErrors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    appError = new AppError(
      'Validation failed',
      400,
      'VALIDATION_ERROR',
      formattedErrors
    );
  } else if (error.name === 'PrismaClientKnownRequestError') {
    // Handle Prisma errors
    appError = handlePrismaError(error);
  } else if (error.name === 'JsonWebTokenError') {
    appError = new AppError('Invalid token', 401, 'INVALID_TOKEN');
  } else if (error.name === 'TokenExpiredError') {
    appError = new AppError('Token expired', 401, 'TOKEN_EXPIRED');
  } else if (error.name === 'MulterError') {
    // Handle file upload errors
    appError = new AppError(
      error.message || 'File upload failed',
      400,
      'FILE_UPLOAD_ERROR'
    );
  } else {
    // Unknown errors
    appError = new AppError(
      config.isDevelopment ? error.message : 'Internal server error',
      500,
      'INTERNAL_ERROR'
    );
  }
  
  // Log error
  if (!isOperationalError(error)) {
    LogContext.error('Unexpected error occurred', error as Error, {
      url: req.url,
      method: req.method,
      ip: req.ip,
      userId: (req as any).user?.id,
    });
  } else if (appError.statusCode >= 500) {
    logger.error(`Server error: ${appError.message}`, {
      error: appError,
      url: req.url,
      method: req.method,
    });
  } else if (appError.statusCode >= 400) {
    logger.warn(`Client error: ${appError.message}`, {
      error: appError,
      url: req.url,
      method: req.method,
    });
  }
  
  // Prepare error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      message: appError.message,
      code: appError.code,
      statusCode: appError.statusCode,
      details: appError.details,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      requestId: req.headers['x-request-id'] as string | undefined,
    },
  };
  
  // Add stack trace in development
  if (config.isDevelopment && appError.stack) {
    errorResponse.error.stack = appError.stack;
  }
  
  // Send error response
  res.status(appError.statusCode).json(errorResponse);
};

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};