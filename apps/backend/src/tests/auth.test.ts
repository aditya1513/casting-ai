/**
 * Authentication Service Tests
 * Unit and integration tests for authentication functionality
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../server';
import { db } from '../config/database';
import { users, sessions } from '../models/schema';
import { CacheManager } from '../config/redis';
import { authService } from '../services/auth.service.new';

// Test user data
const testUser = {
  email: 'test@castmatch.com',
  password: 'Test@1234',
  firstName: 'Test',
  lastName: 'User',
  role: 'actor' as const,
};

describe('Authentication Service', () => {
  beforeAll(async () => {
    // Clear test data
    await db.delete(sessions);
    await db.delete(users);
    await CacheManager.flush();
  });

  afterAll(async () => {
    // Cleanup
    await db.delete(sessions);
    await db.delete(users);
    await CacheManager.flush();
  });

  describe('Registration', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user.role).toBe(testUser.role);
      expect(response.body.data.accessToken).toBeDefined();
    });

    it('should not register duplicate email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(400);
    });

    it('should validate password strength', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: 'weak@castmatch.com',
          password: 'weak',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: 'invalid-email',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Login', () => {
    it('should login with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should not login with incorrect password', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword@123',
        })
        .expect(401);
    });

    it('should not login with non-existent email', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@castmatch.com',
          password: testUser.password,
        })
        .expect(401);
    });
  });

  describe('Token Refresh', () => {
    let refreshToken: string;
    let accessToken: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      accessToken = response.body.data.accessToken;
      // Extract refresh token from cookie
      const cookies = response.headers['set-cookie'];
      refreshToken = cookies[0].split(';')[0].split('=')[1];
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.expiresIn).toBe(3600);
    });

    it('should not refresh with invalid refresh token', async () => {
      await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });

  describe('Protected Routes', () => {
    let accessToken: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      accessToken = response.body.data.accessToken;
    });

    it('should access protected route with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(testUser.email);
    });

    it('should not access protected route without token', async () => {
      await request(app)
        .get('/api/auth/me')
        .expect(401);
    });

    it('should not access protected route with invalid token', async () => {
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Password Management', () => {
    it('should request password reset', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle password reset for non-existent email gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@castmatch.com' })
        .expect(200);

      // Should not reveal if email exists
      expect(response.body.success).toBe(true);
    });
  });

  describe('Profile Management', () => {
    let accessToken: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      accessToken = response.body.data.accessToken;
    });

    it('should update user profile', async () => {
      const updates = {
        firstName: 'Updated',
        lastName: 'Name',
        bio: 'Test bio',
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe(updates.firstName);
      expect(response.body.data.lastName).toBe(updates.lastName);
    });

    it('should validate profile update fields', async () => {
      await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          firstName: 'A', // Too short
        })
        .expect(400);
    });
  });

  describe('Logout', () => {
    let accessToken: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      accessToken = response.body.data.accessToken;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify token is invalidated
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });
  });
});

describe('Authentication Service Unit Tests', () => {
  describe('Password Validation', () => {
    it('should validate strong passwords', () => {
      const strongPasswords = [
        'Test@1234',
        'MyP@ssw0rd',
        'Secure#Pass123',
      ];

      strongPasswords.forEach(password => {
        const result = authService.validatePassword(password);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject weak passwords', () => {
      const weakPasswords = [
        'password',
        '12345678',
        'Password', // No special char
        'Pass@word', // No number
        'pass@123', // No uppercase
        'PASS@123', // No lowercase
      ];

      weakPasswords.forEach(password => {
        const result = authService.validatePassword(password);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('Token Generation', () => {
    it('should generate unique session IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        const id = authService.generateSessionId();
        expect(ids.has(id)).toBe(false);
        ids.add(id);
      }
    });
  });
});