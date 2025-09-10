/**
 * Integration Tests for Memory API Endpoints
 * Tests the complete memory system API including episodic, semantic, and procedural memory
 */

import request from 'supertest';
import express from 'express';
import { db } from '../../src/config/database';
import { CacheManager } from '../../src/config/redis';
import { app } from '../../src/server';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

// Test helpers
const generateAuthToken = (userId: string = 'test-user-123') => {
  return jwt.sign(
    { id: userId, email: 'test@castmatch.com' },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

describe('Memory API Integration Tests', () => {
  let authToken: string;
  let testUserId: string;
  let testSessionId: string;

  beforeAll(async () => {
    // Setup test database connection
    await db.initialize();
    await CacheManager.connect();
  });

  afterAll(async () => {
    // Cleanup
    await db.close();
    await CacheManager.disconnect();
  });

  beforeEach(() => {
    testUserId = uuidv4();
    testSessionId = uuidv4();
    authToken = generateAuthToken(testUserId);
  });

  afterEach(async () => {
    // Clean up test data
    await db.query('DELETE FROM memories WHERE user_id = $1', [testUserId]);
    await CacheManager.flushAll();
  });

  describe('Episodic Memory Endpoints', () => {
    describe('POST /api/memory/episodic', () => {
      it('should store a new episodic memory successfully', async () => {
        const memoryData = {
          userInput: 'Find actors for action movie',
          aiResponse: 'Here are some talented action actors...',
          context: {
            projectType: 'action movie',
            budget: 1000000,
          },
          sentiment: 'positive',
          topics: ['casting', 'action', 'actors'],
          entities: ['action movie', 'actors'],
          importance: 0.8,
        };

        const response = await request(app)
          .post('/api/memory/episodic')
          .set('Authorization', `Bearer ${authToken}`)
          .send(memoryData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          id: expect.any(String),
          userId: testUserId,
          interaction: {
            userInput: memoryData.userInput,
            aiResponse: memoryData.aiResponse,
            context: memoryData.context,
          },
          metadata: {
            sentiment: memoryData.sentiment,
            topics: memoryData.topics,
            entities: memoryData.entities,
            importance: memoryData.importance,
          },
        });
      });

      it('should validate required fields', async () => {
        const invalidData = {
          // Missing required fields
          context: { test: true },
        };

        const response = await request(app)
          .post('/api/memory/episodic')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.errors).toContainEqual(
          expect.objectContaining({
            msg: 'User input is required',
            path: 'userInput',
          })
        );
      });

      it('should enforce rate limiting', async () => {
        const memoryData = {
          userInput: 'Test',
          aiResponse: 'Response',
        };

        // Make multiple rapid requests
        const requests = Array(15).fill(null).map(() =>
          request(app)
            .post('/api/memory/episodic')
            .set('Authorization', `Bearer ${authToken}`)
            .send(memoryData)
        );

        const responses = await Promise.all(requests);
        const tooManyRequests = responses.filter(r => r.status === 429);
        
        expect(tooManyRequests.length).toBeGreaterThan(0);
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .post('/api/memory/episodic')
          .send({
            userInput: 'Test',
            aiResponse: 'Response',
          })
          .expect(401);

        expect(response.body.error).toContain('authentication');
      });
    });

    describe('GET /api/memory/episodic', () => {
      beforeEach(async () => {
        // Create test memories
        const memories = [
          {
            userInput: 'Find comedy actors',
            aiResponse: 'Comedy actors list',
            topics: ['comedy', 'actors'],
            importance: 0.7,
            timestamp: new Date('2024-01-01'),
          },
          {
            userInput: 'Schedule audition',
            aiResponse: 'Audition scheduled',
            topics: ['audition', 'scheduling'],
            importance: 0.9,
            timestamp: new Date('2024-01-02'),
          },
          {
            userInput: 'Budget discussion',
            aiResponse: 'Budget details',
            topics: ['budget', 'finance'],
            importance: 0.5,
            timestamp: new Date('2024-01-03'),
          },
        ];

        for (const memory of memories) {
          await request(app)
            .post('/api/memory/episodic')
            .set('Authorization', `Bearer ${authToken}`)
            .send(memory);
        }
      });

      it('should query memories by topics', async () => {
        const response = await request(app)
          .get('/api/memory/episodic')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ topics: 'actors' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
        expect(response.body.data[0].metadata.topics).toContain('actors');
      });

      it('should filter by importance threshold', async () => {
        const response = await request(app)
          .get('/api/memory/episodic')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ minImportance: 0.7 })
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.forEach((memory: any) => {
          expect(memory.metadata.importance).toBeGreaterThanOrEqual(0.7);
        });
      });

      it('should filter by date range', async () => {
        const response = await request(app)
          .get('/api/memory/episodic')
          .set('Authorization', `Bearer ${authToken}`)
          .query({
            startTime: '2024-01-01T00:00:00Z',
            endTime: '2024-01-02T23:59:59Z',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBeLessThanOrEqual(2);
      });

      it('should respect limit parameter', async () => {
        const response = await request(app)
          .get('/api/memory/episodic')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ limit: 2 })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBeLessThanOrEqual(2);
      });
    });

    describe('GET /api/memory/episodic/context', () => {
      it('should retrieve recent context for session', async () => {
        // Store some memories
        await request(app)
          .post('/api/memory/episodic')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            userInput: 'Context test 1',
            aiResponse: 'Response 1',
            sessionId: testSessionId,
          });

        await request(app)
          .post('/api/memory/episodic')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            userInput: 'Context test 2',
            aiResponse: 'Response 2',
            sessionId: testSessionId,
          });

        const response = await request(app)
          .get('/api/memory/episodic/context')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ sessionId: testSessionId })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.memories).toHaveLength(2);
        expect(response.body.data.summary).toBeDefined();
      });
    });

    describe('DELETE /api/memory/episodic/session/:sessionId', () => {
      it('should clear memories for a specific session', async () => {
        // Store memories
        await request(app)
          .post('/api/memory/episodic')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            userInput: 'To be deleted',
            aiResponse: 'Will be removed',
            sessionId: testSessionId,
          });

        // Delete session memories
        const response = await request(app)
          .delete(`/api/memory/episodic/session/${testSessionId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('cleared');

        // Verify deletion
        const queryResponse = await request(app)
          .get('/api/memory/episodic')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ sessionId: testSessionId })
          .expect(200);

        expect(queryResponse.body.data).toHaveLength(0);
      });
    });
  });

  describe('Semantic Memory Endpoints', () => {
    describe('POST /api/memory/semantic/entity', () => {
      it('should create a semantic entity', async () => {
        const entityData = {
          type: 'person',
          name: 'John Doe',
          description: 'Talented action actor',
          attributes: {
            age: 35,
            experience: '10 years',
            specialties: ['action', 'drama'],
          },
          confidence: 0.9,
        };

        const response = await request(app)
          .post('/api/memory/semantic/entity')
          .set('Authorization', `Bearer ${authToken}`)
          .send(entityData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          id: expect.any(String),
          type: entityData.type,
          name: entityData.name,
          attributes: entityData.attributes,
        });
      });

      it('should validate entity type', async () => {
        const invalidEntity = {
          type: 'invalid_type',
          name: 'Test',
        };

        const response = await request(app)
          .post('/api/memory/semantic/entity')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidEntity)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.errors[0].msg).toContain('Invalid entity type');
      });
    });

    describe('POST /api/memory/semantic/relation', () => {
      it('should create a relation between entities', async () => {
        // Create two entities first
        const entity1Response = await request(app)
          .post('/api/memory/semantic/entity')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'person',
            name: 'Actor A',
          });

        const entity2Response = await request(app)
          .post('/api/memory/semantic/entity')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'project',
            name: 'Movie X',
          });

        const relationData = {
          sourceId: entity1Response.body.data.id,
          targetId: entity2Response.body.data.id,
          relationType: 'works_on',
          strength: 0.8,
          metadata: {
            role: 'lead',
            startDate: '2024-01-01',
          },
        };

        const response = await request(app)
          .post('/api/memory/semantic/relation')
          .set('Authorization', `Bearer ${authToken}`)
          .send(relationData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          sourceId: relationData.sourceId,
          targetId: relationData.targetId,
          relationType: relationData.relationType,
        });
      });
    });

    describe('GET /api/memory/semantic/graph', () => {
      it('should retrieve the knowledge graph for user', async () => {
        // Create entities and relations
        await request(app)
          .post('/api/memory/semantic/entity')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'person',
            name: 'Test Actor',
          });

        const response = await request(app)
          .get('/api/memory/semantic/graph')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('entities');
        expect(response.body.data).toHaveProperty('relations');
        expect(response.body.data.entities.length).toBeGreaterThan(0);
      });
    });

    describe('GET /api/memory/semantic/search', () => {
      it('should perform semantic search', async () => {
        // Create test entities
        await request(app)
          .post('/api/memory/semantic/entity')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'person',
            name: 'Action Star',
            attributes: { specialty: 'action' },
          });

        const response = await request(app)
          .get('/api/memory/semantic/search')
          .set('Authorization', `Bearer ${authToken}`)
          .query({
            query: 'action actors',
            limit: 10,
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
      });
    });
  });

  describe('Procedural Memory Endpoints', () => {
    describe('POST /api/memory/procedural/pattern', () => {
      it('should create a procedural pattern', async () => {
        const patternData = {
          patternType: 'workflow',
          name: 'Audition Scheduling Workflow',
          description: 'Standard workflow for scheduling auditions',
          trigger: {
            conditions: [
              {
                field: 'intent',
                operator: 'equals',
                value: 'schedule_audition',
              },
            ],
            confidence: 0.8,
          },
          action: {
            type: 'workflow',
            steps: [
              {
                order: 1,
                action: 'check_availability',
                parameters: { calendar: 'auditions' },
              },
              {
                order: 2,
                action: 'send_invitation',
                parameters: { template: 'audition_invite' },
              },
            ],
          },
          context: {
            domain: 'scheduling',
            tags: ['audition', 'calendar'],
          },
        };

        const response = await request(app)
          .post('/api/memory/procedural/pattern')
          .set('Authorization', `Bearer ${authToken}`)
          .send(patternData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          id: expect.any(String),
          userId: testUserId,
          name: patternData.name,
          patternType: patternData.patternType,
        });
      });

      it('should validate pattern structure', async () => {
        const invalidPattern = {
          patternType: 'invalid',
          name: 'Test',
          // Missing required fields
        };

        const response = await request(app)
          .post('/api/memory/procedural/pattern')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidPattern)
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/memory/procedural/execute/:patternId', () => {
      it('should execute a procedural pattern', async () => {
        // Create a pattern first
        const patternResponse = await request(app)
          .post('/api/memory/procedural/pattern')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            patternType: 'response_template',
            name: 'Greeting Template',
            description: 'Standard greeting response',
            trigger: {
              conditions: [
                {
                  field: 'input',
                  operator: 'contains',
                  value: 'hello',
                },
              ],
              confidence: 0.5,
            },
            action: {
              type: 'response',
              template: 'Hello! How can I help you with casting today?',
            },
            context: {
              domain: 'communication',
              tags: ['greeting'],
            },
          });

        const patternId = patternResponse.body.data.id;

        const response = await request(app)
          .post(`/api/memory/procedural/execute/${patternId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            input: 'hello there',
            context: { time: 'morning' },
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.result).toContain('Hello');
      });
    });

    describe('GET /api/memory/procedural/patterns', () => {
      it('should list user patterns', async () => {
        // Create test patterns
        await request(app)
          .post('/api/memory/procedural/pattern')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            patternType: 'behavior',
            name: 'Test Pattern',
            description: 'Test',
            trigger: {
              conditions: [],
              confidence: 0.5,
            },
            action: {
              type: 'response',
              template: 'Test response',
            },
            context: {
              domain: 'test',
              tags: ['test'],
            },
          });

        const response = await request(app)
          .get('/api/memory/procedural/patterns')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ domain: 'test' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
      });
    });

    describe('PUT /api/memory/procedural/pattern/:patternId/feedback', () => {
      it('should update pattern performance based on feedback', async () => {
        // Create a pattern
        const patternResponse = await request(app)
          .post('/api/memory/procedural/pattern')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            patternType: 'workflow',
            name: 'Feedback Test',
            description: 'Test',
            trigger: {
              conditions: [],
              confidence: 0.5,
            },
            action: {
              type: 'response',
              template: 'Test',
            },
            context: {
              domain: 'test',
              tags: [],
            },
          });

        const patternId = patternResponse.body.data.id;

        const response = await request(app)
          .put(`/api/memory/procedural/pattern/${patternId}/feedback`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            rating: 5,
            comment: 'Worked perfectly',
            executionTime: 150,
            success: true,
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.performance.feedback).toHaveLength(1);
      });
    });
  });

  describe('Memory Consolidation Endpoints', () => {
    describe('POST /api/memory/consolidate', () => {
      it('should trigger memory consolidation', async () => {
        // Create multiple memories
        for (let i = 0; i < 5; i++) {
          await request(app)
            .post('/api/memory/episodic')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              userInput: `Query ${i}`,
              aiResponse: `Response ${i}`,
              topics: ['casting'],
              importance: Math.random(),
            });
        }

        const response = await request(app)
          .post('/api/memory/consolidate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            strategy: 'pattern_extraction',
            threshold: 0.7,
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('consolidatedCount');
        expect(response.body.data).toHaveProperty('patternsExtracted');
      });
    });

    describe('GET /api/memory/stats', () => {
      it('should return comprehensive memory statistics', async () => {
        // Create various types of memories
        await request(app)
          .post('/api/memory/episodic')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            userInput: 'Test',
            aiResponse: 'Response',
          });

        await request(app)
          .post('/api/memory/semantic/entity')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'person',
            name: 'Test Person',
          });

        const response = await request(app)
          .get('/api/memory/stats')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          episodic: {
            total: expect.any(Number),
            averageImportance: expect.any(Number),
          },
          semantic: {
            entities: expect.any(Number),
            relations: expect.any(Number),
          },
          procedural: {
            patterns: expect.any(Number),
            averageSuccessRate: expect.any(Number),
          },
          storage: {
            totalMemories: expect.any(Number),
            storageUsed: expect.any(String),
          },
        });
      });
    });

    describe('DELETE /api/memory/clear', () => {
      it('should clear specific memory types', async () => {
        // Create memories
        await request(app)
          .post('/api/memory/episodic')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            userInput: 'To be cleared',
            aiResponse: 'Will be removed',
          });

        const response = await request(app)
          .delete('/api/memory/clear')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            types: ['episodic'],
            confirm: true,
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('cleared');

        // Verify clearing
        const statsResponse = await request(app)
          .get('/api/memory/stats')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(statsResponse.body.data.episodic.total).toBe(0);
      });

      it('should require confirmation for clearing all memories', async () => {
        const response = await request(app)
          .delete('/api/memory/clear')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            types: ['all'],
            confirm: false,
          })
          .expect(400);

        expect(response.body.error).toContain('confirmation required');
      });
    });
  });

  describe('Cross-Memory Integration', () => {
    it('should integrate episodic memories into semantic knowledge', async () => {
      // Create multiple related episodic memories
      const interactions = [
        {
          userInput: 'I prefer action movies',
          aiResponse: 'Noted your preference for action movies',
          topics: ['preferences', 'action'],
          importance: 0.9,
        },
        {
          userInput: 'My budget is $1 million',
          aiResponse: 'Budget recorded',
          topics: ['budget', 'finance'],
          importance: 0.9,
        },
        {
          userInput: 'Looking for experienced actors',
          aiResponse: 'Searching for experienced actors',
          topics: ['requirements', 'actors'],
          importance: 0.8,
        },
      ];

      for (const interaction of interactions) {
        await request(app)
          .post('/api/memory/episodic')
          .set('Authorization', `Bearer ${authToken}`)
          .send(interaction);
      }

      // Trigger consolidation
      await request(app)
        .post('/api/memory/consolidate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          strategy: 'episodic_to_semantic',
        });

      // Check semantic memory for extracted preferences
      const graphResponse = await request(app)
        .get('/api/memory/semantic/graph')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const preferences = graphResponse.body.data.entities.filter(
        (e: any) => e.type === 'preference'
      );

      expect(preferences.length).toBeGreaterThan(0);
    });

    it('should use procedural patterns based on semantic context', async () => {
      // Create semantic context
      await request(app)
        .post('/api/memory/semantic/entity')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'project',
          name: 'Current Project',
          attributes: {
            type: 'action_movie',
            status: 'casting',
          },
        });

      // Create procedural pattern
      const patternResponse = await request(app)
        .post('/api/memory/procedural/pattern')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patternType: 'workflow',
          name: 'Action Movie Casting',
          description: 'Workflow for action movie casting',
          trigger: {
            conditions: [
              {
                field: 'project.type',
                operator: 'equals',
                value: 'action_movie',
              },
            ],
            confidence: 0.7,
          },
          action: {
            type: 'workflow',
            steps: [
              {
                order: 1,
                action: 'search_action_actors',
              },
              {
                order: 2,
                action: 'check_availability',
              },
            ],
          },
          context: {
            domain: 'casting',
            tags: ['action', 'workflow'],
          },
        });

      // Execute pattern with context
      const executeResponse = await request(app)
        .post(`/api/memory/procedural/execute/${patternResponse.body.data.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          useSemanticContext: true,
        })
        .expect(200);

      expect(executeResponse.body.success).toBe(true);
      expect(executeResponse.body.data.stepsExecuted).toBeGreaterThan(0);
    });
  });

  describe('Memory Performance and Optimization', () => {
    it('should handle concurrent memory operations', async () => {
      const concurrentRequests = Array(20).fill(null).map((_, i) =>
        request(app)
          .post('/api/memory/episodic')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            userInput: `Concurrent test ${i}`,
            aiResponse: `Response ${i}`,
            importance: Math.random(),
          })
      );

      const responses = await Promise.all(concurrentRequests);
      const successfulResponses = responses.filter(r => r.status === 201);

      expect(successfulResponses.length).toBeGreaterThan(15); // Allow some rate limiting
    });

    it('should optimize memory storage by deduplication', async () => {
      const duplicateMemory = {
        userInput: 'Find comedy actors',
        aiResponse: 'Here are comedy actors',
        topics: ['comedy', 'actors'],
      };

      // Store same memory multiple times
      await request(app)
        .post('/api/memory/episodic')
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicateMemory);

      await request(app)
        .post('/api/memory/episodic')
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicateMemory);

      // Check that deduplication occurred
      const response = await request(app)
        .get('/api/memory/episodic')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ topics: 'comedy' })
        .expect(200);

      // Should have deduplicated or merged the memories
      expect(response.body.data.length).toBeLessThanOrEqual(1);
    });

    it('should clean up expired memories automatically', async () => {
      // Create memory with short TTL
      await request(app)
        .post('/api/memory/episodic')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userInput: 'Temporary memory',
          aiResponse: 'Will expire soon',
          ttl: 1, // 1 second
        });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Trigger cleanup
      await request(app)
        .post('/api/memory/cleanup')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify memory is gone
      const response = await request(app)
        .get('/api/memory/episodic')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const temporaryMemory = response.body.data.find(
        (m: any) => m.interaction.userInput === 'Temporary memory'
      );

      expect(temporaryMemory).toBeUndefined();
    });
  });

  describe('Memory Security and Privacy', () => {
    it('should prevent access to other users memories', async () => {
      // Create memory as user A
      const userAToken = generateAuthToken('userA');
      await request(app)
        .post('/api/memory/episodic')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          userInput: 'User A private data',
          aiResponse: 'Response for A',
        });

      // Try to access as user B
      const userBToken = generateAuthToken('userB');
      const response = await request(app)
        .get('/api/memory/episodic')
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(200);

      // Should not contain user A's data
      const userAData = response.body.data.find(
        (m: any) => m.interaction.userInput === 'User A private data'
      );

      expect(userAData).toBeUndefined();
    });

    it('should sanitize user input to prevent injection', async () => {
      const maliciousInput = {
        userInput: '<script>alert("XSS")</script>',
        aiResponse: 'Response',
        context: {
          sql: "'; DROP TABLE memories; --",
        },
      };

      const response = await request(app)
        .post('/api/memory/episodic')
        .set('Authorization', `Bearer ${authToken}`)
        .send(maliciousInput)
        .expect(201);

      // Input should be sanitized
      expect(response.body.data.interaction.userInput).not.toContain('<script>');
      expect(response.body.data.interaction.context.sql).not.toContain('DROP TABLE');
    });

    it('should encrypt sensitive memory data', async () => {
      const sensitiveData = {
        userInput: 'My SSN is 123-45-6789',
        aiResponse: 'I will not store sensitive information',
        metadata: {
          containsSensitiveData: true,
        },
      };

      const response = await request(app)
        .post('/api/memory/episodic')
        .set('Authorization', `Bearer ${authToken}`)
        .send(sensitiveData)
        .expect(201);

      // Sensitive data should be masked or encrypted
      expect(response.body.data.interaction.userInput).not.toContain('123-45-6789');
    });
  });
});