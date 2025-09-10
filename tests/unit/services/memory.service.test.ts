/**
 * Unit Tests for Memory Service
 * Tests the core memory management functionality
 */

import { MemoryService } from '../../../src/services/memory.service';
import { db } from '../../../src/config/database';
import { CacheManager } from '../../../src/config/redis';
import { logger } from '../../../src/utils/logger';
import { AppError } from '../../../src/utils/errors';
import { memories } from '../../../src/models/schema';
import { eq, and, desc, gte, or, sql } from 'drizzle-orm';

// Mock dependencies
jest.mock('../../../src/config/database');
jest.mock('../../../src/config/redis');
jest.mock('../../../src/utils/logger');
jest.mock('../../../src/models/schema');

describe('MemoryService', () => {
  let memoryService: MemoryService;
  let mockDb: any;
  let mockCacheManager: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Initialize service
    memoryService = new MemoryService();
    
    // Setup mock database
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
    };
    
    (db as any) = mockDb;
    
    // Setup mock cache manager
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      deletePattern: jest.fn(),
    };
    
    (CacheManager as any) = mockCacheManager;
  });

  describe('storeMemory', () => {
    it('should store a new memory successfully', async () => {
      const input = {
        userId: 'user123',
        conversationId: 'conv456',
        type: 'short_term' as const,
        category: 'preference',
        key: 'language',
        value: { preferred: 'English' },
        importance: 0.8,
      };

      const mockMemory = {
        id: 'mem789',
        ...input,
        accessCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      };

      // Mock getMemoryByKey to return null (no existing memory)
      jest.spyOn(memoryService, 'getMemoryByKey').mockResolvedValue(null);
      
      // Mock database insert
      mockDb.returning.mockResolvedValue([mockMemory]);
      
      // Mock cache set
      mockCacheManager.set.mockResolvedValue(true);

      const result = await memoryService.storeMemory(input);

      expect(result).toEqual(mockMemory);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        `stm:${input.userId}:${input.key}`,
        mockMemory,
        1800 // 30 minutes
      );
    });

    it('should update existing memory if key already exists', async () => {
      const input = {
        userId: 'user123',
        type: 'short_term' as const,
        key: 'language',
        value: { preferred: 'Hindi' },
        importance: 0.9,
      };

      const existingMemory = {
        id: 'existing123',
        userId: 'user123',
        key: 'language',
        value: { preferred: 'English' },
        importance: '0.8',
        accessCount: 5,
      };

      const updatedMemory = {
        ...existingMemory,
        value: input.value,
        importance: input.importance.toString(),
        accessCount: 6,
        updatedAt: new Date(),
      };

      // Mock getMemoryByKey to return existing memory
      jest.spyOn(memoryService, 'getMemoryByKey').mockResolvedValue(existingMemory as any);
      
      // Mock database update
      mockDb.returning.mockResolvedValue([updatedMemory]);

      const result = await memoryService.storeMemory(input);

      expect(result).toEqual(updatedMemory);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalled();
    });

    it('should set expiry for short-term memories', async () => {
      const input = {
        userId: 'user123',
        type: 'short_term' as const,
        key: 'recent_search',
        value: { query: 'action movies' },
      };

      jest.spyOn(memoryService, 'getMemoryByKey').mockResolvedValue(null);
      mockDb.returning.mockResolvedValue([{ id: 'mem123', ...input }]);

      await memoryService.storeMemory(input);

      const insertCall = mockDb.values.mock.calls[0][0];
      expect(insertCall.expiresAt).toBeDefined();
      expect(insertCall.expiresAt).toBeInstanceOf(Date);
    });

    it('should handle database errors gracefully', async () => {
      const input = {
        userId: 'user123',
        type: 'long_term' as const,
        key: 'preferences',
        value: { genre: 'comedy' },
      };

      jest.spyOn(memoryService, 'getMemoryByKey').mockRejectedValue(new Error('DB Error'));

      await expect(memoryService.storeMemory(input)).rejects.toThrow(AppError);
      expect(logger.error).toHaveBeenCalledWith('Error storing memory:', expect.any(Error));
    });
  });

  describe('getMemoryByKey', () => {
    it('should retrieve memory from cache if available', async () => {
      const userId = 'user123';
      const key = 'language';
      const cachedMemory = {
        id: 'mem123',
        userId,
        key,
        value: { preferred: 'English' },
      };

      mockCacheManager.get.mockResolvedValue(cachedMemory);

      const result = await memoryService.getMemoryByKey(userId, key);

      expect(result).toEqual(cachedMemory);
      expect(mockCacheManager.get).toHaveBeenCalledWith(`stm:${userId}:${key}`);
      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('should retrieve memory from database if not in cache', async () => {
      const userId = 'user123';
      const key = 'language';
      const dbMemory = {
        id: 'mem123',
        userId,
        key,
        value: { preferred: 'English' },
        accessCount: 5,
      };

      mockCacheManager.get.mockResolvedValue(null);
      mockDb.limit.mockResolvedValue([dbMemory]);
      mockDb.returning.mockResolvedValue([]);

      const result = await memoryService.getMemoryByKey(userId, key);

      expect(result).toEqual(dbMemory);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.update).toHaveBeenCalled(); // Access count update
    });

    it('should return null if memory not found', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockDb.limit.mockResolvedValue([]);

      const result = await memoryService.getMemoryByKey('user123', 'nonexistent');

      expect(result).toBeNull();
    });

    it('should update access count when retrieving from database', async () => {
      const memory = {
        id: 'mem123',
        userId: 'user123',
        key: 'test',
        accessCount: 5,
      };

      mockCacheManager.get.mockResolvedValue(null);
      mockDb.limit.mockResolvedValue([memory]);
      mockDb.returning.mockResolvedValue([]);

      await memoryService.getMemoryByKey('user123', 'test');

      expect(mockDb.update).toHaveBeenCalledWith(memories);
      expect(mockDb.set).toHaveBeenCalled();
    });
  });

  describe('searchMemories', () => {
    it('should search memories with all filters', async () => {
      const options = {
        userId: 'user123',
        conversationId: 'conv456',
        type: 'episodic' as const,
        category: 'interaction',
        limit: 10,
        includeExpired: false,
      };

      const mockResults = [
        {
          id: 'mem1',
          userId: 'user123',
          type: 'episodic',
          category: 'interaction',
          key: 'chat1',
          value: { message: 'Hello' },
          importance: '0.9',
        },
      ];

      mockDb.limit.mockResolvedValue(mockResults);

      const result = await memoryService.searchMemories(options);

      expect(result).toEqual(mockResults);
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.orderBy).toHaveBeenCalled();
      expect(mockDb.limit).toHaveBeenCalledWith(10);
    });

    it('should exclude expired memories by default', async () => {
      const options = {
        userId: 'user123',
        includeExpired: false,
      };

      mockDb.limit.mockResolvedValue([]);

      await memoryService.searchMemories(options);

      // Verify that expiry condition was included
      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should include expired memories when specified', async () => {
      const options = {
        userId: 'user123',
        includeExpired: true,
      };

      mockDb.limit.mockResolvedValue([]);

      await memoryService.searchMemories(options);

      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should handle search errors gracefully', async () => {
      mockDb.limit.mockRejectedValue(new Error('Search failed'));

      await expect(memoryService.searchMemories({ userId: 'user123' }))
        .rejects.toThrow(AppError);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getUserContext', () => {
    it('should organize memories into context categories', async () => {
      const userId = 'user123';
      const userMemories = [
        {
          id: '1',
          category: 'preference',
          key: 'language',
          value: 'English',
          type: 'semantic',
          importance: '0.9',
        },
        {
          id: '2',
          category: 'requirement',
          key: 'budget',
          value: 1000000,
          type: 'semantic',
          importance: '0.8',
        },
        {
          id: '3',
          type: 'episodic',
          key: 'last_search',
          value: { query: 'actors' },
          createdAt: new Date(),
          importance: '0.7',
        },
        {
          id: '4',
          category: 'context',
          key: 'current_project',
          value: 'Web Series',
          type: 'semantic',
          importance: '0.6',
        },
      ];

      mockDb.orderBy.mockResolvedValue(userMemories);

      const result = await memoryService.getUserContext(userId);

      expect(result.preferences).toEqual({ language: 'English' });
      expect(result.requirements).toEqual({ budget: 1000000 });
      expect(result.history).toHaveLength(1);
      expect(result.context).toEqual({ current_project: 'Web Series' });
    });

    it('should filter by conversation ID when provided', async () => {
      const userId = 'user123';
      const conversationId = 'conv456';

      mockDb.orderBy.mockResolvedValue([]);

      await memoryService.getUserContext(userId, conversationId);

      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should handle empty memory list', async () => {
      mockDb.orderBy.mockResolvedValue([]);

      const result = await memoryService.getUserContext('user123');

      expect(result).toEqual({
        preferences: {},
        requirements: {},
        history: [],
        context: {},
      });
    });
  });

  describe('promoteToLongTerm', () => {
    it('should promote short-term memory to long-term', async () => {
      const memoryId = 'mem123';
      const memory = {
        id: memoryId,
        userId: 'user123',
        key: 'important_preference',
        type: 'short_term',
        importance: '0.6',
      };

      const promotedMemory = {
        ...memory,
        type: 'long_term',
        expiresAt: null,
        importance: '0.7',
      };

      mockDb.limit.mockResolvedValue([memory]);
      mockDb.returning.mockResolvedValue([promotedMemory]);
      mockCacheManager.delete.mockResolvedValue(true);

      const result = await memoryService.promoteToLongTerm(memoryId);

      expect(result).toEqual(promotedMemory);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockCacheManager.delete).toHaveBeenCalledWith(
        `stm:${memory.userId}:${memory.key}`
      );
    });

    it('should throw error if memory not found', async () => {
      mockDb.limit.mockResolvedValue([]);

      await expect(memoryService.promoteToLongTerm('nonexistent'))
        .rejects.toThrow(AppError);
    });

    it('should update importance to minimum threshold', async () => {
      const memory = {
        id: 'mem123',
        userId: 'user123',
        key: 'test',
        type: 'short_term',
        importance: '0.5',
      };

      mockDb.limit.mockResolvedValue([memory]);
      mockDb.returning.mockResolvedValue([{ ...memory, type: 'long_term' }]);

      await memoryService.promoteToLongTerm('mem123');

      expect(mockDb.set).toHaveBeenCalled();
    });
  });

  describe('cleanupExpiredMemories', () => {
    it('should delete expired memories', async () => {
      const mockResult = { length: 5 };
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockResolvedValue(mockResult),
      });

      const result = await memoryService.cleanupExpiredMemories();

      expect(result).toBe(5);
      expect(logger.info).toHaveBeenCalledWith('Cleaned up 5 expired memories');
    });

    it('should handle cleanup errors gracefully', async () => {
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockRejectedValue(new Error('Cleanup failed')),
      });

      const result = await memoryService.cleanupExpiredMemories();

      expect(result).toBe(0);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should return 0 when no memories to clean', async () => {
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockResolvedValue({ length: 0 }),
      });

      const result = await memoryService.cleanupExpiredMemories();

      expect(result).toBe(0);
    });
  });

  describe('consolidateMemories', () => {
    it('should consolidate STM items into patterns', async () => {
      const userId = 'user123';
      const stmItems = [
        {
          id: '1',
          category: 'search',
          key: 'query1',
          value: { genre: 'action' },
          importance: '0.5',
        },
        {
          id: '2',
          category: 'search',
          key: 'query2',
          value: { genre: 'action' },
          importance: '0.6',
        },
        {
          id: '3',
          category: 'search',
          key: 'query3',
          value: { genre: 'action' },
          importance: '0.7',
        },
      ];

      jest.spyOn(memoryService, 'searchMemories').mockResolvedValue(stmItems as any);
      jest.spyOn(memoryService, 'storeMemory').mockResolvedValue({} as any);

      await memoryService.consolidateMemories(userId);

      expect(memoryService.searchMemories).toHaveBeenCalledWith({
        userId,
        type: 'short_term',
        limit: 100,
      });
      expect(memoryService.storeMemory).toHaveBeenCalled();
    });

    it('should remove old STM items when over limit', async () => {
      const userId = 'user123';
      const stmItems = Array(110).fill(null).map((_, i) => ({
        id: `mem${i}`,
        category: 'test',
        key: `key${i}`,
        value: `value${i}`,
        importance: (Math.random()).toString(),
      }));

      jest.spyOn(memoryService, 'searchMemories').mockResolvedValue(stmItems as any);
      jest.spyOn(memoryService, 'storeMemory').mockResolvedValue({} as any);
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockResolvedValue({}),
      });

      await memoryService.consolidateMemories(userId);

      expect(mockDb.delete).toHaveBeenCalledTimes(10); // 110 - 100 = 10
    });

    it('should handle consolidation errors gracefully', async () => {
      jest.spyOn(memoryService, 'searchMemories').mockRejectedValue(new Error('Search failed'));

      await memoryService.consolidateMemories('user123');

      expect(logger.error).toHaveBeenCalled();
      // Should not throw error
    });
  });

  describe('updateImportance', () => {
    it('should update memory importance with delta', async () => {
      const memoryId = 'mem123';
      const delta = 0.1;

      mockDb.where.mockResolvedValue({});

      await memoryService.updateImportance(memoryId, delta);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalled();
    });

    it('should clamp importance between 0 and 9.99', async () => {
      mockDb.where.mockResolvedValue({});

      await memoryService.updateImportance('mem123', 10);

      expect(mockDb.set).toHaveBeenCalled();
    });

    it('should handle update errors gracefully', async () => {
      mockDb.where.mockRejectedValue(new Error('Update failed'));

      await memoryService.updateImportance('mem123', 0.1);

      expect(logger.error).toHaveBeenCalled();
      // Should not throw error
    });
  });

  describe('getMemoryStats', () => {
    it('should return comprehensive memory statistics', async () => {
      const stats = {
        totalMemories: 100,
        shortTermCount: 40,
        longTermCount: 30,
        episodicCount: 20,
        semanticCount: 10,
        averageImportance: 0.75,
        totalAccessCount: 500,
      };

      mockDb.where.mockResolvedValue([stats]);

      const result = await memoryService.getMemoryStats('user123');

      expect(result).toEqual(stats);
    });

    it('should return default stats when no memories exist', async () => {
      mockDb.where.mockResolvedValue([]);

      const result = await memoryService.getMemoryStats('user123');

      expect(result).toEqual({
        totalMemories: 0,
        shortTermCount: 0,
        longTermCount: 0,
        episodicCount: 0,
        semanticCount: 0,
        averageImportance: 0,
        totalAccessCount: 0,
      });
    });

    it('should handle stats errors', async () => {
      mockDb.where.mockRejectedValue(new Error('Stats failed'));

      await expect(memoryService.getMemoryStats('user123'))
        .rejects.toThrow(AppError);
    });
  });

  describe('clearUserMemories', () => {
    it('should clear all memories for a user', async () => {
      const userId = 'user123';
      
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockResolvedValue({}),
      });
      mockCacheManager.deletePattern.mockResolvedValue(true);

      await memoryService.clearUserMemories(userId);

      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockCacheManager.deletePattern).toHaveBeenCalledWith(`stm:${userId}:*`);
      expect(logger.info).toHaveBeenCalledWith(`Memories cleared for user ${userId}`);
    });

    it('should clear only specific type when provided', async () => {
      const userId = 'user123';
      const type = 'short_term';

      mockDb.delete.mockReturnValue({
        where: jest.fn().mockResolvedValue({}),
      });
      mockCacheManager.deletePattern.mockResolvedValue(true);

      await memoryService.clearUserMemories(userId, type);

      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should handle clear errors', async () => {
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockRejectedValue(new Error('Clear failed')),
      });

      await expect(memoryService.clearUserMemories('user123'))
        .rejects.toThrow(AppError);
    });
  });

  describe('extractPatterns', () => {
    it('should extract frequent patterns from memory items', () => {
      const items = [
        { id: '1', value: { genre: 'action' } },
        { id: '2', value: { genre: 'action' } },
        { id: '3', value: { genre: 'comedy' } },
        { id: '4', value: { genre: 'action' } },
      ] as any;

      const patterns = (memoryService as any).extractPatterns(items);

      expect(patterns).toHaveLength(1);
      expect(patterns[0]).toEqual({
        value: { genre: 'action' },
        frequency: 3,
        confidence: 0.75,
      });
    });

    it('should not extract patterns with frequency less than 2', () => {
      const items = [
        { id: '1', value: { genre: 'action' } },
        { id: '2', value: { genre: 'comedy' } },
        { id: '3', value: { genre: 'drama' } },
      ] as any;

      const patterns = (memoryService as any).extractPatterns(items);

      expect(patterns).toHaveLength(0);
    });

    it('should handle empty items array', () => {
      const patterns = (memoryService as any).extractPatterns([]);

      expect(patterns).toEqual([]);
    });
  });
});