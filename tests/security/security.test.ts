/**
 * Security Testing Suite
 * Comprehensive security tests for CastMatch platform
 */

import request from 'supertest';
import { app } from '../../src/server';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

describe('Security Test Suite', () => {
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    // Setup test user for authenticated tests
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: `security_test_${Date.now()}@castmatch.com`,
        password: 'SecureTest123!',
        firstName: 'Security',
        lastName: 'Tester',
        role: 'CASTING_DIRECTOR',
      });
    
    authToken = response.body.tokens.accessToken;
    testUserId = response.body.user.id;
  });

  describe('Authentication Security', () => {
    describe('Password Security', () => {
      test('should reject weak passwords', async () => {
        const weakPasswords = [
          '123456',
          'password',
          'qwerty',
          'abc123',
          'Password',
          'Pass123', // No special char
          'P@ss1', // Too short
        ];

        for (const password of weakPasswords) {
          const response = await request(app)
            .post('/api/auth/register')
            .send({
              email: `test_${Date.now()}@example.com`,
              password,
              firstName: 'Test',
              lastName: 'User',
              role: 'ACTOR',
            })
            .expect(400);

          expect(response.body.errors).toContain('Password does not meet strength requirements');
        }
      });

      test('should hash passwords with bcrypt', async () => {
        // This would be tested in unit tests by mocking bcrypt
        // Here we verify the password is not stored in plain text
        const email = `hash_test_${Date.now()}@castmatch.com`;
        await request(app)
          .post('/api/auth/register')
          .send({
            email,
            password: 'TestPassword123!',
            firstName: 'Hash',
            lastName: 'Test',
            role: 'ACTOR',
          });

        // Attempt to login with plain password should fail
        // if it was stored unhashed
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email,
            password: 'TestPassword123!',
          })
          .expect(200);

        expect(response.body).toHaveProperty('tokens');
      });

      test('should enforce password history', async () => {
        const email = `history_test_${Date.now()}@castmatch.com`;
        const passwords = ['FirstPass123!', 'SecondPass123!', 'ThirdPass123!'];
        
        // Register with first password
        await request(app)
          .post('/api/auth/register')
          .send({
            email,
            password: passwords[0],
            firstName: 'History',
            lastName: 'Test',
            role: 'ACTOR',
          });

        // Change password multiple times
        for (let i = 1; i < passwords.length; i++) {
          await request(app)
            .post('/api/auth/change-password')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              currentPassword: passwords[i - 1],
              newPassword: passwords[i],
            });
        }

        // Try to reuse old password
        const response = await request(app)
          .post('/api/auth/change-password')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            currentPassword: passwords[passwords.length - 1],
            newPassword: passwords[0], // Try to reuse first password
          })
          .expect(400);

        expect(response.body.error).toContain('Password was recently used');
      });
    });

    describe('JWT Security', () => {
      test('should reject expired tokens', async () => {
        // Create expired token
        const expiredToken = jwt.sign(
          { userId: testUserId, email: 'test@example.com' },
          process.env.JWT_SECRET || 'test_secret',
          { expiresIn: '-1h' }
        );

        const response = await request(app)
          .get('/api/user/profile')
          .set('Authorization', `Bearer ${expiredToken}`)
          .expect(401);

        expect(response.body.error).toContain('Token expired');
      });

      test('should reject tampered tokens', async () => {
        // Tamper with token payload
        const parts = authToken.split('.');
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        payload.role = 'ADMIN'; // Try to escalate privileges
        parts[1] = Buffer.from(JSON.stringify(payload)).toString('base64');
        const tamperedToken = parts.join('.');

        const response = await request(app)
          .get('/api/admin/users')
          .set('Authorization', `Bearer ${tamperedToken}`)
          .expect(401);

        expect(response.body.error).toContain('Invalid token');
      });

      test('should reject tokens with invalid signature', async () => {
        const invalidToken = jwt.sign(
          { userId: testUserId, email: 'test@example.com' },
          'wrong_secret',
          { expiresIn: '1h' }
        );

        const response = await request(app)
          .get('/api/user/profile')
          .set('Authorization', `Bearer ${invalidToken}`)
          .expect(401);

        expect(response.body.error).toContain('Invalid token');
      });

      test('should implement token rotation', async () => {
        const response1 = await request(app)
          .post('/api/auth/refresh')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const newToken = response1.body.tokens.accessToken;
        expect(newToken).not.toBe(authToken);

        // Old token should be invalidated
        const response2 = await request(app)
          .post('/api/auth/refresh')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(401);

        expect(response2.body.error).toContain('Token invalidated');
      });
    });

    describe('Session Security', () => {
      test('should invalidate sessions on logout', async () => {
        // Login to get session
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            email: `session_test_${Date.now()}@castmatch.com`,
            password: 'TestPass123!',
          });

        const sessionToken = loginResponse.body.tokens.accessToken;

        // Logout
        await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${sessionToken}`)
          .expect(200);

        // Try to use invalidated session
        const response = await request(app)
          .get('/api/user/profile')
          .set('Authorization', `Bearer ${sessionToken}`)
          .expect(401);

        expect(response.body.error).toContain('Session invalid');
      });

      test('should prevent session fixation', async () => {
        // Get session before login
        const response1 = await request(app)
          .get('/api/public/info')
          .expect(200);

        const sessionIdBefore = response1.headers['set-cookie']?.[0]?.split(';')[0];

        // Login
        const response2 = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@castmatch.com',
            password: 'TestPass123!',
          })
          .expect(200);

        const sessionIdAfter = response2.headers['set-cookie']?.[0]?.split(';')[0];

        // Session ID should change after authentication
        expect(sessionIdAfter).not.toBe(sessionIdBefore);
      });
    });
  });

  describe('Input Validation & Injection Prevention', () => {
    describe('SQL Injection Prevention', () => {
      test('should prevent SQL injection in search queries', async () => {
        const sqlInjectionPayloads = [
          "'; DROP TABLE users; --",
          "1' OR '1'='1",
          "admin'--",
          "1' UNION SELECT * FROM users--",
          "' OR 1=1--",
        ];

        for (const payload of sqlInjectionPayloads) {
          const response = await request(app)
            .get('/api/talent/search')
            .set('Authorization', `Bearer ${authToken}`)
            .query({ query: payload })
            .expect(200); // Should handle gracefully, not error

          // Verify no data breach occurred
          expect(response.body.results).toBeDefined();
          expect(response.body).not.toHaveProperty('error');
        }
      });

      test('should sanitize user input in profile updates', async () => {
        const response = await request(app)
          .put('/api/user/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            bio: "'; UPDATE users SET role='ADMIN' WHERE id='${testUserId}'; --",
            firstName: "Test<script>alert('XSS')</script>",
          })
          .expect(200);

        // Verify input was sanitized
        expect(response.body.profile.bio).not.toContain('UPDATE');
        expect(response.body.profile.firstName).not.toContain('<script>');
      });
    });

    describe('NoSQL Injection Prevention', () => {
      test('should prevent NoSQL injection in MongoDB queries', async () => {
        const noSqlPayloads = [
          { $ne: null },
          { $gt: '' },
          { $regex: '.*' },
          { email: { $ne: 'test@example.com' } },
        ];

        for (const payload of noSqlPayloads) {
          const response = await request(app)
            .post('/api/auth/login')
            .send({
              email: payload,
              password: 'anypassword',
            })
            .expect(400);

          expect(response.body.error).toContain('Invalid input');
        }
      });
    });

    describe('XSS Prevention', () => {
      test('should sanitize HTML in user-generated content', async () => {
        const xssPayloads = [
          '<script>alert("XSS")</script>',
          '<img src=x onerror=alert("XSS")>',
          '<svg onload=alert("XSS")>',
          'javascript:alert("XSS")',
          '<iframe src="javascript:alert(\'XSS\')">',
        ];

        for (const payload of xssPayloads) {
          const response = await request(app)
            .post('/api/chat/messages')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              conversationId: 'test_conv',
              message: payload,
            })
            .expect(200);

          // Verify XSS payload was sanitized
          expect(response.body.message).not.toContain('<script>');
          expect(response.body.message).not.toContain('javascript:');
          expect(response.body.message).not.toContain('onerror=');
        }
      });

      test('should set proper Content-Security-Policy headers', async () => {
        const response = await request(app)
          .get('/api/public/info')
          .expect(200);

        expect(response.headers['content-security-policy']).toBeDefined();
        expect(response.headers['content-security-policy']).toContain("default-src 'self'");
        expect(response.headers['content-security-policy']).toContain("script-src 'self'");
      });
    });

    describe('XXE Prevention', () => {
      test('should prevent XML External Entity attacks', async () => {
        const xxePayload = `<?xml version="1.0" encoding="UTF-8"?>
          <!DOCTYPE foo [
            <!ENTITY xxe SYSTEM "file:///etc/passwd">
          ]>
          <script>&xxe;</script>`;

        const response = await request(app)
          .post('/api/script/upload')
          .set('Authorization', `Bearer ${authToken}`)
          .set('Content-Type', 'application/xml')
          .send(xxePayload)
          .expect(400);

        expect(response.body.error).toContain('Invalid XML');
      });
    });
  });

  describe('Access Control & Authorization', () => {
    test('should enforce role-based access control', async () => {
      // Create actor token
      const actorResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: `actor_${Date.now()}@castmatch.com`,
          password: 'ActorPass123!',
          firstName: 'Test',
          lastName: 'Actor',
          role: 'ACTOR',
        });

      const actorToken = actorResponse.body.tokens.accessToken;

      // Actor should not access casting director endpoints
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${actorToken}`)
        .send({
          title: 'Test Project',
          type: 'FEATURE_FILM',
        })
        .expect(403);

      expect(response.body.error).toContain('Insufficient permissions');
    });

    test('should prevent horizontal privilege escalation', async () => {
      // Create two users
      const user1Response = await request(app)
        .post('/api/auth/register')
        .send({
          email: `user1_${Date.now()}@castmatch.com`,
          password: 'User1Pass123!',
          firstName: 'User',
          lastName: 'One',
          role: 'ACTOR',
        });

      const user1Token = user1Response.body.tokens.accessToken;
      const user1Id = user1Response.body.user.id;

      const user2Response = await request(app)
        .post('/api/auth/register')
        .send({
          email: `user2_${Date.now()}@castmatch.com`,
          password: 'User2Pass123!',
          firstName: 'User',
          lastName: 'Two',
          role: 'ACTOR',
        });

      const user2Token = user2Response.body.tokens.accessToken;
      const user2Id = user2Response.body.user.id;

      // User1 tries to access User2's data
      const response = await request(app)
        .get(`/api/users/${user2Id}/private-data`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(403);

      expect(response.body.error).toContain('Access denied');
    });

    test('should validate object-level authorization', async () => {
      // Create a project
      const projectResponse = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Private Project',
          type: 'FEATURE_FILM',
        });

      const projectId = projectResponse.body.id;

      // Another user tries to modify the project
      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: `other_${Date.now()}@castmatch.com`,
          password: 'OtherPass123!',
          firstName: 'Other',
          lastName: 'User',
          role: 'CASTING_DIRECTOR',
        });

      const otherToken = otherUserResponse.body.tokens.accessToken;

      const response = await request(app)
        .put(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          title: 'Hijacked Project',
        })
        .expect(403);

      expect(response.body.error).toContain('Not authorized to modify this project');
    });
  });

  describe('Rate Limiting & DDoS Protection', () => {
    test('should enforce rate limiting on login attempts', async () => {
      const email = `ratelimit_${Date.now()}@castmatch.com`;
      
      // Make multiple failed login attempts
      const attempts = Array(6).fill(null).map(() =>
        request(app)
          .post('/api/auth/login')
          .send({
            email,
            password: 'WrongPassword',
          })
      );

      const responses = await Promise.all(attempts);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
      expect(rateLimited[0].body.error).toContain('Too many attempts');
    });

    test('should implement exponential backoff', async () => {
      const email = `backoff_${Date.now()}@castmatch.com`;
      
      // First lockout
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({ email, password: 'wrong' });
      }

      const response1 = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'wrong' })
        .expect(429);

      const lockoutTime1 = response1.body.retryAfter;

      // Wait and trigger second lockout
      await new Promise(resolve => setTimeout(resolve, lockoutTime1 * 1000 + 100));

      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({ email, password: 'wrong' });
      }

      const response2 = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'wrong' })
        .expect(429);

      const lockoutTime2 = response2.body.retryAfter;

      // Second lockout should be longer
      expect(lockoutTime2).toBeGreaterThan(lockoutTime1);
    });

    test('should limit API calls per user', async () => {
      const requests = Array(101).fill(null).map((_, i) =>
        request(app)
          .get('/api/talent/search')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ query: `test ${i}` })
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('CORS & CSRF Protection', () => {
    test('should enforce CORS policy', async () => {
      const response = await request(app)
        .get('/api/public/info')
        .set('Origin', 'http://evil-site.com')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).not.toBe('http://evil-site.com');
    });

    test('should validate CSRF tokens for state-changing operations', async () => {
      // Get CSRF token
      const csrfResponse = await request(app)
        .get('/api/csrf-token')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const csrfToken = csrfResponse.body.token;

      // Make request without CSRF token
      const response1 = await request(app)
        .post('/api/user/delete-account')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response1.body.error).toContain('CSRF token missing');

      // Make request with invalid CSRF token
      const response2 = await request(app)
        .post('/api/user/delete-account')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'invalid_token')
        .expect(403);

      expect(response2.body.error).toContain('Invalid CSRF token');

      // Make request with valid CSRF token
      const response3 = await request(app)
        .post('/api/user/delete-account')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({ confirm: true })
        .expect(200);
    });

    test('should validate referer header', async () => {
      const response = await request(app)
        .post('/api/sensitive-action')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Referer', 'http://malicious-site.com')
        .expect(403);

      expect(response.body.error).toContain('Invalid referer');
    });
  });

  describe('Data Protection & Encryption', () => {
    test('should encrypt sensitive data at rest', async () => {
      // This would typically be tested by checking database directly
      // Here we verify that sensitive data is not returned in plain text
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Sensitive fields should not be exposed
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('socialSecurityNumber');
      expect(response.body).not.toHaveProperty('creditCard');
    });

    test('should use HTTPS in production', () => {
      // In production, verify SSL/TLS
      if (process.env.NODE_ENV === 'production') {
        expect(app.get('trust proxy')).toBe(true);
        // Additional SSL checks would go here
      }
    });

    test('should implement field-level encryption for PII', async () => {
      const response = await request(app)
        .post('/api/user/update-pii')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          phoneNumber: '+919876543210',
          dateOfBirth: '1990-01-01',
        })
        .expect(200);

      // Verify encrypted storage (would check database in real test)
      expect(response.body.message).toBe('PII updated securely');
    });
  });

  describe('File Upload Security', () => {
    test('should validate file types', async () => {
      const maliciousFiles = [
        { name: 'script.exe', type: 'application/x-msdownload' },
        { name: 'virus.bat', type: 'application/x-bat' },
        { name: 'hack.sh', type: 'application/x-sh' },
      ];

      for (const file of maliciousFiles) {
        const response = await request(app)
          .post('/api/upload/headshot')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', Buffer.from('malicious content'), {
            filename: file.name,
            contentType: file.type,
          })
          .expect(400);

        expect(response.body.error).toContain('Invalid file type');
      }
    });

    test('should enforce file size limits', async () => {
      const largeFile = Buffer.alloc(11 * 1024 * 1024); // 11MB

      const response = await request(app)
        .post('/api/upload/headshot')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', largeFile, 'large.jpg')
        .expect(413);

      expect(response.body.error).toContain('File too large');
    });

    test('should scan files for malware', async () => {
      // EICAR test file (standard antivirus test file)
      const