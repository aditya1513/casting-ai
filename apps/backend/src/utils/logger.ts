/**
 * Logger Configuration
 * Winston logger setup with file rotation and custom formatting
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { config } from '../config/config';

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaString}`;
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? '\n' + JSON.stringify(meta, null, 2) : '';
    return `${timestamp} ${level}: ${message}${metaString}`;
  })
);

// Create logs directory
const logsDir = path.join(process.cwd(), config.logging.dir);

// File transport for all logs
const fileRotateTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: logFormat,
  level: 'info',
});

// File transport for error logs
const errorFileRotateTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  format: logFormat,
  level: 'error',
});

// Create logger instance
export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: 'castmatch-backend' },
  transports: [
    fileRotateTransport,
    errorFileRotateTransport,
  ],
});

// Add console transport for non-production environments
if (!config.isProduction) {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: config.logging.level,
  }));
}

// Stream for Morgan HTTP logger
export const httpLogStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

/**
 * Structured logging utilities
 */
export const LogContext = {
  /**
   * Log API request
   */
  apiRequest: (method: string, path: string, userId?: string, ip?: string) => {
    logger.info('API Request', {
      type: 'api_request',
      method,
      path,
      userId,
      ip,
    });
  },
  
  /**
   * Log API response
   */
  apiResponse: (method: string, path: string, statusCode: number, duration: number) => {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    logger.log(level, 'API Response', {
      type: 'api_response',
      method,
      path,
      statusCode,
      duration,
    });
  },
  
  /**
   * Log database query
   */
  dbQuery: (operation: string, model: string, duration: number) => {
    logger.debug('Database Query', {
      type: 'db_query',
      operation,
      model,
      duration,
    });
  },
  
  /**
   * Log authentication event
   */
  auth: (event: string, userId?: string, success: boolean = true) => {
    const level = success ? 'info' : 'warn';
    logger.log(level, `Authentication: ${event}`, {
      type: 'auth',
      event,
      userId,
      success,
    });
  },
  
  /**
   * Log business event
   */
  business: (event: string, data: Record<string, any>) => {
    logger.info(`Business Event: ${event}`, {
      type: 'business',
      event,
      ...data,
    });
  },
  
  /**
   * Log error with context
   */
  error: (message: string, error: Error, context?: Record<string, any>) => {
    logger.error(message, {
      type: 'error',
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      ...context,
    });
  },
};

// Export logger instance as default
export default logger;