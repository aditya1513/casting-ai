/**
 * JWT Utility Tests
 * Comprehensive tests for JWT token generation, validation, and expiration
 */

import jwt from 'jsonwebtoken';
import {
  generateAccessToken,
  generateRefreshToken,
  generateResetToken,
  generateVerificationToken,
  verifyToken,
  decodeToken,
  generateSessionId,
  getTokenExpiry,
} from '../../../src/utils/jwt';
import { UserRole } from '@prisma/client';

// Mock config
jest.mock('../../../src/config/config', () => ({
  config: {
    jwt: {
      secret: 'test-secret-key',
      accessExpiry: '15m',
      refreshExpiry: '7d',
    },
  },
}));

describe('JWT Utilities', () => {
  const mockUserId = 'user-123';
  const mockEmail = 'test@example.com';
  const mockRole = UserRole.ACTOR;
  const mockSessionId = 'session-123';

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = generateAccessToken(mockUserId, mockEmail, mockRole, mockSessionId);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format
    });

    it('should include correct payload in access token', () => {
      const token = generateAccessToken(mockUserId, mockEmail, mockRole, mockSessionId);
      const decoded = decodeToken(token);

      expect(decoded.userId).toBe(mockUserId);
      expect(decoded.email).toBe(mockEmail);
      expect(decoded.role).toBe(mockRole);
      expect(decoded.sessionId).toBe(mockSessionId);
      expect(decoded.type).toBe('access');
      expect(decoded.iss).toBe('castmatch');
      expect(decoded.aud).toBe('castmatch-api');
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });

    it('should generate different tokens for same user', () => {
      const token1 = generateAccessToken(mockUserId, mockEmail, mockRole, mockSessionId);
      const token2 = generateAccessToken(mockUserId, mockEmail, mockRole, mockSessionId);
      
      expect(token1).not.toBe(token2);
    });

    it('should generate tokens that expire in 15 minutes', () => {
      const token = generateAccessToken(mockUserId, mockEmail, mockRole, mockSessionId);
      const decoded = decodeToken(token);
      
      const expirationTime = decoded.exp * 1000;
      const currentTime = Date.now();
      const timeDifference = expirationTime - currentTime;
      
      // Should expire in approximately 15 minutes (900,000ms)
      expect(timeDifference).toBeGreaterThan(890000); // 14m 50s
      expect(timeDifference).toBeLessThan(910000); // 15m 10s
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = generateRefreshToken(mockUserId, mockSessionId);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include correct payload in refresh token', () => {
      const token = generateRefreshToken(mockUserId, mockSessionId);
      const decoded = decodeToken(token);

      expect(decoded.userId).toBe(mockUserId);
      expect(decoded.sessionId).toBe(mockSessionId);
      expect(decoded.type).toBe('refresh');
      expect(decoded.iss).toBe('castmatch');
      expect(decoded.aud).toBe('castmatch-api');
      expect(decoded.email).toBeUndefined(); // Should not include email
    });

    it('should generate tokens that expire in 7 days', () => {
      const token = generateRefreshToken(mockUserId, mockSessionId);
      const decoded = decodeToken(token);
      
      const expirationTime = decoded.exp * 1000;
      const currentTime = Date.now();
      const timeDifference = expirationTime - currentTime;
      
      // Should expire in approximately 7 days (604,800,000ms)
      expect(timeDifference).toBeGreaterThan(604700000); // ~7 days - buffer
      expect(timeDifference).toBeLessThan(604900000); // ~7 days + buffer
    });
  });

  describe('generateResetToken', () => {
    it('should generate a valid reset token', () => {
      const token = generateResetToken(mockUserId, mockEmail);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include correct payload in reset token', () => {
      const token = generateResetToken(mockUserId, mockEmail);
      const decoded = decodeToken(token);

      expect(decoded.userId).toBe(mockUserId);
      expect(decoded.email).toBe(mockEmail);
      expect(decoded.type).toBe('reset');
      expect(decoded.iss).toBe('castmatch');
      expect(decoded.aud).toBe('castmatch-api');
    });

    it('should generate tokens that expire in 1 hour', () => {
      const token = generateResetToken(mockUserId, mockEmail);
      const decoded = decodeToken(token);
      
      const expirationTime = decoded.exp * 1000;
      const currentTime = Date.now();
      const timeDifference = expirationTime - currentTime;
      
      // Should expire in approximately 1 hour (3,600,000ms)
      expect(timeDifference).toBeGreaterThan(3590000); // 59m 50s
      expect(timeDifference).toBeLessThan(3610000); // 60m 10s
    });
  });

  describe('generateVerificationToken', () => {
    it('should generate a valid verification token', () => {
      const token = generateVerificationToken(mockUserId, mockEmail);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include correct payload in verification token', () => {
      const token = generateVerificationToken(mockUserId, mockEmail);
      const decoded = decodeToken(token);

      expect(decoded.userId).toBe(mockUserId);
      expect(decoded.email).toBe(mockEmail);
      expect(decoded.type).toBe('verification');
      expect(decoded.iss).toBe('castmatch');
      expect(decoded.aud).toBe('castmatch-api');
    });

    it('should generate tokens that expire in 24 hours', () => {
      const token = generateVerificationToken(mockUserId, mockEmail);
      const decoded = decodeToken(token);
      
      const expirationTime = decoded.exp * 1000;
      const currentTime = Date.now();
      const timeDifference = expirationTime - currentTime;
      
      // Should expire in approximately 24 hours (86,400,000ms)
      expect(timeDifference).toBeGreaterThan(86300000); // ~24 hours - buffer
      expect(timeDifference).toBeLessThan(86500000); // ~24 hours + buffer
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode a valid token', () => {
      const token = generateAccessToken(mockUserId, mockEmail, mockRole, mockSessionId);
      const payload = verifyToken(token);

      expect(payload.userId).toBe(mockUserId);
      expect(payload.email).toBe(mockEmail);
      expect(payload.role).toBe(mockRole);
      expect(payload.sessionId).toBe(mockSessionId);
      expect(payload.type).toBe('access');
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        verifyToken('invalid-token');
      }).toThrow();
    });

    it('should throw error for token with wrong secret', () => {
      const fakeToken = jwt.sign(
        { userId: mockUserId, type: 'access' },
        'wrong-secret',
        { expiresIn: '15m', issuer: 'castmatch', audience: 'castmatch-api' }
      );

      expect(() => {
        verifyToken(fakeToken);
      }).toThrow();
    });

    it('should throw error for expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: mockUserId, type: 'access' },
        'test-secret-key',
        { expiresIn: '-1h', issuer: 'castmatch', audience: 'castmatch-api' } // Already expired
      );

      expect(() => {
        verifyToken(expiredToken);
      }).toThrow();
    });

    it('should throw error for token with wrong issuer', () => {
      const wrongIssuerToken = jwt.sign(
        { userId: mockUserId, type: 'access' },
        'test-secret-key',
        { expiresIn: '15m', issuer: 'wrong-issuer', audience: 'castmatch-api' }
      );

      expect(() => {
        verifyToken(wrongIssuerToken);
      }).toThrow();
    });

    it('should throw error for token with wrong audience', () => {
      const wrongAudienceToken = jwt.sign(
        { userId: mockUserId, type: 'access' },
        'test-secret-key',
        { expiresIn: '15m', issuer: 'castmatch', audience: 'wrong-audience' }
      );

      expect(() => {
        verifyToken(wrongAudienceToken);
      }).toThrow();
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const token = generateAccessToken(mockUserId, mockEmail, mockRole, mockSessionId);
      const decoded = decodeToken(token);

      expect(decoded.userId).toBe(mockUserId);
      expect(decoded.email).toBe(mockEmail);
      expect(decoded.role).toBe(mockRole);
      expect(decoded.sessionId).toBe(mockSessionId);
      expect(decoded.type).toBe('access');
    });

    it('should decode invalid token structure', () => {
      const invalidToken = 'invalid.token.structure';
      const decoded = decodeToken(invalidToken);
      
      expect(decoded).toBeNull();
    });

    it('should decode expired token', () => {
      const expiredToken = jwt.sign(
        { userId: mockUserId, type: 'access' },
        'test-secret-key',
        { expiresIn: '-1h', issuer: 'castmatch', audience: 'castmatch-api' }
      );

      const decoded = decodeToken(expiredToken);
      expect(decoded.userId).toBe(mockUserId);
      expect(decoded.exp).toBeLessThan(Date.now() / 1000);
    });
  });

  describe('generateSessionId', () => {
    it('should generate a valid UUID', () => {
      const sessionId = generateSessionId();
      
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it('should generate unique session IDs', () => {
      const sessionId1 = generateSessionId();
      const sessionId2 = generateSessionId();
      
      expect(sessionId1).not.toBe(sessionId2);
    });

    it('should generate multiple unique session IDs', () => {
      const sessionIds = new Set();
      
      for (let i = 0; i < 100; i++) {
        sessionIds.add(generateSessionId());
      }
      
      expect(sessionIds.size).toBe(100);
    });
  });

  describe('getTokenExpiry', () => {
    it('should calculate expiry for seconds', () => {
      const expiry = getTokenExpiry('30s');
      const now = new Date();
      const timeDifference = expiry.getTime() - now.getTime();
      
      expect(timeDifference).toBeGreaterThan(29000);
      expect(timeDifference).toBeLessThan(31000);
    });

    it('should calculate expiry for minutes', () => {
      const expiry = getTokenExpiry('15m');
      const now = new Date();
      const timeDifference = expiry.getTime() - now.getTime();
      
      expect(timeDifference).toBeGreaterThan(890000); // 14m 50s
      expect(timeDifference).toBeLessThan(910000); // 15m 10s
    });

    it('should calculate expiry for hours', () => {
      const expiry = getTokenExpiry('2h');
      const now = new Date();
      const timeDifference = expiry.getTime() - now.getTime();
      
      expect(timeDifference).toBeGreaterThan(7190000); // 1h 59m 50s
      expect(timeDifference).toBeLessThan(7210000); // 2h 0m 10s
    });

    it('should calculate expiry for days', () => {
      const expiry = getTokenExpiry('1d');
      const now = new Date();
      const timeDifference = expiry.getTime() - now.getTime();
      
      expect(timeDifference).toBeGreaterThan(86390000); // 23h 59m 50s
      expect(timeDifference).toBeLessThan(86410000); // 24h 0m 10s
    });

    it('should throw error for invalid format', () => {
      expect(() => {
        getTokenExpiry('invalid');
      }).toThrow('Invalid expiry format');
    });

    it('should throw error for invalid unit', () => {
      expect(() => {
        getTokenExpiry('10x');
      }).toThrow('Invalid time unit');
    });

    it('should throw error for undefined expiry', () => {
      expect(() => {
        getTokenExpiry(undefined);
      }).toThrow('Expiry string is required');
    });

    it('should handle zero values', () => {
      const expiry = getTokenExpiry('0s');
      const now = new Date();
      const timeDifference = Math.abs(expiry.getTime() - now.getTime());
      
      expect(timeDifference).toBeLessThan(1000); // Within 1 second
    });
  });

  describe('Token Security', () => {
    it('should generate tokens with different signatures for same payload', () => {
      const token1 = generateAccessToken(mockUserId, mockEmail, mockRole, mockSessionId);
      // Wait 1ms to ensure different iat
      setTimeout(() => {
        const token2 = generateAccessToken(mockUserId, mockEmail, mockRole, mockSessionId);
        expect(token1).not.toBe(token2);
      }, 1);
    });

    it('should include issuer and audience claims for security', () => {
      const token = generateAccessToken(mockUserId, mockEmail, mockRole, mockSessionId);
      const decoded = decodeToken(token);

      expect(decoded.iss).toBe('castmatch');
      expect(decoded.aud).toBe('castmatch-api');
    });

    it('should include issued at time', () => {
      const beforeToken = Date.now() / 1000;
      const token = generateAccessToken(mockUserId, mockEmail, mockRole, mockSessionId);
      const afterToken = Date.now() / 1000;
      const decoded = decodeToken(token);

      expect(decoded.iat).toBeGreaterThanOrEqual(beforeToken - 1);
      expect(decoded.iat).toBeLessThanOrEqual(afterToken + 1);
    });
  });
});