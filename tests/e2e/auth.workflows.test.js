"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const database_1 = require("../../src/config/database");
const password_1 = require("../../src/utils/password");
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_BASE_URL = `${BASE_URL}/api`;
const testUsers = {
    actor: {
        email: 'actor.e2e@test.com',
        password: 'ActorPass123!',
        firstName: 'John',
        lastName: 'Actor',
        role: 'ACTOR',
    },
    castingDirector: {
        email: 'cd.e2e@test.com',
        password: 'CdPass123!',
        firstName: 'Jane',
        lastName: 'Director',
        role: 'CASTING_DIRECTOR',
    },
    producer: {
        email: 'producer.e2e@test.com',
        password: 'ProducerPass123!',
        firstName: 'Bob',
        lastName: 'Producer',
        role: 'PRODUCER',
    },
};
test_1.test.describe('Authentication E2E Workflows', () => {
    let context;
    let page;
    test_1.test.beforeAll(async ({ browser }) => {
        context = await browser.newContext();
        page = await context.newPage();
    });
    test_1.test.beforeEach(async () => {
        await database_1.prisma.session.deleteMany();
        await database_1.prisma.actor.deleteMany();
        await database_1.prisma.castingDirector.deleteMany();
        await database_1.prisma.producer.deleteMany();
        await database_1.prisma.user.deleteMany();
    });
    test_1.test.afterAll(async () => {
        await context.close();
        await database_1.prisma.$disconnect();
    });
    test_1.test.describe('User Registration Workflows', () => {
        (0, test_1.test)('should complete actor registration flow', async () => {
            const { actor } = testUsers;
            await page.goto(`${BASE_URL}/register`);
            await (0, test_1.expect)(page).toHaveTitle(/Register/);
            await page.fill('[data-testid="email-input"]', actor.email);
            await page.fill('[data-testid="password-input"]', actor.password);
            await page.fill('[data-testid="confirm-password-input"]', actor.password);
            await page.fill('[data-testid="first-name-input"]', actor.firstName);
            await page.fill('[data-testid="last-name-input"]', actor.lastName);
            await page.selectOption('[data-testid="role-select"]', actor.role);
            await page.check('[data-testid="accept-terms-checkbox"]');
            await page.click('[data-testid="register-button"]');
            await (0, test_1.expect)(page).toHaveURL(/\/(dashboard|onboarding)/);
            await (0, test_1.expect)(page.locator('[data-testid="welcome-message"]')).toBeVisible();
            const dbUser = await database_1.prisma.user.findUnique({
                where: { email: actor.email },
                include: { actor: true },
            });
            (0, test_1.expect)(dbUser).toBeTruthy();
            (0, test_1.expect)(dbUser?.role).toBe('ACTOR');
            (0, test_1.expect)(dbUser?.actor?.firstName).toBe(actor.firstName);
        });
        (0, test_1.test)('should complete casting director registration flow', async () => {
            const { castingDirector } = testUsers;
            await page.goto(`${BASE_URL}/register`);
            await page.fill('[data-testid="email-input"]', castingDirector.email);
            await page.fill('[data-testid="password-input"]', castingDirector.password);
            await page.fill('[data-testid="confirm-password-input"]', castingDirector.password);
            await page.fill('[data-testid="first-name-input"]', castingDirector.firstName);
            await page.fill('[data-testid="last-name-input"]', castingDirector.lastName);
            await page.selectOption('[data-testid="role-select"]', castingDirector.role);
            await page.check('[data-testid="accept-terms-checkbox"]');
            await page.click('[data-testid="register-button"]');
            await (0, test_1.expect)(page).toHaveURL(/\/(dashboard|onboarding)/);
            const dbUser = await database_1.prisma.user.findUnique({
                where: { email: castingDirector.email },
                include: { castingDirector: true },
            });
            (0, test_1.expect)(dbUser?.role).toBe('CASTING_DIRECTOR');
            (0, test_1.expect)(dbUser?.castingDirector?.firstName).toBe(castingDirector.firstName);
        });
        (0, test_1.test)('should complete producer registration flow', async () => {
            const { producer } = testUsers;
            await page.goto(`${BASE_URL}/register`);
            await page.fill('[data-testid="email-input"]', producer.email);
            await page.fill('[data-testid="password-input"]', producer.password);
            await page.fill('[data-testid="confirm-password-input"]', producer.password);
            await page.fill('[data-testid="first-name-input"]', producer.firstName);
            await page.fill('[data-testid="last-name-input"]', producer.lastName);
            await page.selectOption('[data-testid="role-select"]', producer.role);
            await page.check('[data-testid="accept-terms-checkbox"]');
            await page.click('[data-testid="register-button"]');
            await (0, test_1.expect)(page).toHaveURL(/\/(dashboard|onboarding)/);
            const dbUser = await database_1.prisma.user.findUnique({
                where: { email: producer.email },
                include: { producer: true },
            });
            (0, test_1.expect)(dbUser?.role).toBe('PRODUCER');
            (0, test_1.expect)(dbUser?.producer?.firstName).toBe(producer.firstName);
        });
        (0, test_1.test)('should handle registration validation errors', async () => {
            await page.goto(`${BASE_URL}/register`);
            await page.click('[data-testid="register-button"]');
            await (0, test_1.expect)(page.locator('[data-testid="email-error"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="password-error"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="first-name-error"]')).toBeVisible();
            await page.fill('[data-testid="email-input"]', 'invalid-email');
            await page.fill('[data-testid="password-input"]', 'weak');
            await page.fill('[data-testid="confirm-password-input"]', 'different');
            await page.click('[data-testid="register-button"]');
            await (0, test_1.expect)(page.locator('[data-testid="email-error"]')).toContainText('valid email');
            await (0, test_1.expect)(page.locator('[data-testid="password-error"]')).toContainText('at least 8 characters');
            await (0, test_1.expect)(page.locator('[data-testid="confirm-password-error"]')).toContainText('match');
        });
        (0, test_1.test)('should prevent duplicate email registration', async () => {
            const { actor } = testUsers;
            await database_1.prisma.user.create({
                data: {
                    email: actor.email,
                    password: await (0, password_1.hashPassword)(actor.password),
                    role: 'ACTOR',
                    actor: {
                        create: {
                            firstName: actor.firstName,
                            lastName: actor.lastName,
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
            await page.goto(`${BASE_URL}/register`);
            await page.fill('[data-testid="email-input"]', actor.email);
            await page.fill('[data-testid="password-input"]', actor.password);
            await page.fill('[data-testid="confirm-password-input"]', actor.password);
            await page.fill('[data-testid="first-name-input"]', actor.firstName);
            await page.fill('[data-testid="last-name-input"]', actor.lastName);
            await page.selectOption('[data-testid="role-select"]', actor.role);
            await page.check('[data-testid="accept-terms-checkbox"]');
            await page.click('[data-testid="register-button"]');
            await (0, test_1.expect)(page.locator('[data-testid="error-message"]')).toContainText('already registered');
            await (0, test_1.expect)(page).toHaveURL(/\/register/);
        });
    });
    test_1.test.describe('User Login Workflows', () => {
        test_1.test.beforeEach(async () => {
            await database_1.prisma.user.create({
                data: {
                    email: testUsers.actor.email,
                    password: await (0, password_1.hashPassword)(testUsers.actor.password),
                    role: 'ACTOR',
                    isActive: true,
                    actor: {
                        create: {
                            firstName: testUsers.actor.firstName,
                            lastName: testUsers.actor.lastName,
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
        });
        (0, test_1.test)('should complete successful login flow', async () => {
            const { actor } = testUsers;
            await page.goto(`${BASE_URL}/login`);
            await (0, test_1.expect)(page).toHaveTitle(/Login/);
            await page.fill('[data-testid="email-input"]', actor.email);
            await page.fill('[data-testid="password-input"]', actor.password);
            await page.check('[data-testid="remember-me-checkbox"]');
            await page.click('[data-testid="login-button"]');
            await (0, test_1.expect)(page).toHaveURL(/\/dashboard/);
            await (0, test_1.expect)(page.locator('[data-testid="user-name"]')).toContainText(actor.firstName);
            const sessions = await database_1.prisma.session.findMany({
                where: {
                    user: {
                        email: actor.email,
                    },
                },
            });
            (0, test_1.expect)(sessions.length).toBe(1);
        });
        (0, test_1.test)('should handle login with invalid credentials', async () => {
            const { actor } = testUsers;
            await page.goto(`${BASE_URL}/login`);
            await page.fill('[data-testid="email-input"]', actor.email);
            await page.fill('[data-testid="password-input"]', 'WrongPassword123!');
            await page.click('[data-testid="login-button"]');
            await (0, test_1.expect)(page.locator('[data-testid="error-message"]')).toContainText('Invalid email or password');
            await (0, test_1.expect)(page).toHaveURL(/\/login/);
        });
        (0, test_1.test)('should handle login with non-existent user', async () => {
            await page.goto(`${BASE_URL}/login`);
            await page.fill('[data-testid="email-input"]', 'nonexistent@test.com');
            await page.fill('[data-testid="password-input"]', 'AnyPassword123!');
            await page.click('[data-testid="login-button"]');
            await (0, test_1.expect)(page.locator('[data-testid="error-message"]')).toContainText('Invalid email or password');
            await (0, test_1.expect)(page).toHaveURL(/\/login/);
        });
        (0, test_1.test)('should handle login form validation', async () => {
            await page.goto(`${BASE_URL}/login`);
            await page.click('[data-testid="login-button"]');
            await (0, test_1.expect)(page.locator('[data-testid="email-error"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="password-error"]')).toBeVisible();
            await page.fill('[data-testid="email-input"]', 'invalid-email');
            await page.click('[data-testid="login-button"]');
            await (0, test_1.expect)(page.locator('[data-testid="email-error"]')).toContainText('valid email');
        });
        (0, test_1.test)('should redirect authenticated users away from login page', async () => {
            await loginUser(page, testUsers.actor);
            await page.goto(`${BASE_URL}/login`);
            await (0, test_1.expect)(page).toHaveURL(/\/dashboard/);
        });
    });
    test_1.test.describe('Password Reset Workflows', () => {
        test_1.test.beforeEach(async () => {
            await database_1.prisma.user.create({
                data: {
                    email: testUsers.actor.email,
                    password: await (0, password_1.hashPassword)(testUsers.actor.password),
                    role: 'ACTOR',
                    isActive: true,
                    actor: {
                        create: {
                            firstName: testUsers.actor.firstName,
                            lastName: testUsers.actor.lastName,
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
        });
        (0, test_1.test)('should initiate password reset flow', async () => {
            const { actor } = testUsers;
            await page.goto(`${BASE_URL}/forgot-password`);
            await page.fill('[data-testid="email-input"]', actor.email);
            await page.click('[data-testid="send-reset-button"]');
            await (0, test_1.expect)(page.locator('[data-testid="success-message"]')).toContainText('reset instructions');
            const user = await database_1.prisma.user.findUnique({
                where: { email: actor.email },
            });
            (0, test_1.expect)(user?.resetToken).toBeTruthy();
            (0, test_1.expect)(user?.resetTokenExpiry).toBeTruthy();
        });
        (0, test_1.test)('should handle password reset with non-existent email', async () => {
            await page.goto(`${BASE_URL}/forgot-password`);
            await page.fill('[data-testid="email-input"]', 'nonexistent@test.com');
            await page.click('[data-testid="send-reset-button"]');
            await (0, test_1.expect)(page.locator('[data-testid="success-message"]')).toContainText('reset instructions');
        });
        (0, test_1.test)('should complete password reset with valid token', async () => {
            const { actor } = testUsers;
            const response = await page.request.post(`${API_BASE_URL}/auth/forgot-password`, {
                data: { email: actor.email },
            });
            (0, test_1.expect)(response.ok()).toBeTruthy();
            const user = await database_1.prisma.user.findUnique({
                where: { email: actor.email },
            });
            const resetToken = user?.resetToken;
            await page.goto(`${BASE_URL}/reset-password?token=${resetToken}`);
            const newPassword = 'NewSecurePass123!';
            await page.fill('[data-testid="password-input"]', newPassword);
            await page.fill('[data-testid="confirm-password-input"]', newPassword);
            await page.click('[data-testid="reset-password-button"]');
            await (0, test_1.expect)(page).toHaveURL(/\/login/);
            await (0, test_1.expect)(page.locator('[data-testid="success-message"]')).toContainText('password reset');
            await page.fill('[data-testid="email-input"]', actor.email);
            await page.fill('[data-testid="password-input"]', newPassword);
            await page.click('[data-testid="login-button"]');
            await (0, test_1.expect)(page).toHaveURL(/\/dashboard/);
        });
    });
    test_1.test.describe('User Profile Management Workflows', () => {
        test_1.test.beforeEach(async () => {
            await database_1.prisma.user.create({
                data: {
                    email: testUsers.actor.email,
                    password: await (0, password_1.hashPassword)(testUsers.actor.password),
                    role: 'ACTOR',
                    isActive: true,
                    actor: {
                        create: {
                            firstName: testUsers.actor.firstName,
                            lastName: testUsers.actor.lastName,
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
        });
        (0, test_1.test)('should access and update profile information', async () => {
            const { actor } = testUsers;
            await loginUser(page, actor);
            await page.click('[data-testid="profile-menu"]');
            await page.click('[data-testid="edit-profile-link"]');
            await (0, test_1.expect)(page).toHaveURL(/\/profile/);
            await page.fill('[data-testid="bio-textarea"]', 'Updated bio for E2E test');
            await page.selectOption('[data-testid="city-select"]', 'Delhi');
            await page.click('[data-testid="add-language-button"]');
            await page.selectOption('[data-testid="language-select-1"]', 'Hindi');
            await page.click('[data-testid="save-profile-button"]');
            await (0, test_1.expect)(page.locator('[data-testid="success-message"]')).toContainText('Profile updated');
            const updatedUser = await database_1.prisma.user.findUnique({
                where: { email: actor.email },
                include: { actor: true },
            });
            (0, test_1.expect)(updatedUser?.actor?.bio).toBe('Updated bio for E2E test');
            (0, test_1.expect)(updatedUser?.actor?.city).toBe('Delhi');
            (0, test_1.expect)(updatedUser?.actor?.languages).toContain('Hindi');
        });
        (0, test_1.test)('should handle profile image upload', async () => {
            const { actor } = testUsers;
            await loginUser(page, actor);
            await page.goto(`${BASE_URL}/profile`);
            const fileInput = page.locator('[data-testid="profile-image-input"]');
            await fileInput.setInputFiles({
                name: 'profile.jpg',
                mimeType: 'image/jpeg',
                buffer: Buffer.from('fake-image-content'),
            });
            await page.click('[data-testid="upload-image-button"]');
            await (0, test_1.expect)(page.locator('[data-testid="success-message"]')).toContainText('Image uploaded');
            await (0, test_1.expect)(page.locator('[data-testid="profile-image"]')).toHaveAttribute('src', /\/uploads\//);
        });
    });
    test_1.test.describe('Session Management Workflows', () => {
        test_1.test.beforeEach(async () => {
            await database_1.prisma.user.create({
                data: {
                    email: testUsers.actor.email,
                    password: await (0, password_1.hashPassword)(testUsers.actor.password),
                    role: 'ACTOR',
                    isActive: true,
                    actor: {
                        create: {
                            firstName: testUsers.actor.firstName,
                            lastName: testUsers.actor.lastName,
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
        });
        (0, test_1.test)('should logout user successfully', async () => {
            const { actor } = testUsers;
            await loginUser(page, actor);
            await page.click('[data-testid="profile-menu"]');
            await page.click('[data-testid="logout-button"]');
            await (0, test_1.expect)(page).toHaveURL(/\/login/);
            await (0, test_1.expect)(page.locator('[data-testid="success-message"]')).toContainText('logged out');
            const sessions = await database_1.prisma.session.findMany({
                where: {
                    user: {
                        email: actor.email,
                    },
                },
            });
            (0, test_1.expect)(sessions.length).toBe(0);
            await page.goto(`${BASE_URL}/dashboard`);
            await (0, test_1.expect)(page).toHaveURL(/\/login/);
        });
        (0, test_1.test)('should handle session expiration gracefully', async () => {
            const { actor } = testUsers;
            await loginUser(page, actor);
            await database_1.prisma.session.updateMany({
                where: {
                    user: {
                        email: actor.email,
                    },
                },
                data: {
                    expiresAt: new Date(Date.now() - 60 * 60 * 1000),
                },
            });
            await page.goto(`${BASE_URL}/dashboard`);
            await (0, test_1.expect)(page).toHaveURL(/\/login/);
            await (0, test_1.expect)(page.locator('[data-testid="error-message"]')).toContainText('session expired');
        });
        (0, test_1.test)('should maintain session across browser refresh', async () => {
            const { actor } = testUsers;
            await loginUser(page, actor);
            await page.reload();
            await (0, test_1.expect)(page).toHaveURL(/\/dashboard/);
            await (0, test_1.expect)(page.locator('[data-testid="user-name"]')).toContainText(actor.firstName);
        });
    });
    async function loginUser(page, user) {
        await page.goto(`${BASE_URL}/login`);
        await page.fill('[data-testid="email-input"]', user.email);
        await page.fill('[data-testid="password-input"]', user.password);
        await page.click('[data-testid="login-button"]');
        await (0, test_1.expect)(page).toHaveURL(/\/dashboard/);
    }
});
//# sourceMappingURL=auth.workflows.test.js.map