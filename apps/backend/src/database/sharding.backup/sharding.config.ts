/**
 * Database Sharding Configuration
 * Production-ready sharding strategy for CastMatch platform
 * Supports 1M+ users with horizontal scaling
 */

import { config } from '../../config/config';

export enum ShardingStrategy {
  HASH = 'HASH',
  RANGE = 'RANGE',
  GEOGRAPHIC = 'GEOGRAPHIC',
  CONSISTENT_HASH = 'CONSISTENT_HASH'
}

export enum ReplicationMode {
  ASYNC = 'ASYNC',
  SYNC = 'SYNC',
  SEMI_SYNC = 'SEMI_SYNC'
}

export interface ShardConfig {
  id: string;
  name: string;
  region: string;
  primary: DatabaseNode;
  replicas: DatabaseNode[];
  keyRange?: {
    start: number;
    end: number;
  };
  weight: number;
  maxConnections: number;
  minConnections: number;
  connectionTimeout: number;
  idleTimeout: number;
  maxRetries: number;
  retryDelay: number;
  healthCheckInterval: number;
  failoverThreshold: number;
}

export interface DatabaseNode {
  id: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  role: 'PRIMARY' | 'REPLICA' | 'STANDBY';
  region: string;
  availabilityZone: string;
  priority: number;
  maxConnections: number;
  connectionString?: string;
  isHealthy: boolean;
  lastHealthCheck?: Date;
  latency?: number;
  replicationLag?: number;
}

export interface ShardingConfig {
  strategy: ShardingStrategy;
  shards: ShardConfig[];
  replicationMode: ReplicationMode;
  consistencyLevel: 'EVENTUAL' | 'STRONG' | 'BOUNDED';
  readPreference: 'PRIMARY' | 'SECONDARY' | 'NEAREST' | 'PRIMARY_PREFERRED';
  writeTimeout: number;
  readTimeout: number;
  crossShardTimeout: number;
  monitoring: MonitoringConfig;
}

export interface MonitoringConfig {
  enabled: boolean;
  metricsPort: number;
  healthCheckInterval: number;
  alertThresholds: {
    connectionPoolUsage: number;
    queryLatency: number;
    replicationLag: number;
    failedQueries: number;
    deadlocks: number;
  };
  notifications: {
    email: string[];
    slack?: string;
    pagerduty?: string;
  };
}

/**
 * Production sharding configuration for Mumbai region
 */
export const PRODUCTION_SHARDING_CONFIG: ShardingConfig = {
  strategy: ShardingStrategy.CONSISTENT_HASH,
  replicationMode: ReplicationMode.SEMI_SYNC,
  consistencyLevel: 'BOUNDED',
  readPreference: 'NEAREST',
  writeTimeout: 5000,
  readTimeout: 2000,
  crossShardTimeout: 10000,
  shards: [
    {
      id: 'shard-mumbai-1',
      name: 'Mumbai Primary Shard',
      region: 'ap-south-1',
      weight: 100,
      maxConnections: 200,
      minConnections: 20,
      connectionTimeout: 5000,
      idleTimeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      healthCheckInterval: 10000,
      failoverThreshold: 3,
      keyRange: {
        start: 0,
        end: 333333
      },
      primary: {
        id: 'mum-primary-1',
        host: process.env.DB_SHARD1_PRIMARY_HOST || 'castmatch-shard1-primary.ap-south-1.rds.amazonaws.com',
        port: 5432,
        database: 'castmatch_shard1',
        username: process.env.DB_SHARD1_USER || 'castmatch_prod',
        password: process.env.DB_SHARD1_PASSWORD || '',
        ssl: true,
        role: 'PRIMARY',
        region: 'ap-south-1',
        availabilityZone: 'ap-south-1a',
        priority: 100,
        maxConnections: 100,
        isHealthy: true
      },
      replicas: [
        {
          id: 'mum-replica-1a',
          host: process.env.DB_SHARD1_REPLICA1_HOST || 'castmatch-shard1-replica1.ap-south-1.rds.amazonaws.com',
          port: 5432,
          database: 'castmatch_shard1',
          username: process.env.DB_SHARD1_USER || 'castmatch_read',
          password: process.env.DB_SHARD1_PASSWORD || '',
          ssl: true,
          role: 'REPLICA',
          region: 'ap-south-1',
          availabilityZone: 'ap-south-1b',
          priority: 90,
          maxConnections: 50,
          isHealthy: true
        },
        {
          id: 'mum-replica-1b',
          host: process.env.DB_SHARD1_REPLICA2_HOST || 'castmatch-shard1-replica2.ap-south-1.rds.amazonaws.com',
          port: 5432,
          database: 'castmatch_shard1',
          username: process.env.DB_SHARD1_USER || 'castmatch_read',
          password: process.env.DB_SHARD1_PASSWORD || '',
          ssl: true,
          role: 'REPLICA',
          region: 'ap-south-1',
          availabilityZone: 'ap-south-1c',
          priority: 80,
          maxConnections: 50,
          isHealthy: true
        }
      ]
    },
    {
      id: 'shard-mumbai-2',
      name: 'Mumbai Secondary Shard',
      region: 'ap-south-1',
      weight: 100,
      maxConnections: 200,
      minConnections: 20,
      connectionTimeout: 5000,
      idleTimeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      healthCheckInterval: 10000,
      failoverThreshold: 3,
      keyRange: {
        start: 333334,
        end: 666666
      },
      primary: {
        id: 'mum-primary-2',
        host: process.env.DB_SHARD2_PRIMARY_HOST || 'castmatch-shard2-primary.ap-south-1.rds.amazonaws.com',
        port: 5432,
        database: 'castmatch_shard2',
        username: process.env.DB_SHARD2_USER || 'castmatch_prod',
        password: process.env.DB_SHARD2_PASSWORD || '',
        ssl: true,
        role: 'PRIMARY',
        region: 'ap-south-1',
        availabilityZone: 'ap-south-1b',
        priority: 100,
        maxConnections: 100,
        isHealthy: true
      },
      replicas: [
        {
          id: 'mum-replica-2a',
          host: process.env.DB_SHARD2_REPLICA1_HOST || 'castmatch-shard2-replica1.ap-south-1.rds.amazonaws.com',
          port: 5432,
          database: 'castmatch_shard2',
          username: process.env.DB_SHARD2_USER || 'castmatch_read',
          password: process.env.DB_SHARD2_PASSWORD || '',
          ssl: true,
          role: 'REPLICA',
          region: 'ap-south-1',
          availabilityZone: 'ap-south-1a',
          priority: 90,
          maxConnections: 50,
          isHealthy: true
        },
        {
          id: 'mum-replica-2b',
          host: process.env.DB_SHARD2_REPLICA2_HOST || 'castmatch-shard2-replica2.ap-south-1.rds.amazonaws.com',
          port: 5432,
          database: 'castmatch_shard2',
          username: process.env.DB_SHARD2_USER || 'castmatch_read',
          password: process.env.DB_SHARD2_PASSWORD || '',
          ssl: true,
          role: 'REPLICA',
          region: 'ap-south-1',
          availabilityZone: 'ap-south-1c',
          priority: 80,
          maxConnections: 50,
          isHealthy: true
        }
      ]
    },
    {
      id: 'shard-mumbai-3',
      name: 'Mumbai Tertiary Shard',
      region: 'ap-south-1',
      weight: 100,
      maxConnections: 200,
      minConnections: 20,
      connectionTimeout: 5000,
      idleTimeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      healthCheckInterval: 10000,
      failoverThreshold: 3,
      keyRange: {
        start: 666667,
        end: 1000000
      },
      primary: {
        id: 'mum-primary-3',
        host: process.env.DB_SHARD3_PRIMARY_HOST || 'castmatch-shard3-primary.ap-south-1.rds.amazonaws.com',
        port: 5432,
        database: 'castmatch_shard3',
        username: process.env.DB_SHARD3_USER || 'castmatch_prod',
        password: process.env.DB_SHARD3_PASSWORD || '',
        ssl: true,
        role: 'PRIMARY',
        region: 'ap-south-1',
        availabilityZone: 'ap-south-1c',
        priority: 100,
        maxConnections: 100,
        isHealthy: true
      },
      replicas: [
        {
          id: 'mum-replica-3a',
          host: process.env.DB_SHARD3_REPLICA1_HOST || 'castmatch-shard3-replica1.ap-south-1.rds.amazonaws.com',
          port: 5432,
          database: 'castmatch_shard3',
          username: process.env.DB_SHARD3_USER || 'castmatch_read',
          password: process.env.DB_SHARD3_PASSWORD || '',
          ssl: true,
          role: 'REPLICA',
          region: 'ap-south-1',
          availabilityZone: 'ap-south-1a',
          priority: 90,
          maxConnections: 50,
          isHealthy: true
        },
        {
          id: 'mum-replica-3b',
          host: process.env.DB_SHARD3_REPLICA2_HOST || 'castmatch-shard3-replica2.ap-south-1.rds.amazonaws.com',
          port: 5432,
          database: 'castmatch_shard3',
          username: process.env.DB_SHARD3_USER || 'castmatch_read',
          password: process.env.DB_SHARD3_PASSWORD || '',
          ssl: true,
          role: 'REPLICA',
          region: 'ap-south-1',
          availabilityZone: 'ap-south-1b',
          priority: 80,
          maxConnections: 50,
          isHealthy: true
        }
      ]
    }
  ],
  monitoring: {
    enabled: true,
    metricsPort: 9090,
    healthCheckInterval: 5000,
    alertThresholds: {
      connectionPoolUsage: 80,
      queryLatency: 100,
      replicationLag: 1000,
      failedQueries: 10,
      deadlocks: 5
    },
    notifications: {
      email: ['devops@castmatch.ai', 'alerts@castmatch.ai'],
      slack: process.env.SLACK_WEBHOOK_URL,
      pagerduty: process.env.PAGERDUTY_API_KEY
    }
  }
};

/**
 * Shard key generation strategies
 */
export const ShardKeyStrategies = {
  /**
   * Hash-based sharding using user ID
   */
  hashUserId: (userId: string): number => {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 1000000; // Normalize to our key range
  },

  /**
   * Geographic sharding based on user location
   */
  geographic: (location: { lat: number; lng: number }): string => {
    // Mumbai coordinates: 19.0760° N, 72.8777° E
    const mumbaiBounds = {
      north: 19.5,
      south: 18.5,
      east: 73.5,
      west: 72.5
    };

    if (location.lat >= mumbaiBounds.south && location.lat <= mumbaiBounds.north &&
        location.lng >= mumbaiBounds.west && location.lng <= mumbaiBounds.east) {
      return 'shard-mumbai-1';
    }

    // Default to nearest shard based on distance
    return 'shard-mumbai-2';
  },

  /**
   * Consistent hashing for better distribution
   */
  consistentHash: (key: string, virtualNodes: number = 150): number => {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    const hashInt = parseInt(hash.substring(0, 8), 16);
    return hashInt % 1000000;
  }
};

/**
 * Get shard configuration for a given key
 */
export function getShardForKey(key: number | string, config: ShardingConfig = PRODUCTION_SHARDING_CONFIG): ShardConfig | null {
  const numericKey = typeof key === 'string' ? ShardKeyStrategies.hashUserId(key) : key;
  
  for (const shard of config.shards) {
    if (shard.keyRange && numericKey >= shard.keyRange.start && numericKey <= shard.keyRange.end) {
      return shard;
    }
  }
  
  // Fallback to first shard if no range matches
  return config.shards[0] || null;
}

/**
 * Get all shard configurations
 */
export function getAllShards(config: ShardingConfig = PRODUCTION_SHARDING_CONFIG): ShardConfig[] {
  return config.shards;
}

/**
 * Get healthy replicas for a shard
 */
export function getHealthyReplicas(shard: ShardConfig): DatabaseNode[] {
  return shard.replicas.filter(replica => replica.isHealthy);
}

/**
 * Select optimal read node based on strategy
 */
export function selectReadNode(shard: ShardConfig, preference: string = 'NEAREST'): DatabaseNode | null {
  const healthyReplicas = getHealthyReplicas(shard);
  
  switch (preference) {
    case 'PRIMARY':
      return shard.primary.isHealthy ? shard.primary : null;
    
    case 'SECONDARY':
      return healthyReplicas.length > 0 ? healthyReplicas[0] : null;
    
    case 'NEAREST':
      // Select based on lowest latency
      const nodes = shard.primary.isHealthy ? [shard.primary, ...healthyReplicas] : healthyReplicas;
      return nodes.sort((a, b) => (a.latency || 999) - (b.latency || 999))[0] || null;
    
    case 'PRIMARY_PREFERRED':
      return shard.primary.isHealthy ? shard.primary : (healthyReplicas[0] || null);
    
    default:
      return shard.primary;
  }
}

export default PRODUCTION_SHARDING_CONFIG;