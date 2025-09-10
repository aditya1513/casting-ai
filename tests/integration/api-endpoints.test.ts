/**
 * API Endpoints Integration Tests
 * Tests for all backend API endpoints with real service interactions
 */

import request from 'supertest';
import { app } from '../../src/server';
import { CacheManager } from '../../src/config/redis';
import { drizzleDb } from '../../src/config/database';
import jwt from 'jsonwebtoken';

// Test data fixtures
const testUser = {
  email: 'test@castmatch.com',
  password: 'TestPass123!',
  firstName: 'Test',
  lastName: 'User',
  role: 'CASTING_DIRECTOR',
};

const testActor = {
  email: 'actor@castmatch.com',
  password: 'ActorPass123!',
  firstName: 'Test',
  lastName: 'Actor',
  role: 'ACTOR',
};

let authToken: string;
let actorToken: string;
let testUserId: string;
let testActorId: string;
let conversationId: string;

describe('API Integration Tests', () => {
  beforeAll(async () => {
    // Setup test database
    await setupTestDatabase();
    
    // Clear cache
    const cache = new CacheManager();
    await cache.flush();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestDatabase();
  });

  describe('Authentication Endpoints', () => {
    describe('POST /api/auth/register', () => {
      it('should register a new user successfully', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send(testUser)
          .expect(201);

        expect(response.body).toHaveProperty('user');
        expect(response.body).toHaveProperty('tokens');
        expect(response.body.user.email).toBe(testUser.email);
        expect(response.body.user.role).toBe(testUser.role);
        
        testUserId = response.body.user.id;
        authToken = response.body.tokens.accessToken;
      });

      it('should reject duplicate email registration', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send(testUser)
          .expect(409);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('already exists');
      });

      it('should validate required fields', async () => {
        const invalidUser = {
          email: 'invalid',
          password: '123',
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(invalidUser)
          .expect(400);

        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors).toBeInstanceOf(Array);
      });

      it('should register an actor successfully', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send(testActor)
          .expect(201);

        testActorId = response.body.user.id;
        actorToken = response.body.tokens.accessToken;
      });
    });

    describe('POST /api/auth/login', () => {
      it('should login with valid credentials', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: testUser.email,
            password: testUser.password,
          })
          .expect(200);

        expect(response.body).toHaveProperty('user');
        expect(response.body).toHaveProperty('tokens');
        expect(response.body.user.email).toBe(testUser.email);
      });

      it('should reject invalid credentials', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: testUser.email,
            password: 'WrongPassword123!',
          })
          .expect(401);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('Invalid credentials');
      });

      it('should handle rate limiting', async () => {
        // Make multiple failed login attempts
        for (let i = 0; i < 5; i++) {
          await request(app)
            .post('/api/auth/login')
            .send({
              email: 'ratelimit@test.com',
              password: 'wrong',
            });
        }

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'ratelimit@test.com',
            password: 'wrong',
          })
          .expect(429);

        expect(response.body.error).toContain('Too many attempts');
      });
    });

    describe('POST /api/auth/refresh', () => {
      it('should refresh valid token', async () => {
        const response = await request(app)
          .post('/api/auth/refresh')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('tokens');
        expect(response.body.tokens.accessToken).toBeDefined();
      });

      it('should reject invalid token', async () => {
        const response = await request(app)
          .post('/api/auth/refresh')
          .set('Authorization', 'Bearer invalid_token')
          .expect(401);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('POST /api/auth/logout', () => {
      it('should logout successfully', async () => {
        const response = await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Chat/AI Endpoints', () => {
    describe('POST /api/chat/conversations', () => {
      it('should create a new conversation', async () => {
        const response = await request(app)
          .post('/api/chat/conversations')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Casting for New Project',
            context: {
              project: 'Bollywood Romance',
              budget: 1000000,
            },
          })
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('title');
        conversationId = response.body.id;
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .post('/api/chat/conversations')
          .send({ title: 'Test' })
          .expect(401);

        expect(response.body.error).toContain('Authentication required');
      });
    });

    describe('POST /api/chat/messages', () => {
      it('should send message and receive AI response', async () => {
        const response = await request(app)
          .post('/api/chat/messages')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            conversationId,
            message: 'Find me actors for a romantic lead role',
          })
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('response');
        expect(response.body).toHaveProperty('suggestions');
      });

      it('should validate message content', async () => {
        const response = await request(app)
          .post('/api/chat/messages')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            conversationId,
            message: '', // Empty message
          })
          .expect(400);

        expect(response.body.errors).toContain('Message cannot be empty');
      });

      it('should handle long messages', async () => {
        const longMessage = 'a'.repeat(10001);
        const response = await request(app)
          .post('/api/chat/messages')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            conversationId,
            message: longMessage,
          })
          .expect(400);

        expect(response.body.errors).toContain('exceeds maximum length');
      });
    });

    describe('GET /api/chat/conversations/:id/messages', () => {
      it('should retrieve conversation history', async () => {
        const response = await request(app)
          .get(`/api/chat/conversations/${conversationId}/messages`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('messages');
        expect(response.body.messages).toBeInstanceOf(Array);
      });

      it('should paginate conversation history', async () => {
        const response = await request(app)
          .get(`/api/chat/conversations/${conversationId}/messages`)
          .query({ page: 1, limit: 10 })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('pagination');
        expect(response.body.pagination.limit).toBe(10);
      });

      it('should reject unauthorized access', async () => {
        const response = await request(app)
          .get(`/api/chat/conversations/${conversationId}/messages`)
          .set('Authorization', `Bearer ${actorToken}`)
          .expect(403);

        expect(response.body.error).toContain('Access denied');
      });
    });

    describe('POST /api/ai/analyze-script', () => {
      it('should analyze uploaded script', async () => {
        const scriptContent = `
          FADE IN:
          
          INT. COFFEE SHOP - DAY
          
          RAHUL (30s, charming) meets PRIYA (late 20s, independent).
          
          RAHUL
          Is this seat taken?
          
          PRIYA
          (smiling)
          It is now.
        `;

        const response = await request(app)
          .post('/api/ai/analyze-script')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ script: scriptContent })
          .expect(200);

        expect(response.body).toHaveProperty('characters');
        expect(response.body.characters).toBeInstanceOf(Array);
        expect(response.body).toHaveProperty('summary');
      });

      it('should handle file upload', async () => {
        const response = await request(app)
          .post('/api/ai/analyze-script')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('script', Buffer.from('Script content'), 'script.pdf')
          .expect(200);

        expect(response.body).toHaveProperty('characters');
      });
    });
  });

  describe('Talent Management Endpoints', () => {
    describe('GET /api/talent/search', () => {
      it('should search talent with filters', async () => {
        const response = await request(app)
          .get('/api/talent/search')
          .set('Authorization', `Bearer ${authToken}`)
          .query({
            query: 'action hero',
            ageMin: 25,
            ageMax: 40,
            location: 'Mumbai',
          })
          .expect(200);

        expect(response.body).toHaveProperty('results');
        expect(response.body.results).toBeInstanceOf(Array);
        expect(response.body).toHaveProperty('totalCount');
      });

      it('should support AI-powered search', async () => {
        const response = await request(app)
          .get('/api/talent/search')
          .set('Authorization', `Bearer ${authToken}`)
          .query({
            aiQuery: 'Find me someone who looks like young Amitabh',
          })
          .expect(200);

        expect(response.body).toHaveProperty('results');
        expect(response.body).toHaveProperty('aiMatchScores');
      });
    });

    describe('GET /api/talent/:id', () => {
      it('should retrieve talent profile', async () => {
        const response = await request(app)
          .get(`/api/talent/${testActorId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(response.body.id).toBe(testActorId);
        expect(response.body).toHaveProperty('profile');
      });

      it('should include availability calendar', async () => {
        const response = await request(app)
          .get(`/api/talent/${testActorId}`)
          .query({ includeAvailability: true })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('availability');
      });
    });

    describe('PUT /api/talent/profile', () => {
      it('should update actor profile', async () => {
        const profileUpdate = {
          bio: 'Experienced actor with 10 years in industry',
          skills: ['Acting', 'Dancing', 'Martial Arts'],
          languages: ['Hindi', 'English', 'Punjabi'],
        };

        const response = await request(app)
          .put('/api/talent/profile')
          .set('Authorization', `Bearer ${actorToken}`)
          .send(profileUpdate)
          .expect(200);

        expect(response.body.profile.bio).toBe(profileUpdate.bio);
        expect(response.body.profile.skills).toEqual(profileUpdate.skills);
      });

      it('should validate profile updates', async () => {
        const invalidUpdate = {
          age: 'not a number',
          email: 'invalid-email',
        };

        const response = await request(app)
          .put('/api/talent/profile')
          .set('Authorization', `Bearer ${actorToken}`)
          .send(invalidUpdate)
          .expect(400);

        expect(response.body).toHaveProperty('errors');
      });
    });
  });

  describe('Project Management Endpoints', () => {
    let projectId: string;

    describe('POST /api/projects', () => {
      it('should create new project', async () => {
        const project = {
          title: 'New Bollywood Movie',
          type: 'FEATURE_FILM',
          genre: ['Romance', 'Drama'],
          budget: 5000000,
          startDate: '2024-06-01',
          endDate: '2024-08-31',
        };

        const response = await request(app)
          .post('/api/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send(project)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.title).toBe(project.title);
        projectId = response.body.id;
      });

      it('should validate project data', async () => {
        const invalidProject = {
          title: '', // Empty title
          budget: -1000, // Negative budget
        };

        const response = await request(app)
          .post('/api/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidProject)
          .expect(400);

        expect(response.body.errors).toContain('Title is required');
        expect(response.body.errors).toContain('Budget must be positive');
      });
    });

    describe('POST /api/projects/:id/roles', () => {
      it('should add role to project', async () => {
        const role = {
          title: 'Lead Actor',
          description: 'Romantic hero character',
          ageRange: { min: 28, max: 35 },
          gender: 'male',
          compensation: 100000,
        };

        const response = await request(app)
          .post(`/api/projects/${projectId}/roles`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(role)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.title).toBe(role.title);
      });
    });

    describe('POST /api/projects/:id/shortlist', () => {
      it('should add actor to shortlist', async () => {
        const response = await request(app)
          .post(`/api/projects/${projectId}/shortlist`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            actorId: testActorId,
            roleId: 'role_123',
            notes: 'Perfect fit for the role',
          })
          .expect(201);

        expect(response.body.success).toBe(true);
      });

      it('should prevent duplicate shortlisting', async () => {
        const response = await request(app)
          .post(`/api/projects/${projectId}/shortlist`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            actorId: testActorId,
            roleId: 'role_123',
          })
          .expect(409);

        expect(response.body.error).toContain('already shortlisted');
      });
    });
  });

  describe('Audition Scheduling Endpoints', () => {
    let auditionId: string;

    describe('POST /api/auditions', () => {
      it('should schedule an audition', async () => {
        const audition = {
          projectId,
          actorId: testActorId,
          date: '2024-05-15',
          time: '14:00',
          location: 'Studio A, Mumbai',
          duration: 60,
        };

        const response = await request(app)
          .post('/api/auditions')
          .set('Authorization', `Bearer ${authToken}`)
          .send(audition)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.date).toBe(audition.date);
        auditionId = response.body.id;
      });

      it('should check actor availability', async () => {
        const conflictingAudition = {
          projectId,
          actorId: testActorId,
          date: '2024-05-15',
          time: '14:30', // Conflicts with previous audition
          location: 'Studio B',
          duration: 60,
        };

        const response = await request(app)
          .post('/api/auditions')
          .set('Authorization', `Bearer ${authToken}`)
          .send(conflictingAudition)
          .expect(409);

        expect(response.body.error).toContain('scheduling conflict');
      });
    });

    describe('PUT /api/auditions/:id', () => {
      it('should update audition details', async () => {
        const update = {
          time: '15:00',
          notes: 'Please prepare monologue',
        };

        const response = await request(app)
          .put(`/api/auditions/${auditionId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(update)
          .expect(200);

        expect(response.body.time).toBe(update.time);
        expect(response.body.notes).toBe(update.notes);
      });

      it('should notify actor of changes', async () => {
        // Check that notification was sent
        const notifications = await request(app)
          .get('/api/notifications')
          .set('Authorization', `Bearer ${actorToken}`)
          .expect(200);

        expect(notifications.body.items).toContainEqual(
          expect.objectContaining({
            type: 'AUDITION_UPDATED',
            auditionId,
          })
        );
      });
    });
  });

  describe('WebSocket Connections', () => {
    describe('Chat Real-time Updates', () => {
      it('should establish WebSocket connection', (done) => {
        const io = require('socket.io-client');
        const socket = io('http://localhost:3001', {
          auth: { token: authToken },
        });

        socket.on('connect', () => {
          expect(socket.connected).toBe(true);
          socket.disconnect();
          done();
        });
      });

      it('should receive real-time messages', (done) => {
        const io = require('socket.io-client');
        const socket = io('http://localhost:3001', {
          auth: { token: authToken },
        });

        socket.on('message', (data: any) => {
          expect(data).toHaveProperty('content');
          expect(data).toHaveProperty('timestamp');
          socket.disconnect();
          done();
        });

        socket.emit('join_conversation', { conversationId });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/non-existent')
        .expect(404);

      expect(response.body.error).toContain('Not found');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body.error).toContain('Invalid JSON');
    });

    it('should handle server errors gracefully', async () => {
      // Simulate database connection error
      jest.spyOn(drizzleDb, 'select').mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });

      const response = await request(app)
        .get('/api/talent/search')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.error).toContain('Internal server error');
      expect(response.body).not.toHaveProperty('stack'); // Don't expose stack in production
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const requests = [];
      
      // Make 100 requests rapidly
      for (let i = 0; i < 100; i++) {
        requests.push(
          request(app)
            .get('/api/talent/search')
            .set('Authorization', `Bearer ${authToken}`)
            .query({ query: `test ${i}` })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('CORS Configuration', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toContain('POST');
    });
  });
});

// Helper functions
async function setupTestDatabase() {
  // Initialize test database with schema
  // This would typically run migrations or seed data
}

async function cleanupTestDatabase() {
  // Clean up test data
  // This would typically truncate tables or delete test records
}