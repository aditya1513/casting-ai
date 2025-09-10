/**
 * Authentication Controller Unit Tests
 * Comprehensive testing for all auth endpoints
 */

import { Request, Response } from 'express';
import { AuthController } from '../../../src/controllers/auth.controller';
import { AuthService } from '../../../src/services/auth.service';
import { LogContext } from '../../../src/utils/logger';
import { mockRequest, mockResponse } from '../../mocks/express';
import { createMockUser, createMockSession } from '../../factories/user.factory';
import { UserRole } from '@prisma/client';

// Mock dependencies
jest.mock('../../../src/services/auth.service');
jest.mock('../../../src/utils/logger');

describe('AuthController', () => {
  let authController: AuthController;
  let mockAuthService: jest.Mocked<AuthService>;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Initialize controller
    authController = new AuthController();
    mockAuthService = (AuthService as jest.MockedClass<typeof AuthService>).mock.instances[0] as jest.Mocked<AuthService>;

    // Setup request and response mocks
    req = mockRequest();
    res = mockResponse();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      // Arrange
      const registerData = {
        email: 'test@castmatch.ai',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.ACTOR
      };

      const mockUser = createMockUser({ email: registerData.email, role: registerData.role });
      const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
      };

      req.body = registerData;
      mockAuthService.register.mockResolvedValue({
        user: mockUser,
        tokens: mockTokens
      });

      // Act
      await authController.register(req as Request, res as Response);

      // Assert
      expect(mockAuthService.register).toHaveBeenCalledWith(registerData);
      expect(LogContext.auth).toHaveBeenCalledWith('register', mockUser.id, true);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Registration successful. Please verify your email.',
        data: { user: mockUser, tokens: mockTokens }
      });
    });

    it('should handle duplicate email registration', async () => {
      // Arrange
      const registerData = {
        email: 'existing@castmatch.ai',
        password: 'SecurePass123!',
        firstName: 'Jane',
        lastName: 'Doe',
        role: UserRole.ACTOR
      };

      req.body = registerData;
      mockAuthService.register.mockRejectedValue(new Error('Email already exists'));

      // Act & Assert
      await expect(authController.register(req as Request, res as Response))
        .rejects.toThrow('Email already exists');
      expect(mockAuthService.register).toHaveBeenCalledWith(registerData);
    });

    it('should validate password strength requirements', async () => {
      // Arrange
      const weakPasswordData = {
        email: 'test@castmatch.ai',
        password: 'weak',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.ACTOR
      };

      req.body = weakPasswordData;
      mockAuthService.register.mockRejectedValue(new Error('Password does not meet requirements'));

      // Act & Assert
      await expect(authController.register(req as Request, res as Response))
        .rejects.toThrow('Password does not meet requirements');
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      // Arrange
      const loginData = {
        email: 'user@castmatch.ai',
        password: 'ValidPass123!'
      };

      const mockUser = createMockUser({ email: loginData.email });
      const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
      };

      req.body = loginData;
      req.headers = { 'user-agent': 'test-agent' };
      req.ip = '127.0.0.1';

      mockAuthService.login.mockResolvedValue({
        user: mockUser,
        tokens: mockTokens
      });

      // Act
      await authController.login(req as Request, res as Response);

      // Assert
      expect(mockAuthService.login).toHaveBeenCalledWith(loginData, {
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1'
      });
      expect(LogContext.auth).toHaveBeenCalledWith('login', mockUser.id, true);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Login successful',
        data: { user: mockUser, tokens: mockTokens }
      });
    });

    it('should handle invalid credentials', async () => {
      // Arrange
      const invalidLoginData = {
        email: 'user@castmatch.ai',
        password: 'WrongPassword'
      };

      req.body = invalidLoginData;
      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      // Act & Assert
      await expect(authController.login(req as Request, res as Response))
        .rejects.toThrow('Invalid credentials');
    });

    it('should handle locked accounts', async () => {
      // Arrange
      const loginData = {
        email: 'locked@castmatch.ai',
        password: 'ValidPass123!'
      };

      req.body = loginData;
      mockAuthService.login.mockRejectedValue(new Error('Account is locked due to multiple failed attempts'));

      // Act & Assert
      await expect(authController.login(req as Request, res as Response))
        .rejects.toThrow('Account is locked');
    });

    it('should handle unverified email addresses', async () => {
      // Arrange
      const loginData = {
        email: 'unverified@castmatch.ai',
        password: 'ValidPass123!'
      };

      req.body = loginData;
      mockAuthService.login.mockRejectedValue(new Error('Please verify your email before logging in'));

      // Act & Assert
      await expect(authController.login(req as Request, res as Response))
        .rejects.toThrow('Please verify your email');
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh access token', async () => {
      // Arrange
      const refreshTokenData = {
        refreshToken: 'valid-refresh-token'
      };

      const newTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      };

      req.body = refreshTokenData;
      mockAuthService.refreshToken.mockResolvedValue(newTokens);

      // Act
      await authController.refreshToken(req as Request, res as Response);

      // Assert
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Token refreshed successfully',
        data: newTokens
      });
    });

    it('should handle invalid refresh token', async () => {
      // Arrange
      req.body = { refreshToken: 'invalid-token' };
      mockAuthService.refreshToken.mockRejectedValue(new Error('Invalid refresh token'));

      // Act & Assert
      await expect(authController.refreshToken(req as Request, res as Response))
        .rejects.toThrow('Invalid refresh token');
    });

    it('should handle expired refresh token', async () => {
      // Arrange
      req.body = { refreshToken: 'expired-token' };
      mockAuthService.refreshToken.mockRejectedValue(new Error('Refresh token has expired'));

      // Act & Assert
      await expect(authController.refreshToken(req as Request, res as Response))
        .rejects.toThrow('Refresh token has expired');
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      // Arrange
      const userId = 'user-123';
      const sessionId = 'session-456';
      
      req = {
        ...req,
        user: { id: userId, sessionId }
      } as any;

      mockAuthService.logout.mockResolvedValue(undefined);

      // Act
      await authController.logout(req as Request, res as Response);

      // Assert
      expect(mockAuthService.logout).toHaveBeenCalledWith(userId, sessionId);
      expect(LogContext.auth).toHaveBeenCalledWith('logout', userId, true);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logout successful'
      });
    });
  });

  describe('forgotPassword', () => {
    it('should initiate password reset process', async () => {
      // Arrange
      const email = 'user@castmatch.ai';
      req.body = { email };
      mockAuthService.forgotPassword.mockResolvedValue(undefined);

      // Act
      await authController.forgotPassword(req as Request, res as Response);

      // Assert
      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith(email);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      });
    });

    it('should not reveal if email exists', async () => {
      // Arrange
      const email = 'nonexistent@castmatch.ai';
      req.body = { email };
      mockAuthService.forgotPassword.mockResolvedValue(undefined);

      // Act
      await authController.forgotPassword(req as Request, res as Response);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      });
    });
  });

  describe('resetPassword', () => {
    it('should successfully reset password with valid token', async () => {
      // Arrange
      const resetData = {
        token: 'valid-reset-token',
        password: 'NewSecurePass123!'
      };

      req.body = resetData;
      mockAuthService.resetPassword.mockResolvedValue(undefined);

      // Act
      await authController.resetPassword(req as Request, res as Response);

      // Assert
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(resetData.token, resetData.password);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password reset successful. Please login with your new password.'
      });
    });

    it('should handle invalid reset token', async () => {
      // Arrange
      const resetData = {
        token: 'invalid-token',
        password: 'NewSecurePass123!'
      };

      req.body = resetData;
      mockAuthService.resetPassword.mockRejectedValue(new Error('Invalid or expired reset token'));

      // Act & Assert
      await expect(authController.resetPassword(req as Request, res as Response))
        .rejects.toThrow('Invalid or expired reset token');
    });
  });

  describe('changePassword', () => {
    it('should successfully change password for authenticated user', async () => {
      // Arrange
      const userId = 'user-123';
      const changePasswordData = {
        currentPassword: 'OldPass123!',
        newPassword: 'NewSecurePass123!'
      };

      req = {
        ...req,
        body: changePasswordData,
        user: { id: userId }
      } as any;

      mockAuthService.changePassword.mockResolvedValue(undefined);

      // Act
      await authController.changePassword(req as Request, res as Response);

      // Assert
      expect(mockAuthService.changePassword).toHaveBeenCalledWith(
        userId,
        changePasswordData.currentPassword,
        changePasswordData.newPassword
      );
      expect(LogContext.auth).toHaveBeenCalledWith('change_password', userId, true);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password changed successfully'
      });
    });

    it('should handle incorrect current password', async () => {
      // Arrange
      const userId = 'user-123';
      const changePasswordData = {
        currentPassword: 'WrongPass',
        newPassword: 'NewSecurePass123!'
      };

      req = {
        ...req,
        body: changePasswordData,
        user: { id: userId }
      } as any;

      mockAuthService.changePassword.mockRejectedValue(new Error('Current password is incorrect'));

      // Act & Assert
      await expect(authController.changePassword(req as Request, res as Response))
        .rejects.toThrow('Current password is incorrect');
    });
  });

  describe('verifyEmail', () => {
    it('should successfully verify email with valid token', async () => {
      // Arrange
      const token = 'valid-verification-token';
      req.body = { token };
      mockAuthService.verifyEmail.mockResolvedValue(undefined);

      // Act
      await authController.verifyEmail(req as Request, res as Response);

      // Assert
      expect(mockAuthService.verifyEmail).toHaveBeenCalledWith(token);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Email verified successfully'
      });
    });

    it('should handle invalid verification token', async () => {
      // Arrange
      const token = 'invalid-token';
      req.body = { token };
      mockAuthService.verifyEmail.mockRejectedValue(new Error('Invalid verification token'));

      // Act & Assert
      await expect(authController.verifyEmail(req as Request, res as Response))
        .rejects.toThrow('Invalid verification token');
    });
  });

  describe('getCurrentUser', () => {
    it('should return current authenticated user', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUser = createMockUser({ id: userId });
      
      req = {
        ...req,
        user: { id: userId }
      } as any;

      mockAuthService.getCurrentUser.mockResolvedValue(mockUser);

      // Act
      await authController.getCurrentUser(req as Request, res as Response);

      // Assert
      expect(mockAuthService.getCurrentUser).toHaveBeenCalledWith(userId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { user: mockUser }
      });
    });
  });
});