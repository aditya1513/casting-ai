/**
 * Memory System Integration Tests
 * Testing memory storage, retrieval, and context management
 */

import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { app } from '../../src/server';
import { db } from '../../src/config/database';
import { memories } from '../../src/models/schema';
import { eq } from 'drizzle-orm';

describe('Memory System API', () => {
  let authToken: string;
  let userId: string;
  let testMemoryId: string;

  beforeAll(async () => {
    // Setup test user and get auth token
    const authResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'memory.test@castmatch.ai',
        password: 'TestPassword123!',
        name: 'Memory Test User',
      });
    
    authToken = authResponse.body.token;
    userId = authResponse.body.user.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await db.delete(memories).where(eq(memories.userId, userId));
  });

  beforeEach(async () => {
    // Clear memories before each test
    await db.delete(memories).where(eq(memories.userId, userId));
  });

  describe('POST /api/memory', () => {
    it('should store a new short-term memory', async () => {
      const response = await request(app)
        .post('/api/memory')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          key: 'user_preference_genre',
          value: { genres: ['action', 'drama'], priority: 'high' },
          type: 'short_term',
          category: 'preference',
          importance: 5.0,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.key).toBe('user_preference_genre');
      expect(response.body.data.type).toBe('short_term');
      
      testMemoryId = response.body.data.id;
    });

    it('should store a long-term memory', async () => {
      const response = await request(app)
        .post('/api/memory')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          key: 'casting_criteria',
          value: { ageRange: '25-35', experience: 'professional' },
          type: 'long_term',
          category: 'requirement',
          importance: 8.0,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.type).toBe('long_term');
      expect(response.body.data.expiresAt).toBeNull();
    });

    it('should reject invalid memory type', async () => {
      const response = await request(app)
        .post('/api/memory')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          key: 'invalid_memory',
          value: 'test',
          type: 'invalid_type',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/memory')
        .send({
          key: 'test',
          value: 'test',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/memory/:key', () => {
    beforeEach(async () => {
      // Create a test memory
      await request(app)
        .post('/api/memory')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          key: 'test_retrieval',
          value: { data: 'test_value' },
          type: 'short_term',
        });
    });

    it('should retrieve a memory by key', async () => {
      const response = await request(app)
        .get('/api/memory/test_retrieval')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.key).toBe('test_retrieval');
      expect(response.body.data.value).toEqual({ data: 'test_value' });
    });

    it('should return 404 for non-existent memory', async () => {
      const response = await request(app)
        .get('/api/memory/non_existent_key')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should increment access count on retrieval', async () => {
      await request(app)
        .get('/api/memory/test_retrieval')
        .set('Authorization', `Bearer ${authToken}`);

      const response = await request(app)
        .get('/api/memory/test_retrieval')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body.data.accessCount).toBeGreaterThan(0);
    });
  });

  describe('GET /api/memory', () => {
    beforeEach(async () => {
      // Create multiple test memories
      const memories = [
        { key: 'stm_1', value: 'short1', type: 'short_term', category: 'test' },
        { key: 'stm_2', value: 'short2', type: 'short_term', category: 'test' },
        { key: 'ltm_1', value: 'long1', type: 'long_term', category: 'preference' },
        { key: 'episodic_1', value: 'event1', type: 'episodic', category: 'history' },
      ];

      for (const memory of memories) {
        await request(app)
          .post('/api/memory')
          .set('Authorization', `Bearer ${authToken}`)
          .send(memory);
      }
    });

    it('should search memories by type', async () => {
      const response = await request(app)
        .get('/api/memory')
        .query({ type: 'short_term' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((m: any) => m.type === 'short_term')).toBe(true);
    });

    it('should search memories by category', async () => {
      const response = await request(app)
        .get('/api/memory')
        .query({ category: 'preference' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].category).toBe('preference');
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/memory')
        .query({ limit: 2 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('GET /api/memory/context', () => {
    beforeEach(async () => {
      // Create context memories
      await request(app)
        .post('/api/memory')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          key: 'genre_preference',
          value: ['action', 'comedy'],
          type: 'long_term',
          category: 'preference',
        });

      await request(app)
        .post('/api/memory')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          key: 'budget_range',
          value: { min: 1000000, max: 5000000 },
          type: 'long_term',
          category: 'requirement',
        });

      await request(app)
        .post('/api/memory')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          key: 'last_search',
          value: 'young male lead',
          type: 'episodic',
          category: 'history',
        });
    });

    it('should retrieve user context', async () => {
      const response = await request(app)
        .get('/api/memory/context')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('preferences');
      expect(response.body.data).toHaveProperty('requirements');
      expect(response.body.data).toHaveProperty('history');
      expect(response.body.data.preferences).toHaveProperty('genre_preference');
      expect(response.body.data.requirements).toHaveProperty('budget_range');
      expect(response.body.data.history).toHaveLength(1);
    });
  });

  describe('PUT /api/memory/:id/promote', () => {
    let stmMemoryId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/memory')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          key: 'promotable_memory',
          value: 'important_data',
          type: 'short_term',
          importance: 3.0,
        });
      
      stmMemoryId = response.body.data.id;
    });

    it('should promote STM to LTM', async () => {
      const response = await request(app)
        .put(`/api/memory/${stmMemoryId}/promote`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.type).toBe('long_term');
      expect(response.body.data.expiresAt).toBeNull();
      expect(parseFloat(response.body.data.importance)).toBeGreaterThanOrEqual(0.7);
    });

    it('should return 404 for non-existent memory', async () => {
      const response = await request(app)
        .put('/api/memory/non-existent-id/promote')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/memory/consolidate', () => {
    beforeEach(async () => {
      // Create multiple STM items with patterns
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/memory')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            key: `search_pattern_${i}`,
            value: 'action movie star',
            type: 'short_term',
            category: 'search',
          });
      }
    });

    it('should consolidate memories', async () => {
      const response = await request(app)
        .post('/api/memory/consolidate')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Memories consolidated successfully');
    });
  });

  describe('GET /api/memory/stats', () => {
    beforeEach(async () => {
      // Create various memories for stats
      await request(app)
        .post('/api/memory')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          key: 'stat_stm',
          value: 'test',
          type: 'short_term',
        });

      await request(app)
        .post('/api/memory')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          key: 'stat_ltm',
          value: 'test',
          type: 'long_term',
        });
    });

    it('should retrieve memory statistics', async () => {
      const response = await request(app)
        .get('/api/memory/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('totalMemories');
      expect(response.body.data).toHaveProperty('shortTermCount');
      expect(response.body.data).toHaveProperty('longTermCount');
      expect(response.body.data).toHaveProperty('averageImportance');
      expect(response.body.data.totalMemories).toBeGreaterThan(0);
    });
  });

  describe('DELETE /api/memory', () => {
    beforeEach(async () => {
      // Create memories to delete
      await request(app)
        .post('/api/memory')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          key: 'deletable_stm',
          value: 'test',
          type: 'short_term',
        });

      await request(app)
        .post('/api/memory')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          key: 'deletable_ltm',
          value: 'test',
          type: 'long_term',
        });
    });

    it('should clear all memories', async () => {
      const response = await request(app)
        .delete('/api/memory')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify memories are deleted
      const searchResponse = await request(app)
        .get('/api/memory')
        .set('Authorization', `Bearer ${authToken}`);

      expect(searchResponse.body.data).toHaveLength(0);
    });

    it('should clear memories by type', async () => {
      const response = await request(app)
        .delete('/api/memory')
        .query({ type: 'short_term' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      // Verify only STM deleted
      const searchResponse = await request(app)
        .get('/api/memory')
        .set('Authorization', `Bearer ${authToken}`);

      expect(searchResponse.body.data).toHaveLength(1);
      expect(searchResponse.body.data[0].type).toBe('long_term');
    });
  });

  describe('POST /api/memory/cleanup', () => {
    it('should clean up expired memories', async () => {
      // Create an expired memory
      await db.insert(memories).values({
        userId,
        key: 'expired_memory',
        value: 'test',
        type: 'short_term',
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      });

      const response = await request(app)
        .post('/api/memory/cleanup')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.deletedCount).toBeGreaterThan(0);
    });
  });
});