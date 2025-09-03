/**
 * OAuth Integration Tests
 * Tests for Google and GitHub OAuth authentication flows
 */

import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import nock from 'nock';
import { AuthService } from '../../../src/services/auth.service';
import { createMockUser, createMockTokens } from '../../factories/user.factory';
import { app } from '../../../src/app';

// Mock external OAuth providers
jest.mock('passport');
jest.mock('../../../src/config/passport');

describe('OAuth Integration Tests', () => {
  let prisma: PrismaClient;
  let authService: AuthService;
  
  beforeAll(async () => {
    // Setup test database connection
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/castmatch_test'
        }
      }
    });
    
    // Clear test data
    await prisma.$executeRaw`TRUNCATE TABLE "User", "UserProfile", "Session" CASCADE`;
    
    authService = new AuthService();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    nock.cleanAll();
  });

  beforeEach(() => {
    // Clear nock interceptors
    nock.cleanAll();
  });

  describe('Google OAuth Flow', () => {
    it('should successfully authenticate with Google OAuth', async () => {
      // Mock Google OAuth token exchange
      nock('https://oauth2.googleapis.com')
        .post('/token')
        .reply(200, {
          access_token: 'google-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: 'google-refresh-token',
          id_token: jwt.sign({
            iss: 'https://accounts.google.com',
            sub: 'google-user-123',
            email: 'user@gmail.com',
            email_verified: true,
            name: 'Test User',
            picture: 'https://example.com/photo.jpg',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600
          }, 'test-secret')
        });

      // Mock Google user info endpoint
      nock('https://www.googleapis.com')
        .get('/oauth2/v2/userinfo')
        .reply(200, {
          id: 'google-user-123',
          email: 'user@gmail.com',
          verified_email: true,
          name: 'Test User',
          given_name: 'Test',
          family_name: 'User',
          picture: 'https://example.com/photo.jpg'
        });

      const response = await request(app)
        .post('/api/auth/oauth/callback')
        .send({
          provider: 'google',
          code: 'google-auth-code',
          state: 'test-state'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data.user.email).toBe('user@gmail.com');
      
      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { email: 'user@gmail.com' }
      });
      expect(user).toBeTruthy();
      expect(user?.isEmailVerified).toBe(true);
    });

    it('should link existing account with Google OAuth', async () => {
      // Create existing user
      const existingUser = await prisma.user.create({
        data: {
          email: 'existing@gmail.com',
          password: 'hashed-password',
          role: 'ACTOR',
          isEmailVerified: true
        }
      });

      // Mock Google OAuth flow
      nock('https://www.googleapis.com')
        .get('/oauth2/v2/userinfo')
        .reply(200, {
          id: 'google-user-456',
          email: 'existing@gmail.com',
          verified_email: true,
          name: 'Existing User'
        });

      const response = await request(app)
        .post('/api/auth/oauth/link')
        .set('Authorization', `Bearer ${createMockTokens().accessToken}`)
        .send({
          provider: 'google',
          accessToken: 'google-access-token'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Verify OAuth provider was linked
      const oauthAccount = await prisma.oAuthAccount.findFirst({
        where: {
          userId: existingUser.id,
          provider: 'GOOGLE'
        }
      });
      expect(oauthAccount).toBeTruthy();
    });

    it('should handle Google OAuth errors gracefully', async () => {
      // Mock failed token exchange
      nock('https://oauth2.googleapis.com')
        .post('/token')
        .reply(400, {
          error: 'invalid_grant',
          error_description: 'Invalid authorization code'
        });

      const response = await request(app)
        .post('/api/auth/oauth/callback')
        .send({
          provider: 'google',
          code: 'invalid-code',
          state: 'test-state'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Authentication failed');
    });
  });

  describe('GitHub OAuth Flow', () => {
    it('should successfully authenticate with GitHub OAuth', async () => {
      // Mock GitHub OAuth token exchange
      nock('https://github.com')
        .post('/login/oauth/access_token')
        .reply(200, {
          access_token: 'github-access-token',
          scope: 'user:email',
          token_type: 'bearer'
        });

      // Mock GitHub user endpoint
      nock('https://api.github.com')
        .get('/user')
        .reply(200, {
          id: 123456,
          login: 'testuser',
          name: 'Test User',
          email: 'user@github.com',
          avatar_url: 'https://avatars.githubusercontent.com/u/123456'
        });

      // Mock GitHub emails endpoint
      nock('https://api.github.com')
        .get('/user/emails')
        .reply(200, [
          {
            email: 'user@github.com',
            primary: true,
            verified: true
          }
        ]);

      const response = await request(app)
        .post('/api/auth/oauth/callback')
        .send({
          provider: 'github',
          code: 'github-auth-code',
          state: 'test-state'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('user@github.com');
      
      // Verify user was created
      const user = await prisma.user.findUnique({
        where: { email: 'user@github.com' }
      });
      expect(user).toBeTruthy();
    });

    it('should handle unverified GitHub email', async () => {
      // Mock GitHub user with unverified email
      nock('https://api.github.com')
        .get('/user')
        .reply(200, {
          id: 789012,
          login: 'unverifieduser',
          email: null
        });

      nock('https://api.github.com')
        .get('/user/emails')
        .reply(200, [
          {
            email: 'unverified@github.com',
            primary: true,
            verified: false
          }
        ]);

      const response = await request(app)
        .post('/api/auth/oauth/callback')
        .send({
          provider: 'github',
          code: 'github-auth-code',
          state: 'test-state'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('verified email');
    });

    it('should merge accounts when email matches', async () => {
      // Create existing user with same email
      const existingUser = await prisma.user.create({
        data: {
          email: 'merge@example.com',
          password: 'hashed-password',
          role: 'CASTING_DIRECTOR',
          isEmailVerified: true
        }
      });

      // Mock GitHub OAuth with matching email
      nock('https://api.github.com')
        .get('/user')
        .reply(200, {
          id: 345678,
          email: 'merge@example.com',
          name: 'Merge User'
        });

      const response = await request(app)
        .post('/api/auth/oauth/callback')
        .send({
          provider: 'github',
          code: 'github-auth-code',
          state: 'test-state'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.user.id).toBe(existingUser.id);
      expect(response.body.data.user.role).toBe('CASTING_DIRECTOR');
    });
  });

  describe('OAuth State Validation', () => {
    it('should validate OAuth state parameter to prevent CSRF', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/callback')
        .send({
          provider: 'google',
          code: 'auth-code',
          state: 'invalid-state'
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Invalid state');
    });

    it('should handle missing state parameter', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/callback')
        .send({
          provider: 'google',
          code: 'auth-code'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('State parameter required');
    });
  });

  describe('OAuth Account Unlinking', () => {
    it('should allow users to unlink OAuth providers', async () => {
      // Create user with OAuth account
      const user = await prisma.user.create({
        data: {
          email: 'unlink@example.com',
          password: 'hashed-password',
          role: 'ACTOR',
          isEmailVerified: true
        }
      });

      await prisma.oAuthAccount.create({
        data: {
          userId: user.id,
          provider: 'GOOGLE',
          providerAccountId: 'google-123',
          accessToken: 'token'
        }
      });

      const response = await request(app)
        .delete('/api/auth/oauth/unlink')
        .set('Authorization', `Bearer ${createMockTokens().accessToken}`)
        .send({
          provider: 'google'
        });

      expect(response.status).toBe(200);
      
      // Verify OAuth account was removed
      const oauthAccount = await prisma.oAuthAccount.findFirst({
        where: {
          userId: user.id,
          provider: 'GOOGLE'
        }
      });
      expect(oauthAccount).toBeNull();
    });

    it('should prevent unlinking last auth method', async () => {
      // Create user with only OAuth (no password)
      const user = await prisma.user.create({
        data: {
          email: 'oauth-only@example.com',
          password: null,
          role: 'ACTOR',
          isEmailVerified: true
        }
      });

      await prisma.oAuthAccount.create({
        data: {
          userId: user.id,
          provider: 'GOOGLE',
          providerAccountId: 'google-456',
          accessToken: 'token'
        }
      });

      const response = await request(app)
        .delete('/api/auth/oauth/unlink')
        .set('Authorization', `Bearer ${createMockTokens().accessToken}`)
        .send({
          provider: 'google'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Cannot unlink last authentication method');
    });
  });

  describe('OAuth Token Refresh', () => {
    it('should refresh expired OAuth tokens', async () => {
      // Mock Google token refresh
      nock('https://oauth2.googleapis.com')
        .post('/token')
        .reply(200, {
          access_token: 'new-access-token',
          expires_in: 3600,
          refresh_token: 'new-refresh-token'
        });

      const user = await prisma.user.create({
        data: {
          email: 'refresh@example.com',
          role: 'ACTOR',
          isEmailVerified: true
        }
      });

      const oauthAccount = await prisma.oAuthAccount.create({
        data: {
          userId: user.id,
          provider: 'GOOGLE',
          providerAccountId: 'google-789',
          accessToken: 'expired-token',
          refreshToken: 'refresh-token',
          expiresAt: new Date(Date.now() - 1000) // Expired
        }
      });

      const response = await request(app)
        .post('/api/auth/oauth/refresh')
        .set('Authorization', `Bearer ${createMockTokens().accessToken}`)
        .send({
          provider: 'google'
        });

      expect(response.status).toBe(200);
      
      // Verify token was updated
      const updatedAccount = await prisma.oAuthAccount.findUnique({
        where: { id: oauthAccount.id }
      });
      expect(updatedAccount?.accessToken).toBe('new-access-token');
    });
  });

  describe('OAuth Scopes and Permissions', () => {
    it('should request appropriate scopes for each provider', async () => {
      const googleAuthUrl = await authService.getOAuthAuthorizationUrl('google', 'test-state');
      expect(googleAuthUrl).toContain('scope=email%20profile');

      const githubAuthUrl = await authService.getOAuthAuthorizationUrl('github', 'test-state');
      expect(githubAuthUrl).toContain('scope=user:email');
    });

    it('should handle insufficient OAuth scopes', async () => {
      // Mock Google OAuth with limited scopes
      nock('https://oauth2.googleapis.com')
        .post('/token')
        .reply(200, {
          access_token: 'limited-token',
          scope: 'openid' // Missing email scope
        });

      const response = await request(app)
        .post('/api/auth/oauth/callback')
        .send({
          provider: 'google',
          code: 'limited-code',
          state: 'test-state'
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Insufficient permissions');
    });
  });
});