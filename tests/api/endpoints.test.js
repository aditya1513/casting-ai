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
describe('API Endpoints', () => {
    let testUsers = {};
    let authTokens = {};
    beforeAll(async () => {
        await database_1.prisma.session.deleteMany();
        await database_1.prisma.actor.deleteMany();
        await database_1.prisma.castingDirector.deleteMany();
        await database_1.prisma.producer.deleteMany();
        await database_1.prisma.user.deleteMany();
        await redis_1.redis.flushdb();
        const users = [
            {
                email: 'actor.api@test.com',
                password: 'ActorPass123!',
                role: 'ACTOR',
                firstName: 'Test',
                lastName: 'Actor',
                profile: {
                    dateOfBirth: new Date('1990-01-01'),
                    gender: 'MALE',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    languages: ['English', 'Hindi'],
                    skills: ['Acting', 'Dancing'],
                },
            },
            {
                email: 'cd.api@test.com',
                password: 'CdPass123!',
                role: 'CASTING_DIRECTOR',
                firstName: 'Test',
                lastName: 'CastingDirector',
                profile: {
                    companyName: 'Test Casting Co.',
                    specializations: ['Film', 'TV Series'],
                },
            },
            {
                email: 'producer.api@test.com',
                password: 'ProducerPass123!',
                role: 'PRODUCER',
                firstName: 'Test',
                lastName: 'Producer',
                profile: {
                    productionHouse: 'Test Productions',
                },
            },
        ];
        for (const userData of users) {
            const user = await database_1.prisma.user.create({
                data: {
                    email: userData.email,
                    password: await (0, password_1.hashPassword)(userData.password),
                    role: userData.role,
                    isActive: true,
                    isEmailVerified: true,
                },
            });
            if (userData.role === 'ACTOR') {
                await database_1.prisma.actor.create({
                    data: {
                        userId: user.id,
                        firstName: userData.firstName,
                        lastName: userData.lastName,
                        ...userData.profile,
                    },
                });
            }
            else if (userData.role === 'CASTING_DIRECTOR') {
                await database_1.prisma.castingDirector.create({
                    data: {
                        userId: user.id,
                        firstName: userData.firstName,
                        lastName: userData.lastName,
                        ...userData.profile,
                    },
                });
            }
            else if (userData.role === 'PRODUCER') {
                await database_1.prisma.producer.create({
                    data: {
                        userId: user.id,
                        firstName: userData.firstName,
                        lastName: userData.lastName,
                        ...userData.profile,
                    },
                });
            }
            testUsers[userData.role.toLowerCase()] = { ...userData, id: user.id };
            const loginResponse = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/login')
                .send({
                email: userData.email,
                password: userData.password,
            });
            if (loginResponse.status === 200) {
                authTokens[userData.role.toLowerCase()] = loginResponse.body.data.tokens.accessToken;
            }
        }
    });
    afterAll(async () => {
        await redis_1.redis.flushdb();
        await database_1.prisma.$disconnect();
    });
    describe('Authentication Endpoints', () => {
        describe('POST /api/auth/register', () => {
            it('should register a new user with valid data', async () => {
                const response = await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/register')
                    .send({
                    email: 'newuser@test.com',
                    password: 'NewUser123!',
                    confirmPassword: 'NewUser123!',
                    firstName: 'New',
                    lastName: 'User',
                    role: 'ACTOR',
                    acceptTerms: true,
                });
                expect(response.status).toBe(201);
                expect(response.body.success).toBe(true);
                expect(response.body.data.user.email).toBe('newuser@test.com');
                expect(response.body.data.tokens.accessToken).toBeDefined();
            });
            it('should return 400 for invalid email format', async () => {
                const response = await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/register')
                    .send({
                    email: 'invalid-email',
                    password: 'ValidPass123!',
                    confirmPassword: 'ValidPass123!',
                    firstName: 'Invalid',
                    lastName: 'Email',
                    role: 'ACTOR',
                    acceptTerms: true,
                });
                expect(response.status).toBe(400);
                expect(response.body.success).toBe(false);
                expect(response.body.error).toBeDefined();
            });
            it('should return 400 for weak password', async () => {
                const response = await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/register')
                    .send({
                    email: 'weak@test.com',
                    password: 'weak',
                    confirmPassword: 'weak',
                    firstName: 'Weak',
                    lastName: 'Password',
                    role: 'ACTOR',
                    acceptTerms: true,
                });
                expect(response.status).toBe(400);
                expect(response.body.success).toBe(false);
            });
            it('should return 400 when passwords do not match', async () => {
                const response = await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/register')
                    .send({
                    email: 'mismatch@test.com',
                    password: 'ValidPass123!',
                    confirmPassword: 'DifferentPass123!',
                    firstName: 'Password',
                    lastName: 'Mismatch',
                    role: 'ACTOR',
                    acceptTerms: true,
                });
                expect(response.status).toBe(400);
                expect(response.body.success).toBe(false);
            });
            it('should return 409 for duplicate email', async () => {
                const response = await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/register')
                    .send({
                    email: testUsers.actor.email,
                    password: 'ValidPass123!',
                    confirmPassword: 'ValidPass123!',
                    firstName: 'Duplicate',
                    lastName: 'Email',
                    role: 'ACTOR',
                    acceptTerms: true,
                });
                expect(response.status).toBe(409);
                expect(response.body.success).toBe(false);
            });
            it('should return 400 for missing required fields', async () => {
                const response = await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/register')
                    .send({
                    email: 'incomplete@test.com',
                });
                expect(response.status).toBe(400);
                expect(response.body.success).toBe(false);
            });
            it('should return 400 for invalid role', async () => {
                const response = await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/register')
                    .send({
                    email: 'invalidrole@test.com',
                    password: 'ValidPass123!',
                    confirmPassword: 'ValidPass123!',
                    firstName: 'Invalid',
                    lastName: 'Role',
                    role: 'INVALID_ROLE',
                    acceptTerms: true,
                });
                expect(response.status).toBe(400);
                expect(response.body.success).toBe(false);
            });
            it('should return 400 when terms are not accepted', async () => {
                const response = await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/register')
                    .send({
                    email: 'noterms@test.com',
                    password: 'ValidPass123!',
                    confirmPassword: 'ValidPass123!',
                    firstName: 'No',
                    lastName: 'Terms',
                    role: 'ACTOR',
                    acceptTerms: false,
                });
                expect(response.status).toBe(400);
                expect(response.body.success).toBe(false);
            });
        });
        describe('POST /api/auth/login', () => {
            it('should login with valid credentials', async () => {
                const response = await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/login')
                    .send({
                    email: testUsers.actor.email,
                    password: testUsers.actor.password,
                });
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data.tokens.accessToken).toBeDefined();
                expect(response.body.data.user.email).toBe(testUsers.actor.email);
            });
            it('should return 401 for invalid email', async () => {
                const response = await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/login')
                    .send({
                    email: 'nonexistent@test.com',
                    password: 'AnyPassword123!',
                });
                expect(response.status).toBe(401);
                expect(response.body.success).toBe(false);
                expect(response.body.error.message).toContain('Invalid email or password');
            });
            it('should return 401 for invalid password', async () => {
                const response = await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/login')
                    .send({
                    email: testUsers.actor.email,
                    password: 'WrongPassword123!',
                });
                expect(response.status).toBe(401);
                expect(response.body.success).toBe(false);
                expect(response.body.error.message).toContain('Invalid email or password');
            });
            it('should return 400 for malformed request', async () => {
                const response = await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/login')
                    .send({});
                expect(response.status).toBe(400);
                expect(response.body.success).toBe(false);
            });
            it('should handle remember me flag', async () => {
                const response = await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/login')
                    .send({
                    email: testUsers.actor.email,
                    password: testUsers.actor.password,
                    rememberMe: true,
                });
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });
        });
        describe('GET /api/auth/me', () => {
            it('should return current user with valid token', async () => {
                const response = await (0, supertest_1.default)(server_1.app)
                    .get('/api/auth/me')
                    .set('Authorization', `Bearer ${authTokens.actor}`);
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data.user.email).toBe(testUsers.actor.email);
                expect(response.body.data.user.actor).toBeDefined();
            });
            it('should return 401 without authorization header', async () => {
                const response = await (0, supertest_1.default)(server_1.app).get('/api/auth/me');
                expect(response.status).toBe(401);
                expect(response.body.success).toBe(false);
            });
            it('should return 401 with invalid token', async () => {
                const response = await (0, supertest_1.default)(server_1.app)
                    .get('/api/auth/me')
                    .set('Authorization', 'Bearer invalid-token');
                expect(response.status).toBe(401);
                expect(response.body.success).toBe(false);
            });
            it('should return 401 with malformed authorization header', async () => {
                const response = await (0, supertest_1.default)(server_1.app)
                    .get('/api/auth/me')
                    .set('Authorization', 'InvalidFormat token');
                expect(response.status).toBe(401);
                expect(response.body.success).toBe(false);
            });
        });
        describe('POST /api/auth/refresh-token', () => {
            it('should refresh token with valid refresh token', async () => {
                const loginResponse = await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/login')
                    .send({
                    email: testUsers.actor.email,
                    password: testUsers.actor.password,
                });
                const refreshToken = loginResponse.body.data.tokens.refreshToken;
                const response = await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/refresh-token')
                    .send({
                    refreshToken,
                });
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data.accessToken).toBeDefined();
            });
            it('should return 401 with invalid refresh token', async () => {
                const response = await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/refresh-token')
                    .send({
                    refreshToken: 'invalid-refresh-token',
                });
                expect(response.status).toBe(401);
                expect(response.body.success).toBe(false);
            });
        });
        describe('POST /api/auth/logout', () => {
            it('should logout user successfully', async () => {
                const response = await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/logout')
                    .set('Authorization', `Bearer ${authTokens.actor}`);
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });
            it('should return 401 without authorization', async () => {
                const response = await (0, supertest_1.default)(server_1.app).post('/api/auth/logout');
                expect(response.status).toBe(401);
                expect(response.body.success).toBe(false);
            });
        });
        describe('POST /api/auth/forgot-password', () => {
            it('should accept password reset request', async () => {
                const response = await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/forgot-password')
                    .send({
                    email: testUsers.actor.email,
                });
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });
            it('should accept request for non-existent email (security)', async () => {
                const response = await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/forgot-password')
                    .send({
                    email: 'nonexistent@test.com',
                });
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });
            it('should return 400 for invalid email format', async () => {
                const response = await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/forgot-password')
                    .send({
                    email: 'invalid-email',
                });
                expect(response.status).toBe(400);
                expect(response.body.success).toBe(false);
            });
        });
    });
    describe('Profile Endpoints', () => {
        describe('GET /api/profile', () => {
            it('should return actor profile', async () => {
                const response = await (0, supertest_1.default)(server_1.app)
                    .get('/api/profile')
                    .set('Authorization', `Bearer ${authTokens.actor}`);
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data.profile).toBeDefined();
                expect(response.body.data.profile.firstName).toBe(testUsers.actor.firstName);
            });
            it('should return casting director profile', async () => {
                const response = await (0, supertest_1.default)(server_1.app)
                    .get('/api/profile')
                    .set('Authorization', `Bearer ${authTokens.casting_director}`);
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data.profile.companyName).toBeDefined();
            });
            it('should return producer profile', async () => {
                const response = await (0, supertest_1.default)(server_1.app)
                    .get('/api/profile')
                    .set('Authorization', `Bearer ${authTokens.producer}`);
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data.profile.productionHouse).toBeDefined();
            });
            it('should return 401 without authentication', async () => {
                const response = await (0, supertest_1.default)(server_1.app).get('/api/profile');
                expect(response.status).toBe(401);
                expect(response.body.success).toBe(false);
            });
        });
        describe('PUT /api/profile', () => {
            it('should update actor profile', async () => {
                const updateData = {
                    bio: 'Updated bio for testing',
                    city: 'Delhi',
                    languages: ['English', 'Hindi', 'Tamil'],
                    skills: ['Acting', 'Dancing', 'Singing'],
                };
                const response = await (0, supertest_1.default)(server_1.app)
                    .put('/api/profile')
                    .set('Authorization', `Bearer ${authTokens.actor}`)
                    .send(updateData);
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data.profile.bio).toBe(updateData.bio);
                expect(response.body.data.profile.city).toBe(updateData.city);
            });
            it('should update casting director profile', async () => {
                const updateData = {
                    bio: 'Updated casting director bio',
                    companyName: 'Updated Casting Co.',
                    specializations: ['Film', 'Web Series', 'Commercials'],
                };
                const response = await (0, supertest_1.default)(server_1.app)
                    .put('/api/profile')
                    .set('Authorization', `Bearer ${authTokens.casting_director}`)
                    .send(updateData);
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data.profile.companyName).toBe(updateData.companyName);
            });
            it('should return 401 without authentication', async () => {
                const response = await (0, supertest_1.default)(server_1.app)
                    .put('/api/profile')
                    .send({ bio: 'Unauthorized update' });
                expect(response.status).toBe(401);
                expect(response.body.success).toBe(false);
            });
            it('should validate profile data', async () => {
                const invalidData = {
                    firstName: '',
                    email: 'invalid-email',
                };
                const response = await (0, supertest_1.default)(server_1.app)
                    .put('/api/profile')
                    .set('Authorization', `Bearer ${authTokens.actor}`)
                    .send(invalidData);
                expect(response.status).toBe(400);
                expect(response.body.success).toBe(false);
            });
        });
    });
    describe('Error Handling', () => {
        it('should handle 404 for non-existent endpoints', async () => {
            const response = await (0, supertest_1.default)(server_1.app).get('/api/non-existent-endpoint');
            expect(response.status).toBe(404);
        });
        it('should handle malformed JSON', async () => {
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/login')
                .set('Content-Type', 'application/json')
                .send('{ invalid json }');
            expect(response.status).toBe(400);
        });
        it('should handle unsupported HTTP methods', async () => {
            const response = await (0, supertest_1.default)(server_1.app)
                .patch('/api/auth/login');
            expect(response.status).toBe(405);
        });
        it('should return consistent error format', async () => {
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/login')
                .send({
                email: 'invalid',
                password: 'weak',
            });
            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toHaveProperty('message');
            expect(response.body.error).toHaveProperty('code');
        });
        it('should not expose sensitive information in errors', async () => {
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/login')
                .send({
                email: 'test@example.com',
                password: 'wrong',
            });
            expect(response.body.error.message).not.toContain('password');
            expect(response.body.error.message).not.toContain('hash');
            expect(response.body.error.message).not.toContain('database');
            expect(response.body).not.toHaveProperty('stack');
        });
    });
    describe('Input Validation', () => {
        it('should validate email formats', async () => {
            const invalidEmails = [
                'not-an-email',
                '@domain.com',
                'user@',
                'user@@domain.com',
                'user with spaces@domain.com',
            ];
            for (const email of invalidEmails) {
                const response = await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/register')
                    .send({
                    email,
                    password: 'ValidPass123!',
                    confirmPassword: 'ValidPass123!',
                    firstName: 'Test',
                    lastName: 'User',
                    role: 'ACTOR',
                    acceptTerms: true,
                });
                expect(response.status).toBe(400);
                expect(response.body.success).toBe(false);
            }
        });
        it('should validate required fields', async () => {
            const requiredFields = ['email', 'password', 'firstName', 'lastName', 'role'];
            for (const field of requiredFields) {
                const data = {
                    email: 'test@example.com',
                    password: 'ValidPass123!',
                    confirmPassword: 'ValidPass123!',
                    firstName: 'Test',
                    lastName: 'User',
                    role: 'ACTOR',
                    acceptTerms: true,
                };
                delete data[field];
                const response = await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/register')
                    .send(data);
                expect(response.status).toBe(400);
                expect(response.body.success).toBe(false);
            }
        });
        it('should validate field lengths', async () => {
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/register')
                .send({
                email: 'test@example.com',
                password: 'ValidPass123!',
                confirmPassword: 'ValidPass123!',
                firstName: 'A'.repeat(256),
                lastName: 'User',
                role: 'ACTOR',
                acceptTerms: true,
            });
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });
    describe('Content Type Handling', () => {
        it('should accept application/json', async () => {
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/login')
                .set('Content-Type', 'application/json')
                .send({
                email: testUsers.actor.email,
                password: testUsers.actor.password,
            });
            expect(response.status).toBe(200);
        });
        it('should reject unsupported content types', async () => {
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/login')
                .set('Content-Type', 'text/plain')
                .send('email=test@example.com&password=password');
            expect(response.status).toBe(400);
        });
    });
    describe('Rate Limiting', () => {
        it('should apply rate limiting to login endpoint', async () => {
            const requests = [];
            for (let i = 0; i < 20; i++) {
                requests.push((0, supertest_1.default)(server_1.app)
                    .post('/api/auth/login')
                    .send({
                    email: testUsers.actor.email,
                    password: 'wrong-password',
                }));
            }
            const responses = await Promise.all(requests);
            const rateLimitedResponses = responses.filter(r => r.status === 429);
            expect(rateLimitedResponses.length).toBeGreaterThan(0);
        });
    });
    describe('CORS Headers', () => {
        it('should include CORS headers', async () => {
            const response = await (0, supertest_1.default)(server_1.app).get('/api/auth/me');
            expect(response.headers['access-control-allow-origin']).toBeDefined();
        });
    });
    describe('Security Headers', () => {
        it('should include security headers', async () => {
            const response = await (0, supertest_1.default)(server_1.app).get('/api/auth/me');
            expect(response.headers['x-content-type-options']).toBe('nosniff');
            expect(response.headers['x-frame-options']).toBeDefined();
            expect(response.headers['x-xss-protection']).toBeDefined();
        });
    });
});
//# sourceMappingURL=endpoints.test.js.map