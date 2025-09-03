"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const server_1 = require("../../src/server");
const database_1 = require("../../src/config/database");
const password_1 = require("../../src/utils/password");
const redis_1 = require("../../src/config/redis");
describe('Authentication Security Tests', () => {
    let testUser;
    beforeEach(async () => {
        await database_1.prisma.session.deleteMany();
        await database_1.prisma.actor.deleteMany();
        await database_1.prisma.castingDirector.deleteMany();
        await database_1.prisma.producer.deleteMany();
        await database_1.prisma.user.deleteMany();
        testUser = await database_1.prisma.user.create({
            data: {
                email: 'security@test.com',
                password: await (0, password_1.hashPassword)('SecurePass123!'),
                role: 'ACTOR',
                isActive: true,
                actor: {
                    create: {
                        firstName: 'Security',
                        lastName: 'Test',
                        dateOfBirth: new Date('1990-01-01'),
                        gender: 'MALE',
                        city: 'Mumbai',
                        state: 'Maharashtra',
                        languages: ['English'],
                        skills: ['Acting'],
                    },
                },
            },
        });
        await redis_1.redis.flushdb();
    });
    afterEach(async () => {
        await redis_1.redis.flushdb();
    });
    describe('SQL Injection Protection', () => {
        it('should protect login endpoint from SQL injection', async () => {
            const sqlInjectionAttempts = [
                "admin'; DROP TABLE users; --",
                "admin' OR '1'='1",
                "admin' OR 1=1 --",
                "admin' UNION SELECT * FROM users --",
                "admin'; INSERT INTO users (email, password) VALUES ('hacker@test.com', 'hacked'); --",
            ];
            for (const injection of sqlInjectionAttempts) {
                const response = await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/login')
                    .send({
                    email: injection,
                    password: 'any-password',
                });
                expect(response.status).toBe(401);
                expect(response.body.success).toBe(false);
                expect(response.body.error.message).toContain('Invalid email or password');
            }
            const userCount = await database_1.prisma.user.count();
            expect(userCount).toBe(1);
        });
        it('should protect registration endpoint from SQL injection', async () => {
            const sqlInjectionAttempts = [
                "hacker'; DROP TABLE users; --@test.com",
                "admin@test.com'; INSERT INTO users (email, password) VALUES ('injected@test.com', 'hacked'); --",
            ];
            for (const injection of sqlInjectionAttempts) {
                const response = await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/register')
                    .send({
                    email: injection,
                    password: 'StrongPass123!',
                    confirmPassword: 'StrongPass123!',
                    firstName: 'John',
                    lastName: 'Doe',
                    role: 'ACTOR',
                    acceptTerms: true,
                });
                expect(response.status).toBe(400);
                expect(response.body.success).toBe(false);
            }
        });
    });
    describe('NoSQL Injection Protection', () => {
        it('should protect against NoSQL injection in login', async () => {
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/login')
                .send({
                email: { $ne: null },
                password: { $ne: null },
            });
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
        it('should protect against NoSQL injection in registration', async () => {
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/register')
                .send({
                email: { $ne: null },
                password: 'StrongPass123!',
                confirmPassword: 'StrongPass123!',
                firstName: 'John',
                lastName: 'Doe',
                role: 'ACTOR',
                acceptTerms: true,
            });
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });
    describe('Rate Limiting', () => {
        it('should rate limit login attempts', async () => {
            const requests = [];
            for (let i = 0; i < 6; i++) {
                requests.push((0, supertest_1.default)(server_1.app)
                    .post('/api/auth/login')
                    .send({
                    email: 'security@test.com',
                    password: 'WrongPassword123!',
                }));
            }
            const responses = await Promise.all(requests);
            responses.slice(0, 5).forEach(response => {
                expect(response.status).toBe(401);
            });
            expect(responses[5].status).toBe(429);
            expect(responses[5].body.error.message).toContain('Too many requests');
        }, 10000);
        it('should rate limit registration attempts', async () => {
            const requests = [];
            for (let i = 0; i < 6; i++) {
                requests.push((0, supertest_1.default)(server_1.app)
                    .post('/api/auth/register')
                    .send({
                    email: `user${i}@test.com`,
                    password: 'StrongPass123!',
                    confirmPassword: 'StrongPass123!',
                    firstName: 'John',
                    lastName: 'Doe',
                    role: 'ACTOR',
                    acceptTerms: true,
                }));
            }
            const responses = await Promise.all(requests);
            expect(responses[5].status).toBe(429);
        }, 10000);
        it('should rate limit password reset attempts', async () => {
            const requests = [];
            for (let i = 0; i < 6; i++) {
                requests.push((0, supertest_1.default)(server_1.app)
                    .post('/api/auth/forgot-password')
                    .send({
                    email: 'security@test.com',
                }));
            }
            const responses = await Promise.all(requests);
            expect(responses[5].status).toBe(429);
        }, 10000);
        it('should reset rate limit after time window', async () => {
            for (let i = 0; i < 5; i++) {
                await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/login')
                    .send({
                    email: 'security@test.com',
                    password: 'WrongPassword123!',
                });
            }
            const rateLimitedResponse = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/login')
                .send({
                email: 'security@test.com',
                password: 'WrongPassword123!',
            });
            expect(rateLimitedResponse.status).toBe(429);
            await new Promise(resolve => setTimeout(resolve, 1000));
            await redis_1.redis.flushdb();
            const newResponse = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/login')
                .send({
                email: 'security@test.com',
                password: 'WrongPassword123!',
            });
            expect(newResponse.status).toBe(401);
        }, 15000);
    });
    describe('Input Validation and Sanitization', () => {
        it('should reject malformed email addresses', async () => {
            const malformedEmails = [
                'not-an-email',
                '@domain.com',
                'user@',
                'user@domain',
                'user@@domain.com',
                'user space@domain.com',
                '<script>alert("xss")</script>@domain.com',
            ];
            for (const email of malformedEmails) {
                const response = await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/login')
                    .send({
                    email,
                    password: 'StrongPass123!',
                });
                expect(response.status).toBe(400);
                expect(response.body.success).toBe(false);
            }
        });
        it('should reject XSS attempts in input fields', async () => {
            const xssAttempts = [
                '<script>alert("xss")</script>',
                'javascript:alert("xss")',
                '<img src=x onerror=alert("xss")>',
                '"><script>alert("xss")</script>',
                "'><script>alert('xss')</script>",
            ];
            for (const xss of xssAttempts) {
                const response = await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/register')
                    .send({
                    email: 'test@example.com',
                    password: 'StrongPass123!',
                    confirmPassword: 'StrongPass123!',
                    firstName: xss,
                    lastName: 'Doe',
                    role: 'ACTOR',
                    acceptTerms: true,
                });
                expect(response.status).toBe(400);
                expect(response.body.success).toBe(false);
            }
        });
        it('should validate password strength requirements', async () => {
            const weakPasswords = [
                '123456',
                'password',
                'abc123',
                'Password',
                'password123',
                'PASSWORD123',
                'Password123',
                'Pass1!',
            ];
            for (const password of weakPasswords) {
                const response = await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/register')
                    .send({
                    email: `test${Date.now()}@example.com`,
                    password,
                    confirmPassword: password,
                    firstName: 'John',
                    lastName: 'Doe',
                    role: 'ACTOR',
                    acceptTerms: true,
                });
                expect(response.status).toBe(400);
                expect(response.body.success).toBe(false);
                expect(response.body.error.message).toContain('Password does not meet requirements');
            }
        });
        it('should enforce maximum field lengths', async () => {
            const longString = 'a'.repeat(1000);
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/register')
                .send({
                email: `${longString}@example.com`,
                password: 'StrongPass123!',
                confirmPassword: 'StrongPass123!',
                firstName: longString,
                lastName: longString,
                role: 'ACTOR',
                acceptTerms: true,
            });
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });
    describe('JWT Security', () => {
        let validToken;
        beforeEach(async () => {
            const loginResponse = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/login')
                .send({
                email: 'security@test.com',
                password: 'SecurePass123!',
            });
            validToken = loginResponse.body.data.tokens.accessToken;
        });
        it('should reject malformed JWT tokens', async () => {
            const malformedTokens = [
                'not.a.jwt',
                'header.payload',
                'header.payload.signature.extra',
                'invalid-token',
                '',
            ];
            for (const token of malformedTokens) {
                const response = await (0, supertest_1.default)(server_1.app)
                    .get('/api/auth/me')
                    .set('Authorization', `Bearer ${token}`);
                expect(response.status).toBe(401);
                expect(response.body.success).toBe(false);
            }
        });
        it('should reject JWT tokens with invalid signatures', async () => {
            const [header, payload] = validToken.split('.');
            const invalidToken = `${header}.${payload}.wrong-signature`;
            const response = await (0, supertest_1.default)(server_1.app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${invalidToken}`);
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
        it('should reject tokens without proper authorization header format', async () => {
            const invalidHeaders = [
                validToken,
                `Basic ${validToken}`,
                `Bearer`,
                `Bearer ${validToken} extra`,
            ];
            for (const header of invalidHeaders) {
                const response = await (0, supertest_1.default)(server_1.app)
                    .get('/api/auth/me')
                    .set('Authorization', header);
                expect(response.status).toBe(401);
                expect(response.body.success).toBe(false);
            }
        });
        it('should handle token expiration gracefully', async () => {
            const response = await (0, supertest_1.default)(server_1.app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer expired.token.here');
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });
    describe('Session Security', () => {
        it('should invalidate session on logout', async () => {
            const loginResponse = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/login')
                .send({
                email: 'security@test.com',
                password: 'SecurePass123!',
            });
            const { accessToken } = loginResponse.body.data.tokens;
            const meResponse1 = await (0, supertest_1.default)(server_1.app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${accessToken}`);
            expect(meResponse1.status).toBe(200);
            await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${accessToken}`);
            const meResponse2 = await (0, supertest_1.default)(server_1.app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${accessToken}`);
            expect(meResponse2.status).toBe(401);
        });
        it('should prevent session fixation attacks', async () => {
            const login1 = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/login')
                .send({
                email: 'security@test.com',
                password: 'SecurePass123!',
            });
            const login2 = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/login')
                .send({
                email: 'security@test.com',
                password: 'SecurePass123!',
            });
            expect(login1.body.data.tokens.accessToken).not.toBe(login2.body.data.tokens.accessToken);
            expect(login1.body.data.tokens.refreshToken).not.toBe(login2.body.data.tokens.refreshToken);
        });
    });
    describe('CSRF Protection', () => {
        it('should require proper content type for state-changing operations', async () => {
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/login')
                .set('Content-Type', 'text/plain')
                .send('email=security@test.com&password=SecurePass123!');
            expect(response.status).toBe(400);
        });
        it('should validate request origin for sensitive operations', async () => {
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/login')
                .set('Origin', 'https://malicious-site.com')
                .send({
                email: 'security@test.com',
                password: 'SecurePass123!',
            });
            expect(response.header['access-control-allow-origin']).not.toBe('https://malicious-site.com');
        });
    });
    describe('Brute Force Protection', () => {
        it('should implement account lockout after failed attempts', async () => {
            const maxAttempts = 5;
            for (let i = 0; i < maxAttempts; i++) {
                await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/login')
                    .send({
                    email: 'security@test.com',
                    password: 'WrongPassword123!',
                });
            }
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/login')
                .send({
                email: 'security@test.com',
                password: 'SecurePass123!',
            });
            expect(response.status).toBe(429);
            expect(response.body.error.message).toContain('Too many requests');
        });
        it('should reset failed attempts counter on successful login', async () => {
            for (let i = 0; i < 3; i++) {
                await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/login')
                    .send({
                    email: 'security@test.com',
                    password: 'WrongPassword123!',
                });
            }
            const successResponse = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/login')
                .send({
                email: 'security@test.com',
                password: 'SecurePass123!',
            });
            expect(successResponse.status).toBe(200);
            const nextResponse = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/login')
                .send({
                email: 'security@test.com',
                password: 'WrongPassword123!',
            });
            expect(nextResponse.status).toBe(401);
        });
    });
    describe('Information Disclosure Protection', () => {
        it('should not reveal whether user exists in forgot password', async () => {
            const existingUserResponse = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/forgot-password')
                .send({
                email: 'security@test.com',
            });
            const nonExistentUserResponse = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/forgot-password')
                .send({
                email: 'nonexistent@test.com',
            });
            expect(existingUserResponse.status).toBe(nonExistentUserResponse.status);
            expect(existingUserResponse.body.message).toBe(nonExistentUserResponse.body.message);
        });
        it('should not reveal user existence in login errors', async () => {
            const nonExistentResponse = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/login')
                .send({
                email: 'nonexistent@test.com',
                password: 'AnyPassword123!',
            });
            const wrongPasswordResponse = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/login')
                .send({
                email: 'security@test.com',
                password: 'WrongPassword123!',
            });
            expect(nonExistentResponse.status).toBe(401);
            expect(wrongPasswordResponse.status).toBe(401);
            expect(nonExistentResponse.body.error.message).toBe(wrongPasswordResponse.body.error.message);
        });
        it('should not expose sensitive data in error responses', async () => {
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/login')
                .send({
                email: 'security@test.com',
                password: 'WrongPassword123!',
            });
            expect(response.body.error.message).not.toContain('password');
            expect(response.body.error.message).not.toContain('hash');
            expect(response.body.error.message).not.toContain('bcrypt');
            expect(response.body).not.toHaveProperty('stack');
        });
    });
    describe('Input Size Limits', () => {
        it('should reject oversized request payloads', async () => {
            const oversizedPayload = {
                email: 'test@example.com',
                password: 'StrongPass123!',
                confirmPassword: 'StrongPass123!',
                firstName: 'A'.repeat(10000),
                lastName: 'Doe',
                role: 'ACTOR',
                acceptTerms: true,
            };
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/register')
                .send(oversizedPayload);
            expect(response.status).toBe(400);
        });
    });
});
//# sourceMappingURL=auth.security.test.js.map