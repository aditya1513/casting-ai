/**
 * Database Configuration
 * Prisma client initialization with connection pooling
 */

import { PrismaClient } from '@prisma/client';
import { config } from './config';
import { logger } from '../utils/logger';

// Declare global type for Prisma client
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Initialize Prisma Client with appropriate configuration
 */
const createPrismaClient = () => {
  return new PrismaClient({
    log: config.isDevelopment
      ? ['query', 'info', 'warn', 'error']
      : ['error', 'warn'],
    errorFormat: config.isDevelopment ? 'pretty' : 'minimal',
  });
};

// Use singleton pattern in development to prevent multiple instances
export const prisma = global.prisma || createPrismaClient();

if (!config.isProduction) {
  global.prisma = prisma;
}

// Log database connection - commented out due to Prisma P1010 error
// Will connect on first query instead
// prisma.$connect()
//   .then(() => {
//     logger.info('✅ Database connected successfully');
//   })
//   .catch((error) => {
//     logger.error('❌ Database connection failed:', error);
//     process.exit(1);
//   });

// Middleware to log slow queries in production
if (config.isProduction) {
  prisma.$use(async (params, next) => {
    const before = Date.now();
    const result = await next(params);
    const after = Date.now();
    
    const duration = after - before;
    if (duration > 1000) { // Log queries taking more than 1 second
      logger.warn(`Slow query detected: ${params.model}.${params.action} took ${duration}ms`);
    }
    
    return result;
  });
}

// Export types
export type { User, Actor, CastingDirector, Project, Role, Application, Audition } from '@prisma/client';