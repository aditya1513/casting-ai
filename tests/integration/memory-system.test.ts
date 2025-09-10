/**
 * Integration Tests for Memory System
 * Tests the complete memory workflow including API endpoints and vector search
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../../src/server';
import { db } from '../../src/db/drizzle';
import { generateTestToken } from '../utils/auth-helper';

describe('Memory System Integration Tests', () => {
  let authToken: string;
  let testUserId: string;
  let testMemoryId: string;

  beforeAll(async () => {
    // Setup test user and auth token
    testUserId = 'test-user-' + Date.now();
    authToken = await generateTestToken(testUserId);
  });

  afterAll(async () => {
    // Cleanup test data
    await db.delete('memories').where({ userId: testUserId });
  });

  describe('POST /api/memory', () => {
    it('should store a new memory', async () => {
      const response = await request(app)
        .post('/api/memory')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          key: 'test-memory-key',
          value: 'This is a test memory content',
          type: 'short_term',
          category: 'test',
          importance: 5.0,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.key).toBe('test-memory-key');
      
      testMemoryId = response.body.data.id;
    });

    it('should reject invalid memory types', async () => {
      const response = await request(app)
        .post('/api/memory')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          key: 'invalid-type-memory',
          value: 'Test content',
          type: 'invalid_type',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/memory')
        .send({
          key: 'unauthenticated-memory',
          value: 'Test content',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/memory/:key', () => {
    it('should retrieve a memory by key', async () => {
      const response = await request(app)
        .get('/api/memory/test-memory-key')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.key).toBe('test-memory-key');
    });

    it('should return 404 for non-existent memory', async () => {
      const response = await request(app)
        .get('/api/memory/non-existent-key')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/memory (search)', () => {
    beforeEach(async () => {
      // Create multiple test memories
      const memories = [
        { key: 'memory-1', value: 'First test memory', type: 'short_term', category: 'test' },
        { key: 'memory-2', value: 'Second test memory', type: 'long_term', category: 'test' },
        { key: 'memory-3', value: 'Third test memory', type: 'episodic', category: 'conversation' },
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
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.every(m => m.type === 'short_term')).toBe(true);
    });

    it('should search memories by category', async () => {
      const response = await request(app)
        .get('/api/memory')
        .query({ category: 'test' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.every(m => m.category === 'test')).toBe(true);
    });

    it('should limit results', async () => {
      const response = await request(app)
        .get('/api/memory')
        .query({ limit: 2 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
    });
  });

  describe('POST /api/memory/semantic-search', () => {
    it('should perform semantic search', async () => {
      // First store a memory with specific content
      await request(app)
        .post('/api/memory')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          key: 'semantic-test',
          value: 'The user likes action movies and sci-fi films',
          type: 'semantic',
          category: 'preferences',
        });

      // Search for similar content
      const response = await request(app)
        .post('/api/memory/semantic-search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'What movies does the user enjoy?',
          limit: 5,
          threshold: 0.5,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('PUT /api/memory/:id/promote', () => {
    it('should promote STM to LTM', async () => {
      // Create a short-term memory
      const createResponse = await request(app)
        .post('/api/memory')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          key: 'stm-to-promote',
          value: 'Important information to remember',
          type: 'short_term',
        });

      const memoryId = createResponse.body.data.id;

      // Promote it to long-term
      const response = await request(app)
        .put(`/api/memory/${memoryId}/promote`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.type).toBe('long_term');
    });
  });

  describe('POST /api/memory/consolidate', () => {
    it('should consolidate user memories', async () => {
      const response = await request(app)
        .post('/api/memory/consolidate')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('consolidated');
    });
  });

  describe('GET /api/memory/stats', () => {
    it('should return memory statistics', async () => {
      const response = await request(app)
        .get('/api/memory/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('totalMemories');
      expect(response.body.data).toHaveProperty('byType');
      expect(response.body.data).toHaveProperty('byCategory');
    });
  });

  describe('DELETE /api/memory', () => {
    it('should clear user memories by type', async () => {
      const response = await request(app)
        .delete('/api/memory')
        .query({ type: 'short_term' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify memories were deleted
      const searchResponse = await request(app)
        .get('/api/memory')
        .query({ type: 'short_term' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(searchResponse.body.data.length).toBe(0);
    });
  });

  describe('Memory Expiration', () => {
    it('should handle expired memories correctly', async () => {
      // This would require time manipulation or mocking
      // For now, just test the includeExpired parameter
      const response = await request(app)
        .get('/api/memory')
        .query({ includeExpired: true })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Conversation Context', () => {
    it('should retrieve memory context for a conversation', async () => {
      const conversationId = 'test-conversation-' + Date.now();
      
      // Store conversation-specific memory
      await request(app)
        .post('/api/memory')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          key: 'conversation-context',
          value: 'User mentioned they need an actor for a commercial',
          conversationId,
          type: 'episodic',
        });

      // Get context
      const response = await request(app)
        .get('/api/memory/context')
        .query({ conversationId })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('shortTermMemories');
      expect(response.body.data).toHaveProperty('longTermMemories');
      expect(response.body.data).toHaveProperty('conversationMemories');
    });
  });
});