/**
 * Read Replica Management System
 * Manages read replicas across availability zones with load balancing
 */

import { Pool } from 'pg';
import { logger } from '../../utils/logger';
import {
  DatabaseNode,
  ShardConfig,
  PRODUCTION_SHARDING_CONFIG,
  getHealthyReplicas
} from './sharding.config';

/**
 * Load balancing strategies for read replicas
 */
export enum LoadBalancingStrategy {
  ROUND_ROBIN = 'ROUND_ROBIN',
  LEAST_CONNECTIONS = 'LEAST_CONNECTIONS',
  WEIGHTED = 'WEIGHTED',
  LATENCY_BASED = 'LATENCY_BASED',
  RANDOM = 'RANDOM'
}

/**
 * Replica health status
 */
interface ReplicaHealth {
  nodeId: string;
  isHealthy: boolean;
  latency: number;
  replicationLag: number;
  connectionCount: number;
  lastCheck: Date;
  consecutiveFailures: number;
}

/**
 * Read replica manager for a shard
 */
export class ReplicaManager {
  private shard: ShardConfig;
  private strategy: LoadBalancingStrategy;
  private replicaHealth: Map<string, ReplicaHealth> = new Map();
  private roundRobinIndex: number = 0;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private replicaPools: Map<string, Pool> = new Map();

  constructor(shard: ShardConfig, strategy: LoadBalancingStrategy = LoadBalancingStrategy.LATENCY_BASED) {
    this.shard = shard;
    this.strategy = strategy;
    this.initializeHealthTracking();
  }

  /**
   * Initialize health tracking for all replicas
   */
  private initializeHealthTracking() {
    // Initialize primary
    this.replicaHealth.set(this.shard.primary.id, {
      nodeId: this.shard.primary.id,
      isHealthy: true,
      latency: 0,
      replicationLag: 0,
      connectionCount: 0,
      lastCheck: new Date(),
      consecutiveFailures: 0
    });

    // Initialize replicas
    for (const replica of this.shard.replicas) {
      this.replicaHealth.set(replica.id, {
        nodeId: replica.id,
        isHealthy: true,
        latency: 0,
        replicationLag: 0,
        connectionCount: 0,
        lastCheck: new Date(),
        consecutiveFailures: 0
      });
    }
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring(intervalMs: number = 5000) {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, intervalMs);

    // Initial health check
    this.performHealthChecks();
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Perform health checks on all replicas
   */
  private async performHealthChecks() {
    const promises: Promise<void>[] = [];

    // Check all replicas
    for (const replica of this.shard.replicas) {
      promises.push(this.checkReplicaHealth(replica));
    }

    // Also check primary for read operations
    promises.push(this.checkReplicaHealth(this.shard.primary));

    await Promise.all(promises);
  }

  /**
   * Check health of a specific replica
   */
  private async checkReplicaHealth(node: DatabaseNode): Promise<void> {
    const health = this.replicaHealth.get(node.id);
    if (!health) return;

    const startTime = Date.now();

    try {
      const pool = this.getOrCreatePool(node);
      
      // Basic connectivity check
      const result = await pool.query('SELECT 1');
      
      // Check replication lag for replicas
      if (node.role === 'REPLICA') {
        const lagResult = await pool.query(`
          SELECT 
            EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp())) AS replication_lag,
            pg_is_in_recovery() AS is_replica,
            pg_last_xact_replay_timestamp() AS last_replay_time
        `);
        
        health.replicationLag = lagResult.rows[0]?.replication_lag || 0;
      }

      // Update health metrics
      health.latency = Date.now() - startTime;
      health.isHealthy = true;
      health.consecutiveFailures = 0;
      health.lastCheck = new Date();
      health.connectionCount = pool.totalCount - pool.idleCount;

      // Update node status
      node.isHealthy = true;
      node.latency = health.latency;
      node.replicationLag = health.replicationLag;

    } catch (error) {
      logger.error(`Health check failed for replica ${node.id}:`, error);
      
      health.consecutiveFailures++;
      health.lastCheck = new Date();
      
      // Mark as unhealthy after 3 consecutive failures
      if (health.consecutiveFailures >= 3) {
        health.isHealthy = false;
        node.isHealthy = false;
        
        // Alert if primary is down
        if (node.role === 'PRIMARY') {
          this.handlePrimaryFailure();
        }
      }
    }
  }

  /**
   * Get or create connection pool for a node
   */
  private getOrCreatePool(node: DatabaseNode): Pool {
    if (!this.replicaPools.has(node.id)) {
      const pool = new Pool({
        host: node.host,
        port: node.port,
        database: node.database,
        user: node.username,
        password: node.password,
        ssl: node.ssl ? { rejectUnauthorized: false } : false,
        max: node.maxConnections,
        min: Math.floor(node.maxConnections * 0.2),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
      });

      this.replicaPools.set(node.id, pool);
    }

    return this.replicaPools.get(node.id)!;
  }

  /**
   * Select optimal read replica based on strategy
   */
  selectReadReplica(includesPrimary: boolean = false): DatabaseNode | null {
    const availableNodes = this.getAvailableReadNodes(includesPrimary);
    
    if (availableNodes.length === 0) {
      logger.error(`No healthy read replicas available for shard ${this.shard.id}`);
      return null;
    }

    switch (this.strategy) {
      case LoadBalancingStrategy.ROUND_ROBIN:
        return this.selectRoundRobin(availableNodes);
      
      case LoadBalancingStrategy.LEAST_CONNECTIONS:
        return this.selectLeastConnections(availableNodes);
      
      case LoadBalancingStrategy.WEIGHTED:
        return this.selectWeighted(availableNodes);
      
      case LoadBalancingStrategy.LATENCY_BASED:
        return this.selectLowestLatency(availableNodes);
      
      case LoadBalancingStrategy.RANDOM:
        return this.selectRandom(availableNodes);
      
      default:
        return availableNodes[0];
    }
  }

  /**
   * Get available read nodes
   */
  private getAvailableReadNodes(includesPrimary: boolean): DatabaseNode[] {
    const nodes: DatabaseNode[] = [];

    // Add healthy replicas
    for (const replica of this.shard.replicas) {
      const health = this.replicaHealth.get(replica.id);
      if (health?.isHealthy && health.replicationLag < 5) { // Max 5 seconds lag
        nodes.push(replica);
      }
    }

    // Optionally include primary
    if (includesPrimary) {
      const primaryHealth = this.replicaHealth.get(this.shard.primary.id);
      if (primaryHealth?.isHealthy) {
        nodes.push(this.shard.primary);
      }
    }

    return nodes;
  }

  /**
   * Round-robin selection
   */
  private selectRoundRobin(nodes: DatabaseNode[]): DatabaseNode {
    const selected = nodes[this.roundRobinIndex % nodes.length];
    this.roundRobinIndex++;
    return selected;
  }

  /**
   * Select node with least connections
   */
  private selectLeastConnections(nodes: DatabaseNode[]): DatabaseNode {
    let minConnections = Infinity;
    let selected = nodes[0];

    for (const node of nodes) {
      const health = this.replicaHealth.get(node.id);
      if (health && health.connectionCount < minConnections) {
        minConnections = health.connectionCount;
        selected = node;
      }
    }

    return selected;
  }

  /**
   * Select based on node weights/priority
   */
  private selectWeighted(nodes: DatabaseNode[]): DatabaseNode {
    const weightedNodes: { node: DatabaseNode; weight: number }[] = nodes.map(node => ({
      node,
      weight: node.priority
    }));

    // Calculate total weight
    const totalWeight = weightedNodes.reduce((sum, wn) => sum + wn.weight, 0);
    
    // Random selection based on weight
    let random = Math.random() * totalWeight;
    
    for (const wn of weightedNodes) {
      random -= wn.weight;
      if (random <= 0) {
        return wn.node;
      }
    }

    return nodes[0];
  }

  /**
   * Select node with lowest latency
   */
  private selectLowestLatency(nodes: DatabaseNode[]): DatabaseNode {
    let minLatency = Infinity;
    let selected = nodes[0];

    for (const node of nodes) {
      const health = this.replicaHealth.get(node.id);
      if (health && health.latency < minLatency) {
        minLatency = health.latency;
        selected = node;
      }
    }

    return selected;
  }

  /**
   * Random selection
   */
  private selectRandom(nodes: DatabaseNode[]): DatabaseNode {
    return nodes[Math.floor(Math.random() * nodes.length)];
  }

  /**
   * Handle primary failure
   */
  private handlePrimaryFailure() {
    logger.critical(`PRIMARY NODE FAILURE DETECTED for shard ${this.shard.id}`);
    
    // Trigger failover process
    this.initiateFailover();
  }

  /**
   * Initiate failover to best replica
   */
  private async initiateFailover() {
    // Find best candidate replica
    const candidate = this.selectFailoverCandidate();
    
    if (!candidate) {
      logger.error(`No suitable failover candidate found for shard ${this.shard.id}`);
      return;
    }

    logger.info(`Initiating failover to replica ${candidate.id}`);

    try {
      // Promote replica to primary (AWS RDS specific)
      await this.promoteReplica(candidate);
      
      // Update configuration
      this.shard.primary = candidate;
      candidate.role = 'PRIMARY';
      
      // Notify monitoring system
      this.notifyFailover(candidate);
      
    } catch (error) {
      logger.error(`Failover failed for shard ${this.shard.id}:`, error);
    }
  }

  /**
   * Select best replica for failover
   */
  private selectFailoverCandidate(): DatabaseNode | null {
    const healthyReplicas = this.shard.replicas.filter(r => {
      const health = this.replicaHealth.get(r.id);
      return health?.isHealthy && health.replicationLag < 1; // Max 1 second lag
    });

    if (healthyReplicas.length === 0) {
      return null;
    }

    // Sort by priority and latency
    return healthyReplicas.sort((a, b) => {
      const healthA = this.replicaHealth.get(a.id)!;
      const healthB = this.replicaHealth.get(b.id)!;
      
      // First by priority
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      
      // Then by latency
      return healthA.latency - healthB.latency;
    })[0];
  }

  /**
   * Promote replica to primary (platform-specific implementation)
   */
  private async promoteReplica(replica: DatabaseNode): Promise<void> {
    // This would be platform-specific (AWS RDS, GCP Cloud SQL, etc.)
    // For AWS RDS:
    // await rds.promoteReadReplica({ DBInstanceIdentifier: replica.id }).promise();
    
    logger.info(`Promoting replica ${replica.id} to primary`);
    
    // For now, just update the configuration
    replica.role = 'PRIMARY';
  }

  /**
   * Notify monitoring system about failover
   */
  private notifyFailover(newPrimary: DatabaseNode) {
    const notification = {
      event: 'DATABASE_FAILOVER',
      shard: this.shard.id,
      oldPrimary: this.shard.primary.id,
      newPrimary: newPrimary.id,
      timestamp: new Date(),
      region: this.shard.region
    };

    logger.critical('DATABASE FAILOVER COMPLETED', notification);
    
    // Send notifications (implement based on your notification system)
    // await sendSlackNotification(notification);
    // await sendEmailAlert(notification);
    // await triggerPagerDuty(notification);
  }

  /**
   * Get replica statistics
   */
  getStatistics(): ReplicaStatistics {
    const stats: ReplicaNodeStats[] = [];

    for (const [nodeId, health] of this.replicaHealth) {
      const node = nodeId === this.shard.primary.id 
        ? this.shard.primary 
        : this.shard.replicas.find(r => r.id === nodeId);

      if (node) {
        stats.push({
          nodeId,
          role: node.role,
          region: node.region,
          availabilityZone: node.availabilityZone,
          isHealthy: health.isHealthy,
          latency: health.latency,
          replicationLag: health.replicationLag,
          connectionCount: health.connectionCount,
          consecutiveFailures: health.consecutiveFailures,
          lastCheck: health.lastCheck
        });
      }
    }

    return {
      shardId: this.shard.id,
      strategy: this.strategy,
      nodes: stats,
      healthyReplicaCount: stats.filter(s => s.role === 'REPLICA' && s.isHealthy).length,
      totalReplicaCount: this.shard.replicas.length,
      primaryHealthy: this.replicaHealth.get(this.shard.primary.id)?.isHealthy || false
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.stopHealthMonitoring();
    
    // Close all pools
    for (const pool of this.replicaPools.values()) {
      await pool.end();
    }
    
    this.replicaPools.clear();
    this.replicaHealth.clear();
  }
}

/**
 * Global replica manager for all shards
 */
export class GlobalReplicaManager {
  private managers: Map<string, ReplicaManager> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeManagers();
  }

  /**
   * Initialize replica managers for all shards
   */
  private initializeManagers() {
    for (const shard of PRODUCTION_SHARDING_CONFIG.shards) {
      const manager = new ReplicaManager(shard, LoadBalancingStrategy.LATENCY_BASED);
      this.managers.set(shard.id, manager);
      manager.startHealthMonitoring();
    }
  }

  /**
   * Get replica manager for a shard
   */
  getManager(shardId: string): ReplicaManager | undefined {
    return this.managers.get(shardId);
  }

  /**
   * Select read replica for a shard key
   */
  selectReadReplicaForKey(shardKey: string | number): DatabaseNode | null {
    const shard = PRODUCTION_SHARDING_CONFIG.shards.find(s => {
      if (!s.keyRange) return false;
      const key = typeof shardKey === 'string' ? parseInt(shardKey) : shardKey;
      return key >= s.keyRange.start && key <= s.keyRange.end;
    });

    if (!shard) {
      return null;
    }

    const manager = this.managers.get(shard.id);
    return manager?.selectReadReplica(true) || null;
  }

  /**
   * Get global statistics
   */
  getGlobalStatistics(): GlobalReplicaStatistics {
    const shardStats: ReplicaStatistics[] = [];
    
    for (const manager of this.managers.values()) {
      shardStats.push(manager.getStatistics());
    }

    const totalHealthyReplicas = shardStats.reduce((sum, s) => sum + s.healthyReplicaCount, 0);
    const totalReplicas = shardStats.reduce((sum, s) => sum + s.totalReplicaCount, 0);
    const allPrimariesHealthy = shardStats.every(s => s.primaryHealthy);

    return {
      shards: shardStats,
      totalHealthyReplicas,
      totalReplicas,
      replicaHealthPercentage: (totalHealthyReplicas / totalReplicas) * 100,
      allPrimariesHealthy,
      timestamp: new Date()
    };
  }

  /**
   * Start global monitoring
   */
  startGlobalMonitoring(intervalMs: number = 30000) {
    this.monitoringInterval = setInterval(() => {
      const stats = this.getGlobalStatistics();
      
      // Log statistics
      logger.info('Global Replica Statistics', {
        healthyReplicas: `${stats.totalHealthyReplicas}/${stats.totalReplicas}`,
        healthPercentage: `${stats.replicaHealthPercentage.toFixed(2)}%`,
        primariesHealthy: stats.allPrimariesHealthy
      });

      // Check for alerts
      if (stats.replicaHealthPercentage < 50) {
        logger.error('CRITICAL: Less than 50% of replicas are healthy');
      }
      
      if (!stats.allPrimariesHealthy) {
        logger.critical('CRITICAL: One or more primary nodes are unhealthy');
      }
    }, intervalMs);
  }

  /**
   * Stop global monitoring
   */
  stopGlobalMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    this.stopGlobalMonitoring();
    
    const promises: Promise<void>[] = [];
    for (const manager of this.managers.values()) {
      promises.push(manager.cleanup());
    }
    
    await Promise.all(promises);
    this.managers.clear();
  }
}

// Type definitions
interface ReplicaNodeStats {
  nodeId: string;
  role: string;
  region: string;
  availabilityZone: string;
  isHealthy: boolean;
  latency: number;
  replicationLag: number;
  connectionCount: number;
  consecutiveFailures: number;
  lastCheck: Date;
}

interface ReplicaStatistics {
  shardId: string;
  strategy: LoadBalancingStrategy;
  nodes: ReplicaNodeStats[];
  healthyReplicaCount: number;
  totalReplicaCount: number;
  primaryHealthy: boolean;
}

interface GlobalReplicaStatistics {
  shards: ReplicaStatistics[];
  totalHealthyReplicas: number;
  totalReplicas: number;
  replicaHealthPercentage: number;
  allPrimariesHealthy: boolean;
  timestamp: Date;
}

// Export singleton instance
export const globalReplicaManager = new GlobalReplicaManager();

export default GlobalReplicaManager;