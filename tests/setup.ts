/**
 * Jest Test Setup
 * Global test configuration and setup
 */

import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Mock logger to reduce noise in tests
jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  LogContext: {
    apiRequest: jest.fn(),
    apiResponse: jest.fn(),
    dbQuery: jest.fn(),
    auth: jest.fn(),
    business: jest.fn(),
    error: jest.fn(),
  },
  httpLogStream: {
    write: jest.fn(),
  },
}));

// Increase timeout for database operations
jest.setTimeout(30000);

// Clean up after all tests
afterAll(async () => {
  // Close database connections
  const { prisma } = require('../src/config/database');
  await prisma.$disconnect();
  
  // Close Redis connection
  const { redis } = require('../src/config/redis');
  await redis.quit();
});