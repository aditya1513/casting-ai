/**
 * Database Connection Pool Middleware
 * Advanced connection pooling with health checks, monitoring, and recovery
 */

import { Request, Response, NextFunction } from 'express';
import { Pool, PoolClient } from 'pg';
import { logger } from '../utils/logger';
import { config } from '../config/config';

export interface PoolConfig {
  min: number;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  acquireTimeoutMillis: number;
  reapIntervalMillis: number;
  createRetryIntervalMillis: number;
  createTimeoutMillis: number;
}

export interface PoolStats {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
  maxConnections: number;
  minConnections: number;
  activeConnections: number;
  healthyConnections: number;
  failedConnections: number;
  avgResponseTime: number;
  lastHealthCheck: Date;
}

/**
 * Enhanced Database Connection Pool Manager
 */
export class DatabaseConnectionPool {
  private pool: Pool;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private stats: PoolStats;
  private responseTimes: number[] = [];
  private readonly maxResponseTimeHistory = 100;
  private healthyConnections = 0;
  private failedConnections = 0;
  private closed = false;

  constructor(
    private poolConfig: PoolConfig = {
      min: config.isProduction ? 3 : 1, // Reduced minimum connections
      max: config.isProduction ? 15 : 5, // Reduced maximum connections
      idleTimeoutMillis: 20000, // Reduced idle timeout
      connectionTimeoutMillis: 3000, // Reduced connection timeout
      acquireTimeoutMillis: 8000, // Reduced acquire timeout
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 500, // Increased retry interval
      createTimeoutMillis: 8000, // Reduced create timeout
    }
  ) {
    this.initializePool();
    this.startHealthChecking();
  }

  /**
   * Initialize the connection pool with enhanced configuration
   */
  private initializePool(): void {
    this.pool = new Pool({
      connectionString: config.database.url,
      min: this.poolConfig.min,
      max: this.poolConfig.max,
      idleTimeoutMillis: this.poolConfig.idleTimeoutMillis,
      connectionTimeoutMillis: this.poolConfig.connectionTimeoutMillis,
      acquireTimeoutMillis: this.poolConfig.acquireTimeoutMillis,
      reapIntervalMillis: this.poolConfig.reapIntervalMillis,
      createRetryIntervalMillis: this.poolConfig.createRetryIntervalMillis,
      createTimeoutMillis: this.poolConfig.createTimeoutMillis,
      
      // Additional PostgreSQL-specific configurations
      statement_timeout: 20000, // Reduced statement timeout
      query_timeout: 20000, // Reduced query timeout
      application_name: 'castmatch-backend',
      // Enable automatic memory cleanup
      allowExitOnIdle: true,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      
      // SSL configuration for production
      ssl: config.isProduction ? {
        rejectUnauthorized: false // Adjust based on your SSL setup
      } : false,
    });

    // Event listeners for pool monitoring
    this.pool.on('connect', (client: PoolClient) => {
      this.healthyConnections++;
      logger.debug(`Database client connected. Total: ${this.pool.totalCount}`);
    });

    this.pool.on('remove', (client: PoolClient) => {
      this.healthyConnections = Math.max(0, this.healthyConnections - 1);
      logger.debug(`Database client removed. Total: ${this.pool.totalCount}`);
    });

    this.pool.on('error', (err: Error, client: PoolClient) => {
      this.failedConnections++;
      logger.error('Database pool error:', {
        error: err.message,
        stack: err.stack,
        totalConnections: this.pool.totalCount,
        idleConnections: this.pool.idleCount,
        waitingCount: this.pool.waitingCount,
      });
    });

    this.pool.on('acquire', (client: PoolClient) => {
      logger.debug('Database client acquired from pool');
    });

    this.pool.on('release', (client: PoolClient) => {
      logger.debug('Database client released back to pool');
    });

    logger.info('✅ Enhanced database connection pool initialized', {
      minConnections: this.poolConfig.min,
      maxConnections: this.poolConfig.max,
      environment: config.env,
    });
  }

  /**
   * Start periodic health checking
   */
  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 30000); // Health check every 30 seconds
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const client = await this.pool.connect();
      
      // Test basic connectivity
      await client.query('SELECT 1 as health_check');
      
      // Test more complex query to ensure DB is responsive
      await client.query('SELECT NOW() as current_time');
      
      client.release();
      
      const responseTime = Date.now() - startTime;
      this.addResponseTime(responseTime);
      
      this.updateStats();
      
      if (responseTime > 1000) {
        logger.warn(`Database health check slow: ${responseTime}ms`);
      }
      
      logger.debug('Database health check passed', {
        responseTime: `${responseTime}ms`,
        activeConnections: this.pool.totalCount - this.pool.idleCount,
        idleConnections: this.pool.idleCount,
        waitingClients: this.pool.waitingCount,
      });
      
      return true;
    } catch (error) {
      this.failedConnections++;
      logger.error('Database health check failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        totalConnections: this.pool.totalCount,
        idleConnections: this.pool.idleCount,
        waitingCount: this.pool.waitingCount,
      });
      return false;
    }
  }

  /**
   * Add response time to moving average calculation
   */
  private addResponseTime(responseTime: number): void {
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > this.maxResponseTimeHistory) {
      this.responseTimes.shift();
    }
  }

  /**
   * Calculate average response time
   */
  private getAverageResponseTime(): number {
    if (this.responseTimes.length === 0) return 0;
    return this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
  }

  /**
   * Update pool statistics
   */
  private updateStats(): void {
    this.stats = {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      maxConnections: this.poolConfig.max,
      minConnections: this.poolConfig.min,
      activeConnections: this.pool.totalCount - this.pool.idleCount,
      healthyConnections: this.healthyConnections,
      failedConnections: this.failedConnections,
      avgResponseTime: this.getAverageResponseTime(),
      lastHealthCheck: new Date(),
    };
  }

  /**
   * Get current pool statistics
   */
  public getStats(): PoolStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Get pool instance for direct access
   */
  public getPool(): Pool {
    return this.pool;
  }

  /**
   * Execute query with performance tracking
   */
  public async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const startTime = Date.now();
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(text, params);
      const responseTime = Date.now() - startTime;
      this.addResponseTime(responseTime);
      
      if (responseTime > 500) {
        logger.warn('Slow database query detected', {
          query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
          responseTime: `${responseTime}ms`,
        });
      }
      
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Execute transaction with automatic rollback on error
   */
  public async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Database transaction failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Gracefully close the connection pool
   */
  public async close(): Promise<void> {
    if (this.closed) {
      logger.info('Database connection pool already closed');
      return;
    }

    this.closed = true;

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    try {
      await this.pool.end();
      logger.info('Database connection pool closed gracefully');
    } catch (error) {
      logger.error('Error closing database pool:', error);
      // Don't throw error on close failure to prevent cascade failures
    }
  }

  /**
   * Force pool recreation in case of critical failures
   */
  public async recreatePool(): Promise<void> {
    logger.warn('Recreating database connection pool due to critical failure');
    
    try {
      await this.pool.end();
    } catch (error) {
      logger.error('Error closing old pool during recreation:', error);
    }

    this.healthyConnections = 0;
    this.failedConnections = 0;
    this.responseTimes = [];
    
    this.initializePool();
    
    // Wait for pool to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Perform immediate health check
    await this.performHealthCheck();
    
    logger.info('Database connection pool recreated successfully');
  }
}

// Global pool instance
export const dbPool = new DatabaseConnectionPool();

/**
 * Express middleware for database connection pool monitoring
 */
export const connectionPoolMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Add pool stats to response headers for monitoring
  const stats = dbPool.getStats();
  
  res.setHeader('X-DB-Pool-Total', stats.totalCount.toString());
  res.setHeader('X-DB-Pool-Active', stats.activeConnections.toString());
  res.setHeader('X-DB-Pool-Idle', stats.idleCount.toString());
  res.setHeader('X-DB-Pool-Waiting', stats.waitingCount.toString());
  res.setHeader('X-DB-Pool-Avg-Response', Math.round(stats.avgResponseTime).toString());

  // Log warning if pool is under stress
  if (stats.activeConnections > stats.maxConnections * 0.8) {
    logger.warn('Database connection pool under high load', {
      activeConnections: stats.activeConnections,
      maxConnections: stats.maxConnections,
      utilizationPercent: Math.round((stats.activeConnections / stats.maxConnections) * 100),
    });
  }

  // Add pool stats to request for use in controllers
  (req as any).dbPoolStats = stats;

  next();
};

/**
 * Health check endpoint handler for database pool
 */
export const poolHealthHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const stats = dbPool.getStats();
    const isHealthy = stats.activeConnections < stats.maxConnections * 0.9;
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'degraded',
      pool: {
        ...stats,
        utilizationPercent: Math.round((stats.activeConnections / stats.maxConnections) * 100),
        healthStatus: isHealthy ? 'good' : 'stressed',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Pool health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Failed to get pool statistics',
      timestamp: new Date().toISOString(),
    });
  }
};

export default dbPool;