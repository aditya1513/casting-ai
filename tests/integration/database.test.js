"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../../src/config/database");
const password_1 = require("../../src/utils/password");
const client_1 = require("@prisma/client");
describe('Database Integration Tests', () => {
    beforeEach(async () => {
        await database_1.prisma.session.deleteMany();
        await database_1.prisma.actor.deleteMany();
        await database_1.prisma.castingDirector.deleteMany();
        await database_1.prisma.producer.deleteMany();
        await database_1.prisma.user.deleteMany();
    });
    afterAll(async () => {
        await database_1.prisma.$disconnect();
    });
    describe('User CRUD Operations', () => {
        it('should create a new user successfully', async () => {
            const userData = {
                email: 'test@example.com',
                password: await (0, password_1.hashPassword)('TestPassword123!'),
                role: client_1.UserRole.ACTOR,
            };
            const user = await database_1.prisma.user.create({
                data: userData,
            });
            expect(user).toBeDefined();
            expect(user.id).toBeDefined();
            expect(user.email).toBe(userData.email);
            expect(user.role).toBe(userData.role);
            expect(user.isActive).toBe(true);
            expect(user.isEmailVerified).toBe(false);
            expect(user.isPhoneVerified).toBe(false);
            expect(user.createdAt).toBeDefined();
            expect(user.updatedAt).toBeDefined();
        });
        it('should read user by ID', async () => {
            const user = await database_1.prisma.user.create({
                data: {
                    email: 'read@example.com',
                    password: await (0, password_1.hashPassword)('TestPassword123!'),
                    role: client_1.UserRole.CASTING_DIRECTOR,
                },
            });
            const foundUser = await database_1.prisma.user.findUnique({
                where: { id: user.id },
            });
            expect(foundUser).toBeDefined();
            expect(foundUser?.email).toBe('read@example.com');
        });
        it('should read user by email', async () => {
            await database_1.prisma.user.create({
                data: {
                    email: 'findby@example.com',
                    password: await (0, password_1.hashPassword)('TestPassword123!'),
                    role: client_1.UserRole.PRODUCER,
                },
            });
            const foundUser = await database_1.prisma.user.findUnique({
                where: { email: 'findby@example.com' },
            });
            expect(foundUser).toBeDefined();
            expect(foundUser?.role).toBe(client_1.UserRole.PRODUCER);
        });
        it('should update user information', async () => {
            const user = await database_1.prisma.user.create({
                data: {
                    email: 'update@example.com',
                    password: await (0, password_1.hashPassword)('TestPassword123!'),
                    role: client_1.UserRole.ACTOR,
                },
            });
            const updatedUser = await database_1.prisma.user.update({
                where: { id: user.id },
                data: {
                    isEmailVerified: true,
                    phone: '+1234567890',
                },
            });
            expect(updatedUser.isEmailVerified).toBe(true);
            expect(updatedUser.phone).toBe('+1234567890');
        });
        it('should delete user', async () => {
            const user = await database_1.prisma.user.create({
                data: {
                    email: 'delete@example.com',
                    password: await (0, password_1.hashPassword)('TestPassword123!'),
                    role: client_1.UserRole.ACTOR,
                },
            });
            await database_1.prisma.user.delete({
                where: { id: user.id },
            });
            const deletedUser = await database_1.prisma.user.findUnique({
                where: { id: user.id },
            });
            expect(deletedUser).toBeNull();
        });
        it('should enforce unique email constraint', async () => {
            const email = 'duplicate@example.com';
            await database_1.prisma.user.create({
                data: {
                    email,
                    password: await (0, password_1.hashPassword)('TestPassword123!'),
                    role: client_1.UserRole.ACTOR,
                },
            });
            await expect(database_1.prisma.user.create({
                data: {
                    email,
                    password: await (0, password_1.hashPassword)('TestPassword123!'),
                    role: client_1.UserRole.CASTING_DIRECTOR,
                },
            })).rejects.toThrow();
        });
        it('should enforce unique phone constraint when provided', async () => {
            const phone = '+1234567890';
            await database_1.prisma.user.create({
                data: {
                    email: 'user1@example.com',
                    phone,
                    password: await (0, password_1.hashPassword)('TestPassword123!'),
                    role: client_1.UserRole.ACTOR,
                },
            });
            await expect(database_1.prisma.user.create({
                data: {
                    email: 'user2@example.com',
                    phone,
                    password: await (0, password_1.hashPassword)('TestPassword123!'),
                    role: client_1.UserRole.ACTOR,
                },
            })).rejects.toThrow();
        });
    });
    describe('Actor Profile Operations', () => {
        let testUser;
        beforeEach(async () => {
            testUser = await database_1.prisma.user.create({
                data: {
                    email: 'actor@example.com',
                    password: await (0, password_1.hashPassword)('TestPassword123!'),
                    role: client_1.UserRole.ACTOR,
                },
            });
        });
        it('should create actor profile', async () => {
            const actorData = {
                userId: testUser.id,
                firstName: 'John',
                lastName: 'Doe',
                displayName: 'John Doe',
                dateOfBirth: new Date('1990-01-01'),
                gender: 'MALE',
                city: 'Mumbai',
                state: 'Maharashtra',
                country: 'India',
                languages: ['English', 'Hindi', 'Marathi'],
                skills: ['Acting', 'Dancing', 'Singing'],
                bio: 'Experienced actor with diverse skills.',
            };
            const actor = await database_1.prisma.actor.create({
                data: actorData,
            });
            expect(actor).toBeDefined();
            expect(actor.firstName).toBe(actorData.firstName);
            expect(actor.lastName).toBe(actorData.lastName);
            expect(actor.languages).toEqual(actorData.languages);
            expect(actor.skills).toEqual(actorData.skills);
            expect(actor.isVerified).toBe(false);
        });
        it('should update actor profile', async () => {
            const actor = await database_1.prisma.actor.create({
                data: {
                    userId: testUser.id,
                    firstName: 'John',
                    lastName: 'Doe',
                    dateOfBirth: new Date('1990-01-01'),
                    gender: 'MALE',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    languages: ['English'],
                    skills: ['Acting'],
                },
            });
            const updatedActor = await database_1.prisma.actor.update({
                where: { id: actor.id },
                data: {
                    bio: 'Updated bio',
                    languages: ['English', 'Hindi', 'Marathi'],
                    skills: ['Acting', 'Dancing'],
                    isVerified: true,
                },
            });
            expect(updatedActor.bio).toBe('Updated bio');
            expect(updatedActor.languages).toEqual(['English', 'Hindi', 'Marathi']);
            expect(updatedActor.skills).toEqual(['Acting', 'Dancing']);
            expect(updatedActor.isVerified).toBe(true);
        });
        it('should find actor with user relation', async () => {
            await database_1.prisma.actor.create({
                data: {
                    userId: testUser.id,
                    firstName: 'Jane',
                    lastName: 'Smith',
                    dateOfBirth: new Date('1992-05-15'),
                    gender: 'FEMALE',
                    city: 'Delhi',
                    state: 'Delhi',
                    languages: ['English', 'Hindi'],
                    skills: ['Acting'],
                },
            });
            const actorWithUser = await database_1.prisma.actor.findUnique({
                where: { userId: testUser.id },
                include: { user: true },
            });
            expect(actorWithUser).toBeDefined();
            expect(actorWithUser?.user.email).toBe('actor@example.com');
            expect(actorWithUser?.firstName).toBe('Jane');
        });
        it('should enforce one-to-one relationship with user', async () => {
            await database_1.prisma.actor.create({
                data: {
                    userId: testUser.id,
                    firstName: 'First',
                    lastName: 'Actor',
                    dateOfBirth: new Date('1990-01-01'),
                    gender: 'MALE',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    languages: ['English'],
                    skills: ['Acting'],
                },
            });
            await expect(database_1.prisma.actor.create({
                data: {
                    userId: testUser.id,
                    firstName: 'Second',
                    lastName: 'Actor',
                    dateOfBirth: new Date('1990-01-01'),
                    gender: 'FEMALE',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    languages: ['Hindi'],
                    skills: ['Dancing'],
                },
            })).rejects.toThrow();
        });
    });
    describe('Casting Director Operations', () => {
        let testUser;
        beforeEach(async () => {
            testUser = await database_1.prisma.user.create({
                data: {
                    email: 'cd@example.com',
                    password: await (0, password_1.hashPassword)('TestPassword123!'),
                    role: client_1.UserRole.CASTING_DIRECTOR,
                },
            });
        });
        it('should create casting director profile', async () => {
            const cdData = {
                userId: testUser.id,
                firstName: 'Jane',
                lastName: 'Director',
                companyName: 'Best Casting Co.',
                specializations: ['Film', 'TV Series', 'Web Series'],
                bio: 'Experienced casting director.',
            };
            const castingDirector = await database_1.prisma.castingDirector.create({
                data: cdData,
            });
            expect(castingDirector).toBeDefined();
            expect(castingDirector.companyName).toBe(cdData.companyName);
            expect(castingDirector.specializations).toEqual(cdData.specializations);
        });
        it('should update casting director specializations', async () => {
            const cd = await database_1.prisma.castingDirector.create({
                data: {
                    userId: testUser.id,
                    firstName: 'Jane',
                    lastName: 'Director',
                    specializations: ['Film'],
                },
            });
            const updatedCD = await database_1.prisma.castingDirector.update({
                where: { id: cd.id },
                data: {
                    specializations: ['Film', 'TV Series', 'Web Series', 'Commercials'],
                },
            });
            expect(updatedCD.specializations).toHaveLength(4);
            expect(updatedCD.specializations).toContain('Commercials');
        });
    });
    describe('Producer Operations', () => {
        let testUser;
        beforeEach(async () => {
            testUser = await database_1.prisma.user.create({
                data: {
                    email: 'producer@example.com',
                    password: await (0, password_1.hashPassword)('TestPassword123!'),
                    role: client_1.UserRole.PRODUCER,
                },
            });
        });
        it('should create producer profile', async () => {
            const producerData = {
                userId: testUser.id,
                firstName: 'Bob',
                lastName: 'Producer',
                productionHouse: 'Big Production House',
                bio: 'Award-winning producer.',
            };
            const producer = await database_1.prisma.producer.create({
                data: producerData,
            });
            expect(producer).toBeDefined();
            expect(producer.productionHouse).toBe(producerData.productionHouse);
            expect(producer.bio).toBe(producerData.bio);
        });
    });
    describe('Session Operations', () => {
        let testUser;
        beforeEach(async () => {
            testUser = await database_1.prisma.user.create({
                data: {
                    email: 'session@example.com',
                    password: await (0, password_1.hashPassword)('TestPassword123!'),
                    role: client_1.UserRole.ACTOR,
                },
            });
        });
        it('should create and manage sessions', async () => {
            const sessionData = {
                id: 'session-123',
                userId: testUser.id,
                token: 'refresh-token-here',
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                ipAddress: '192.168.1.1',
                userAgent: 'Mozilla/5.0 Test Browser',
            };
            const session = await database_1.prisma.session.create({
                data: sessionData,
            });
            expect(session.id).toBe(sessionData.id);
            expect(session.userId).toBe(testUser.id);
            expect(session.ipAddress).toBe(sessionData.ipAddress);
        });
        it('should delete expired sessions', async () => {
            const expiredSession = await database_1.prisma.session.create({
                data: {
                    id: 'expired-session',
                    userId: testUser.id,
                    token: 'expired-token',
                    expiresAt: new Date(Date.now() - 60 * 60 * 1000),
                },
            });
            const validSession = await database_1.prisma.session.create({
                data: {
                    id: 'valid-session',
                    userId: testUser.id,
                    token: 'valid-token',
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            });
            await database_1.prisma.session.deleteMany({
                where: {
                    expiresAt: { lt: new Date() },
                },
            });
            const remainingSessions = await database_1.prisma.session.findMany({
                where: { userId: testUser.id },
            });
            expect(remainingSessions).toHaveLength(1);
            expect(remainingSessions[0].id).toBe('valid-session');
        });
        it('should handle multiple sessions per user', async () => {
            const sessions = [
                {
                    id: 'session-1',
                    userId: testUser.id,
                    token: 'token-1',
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
                {
                    id: 'session-2',
                    userId: testUser.id,
                    token: 'token-2',
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            ];
            await database_1.prisma.session.createMany({
                data: sessions,
            });
            const userSessions = await database_1.prisma.session.findMany({
                where: { userId: testUser.id },
            });
            expect(userSessions).toHaveLength(2);
        });
    });
    describe('Database Transactions', () => {
        it('should handle successful transaction', async () => {
            const result = await database_1.prisma.$transaction(async (tx) => {
                const user = await tx.user.create({
                    data: {
                        email: 'transaction@example.com',
                        password: await (0, password_1.hashPassword)('TestPassword123!'),
                        role: client_1.UserRole.ACTOR,
                    },
                });
                const actor = await tx.actor.create({
                    data: {
                        userId: user.id,
                        firstName: 'Transaction',
                        lastName: 'Test',
                        dateOfBirth: new Date('1990-01-01'),
                        gender: 'MALE',
                        city: 'Mumbai',
                        state: 'Maharashtra',
                        languages: ['English'],
                        skills: ['Acting'],
                    },
                });
                return { user, actor };
            });
            expect(result.user).toBeDefined();
            expect(result.actor).toBeDefined();
            expect(result.actor.userId).toBe(result.user.id);
            const savedUser = await database_1.prisma.user.findUnique({
                where: { id: result.user.id },
                include: { actor: true },
            });
            expect(savedUser).toBeDefined();
            expect(savedUser?.actor).toBeDefined();
        });
        it('should rollback on transaction failure', async () => {
            const userCountBefore = await database_1.prisma.user.count();
            try {
                await database_1.prisma.$transaction(async (tx) => {
                    await tx.user.create({
                        data: {
                            email: 'rollback@example.com',
                            password: await (0, password_1.hashPassword)('TestPassword123!'),
                            role: client_1.UserRole.ACTOR,
                        },
                    });
                    throw new Error('Intentional error for rollback test');
                });
            }
            catch (error) {
                expect(error.message).toBe('Intentional error for rollback test');
            }
            const userCountAfter = await database_1.prisma.user.count();
            expect(userCountAfter).toBe(userCountBefore);
            const rollbackUser = await database_1.prisma.user.findUnique({
                where: { email: 'rollback@example.com' },
            });
            expect(rollbackUser).toBeNull();
        });
        it('should handle complex multi-table transaction', async () => {
            const result = await database_1.prisma.$transaction(async (tx) => {
                const user = await tx.user.create({
                    data: {
                        email: 'complex@example.com',
                        password: await (0, password_1.hashPassword)('TestPassword123!'),
                        role: client_1.UserRole.ACTOR,
                    },
                });
                const actor = await tx.actor.create({
                    data: {
                        userId: user.id,
                        firstName: 'Complex',
                        lastName: 'Transaction',
                        dateOfBirth: new Date('1990-01-01'),
                        gender: 'FEMALE',
                        city: 'Mumbai',
                        state: 'Maharashtra',
                        languages: ['English', 'Hindi'],
                        skills: ['Acting', 'Dancing'],
                    },
                });
                const session = await tx.session.create({
                    data: {
                        id: 'complex-session',
                        userId: user.id,
                        token: 'complex-token',
                        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    },
                });
                const updatedUser = await tx.user.update({
                    where: { id: user.id },
                    data: { isEmailVerified: true },
                });
                return { user: updatedUser, actor, session };
            });
            expect(result.user.isEmailVerified).toBe(true);
            expect(result.actor.userId).toBe(result.user.id);
            expect(result.session.userId).toBe(result.user.id);
        });
    });
    describe('Database Performance', () => {
        it('should handle bulk operations efficiently', async () => {
            const userCount = 100;
            const users = [];
            for (let i = 0; i < userCount; i++) {
                users.push({
                    email: `bulk${i}@example.com`,
                    password: await (0, password_1.hashPassword)('TestPassword123!'),
                    role: client_1.UserRole.ACTOR,
                });
            }
            const startTime = Date.now();
            await database_1.prisma.user.createMany({
                data: users,
            });
            const endTime = Date.now();
            const duration = endTime - startTime;
            expect(duration).toBeLessThan(5000);
            const createdCount = await database_1.prisma.user.count();
            expect(createdCount).toBe(userCount);
        });
        it('should handle concurrent database operations', async () => {
            const concurrentOperations = [];
            for (let i = 0; i < 10; i++) {
                concurrentOperations.push(database_1.prisma.user.create({
                    data: {
                        email: `concurrent${i}@example.com`,
                        password: await (0, password_1.hashPassword)('TestPassword123!'),
                        role: client_1.UserRole.ACTOR,
                    },
                }));
            }
            const results = await Promise.all(concurrentOperations);
            expect(results).toHaveLength(10);
            results.forEach(user => {
                expect(user.id).toBeDefined();
                expect(user.email).toMatch(/concurrent\d+@example\.com/);
            });
        });
        it('should efficiently query with includes', async () => {
            const user = await database_1.prisma.user.create({
                data: {
                    email: 'include@example.com',
                    password: await (0, password_1.hashPassword)('TestPassword123!'),
                    role: client_1.UserRole.ACTOR,
                },
            });
            await database_1.prisma.actor.create({
                data: {
                    userId: user.id,
                    firstName: 'Include',
                    lastName: 'Test',
                    dateOfBirth: new Date('1990-01-01'),
                    gender: 'MALE',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    languages: ['English'],
                    skills: ['Acting'],
                },
            });
            await database_1.prisma.session.create({
                data: {
                    id: 'include-session',
                    userId: user.id,
                    token: 'include-token',
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            });
            const startTime = Date.now();
            const userWithRelations = await database_1.prisma.user.findUnique({
                where: { id: user.id },
                include: {
                    actor: true,
                    sessions: true,
                },
            });
            const endTime = Date.now();
            const duration = endTime - startTime;
            expect(userWithRelations).toBeDefined();
            expect(userWithRelations?.actor).toBeDefined();
            expect(userWithRelations?.sessions).toHaveLength(1);
            expect(duration).toBeLessThan(1000);
        });
    });
    describe('Database Constraints and Validations', () => {
        it('should enforce required fields', async () => {
            await expect(database_1.prisma.user.create({
                data: {
                    password: await (0, password_1.hashPassword)('TestPassword123!'),
                    role: client_1.UserRole.ACTOR,
                },
            })).rejects.toThrow();
        });
        it('should validate enum values', async () => {
            await expect(database_1.prisma.user.create({
                data: {
                    email: 'enum@example.com',
                    password: await (0, password_1.hashPassword)('TestPassword123!'),
                    role: 'INVALID_ROLE',
                },
            })).rejects.toThrow();
        });
        it('should handle cascade deletions', async () => {
            const user = await database_1.prisma.user.create({
                data: {
                    email: 'cascade@example.com',
                    password: await (0, password_1.hashPassword)('TestPassword123!'),
                    role: client_1.UserRole.ACTOR,
                },
            });
            await database_1.prisma.actor.create({
                data: {
                    userId: user.id,
                    firstName: 'Cascade',
                    lastName: 'Test',
                    dateOfBirth: new Date('1990-01-01'),
                    gender: 'MALE',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    languages: ['English'],
                    skills: ['Acting'],
                },
            });
            await database_1.prisma.session.create({
                data: {
                    id: 'cascade-session',
                    userId: user.id,
                    token: 'cascade-token',
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            });
            await database_1.prisma.user.delete({
                where: { id: user.id },
            });
            const actor = await database_1.prisma.actor.findFirst({
                where: { userId: user.id },
            });
            const session = await database_1.prisma.session.findFirst({
                where: { userId: user.id },
            });
            expect(actor).toBeNull();
            expect(session).toBeNull();
        });
    });
});
//# sourceMappingURL=database.test.js.map