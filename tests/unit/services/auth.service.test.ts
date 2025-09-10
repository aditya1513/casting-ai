/**
 * Authentication Service Unit Tests
 * Comprehensive tests for auth service business logic
 */

import { AuthService } from '../../../src/services/auth.service';
import { prisma } from '../../../src/config/database';
import { CacheManager } from '../../../src/config/redis';
import {
  hashPassword,
  comparePassword,
  validatePassword,
} from '../../../src/utils/password';
import {
  generateAccessToken,
  generateRefreshToken,
  generateResetToken,
  generateVerificationToken,
  verifyToken,
  generateSessionId,
  getTokenExpiry,
} from '../../../src/utils/jwt';
import {
  ConflictError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
} from '../../../src/utils/errors';
import { UserRole } from '@prisma/client';

// Mock dependencies
jest.mock('../../../src/config/database');
jest.mock('../../../src/config/redis');
jest.mock('../../../src/utils/password');
jest.mock('../../../src/utils/jwt');
jest.mock('../../../src/utils/logger');

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCacheManager = CacheManager as jest.Mocked<typeof CacheManager>;

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerData = {
      email: 'test@example.com',
      phone: '+91234567890',
      password: 'StrongPass123!',
      confirmPassword: 'StrongPass123!',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.ACTOR,
      acceptTerms: true,
    };

    beforeEach(() => {
      (validatePassword as jest.Mock).mockReturnValue({
        isValid: true,
        errors: [],
        strength: 'strong',
      });
      (hashPassword as jest.Mock).mockResolvedValue('hashed-password');
      (generateSessionId as jest.Mock).mockReturnValue('session-id');
      (generateAccessToken as jest.Mock).mockReturnValue('access-token');
      (generateRefreshToken as jest.Mock).mockReturnValue('refresh-token');
      (getTokenExpiry as jest.Mock).mockReturnValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    });

    it('should successfully register a new actor', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: UserRole.ACTOR,
        isEmailVerified: false,
      };

      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          user: {
            create: jest.fn().mockResolvedValue(mockUser),
          },
          actor: {
            create: jest.fn(),
          },
        } as any);
      });
      mockPrisma.session.create.mockResolvedValue({} as any);

      const result = await authService.register(registerData);

      expect(result).toEqual({
        user: {
          id: 'user-id',
          email: 'test@example.com',
          role: UserRole.ACTOR,
          firstName: 'John',
          lastName: 'Doe',
          isEmailVerified: false,
        },
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 900,
        },
      });

      expect(validatePassword).toHaveBeenCalledWith('StrongPass123!');
      expect(hashPassword).toHaveBeenCalledWith('StrongPass123!');
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { email: 'test@example.com' },
            { phone: '+91234567890' },
          ],
        },
      });
    });

    it('should successfully register a new casting director', async () => {
      const cdData = { ...registerData, role: UserRole.CASTING_DIRECTOR };
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: UserRole.CASTING_DIRECTOR,
        isEmailVerified: false,
      };

      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          user: {
            create: jest.fn().mockResolvedValue(mockUser),
          },
          castingDirector: {
            create: jest.fn(),
          },
        } as any);
      });
      mockPrisma.session.create.mockResolvedValue({} as any);

      const result = await authService.register(cdData);

      expect(result.user.role).toBe(UserRole.CASTING_DIRECTOR);
    });

    it('should successfully register a new producer', async () => {
      const producerData = { ...registerData, role: UserRole.PRODUCER };
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: UserRole.PRODUCER,
        isEmailVerified: false,
      };

      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          user: {
            create: jest.fn().mockResolvedValue(mockUser),
          },
          producer: {
            create: jest.fn(),
          },
        } as any);
      });
      mockPrisma.session.create.mockResolvedValue({} as any);

      const result = await authService.register(producerData);

      expect(result.user.role).toBe(UserRole.PRODUCER);
    });

    it('should throw ValidationError for weak password', async () => {
      (validatePassword as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['Password too weak'],
        strength: 'weak',
      });

      await expect(authService.register(registerData)).rejects.toThrow(ValidationError);
      expect(validatePassword).toHaveBeenCalledWith('StrongPass123!');
    });

    it('should throw ConflictError for existing email', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'existing-id',
        email: 'test@example.com',
        phone: null,
      } as any);

      await expect(authService.register(registerData)).rejects.toThrow(ConflictError);
    });

    it('should throw ConflictError for existing phone', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'existing-id',
        email: 'different@example.com',
        phone: '+91234567890',
      } as any);

      await expect(authService.register(registerData)).rejects.toThrow(ConflictError);
    });

    it('should create session with correct data', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: UserRole.ACTOR,
        isEmailVerified: false,
      };

      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          user: { create: jest.fn().mockResolvedValue(mockUser) },
          actor: { create: jest.fn() },
        } as any);
      });
      mockPrisma.session.create.mockResolvedValue({} as any);

      await authService.register(registerData);

      expect(mockPrisma.session.create).toHaveBeenCalledWith({
        data: {
          id: 'session-id',
          userId: 'user-id',
          token: 'refresh-token',
          expiresAt: expect.any(Date),
        },
      });
    });
  });

  describe('login', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'StrongPass123!',
      rememberMe: false,
    };

    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      password: 'hashed-password',
      role: UserRole.ACTOR,
      isActive: true,
      isEmailVerified: true,
      actor: {
        firstName: 'John',
        lastName: 'Doe',
      },
      castingDirector: null,
      producer: null,
    };

    beforeEach(() => {
      (comparePassword as jest.Mock).mockResolvedValue(true);
      (generateSessionId as jest.Mock).mockReturnValue('session-id');
      (generateAccessToken as jest.Mock).mockReturnValue('access-token');
      (generateRefreshToken as jest.Mock).mockReturnValue('refresh-token');
      (getTokenExpiry as jest.Mock).mockReturnValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    });

    it('should successfully login with valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.session.create.mockResolvedValue({} as any);
      mockPrisma.user.update.mockResolvedValue({} as any);
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await authService.login(loginData);

      expect(result).toEqual({
        user: {
          id: 'user-id',
          email: 'test@example.com',
          role: UserRole.ACTOR,
          firstName: 'John',
          lastName: 'Doe',
          isEmailVerified: true,
        },
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 900,
        },
      });

      expect(comparePassword).toHaveBeenCalledWith('StrongPass123!', 'hashed-password');
    });

    it('should throw AuthenticationError for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.login(loginData)).rejects.toThrow(AuthenticationError);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        include: {
          actor: true,
          castingDirector: true,
          producer: true,
        },
      });
    });

    it('should throw AuthenticationError for invalid password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      (comparePassword as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(loginData)).rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for inactive account', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockPrisma.user.findUnique.mockResolvedValue(inactiveUser as any);

      await expect(authService.login(loginData)).rejects.toThrow(AuthenticationError);
    });

    it('should handle casting director login', async () => {
      const cdUser = {
        ...mockUser,
        role: UserRole.CASTING_DIRECTOR,
        actor: null,
        castingDirector: {
          firstName: 'Jane',
          lastName: 'Smith',
        },
        producer: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(cdUser as any);
      mockPrisma.session.create.mockResolvedValue({} as any);
      mockPrisma.user.update.mockResolvedValue({} as any);
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await authService.login(loginData);

      expect(result.user.firstName).toBe('Jane');
      expect(result.user.lastName).toBe('Smith');
    });

    it('should handle producer login', async () => {
      const producerUser = {
        ...mockUser,
        role: UserRole.PRODUCER,
        actor: null,
        castingDirector: null,
        producer: {
          firstName: 'Bob',
          lastName: 'Producer',
        },
      };

      mockPrisma.user.findUnique.mockResolvedValue(producerUser as any);
      mockPrisma.session.create.mockResolvedValue({} as any);
      mockPrisma.user.update.mockResolvedValue({} as any);
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await authService.login(loginData);

      expect(result.user.firstName).toBe('Bob');
      expect(result.user.lastName).toBe('Producer');
    });

    it('should set longer session expiry for remember me', async () => {
      const rememberMeData = { ...loginData, rememberMe: true };
      
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.session.create.mockResolvedValue({} as any);
      mockPrisma.user.update.mockResolvedValue({} as any);
      mockCacheManager.set.mockResolvedValue(undefined);

      await authService.login(rememberMeData);

      expect(getTokenExpiry).toHaveBeenCalledWith('30d');
    });

    it('should update last login timestamp', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.session.create.mockResolvedValue({} as any);
      mockPrisma.user.update.mockResolvedValue({} as any);
      mockCacheManager.set.mockResolvedValue(undefined);

      await authService.login(loginData);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: { lastLoginAt: expect.any(Date) },
      });
    });

    it('should cache session data', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.session.create.mockResolvedValue({} as any);
      mockPrisma.user.update.mockResolvedValue({} as any);
      mockCacheManager.set.mockResolvedValue(undefined);

      await authService.login(loginData);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('user:user-id:session:session-id'),
        { userId: 'user-id', sessionId: 'session-id' },
        3600
      );
    });

    it('should include IP address and user agent in session', async () => {
      const options = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.session.create.mockResolvedValue({} as any);
      mockPrisma.user.update.mockResolvedValue({} as any);
      mockCacheManager.set.mockResolvedValue(undefined);

      await authService.login(loginData, options);

      expect(mockPrisma.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        }),
      });
    });
  });

  describe('refreshToken', () => {
    const refreshToken = 'valid-refresh-token';
    const mockSession = {
      id: 'session-id',
      token: refreshToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      user: {
        id: 'user-id',
        email: 'test@example.com',
        role: UserRole.ACTOR,
      },
    };

    beforeEach(() => {
      (generateAccessToken as jest.Mock).mockReturnValue('new-access-token');
    });

    it('should successfully refresh access token', async () => {
      (verifyToken as jest.Mock).mockReturnValue({
        userId: 'user-id',
        sessionId: 'session-id',
        type: 'refresh',
      });
      mockPrisma.session.findUnique.mockResolvedValue(mockSession as any);

      const result = await authService.refreshToken(refreshToken);

      expect(result).toEqual({
        accessToken: 'new-access-token',
        expiresIn: 900,
      });
    });

    it('should throw AuthenticationError for invalid token', async () => {
      (verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.refreshToken('invalid-token')).rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for wrong token type', async () => {
      (verifyToken as jest.Mock).mockReturnValue({
        userId: 'user-id',
        sessionId: 'session-id',
        type: 'access', // Wrong type
      });

      await expect(authService.refreshToken(refreshToken)).rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for non-existent session', async () => {
      (verifyToken as jest.Mock).mockReturnValue({
        userId: 'user-id',
        sessionId: 'session-id',
        type: 'refresh',
      });
      mockPrisma.session.findUnique.mockResolvedValue(null);

      await expect(authService.refreshToken(refreshToken)).rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for token mismatch', async () => {
      (verifyToken as jest.Mock).mockReturnValue({
        userId: 'user-id',
        sessionId: 'session-id',
        type: 'refresh',
      });
      const mismatchSession = { ...mockSession, token: 'different-token' };
      mockPrisma.session.findUnique.mockResolvedValue(mismatchSession as any);

      await expect(authService.refreshToken(refreshToken)).rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for expired session', async () => {
      (verifyToken as jest.Mock).mockReturnValue({
        userId: 'user-id',
        sessionId: 'session-id',
        type: 'refresh',
      });
      const expiredSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      };
      mockPrisma.session.findUnique.mockResolvedValue(expiredSession as any);

      await expect(authService.refreshToken(refreshToken)).rejects.toThrow(AuthenticationError);
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      mockPrisma.session.delete.mockResolvedValue({} as any);
      mockCacheManager.delete.mockResolvedValue(undefined);

      await authService.logout('user-id', 'session-id');

      expect(mockPrisma.session.delete).toHaveBeenCalledWith({
        where: { id: 'session-id' },
      });
      expect(mockCacheManager.delete).toHaveBeenCalledWith(
        expect.stringContaining('user:user-id:session:session-id')
      );
    });
  });

  describe('forgotPassword', () => {
    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
    };

    beforeEach(() => {
      (generateResetToken as jest.Mock).mockReturnValue('reset-token');
      (getTokenExpiry as jest.Mock).mockReturnValue(new Date(Date.now() + 60 * 60 * 1000));
    });

    it('should generate reset token for existing user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.user.update.mockResolvedValue({} as any);

      await authService.forgotPassword('test@example.com');

      expect(generateResetToken).toHaveBeenCalledWith('user-id', 'test@example.com');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: {
          resetToken: 'reset-token',
          resetTokenExpiry: expect.any(Date),
        },
      });
    });

    it('should not throw error for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.forgotPassword('nonexistent@example.com')).resolves.toBeUndefined();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    const resetToken = 'valid-reset-token';
    const newPassword = 'NewStrongPass123!';
    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      resetToken,
      resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
    };

    beforeEach(() => {
      (validatePassword as jest.Mock).mockReturnValue({
        isValid: true,
        errors: [],
        strength: 'strong',
      });
      (hashPassword as jest.Mock).mockResolvedValue('new-hashed-password');
    });

    it('should successfully reset password', async () => {
      (verifyToken as jest.Mock).mockReturnValue({
        userId: 'user-id',
        email: 'test@example.com',
        type: 'reset',
      });
      mockPrisma.user.findFirst.mockResolvedValue(mockUser as any);
      mockPrisma.user.update.mockResolvedValue({} as any);
      mockPrisma.session.deleteMany.mockResolvedValue({} as any);

      await authService.resetPassword(resetToken, newPassword);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: {
          password: 'new-hashed-password',
          resetToken: null,
          resetTokenExpiry: null,
        },
      });
      expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
      });
    });

    it('should throw ValidationError for weak password', async () => {
      (validatePassword as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['Password too weak'],
        strength: 'weak',
      });

      await expect(authService.resetPassword(resetToken, 'weak')).rejects.toThrow(ValidationError);
    });

    it('should throw AuthenticationError for invalid token', async () => {
      (verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.resetPassword('invalid-token', newPassword)).rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for wrong token type', async () => {
      (verifyToken as jest.Mock).mockReturnValue({
        userId: 'user-id',
        type: 'access', // Wrong type
      });

      await expect(authService.resetPassword(resetToken, newPassword)).rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for expired token', async () => {
      (verifyToken as jest.Mock).mockReturnValue({
        userId: 'user-id',
        email: 'test@example.com',
        type: 'reset',
      });
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(authService.resetPassword(resetToken, newPassword)).rejects.toThrow(AuthenticationError);
    });
  });

  describe('changePassword', () => {
    const userId = 'user-id';
    const currentPassword = 'CurrentPass123!';
    const newPassword = 'NewStrongPass123!';
    const mockUser = {
      id: userId,
      password: 'current-hashed-password',
    };

    beforeEach(() => {
      (validatePassword as jest.Mock).mockReturnValue({
        isValid: true,
        errors: [],
        strength: 'strong',
      });
      (comparePassword as jest.Mock).mockResolvedValue(true);
      (hashPassword as jest.Mock).mockResolvedValue('new-hashed-password');
    });

    it('should successfully change password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.user.update.mockResolvedValue({} as any);

      await authService.changePassword(userId, currentPassword, newPassword);

      expect(comparePassword).toHaveBeenCalledWith(currentPassword, 'current-hashed-password');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { password: 'new-hashed-password' },
      });
    });

    it('should throw ValidationError for weak new password', async () => {
      (validatePassword as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['Password too weak'],
        strength: 'weak',
      });

      await expect(authService.changePassword(userId, currentPassword, 'weak')).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.changePassword('invalid-id', currentPassword, newPassword)).rejects.toThrow(NotFoundError);
    });

    it('should throw AuthenticationError for incorrect current password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      (comparePassword as jest.Mock).mockResolvedValue(false);

      await expect(authService.changePassword(userId, 'wrong-password', newPassword)).rejects.toThrow(AuthenticationError);
    });
  });

  describe('verifyEmail', () => {
    const verificationToken = 'valid-verification-token';

    it('should successfully verify email', async () => {
      (verifyToken as jest.Mock).mockReturnValue({
        userId: 'user-id',
        email: 'test@example.com',
        type: 'verification',
      });
      mockPrisma.user.update.mockResolvedValue({} as any);

      await authService.verifyEmail(verificationToken);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: { isEmailVerified: true },
      });
    });

    it('should throw AuthenticationError for invalid token', async () => {
      (verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.verifyEmail('invalid-token')).rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for wrong token type', async () => {
      (verifyToken as jest.Mock).mockReturnValue({
        userId: 'user-id',
        type: 'access', // Wrong type
      });

      await expect(authService.verifyEmail(verificationToken)).rejects.toThrow(AuthenticationError);
    });
  });

  describe('getCurrentUser', () => {
    const userId = 'user-id';
    const mockUser = {
      id: userId,
      email: 'test@example.com',
      phone: '+1234567890',
      role: UserRole.ACTOR,
      isEmailVerified: true,
      isPhoneVerified: false,
      isActive: true,
      lastLoginAt: new Date(),
      createdAt: new Date(),
      actor: {
        firstName: 'John',
        lastName: 'Doe',
        displayName: 'John Doe',
        profileImageUrl: 'https://example.com/image.jpg',
        isVerified: true,
      },
      castingDirector: null,
      producer: null,
    };

    it('should successfully get current user data', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

      const result = await authService.getCurrentUser(userId);

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: expect.objectContaining({
          id: true,
          email: true,
          phone: true,
          role: true,
          isEmailVerified: true,
          isPhoneVerified: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          actor: { select: expect.any(Object) },
          castingDirector: { select: expect.any(Object) },
          producer: { select: expect.any(Object) },
        }),
      });
    });

    it('should throw NotFoundError for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.getCurrentUser('invalid-id')).rejects.toThrow(NotFoundError);
    });
  });
});