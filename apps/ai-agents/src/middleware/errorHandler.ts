/**
 * Global error handler for AI Agents Server
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log the error
  logger.error('Request error', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    path: req.path,
    body: req.body,
    query: req.query,
    headers: req.headers,
    statusCode: error.statusCode || 500
  });

  // Determine response status and message
  const statusCode = error.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Response structure
  const errorResponse = {
    success: false,
    error: {
      message: error.message || 'Internal server error',
      code: error.code || 'INTERNAL_ERROR',
      statusCode,
      ...((!isProduction || error.isOperational) && {
        stack: error.stack
      }),
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    }
  };

  res.status(statusCode).json(errorResponse);
};

// Custom error classes
export class ValidationError extends Error implements ApiError {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AIServiceError extends Error implements ApiError {
  statusCode = 502;
  code = 'AI_SERVICE_ERROR';
  isOperational = true;

  constructor(message: string, public service?: string) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export class RateLimitError extends Error implements ApiError {
  statusCode = 429;
  code = 'RATE_LIMIT_EXCEEDED';
  isOperational = true;

  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class DatabaseError extends Error implements ApiError {
  statusCode = 503;
  code = 'DATABASE_ERROR';
  isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}