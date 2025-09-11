/**
 * Request Logger Middleware
 * Custom request logging for production environments
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger, LogContext } from '../utils/logger';

/**
 * Generate or extract request ID
 */
const getRequestId = (req: Request): string => {
  const existingId = req.headers['x-request-id'] as string;
  return existingId || uuidv4();
};

/**
 * Request logger middleware
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  
  // Attach request ID to request and response
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  // Log request
  LogContext.apiRequest(
    req.method,
    req.path,
    (req as any).user?.id,
    req.ip
  );
  
  // Capture response
  const originalSend = res.send;
  res.send = function (data): Response {
    res.send = originalSend;
    
    const duration = Date.now() - startTime;
    
    // Log response
    LogContext.apiResponse(
      req.method,
      req.path,
      res.statusCode,
      duration
    );
    
    // Log slow requests
    if (duration > 2000) {
      logger.warn('Slow request detected', {
        requestId,
        method: req.method,
        path: req.path,
        duration,
        userId: (req as any).user?.id,
      });
    }
    
    return res.send(data);
  };
  
  next();
};

/**
 * Request ID middleware
 */
export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = getRequestId(req);
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};