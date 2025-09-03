"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwt_1 = require("../../../src/utils/jwt");
const client_1 = require("@prisma/client");
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
    const mockRole = client_1.UserRole.ACTOR;
    const mockSessionId = 'session-123';
    describe('generateAccessToken', () => {
        it('should generate a valid access token', () => {
            const token = (0, jwt_1.generateAccessToken)(mockUserId, mockEmail, mockRole, mockSessionId);
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3);
        });
        it('should include correct payload in access token', () => {
            const token = (0, jwt_1.generateAccessToken)(mockUserId, mockEmail, mockRole, mockSessionId);
            const decoded = (0, jwt_1.decodeToken)(token);
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
            const token1 = (0, jwt_1.generateAccessToken)(mockUserId, mockEmail, mockRole, mockSessionId);
            const token2 = (0, jwt_1.generateAccessToken)(mockUserId, mockEmail, mockRole, mockSessionId);
            expect(token1).not.toBe(token2);
        });
        it('should generate tokens that expire in 15 minutes', () => {
            const token = (0, jwt_1.generateAccessToken)(mockUserId, mockEmail, mockRole, mockSessionId);
            const decoded = (0, jwt_1.decodeToken)(token);
            const expirationTime = decoded.exp * 1000;
            const currentTime = Date.now();
            const timeDifference = expirationTime - currentTime;
            expect(timeDifference).toBeGreaterThan(890000);
            expect(timeDifference).toBeLessThan(910000);
        });
    });
    describe('generateRefreshToken', () => {
        it('should generate a valid refresh token', () => {
            const token = (0, jwt_1.generateRefreshToken)(mockUserId, mockSessionId);
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3);
        });
        it('should include correct payload in refresh token', () => {
            const token = (0, jwt_1.generateRefreshToken)(mockUserId, mockSessionId);
            const decoded = (0, jwt_1.decodeToken)(token);
            expect(decoded.userId).toBe(mockUserId);
            expect(decoded.sessionId).toBe(mockSessionId);
            expect(decoded.type).toBe('refresh');
            expect(decoded.iss).toBe('castmatch');
            expect(decoded.aud).toBe('castmatch-api');
            expect(decoded.email).toBeUndefined();
        });
        it('should generate tokens that expire in 7 days', () => {
            const token = (0, jwt_1.generateRefreshToken)(mockUserId, mockSessionId);
            const decoded = (0, jwt_1.decodeToken)(token);
            const expirationTime = decoded.exp * 1000;
            const currentTime = Date.now();
            const timeDifference = expirationTime - currentTime;
            expect(timeDifference).toBeGreaterThan(604700000);
            expect(timeDifference).toBeLessThan(604900000);
        });
    });
    describe('generateResetToken', () => {
        it('should generate a valid reset token', () => {
            const token = (0, jwt_1.generateResetToken)(mockUserId, mockEmail);
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3);
        });
        it('should include correct payload in reset token', () => {
            const token = (0, jwt_1.generateResetToken)(mockUserId, mockEmail);
            const decoded = (0, jwt_1.decodeToken)(token);
            expect(decoded.userId).toBe(mockUserId);
            expect(decoded.email).toBe(mockEmail);
            expect(decoded.type).toBe('reset');
            expect(decoded.iss).toBe('castmatch');
            expect(decoded.aud).toBe('castmatch-api');
        });
        it('should generate tokens that expire in 1 hour', () => {
            const token = (0, jwt_1.generateResetToken)(mockUserId, mockEmail);
            const decoded = (0, jwt_1.decodeToken)(token);
            const expirationTime = decoded.exp * 1000;
            const currentTime = Date.now();
            const timeDifference = expirationTime - currentTime;
            expect(timeDifference).toBeGreaterThan(3590000);
            expect(timeDifference).toBeLessThan(3610000);
        });
    });
    describe('generateVerificationToken', () => {
        it('should generate a valid verification token', () => {
            const token = (0, jwt_1.generateVerificationToken)(mockUserId, mockEmail);
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3);
        });
        it('should include correct payload in verification token', () => {
            const token = (0, jwt_1.generateVerificationToken)(mockUserId, mockEmail);
            const decoded = (0, jwt_1.decodeToken)(token);
            expect(decoded.userId).toBe(mockUserId);
            expect(decoded.email).toBe(mockEmail);
            expect(decoded.type).toBe('verification');
            expect(decoded.iss).toBe('castmatch');
            expect(decoded.aud).toBe('castmatch-api');
        });
        it('should generate tokens that expire in 24 hours', () => {
            const token = (0, jwt_1.generateVerificationToken)(mockUserId, mockEmail);
            const decoded = (0, jwt_1.decodeToken)(token);
            const expirationTime = decoded.exp * 1000;
            const currentTime = Date.now();
            const timeDifference = expirationTime - currentTime;
            expect(timeDifference).toBeGreaterThan(86300000);
            expect(timeDifference).toBeLessThan(86500000);
        });
    });
    describe('verifyToken', () => {
        it('should verify and decode a valid token', () => {
            const token = (0, jwt_1.generateAccessToken)(mockUserId, mockEmail, mockRole, mockSessionId);
            const payload = (0, jwt_1.verifyToken)(token);
            expect(payload.userId).toBe(mockUserId);
            expect(payload.email).toBe(mockEmail);
            expect(payload.role).toBe(mockRole);
            expect(payload.sessionId).toBe(mockSessionId);
            expect(payload.type).toBe('access');
        });
        it('should throw error for invalid token', () => {
            expect(() => {
                (0, jwt_1.verifyToken)('invalid-token');
            }).toThrow();
        });
        it('should throw error for token with wrong secret', () => {
            const fakeToken = jsonwebtoken_1.default.sign({ userId: mockUserId, type: 'access' }, 'wrong-secret', { expiresIn: '15m', issuer: 'castmatch', audience: 'castmatch-api' });
            expect(() => {
                (0, jwt_1.verifyToken)(fakeToken);
            }).toThrow();
        });
        it('should throw error for expired token', async () => {
            const expiredToken = jsonwebtoken_1.default.sign({ userId: mockUserId, type: 'access' }, 'test-secret-key', { expiresIn: '-1h', issuer: 'castmatch', audience: 'castmatch-api' });
            expect(() => {
                (0, jwt_1.verifyToken)(expiredToken);
            }).toThrow();
        });
        it('should throw error for token with wrong issuer', () => {
            const wrongIssuerToken = jsonwebtoken_1.default.sign({ userId: mockUserId, type: 'access' }, 'test-secret-key', { expiresIn: '15m', issuer: 'wrong-issuer', audience: 'castmatch-api' });
            expect(() => {
                (0, jwt_1.verifyToken)(wrongIssuerToken);
            }).toThrow();
        });
        it('should throw error for token with wrong audience', () => {
            const wrongAudienceToken = jsonwebtoken_1.default.sign({ userId: mockUserId, type: 'access' }, 'test-secret-key', { expiresIn: '15m', issuer: 'castmatch', audience: 'wrong-audience' });
            expect(() => {
                (0, jwt_1.verifyToken)(wrongAudienceToken);
            }).toThrow();
        });
    });
    describe('decodeToken', () => {
        it('should decode token without verification', () => {
            const token = (0, jwt_1.generateAccessToken)(mockUserId, mockEmail, mockRole, mockSessionId);
            const decoded = (0, jwt_1.decodeToken)(token);
            expect(decoded.userId).toBe(mockUserId);
            expect(decoded.email).toBe(mockEmail);
            expect(decoded.role).toBe(mockRole);
            expect(decoded.sessionId).toBe(mockSessionId);
            expect(decoded.type).toBe('access');
        });
        it('should decode invalid token structure', () => {
            const invalidToken = 'invalid.token.structure';
            const decoded = (0, jwt_1.decodeToken)(invalidToken);
            expect(decoded).toBeNull();
        });
        it('should decode expired token', () => {
            const expiredToken = jsonwebtoken_1.default.sign({ userId: mockUserId, type: 'access' }, 'test-secret-key', { expiresIn: '-1h', issuer: 'castmatch', audience: 'castmatch-api' });
            const decoded = (0, jwt_1.decodeToken)(expiredToken);
            expect(decoded.userId).toBe(mockUserId);
            expect(decoded.exp).toBeLessThan(Date.now() / 1000);
        });
    });
    describe('generateSessionId', () => {
        it('should generate a valid UUID', () => {
            const sessionId = (0, jwt_1.generateSessionId)();
            expect(sessionId).toBeDefined();
            expect(typeof sessionId).toBe('string');
            expect(sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
        });
        it('should generate unique session IDs', () => {
            const sessionId1 = (0, jwt_1.generateSessionId)();
            const sessionId2 = (0, jwt_1.generateSessionId)();
            expect(sessionId1).not.toBe(sessionId2);
        });
        it('should generate multiple unique session IDs', () => {
            const sessionIds = new Set();
            for (let i = 0; i < 100; i++) {
                sessionIds.add((0, jwt_1.generateSessionId)());
            }
            expect(sessionIds.size).toBe(100);
        });
    });
    describe('getTokenExpiry', () => {
        it('should calculate expiry for seconds', () => {
            const expiry = (0, jwt_1.getTokenExpiry)('30s');
            const now = new Date();
            const timeDifference = expiry.getTime() - now.getTime();
            expect(timeDifference).toBeGreaterThan(29000);
            expect(timeDifference).toBeLessThan(31000);
        });
        it('should calculate expiry for minutes', () => {
            const expiry = (0, jwt_1.getTokenExpiry)('15m');
            const now = new Date();
            const timeDifference = expiry.getTime() - now.getTime();
            expect(timeDifference).toBeGreaterThan(890000);
            expect(timeDifference).toBeLessThan(910000);
        });
        it('should calculate expiry for hours', () => {
            const expiry = (0, jwt_1.getTokenExpiry)('2h');
            const now = new Date();
            const timeDifference = expiry.getTime() - now.getTime();
            expect(timeDifference).toBeGreaterThan(7190000);
            expect(timeDifference).toBeLessThan(7210000);
        });
        it('should calculate expiry for days', () => {
            const expiry = (0, jwt_1.getTokenExpiry)('1d');
            const now = new Date();
            const timeDifference = expiry.getTime() - now.getTime();
            expect(timeDifference).toBeGreaterThan(86390000);
            expect(timeDifference).toBeLessThan(86410000);
        });
        it('should throw error for invalid format', () => {
            expect(() => {
                (0, jwt_1.getTokenExpiry)('invalid');
            }).toThrow('Invalid expiry format');
        });
        it('should throw error for invalid unit', () => {
            expect(() => {
                (0, jwt_1.getTokenExpiry)('10x');
            }).toThrow('Invalid time unit');
        });
        it('should throw error for undefined expiry', () => {
            expect(() => {
                (0, jwt_1.getTokenExpiry)(undefined);
            }).toThrow('Expiry string is required');
        });
        it('should handle zero values', () => {
            const expiry = (0, jwt_1.getTokenExpiry)('0s');
            const now = new Date();
            const timeDifference = Math.abs(expiry.getTime() - now.getTime());
            expect(timeDifference).toBeLessThan(1000);
        });
    });
    describe('Token Security', () => {
        it('should generate tokens with different signatures for same payload', () => {
            const token1 = (0, jwt_1.generateAccessToken)(mockUserId, mockEmail, mockRole, mockSessionId);
            setTimeout(() => {
                const token2 = (0, jwt_1.generateAccessToken)(mockUserId, mockEmail, mockRole, mockSessionId);
                expect(token1).not.toBe(token2);
            }, 1);
        });
        it('should include issuer and audience claims for security', () => {
            const token = (0, jwt_1.generateAccessToken)(mockUserId, mockEmail, mockRole, mockSessionId);
            const decoded = (0, jwt_1.decodeToken)(token);
            expect(decoded.iss).toBe('castmatch');
            expect(decoded.aud).toBe('castmatch-api');
        });
        it('should include issued at time', () => {
            const beforeToken = Date.now() / 1000;
            const token = (0, jwt_1.generateAccessToken)(mockUserId, mockEmail, mockRole, mockSessionId);
            const afterToken = Date.now() / 1000;
            const decoded = (0, jwt_1.decodeToken)(token);
            expect(decoded.iat).toBeGreaterThanOrEqual(beforeToken - 1);
            expect(decoded.iat).toBeLessThanOrEqual(afterToken + 1);
        });
    });
});
//# sourceMappingURL=jwt.test.js.map