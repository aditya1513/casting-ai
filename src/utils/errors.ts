/**
 * Custom Error Classes
 * Application-specific error types for better error handling
 */

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;
  public readonly details?: any;
  
  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    this.details = details;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error class
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/**
 * Authentication error class
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * Authorization error class
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

/**
 * Not found error class
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string | number) {
    const message = identifier
      ? `${resource} with identifier ${identifier} not found`
      : `${resource} not found`;
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * Conflict error class
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT', details);
  }
}

/**
 * Rate limit error class
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

/**
 * Database error class
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', details?: any) {
    super(message, 500, 'DATABASE_ERROR', details);
  }
}

/**
 * External service error class
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, message?: string) {
    super(
      message || `External service ${service} is unavailable`,
      503,
      'EXTERNAL_SERVICE_ERROR',
      { service }
    );
  }
}

/**
 * File upload error class
 */
export class FileUploadError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'FILE_UPLOAD_ERROR', details);
  }
}

/**
 * Business logic error class
 */
export class BusinessLogicError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'BUSINESS_LOGIC_ERROR', details);
  }
}

/**
 * Bad request error class
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', details?: any) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

/**
 * Unauthorized error class  
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * Error factory for creating errors from Prisma errors
 */
export const handlePrismaError = (error: any): AppError => {
  // Unique constraint violation
  if (error.code === 'P2002') {
    const field = error.meta?.target?.[0];
    return new ConflictError(
      `A record with this ${field || 'value'} already exists`,
      { field }
    );
  }
  
  // Record not found
  if (error.code === 'P2025') {
    return new NotFoundError('Record');
  }
  
  // Foreign key constraint violation
  if (error.code === 'P2003') {
    return new ValidationError('Invalid reference to related record');
  }
  
  // Required field missing
  if (error.code === 'P2012') {
    return new ValidationError('Required field is missing');
  }
  
  // Invalid value for field
  if (error.code === 'P2007') {
    return new ValidationError('Invalid data provided');
  }
  
  // Default database error
  return new DatabaseError('Database operation failed', {
    code: error.code,
    message: error.message,
  });
};

/**
 * Check if error is operational (expected)
 */
export const isOperationalError = (error: Error): boolean => {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
};