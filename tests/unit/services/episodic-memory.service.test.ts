/**
 * Unit Tests for Episodic Memory Service
 * Tests short-term conversational memory and interaction history
 */

import { EpisodicMemoryService, EpisodicMemory, EpisodicMemoryQuery } from '../../../src/services/memory/episodic-memory.service';
import { Redis } from 'ioredis';
import { logger } from '../../../src/utils/logger';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
jest.mock('ioredis');
jest.mock('../../../src/utils/logger');
jest.mock('uuid');

describe('EpisodicMemoryService', () => {
  let episodicMemoryService: EpisodicMemoryService;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    // Create mock Redis instance
    mockRedis = {
      on: jest.fn(),
      setex: jest.fn(),
      zadd: jest.fn(),
      expire: jest.fn(),
      sadd: jest.fn(),
      get: jest.fn(),
      zrange: jest.fn(),
      zrevrange: jest.fn(),
      smembers: jest.fn(),
      keys: jest.fn(),
      del: jest.fn(),
      quit: jest.fn(),
    } as any;

    // Mock Redis constructor
    (Redis as any).mockImplementation(() => mockRedis);
    
    // Mock UUID
    (uuidv4 as jest.Mock).mockReturnValue('test-uuid-123');
    
    // Initialize service
    episodicMemoryService = new EpisodicMemoryService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize Redis connection with correct configuration', () => {
      expect(Redis).toHaveBeenCalledWith({
        host: 'localhost',
        port: 6379,
        db: 1,
      });
      expect(mockRedis.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should handle Redis connection events', () => {
      const connectHandler = mockRedis.on.mock.calls.find(call => call[0] === 'connect')[1];
      const errorHandler = mockRedis.on.mock.calls.find(call => call[0] === 'error')[1];

      connectHandler();
      expect(logger.info).toHaveBeenCalledWith('Episodic memory service connected to Redis');

      const error = new Error('Redis connection error');
      errorHandler(error);
      expect(logger.error).toHaveBeenCalledWith('Episodic memory Redis error:', error);
    });
  });

  describe('store', () => {
    it('should store a new episodic memory with default TTL', async () => {
      const memory = {
        userId: 'user123',
        sessionId: 'session456',
        timestamp: new Date(),
        interaction: {
          userInput: 'Find action movies',
          aiResponse: 'Here are some action movies...',
          context: { genre: 'action' },
        },
        metadata: {
          sentiment: 'positive' as const,
          topics: ['movies', 'action'],
          entities: ['action movies'],
          importance: 0.5,
        },
      };

      mockRedis.setex.mockResolvedValue('OK' as any);
      mockRedis.zadd.mockResolvedValue(1 as any);
      mockRedis.expire.mockResolvedValue(1 as any);
      mockRedis.sadd.mockResolvedValue(1 as any);

      const result = await episodicMemoryService.store(memory);

      expect(result.id).toBe('test-uuid-123');
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'episodic:user123:test-uuid-123',
        900, // 15 minutes default TTL
        expect.any(String)
      );
      expect(mockRedis.zadd).toHaveBeenCalledTimes(2); // Session and user index
      expect(mockRedis.sadd).toHaveBeenCalledTimes(2); // For each topic
    });

    it('should use extended TTL for high importance memories', async () => {
      const memory = {
        userId: 'user123',
        sessionId: 'session456',
        timestamp: new Date(),
        interaction: {
          userInput: 'Book this actor',
          aiResponse: 'Booking confirmed',
        },
        metadata: {
          importance: 0.8, // High importance
        },
      };

      mockRedis.setex.mockResolvedValue('OK' as any);
      mockRedis.zadd.mockResolvedValue(1 as any);
      mockRedis.expire.mockResolvedValue(1 as any);

      await episodicMemoryService.store(memory);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.any(String),
        3600, // 1 hour for important memories
        expect.any(String)
      );
    });

    it('should use custom TTL when provided', async () => {
      const memory = {
        userId: 'user123',
        sessionId: 'session456',
        timestamp: new Date(),
        interaction: {
          userInput: 'Test',
          aiResponse: 'Response',
        },
        metadata: {
          importance: 0.3,
        },
        ttl: 600, // Custom 10 minutes
      };

      mockRedis.setex.mockResolvedValue('OK' as any);
      mockRedis.zadd.mockResolvedValue(1 as any);
      mockRedis.expire.mockResolvedValue(1 as any);

      await episodicMemoryService.store(memory);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.any(String),
        600,
        expect.any(String)
      );
    });

    it('should index memories by topics', async () => {
      const memory = {
        userId: 'user123',
        sessionId: 'session456',
        timestamp: new Date(),
        interaction: {
          userInput: 'Test',
          aiResponse: 'Response',
        },
        metadata: {
          topics: ['casting', 'actors', 'auditions'],
          importance: 0.5,
        },
      };

      mockRedis.setex.mockResolvedValue('OK' as any);
      mockRedis.zadd.mockResolvedValue(1 as any);
      mockRedis.expire.mockResolvedValue(1 as any);
      mockRedis.sadd.mockResolvedValue(1 as any);

      await episodicMemoryService.store(memory);

      expect(mockRedis.sadd).toHaveBeenCalledWith('episodic:topic:casting', 'test-uuid-123');
      expect(mockRedis.sadd).toHaveBeenCalledWith('episodic:topic:actors', 'test-uuid-123');
      expect(mockRedis.sadd).toHaveBeenCalledWith('episodic:topic:auditions', 'test-uuid-123');
      expect(mockRedis.expire).toHaveBeenCalledTimes(5); // Session, user index, and 3 topics
    });

    it('should handle storage errors', async () => {
      const memory = {
        userId: 'user123',
        sessionId: 'session456',
        interaction: {
          userInput: 'Test',
          aiResponse: 'Response',
        },
        metadata: {
          importance: 0.5,
        },
      };

      mockRedis.setex.mockRejectedValue(new Error('Redis error'));

      await expect(episodicMemoryService.store(memory)).rejects.toThrow('Redis error');
      expect(logger.error).toHaveBeenCalledWith('Failed to store episodic memory:', expect.any(Error));
    });
  });

  describe('retrieve', () => {
    it('should retrieve a specific memory', async () => {
      const storedMemory: EpisodicMemory = {
        id: 'mem123',
        userId: 'user123',
        sessionId: 'session456',
        timestamp: new Date(),
        interaction: {
          userInput: 'Test',
          aiResponse: 'Response',
        },
        metadata: {
          importance: 0.5,
        },
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(storedMemory));

      const result = await episodicMemoryService.retrieve('user123', 'mem123');

      expect(result).toEqual(storedMemory);
      expect(mockRedis.get).toHaveBeenCalledWith('episodic:user123:mem123');
    });

    it('should return null if memory not found', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await episodicMemoryService.retrieve('user123', 'nonexistent');

      expect(result).toBeNull();
    });

    it('should handle retrieval errors', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));

      await expect(episodicMemoryService.retrieve('user123', 'mem123'))
        .rejects.toThrow('Redis error');
      expect(logger.error).toHaveBeenCalledWith('Failed to retrieve episodic memory:', expect.any(Error));
    });
  });

  describe('query', () => {
    it('should query memories by session ID', async () => {
      const query: EpisodicMemoryQuery = {
        sessionId: 'session456',
        limit: 5,
      };

      const memoryIds = ['mem1', 'mem2', 'mem3'];
      const memories = memoryIds.map(id => ({
        id,
        userId: 'user123',
        sessionId: 'session456',
        timestamp: new Date(),
        interaction: {
          userInput: `Input ${id}`,
          aiResponse: `Response ${id}`,
        },
        metadata: {
          importance: 0.5,
        },
      }));

      mockRedis.zrange.mockResolvedValue(memoryIds);
      mockRedis.keys.mockImplementation(async (pattern) => {
        const memId = pattern.split(':').pop();
        return [`episodic:user123:${memId}`];
      });
      mockRedis.get.mockImplementation(async (key) => {
        const id = key.split(':').pop();
        const memory = memories.find(m => m.id === id);
        return memory ? JSON.stringify(memory) : null;
      });

      const result = await episodicMemoryService.query(query);

      expect(result).toHaveLength(3);
      expect(mockRedis.zrange).toHaveBeenCalledWith('episodic:session:session456', 0, -1);
    });

    it('should query memories by user ID', async () => {
      const query: EpisodicMemoryQuery = {
        userId: 'user123',
      };

      const memoryIds = ['mem1', 'mem2'];
      mockRedis.zrange.mockResolvedValue(memoryIds);
      mockRedis.keys.mockResolvedValue([]);
      
      await episodicMemoryService.query(query);

      expect(mockRedis.zrange).toHaveBeenCalledWith('episodic:index:user123', 0, -1);
    });

    it('should filter by topics', async () => {
      const query: EpisodicMemoryQuery = {
        userId: 'user123',
        topics: ['casting', 'actors'],
      };

      mockRedis.zrange.mockResolvedValue(['mem1', 'mem2', 'mem3']);
      mockRedis.smembers.mockImplementation(async (key) => {
        if (key.includes('casting')) return ['mem1', 'mem2'];
        if (key.includes('actors')) return ['mem2', 'mem3'];
        return [];
      });
      mockRedis.keys.mockResolvedValue([]);

      await episodicMemoryService.query(query);

      expect(mockRedis.smembers).toHaveBeenCalledWith('episodic:topic:casting');
      expect(mockRedis.smembers).toHaveBeenCalledWith('episodic:topic:actors');
    });

    it('should filter by time range', async () => {
      const query: EpisodicMemoryQuery = {
        userId: 'user123',
        startTime: new Date('2024-01-01'),
        endTime: new Date('2024-12-31'),
      };

      const memory1 = {
        id: 'mem1',
        timestamp: new Date('2024-06-15'),
        userId: 'user123',
        sessionId: 'session1',
        interaction: { userInput: 'Test', aiResponse: 'Response' },
        metadata: { importance: 0.5 },
      };

      const memory2 = {
        id: 'mem2',
        timestamp: new Date('2025-01-15'), // Outside range
        userId: 'user123',
        sessionId: 'session1',
        interaction: { userInput: 'Test', aiResponse: 'Response' },
        metadata: { importance: 0.5 },
      };

      mockRedis.zrange.mockResolvedValue(['mem1', 'mem2']);
      mockRedis.keys.mockImplementation(async () => ['episodic:user123:mem1', 'episodic:user123:mem2']);
      mockRedis.get.mockImplementation(async (key) => {
        if (key.includes('mem1')) return JSON.stringify(memory1);
        if (key.includes('mem2')) return JSON.stringify(memory2);
        return null;
      });

      const result = await episodicMemoryService.query(query);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('mem1');
    });

    it('should filter by minimum importance', async () => {
      const query: EpisodicMemoryQuery = {
        userId: 'user123',
        minImportance: 0.7,
      };

      const memory1 = {
        id: 'mem1',
        timestamp: new Date(),
        userId: 'user123',
        sessionId: 'session1',
        interaction: { userInput: 'Test', aiResponse: 'Response' },
        metadata: { importance: 0.8 },
      };

      const memory2 = {
        id: 'mem2',
        timestamp: new Date(),
        userId: 'user123',
        sessionId: 'session1',
        interaction: { userInput: 'Test', aiResponse: 'Response' },
        metadata: { importance: 0.5 }, // Below threshold
      };

      mockRedis.zrange.mockResolvedValue(['mem1', 'mem2']);
      mockRedis.keys.mockImplementation(async () => ['episodic:user123:mem1', 'episodic:user123:mem2']);
      mockRedis.get.mockImplementation(async (key) => {
        if (key.includes('mem1')) return JSON.stringify(memory1);
        if (key.includes('mem2')) return JSON.stringify(memory2);
        return null;
      });

      const result = await episodicMemoryService.query(query);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('mem1');
    });

    it('should respect limit parameter', async () => {
      const query: EpisodicMemoryQuery = {
        userId: 'user123',
        limit: 2,
      };

      const memoryIds = ['mem1', 'mem2', 'mem3', 'mem4'];
      const memories = memoryIds.map(id => ({
        id,
        timestamp: new Date(),
        userId: 'user123',
        sessionId: 'session1',
        interaction: { userInput: 'Test', aiResponse: 'Response' },
        metadata: { importance: 0.5 },
      }));

      mockRedis.zrange.mockResolvedValue(memoryIds);
      mockRedis.keys.mockImplementation(async (pattern) => {
        const memId = pattern.split('*:').pop();
        return [`episodic:user123:${memId}`];
      });
      mockRedis.get.mockImplementation(async (key) => {
        const id = key.split(':').pop();
        const memory = memories.find(m => m.id === id);
        return memory ? JSON.stringify(memory) : null;
      });

      const result = await episodicMemoryService.query(query);

      expect(result).toHaveLength(2);
    });

    it('should handle query errors', async () => {
      mockRedis.zrange.mockRejectedValue(new Error('Redis error'));

      await expect(episodicMemoryService.query({ userId: 'user123' }))
        .rejects.toThrow('Redis error');
      expect(logger.error).toHaveBeenCalledWith('Failed to query episodic memories:', expect.any(Error));
    });
  });

  describe('getRecentSessionMemories', () => {
    it('should get recent memories for a session', async () => {
      const sessionId = 'session456';
      const memoryIds = ['mem3', 'mem2', 'mem1']; // Reverse order (most recent first)
      const memories = memoryIds.map(id => ({
        id,
        userId: 'user123',
        sessionId,
        timestamp: new Date(),
        interaction: {
          userInput: `Input ${id}`,
          aiResponse: `Response ${id}`,
        },
        metadata: {
          importance: 0.5,
        },
      }));

      mockRedis.zrevrange.mockResolvedValue(memoryIds.slice(0, 2)); // Get 2 most recent
      mockRedis.keys.mockImplementation(async (pattern) => {
        const memId = pattern.split('*:').pop();
        return [`episodic:user123:${memId}`];
      });
      mockRedis.get.mockImplementation(async (key) => {
        const id = key.split(':').pop();
        const memory = memories.find(m => m.id === id);
        return memory ? JSON.stringify(memory) : null;
      });

      const result = await episodicMemoryService.getRecentSessionMemories(sessionId, 2);

      expect(result).toHaveLength(2);
      expect(mockRedis.zrevrange).toHaveBeenCalledWith('episodic:session:session456', 0, 1);
    });

    it('should use default limit of 10', async () => {
      mockRedis.zrevrange.mockResolvedValue([]);
      
      await episodicMemoryService.getRecentSessionMemories('session456');

      expect(mockRedis.zrevrange).toHaveBeenCalledWith('episodic:session:session456', 0, 9);
    });

    it('should handle errors', async () => {
      mockRedis.zrevrange.mockRejectedValue(new Error('Redis error'));

      await expect(episodicMemoryService.getRecentSessionMemories('session456'))
        .rejects.toThrow('Redis error');
      expect(logger.error).toHaveBeenCalledWith('Failed to get recent session memories:', expect.any(Error));
    });
  });

  describe('updateImportance', () => {
    it('should update memory importance and extend TTL for high importance', async () => {
      const memory: EpisodicMemory = {
        id: 'mem123',
        userId: 'user123',
        sessionId: 'session456',
        timestamp: new Date(),
        interaction: {
          userInput: 'Test',
          aiResponse: 'Response',
        },
        metadata: {
          importance: 0.5,
        },
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(memory));
      mockRedis.setex.mockResolvedValue('OK' as any);

      await episodicMemoryService.updateImportance('user123', 'mem123', 0.8);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'episodic:user123:mem123',
        3600, // Extended TTL for high importance
        expect.stringContaining('"importance":0.8')
      );
      expect(logger.info).toHaveBeenCalledWith('Updated importance for memory mem123 to 0.8');
    });

    it('should use default TTL for low importance', async () => {
      const memory: EpisodicMemory = {
        id: 'mem123',
        userId: 'user123',
        sessionId: 'session456',
        timestamp: new Date(),
        interaction: {
          userInput: 'Test',
          aiResponse: 'Response',
        },
        metadata: {
          importance: 0.8,
        },
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(memory));
      mockRedis.setex.mockResolvedValue('OK' as any);

      await episodicMemoryService.updateImportance('user123', 'mem123', 0.3);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'episodic:user123:mem123',
        900, // Default TTL for low importance
        expect.stringContaining('"importance":0.3')
      );
    });

    it('should throw error if memory not found', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(episodicMemoryService.updateImportance('user123', 'nonexistent', 0.8))
        .rejects.toThrow('Memory nonexistent not found');
    });

    it('should handle update errors', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));

      await expect(episodicMemoryService.updateImportance('user123', 'mem123', 0.8))
        .rejects.toThrow('Redis error');
      expect(logger.error).toHaveBeenCalledWith('Failed to update memory importance:', expect.any(Error));
    });
  });

  describe('clearUserMemories', () => {
    it('should clear all memories for a user', async () => {
      const userId = 'user123';
      const memoryKeys = [
        'episodic:user123:mem1',
        'episodic:user123:mem2',
        'episodic:user123:mem3',
      ];

      mockRedis.keys.mockResolvedValue(memoryKeys);
      mockRedis.del.mockResolvedValue(3 as any);

      await episodicMemoryService.clearUserMemories(userId);

      expect(mockRedis.keys).toHaveBeenCalledWith('episodic:user123:*');
      expect(mockRedis.del).toHaveBeenCalledWith(...memoryKeys);
      expect(mockRedis.del).toHaveBeenCalledWith('episodic:index:user123');
      expect(logger.info).toHaveBeenCalledWith('Cleared all memories for user user123');
    });

    it('should handle case with no memories', async () => {
      mockRedis.keys.mockResolvedValue([]);
      mockRedis.del.mockResolvedValue(0 as any);

      await episodicMemoryService.clearUserMemories('user123');

      expect(mockRedis.del).toHaveBeenCalledWith('episodic:index:user123');
    });

    it('should handle clear errors', async () => {
      mockRedis.keys.mockRejectedValue(new Error('Redis error'));

      await expect(episodicMemoryService.clearUserMemories('user123'))
        .rejects.toThrow('Redis error');
      expect(logger.error).toHaveBeenCalledWith('Failed to clear user memories:', expect.any(Error));
    });
  });

  describe('getStats', () => {
    it('should calculate memory statistics for a user', async () => {
      const userId = 'user123';
      const memoryKeys = [
        'episodic:user123:mem1',
        'episodic:user123:mem2',
      ];

      const memories = [
        {
          id: 'mem1',
          timestamp: new Date('2024-01-01T10:00:00'),
          metadata: {
            importance: 0.8,
            topics: ['casting', 'actors'],
          },
        },
        {
          id: 'mem2',
          timestamp: new Date('2024-01-01T14:00:00'),
          metadata: {
            importance: 0.6,
            topics: ['casting', 'auditions'],
          },
        },
      ];

      mockRedis.keys.mockResolvedValue(memoryKeys);
      mockRedis.get.mockImplementation(async (key) => {
        if (key.includes('mem1')) return JSON.stringify(memories[0]);
        if (key.includes('mem2')) return JSON.stringify(memories[1]);
        return null;
      });

      const result = await episodicMemoryService.getStats(userId);

      expect(result.totalMemories).toBe(2);
      expect(result.averageImportance).toBe(0.7);
      expect(result.topTopics).toContain('casting');
      expect(result.memoryDistribution['10:00']).toBe(1);
      expect(result.memoryDistribution['14:00']).toBe(1);
    });

    it('should get global statistics when no userId provided', async () => {
      const memoryKeys = [
        'episodic:user1:mem1',
        'episodic:user2:mem2',
        'episodic:index:user1', // Should be filtered out
        'episodic:session:sess1', // Should be filtered out
        'episodic:topic:casting', // Should be filtered out
      ];

      mockRedis.keys.mockResolvedValue(memoryKeys);
      mockRedis.get.mockImplementation(async (key) => {
        if (key.includes('index') || key.includes('session') || key.includes('topic')) {
          return null;
        }
        return JSON.stringify({
          id: key.split(':').pop(),
          timestamp: new Date(),
          metadata: {
            importance: 0.5,
            topics: ['general'],
          },
        });
      });

      const result = await episodicMemoryService.getStats();

      expect(result.totalMemories).toBe(2); // Only actual memory keys
      expect(mockRedis.keys).toHaveBeenCalledWith('episodic:*');
    });

    it('should handle empty statistics', async () => {
      mockRedis.keys.mockResolvedValue([]);

      const result = await episodicMemoryService.getStats('user123');

      expect(result).toEqual({
        totalMemories: 0,
        averageImportance: 0,
        topTopics: [],
        memoryDistribution: {},
      });
    });

    it('should handle stats errors', async () => {
      mockRedis.keys.mockRejectedValue(new Error('Redis error'));

      await expect(episodicMemoryService.getStats())
        .rejects.toThrow('Redis error');
      expect(logger.error).toHaveBeenCalledWith('Failed to get memory stats:', expect.any(Error));
    });
  });

  describe('cleanup', () => {
    it('should log cleanup completion', async () => {
      await episodicMemoryService.cleanup();

      expect(logger.info).toHaveBeenCalledWith('Episodic memory cleanup completed (Redis TTL-based)');
    });
  });

  describe('disconnect', () => {
    it('should disconnect from Redis', async () => {
      mockRedis.quit.mockResolvedValue('OK' as any);

      await episodicMemoryService.disconnect();

      expect(mockRedis.quit).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Episodic memory service disconnected');
    });
  });
});