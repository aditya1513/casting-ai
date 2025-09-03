import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { app } from '@/server';
import { UserFactory } from '../../factories/userFactory';
import { EmailServiceMock } from '../../mocks/emailService.mock';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

describe('Authentication Endpoints Integration Tests', () => {
  let server: any;

  beforeAll(async () => {
    // Start test server
    server = app.listen(5002);
    
    // Setup email mock
    EmailServiceMock.setup({ trackCalls: true });
    
    // Clean database
    await prisma.$executeRaw`TRUNCATE TABLE "User", "Session", "VerificationToken", "PasswordResetToken" CASCADE`;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    server.close();
  });

  beforeEach(async () => {
    // Clear email mock
    EmailServiceMock.clearSentEmails();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'ACTOR',
        phoneNumber: '+919876543210'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe(userData.email.toLowerCase());
      expect(response.body.data.user).not.toHaveProperty('password');
      
      // Check verification email was sent
      expect(EmailServiceMock.hasEmailBeenSent(userData.email.toLowerCase())).toBe(true);
      
      // Verify user in database
      const dbUser = await prisma.user.findUnique({
        where: { email: userData.email.toLowerCase() }
      });
      expect(dbUser).toBeDefined();
      expect(dbUser?.verified).toBe(false);
    });

    it('should reject duplicate email registration', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'SecurePass123!',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'ACTOR',
        phoneNumber: '+919876543211'
      };

      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Duplicate registration
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already exists');
    });

    it('should validate password requirements', async () => {
      const userData = {
        email: 'weakpass@example.com',
        password: 'weak',
        firstName: 'Test',
        lastName: 'User',
        role: 'ACTOR'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('password');
    });

    it('should validate email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'ACTOR'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('email');
    });

    it('should handle role-specific registration', async () => {
      const castingDirectorData = {
        email: 'director@productionhouse.com',
        password: 'SecurePass123!',
        firstName: 'Director',
        lastName: 'Name',
        role: 'CASTING_DIRECTOR',
        phoneNumber: '+919876543212',
        company: 'Production House Ltd'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(castingDirectorData)
        .expect(201);

      expect(response.body.data.user.role).toBe('CASTING_DIRECTOR');
      expect(response.body.message).toContain('approval');
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser: any;

    beforeEach(async () => {
      // Create verified user for login tests
      const hashedPassword = await bcrypt.hash('TestPass123!', 10);
      testUser = await prisma.user.create({
        data: {
          email: 'logintest@example.com',
          password: hashedPassword,
          firstName: 'Login',
          lastName: 'Test',
          role: 'ACTOR',
          verified: true
        }
      });
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logintest@example.com',
          password: 'TestPass123!'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.id).toBe(testUser.id);
      
      // Verify JWT token
      const decoded = jwt.verify(response.body.data.token, process.env.JWT_SECRET!) as any;
      expect(decoded.userId).toBe(testUser.id);
      expect(decoded.role).toBe('ACTOR');
    });

    it('should fail with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logintest@example.com',
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should fail with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'TestPass123!'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should fail for unverified user', async () => {
      // Create unverified user
      const hashedPassword = await bcrypt.hash('TestPass123!', 10);
      await prisma.user.create({
        data: {
          email: 'unverified@example.com',
          password: hashedPassword,
          firstName: 'Unverified',
          lastName: 'User',
          role: 'ACTOR',
          verified: false
        }
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'unverified@example.com',
          password: 'TestPass123!'
        })
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('not verified');
    });

    it('should handle 2FA authentication', async () => {
      // Create user with 2FA enabled
      const hashedPassword = await bcrypt.hash('TestPass123!', 10);
      const twoFAUser = await prisma.user.create({
        data: {
          email: 'twofa@example.com',
          password: hashedPassword,
          firstName: 'TwoFA',
          lastName: 'User',
          role: 'ACTOR',
          verified: true,
          twoFactorEnabled: true,
          twoFactorSecret: 'JBSWY3DPEHPK3PXP'
        }
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'twofa@example.com',
          password: 'TestPass123!'
        })
        .expect(200);

      expect(response.body.data).toHaveProperty('requiresTwoFactor', true);
      expect(response.body.data).toHaveProperty('tempToken');
      expect(response.body.data).not.toHaveProperty('token');
    });

    it('should track login attempts and implement rate limiting', async () => {
      // Make multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'logintest@example.com',
            password: 'WrongPassword!'
          })
          .expect(401);
      }

      // Next attempt should be rate limited
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logintest@example.com',
          password: 'TestPass123!' // Even with correct password
        })
        .expect(429);

      expect(response.body.error).toContain('Too many attempts');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      // Create user and login
      const hashedPassword = await bcrypt.hash('TestPass123!', 10);
      const user = await prisma.user.create({
        data: {
          email: 'logouttest@example.com',
          password: hashedPassword,
          firstName: 'Logout',
          lastName: 'Test',
          role: 'ACTOR',
          verified: true
        }
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logouttest@example.com',
          password: 'TestPass123!'
        })
        .expect(200);

      const token = loginResponse.body.data.token;

      // Logout
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('logged out');

      // Verify session is deleted
      const session = await prisma.session.findFirst({
        where: { userId: user.id }
      });
      expect(session).toBeNull();
    });
  });

  describe('POST /api/auth/verify-email', () => {
    it('should verify email with valid token', async () => {
      // Create unverified user with verification token
      const user = await prisma.user.create({
        data: {
          email: 'verifytest@example.com',
          password: 'hashedpassword',
          firstName: 'Verify',
          lastName: 'Test',
          role: 'ACTOR',
          verified: false
        }
      });

      const verificationToken = await prisma.verificationToken.create({
        data: {
          token: 'valid-verification-token',
          userId: user.id,
          type: 'EMAIL_VERIFICATION',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      });

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: verificationToken.token })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('verified');

      // Check user is verified in database
      const verifiedUser = await prisma.user.findUnique({
        where: { id: user.id }
      });
      expect(verifiedUser?.verified).toBe(true);
    });

    it('should reject expired verification token', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'expiredverify@example.com',
          password: 'hashedpassword',
          firstName: 'Expired',
          lastName: 'Verify',
          role: 'ACTOR',
          verified: false
        }
      });

      const expiredToken = await prisma.verificationToken.create({
        data: {
          token: 'expired-verification-token',
          userId: user.id,
          type: 'EMAIL_VERIFICATION',
          expiresAt: new Date(Date.now() - 1000) // Already expired
        }
      });

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: expiredToken.token })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('expired');
    });
  });

  describe('Password Reset Flow', () => {
    describe('POST /api/auth/forgot-password', () => {
      it('should send password reset email', async () => {
        const user = await prisma.user.create({
          data: {
            email: 'resettest@example.com',
            password: 'hashedpassword',
            firstName: 'Reset',
            lastName: 'Test',
            role: 'ACTOR',
            verified: true
          }
        });

        const response = await request(app)
          .post('/api/auth/forgot-password')
          .send({ email: 'resettest@example.com' })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.message).toContain('reset email sent');
        
        // Check email was sent
        expect(EmailServiceMock.hasEmailBeenSent('resettest@example.com')).toBe(true);
        
        // Check reset token was created
        const resetToken = await prisma.passwordResetToken.findFirst({
          where: { userId: user.id }
        });
        expect(resetToken).toBeDefined();
      });

      it('should not reveal if email does not exist', async () => {
        const response = await request(app)
          .post('/api/auth/forgot-password')
          .send({ email: 'nonexistent@example.com' })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.message).toContain('If an account exists');
        
        // No email should be sent
        expect(EmailServiceMock.getEmailCount()).toBe(0);
      });
    });

    describe('POST /api/auth/reset-password', () => {
      it('should reset password with valid token', async () => {
        const user = await prisma.user.create({
          data: {
            email: 'resetpassword@example.com',
            password: await bcrypt.hash('OldPassword123!', 10),
            firstName: 'Reset',
            lastName: 'Password',
            role: 'ACTOR',
            verified: true
          }
        });

        const resetToken = await prisma.passwordResetToken.create({
          data: {
            token: 'valid-reset-token',
            userId: user.id,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000)
          }
        });

        const response = await request(app)
          .post('/api/auth/reset-password')
          .send({
            token: resetToken.token,
            password: 'NewPassword123!'
          })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.message).toContain('Password reset successful');

        // Verify can login with new password
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'resetpassword@example.com',
            password: 'NewPassword123!'
          })
          .expect(200);

        expect(loginResponse.body.data).toHaveProperty('token');
      });

      it('should reject expired reset token', async () => {
        const user = await prisma.user.create({
          data: {
            email: 'expiredreset@example.com',
            password: 'hashedpassword',
            firstName: 'Expired',
            lastName: 'Reset',
            role: 'ACTOR',
            verified: true
          }
        });

        const expiredToken = await prisma.passwordResetToken.create({
          data: {
            token: 'expired-reset-token',
            userId: user.id,
            expiresAt: new Date(Date.now() - 1000) // Already expired
          }
        });

        const response = await request(app)
          .post('/api/auth/reset-password')
          .send({
            token: expiredToken.token,
            password: 'NewPassword123!'
          })
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body.error).toContain('expired');
      });
    });
  });

  describe('Social Authentication', () => {
    describe('GET /api/auth/google', () => {
      it('should redirect to Google OAuth', async () => {
        const response = await request(app)
          .get('/api/auth/google')
          .expect(302);

        expect(response.headers.location).toContain('accounts.google.com');
      });
    });

    describe('GET /api/auth/github', () => {
      it('should redirect to GitHub OAuth', async () => {
        const response = await request(app)
          .get('/api/auth/github')
          .expect(302);

        expect(response.headers.location).toContain('github.com/login/oauth');
      });
    });
  });

  describe('Token Management', () => {
    describe('POST /api/auth/refresh', () => {
      it('should refresh access token with valid refresh token', async () => {
        // Create user and login
        const hashedPassword = await bcrypt.hash('TestPass123!', 10);
        const user = await prisma.user.create({
          data: {
            email: 'refreshtest@example.com',
            password: hashedPassword,
            firstName: 'Refresh',
            lastName: 'Test',
            role: 'ACTOR',
            verified: true
          }
        });

        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'refreshtest@example.com',
            password: 'TestPass123!'
          })
          .expect(200);

        const refreshToken = loginResponse.body.data.refreshToken;

        // Refresh token
        const response = await request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('accessToken');
        expect(response.body.data).toHaveProperty('refreshToken');
        
        // New tokens should be different
        expect(response.body.data.accessToken).not.toBe(loginResponse.body.data.token);
      });

      it('should reject invalid refresh token', async () => {
        const response = await request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken: 'invalid-refresh-token' })
          .expect(401);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body.error).toContain('Invalid refresh token');
      });
    });

    describe('GET /api/auth/me', () => {
      it('should return current user info with valid token', async () => {
        // Create user and login
        const hashedPassword = await bcrypt.hash('TestPass123!', 10);
        const user = await prisma.user.create({
          data: {
            email: 'metest@example.com',
            password: hashedPassword,
            firstName: 'Me',
            lastName: 'Test',
            role: 'ACTOR',
            verified: true
          }
        });

        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'metest@example.com',
            password: 'TestPass123!'
          })
          .expect(200);

        const token = loginResponse.body.data.token;

        // Get user info
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.user.id).toBe(user.id);
        expect(response.body.data.user.email).toBe('metest@example.com');
        expect(response.body.data.user).not.toHaveProperty('password');
      });

      it('should reject request without token', async () => {
        const response = await request(app)
          .get('/api/auth/me')
          .expect(401);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body.error).toContain('No token provided');
      });

      it('should reject request with invalid token', async () => {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body.error).toContain('Invalid token');
      });
    });
  });
});