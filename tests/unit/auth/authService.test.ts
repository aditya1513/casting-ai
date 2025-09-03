import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService } from '@/services/authService';
import { UserFactory } from '../../factories/userFactory';
import { EmailServiceMock } from '../../mocks/emailService.mock';
import { PrismaClient } from '@prisma/client';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('@/services/emailService');

describe('AuthService', () => {
  let authService: AuthService;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let emailServiceMock: EmailServiceMock;

  beforeEach(() => {
    // Setup mocks
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    emailServiceMock = new EmailServiceMock();
    EmailServiceMock.setup({ trackCalls: true });
    
    authService = new AuthService(mockPrisma);
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    EmailServiceMock.reset();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const userData = UserFactory.generateMockUserData();
      const hashedPassword = 'hashed_password';
      const userId = 'user_123';

      // Mock bcrypt
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      
      // Mock Prisma user creation
      mockPrisma.user.create = jest.fn().mockResolvedValue({
        id: userId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        verified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Mock email verification token creation
      mockPrisma.verificationToken.create = jest.fn().mockResolvedValue({
        id: 'token_123',
        token: 'verification_token',
        userId: userId,
        type: 'EMAIL_VERIFICATION',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      const result = await authService.register(userData);

      expect(result).toBeDefined();
      expect(result.user.email).toBe(userData.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 10);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: userData.email.toLowerCase(),
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role
        })
      });
      expect(EmailServiceMock.getEmailCount()).toBe(1);
      expect(EmailServiceMock.hasEmailBeenSent(userData.email)).toBe(true);
    });

    it('should throw error if user already exists', async () => {
      const userData = UserFactory.generateMockUserData();

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue({
        id: 'existing_user',
        email: userData.email
      });

      await expect(authService.register(userData)).rejects.toThrow('User already exists');
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('should validate email format', async () => {
      const userData = UserFactory.generateMockUserData();
      userData.email = 'invalid-email';

      await expect(authService.register(userData)).rejects.toThrow('Invalid email format');
    });

    it('should validate password strength', async () => {
      const userData = UserFactory.generateMockUserData();
      userData.password = 'weak';

      await expect(authService.register(userData)).rejects.toThrow('Password does not meet requirements');
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        email: 'test@example.com',
        password: 'ValidPass123!'
        // Missing firstName, lastName, role
      };

      await expect(authService.register(incompleteData as any)).rejects.toThrow('Missing required fields');
    });

    it('should handle role-specific registration for CASTING_DIRECTOR', async () => {
      const userData = UserFactory.generateMockUserData({ role: 'CASTING_DIRECTOR' });
      const hashedPassword = 'hashed_password';

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      
      mockPrisma.user.create = jest.fn().mockResolvedValue({
        id: 'cd_123',
        email: userData.email,
        role: 'CASTING_DIRECTOR',
        verified: false,
        requiresApproval: true
      });

      const result = await authService.register(userData);

      expect(result.user.requiresApproval).toBe(true);
      expect(result.message).toContain('approval');
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const email = 'test@example.com';
      const password = 'ValidPass123!';
      const user = {
        id: 'user_123',
        email,
        password: await bcrypt.hash(password, 10),
        verified: true,
        twoFactorEnabled: false,
        role: 'ACTOR'
      };

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('mock_jwt_token');

      const result = await authService.login(email, password);

      expect(result).toBeDefined();
      expect(result.token).toBe('mock_jwt_token');
      expect(result.user.id).toBe(user.id);
      expect(mockPrisma.session.create).toHaveBeenCalled();
    });

    it('should fail login with invalid email', async () => {
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(null);

      await expect(authService.login('wrong@example.com', 'password'))
        .rejects.toThrow('Invalid credentials');
    });

    it('should fail login with invalid password', async () => {
      const user = {
        id: 'user_123',
        email: 'test@example.com',
        password: await bcrypt.hash('correct_password', 10),
        verified: true
      };

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(user.email, 'wrong_password'))
        .rejects.toThrow('Invalid credentials');
    });

    it('should fail login for unverified user', async () => {
      const user = {
        id: 'user_123',
        email: 'test@example.com',
        password: await bcrypt.hash('password', 10),
        verified: false
      };

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(authService.login(user.email, 'password'))
        .rejects.toThrow('Email not verified');
    });

    it('should handle 2FA authentication flow', async () => {
      const user = {
        id: 'user_123',
        email: 'test@example.com',
        password: await bcrypt.hash('password', 10),
        verified: true,
        twoFactorEnabled: true,
        twoFactorSecret: 'secret'
      };

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.login(user.email, 'password');

      expect(result.requiresTwoFactor).toBe(true);
      expect(result.tempToken).toBeDefined();
      expect(result.token).toBeUndefined();
    });

    it('should track failed login attempts', async () => {
      const email = 'test@example.com';
      
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(null);
      mockPrisma.loginAttempt.create = jest.fn();

      await expect(authService.login(email, 'wrong_password'))
        .rejects.toThrow('Invalid credentials');

      expect(mockPrisma.loginAttempt.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email,
          success: false
        })
      });
    });

    it('should implement rate limiting after failed attempts', async () => {
      const email = 'test@example.com';
      
      // Mock 5 recent failed attempts
      mockPrisma.loginAttempt.count = jest.fn().mockResolvedValue(5);

      await expect(authService.login(email, 'password'))
        .rejects.toThrow('Too many login attempts');
    });
  });

  describe('resetPassword', () => {
    it('should send password reset email for existing user', async () => {
      const user = {
        id: 'user_123',
        email: 'test@example.com'
      };

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(user);
      mockPrisma.passwordResetToken.create = jest.fn().mockResolvedValue({
        token: 'reset_token_123',
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000)
      });

      await authService.requestPasswordReset(user.email);

      expect(mockPrisma.passwordResetToken.create).toHaveBeenCalled();
      expect(EmailServiceMock.hasEmailBeenSent(user.email, 'Password Reset Request - CastMatch')).toBe(true);
    });

    it('should not reveal if email does not exist', async () => {
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(null);

      // Should not throw error to prevent email enumeration
      await expect(authService.requestPasswordReset('nonexistent@example.com'))
        .resolves.not.toThrow();
      
      expect(EmailServiceMock.getEmailCount()).toBe(0);
    });

    it('should successfully reset password with valid token', async () => {
      const token = 'valid_reset_token';
      const newPassword = 'NewValidPass123!';
      const hashedPassword = 'new_hashed_password';

      mockPrisma.passwordResetToken.findUnique = jest.fn().mockResolvedValue({
        token,
        userId: 'user_123',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        used: false
      });

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      mockPrisma.user.update = jest.fn().mockResolvedValue({
        id: 'user_123',
        email: 'test@example.com'
      });

      await authService.resetPassword(token, newPassword);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: { password: hashedPassword }
      });

      expect(mockPrisma.passwordResetToken.update).toHaveBeenCalledWith({
        where: { token },
        data: { used: true }
      });
    });

    it('should reject expired reset token', async () => {
      const token = 'expired_token';

      mockPrisma.passwordResetToken.findUnique = jest.fn().mockResolvedValue({
        token,
        userId: 'user_123',
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // Expired
        used: false
      });

      await expect(authService.resetPassword(token, 'NewPassword123!'))
        .rejects.toThrow('Token has expired');
    });

    it('should reject already used reset token', async () => {
      const token = 'used_token';

      mockPrisma.passwordResetToken.findUnique = jest.fn().mockResolvedValue({
        token,
        userId: 'user_123',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        used: true
      });

      await expect(authService.resetPassword(token, 'NewPassword123!'))
        .rejects.toThrow('Token has already been used');
    });
  });

  describe('verifyEmail', () => {
    it('should successfully verify email with valid token', async () => {
      const token = 'valid_verification_token';

      mockPrisma.verificationToken.findUnique = jest.fn().mockResolvedValue({
        token,
        userId: 'user_123',
        type: 'EMAIL_VERIFICATION',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        used: false
      });

      mockPrisma.user.update = jest.fn().mockResolvedValue({
        id: 'user_123',
        email: 'test@example.com',
        verified: true
      });

      const result = await authService.verifyEmail(token);

      expect(result.verified).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: { verified: true }
      });
    });

    it('should reject invalid verification token', async () => {
      mockPrisma.verificationToken.findUnique = jest.fn().mockResolvedValue(null);

      await expect(authService.verifyEmail('invalid_token'))
        .rejects.toThrow('Invalid verification token');
    });

    it('should reject expired verification token', async () => {
      const token = 'expired_token';

      mockPrisma.verificationToken.findUnique = jest.fn().mockResolvedValue({
        token,
        userId: 'user_123',
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired
        used: false
      });

      await expect(authService.verifyEmail(token))
        .rejects.toThrow('Verification token has expired');
    });
  });

  describe('JWT Token Management', () => {
    it('should generate valid JWT token', () => {
      const payload = {
        userId: 'user_123',
        email: 'test@example.com',
        role: 'ACTOR'
      };

      const mockToken = 'mock.jwt.token';
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);

      const token = authService.generateToken(payload);

      expect(token).toBe(mockToken);
      expect(jwt.sign).toHaveBeenCalledWith(
        payload,
        process.env.JWT_SECRET,
        expect.objectContaining({
          expiresIn: expect.any(String)
        })
      );
    });

    it('should verify valid JWT token', () => {
      const token = 'valid.jwt.token';
      const decoded = {
        userId: 'user_123',
        email: 'test@example.com',
        role: 'ACTOR'
      };

      (jwt.verify as jest.Mock).mockReturnValue(decoded);

      const result = authService.verifyToken(token);

      expect(result).toEqual(decoded);
      expect(jwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
    });

    it('should throw error for invalid JWT token', () => {
      const token = 'invalid.jwt.token';

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => authService.verifyToken(token)).toThrow('Invalid token');
    });

    it('should handle token refresh', async () => {
      const refreshToken = 'valid_refresh_token';
      const session = {
        id: 'session_123',
        userId: 'user_123',
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      mockPrisma.session.findUnique = jest.fn().mockResolvedValue(session);
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue({
        id: 'user_123',
        email: 'test@example.com',
        role: 'ACTOR'
      });

      (jwt.sign as jest.Mock).mockReturnValue('new_access_token');

      const result = await authService.refreshToken(refreshToken);

      expect(result.accessToken).toBe('new_access_token');
      expect(result.refreshToken).toBeDefined();
    });
  });
});