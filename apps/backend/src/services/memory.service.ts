/**
 * Memory Service
 * Unified interface for episodic, semantic, and procedural memory
 */

import { logger } from '../utils/logger';
import { memorySystem } from './memory';
import Redis from 'ioredis';

export interface MemoryCreateInput {
  userId: string;
  conversationId: string;
  type: 'episodic' | 'semantic' | 'procedural';
  content: string;
  metadata?: any;
}

export interface Memory {
  id: string;
  content: string;
  userId: string;
  conversationId?: string;
  type: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
  importance?: number;
}

export class MemoryService {
  private redis: Redis | null = null;
  
  constructor() {
    // Initialize Redis for short-term memory caching
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
      });
      
      this.redis.on('error', (err) => {
        logger.warn('Redis connection error in memory service:', err);
        this.redis = null;
      });
    } catch (error) {
      logger.warn('Failed to initialize Redis for memory service:', error);
      this.redis = null;
    }
  }

  /**
   * Store memory based on type
   */
  async storeMemory(input: MemoryCreateInput): Promise<Memory> {
    try {
      let result: any;
      
      switch (input.type) {
        case 'episodic':
          result = await memorySystem.episodic.storeEpisode({
            userId: input.userId,
            conversationId: input.conversationId,
            content: input.content,
            context: input.metadata || {},
            timestamp: new Date(),
          });
          break;
          
        case 'semantic':
          result = await memorySystem.semantic.storeKnowledge({
            userId: input.userId,
            content: input.content,
            category: input.metadata?.category || 'general',
            confidence: input.metadata?.confidence || 0.7,
          });
          break;
          
        case 'procedural':
          result = await memorySystem.procedural.storePattern({
            userId: input.userId,
            pattern: input.content,
            context: input.metadata || {},
            success: input.metadata?.success !== false,
          });
          break;
          
        default:
          throw new Error(`Unknown memory type: ${input.type}`);
      }

      // Cache in Redis for quick access
      if (this.redis && result) {
        const cacheKey = `memory:${input.userId}:recent`;
        await this.redis.lpush(cacheKey, JSON.stringify({
          id: result.id,
          type: input.type,
          content: input.content,
          timestamp: new Date().toISOString(),
        }));
        await this.redis.ltrim(cacheKey, 0, 49); // Keep last 50 memories
        await this.redis.expire(cacheKey, 3600); // 1 hour TTL
      }

      return {
        id: result.id,
        content: input.content,
        userId: input.userId,
        conversationId: input.conversationId,
        type: input.type,
        metadata: input.metadata,
        createdAt: result.createdAt || new Date(),
        updatedAt: result.updatedAt || new Date(),
        importance: result.importance || 0.5,
      };
    } catch (error) {
      logger.error('Error storing memory:', error);
      // Return a basic memory object to prevent failures
      return {
        id: `temp-${Date.now()}`,
        content: input.content,
        userId: input.userId,
        conversationId: input.conversationId,
        type: input.type,
        metadata: input.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  /**
   * Get user context (combines recent memories from all types)
   */
  async getUserContext(userId: string, conversationId: string): Promise<any> {
    try {
      // Try Redis cache first
      if (this.redis) {
        const cached = await this.redis.get(`memory:${userId}:context:${conversationId}`);
        if (cached) {
          return JSON.parse(cached);
        }
      }

      // Build context from different memory types
      const context: any = {};
      
      // Get recent episodic memories (conversation context)
      try {
        const episodes = await memorySystem.episodic.searchByUser(userId, {
          conversationId,
          limit: 10,
          includeContext: true,
        });
        context.recentConversation = episodes.slice(0, 5).map(ep => ep.content);
      } catch (error) {
        logger.warn('Error fetching episodic memories:', error);
        context.recentConversation = [];
      }

      // Get relevant semantic knowledge
      try {
        const knowledge = await memorySystem.semantic.searchKnowledge(userId, '', {
          limit: 5,
          minConfidence: 0.7,
        });
        context.userKnowledge = knowledge.map(k => k.content);
      } catch (error) {
        logger.warn('Error fetching semantic memories:', error);
        context.userKnowledge = [];
      }

      // Get procedural patterns (user preferences)
      try {
        const patterns = await memorySystem.procedural.getSuccessfulPatterns(userId, 5);
        context.userPatterns = patterns.map(p => p.pattern);
      } catch (error) {
        logger.warn('Error fetching procedural memories:', error);
        context.userPatterns = [];
      }

      // Cache the context
      if (this.redis) {
        await this.redis.setex(
          `memory:${userId}:context:${conversationId}`,
          300, // 5 minutes TTL
          JSON.stringify(context)
        );
      }

      return context;
    } catch (error) {
      logger.error('Error getting user context:', error);
      return {};
    }
  }

  /**
   * Get recent memories for a user
   */
  async getRecentMemories(userId: string, limit: number = 10): Promise<Memory[]> {
    try {
      // Try Redis cache first
      if (this.redis) {
        const cached = await this.redis.lrange(`memory:${userId}:recent`, 0, limit - 1);
        if (cached.length > 0) {
          return cached.map(item => {
            const memory = JSON.parse(item);
            return {
              ...memory,
              createdAt: new Date(memory.timestamp),
              updatedAt: new Date(memory.timestamp),
            };
          });
        }
      }

      // Fallback to database queries
      const memories: Memory[] = [];
      
      // Get from episodic memory
      try {
        const episodes = await memorySystem.episodic.searchByUser(userId, { limit: Math.ceil(limit / 3) });
        memories.push(...episodes.map(ep => ({
          id: ep.id,
          content: ep.content,
          userId: ep.userId,
          conversationId: ep.conversationId,
          type: 'episodic',
          metadata: ep.context,
          createdAt: ep.createdAt,
          updatedAt: ep.updatedAt,
          importance: ep.importance,
        })));
      } catch (error) {
        logger.warn('Error fetching episodic memories:', error);
      }

      return memories.slice(0, limit);
    } catch (error) {
      logger.error('Error getting recent memories:', error);
      return [];
    }
  }

  /**
   * Search memories
   */
  async searchMemories(userId: string, query: string, limit: number = 10): Promise<Memory[]> {
    try {
      const memories: Memory[] = [];

      // Search episodic memories
      try {
        const episodes = await memorySystem.episodic.searchContent(userId, query, Math.ceil(limit / 2));
        memories.push(...episodes.map(ep => ({
          id: ep.id,
          content: ep.content,
          userId: ep.userId,
          conversationId: ep.conversationId,
          type: 'episodic',
          metadata: ep.context,
          createdAt: ep.createdAt,
          updatedAt: ep.updatedAt,
          importance: ep.importance,
        })));
      } catch (error) {
        logger.warn('Error searching episodic memories:', error);
      }

      // Search semantic knowledge
      try {
        const knowledge = await memorySystem.semantic.searchKnowledge(userId, query, { 
          limit: Math.ceil(limit / 2) 
        });
        memories.push(...knowledge.map(k => ({
          id: k.id,
          content: k.content,
          userId: k.userId,
          type: 'semantic',
          metadata: { category: k.category, confidence: k.confidence },
          createdAt: k.createdAt,
          updatedAt: k.updatedAt,
          importance: k.confidence,
        })));
      } catch (error) {
        logger.warn('Error searching semantic memories:', error);
      }

      // Sort by importance and return top results
      return memories
        .sort((a, b) => (b.importance || 0) - (a.importance || 0))
        .slice(0, limit);
    } catch (error) {
      logger.error('Error searching memories:', error);
      return [];
    }
  }

  /**
   * Create memory (legacy compatibility)
   */
  async createMemory(input: MemoryCreateInput): Promise<Memory> {
    return this.storeMemory(input);
  }
}

export const memoryService = new MemoryService();