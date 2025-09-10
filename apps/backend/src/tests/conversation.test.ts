/**
 * Conversation and Messaging Tests
 * Tests for chat functionality and WebSocket communication
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { io as ioClient, Socket } from 'socket.io-client';
import { app, server } from '../server';
import { db } from '../config/database';
import { users, sessions, conversations, messages } from '../models/schema';
import { authService } from '../services/auth.service.new';
import { config } from '../config/config';

// Test data
const testUser = {
  email: 'chat.test@castmatch.com',
  password: 'Test@1234',
  firstName: 'Chat',
  lastName: 'Tester',
  role: 'casting_director' as const,
};

let accessToken: string;
let userId: string;
let conversationId: string;

describe('Conversation API', () => {
  beforeAll(async () => {
    // Clear test data
    await db.delete(messages);
    await db.delete(conversations);
    await db.delete(sessions);
    await db.delete(users);

    // Register test user and get token
    const authResult = await authService.register(testUser);
    accessToken = authResult.tokens.accessToken;
    userId = authResult.user.id;
  });

  afterAll(async () => {
    // Cleanup
    await db.delete(messages);
    await db.delete(conversations);
    await db.delete(sessions);
    await db.delete(users);
  });

  describe('Conversation Management', () => {
    it('should create a new conversation', async () => {
      const response = await request(app)
        .post('/api/conversations/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Test Conversation',
          description: 'Testing chat functionality',
          context: { type: 'casting_call' },
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Test Conversation');
      expect(response.body.data.userId).toBe(userId);
      
      conversationId = response.body.data.id;
    });

    it('should get user conversations', async () => {
      const response = await request(app)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should get conversation by ID', async () => {
      const response = await request(app)
        .get(`/api/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(conversationId);
    });

    it('should update conversation', async () => {
      const response = await request(app)
        .put(`/api/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Updated Title',
          description: 'Updated description',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Title');
    });

    it('should not allow unauthorized access', async () => {
      await request(app)
        .get(`/api/conversations/${conversationId}`)
        .expect(401);
    });
  });

  describe('Messaging', () => {
    it('should send a message', async () => {
      const response = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          content: 'Hello, this is a test message',
          type: 'text',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe('Hello, this is a test message');
      expect(response.body.data.conversationId).toBe(conversationId);
    });

    it('should get conversation messages', async () => {
      const response = await request(app)
        .get(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should get conversation history with context', async () => {
      const response = await request(app)
        .get(`/api/conversations/${conversationId}/history`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.conversation).toBeDefined();
      expect(response.body.data.messages).toBeInstanceOf(Array);
      expect(response.body.data.context).toBeDefined();
    });

    it('should search messages in conversation', async () => {
      const response = await request(app)
        .get(`/api/conversations/${conversationId}/search`)
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ q: 'test' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('Conversation Statistics', () => {
    it('should get conversation stats', async () => {
      const response = await request(app)
        .get('/api/conversations/stats/overview')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalConversations');
      expect(response.body.data).toHaveProperty('activeConversations');
      expect(response.body.data).toHaveProperty('totalMessages');
    });
  });
});

describe('WebSocket Communication', () => {
  let socket: Socket;
  let secondSocket: Socket;

  beforeAll((done) => {
    // Create WebSocket client
    socket = ioClient(`http://localhost:${config.port}`, {
      auth: {
        token: accessToken,
      },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      done();
    });
  });

  afterAll(() => {
    if (socket) socket.disconnect();
    if (secondSocket) secondSocket.disconnect();
  });

  describe('Connection', () => {
    it('should connect with valid token', (done) => {
      expect(socket.connected).toBe(true);
      done();
    });

    it('should reject connection with invalid token', (done) => {
      const invalidSocket = ioClient(`http://localhost:${config.port}`, {
        auth: {
          token: 'invalid-token',
        },
        transports: ['websocket'],
      });

      invalidSocket.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication');
        invalidSocket.disconnect();
        done();
      });
    });
  });

  describe('Conversation Events', () => {
    it('should join conversation', (done) => {
      socket.emit('conversation:join', { conversationId });

      socket.on('conversation:history', (data) => {
        expect(data.conversationId).toBe(conversationId);
        expect(data.messages).toBeInstanceOf(Array);
        done();
      });
    });

    it('should send message via WebSocket', (done) => {
      socket.on('message:new', (message) => {
        expect(message.content).toBe('WebSocket test message');
        expect(message.conversationId).toBe(conversationId);
        done();
      });

      socket.emit('message:send', {
        conversationId,
        content: 'WebSocket test message',
        type: 'text',
      });
    });

    it('should receive typing indicators', (done) => {
      // Create second socket connection
      secondSocket = ioClient(`http://localhost:${config.port}`, {
        auth: {
          token: accessToken,
        },
        transports: ['websocket'],
      });

      secondSocket.on('connect', () => {
        secondSocket.emit('conversation:join', { conversationId });

        socket.on('typing:update', (data) => {
          expect(data.isTyping).toBe(true);
          expect(data.conversationId).toBe(conversationId);
          done();
        });

        secondSocket.emit('typing:start', { conversationId });
      });
    });

    it('should handle message deletion', (done) => {
      // First send a message
      socket.emit('message:send', {
        conversationId,
        content: 'Message to delete',
        type: 'text',
      });

      socket.on('message:new', (message) => {
        if (message.content === 'Message to delete') {
          // Now delete it
          socket.on('message:deleted', (data) => {
            expect(data.messageId).toBe(message.id);
            expect(data.conversationId).toBe(conversationId);
            done();
          });

          socket.emit('message:delete', { messageId: message.id });
        }
      });
    });

    it('should handle message editing', (done) => {
      // First send a message
      socket.emit('message:send', {
        conversationId,
        content: 'Original message',
        type: 'text',
      });

      socket.on('message:new', (message) => {
        if (message.content === 'Original message') {
          // Now edit it
          socket.on('message:edited', (editedMessage) => {
            expect(editedMessage.id).toBe(message.id);
            expect(editedMessage.content).toBe('Edited message');
            done();
          });

          socket.emit('message:edit', {
            messageId: message.id,
            content: 'Edited message',
          });
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid conversation ID', (done) => {
      socket.on('error', (error) => {
        expect(error.message).toContain('Access denied');
        done();
      });

      socket.emit('conversation:join', {
        conversationId: 'invalid-uuid-format',
      });
    });

    it('should handle unauthorized message send', (done) => {
      socket.on('error', (error) => {
        expect(error.message).toContain('Access denied');
        done();
      });

      // Try to send message to a conversation user doesn't own
      socket.emit('message:send', {
        conversationId: '550e8400-e29b-41d4-a716-446655440000',
        content: 'Unauthorized message',
      });
    });
  });
});

describe('Memory System Integration', () => {
  it('should store conversation context in memory', async () => {
    // Send a message with context
    await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        content: 'Looking for actors aged 25-35 for a lead role',
        type: 'text',
        metadata: {
          intent: 'talent_search',
          criteria: {
            ageRange: [25, 35],
            role: 'lead',
          },
        },
      })
      .expect(201);

    // Update conversation context
    await request(app)
      .put(`/api/conversations/${conversationId}/context`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        context: {
          searchCriteria: {
            ageRange: [25, 35],
            role: 'lead',
          },
        },
      })
      .expect(200);

    // Verify context is stored
    const response = await request(app)
      .get(`/api/conversations/${conversationId}/context`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data.searchCriteria).toBeDefined();
    expect(response.body.data.searchCriteria.ageRange).toEqual([25, 35]);
  });
});