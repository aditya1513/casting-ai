/**
 * Authentication Security Tests
 * Comprehensive security testing for authentication system
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { app } from '../../src/app';
import { createMockUser } from '../factories/user.factory';
import { AuthService } from '../../src/services/auth.service';

describe('Authentication Security Tests', () => {
  let prisma: PrismaClient;
  let authService: AuthService;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/castmatch_test'
        }
      }
    });
    
    await prisma.$executeRaw`TRUNCATE TABLE "User", "Session", "UserProfile" CASCADE`;
    authService = new AuthService();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('JWT Token Security', () => {
    it('should use strong JWT secret key', () => {
      const jwtSecret = process.env.JWT_SECRET || '';
      expect(jwtSecret.length).toBeGreaterThanOrEqual(32);
      
      // Check entropy
      const entropy = calculateEntropy(jwtSecret);
      expect(entropy).toBeGreaterThan(100); // High entropy requirement
    });

    it('should generate tokens with appropriate expiration', async () => {
      const user = createMockUser();
      const tokens = await authService.generateTokens(user);
      
      const decoded = jwt.decode(tokens.accessToken) as any;
      const expirationTime = decoded.exp - decoded.iat;
      
      // Access token should expire in 15 minutes
      expect(expirationTime).toBe(900);
      
      // Refresh token should have longer expiration
      const refreshDecoded = jwt.decode(tokens.refreshToken) as any;
      const refreshExpiration = refreshDecoded.exp - refreshDecoded.iat;
      expect(refreshExpiration).toBe(604800); // 7 days
    });

    it('should include necessary claims in JWT', async () => {
      const user = createMockUser({
        id: 'user-123',
        email: 'test@castmatch.ai',
        role: 'ACTOR'
      });
      
      const tokens = await authService.generateTokens(user);
      const decoded = jwt.decode(tokens.accessToken) as any;
      
      expect(decoded).toHaveProperty('sub', user.id);
      expect(decoded).toHaveProperty('email', user.email);
      expect(decoded).toHaveProperty('role', user.role);
      expect(decoded).toHaveProperty('iat');
      expect(decoded).toHaveProperty('exp');
      expect(decoded).toHaveProperty('jti'); // JWT ID for tracking
    });

    it('should reject tampered tokens', async () => {
      const user = createMockUser();
      const tokens = await authService.generateTokens(user);
      
      // Tamper with token
      const parts = tokens.accessToken.split('.');
      const payload = Buffer.from(parts[1], 'base64');
      const tamperedPayload = JSON.parse(payload.toString());
      tamperedPayload.role = 'ADMIN'; // Privilege escalation attempt
      
      parts[1] = Buffer.from(JSON.stringify(tamperedPayload)).toString('base64');
      const tamperedToken = parts.join('.');
      
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tamperedToken}`);
      
      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Invalid token');
    });

    it('should reject expired tokens', async () => {
      const expiredToken = jwt.sign(
        {
          sub: 'user-123',
          email: 'test@castmatch.ai',
          role: 'ACTOR'
        },
        process.env.JWT_SECRET!,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );
      
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);
      
      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Token expired');
    });

    it('should prevent JWT algorithm confusion attacks', async () => {
      // Attempt to use 'none' algorithm
      const maliciousToken = jwt.sign(
        {
          sub: 'user-123',
          email: 'attacker@evil.com',
          role: 'ADMIN'
        },
        '',
        { algorithm: 'none' as any }
      );
      
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${maliciousToken}`);
      
      expect(response.status).toBe(401);
    });

    it('should implement token rotation on refresh', async () => {
      const user = await prisma.user.create({
        data: createMockUser()
      });
      
      const initialTokens = await authService.generateTokens(user);
      
      // Wait to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newTokens = await authService.refreshToken(initialTokens.refreshToken);
      
      expect(newTokens.accessToken).not.toBe(initialTokens.accessToken);
      expect(newTokens.refreshToken).not.toBe(initialTokens.refreshToken);
      
      // Old refresh token should be invalidated
      await expect(authService.refreshToken(initialTokens.refreshToken))
        .rejects.toThrow('Invalid refresh token');
    });
  });

  describe('Password Security', () => {
    it('should enforce strong password requirements', async () => {
      const weakPasswords = [
        'password',      // Common password
        '12345678',      // Numbers only
        'abcdefgh',      // Letters only
        'Pass123',       // Too short
        'password123',   // No special characters
        'PASSWORD123!',  // No lowercase
        'password123!',  // No uppercase
      ];
      
      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: `test-${Date.now()}@castmatch.ai`,
            password,
            firstName: 'Test',
            lastName: 'User',
            role: 'ACTOR'
          });
        
        expect(response.status).toBe(400);
        expect(response.body.message).toContain('password');
      }
    });

    it('should accept strong passwords', async () => {
      const strongPasswords = [
        'MySecure@Pass123',
        'C0mpl3x!Password',
        'Str0ng&Secure#2024',
        'P@ssw0rd!WithSymbols'
      ];
      
      for (const password of strongPasswords) {
        const isValid = authService.validatePasswordStrength(password);
        expect(isValid).toBe(true);
      }
    });

    it('should use bcrypt with sufficient rounds', async () => {
      const password = 'TestPassword123!';
      const hash = await bcrypt.hash(password, 12);
      
      // Verify rounds from hash
      const rounds = parseInt(hash.split('$')[2]);
      expect(rounds).toBeGreaterThanOrEqual(12);
    });

    it('should prevent timing attacks on password comparison', async () => {
      const password = 'TestPassword123!';
      const hash = await bcrypt.hash(password, 12);
      
      const timings: number[] = [];
      
      // Measure timing for correct and incorrect passwords
      for (let i = 0; i < 100; i++) {
        const start = process.hrtime.bigint();
        await bcrypt.compare(i % 2 === 0 ? password : 'WrongPassword', hash);
        const end = process.hrtime.bigint();
        timings.push(Number(end - start));
      }
      
      // Timing should be consistent (constant-time comparison)
      const variance = calculateVariance(timings);
      expect(variance).toBeLessThan(1000000); // Low variance expected
    });

    it('should hash passwords uniquely with salt', async () => {
      const password = 'SamePassword123!';
      
      const hash1 = await bcrypt.hash(password, 12);
      const hash2 = await bcrypt.hash(password, 12);
      
      expect(hash1).not.toBe(hash2); // Different salts
      expect(await bcrypt.compare(password, hash1)).toBe(true);
      expect(await bcrypt.compare(password, hash2)).toBe(true);
    });

    it('should prevent password reuse', async () => {
      const user = await prisma.user.create({
        data: {
          ...createMockUser(),
          passwordHistory: [
            await bcrypt.hash('OldPassword1!', 12),
            await bcrypt.hash('OldPassword2!', 12),
            await bcrypt.hash('OldPassword3!', 12)
          ]
        }
      });
      
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${await authService.generateTokens(user).then(t => t.accessToken)}`)
        .send({
          currentPassword: 'CurrentPassword123!',
          newPassword: 'OldPassword2!' // Trying to reuse old password
        });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('previously used');
    });
  });

  describe('Rate Limiting and Brute Force Protection', () => {
    it('should rate limit login attempts by IP', async () => {
      const email = 'ratelimit@castmatch.ai';
      
      // Make multiple rapid login attempts
      const attempts = 10;
      const responses = [];
      
      for (let i = 0; i < attempts; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email,
            password: 'WrongPassword'
          });
        responses.push(response);
      }
      
      // Should be rate limited after 5 attempts
      const blockedResponses = responses.filter(r => r.status === 429);
      expect(blockedResponses.length).toBeGreaterThan(0);
      expect(blockedResponses[0].body.message).toContain('Too many requests');
    });

    it('should implement exponential backoff for failed attempts', async () => {
      const user = await prisma.user.create({
        data: createMockUser({ email: 'backoff@castmatch.ai' })
      });
      
      const attemptDelays: number[] = [];
      
      for (let i = 1; i <= 5; i++) {
        const start = Date.now();
        
        await request(app)
          .post('/api/auth/login')
          .send({
            email: user.email,
            password: 'WrongPassword'
          });
        
        const delay = await authService.getLoginDelay(user.email);
        attemptDelays.push(delay);
        
        // Verify exponential increase
        if (i > 1) {
          expect(delay).toBeGreaterThan(attemptDelays[i - 2]);
        }
      }
      
      // Should follow exponential pattern
      expect(attemptDelays[4]).toBeGreaterThanOrEqual(attemptDelays[0] * 8);
    });

    it('should lock account after multiple failed attempts', async () => {
      const user = await prisma.user.create({
        data: createMockUser({ email: 'lockout@castmatch.ai' })
      });
      
      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: user.email,
            password: 'WrongPassword'
          });
      }
      
      // Account should be locked
      const lockedUser = await prisma.user.findUnique({
        where: { email: user.email }
      });
      
      expect(lockedUser?.lockoutUntil).toBeTruthy();
      expect(lockedUser?.failedLoginAttempts).toBe(5);
      
      // Attempt with correct password should still fail
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'TestPassword123!' // Correct password
        });
      
      expect(response.status).toBe(423); // Locked
      expect(response.body.message).toContain('locked');
    });

    it('should implement CAPTCHA after threshold', async () => {
      const email = 'captcha@castmatch.ai';
      
      // Make 3 failed attempts
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email,
            password: 'WrongPassword'
          });
      }
      
      // Next attempt should require CAPTCHA
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email,
          password: 'TestPassword123!'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('CAPTCHA required');
      expect(response.body.captchaRequired).toBe(true);
    });

    it('should rate limit password reset requests', async () => {
      const email = 'reset-limit@castmatch.ai';
      const responses = [];
      
      // Make multiple password reset requests
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/auth/forgot-password')
          .send({ email });
        responses.push(response);
      }
      
      // Should be rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('CSRF Protection', () => {
    it('should validate CSRF tokens on state-changing requests', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', 'Bearer valid-token')
        .send({
          currentPassword: 'OldPass123!',
          newPassword: 'NewPass123!'
        });
      
      expect(response.status).toBe(403);
      expect(response.body.message).toContain('CSRF');
    });

    it('should generate unique CSRF tokens per session', async () => {
      const session1 = await request(app)
        .get('/api/auth/csrf-token')
        .set('Cookie', 'sessionId=session1');
      
      const session2 = await request(app)
        .get('/api/auth/csrf-token')
        .set('Cookie', 'sessionId=session2');
      
      expect(session1.body.csrfToken).toBeTruthy();
      expect(session2.body.csrfToken).toBeTruthy();
      expect(session1.body.csrfToken).not.toBe(session2.body.csrfToken);
    });

    it('should validate double-submit cookie pattern', async () => {
      const csrfToken = crypto.randomBytes(32).toString('hex');
      
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', `csrf-token=${csrfToken}`)
        .set('X-CSRF-Token', csrfToken);
      
      expect(response.status).not.toBe(403);
    });
  });

  describe('Session Security', () => {
    it('should regenerate session ID on login', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'session@castmatch.ai',
          password: 'TestPassword123!'
        });
      
      const sessionId1 = loginResponse.headers['set-cookie']
        ?.find(c => c.includes('sessionId'))
        ?.split('=')[1]?.split(';')[0];
      
      // Login again
      const loginResponse2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'session@castmatch.ai',
          password: 'TestPassword123!'
        });
      
      const sessionId2 = loginResponse2.headers['set-cookie']
        ?.find(c => c.includes('sessionId'))
        ?.split('=')[1]?.split(';')[0];
      
      expect(sessionId1).not.toBe(sessionId2);
    });

    it('should set secure session cookie attributes', async () => {
      process.env.NODE_ENV = 'production';
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'secure@castmatch.ai',
          password: 'TestPassword123!'
        });
      
      const setCookieHeader = response.headers['set-cookie'];
      const sessionCookie = setCookieHeader?.find(c => c.includes('sessionId'));
      
      expect(sessionCookie).toContain('Secure');
      expect(sessionCookie).toContain('HttpOnly');
      expect(sessionCookie).toContain('SameSite=Strict');
      
      process.env.NODE_ENV = 'test';
    });

    it('should implement session timeout', async () => {
      const user = await prisma.user.create({
        data: createMockUser()
      });
      
      const session = await prisma.session.create({
        data: {
          userId: user.id,
          token: crypto.randomBytes(32).toString('hex'),
          expiresAt: new Date(Date.now() - 1000), // Expired
          userAgent: 'Test',
          ipAddress: '127.0.0.1'
        }
      });
      
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${session.token}`);
      
      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Session expired');
    });

    it('should detect concurrent sessions', async () => {
      const user = await prisma.user.create({
        data: createMockUser()
      });
      
      // Create multiple sessions
      const sessions = await Promise.all([
        authService.createSession(user.id, 'Device1', '1.1.1.1'),
        authService.createSession(user.id, 'Device2', '2.2.2.2'),
        authService.createSession(user.id, 'Device3', '3.3.3.3')
      ]);
      
      const activeSessions = await prisma.session.count({
        where: {
          userId: user.id,
          isActive: true
        }
      });
      
      expect(activeSessions).toBeLessThanOrEqual(2); // Max 2 concurrent sessions
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should prevent SQL injection in login', async () => {
      const sqlInjectionAttempts = [
        "admin' OR '1'='1",
        "admin'; DROP TABLE users; --",
        "' OR 1=1 --",
        "admin' /*",
        "' UNION SELECT * FROM users --"
      ];
      
      for (const attempt of sqlInjectionAttempts) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: attempt,
            password: 'password'
          });
        
        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Invalid email');
      }
    });

    it('should prevent XSS in user inputs', async () => {
      const xssAttempts = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src=x onerror=alert("XSS")>',
        '<svg onload=alert("XSS")>'
      ];
      
      for (const attempt of xssAttempts) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@castmatch.ai',
            password: 'TestPassword123!',
            firstName: attempt,
            lastName: 'User',
            role: 'ACTOR'
          });
        
        if (response.status === 201) {
          // Check that the input was sanitized
          const user = await prisma.user.findUnique({
            where: { email: 'test@castmatch.ai' },
            include: { profile: true }
          });
          
          expect(user?.profile?.firstName).not.toContain('<script>');
          expect(user?.profile?.firstName).not.toContain('javascript:');
        }
      }
    });

    it('should validate email format strictly', async () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user@.com',
        'user@example',
        'user name@example.com',
        'user@exam ple.com'
      ];
      
      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email,
            password: 'TestPassword123!',
            firstName: 'Test',
            lastName: 'User',
            role: 'ACTOR'
          });
        
        expect(response.status).toBe(400);
        expect(response.body.message).toContain('email');
      }
    });
  });
});

// Helper functions
function calculateEntropy(str: string): number {
  const freq: { [key: string]: number } = {};
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }
  
  let entropy = 0;
  const len = str.length;
  
  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  
  return entropy * len;
}

function calculateVariance(numbers: number[]): number {
  const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
}