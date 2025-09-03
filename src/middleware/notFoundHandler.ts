/**
 * 404 Not Found Handler Middleware
 * Handles requests to undefined routes
 */

import { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '../utils/errors';

/**
 * 404 handler middleware
 */
export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const error = new NotFoundError(
    'Route',
    `${req.method} ${req.originalUrl}`
  );
  
  next(error);
};