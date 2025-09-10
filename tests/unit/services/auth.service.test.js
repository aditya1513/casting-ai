"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_service_1 = require("../../../src/services/auth.service");
const database_1 = require("../../../src/config/database");
const redis_1 = require("../../../src/config/redis");
const password_1 = require("../../../src/utils/password");
const jwt_1 = require("../../../src/utils/jwt");
const errors_1 = require("../../../src/utils/errors");
const client_1 = require("@prisma/client");
jest.mock('../../../src/config/database');
jest.mock('../../../src/config/redis');
jest.mock('../../../src/utils/password');
jest.mock('../../../src/utils/jwt');
jest.mock('../../../src/utils/logger');
const mockPrisma = database_1.prisma;
const mockCacheManager = redis_1.CacheManager;
describe('AuthService', () => {
    let authService;
    beforeEach(() => {
        authService = new auth_service_1.AuthService();
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
            role: client_1.UserRole.ACTOR,
            acceptTerms: true,
        };
        beforeEach(() => {
            password_1.validatePassword.mockReturnValue({
                isValid: true,
                errors: [],
                strength: 'strong',
            });
            password_1.hashPassword.mockResolvedValue('hashed-password');
            jwt_1.generateSessionId.mockReturnValue('session-id');
            jwt_1.generateAccessToken.mockReturnValue('access-token');
            jwt_1.generateRefreshToken.mockReturnValue('refresh-token');
            jwt_1.getTokenExpiry.mockReturnValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
        });
        it('should successfully register a new actor', async () => {
            const mockUser = {
                id: 'user-id',
                email: 'test@example.com',
                role: client_1.UserRole.ACTOR,
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
                });
            });
            mockPrisma.session.create.mockResolvedValue({});
            const result = await authService.register(registerData);
            expect(result).toEqual({
                user: {
                    id: 'user-id',
                    email: 'test@example.com',
                    role: client_1.UserRole.ACTOR,
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
            expect(password_1.validatePassword).toHaveBeenCalledWith('StrongPass123!');
            expect(password_1.hashPassword).toHaveBeenCalledWith('StrongPass123!');
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
            const cdData = { ...registerData, role: client_1.UserRole.CASTING_DIRECTOR };
            const mockUser = {
                id: 'user-id',
                email: 'test@example.com',
                role: client_1.UserRole.CASTING_DIRECTOR,
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
                });
            });
            mockPrisma.session.create.mockResolvedValue({});
            const result = await authService.register(cdData);
            expect(result.user.role).toBe(client_1.UserRole.CASTING_DIRECTOR);
        });
        it('should successfully register a new producer', async () => {
            const producerData = { ...registerData, role: client_1.UserRole.PRODUCER };
            const mockUser = {
                id: 'user-id',
                email: 'test@example.com',
                role: client_1.UserRole.PRODUCER,
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
                });
            });
            mockPrisma.session.create.mockResolvedValue({});
            const result = await authService.register(producerData);
            expect(result.user.role).toBe(client_1.UserRole.PRODUCER);
        });
        it('should throw ValidationError for weak password', async () => {
            password_1.validatePassword.mockReturnValue({
                isValid: false,
                errors: ['Password too weak'],
                strength: 'weak',
            });
            await expect(authService.register(registerData)).rejects.toThrow(errors_1.ValidationError);
            expect(password_1.validatePassword).toHaveBeenCalledWith('StrongPass123!');
        });
        it('should throw ConflictError for existing email', async () => {
            mockPrisma.user.findFirst.mockResolvedValue({
                id: 'existing-id',
                email: 'test@example.com',
                phone: null,
            });
            await expect(authService.register(registerData)).rejects.toThrow(errors_1.ConflictError);
        });
        it('should throw ConflictError for existing phone', async () => {
            mockPrisma.user.findFirst.mockResolvedValue({
                id: 'existing-id',
                email: 'different@example.com',
                phone: '+91234567890',
            });
            await expect(authService.register(registerData)).rejects.toThrow(errors_1.ConflictError);
        });
        it('should create session with correct data', async () => {
            const mockUser = {
                id: 'user-id',
                email: 'test@example.com',
                role: client_1.UserRole.ACTOR,
                isEmailVerified: false,
            };
            mockPrisma.user.findFirst.mockResolvedValue(null);
            mockPrisma.$transaction.mockImplementation(async (callback) => {
                return callback({
                    user: { create: jest.fn().mockResolvedValue(mockUser) },
                    actor: { create: jest.fn() },
                });
            });
            mockPrisma.session.create.mockResolvedValue({});
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
            role: client_1.UserRole.ACTOR,
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
            password_1.comparePassword.mockResolvedValue(true);
            jwt_1.generateSessionId.mockReturnValue('session-id');
            jwt_1.generateAccessToken.mockReturnValue('access-token');
            jwt_1.generateRefreshToken.mockReturnValue('refresh-token');
            jwt_1.getTokenExpiry.mockReturnValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
        });
        it('should successfully login with valid credentials', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mockPrisma.session.create.mockResolvedValue({});
            mockPrisma.user.update.mockResolvedValue({});
            mockCacheManager.set.mockResolvedValue(undefined);
            const result = await authService.login(loginData);
            expect(result).toEqual({
                user: {
                    id: 'user-id',
                    email: 'test@example.com',
                    role: client_1.UserRole.ACTOR,
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
            expect(password_1.comparePassword).toHaveBeenCalledWith('StrongPass123!', 'hashed-password');
        });
        it('should throw AuthenticationError for non-existent user', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(null);
            await expect(authService.login(loginData)).rejects.toThrow(errors_1.AuthenticationError);
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
            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            password_1.comparePassword.mockResolvedValue(false);
            await expect(authService.login(loginData)).rejects.toThrow(errors_1.AuthenticationError);
        });
        it('should throw AuthenticationError for inactive account', async () => {
            const inactiveUser = { ...mockUser, isActive: false };
            mockPrisma.user.findUnique.mockResolvedValue(inactiveUser);
            await expect(authService.login(loginData)).rejects.toThrow(errors_1.AuthenticationError);
        });
        it('should handle casting director login', async () => {
            const cdUser = {
                ...mockUser,
                role: client_1.UserRole.CASTING_DIRECTOR,
                actor: null,
                castingDirector: {
                    firstName: 'Jane',
                    lastName: 'Smith',
                },
                producer: null,
            };
            mockPrisma.user.findUnique.mockResolvedValue(cdUser);
            mockPrisma.session.create.mockResolvedValue({});
            mockPrisma.user.update.mockResolvedValue({});
            mockCacheManager.set.mockResolvedValue(undefined);
            const result = await authService.login(loginData);
            expect(result.user.firstName).toBe('Jane');
            expect(result.user.lastName).toBe('Smith');
        });
        it('should handle producer login', async () => {
            const producerUser = {
                ...mockUser,
                role: client_1.UserRole.PRODUCER,
                actor: null,
                castingDirector: null,
                producer: {
                    firstName: 'Bob',
                    lastName: 'Producer',
                },
            };
            mockPrisma.user.findUnique.mockResolvedValue(producerUser);
            mockPrisma.session.create.mockResolvedValue({});
            mockPrisma.user.update.mockResolvedValue({});
            mockCacheManager.set.mockResolvedValue(undefined);
            const result = await authService.login(loginData);
            expect(result.user.firstName).toBe('Bob');
            expect(result.user.lastName).toBe('Producer');
        });
        it('should set longer session expiry for remember me', async () => {
            const rememberMeData = { ...loginData, rememberMe: true };
            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mockPrisma.session.create.mockResolvedValue({});
            mockPrisma.user.update.mockResolvedValue({});
            mockCacheManager.set.mockResolvedValue(undefined);
            await authService.login(rememberMeData);
            expect(jwt_1.getTokenExpiry).toHaveBeenCalledWith('30d');
        });
        it('should update last login timestamp', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mockPrisma.session.create.mockResolvedValue({});
            mockPrisma.user.update.mockResolvedValue({});
            mockCacheManager.set.mockResolvedValue(undefined);
            await authService.login(loginData);
            expect(mockPrisma.user.update).toHaveBeenCalledWith({
                where: { id: 'user-id' },
                data: { lastLoginAt: expect.any(Date) },
            });
        });
        it('should cache session data', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mockPrisma.session.create.mockResolvedValue({});
            mockPrisma.user.update.mockResolvedValue({});
            mockCacheManager.set.mockResolvedValue(undefined);
            await authService.login(loginData);
            expect(mockCacheManager.set).toHaveBeenCalledWith(expect.stringContaining('user:user-id:session:session-id'), { userId: 'user-id', sessionId: 'session-id' }, 3600);
        });
        it('should include IP address and user agent in session', async () => {
            const options = {
                ipAddress: '192.168.1.1',
                userAgent: 'Mozilla/5.0',
            };
            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mockPrisma.session.create.mockResolvedValue({});
            mockPrisma.user.update.mockResolvedValue({});
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
                role: client_1.UserRole.ACTOR,
            },
        };
        beforeEach(() => {
            jwt_1.generateAccessToken.mockReturnValue('new-access-token');
        });
        it('should successfully refresh access token', async () => {
            jwt_1.verifyToken.mockReturnValue({
                userId: 'user-id',
                sessionId: 'session-id',
                type: 'refresh',
            });
            mockPrisma.session.findUnique.mockResolvedValue(mockSession);
            const result = await authService.refreshToken(refreshToken);
            expect(result).toEqual({
                accessToken: 'new-access-token',
                expiresIn: 900,
            });
        });
        it('should throw AuthenticationError for invalid token', async () => {
            jwt_1.verifyToken.mockImplementation(() => {
                throw new Error('Invalid token');
            });
            await expect(authService.refreshToken('invalid-token')).rejects.toThrow(errors_1.AuthenticationError);
        });
        it('should throw AuthenticationError for wrong token type', async () => {
            jwt_1.verifyToken.mockReturnValue({
                userId: 'user-id',
                sessionId: 'session-id',
                type: 'access',
            });
            await expect(authService.refreshToken(refreshToken)).rejects.toThrow(errors_1.AuthenticationError);
        });
        it('should throw AuthenticationError for non-existent session', async () => {
            jwt_1.verifyToken.mockReturnValue({
                userId: 'user-id',
                sessionId: 'session-id',
                type: 'refresh',
            });
            mockPrisma.session.findUnique.mockResolvedValue(null);
            await expect(authService.refreshToken(refreshToken)).rejects.toThrow(errors_1.AuthenticationError);
        });
        it('should throw AuthenticationError for token mismatch', async () => {
            jwt_1.verifyToken.mockReturnValue({
                userId: 'user-id',
                sessionId: 'session-id',
                type: 'refresh',
            });
            const mismatchSession = { ...mockSession, token: 'different-token' };
            mockPrisma.session.findUnique.mockResolvedValue(mismatchSession);
            await expect(authService.refreshToken(refreshToken)).rejects.toThrow(errors_1.AuthenticationError);
        });
        it('should throw AuthenticationError for expired session', async () => {
            jwt_1.verifyToken.mockReturnValue({
                userId: 'user-id',
                sessionId: 'session-id',
                type: 'refresh',
            });
            const expiredSession = {
                ...mockSession,
                expiresAt: new Date(Date.now() - 60 * 60 * 1000),
            };
            mockPrisma.session.findUnique.mockResolvedValue(expiredSession);
            await expect(authService.refreshToken(refreshToken)).rejects.toThrow(errors_1.AuthenticationError);
        });
    });
    describe('logout', () => {
        it('should successfully logout user', async () => {
            mockPrisma.session.delete.mockResolvedValue({});
            mockCacheManager.delete.mockResolvedValue(undefined);
            await authService.logout('user-id', 'session-id');
            expect(mockPrisma.session.delete).toHaveBeenCalledWith({
                where: { id: 'session-id' },
            });
            expect(mockCacheManager.delete).toHaveBeenCalledWith(expect.stringContaining('user:user-id:session:session-id'));
        });
    });
    describe('forgotPassword', () => {
        const mockUser = {
            id: 'user-id',
            email: 'test@example.com',
        };
        beforeEach(() => {
            jwt_1.generateResetToken.mockReturnValue('reset-token');
            jwt_1.getTokenExpiry.mockReturnValue(new Date(Date.now() + 60 * 60 * 1000));
        });
        it('should generate reset token for existing user', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mockPrisma.user.update.mockResolvedValue({});
            await authService.forgotPassword('test@example.com');
            expect(jwt_1.generateResetToken).toHaveBeenCalledWith('user-id', 'test@example.com');
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
            password_1.validatePassword.mockReturnValue({
                isValid: true,
                errors: [],
                strength: 'strong',
            });
            password_1.hashPassword.mockResolvedValue('new-hashed-password');
        });
        it('should successfully reset password', async () => {
            jwt_1.verifyToken.mockReturnValue({
                userId: 'user-id',
                email: 'test@example.com',
                type: 'reset',
            });
            mockPrisma.user.findFirst.mockResolvedValue(mockUser);
            mockPrisma.user.update.mockResolvedValue({});
            mockPrisma.session.deleteMany.mockResolvedValue({});
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
            password_1.validatePassword.mockReturnValue({
                isValid: false,
                errors: ['Password too weak'],
                strength: 'weak',
            });
            await expect(authService.resetPassword(resetToken, 'weak')).rejects.toThrow(errors_1.ValidationError);
        });
        it('should throw AuthenticationError for invalid token', async () => {
            jwt_1.verifyToken.mockImplementation(() => {
                throw new Error('Invalid token');
            });
            await expect(authService.resetPassword('invalid-token', newPassword)).rejects.toThrow(errors_1.AuthenticationError);
        });
        it('should throw AuthenticationError for wrong token type', async () => {
            jwt_1.verifyToken.mockReturnValue({
                userId: 'user-id',
                type: 'access',
            });
            await expect(authService.resetPassword(resetToken, newPassword)).rejects.toThrow(errors_1.AuthenticationError);
        });
        it('should throw AuthenticationError for expired token', async () => {
            jwt_1.verifyToken.mockReturnValue({
                userId: 'user-id',
                email: 'test@example.com',
                type: 'reset',
            });
            mockPrisma.user.findFirst.mockResolvedValue(null);
            await expect(authService.resetPassword(resetToken, newPassword)).rejects.toThrow(errors_1.AuthenticationError);
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
            password_1.validatePassword.mockReturnValue({
                isValid: true,
                errors: [],
                strength: 'strong',
            });
            password_1.comparePassword.mockResolvedValue(true);
            password_1.hashPassword.mockResolvedValue('new-hashed-password');
        });
        it('should successfully change password', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mockPrisma.user.update.mockResolvedValue({});
            await authService.changePassword(userId, currentPassword, newPassword);
            expect(password_1.comparePassword).toHaveBeenCalledWith(currentPassword, 'current-hashed-password');
            expect(mockPrisma.user.update).toHaveBeenCalledWith({
                where: { id: userId },
                data: { password: 'new-hashed-password' },
            });
        });
        it('should throw ValidationError for weak new password', async () => {
            password_1.validatePassword.mockReturnValue({
                isValid: false,
                errors: ['Password too weak'],
                strength: 'weak',
            });
            await expect(authService.changePassword(userId, currentPassword, 'weak')).rejects.toThrow(errors_1.ValidationError);
        });
        it('should throw NotFoundError for non-existent user', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(null);
            await expect(authService.changePassword('invalid-id', currentPassword, newPassword)).rejects.toThrow(errors_1.NotFoundError);
        });
        it('should throw AuthenticationError for incorrect current password', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            password_1.comparePassword.mockResolvedValue(false);
            await expect(authService.changePassword(userId, 'wrong-password', newPassword)).rejects.toThrow(errors_1.AuthenticationError);
        });
    });
    describe('verifyEmail', () => {
        const verificationToken = 'valid-verification-token';
        it('should successfully verify email', async () => {
            jwt_1.verifyToken.mockReturnValue({
                userId: 'user-id',
                email: 'test@example.com',
                type: 'verification',
            });
            mockPrisma.user.update.mockResolvedValue({});
            await authService.verifyEmail(verificationToken);
            expect(mockPrisma.user.update).toHaveBeenCalledWith({
                where: { id: 'user-id' },
                data: { isEmailVerified: true },
            });
        });
        it('should throw AuthenticationError for invalid token', async () => {
            jwt_1.verifyToken.mockImplementation(() => {
                throw new Error('Invalid token');
            });
            await expect(authService.verifyEmail('invalid-token')).rejects.toThrow(errors_1.AuthenticationError);
        });
        it('should throw AuthenticationError for wrong token type', async () => {
            jwt_1.verifyToken.mockReturnValue({
                userId: 'user-id',
                type: 'access',
            });
            await expect(authService.verifyEmail(verificationToken)).rejects.toThrow(errors_1.AuthenticationError);
        });
    });
    describe('getCurrentUser', () => {
        const userId = 'user-id';
        const mockUser = {
            id: userId,
            email: 'test@example.com',
            phone: '+1234567890',
            role: client_1.UserRole.ACTOR,
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
            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
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
            await expect(authService.getCurrentUser('invalid-id')).rejects.toThrow(errors_1.NotFoundError);
        });
    });
});
//# sourceMappingURL=auth.service.test.js.map