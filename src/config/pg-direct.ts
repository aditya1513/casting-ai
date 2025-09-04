/**
 * Direct PostgreSQL Connection
 * Workaround for Prisma P1010 error
 */

import { Pool } from 'pg';
import { config } from './config';

// Create PostgreSQL connection pool
export const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pgPool.on('connect', () => {
  console.log('Direct PostgreSQL connection established');
});

pgPool.on('error', (err) => {
  console.error('Direct PostgreSQL connection error:', err);
});

// Graceful shutdown
process.on('SIGINT', () => {
  pgPool.end(() => {
    console.log('Direct PostgreSQL pool closed');
    process.exit(0);
  });
});

export default pgPool;