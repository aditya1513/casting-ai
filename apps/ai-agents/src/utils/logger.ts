/**
 * Logger configuration for AI Agents Server
 */

import winston from 'winston';
import { config } from '../config/config.js';

// Create custom format
const customFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let logMessage = `${timestamp} [${level}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      logMessage += ` ${JSON.stringify(meta, null, 2)}`;
    }
    
    return logMessage;
  })
);

// Create transports
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: config.isDevelopment ? consoleFormat : customFormat,
    level: config.logLevel,
  }),
];

// Add file transport if specified
if (config.logFile) {
  transports.push(
    new winston.transports.File({
      filename: config.logFile,
      format: customFormat,
      level: config.logLevel,
    })
  );
}

// Create logger instance
export const logger = winston.createLogger({
  level: config.logLevel,
  format: customFormat,
  transports,
  exitOnError: false,
});

// Helper functions for structured logging
export const logAIRequest = (operation: string, metadata: any = {}) => {
  logger.info(`AI Operation: ${operation}`, {
    operation,
    ...metadata,
    category: 'ai-request'
  });
};

export const logAIResponse = (operation: string, duration: number, metadata: any = {}) => {
  logger.info(`AI Response: ${operation}`, {
    operation,
    duration,
    ...metadata,
    category: 'ai-response'
  });
};

export const logError = (operation: string, error: any, metadata: any = {}) => {
  logger.error(`Error in ${operation}`, {
    operation,
    error: error.message || error,
    stack: error.stack,
    ...metadata,
    category: 'error'
  });
};