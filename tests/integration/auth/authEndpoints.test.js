"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const globals_1 = require("@jest/globals");
const client_1 = require("@prisma/client");
const server_1 = require("@/server");
const emailService_mock_1 = require("../../mocks/emailService.mock");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
(0, globals_1.describe)('Authentication Endpoints Integration Tests', () => {
    let server;
    (0, globals_1.beforeAll)(async () => {
        server = server_1.app.listen(5002);
        emailService_mock_1.EmailServiceMock.setup({ trackCalls: true });
        await prisma.$executeRaw `TRUNCATE TABLE "User", "Session", "VerificationToken", "PasswordResetToken" CASCADE`;
    });
    (0, globals_1.afterAll)(async () => {
        await prisma.$disconnect();
        server.close();
    });
    (0, globals_1.beforeEach)(async () => {
        emailService_mock_1.EmailServiceMock.clearSentEmails();
    });
    (0, globals_1.describe)('POST /api/auth/register', () => {
        (0, globals_1.it)('should register a new user successfully', async () => {
            const userData = {
                email: 'newuser@example.com',
                password: 'SecurePass123!',
                firstName: 'John',
                lastName: 'Doe',
                role: 'ACTOR',
                phoneNumber: '+919876543210'
            };
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);
            (0, globals_1.expect)(response.body).toHaveProperty('success', true);
            (0, globals_1.expect)(response.body).toHaveProperty('message');
            (0, globals_1.expect)(response.body.data).toHaveProperty('user');
            (0, globals_1.expect)(response.body.data.user.email).toBe(userData.email.toLowerCase());
            (0, globals_1.expect)(response.body.data.user).not.toHaveProperty('password');
            (0, globals_1.expect)(emailService_mock_1.EmailServiceMock.hasEmailBeenSent(userData.email.toLowerCase())).toBe(true);
            const dbUser = await prisma.user.findUnique({
                where: { email: userData.email.toLowerCase() }
            });
            (0, globals_1.expect)(dbUser).toBeDefined();
            (0, globals_1.expect)(dbUser?.verified).toBe(false);
        });
        (0, globals_1.it)('should reject duplicate email registration', async () => {
            const userData = {
                email: 'existing@example.com',
                password: 'SecurePass123!',
                firstName: 'Jane',
                lastName: 'Doe',
                role: 'ACTOR',
                phoneNumber: '+919876543211'
            };
            await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/register')
                .send(userData)
                .expect(409);
            (0, globals_1.expect)(response.body).toHaveProperty('success', false);
            (0, globals_1.expect)(response.body).toHaveProperty('error');
            (0, globals_1.expect)(response.body.error).toContain('already exists');
        });
        (0, globals_1.it)('should validate password requirements', async () => {
            const userData = {
                email: 'weakpass@example.com',
                password: 'weak',
                firstName: 'Test',
                lastName: 'User',
                role: 'ACTOR'
            };
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/register')
                .send(userData)
                .expect(400);
            (0, globals_1.expect)(response.body).toHaveProperty('success', false);
            (0, globals_1.expect)(response.body.error).toContain('password');
        });
        (0, globals_1.it)('should validate email format', async () => {
            const userData = {
                email: 'invalid-email',
                password: 'SecurePass123!',
                firstName: 'Test',
                lastName: 'User',
                role: 'ACTOR'
            };
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/register')
                .send(userData)
                .expect(400);
            (0, globals_1.expect)(response.body).toHaveProperty('success', false);
            (0, globals_1.expect)(response.body.error).toContain('email');
        });
        (0, globals_1.it)('should handle role-specific registration', async () => {
            const castingDirectorData = {
                email: 'director@productionhouse.com',
                password: 'SecurePass123!',
                firstName: 'Director',
                lastName: 'Name',
                role: 'CASTING_DIRECTOR',
                phoneNumber: '+919876543212',
                company: 'Production House Ltd'
            };
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/register')
                .send(castingDirectorData)
                .expect(201);
            (0, globals_1.expect)(response.body.data.user.role).toBe('CASTING_DIRECTOR');
            (0, globals_1.expect)(response.body.message).toContain('approval');
        });
    });
    (0, globals_1.describe)('POST /api/auth/login', () => {
        let testUser;
        (0, globals_1.beforeEach)(async () => {
            const hashedPassword = await bcryptjs_1.default.hash('TestPass123!', 10);
            testUser = await prisma.user.create({
                data: {
                    email: 'logintest@example.com',
                    password: hashedPassword,
                    firstName: 'Login',
                    lastName: 'Test',
                    role: 'ACTOR',
                    verified: true
                }
            });
        });
        (0, globals_1.it)('should login successfully with valid credentials', async () => {
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/login')
                .send({
                email: 'logintest@example.com',
                password: 'TestPass123!'
            })
                .expect(200);
            (0, globals_1.expect)(response.body).toHaveProperty('success', true);
            (0, globals_1.expect)(response.body.data).toHaveProperty('token');
            (0, globals_1.expect)(response.body.data).toHaveProperty('refreshToken');
            (0, globals_1.expect)(response.body.data).toHaveProperty('user');
            (0, globals_1.expect)(response.body.data.user.id).toBe(testUser.id);
            const decoded = jsonwebtoken_1.default.verify(response.body.data.token, process.env.JWT_SECRET);
            (0, globals_1.expect)(decoded.userId).toBe(testUser.id);
            (0, globals_1.expect)(decoded.role).toBe('ACTOR');
        });
        (0, globals_1.it)('should fail with invalid password', async () => {
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/login')
                .send({
                email: 'logintest@example.com',
                password: 'WrongPassword123!'
            })
                .expect(401);
            (0, globals_1.expect)(response.body).toHaveProperty('success', false);
            (0, globals_1.expect)(response.body.error).toContain('Invalid credentials');
        });
        (0, globals_1.it)('should fail with non-existent email', async () => {
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/login')
                .send({
                email: 'nonexistent@example.com',
                password: 'TestPass123!'
            })
                .expect(401);
            (0, globals_1.expect)(response.body).toHaveProperty('success', false);
            (0, globals_1.expect)(response.body.error).toContain('Invalid credentials');
        });
        (0, globals_1.it)('should fail for unverified user', async () => {
            const hashedPassword = await bcryptjs_1.default.hash('TestPass123!', 10);
            await prisma.user.create({
                data: {
                    email: 'unverified@example.com',
                    password: hashedPassword,
                    firstName: 'Unverified',
                    lastName: 'User',
                    role: 'ACTOR',
                    verified: false
                }
            });
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/login')
                .send({
                email: 'unverified@example.com',
                password: 'TestPass123!'
            })
                .expect(403);
            (0, globals_1.expect)(response.body).toHaveProperty('success', false);
            (0, globals_1.expect)(response.body.error).toContain('not verified');
        });
        (0, globals_1.it)('should handle 2FA authentication', async () => {
            const hashedPassword = await bcryptjs_1.default.hash('TestPass123!', 10);
            const twoFAUser = await prisma.user.create({
                data: {
                    email: 'twofa@example.com',
                    password: hashedPassword,
                    firstName: 'TwoFA',
                    lastName: 'User',
                    role: 'ACTOR',
                    verified: true,
                    twoFactorEnabled: true,
                    twoFactorSecret: 'JBSWY3DPEHPK3PXP'
                }
            });
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/login')
                .send({
                email: 'twofa@example.com',
                password: 'TestPass123!'
            })
                .expect(200);
            (0, globals_1.expect)(response.body.data).toHaveProperty('requiresTwoFactor', true);
            (0, globals_1.expect)(response.body.data).toHaveProperty('tempToken');
            (0, globals_1.expect)(response.body.data).not.toHaveProperty('token');
        });
        (0, globals_1.it)('should track login attempts and implement rate limiting', async () => {
            for (let i = 0; i < 5; i++) {
                await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/login')
                    .send({
                    email: 'logintest@example.com',
                    password: 'WrongPassword!'
                })
                    .expect(401);
            }
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/login')
                .send({
                email: 'logintest@example.com',
                password: 'TestPass123!'
            })
                .expect(429);
            (0, globals_1.expect)(response.body.error).toContain('Too many attempts');
        });
    });
    (0, globals_1.describe)('POST /api/auth/logout', () => {
        (0, globals_1.it)('should logout successfully', async () => {
            const hashedPassword = await bcryptjs_1.default.hash('TestPass123!', 10);
            const user = await prisma.user.create({
                data: {
                    email: 'logouttest@example.com',
                    password: hashedPassword,
                    firstName: 'Logout',
                    lastName: 'Test',
                    role: 'ACTOR',
                    verified: true
                }
            });
            const loginResponse = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/login')
                .send({
                email: 'logouttest@example.com',
                password: 'TestPass123!'
            })
                .expect(200);
            const token = loginResponse.body.data.token;
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);
            (0, globals_1.expect)(response.body).toHaveProperty('success', true);
            (0, globals_1.expect)(response.body.message).toContain('logged out');
            const session = await prisma.session.findFirst({
                where: { userId: user.id }
            });
            (0, globals_1.expect)(session).toBeNull();
        });
    });
    (0, globals_1.describe)('POST /api/auth/verify-email', () => {
        (0, globals_1.it)('should verify email with valid token', async () => {
            const user = await prisma.user.create({
                data: {
                    email: 'verifytest@example.com',
                    password: 'hashedpassword',
                    firstName: 'Verify',
                    lastName: 'Test',
                    role: 'ACTOR',
                    verified: false
                }
            });
            const verificationToken = await prisma.verificationToken.create({
                data: {
                    token: 'valid-verification-token',
                    userId: user.id,
                    type: 'EMAIL_VERIFICATION',
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
                }
            });
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/verify-email')
                .send({ token: verificationToken.token })
                .expect(200);
            (0, globals_1.expect)(response.body).toHaveProperty('success', true);
            (0, globals_1.expect)(response.body.message).toContain('verified');
            const verifiedUser = await prisma.user.findUnique({
                where: { id: user.id }
            });
            (0, globals_1.expect)(verifiedUser?.verified).toBe(true);
        });
        (0, globals_1.it)('should reject expired verification token', async () => {
            const user = await prisma.user.create({
                data: {
                    email: 'expiredverify@example.com',
                    password: 'hashedpassword',
                    firstName: 'Expired',
                    lastName: 'Verify',
                    role: 'ACTOR',
                    verified: false
                }
            });
            const expiredToken = await prisma.verificationToken.create({
                data: {
                    token: 'expired-verification-token',
                    userId: user.id,
                    type: 'EMAIL_VERIFICATION',
                    expiresAt: new Date(Date.now() - 1000)
                }
            });
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/auth/verify-email')
                .send({ token: expiredToken.token })
                .expect(400);
            (0, globals_1.expect)(response.body).toHaveProperty('success', false);
            (0, globals_1.expect)(response.body.error).toContain('expired');
        });
    });
    (0, globals_1.describe)('Password Reset Flow', () => {
        (0, globals_1.describe)('POST /api/auth/forgot-password', () => {
            (0, globals_1.it)('should send password reset email', async () => {
                const user = await prisma.user.create({
                    data: {
                        email: 'resettest@example.com',
                        password: 'hashedpassword',
                        firstName: 'Reset',
                        lastName: 'Test',
                        role: 'ACTOR',
                        verified: true
                    }
                });
                const response = await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/forgot-password')
                    .send({ email: 'resettest@example.com' })
                    .expect(200);
                (0, globals_1.expect)(response.body).toHaveProperty('success', true);
                (0, globals_1.expect)(response.body.message).toContain('reset email sent');
                (0, globals_1.expect)(emailService_mock_1.EmailServiceMock.hasEmailBeenSent('resettest@example.com')).toBe(true);
                const resetToken = await prisma.passwordResetToken.findFirst({
                    where: { userId: user.id }
                });
                (0, globals_1.expect)(resetToken).toBeDefined();
            });
            (0, globals_1.it)('should not reveal if email does not exist', async () => {
                const response = await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/forgot-password')
                    .send({ email: 'nonexistent@example.com' })
                    .expect(200);
                (0, globals_1.expect)(response.body).toHaveProperty('success', true);
                (0, globals_1.expect)(response.body.message).toContain('If an account exists');
                (0, globals_1.expect)(emailService_mock_1.EmailServiceMock.getEmailCount()).toBe(0);
            });
        });
        (0, globals_1.describe)('POST /api/auth/reset-password', () => {
            (0, globals_1.it)('should reset password with valid token', async () => {
                const user = await prisma.user.create({
                    data: {
                        email: 'resetpassword@example.com',
                        password: await bcryptjs_1.default.hash('OldPassword123!', 10),
                        firstName: 'Reset',
                        lastName: 'Password',
                        role: 'ACTOR',
                        verified: true
                    }
                });
                const resetToken = await prisma.passwordResetToken.create({
                    data: {
                        token: 'valid-reset-token',
                        userId: user.id,
                        expiresAt: new Date(Date.now() + 60 * 60 * 1000)
                    }
                });
                const response = await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/reset-password')
                    .send({
                    token: resetToken.token,
                    password: 'NewPassword123!'
                })
                    .expect(200);
                (0, globals_1.expect)(response.body).toHaveProperty('success', true);
                (0, globals_1.expect)(response.body.message).toContain('Password reset successful');
                const loginResponse = await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/login')
                    .send({
                    email: 'resetpassword@example.com',
                    password: 'NewPassword123!'
                })
                    .expect(200);
                (0, globals_1.expect)(loginResponse.body.data).toHaveProperty('token');
            });
            (0, globals_1.it)('should reject expired reset token', async () => {
                const user = await prisma.user.create({
                    data: {
                        email: 'expiredreset@example.com',
                        password: 'hashedpassword',
                        firstName: 'Expired',
                        lastName: 'Reset',
                        role: 'ACTOR',
                        verified: true
                    }
                });
                const expiredToken = await prisma.passwordResetToken.create({
                    data: {
                        token: 'expired-reset-token',
                        userId: user.id,
                        expiresAt: new Date(Date.now() - 1000)
                    }
                });
                const response = await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/reset-password')
                    .send({
                    token: expiredToken.token,
                    password: 'NewPassword123!'
                })
                    .expect(400);
                (0, globals_1.expect)(response.body).toHaveProperty('success', false);
                (0, globals_1.expect)(response.body.error).toContain('expired');
            });
        });
    });
    (0, globals_1.describe)('Social Authentication', () => {
        (0, globals_1.describe)('GET /api/auth/google', () => {
            (0, globals_1.it)('should redirect to Google OAuth', async () => {
                const response = await (0, supertest_1.default)(server_1.app)
                    .get('/api/auth/google')
                    .expect(302);
                (0, globals_1.expect)(response.headers.location).toContain('accounts.google.com');
            });
        });
        (0, globals_1.describe)('GET /api/auth/github', () => {
            (0, globals_1.it)('should redirect to GitHub OAuth', async () => {
                const response = await (0, supertest_1.default)(server_1.app)
                    .get('/api/auth/github')
                    .expect(302);
                (0, globals_1.expect)(response.headers.location).toContain('github.com/login/oauth');
            });
        });
    });
    (0, globals_1.describe)('Token Management', () => {
        (0, globals_1.describe)('POST /api/auth/refresh', () => {
            (0, globals_1.it)('should refresh access token with valid refresh token', async () => {
                const hashedPassword = await bcryptjs_1.default.hash('TestPass123!', 10);
                const user = await prisma.user.create({
                    data: {
                        email: 'refreshtest@example.com',
                        password: hashedPassword,
                        firstName: 'Refresh',
                        lastName: 'Test',
                        role: 'ACTOR',
                        verified: true
                    }
                });
                const loginResponse = await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/login')
                    .send({
                    email: 'refreshtest@example.com',
                    password: 'TestPass123!'
                })
                    .expect(200);
                const refreshToken = loginResponse.body.data.refreshToken;
                const response = await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/refresh')
                    .send({ refreshToken })
                    .expect(200);
                (0, globals_1.expect)(response.body).toHaveProperty('success', true);
                (0, globals_1.expect)(response.body.data).toHaveProperty('accessToken');
                (0, globals_1.expect)(response.body.data).toHaveProperty('refreshToken');
                (0, globals_1.expect)(response.body.data.accessToken).not.toBe(loginResponse.body.data.token);
            });
            (0, globals_1.it)('should reject invalid refresh token', async () => {
                const response = await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/refresh')
                    .send({ refreshToken: 'invalid-refresh-token' })
                    .expect(401);
                (0, globals_1.expect)(response.body).toHaveProperty('success', false);
                (0, globals_1.expect)(response.body.error).toContain('Invalid refresh token');
            });
        });
        (0, globals_1.describe)('GET /api/auth/me', () => {
            (0, globals_1.it)('should return current user info with valid token', async () => {
                const hashedPassword = await bcryptjs_1.default.hash('TestPass123!', 10);
                const user = await prisma.user.create({
                    data: {
                        email: 'metest@example.com',
                        password: hashedPassword,
                        firstName: 'Me',
                        lastName: 'Test',
                        role: 'ACTOR',
                        verified: true
                    }
                });
                const loginResponse = await (0, supertest_1.default)(server_1.app)
                    .post('/api/auth/login')
                    .send({
                    email: 'metest@example.com',
                    password: 'TestPass123!'
                })
                    .expect(200);
                const token = loginResponse.body.data.token;
                const response = await (0, supertest_1.default)(server_1.app)
                    .get('/api/auth/me')
                    .set('Authorization', `Bearer ${token}`)
                    .expect(200);
                (0, globals_1.expect)(response.body).toHaveProperty('success', true);
                (0, globals_1.expect)(response.body.data.user.id).toBe(user.id);
                (0, globals_1.expect)(response.body.data.user.email).toBe('metest@example.com');
                (0, globals_1.expect)(response.body.data.user).not.toHaveProperty('password');
            });
            (0, globals_1.it)('should reject request without token', async () => {
                const response = await (0, supertest_1.default)(server_1.app)
                    .get('/api/auth/me')
                    .expect(401);
                (0, globals_1.expect)(response.body).toHaveProperty('success', false);
                (0, globals_1.expect)(response.body.error).toContain('No token provided');
            });
            (0, globals_1.it)('should reject request with invalid token', async () => {
                const response = await (0, supertest_1.default)(server_1.app)
                    .get('/api/auth/me')
                    .set('Authorization', 'Bearer invalid-token')
                    .expect(401);
                (0, globals_1.expect)(response.body).toHaveProperty('success', false);
                (0, globals_1.expect)(response.body.error).toContain('Invalid token');
            });
        });
    });
});
//# sourceMappingURL=authEndpoints.test.js.map