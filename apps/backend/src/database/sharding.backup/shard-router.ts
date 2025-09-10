/**
 * Shard Router with Connection Pooling
 * Manages database connections across shards with automatic load balancing
 */

import { Pool, PoolConfig, QueryResult } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { logger } from '../../utils/logger';
import * as schema from '../../models/schema';
import {
  ShardConfig,
  DatabaseNode,
  PRODUCTION_SHARDING_CONFIG,
  getShardForKey,
  selectReadNode,
  ShardKeyStrategies
} from './sharding.config';

/**
 * Connection pool manager for each database node
 */
class ConnectionPoolManager {
  private pools: Map<string, Pool> = new Map();
  private drizzleInstances: Map<string, NodePgDatabase<typeof schema>> = new Map();
  private connectionStats: Map<string, ConnectionStats> = new Map();

  /**
   * Get or create a connection pool for a database node
   */
  getPool(node: DatabaseNode): Pool {
    const poolKey = `${node.id}`;
    
    if (!this.pools.has(poolKey)) {
      const poolConfig: PoolConfig = {
        host: node.host,
        port: node.port,
        database: node.database,
        user: node.username,
        password: node.password,
        ssl: node.ssl ? { rejectUnauthorized: false } : false,
        max: node.maxConnections,
        min: Math.floor(node.maxConnections * 0.2),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        statement_timeout: 30000,
        query_timeout: 30000,
        application_name: `castmatch-${node.id}`
      };

      const pool = new Pool(poolConfig);
      
      // Set up event handlers
      pool.on('error', (err) => {
        logger.error(`Pool error for ${node.id}:`, err);
        this.handlePoolError(node, err);
      });

      pool.on('connect', (client) => {
        this.updateConnectionStats(poolKey, 'connect');
      });

      pool.on('acquire', (client) => {
        this.updateConnectionStats(poolKey, 'acquire');
      });

      pool.on('release', () => {
        this.updateConnectionStats(poolKey, 'release');
      });

      this.pools.set(poolKey, pool);
      
      // Initialize connection stats
      this.connectionStats.set(poolKey, {
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
        waitingRequests: 0,
        totalQueries: 0,
        failedQueries: 0,
        avgQueryTime: 0,
        lastError: null,
        lastErrorTime: null
      });

      logger.info(`Created connection pool for ${node.id} (${node.role})`);
    }

    return this.pools.get(poolKey)!;
  }

  /**
   * Get Drizzle ORM instance for a node
   */
  getDrizzle(node: DatabaseNode): NodePgDatabase<typeof schema> {
    const drizzleKey = `${node.id}`;
    
    if (!this.drizzleInstances.has(drizzleKey)) {
      const pool = this.getPool(node);
      const db = drizzle(pool, { schema });
      this.drizzleInstances.set(drizzleKey, db);
    }

    return this.drizzleInstances.get(drizzleKey)!;
  }

  /**
   * Update connection statistics
   */
  private updateConnectionStats(poolKey: string, event: string) {
    const stats = this.connectionStats.get(poolKey);
    if (!stats) return;

    const pool = this.pools.get(poolKey);
    if (!pool) return;

    stats.totalConnections = pool.totalCount;
    stats.activeConnections = pool.totalCount - pool.idleCount;
    stats.idleConnections = pool.idleCount;
    stats.waitingRequests = pool.waitingCount;
  }

  /**
   * Handle pool errors
   */
  private handlePoolError(node: DatabaseNode, error: Error) {
    const stats = this.connectionStats.get(node.id);
    if (stats) {
      stats.lastError = error.message;
      stats.lastErrorTime = new Date();
    }

    // Mark node as unhealthy if too many errors
    node.isHealthy = false;
    node.lastHealthCheck = new Date();
  }

  /**
   * Get connection statistics
   */
  getStats(nodeId: string): ConnectionStats | undefined {
    return this.connectionStats.get(nodeId);
  }

  /**
   * Close all connections
   */
  async closeAll(): Promise<void> {
    const promises: Promise<void>[] = [];
    
    for (const [key, pool] of this.pools) {
      promises.push(pool.end().then(() => {
        logger.info(`Closed pool ${key}`);
      }));
    }

    await Promise.all(promises);
    this.pools.clear();
    this.drizzleInstances.clear();
    this.connectionStats.clear();
  }
}

/**
 * Shard router for query execution
 */
export class ShardRouter {
  private poolManager: ConnectionPoolManager;
  private queryCache: Map<string, CachedQuery> = new Map();
  private healthChecker: NodeHealthChecker;

  constructor() {
    this.poolManager = new ConnectionPoolManager();
    this.healthChecker = new NodeHealthChecker(this.poolManager);
    
    // Start health checking
    this.healthChecker.startHealthChecks();
  }

  /**
   * Execute a query on the appropriate shard
   */
  async executeQuery<T = any>(
    shardKey: string | number,
    query: string,
    params: any[] = [],
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();
    const shard = getShardForKey(shardKey);
    
    if (!shard) {
      throw new Error(`No shard found for key: ${shardKey}`);
    }

    const node = options.readOnly 
      ? selectReadNode(shard, PRODUCTION_SHARDING_CONFIG.readPreference)
      : shard.primary;

    if (!node || !node.isHealthy) {
      throw new Error(`No healthy node available for shard: ${shard.id}`);
    }

    const pool = this.poolManager.getPool(node);
    
    try {
      // Check query cache
      if (options.useCache) {
        const cached = this.getCachedQuery(query, params);
        if (cached) {
          return cached.result as QueryResult<T>;
        }
      }

      // Execute query with retry logic
      const result = await this.executeWithRetry(
        () => pool.query<T>(query, params),
        options.maxRetries || 3,
        options.retryDelay || 1000
      );

      // Update metrics
      const queryTime = Date.now() - startTime;
      this.updateQueryMetrics(node.id, queryTime, true);

      // Cache result if enabled
      if (options.useCache && options.cacheTTL) {
        this.cacheQuery(query, params, result, options.cacheTTL);
      }

      return result;
    } catch (error) {
      const queryTime = Date.now() - startTime;
      this.updateQueryMetrics(node.id, queryTime, false);
      
      logger.error(`Query failed on node ${node.id}:`, error);
      
      // Try fallback node if available
      if (options.allowFallback && !options.readOnly) {
        return this.executeFallbackQuery<T>(shard, query, params, options);
      }
      
      throw error;
    }
  }

  /**
   * Execute a transaction across shards
   */
  async executeTransaction<T = any>(
    operations: TransactionOperation[]
  ): Promise<T[]> {
    const clients: Map<string, any> = new Map();
    const results: T[] = [];

    try {
      // Acquire clients for all involved shards
      for (const op of operations) {
        const shard = getShardForKey(op.shardKey);
        if (!shard) {
          throw new Error(`No shard found for key: ${op.shardKey}`);
        }

        if (!clients.has(shard.id)) {
          const pool = this.poolManager.getPool(shard.primary);
          const client = await pool.connect();
          await client.query('BEGIN');
          clients.set(shard.id, client);
        }
      }

      // Execute operations
      for (const op of operations) {
        const shard = getShardForKey(op.shardKey)!;
        const client = clients.get(shard.id)!;
        const result = await client.query(op.query, op.params);
        results.push(result.rows as T);
      }

      // Commit all transactions
      for (const client of clients.values()) {
        await client.query('COMMIT');
      }

      return results;
    } catch (error) {
      // Rollback all transactions
      for (const client of clients.values()) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          logger.error('Rollback failed:', rollbackError);
        }
      }
      throw error;
    } finally {
      // Release all clients
      for (const client of clients.values()) {
        client.release();
      }
    }
  }

  /**
   * Execute parallel queries across multiple shards
   */
  async executeParallelQueries<T = any>(
    queries: ParallelQuery[]
  ): Promise<Map<string, QueryResult<T>>> {
    const promises: Promise<[string, QueryResult<T>]>[] = queries.map(async (q) => {
      const result = await this.executeQuery<T>(
        q.shardKey,
        q.query,
        q.params,
        q.options
      );
      return [q.id, result];
    });

    const results = await Promise.all(promises);
    return new Map(results);
  }

  /**
   * Get Drizzle ORM instance for a shard
   */
  getDrizzleForShard(shardKey: string | number, readOnly: boolean = false): NodePgDatabase<typeof schema> {
    const shard = getShardForKey(shardKey);
    
    if (!shard) {
      throw new Error(`No shard found for key: ${shardKey}`);
    }

    const node = readOnly 
      ? selectReadNode(shard, PRODUCTION_SHARDING_CONFIG.readPreference)
      : shard.primary;

    if (!node || !node.isHealthy) {
      throw new Error(`No healthy node available for shard: ${shard.id}`);
    }

    return this.poolManager.getDrizzle(node);
  }

  /**
   * Execute query with retry logic
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number,
    retryDelay: number
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (i < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, i)));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Execute fallback query on replica
   */
  private async executeFallbackQuery<T>(
    shard: ShardConfig,
    query: string,
    params: any[],
    options: QueryOptions
  ): Promise<QueryResult<T>> {
    const replicas = shard.replicas.filter(r => r.isHealthy);
    
    for (const replica of replicas) {
      try {
        const pool = this.poolManager.getPool(replica);
        return await pool.query<T>(query, params);
      } catch (error) {
        logger.error(`Fallback query failed on replica ${replica.id}:`, error);
      }
    }
    
    throw new Error(`All fallback nodes failed for shard: ${shard.id}`);
  }

  /**
   * Cache query result
   */
  private cacheQuery(query: string, params: any[], result: any, ttl: number) {
    const key = this.getCacheKey(query, params);
    this.queryCache.set(key, {
      result,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Get cached query result
   */
  private getCachedQuery(query: string, params: any[]): CachedQuery | null {
    const key = this.getCacheKey(query, params);
    const cached = this.queryCache.get(key);
    
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached;
    }
    
    this.queryCache.delete(key);
    return null;
  }

  /**
   * Generate cache key for query
   */
  private getCacheKey(query: string, params: any[]): string {
    return `${query}:${JSON.stringify(params)}`;
  }

  /**
   * Update query metrics
   */
  private updateQueryMetrics(nodeId: string, queryTime: number, success: boolean) {
    const stats = this.poolManager.getStats(nodeId);
    if (!stats) return;

    stats.totalQueries++;
    if (!success) {
      stats.failedQueries++;
    }

    // Update average query time
    stats.avgQueryTime = (stats.avgQueryTime * (stats.totalQueries - 1) + queryTime) / stats.totalQueries;
  }

  /**
   * Get router statistics
   */
  getStatistics(): RouterStatistics {
    const shardStats: ShardStatistics[] = [];
    
    for (const shard of PRODUCTION_SHARDING_CONFIG.shards) {
      const primaryStats = this.poolManager.getStats(shard.primary.id);
      const replicaStats = shard.replicas.map(r => this.poolManager.getStats(r.id));
      
      shardStats.push({
        shardId: shard.id,
        region: shard.region,
        primaryHealth: shard.primary.isHealthy,
        replicaHealth: shard.replicas.map(r => ({ id: r.id, healthy: r.isHealthy })),
        connectionStats: {
          primary: primaryStats,
          replicas: replicaStats.filter(s => s !== undefined) as ConnectionStats[]
        }
      });
    }

    return {
      shards: shardStats,
      cacheSize: this.queryCache.size,
      timestamp: new Date()
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.healthChecker.stopHealthChecks();
    await this.poolManager.closeAll();
    this.queryCache.clear();
  }
}

/**
 * Node health checker
 */
class NodeHealthChecker {
  private intervalId: NodeJS.Timeout | null = null;
  private poolManager: ConnectionPoolManager;

  constructor(poolManager: ConnectionPoolManager) {
    this.poolManager = poolManager;
  }

  startHealthChecks() {
    const interval = PRODUCTION_SHARDING_CONFIG.monitoring.healthCheckInterval;
    
    this.intervalId = setInterval(async () => {
      await this.checkAllNodes();
    }, interval);

    // Initial check
    this.checkAllNodes();
  }

  stopHealthChecks() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async checkAllNodes() {
    const promises: Promise<void>[] = [];
    
    for (const shard of PRODUCTION_SHARDING_CONFIG.shards) {
      promises.push(this.checkNode(shard.primary));
      
      for (const replica of shard.replicas) {
        promises.push(this.checkNode(replica));
      }
    }

    await Promise.all(promises);
  }

  private async checkNode(node: DatabaseNode): Promise<void> {
    const startTime = Date.now();
    
    try {
      const pool = this.poolManager.getPool(node);
      await pool.query('SELECT 1');
      
      node.isHealthy = true;
      node.latency = Date.now() - startTime;
      node.lastHealthCheck = new Date();
      
      // Check replication lag for replicas
      if (node.role === 'REPLICA') {
        const lagResult = await pool.query(`
          SELECT EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp())) AS replication_lag
        `);
        node.replicationLag = lagResult.rows[0]?.replication_lag || 0;
      }
    } catch (error) {
      logger.error(`Health check failed for ${node.id}:`, error);
      node.isHealthy = false;
      node.lastHealthCheck = new Date();
    }
  }
}

// Type definitions
interface ConnectionStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  totalQueries: number;
  failedQueries: number;
  avgQueryTime: number;
  lastError: string | null;
  lastErrorTime: Date | null;
}

interface QueryOptions {
  readOnly?: boolean;
  useCache?: boolean;
  cacheTTL?: number;
  maxRetries?: number;
  retryDelay?: number;
  allowFallback?: boolean;
  timeout?: number;
}

interface TransactionOperation {
  shardKey: string | number;
  query: string;
  params: any[];
}

interface ParallelQuery {
  id: string;
  shardKey: string | number;
  query: string;
  params: any[];
  options?: QueryOptions;
}

interface CachedQuery {
  result: any;
  timestamp: number;
  ttl: number;
}

interface ShardStatistics {
  shardId: string;
  region: string;
  primaryHealth: boolean;
  replicaHealth: { id: string; healthy: boolean }[];
  connectionStats: {
    primary?: ConnectionStats;
    replicas: ConnectionStats[];
  };
}

interface RouterStatistics {
  shards: ShardStatistics[];
  cacheSize: number;
  timestamp: Date;
}

// Export singleton instance
export const shardRouter = new ShardRouter();

export default ShardRouter;