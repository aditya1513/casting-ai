"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authService_1 = require("@/services/authService");
const userFactory_1 = require("../../factories/userFactory");
const emailService_mock_1 = require("../../mocks/emailService.mock");
const client_1 = require("@prisma/client");
globals_1.jest.mock('@prisma/client');
globals_1.jest.mock('bcryptjs');
globals_1.jest.mock('jsonwebtoken');
globals_1.jest.mock('@/services/emailService');
(0, globals_1.describe)('AuthService', () => {
    let authService;
    let mockPrisma;
    let emailServiceMock;
    (0, globals_1.beforeEach)(() => {
        mockPrisma = new client_1.PrismaClient();
        emailServiceMock = new emailService_mock_1.EmailServiceMock();
        emailService_mock_1.EmailServiceMock.setup({ trackCalls: true });
        authService = new authService_1.AuthService(mockPrisma);
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.afterEach)(() => {
        emailService_mock_1.EmailServiceMock.reset();
    });
    (0, globals_1.describe)('register', () => {
        (0, globals_1.it)('should successfully register a new user', async () => {
            const userData = userFactory_1.UserFactory.generateMockUserData();
            const hashedPassword = 'hashed_password';
            const userId = 'user_123';
            bcryptjs_1.default.hash.mockResolvedValue(hashedPassword);
            mockPrisma.user.create = globals_1.jest.fn().mockResolvedValue({
                id: userId,
                email: userData.email,
                firstName: userData.firstName,
                lastName: userData.lastName,
                role: userData.role,
                verified: false,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            mockPrisma.verificationToken.create = globals_1.jest.fn().mockResolvedValue({
                id: 'token_123',
                token: 'verification_token',
                userId: userId,
                type: 'EMAIL_VERIFICATION',
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
            });
            const result = await authService.register(userData);
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.user.email).toBe(userData.email);
            (0, globals_1.expect)(bcryptjs_1.default.hash).toHaveBeenCalledWith(userData.password, 10);
            (0, globals_1.expect)(mockPrisma.user.create).toHaveBeenCalledWith({
                data: globals_1.expect.objectContaining({
                    email: userData.email.toLowerCase(),
                    password: hashedPassword,
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    role: userData.role
                })
            });
            (0, globals_1.expect)(emailService_mock_1.EmailServiceMock.getEmailCount()).toBe(1);
            (0, globals_1.expect)(emailService_mock_1.EmailServiceMock.hasEmailBeenSent(userData.email)).toBe(true);
        });
        (0, globals_1.it)('should throw error if user already exists', async () => {
            const userData = userFactory_1.UserFactory.generateMockUserData();
            mockPrisma.user.findUnique = globals_1.jest.fn().mockResolvedValue({
                id: 'existing_user',
                email: userData.email
            });
            await (0, globals_1.expect)(authService.register(userData)).rejects.toThrow('User already exists');
            (0, globals_1.expect)(mockPrisma.user.create).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should validate email format', async () => {
            const userData = userFactory_1.UserFactory.generateMockUserData();
            userData.email = 'invalid-email';
            await (0, globals_1.expect)(authService.register(userData)).rejects.toThrow('Invalid email format');
        });
        (0, globals_1.it)('should validate password strength', async () => {
            const userData = userFactory_1.UserFactory.generateMockUserData();
            userData.password = 'weak';
            await (0, globals_1.expect)(authService.register(userData)).rejects.toThrow('Password does not meet requirements');
        });
        (0, globals_1.it)('should validate required fields', async () => {
            const incompleteData = {
                email: 'test@example.com',
                password: 'ValidPass123!'
            };
            await (0, globals_1.expect)(authService.register(incompleteData)).rejects.toThrow('Missing required fields');
        });
        (0, globals_1.it)('should handle role-specific registration for CASTING_DIRECTOR', async () => {
            const userData = userFactory_1.UserFactory.generateMockUserData({ role: 'CASTING_DIRECTOR' });
            const hashedPassword = 'hashed_password';
            bcryptjs_1.default.hash.mockResolvedValue(hashedPassword);
            mockPrisma.user.create = globals_1.jest.fn().mockResolvedValue({
                id: 'cd_123',
                email: userData.email,
                role: 'CASTING_DIRECTOR',
                verified: false,
                requiresApproval: true
            });
            const result = await authService.register(userData);
            (0, globals_1.expect)(result.user.requiresApproval).toBe(true);
            (0, globals_1.expect)(result.message).toContain('approval');
        });
    });
    (0, globals_1.describe)('login', () => {
        (0, globals_1.it)('should successfully login with valid credentials', async () => {
            const email = 'test@example.com';
            const password = 'ValidPass123!';
            const user = {
                id: 'user_123',
                email,
                password: await bcryptjs_1.default.hash(password, 10),
                verified: true,
                twoFactorEnabled: false,
                role: 'ACTOR'
            };
            mockPrisma.user.findUnique = globals_1.jest.fn().mockResolvedValue(user);
            bcryptjs_1.default.compare.mockResolvedValue(true);
            jsonwebtoken_1.default.sign.mockReturnValue('mock_jwt_token');
            const result = await authService.login(email, password);
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.token).toBe('mock_jwt_token');
            (0, globals_1.expect)(result.user.id).toBe(user.id);
            (0, globals_1.expect)(mockPrisma.session.create).toHaveBeenCalled();
        });
        (0, globals_1.it)('should fail login with invalid email', async () => {
            mockPrisma.user.findUnique = globals_1.jest.fn().mockResolvedValue(null);
            await (0, globals_1.expect)(authService.login('wrong@example.com', 'password'))
                .rejects.toThrow('Invalid credentials');
        });
        (0, globals_1.it)('should fail login with invalid password', async () => {
            const user = {
                id: 'user_123',
                email: 'test@example.com',
                password: await bcryptjs_1.default.hash('correct_password', 10),
                verified: true
            };
            mockPrisma.user.findUnique = globals_1.jest.fn().mockResolvedValue(user);
            bcryptjs_1.default.compare.mockResolvedValue(false);
            await (0, globals_1.expect)(authService.login(user.email, 'wrong_password'))
                .rejects.toThrow('Invalid credentials');
        });
        (0, globals_1.it)('should fail login for unverified user', async () => {
            const user = {
                id: 'user_123',
                email: 'test@example.com',
                password: await bcryptjs_1.default.hash('password', 10),
                verified: false
            };
            mockPrisma.user.findUnique = globals_1.jest.fn().mockResolvedValue(user);
            bcryptjs_1.default.compare.mockResolvedValue(true);
            await (0, globals_1.expect)(authService.login(user.email, 'password'))
                .rejects.toThrow('Email not verified');
        });
        (0, globals_1.it)('should handle 2FA authentication flow', async () => {
            const user = {
                id: 'user_123',
                email: 'test@example.com',
                password: await bcryptjs_1.default.hash('password', 10),
                verified: true,
                twoFactorEnabled: true,
                twoFactorSecret: 'secret'
            };
            mockPrisma.user.findUnique = globals_1.jest.fn().mockResolvedValue(user);
            bcryptjs_1.default.compare.mockResolvedValue(true);
            const result = await authService.login(user.email, 'password');
            (0, globals_1.expect)(result.requiresTwoFactor).toBe(true);
            (0, globals_1.expect)(result.tempToken).toBeDefined();
            (0, globals_1.expect)(result.token).toBeUndefined();
        });
        (0, globals_1.it)('should track failed login attempts', async () => {
            const email = 'test@example.com';
            mockPrisma.user.findUnique = globals_1.jest.fn().mockResolvedValue(null);
            mockPrisma.loginAttempt.create = globals_1.jest.fn();
            await (0, globals_1.expect)(authService.login(email, 'wrong_password'))
                .rejects.toThrow('Invalid credentials');
            (0, globals_1.expect)(mockPrisma.loginAttempt.create).toHaveBeenCalledWith({
                data: globals_1.expect.objectContaining({
                    email,
                    success: false
                })
            });
        });
        (0, globals_1.it)('should implement rate limiting after failed attempts', async () => {
            const email = 'test@example.com';
            mockPrisma.loginAttempt.count = globals_1.jest.fn().mockResolvedValue(5);
            await (0, globals_1.expect)(authService.login(email, 'password'))
                .rejects.toThrow('Too many login attempts');
        });
    });
    (0, globals_1.describe)('resetPassword', () => {
        (0, globals_1.it)('should send password reset email for existing user', async () => {
            const user = {
                id: 'user_123',
                email: 'test@example.com'
            };
            mockPrisma.user.findUnique = globals_1.jest.fn().mockResolvedValue(user);
            mockPrisma.passwordResetToken.create = globals_1.jest.fn().mockResolvedValue({
                token: 'reset_token_123',
                userId: user.id,
                expiresAt: new Date(Date.now() + 60 * 60 * 1000)
            });
            await authService.requestPasswordReset(user.email);
            (0, globals_1.expect)(mockPrisma.passwordResetToken.create).toHaveBeenCalled();
            (0, globals_1.expect)(emailService_mock_1.EmailServiceMock.hasEmailBeenSent(user.email, 'Password Reset Request - CastMatch')).toBe(true);
        });
        (0, globals_1.it)('should not reveal if email does not exist', async () => {
            mockPrisma.user.findUnique = globals_1.jest.fn().mockResolvedValue(null);
            await (0, globals_1.expect)(authService.requestPasswordReset('nonexistent@example.com'))
                .resolves.not.toThrow();
            (0, globals_1.expect)(emailService_mock_1.EmailServiceMock.getEmailCount()).toBe(0);
        });
        (0, globals_1.it)('should successfully reset password with valid token', async () => {
            const token = 'valid_reset_token';
            const newPassword = 'NewValidPass123!';
            const hashedPassword = 'new_hashed_password';
            mockPrisma.passwordResetToken.findUnique = globals_1.jest.fn().mockResolvedValue({
                token,
                userId: 'user_123',
                expiresAt: new Date(Date.now() + 60 * 60 * 1000),
                used: false
            });
            bcryptjs_1.default.hash.mockResolvedValue(hashedPassword);
            mockPrisma.user.update = globals_1.jest.fn().mockResolvedValue({
                id: 'user_123',
                email: 'test@example.com'
            });
            await authService.resetPassword(token, newPassword);
            (0, globals_1.expect)(mockPrisma.user.update).toHaveBeenCalledWith({
                where: { id: 'user_123' },
                data: { password: hashedPassword }
            });
            (0, globals_1.expect)(mockPrisma.passwordResetToken.update).toHaveBeenCalledWith({
                where: { token },
                data: { used: true }
            });
        });
        (0, globals_1.it)('should reject expired reset token', async () => {
            const token = 'expired_token';
            mockPrisma.passwordResetToken.findUnique = globals_1.jest.fn().mockResolvedValue({
                token,
                userId: 'user_123',
                expiresAt: new Date(Date.now() - 60 * 60 * 1000),
                used: false
            });
            await (0, globals_1.expect)(authService.resetPassword(token, 'NewPassword123!'))
                .rejects.toThrow('Token has expired');
        });
        (0, globals_1.it)('should reject already used reset token', async () => {
            const token = 'used_token';
            mockPrisma.passwordResetToken.findUnique = globals_1.jest.fn().mockResolvedValue({
                token,
                userId: 'user_123',
                expiresAt: new Date(Date.now() + 60 * 60 * 1000),
                used: true
            });
            await (0, globals_1.expect)(authService.resetPassword(token, 'NewPassword123!'))
                .rejects.toThrow('Token has already been used');
        });
    });
    (0, globals_1.describe)('verifyEmail', () => {
        (0, globals_1.it)('should successfully verify email with valid token', async () => {
            const token = 'valid_verification_token';
            mockPrisma.verificationToken.findUnique = globals_1.jest.fn().mockResolvedValue({
                token,
                userId: 'user_123',
                type: 'EMAIL_VERIFICATION',
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                used: false
            });
            mockPrisma.user.update = globals_1.jest.fn().mockResolvedValue({
                id: 'user_123',
                email: 'test@example.com',
                verified: true
            });
            const result = await authService.verifyEmail(token);
            (0, globals_1.expect)(result.verified).toBe(true);
            (0, globals_1.expect)(mockPrisma.user.update).toHaveBeenCalledWith({
                where: { id: 'user_123' },
                data: { verified: true }
            });
        });
        (0, globals_1.it)('should reject invalid verification token', async () => {
            mockPrisma.verificationToken.findUnique = globals_1.jest.fn().mockResolvedValue(null);
            await (0, globals_1.expect)(authService.verifyEmail('invalid_token'))
                .rejects.toThrow('Invalid verification token');
        });
        (0, globals_1.it)('should reject expired verification token', async () => {
            const token = 'expired_token';
            mockPrisma.verificationToken.findUnique = globals_1.jest.fn().mockResolvedValue({
                token,
                userId: 'user_123',
                expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
                used: false
            });
            await (0, globals_1.expect)(authService.verifyEmail(token))
                .rejects.toThrow('Verification token has expired');
        });
    });
    (0, globals_1.describe)('JWT Token Management', () => {
        (0, globals_1.it)('should generate valid JWT token', () => {
            const payload = {
                userId: 'user_123',
                email: 'test@example.com',
                role: 'ACTOR'
            };
            const mockToken = 'mock.jwt.token';
            jsonwebtoken_1.default.sign.mockReturnValue(mockToken);
            const token = authService.generateToken(payload);
            (0, globals_1.expect)(token).toBe(mockToken);
            (0, globals_1.expect)(jsonwebtoken_1.default.sign).toHaveBeenCalledWith(payload, process.env.JWT_SECRET, globals_1.expect.objectContaining({
                expiresIn: globals_1.expect.any(String)
            }));
        });
        (0, globals_1.it)('should verify valid JWT token', () => {
            const token = 'valid.jwt.token';
            const decoded = {
                userId: 'user_123',
                email: 'test@example.com',
                role: 'ACTOR'
            };
            jsonwebtoken_1.default.verify.mockReturnValue(decoded);
            const result = authService.verifyToken(token);
            (0, globals_1.expect)(result).toEqual(decoded);
            (0, globals_1.expect)(jsonwebtoken_1.default.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
        });
        (0, globals_1.it)('should throw error for invalid JWT token', () => {
            const token = 'invalid.jwt.token';
            jsonwebtoken_1.default.verify.mockImplementation(() => {
                throw new Error('Invalid token');
            });
            (0, globals_1.expect)(() => authService.verifyToken(token)).toThrow('Invalid token');
        });
        (0, globals_1.it)('should handle token refresh', async () => {
            const refreshToken = 'valid_refresh_token';
            const session = {
                id: 'session_123',
                userId: 'user_123',
                refreshToken,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            };
            mockPrisma.session.findUnique = globals_1.jest.fn().mockResolvedValue(session);
            mockPrisma.user.findUnique = globals_1.jest.fn().mockResolvedValue({
                id: 'user_123',
                email: 'test@example.com',
                role: 'ACTOR'
            });
            jsonwebtoken_1.default.sign.mockReturnValue('new_access_token');
            const result = await authService.refreshToken(refreshToken);
            (0, globals_1.expect)(result.accessToken).toBe('new_access_token');
            (0, globals_1.expect)(result.refreshToken).toBeDefined();
        });
    });
});
//# sourceMappingURL=authService.test.js.map