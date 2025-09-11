/**
 * Database Configuration
 * Drizzle ORM setup with PostgreSQL
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { config } from './config';
import { logger } from '../utils/logger';
import * as schema from '../models/schema';

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.database.url,
  max: config.database.poolSize,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Handle pool errors
pool.on('error', (err) => {
  logger.error('Unexpected database pool error', err);
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    logger.error('Error acquiring database client', err.stack);
  } else {
    logger.info('✅ Database connection pool initialized');
    release();
  }
});

// Create Drizzle instance with schema
export const db = drizzle(pool, { schema });

// Database helper functions
export const databaseHelpers = {
  /**
   * Test database connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      logger.info('✅ Database connection test successful');
      return true;
    } catch (error) {
      logger.error('❌ Database connection test failed:', error);
      return false;
    }
  },

  /**
   * Get pool statistics
   */
  getPoolStats() {
    return {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    };
  },

  /**
   * Gracefully close database connections
   */
  async close(): Promise<void> {
    try {
      await pool.end();
      logger.info('Database connection pool closed');
    } catch (error) {
      logger.error('Error closing database pool:', error);
      throw error;
    }
  },

  /**
   * Execute raw SQL query (use with caution)
   */
  async executeRaw<T = any>(query: string, params?: any[]): Promise<T[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  },

  /**
   * Begin a transaction
   */
  async beginTransaction() {
    const client = await pool.connect();
    await client.query('BEGIN');
    return {
      client,
      async commit() {
        await client.query('COMMIT');
        client.release();
      },
      async rollback() {
        await client.query('ROLLBACK');
        client.release();
      },
    };
  },
};

// Export types
export type Database = typeof db;
export { schema };

// NO MORE PRISMA COMPATIBILITY - USING DRIZZLE ONLY

// Default export
export default db;