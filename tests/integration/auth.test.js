"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const server_1 = require("../../src/server");
const database_1 = require("../../src/config/database");
const password_1 = require("../../src/utils/password");
describe('Authentication Endpoints', () => {
    beforeEach(async () => {
        await database_1.prisma.session.deleteMany();
        await database_1.prisma.actor.deleteMany();
        await database_1.prisma.castingDirector.deleteMany();
        await database_1.prisma.producer.deleteMany();
        await database_1.prisma.user.deleteMany();
    });
    describe('POST /api/auth/register', () => {
        it('should register a new actor', async () => {
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/register')
                .send({
                email: 'actor@test.com',
                password: 'StrongPass123!',
                confirmPassword: 'StrongPass123!',
                firstName: 'John',
                lastName: 'Doe',
                role: 'ACTOR',
                acceptTerms: true,
            });
            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user.email).toBe('actor@test.com');
            expect(response.body.data.user.role).toBe('ACTOR');
            expect(response.body.data.tokens.accessToken).toBeDefined();
            expect(response.body.data.tokens.refreshToken).toBeDefined();
        });
        it('should reject registration with existing email', async () => {
            await database_1.prisma.user.create({
                data: {
                    email: 'existing@test.com',
                    password: await (0, password_1.hashPassword)('Password123!'),
                    role: 'ACTOR',
                },
            });
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/register')
                .send({
                email: 'existing@test.com',
                password: 'StrongPass123!',
                confirmPassword: 'StrongPass123!',
                firstName: 'Jane',
                lastName: 'Doe',
                role: 'ACTOR',
                acceptTerms: true,
            });
            expect(response.status).toBe(409);
            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('already registered');
        });
        it('should reject registration with weak password', async () => {
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/register')
                .send({
                email: 'weak@test.com',
                password: 'weak',
                confirmPassword: 'weak',
                firstName: 'Weak',
                lastName: 'Pass',
                role: 'ACTOR',
                acceptTerms: true,
            });
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
        it('should reject registration when passwords do not match', async () => {
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/register')
                .send({
                email: 'mismatch@test.com',
                password: 'StrongPass123!',
                confirmPassword: 'DifferentPass123!',
                firstName: 'Miss',
                lastName: 'Match',
                role: 'ACTOR',
                acceptTerms: true,
            });
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.details).toContainEqual(expect.objectContaining({
                field: 'body.confirmPassword',
            }));
        });
    });
    describe('POST /api/auth/login', () => {
        beforeEach(async () => {
            await database_1.prisma.user.create({
                data: {
                    email: 'login@test.com',
                    password: await (0, password_1.hashPassword)('Password123!'),
                    role: 'ACTOR',
                    isActive: true,
                    actor: {
                        create: {
                            firstName: 'Test',
                            lastName: 'User',
                            dateOfBirth: new Date('1990-01-01'),
                            gender: 'MALE',
                            city: 'Mumbai',
                            state: 'Maharashtra',
                            languages: ['English', 'Hindi'],
                            skills: ['Acting'],
                        },
                    },
                },
            });
        });
        it('should login with valid credentials', async () => {
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/login')
                .send({
                email: 'login@test.com',
                password: 'Password123!',
            });
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user.email).toBe('login@test.com');
            expect(response.body.data.tokens.accessToken).toBeDefined();
            expect(response.body.data.tokens.refreshToken).toBeDefined();
        });
        it('should reject login with invalid password', async () => {
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/login')
                .send({
                email: 'login@test.com',
                password: 'WrongPassword123!',
            });
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('Invalid email or password');
        });
        it('should reject login with non-existent email', async () => {
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/login')
                .send({
                email: 'nonexistent@test.com',
                password: 'Password123!',
            });
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('Invalid email or password');
        });
        it('should reject login for inactive account', async () => {
            await database_1.prisma.user.update({
                where: { email: 'login@test.com' },
                data: { isActive: false },
            });
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/login')
                .send({
                email: 'login@test.com',
                password: 'Password123!',
            });
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('deactivated');
        });
    });
    describe('GET /api/auth/me', () => {
        let accessToken;
        let userId;
        beforeEach(async () => {
            const user = await database_1.prisma.user.create({
                data: {
                    email: 'me@test.com',
                    password: await (0, password_1.hashPassword)('Password123!'),
                    role: 'ACTOR',
                    isActive: true,
                    actor: {
                        create: {
                            firstName: 'Current',
                            lastName: 'User',
                            dateOfBirth: new Date('1990-01-01'),
                            gender: 'FEMALE',
                            city: 'Mumbai',
                            state: 'Maharashtra',
                            languages: ['English'],
                            skills: ['Acting'],
                        },
                    },
                },
            });
            userId = user.id;
            const loginResponse = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/login')
                .send({
                email: 'me@test.com',
                password: 'Password123!',
            });
            accessToken = loginResponse.body.data.tokens.accessToken;
        });
        it('should get current user with valid token', async () => {
            const response = await (0, supertest_1.default)(server_1.app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${accessToken}`);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user.email).toBe('me@test.com');
            expect(response.body.data.user.actor.firstName).toBe('Current');
        });
        it('should reject request without token', async () => {
            const response = await (0, supertest_1.default)(server_1.app)
                .get('/api/auth/me');
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
        it('should reject request with invalid token', async () => {
            const response = await (0, supertest_1.default)(server_1.app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalid-token');
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });
});
//# sourceMappingURL=auth.test.js.map