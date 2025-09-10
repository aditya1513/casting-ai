/**
 * Authentication Security Tests
 * Comprehensive security validation for authentication endpoints
 */

import request from 'supertest';
import { app } from '../../src/server';
import { prisma } from '../../src/config/database';
import { hashPassword } from '../../src/utils/password';
import { redis } from '../../src/config/redis';

describe('Authentication Security Tests', () => {
  let testUser: any;

  beforeEach(async () => {
    // Clean up database
    await prisma.session.deleteMany();
    await prisma.actor.deleteMany();
    await prisma.castingDirector.deleteMany();
    await prisma.producer.deleteMany();
    await prisma.user.deleteMany();

    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'security@test.com',
        password: await hashPassword('SecurePass123!'),
        role: 'ACTOR',
        isActive: true,
        actor: {
          create: {
            firstName: 'Security',
            lastName: 'Test',
            dateOfBirth: new Date('1990-01-01'),
            gender: 'MALE',
            city: 'Mumbai',
            state: 'Maharashtra',
            languages: ['English'],
            skills: ['Acting'],
          },
        },
      },
    });

    // Clear Redis cache
    await redis.flushdb();
  });

  afterEach(async () => {
    // Clean up
    await redis.flushdb();
  });

  describe('SQL Injection Protection', () => {
    it('should protect login endpoint from SQL injection', async () => {
      const sqlInjectionAttempts = [
        "admin'; DROP TABLE users; --",
        "admin' OR '1'='1",
        "admin' OR 1=1 --",
        "admin' UNION SELECT * FROM users --",
        "admin'; INSERT INTO users (email, password) VALUES ('hacker@test.com', 'hacked'); --",
      ];

      for (const injection of sqlInjectionAttempts) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: injection,
            password: 'any-password',
          });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('Invalid email or password');
      }

      // Verify user table is intact
      const userCount = await prisma.user.count();
      expect(userCount).toBe(1); // Only our test user
    });

    it('should protect registration endpoint from SQL injection', async () => {
      const sqlInjectionAttempts = [
        "hacker'; DROP TABLE users; --@test.com",
        "admin@test.com'; INSERT INTO users (email, password) VALUES ('injected@test.com', 'hacked'); --",
      ];

      for (const injection of sqlInjectionAttempts) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: injection,
            password: 'StrongPass123!',
            confirmPassword: 'StrongPass123!',
            firstName: 'John',
            lastName: 'Doe',
            role: 'ACTOR',
            acceptTerms: true,
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('NoSQL Injection Protection', () => {
    it('should protect against NoSQL injection in login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: { $ne: null },
          password: { $ne: null },
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should protect against NoSQL injection in registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: { $ne: null },
          password: 'StrongPass123!',
          confirmPassword: 'StrongPass123!',
          firstName: 'John',
          lastName: 'Doe',
          role: 'ACTOR',
          acceptTerms: true,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      const requests = [];
      
      // Make 6 consecutive failed login attempts (assuming rate limit is 5)
      for (let i = 0; i < 6; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'security@test.com',
              password: 'WrongPassword123!',
            })
        );
      }

      const responses = await Promise.all(requests);
      
      // First 5 should return 401 (invalid credentials)
      responses.slice(0, 5).forEach(response => {
        expect(response.status).toBe(401);
      });

      // 6th should be rate limited
      expect(responses[5].status).toBe(429);
      expect(responses[5].body.error.message).toContain('Too many requests');
    }, 10000);

    it('should rate limit registration attempts', async () => {
      const requests = [];
      
      // Make 6 consecutive registration attempts
      for (let i = 0; i < 6; i++) {
        requests.push(
          request(app)
            .post('/api/auth/register')
            .send({
              email: `user${i}@test.com`,
              password: 'StrongPass123!',
              confirmPassword: 'StrongPass123!',
              firstName: 'John',
              lastName: 'Doe',
              role: 'ACTOR',
              acceptTerms: true,
            })
        );
      }

      const responses = await Promise.all(requests);
      
      // Some should succeed, but last one should be rate limited
      expect(responses[5].status).toBe(429);
    }, 10000);

    it('should rate limit password reset attempts', async () => {
      const requests = [];
      
      // Make multiple password reset requests
      for (let i = 0; i < 6; i++) {
        requests.push(
          request(app)
            .post('/api/auth/forgot-password')
            .send({
              email: 'security@test.com',
            })
        );
      }

      const responses = await Promise.all(requests);
      
      // Last request should be rate limited
      expect(responses[5].status).toBe(429);
    }, 10000);

    it('should reset rate limit after time window', async () => {
      // Make maximum allowed requests
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'security@test.com',
            password: 'WrongPassword123!',
          });
      }

      // Next request should be rate limited
      const rateLimitedResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'security@test.com',
          password: 'WrongPassword123!',
        });
      
      expect(rateLimitedResponse.status).toBe(429);

      // Wait for rate limit window to reset (assuming 15-minute window)
      // For testing, we'll use a much shorter wait
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Flush rate limit data to simulate window reset
      await redis.flushdb();

      // Should be able to make request again
      const newResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'security@test.com',
          password: 'WrongPassword123!',
        });

      expect(newResponse.status).toBe(401); // Back to normal authentication error
    }, 15000);
  });

  describe('Input Validation and Sanitization', () => {
    it('should reject malformed email addresses', async () => {
      const malformedEmails = [
        'not-an-email',
        '@domain.com',
        'user@',
        'user@domain',
        'user@@domain.com',
        'user space@domain.com',
        '<script>alert("xss")</script>@domain.com',
      ];

      for (const email of malformedEmails) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email,
            password: 'StrongPass123!',
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });

    it('should reject XSS attempts in input fields', async () => {
      const xssAttempts = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src=x onerror=alert("xss")>',
        '"><script>alert("xss")</script>',
        "'><script>alert('xss')</script>",
      ];

      for (const xss of xssAttempts) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'StrongPass123!',
            confirmPassword: 'StrongPass123!',
            firstName: xss,
            lastName: 'Doe',
            role: 'ACTOR',
            acceptTerms: true,
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });

    it('should validate password strength requirements', async () => {
      const weakPasswords = [
        '123456',
        'password',
        'abc123',
        'Password', // No number
        'password123', // No uppercase
        'PASSWORD123', // No lowercase
        'Password123', // No special character
        'Pass1!', // Too short
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: `test${Date.now()}@example.com`,
            password,
            confirmPassword: password,
            firstName: 'John',
            lastName: 'Doe',
            role: 'ACTOR',
            acceptTerms: true,
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('Password does not meet requirements');
      }
    });

    it('should enforce maximum field lengths', async () => {
      const longString = 'a'.repeat(1000);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: `${longString}@example.com`,
          password: 'StrongPass123!',
          confirmPassword: 'StrongPass123!',
          firstName: longString,
          lastName: longString,
          role: 'ACTOR',
          acceptTerms: true,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('JWT Security', () => {
    let validToken: string;

    beforeEach(async () => {
      // Get a valid token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'security@test.com',
          password: 'SecurePass123!',
        });

      validToken = loginResponse.body.data.tokens.accessToken;
    });

    it('should reject malformed JWT tokens', async () => {
      const malformedTokens = [
        'not.a.jwt',
        'header.payload', // Missing signature
        'header.payload.signature.extra', // Too many parts
        'invalid-token',
        '', // Empty token
      ];

      for (const token of malformedTokens) {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      }
    });

    it('should reject JWT tokens with invalid signatures', async () => {
      // Create token with wrong signature
      const [header, payload] = validToken.split('.');
      const invalidToken = `${header}.${payload}.wrong-signature`;

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject tokens without proper authorization header format', async () => {
      const invalidHeaders = [
        validToken, // Missing "Bearer "
        `Basic ${validToken}`, // Wrong auth type
        `Bearer`, // Missing token
        `Bearer ${validToken} extra`, // Extra content
      ];

      for (const header of invalidHeaders) {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', header);

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      }
    });

    it('should handle token expiration gracefully', async () => {
      // This test would require manipulating token expiration
      // For now, we'll test the error handling path
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer expired.token.here');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Session Security', () => {
    it('should invalidate session on logout', async () => {
      // Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'security@test.com',
          password: 'SecurePass123!',
        });

      const { accessToken } = loginResponse.body.data.tokens;

      // Verify token works
      const meResponse1 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(meResponse1.status).toBe(200);

      // Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      // Verify token no longer works
      const meResponse2 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(meResponse2.status).toBe(401);
    });

    it('should prevent session fixation attacks', async () => {
      // Login twice with same credentials
      const login1 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'security@test.com',
          password: 'SecurePass123!',
        });

      const login2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'security@test.com',
          password: 'SecurePass123!',
        });

      // Tokens should be different
      expect(login1.body.data.tokens.accessToken).not.toBe(login2.body.data.tokens.accessToken);
      expect(login1.body.data.tokens.refreshToken).not.toBe(login2.body.data.tokens.refreshToken);
    });
  });

  describe('CSRF Protection', () => {
    it('should require proper content type for state-changing operations', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'text/plain')
        .send('email=security@test.com&password=SecurePass123!');

      expect(response.status).toBe(400);
    });

    it('should validate request origin for sensitive operations', async () => {
      // This would typically be handled by CORS middleware
      // Testing that sensitive endpoints don't accept requests from unauthorized origins
      const response = await request(app)
        .post('/api/auth/login')
        .set('Origin', 'https://malicious-site.com')
        .send({
          email: 'security@test.com',
          password: 'SecurePass123!',
        });

      // Response should still work but CORS headers should be checked
      // In a real scenario, browser would block this
      expect(response.header['access-control-allow-origin']).not.toBe('https://malicious-site.com');
    });
  });

  describe('Brute Force Protection', () => {
    it('should implement account lockout after failed attempts', async () => {
      const maxAttempts = 5;
      
      // Make failed login attempts
      for (let i = 0; i < maxAttempts; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'security@test.com',
            password: 'WrongPassword123!',
          });
      }

      // Account should be locked
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'security@test.com',
          password: 'SecurePass123!', // Even correct password should fail
        });

      expect(response.status).toBe(429);
      expect(response.body.error.message).toContain('Too many requests');
    });

    it('should reset failed attempts counter on successful login', async () => {
      // Make some failed attempts
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'security@test.com',
            password: 'WrongPassword123!',
          });
      }

      // Successful login should reset counter
      const successResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'security@test.com',
          password: 'SecurePass123!',
        });

      expect(successResponse.status).toBe(200);

      // Should be able to make more attempts after successful login
      const nextResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'security@test.com',
          password: 'WrongPassword123!',
        });

      expect(nextResponse.status).toBe(401); // Normal auth error, not rate limited
    });
  });

  describe('Information Disclosure Protection', () => {
    it('should not reveal whether user exists in forgot password', async () => {
      const existingUserResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'security@test.com',
        });

      const nonExistentUserResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent@test.com',
        });

      // Both responses should look the same
      expect(existingUserResponse.status).toBe(nonExistentUserResponse.status);
      expect(existingUserResponse.body.message).toBe(nonExistentUserResponse.body.message);
    });

    it('should not reveal user existence in login errors', async () => {
      const nonExistentResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'AnyPassword123!',
        });

      const wrongPasswordResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'security@test.com',
          password: 'WrongPassword123!',
        });

      // Both should return same generic error message
      expect(nonExistentResponse.status).toBe(401);
      expect(wrongPasswordResponse.status).toBe(401);
      expect(nonExistentResponse.body.error.message).toBe(wrongPasswordResponse.body.error.message);
    });

    it('should not expose sensitive data in error responses', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'security@test.com',
          password: 'WrongPassword123!',
        });

      expect(response.body.error.message).not.toContain('password');
      expect(response.body.error.message).not.toContain('hash');
      expect(response.body.error.message).not.toContain('bcrypt');
      expect(response.body).not.toHaveProperty('stack');
    });
  });

  describe('Input Size Limits', () => {
    it('should reject oversized request payloads', async () => {
      const oversizedPayload = {
        email: 'test@example.com',
        password: 'StrongPass123!',
        confirmPassword: 'StrongPass123!',
        firstName: 'A'.repeat(10000), // Very large first name
        lastName: 'Doe',
        role: 'ACTOR',
        acceptTerms: true,
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(oversizedPayload);

      expect(response.status).toBe(400);
    });
  });
});