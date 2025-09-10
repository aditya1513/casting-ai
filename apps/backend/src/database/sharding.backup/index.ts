/**
 * Database Sharding Module
 * Production-ready database sharding for CastMatch platform
 * Supports 1M+ users with horizontal scaling across Mumbai region
 */

// Export configuration
export {
  ShardingStrategy,
  ReplicationMode,
  ShardConfig,
  DatabaseNode,
  ShardingConfig,
  MonitoringConfig,
  PRODUCTION_SHARDING_CONFIG,
  ShardKeyStrategies,
  getShardForKey,
  getAllShards,
  getHealthyReplicas,
  selectReadNode
} from './sharding.config';

// Export shard router
export {
  ShardRouter,
  shardRouter
} from './shard-router';

// Export replica manager
export {
  LoadBalancingStrategy,
  ReplicaManager,
  GlobalReplicaManager,
  globalReplicaManager
} from './replica-manager';

// Export failover coordinator
export {
  FailoverState,
  FailoverEvent,
  FailoverCoordinator,
  failoverCoordinator
} from './failover-coordinator';

// Export monitoring service
export {
  AlertSeverity,
  AlertType,
  DatabaseMonitoringService,
  databaseMonitoring
} from './monitoring-service';

// Initialize production sharding system
import { shardRouter } from './shard-router';
import { globalReplicaManager } from './replica-manager';
import { failoverCoordinator } from './failover-coordinator';
import { databaseMonitoring } from './monitoring-service';
import { logger } from '../../utils/logger';

/**
 * Initialize the sharding system
 */
export async function initializeSharding(): Promise<void> {
  try {
    logger.info('Initializing database sharding system...');

    // Start replica monitoring
    globalReplicaManager.startGlobalMonitoring();
    logger.info('✓ Replica manager initialized');

    // Enable automatic failover
    failoverCoordinator.setEnabled(true);
    logger.info('✓ Failover coordinator initialized');

    // Start monitoring service
    databaseMonitoring.startMonitoring();
    logger.info('✓ Monitoring service initialized');

    logger.success('Database sharding system initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize sharding system:', error);
    throw error;
  }
}

/**
 * Shutdown the sharding system gracefully
 */
export async function shutdownSharding(): Promise<void> {
  try {
    logger.info('Shutting down database sharding system...');

    // Stop monitoring
    databaseMonitoring.stopMonitoring();
    
    // Stop failover coordinator
    failoverCoordinator.setEnabled(false);
    
    // Stop replica monitoring
    globalReplicaManager.stopGlobalMonitoring();
    
    // Cleanup connections
    await shardRouter.cleanup();
    await globalReplicaManager.cleanup();

    logger.info('Database sharding system shut down successfully');
  } catch (error) {
    logger.error('Error during sharding shutdown:', error);
    throw error;
  }
}

/**
 * Get sharding system status
 */
export function getShardingStatus(): ShardingSystemStatus {
  const routerStats = shardRouter.getStatistics();
  const replicaStats = globalReplicaManager.getGlobalStatistics();
  const failoverStats = failoverCoordinator.getStatistics();
  const dashboardData = databaseMonitoring.getDashboardData();

  return {
    initialized: true,
    shards: {
      total: routerStats.shards.length,
      healthy: routerStats.shards.filter(s => s.primaryHealth).length,
      degraded: routerStats.shards.filter(s => !s.primaryHealth).length
    },
    replicas: {
      total: replicaStats.totalReplicas,
      healthy: replicaStats.totalHealthyReplicas,
      unhealthy: replicaStats.totalReplicas - replicaStats.totalHealthyReplicas,
      healthPercentage: replicaStats.replicaHealthPercentage
    },
    failover: {
      enabled: failoverStats.isEnabled,
      active: failoverStats.activeFailovers,
      completed: failoverStats.completedFailovers,
      failed: failoverStats.failedFailovers,
      averageDuration: failoverStats.averageDuration
    },
    monitoring: {
      activeAlerts: dashboardData.alerts.total,
      criticalAlerts: dashboardData.alerts.critical,
      systemHealth: dashboardData.systemHealth
    },
    performance: {
      cacheSize: routerStats.cacheSize,
      avgReplicationLag: dashboardData.replication.maxLag
    }
  };
}

/**
 * Production database interface using sharding
 */
export class ShardedDatabase {
  /**
   * Execute a query on the appropriate shard
   */
  static async query<T = any>(
    userId: string,
    query: string,
    params: any[] = [],
    options: { readOnly?: boolean } = {}
  ): Promise<T[]> {
    const result = await shardRouter.executeQuery<T>(
      userId,
      query,
      params,
      { readOnly: options.readOnly }
    );
    return result.rows;
  }

  /**
   * Execute a transaction across shards
   */
  static async transaction<T = any>(
    operations: Array<{
      userId: string;
      query: string;
      params: any[];
    }>
  ): Promise<T[]> {
    const txOperations = operations.map(op => ({
      shardKey: op.userId,
      query: op.query,
      params: op.params
    }));

    return shardRouter.executeTransaction<T>(txOperations);
  }

  /**
   * Get Drizzle ORM instance for a user
   */
  static getDrizzle(userId: string, readOnly: boolean = false) {
    return shardRouter.getDrizzleForShard(userId, readOnly);
  }

  /**
   * Execute parallel queries across shards
   */
  static async parallelQuery<T = any>(
    queries: Array<{
      id: string;
      userId: string;
      query: string;
      params: any[];
    }>
  ): Promise<Map<string, T[]>> {
    const parallelQueries = queries.map(q => ({
      id: q.id,
      shardKey: q.userId,
      query: q.query,
      params: q.params
    }));

    const results = await shardRouter.executeParallelQueries<T>(parallelQueries);
    const formattedResults = new Map<string, T[]>();

    for (const [id, result] of results) {
      formattedResults.set(id, result.rows);
    }

    return formattedResults;
  }

  /**
   * Get statistics for monitoring
   */
  static getStatistics() {
    return {
      router: shardRouter.getStatistics(),
      replicas: globalReplicaManager.getGlobalStatistics(),
      failover: failoverCoordinator.getStatistics(),
      monitoring: databaseMonitoring.getDashboardData()
    };
  }
}

// Type definitions
interface ShardingSystemStatus {
  initialized: boolean;
  shards: {
    total: number;
    healthy: number;
    degraded: number;
  };
  replicas: {
    total: number;
    healthy: number;
    unhealthy: number;
    healthPercentage: number;
  };
  failover: {
    enabled: boolean;
    active: number;
    completed: number;
    failed: number;
    averageDuration: number;
  };
  monitoring: {
    activeAlerts: number;
    criticalAlerts: number;
    systemHealth: string;
  };
  performance: {
    cacheSize: number;
    avgReplicationLag: number;
  };
}

// Export main database interface
export default ShardedDatabase;