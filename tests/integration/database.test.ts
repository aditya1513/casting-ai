/**
 * Database Integration Tests
 * Comprehensive tests for database operations, transactions, and performance
 */

import { prisma } from '../../src/config/database';
import { hashPassword } from '../../src/utils/password';
import { UserRole } from '@prisma/client';

describe('Database Integration Tests', () => {
  beforeEach(async () => {
    // Clean up database before each test
    await prisma.session.deleteMany();
    await prisma.actor.deleteMany();
    await prisma.castingDirector.deleteMany();
    await prisma.producer.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('User CRUD Operations', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: await hashPassword('TestPassword123!'),
        role: UserRole.ACTOR,
      };

      const user = await prisma.user.create({
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
      const user = await prisma.user.create({
        data: {
          email: 'read@example.com',
          password: await hashPassword('TestPassword123!'),
          role: UserRole.CASTING_DIRECTOR,
        },
      });

      const foundUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe('read@example.com');
    });

    it('should read user by email', async () => {
      await prisma.user.create({
        data: {
          email: 'findby@example.com',
          password: await hashPassword('TestPassword123!'),
          role: UserRole.PRODUCER,
        },
      });

      const foundUser = await prisma.user.findUnique({
        where: { email: 'findby@example.com' },
      });

      expect(foundUser).toBeDefined();
      expect(foundUser?.role).toBe(UserRole.PRODUCER);
    });

    it('should update user information', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'update@example.com',
          password: await hashPassword('TestPassword123!'),
          role: UserRole.ACTOR,
        },
      });

      const updatedUser = await prisma.user.update({
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
      const user = await prisma.user.create({
        data: {
          email: 'delete@example.com',
          password: await hashPassword('TestPassword123!'),
          role: UserRole.ACTOR,
        },
      });

      await prisma.user.delete({
        where: { id: user.id },
      });

      const deletedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(deletedUser).toBeNull();
    });

    it('should enforce unique email constraint', async () => {
      const email = 'duplicate@example.com';
      
      await prisma.user.create({
        data: {
          email,
          password: await hashPassword('TestPassword123!'),
          role: UserRole.ACTOR,
        },
      });

      await expect(
        prisma.user.create({
          data: {
            email,
            password: await hashPassword('TestPassword123!'),
            role: UserRole.CASTING_DIRECTOR,
          },
        })
      ).rejects.toThrow();
    });

    it('should enforce unique phone constraint when provided', async () => {
      const phone = '+1234567890';
      
      await prisma.user.create({
        data: {
          email: 'user1@example.com',
          phone,
          password: await hashPassword('TestPassword123!'),
          role: UserRole.ACTOR,
        },
      });

      await expect(
        prisma.user.create({
          data: {
            email: 'user2@example.com',
            phone,
            password: await hashPassword('TestPassword123!'),
            role: UserRole.ACTOR,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Actor Profile Operations', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await prisma.user.create({
        data: {
          email: 'actor@example.com',
          password: await hashPassword('TestPassword123!'),
          role: UserRole.ACTOR,
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
        gender: 'MALE' as const,
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        languages: ['English', 'Hindi', 'Marathi'],
        skills: ['Acting', 'Dancing', 'Singing'],
        bio: 'Experienced actor with diverse skills.',
      };

      const actor = await prisma.actor.create({
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
      const actor = await prisma.actor.create({
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

      const updatedActor = await prisma.actor.update({
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
      await prisma.actor.create({
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

      const actorWithUser = await prisma.actor.findUnique({
        where: { userId: testUser.id },
        include: { user: true },
      });

      expect(actorWithUser).toBeDefined();
      expect(actorWithUser?.user.email).toBe('actor@example.com');
      expect(actorWithUser?.firstName).toBe('Jane');
    });

    it('should enforce one-to-one relationship with user', async () => {
      await prisma.actor.create({
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

      await expect(
        prisma.actor.create({
          data: {
            userId: testUser.id, // Same user ID
            firstName: 'Second',
            lastName: 'Actor',
            dateOfBirth: new Date('1990-01-01'),
            gender: 'FEMALE',
            city: 'Mumbai',
            state: 'Maharashtra',
            languages: ['Hindi'],
            skills: ['Dancing'],
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Casting Director Operations', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await prisma.user.create({
        data: {
          email: 'cd@example.com',
          password: await hashPassword('TestPassword123!'),
          role: UserRole.CASTING_DIRECTOR,
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

      const castingDirector = await prisma.castingDirector.create({
        data: cdData,
      });

      expect(castingDirector).toBeDefined();
      expect(castingDirector.companyName).toBe(cdData.companyName);
      expect(castingDirector.specializations).toEqual(cdData.specializations);
    });

    it('should update casting director specializations', async () => {
      const cd = await prisma.castingDirector.create({
        data: {
          userId: testUser.id,
          firstName: 'Jane',
          lastName: 'Director',
          specializations: ['Film'],
        },
      });

      const updatedCD = await prisma.castingDirector.update({
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
    let testUser: any;

    beforeEach(async () => {
      testUser = await prisma.user.create({
        data: {
          email: 'producer@example.com',
          password: await hashPassword('TestPassword123!'),
          role: UserRole.PRODUCER,
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

      const producer = await prisma.producer.create({
        data: producerData,
      });

      expect(producer).toBeDefined();
      expect(producer.productionHouse).toBe(producerData.productionHouse);
      expect(producer.bio).toBe(producerData.bio);
    });
  });

  describe('Session Operations', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await prisma.user.create({
        data: {
          email: 'session@example.com',
          password: await hashPassword('TestPassword123!'),
          role: UserRole.ACTOR,
        },
      });
    });

    it('should create and manage sessions', async () => {
      const sessionData = {
        id: 'session-123',
        userId: testUser.id,
        token: 'refresh-token-here',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
      };

      const session = await prisma.session.create({
        data: sessionData,
      });

      expect(session.id).toBe(sessionData.id);
      expect(session.userId).toBe(testUser.id);
      expect(session.ipAddress).toBe(sessionData.ipAddress);
    });

    it('should delete expired sessions', async () => {
      // Create expired session
      const expiredSession = await prisma.session.create({
        data: {
          id: 'expired-session',
          userId: testUser.id,
          token: 'expired-token',
          expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        },
      });

      // Create valid session
      const validSession = await prisma.session.create({
        data: {
          id: 'valid-session',
          userId: testUser.id,
          token: 'valid-token',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // Delete expired sessions
      await prisma.session.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      });

      const remainingSessions = await prisma.session.findMany({
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

      await prisma.session.createMany({
        data: sessions,
      });

      const userSessions = await prisma.session.findMany({
        where: { userId: testUser.id },
      });

      expect(userSessions).toHaveLength(2);
    });
  });

  describe('Database Transactions', () => {
    it('should handle successful transaction', async () => {
      const result = await prisma.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: {
            email: 'transaction@example.com',
            password: await hashPassword('TestPassword123!'),
            role: UserRole.ACTOR,
          },
        });

        // Create actor profile
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

      // Verify data was actually saved
      const savedUser = await prisma.user.findUnique({
        where: { id: result.user.id },
        include: { actor: true },
      });

      expect(savedUser).toBeDefined();
      expect(savedUser?.actor).toBeDefined();
    });

    it('should rollback on transaction failure', async () => {
      const userCountBefore = await prisma.user.count();

      try {
        await prisma.$transaction(async (tx) => {
          // Create user
          await tx.user.create({
            data: {
              email: 'rollback@example.com',
              password: await hashPassword('TestPassword123!'),
              role: UserRole.ACTOR,
            },
          });

          // Intentionally cause an error
          throw new Error('Intentional error for rollback test');
        });
      } catch (error) {
        expect(error.message).toBe('Intentional error for rollback test');
      }

      const userCountAfter = await prisma.user.count();
      expect(userCountAfter).toBe(userCountBefore);

      // Verify user was not created
      const rollbackUser = await prisma.user.findUnique({
        where: { email: 'rollback@example.com' },
      });
      expect(rollbackUser).toBeNull();
    });

    it('should handle complex multi-table transaction', async () => {
      const result = await prisma.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: {
            email: 'complex@example.com',
            password: await hashPassword('TestPassword123!'),
            role: UserRole.ACTOR,
          },
        });

        // Create actor profile
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

        // Create session
        const session = await tx.session.create({
          data: {
            id: 'complex-session',
            userId: user.id,
            token: 'complex-token',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });

        // Update user
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
          password: await hashPassword('TestPassword123!'),
          role: UserRole.ACTOR,
        });
      }

      const startTime = Date.now();
      
      await prisma.user.createMany({
        data: users,
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds

      const createdCount = await prisma.user.count();
      expect(createdCount).toBe(userCount);
    });

    it('should handle concurrent database operations', async () => {
      const concurrentOperations = [];

      for (let i = 0; i < 10; i++) {
        concurrentOperations.push(
          prisma.user.create({
            data: {
              email: `concurrent${i}@example.com`,
              password: await hashPassword('TestPassword123!'),
              role: UserRole.ACTOR,
            },
          })
        );
      }

      const results = await Promise.all(concurrentOperations);
      expect(results).toHaveLength(10);
      results.forEach(user => {
        expect(user.id).toBeDefined();
        expect(user.email).toMatch(/concurrent\d+@example\.com/);
      });
    });

    it('should efficiently query with includes', async () => {
      // Create test data
      const user = await prisma.user.create({
        data: {
          email: 'include@example.com',
          password: await hashPassword('TestPassword123!'),
          role: UserRole.ACTOR,
        },
      });

      await prisma.actor.create({
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

      await prisma.session.create({
        data: {
          id: 'include-session',
          userId: user.id,
          token: 'include-token',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const startTime = Date.now();

      const userWithRelations = await prisma.user.findUnique({
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
      expect(duration).toBeLessThan(1000); // Should be fast
    });
  });

  describe('Database Constraints and Validations', () => {
    it('should enforce required fields', async () => {
      await expect(
        prisma.user.create({
          data: {
            // Missing email
            password: await hashPassword('TestPassword123!'),
            role: UserRole.ACTOR,
          } as any,
        })
      ).rejects.toThrow();
    });

    it('should validate enum values', async () => {
      await expect(
        prisma.user.create({
          data: {
            email: 'enum@example.com',
            password: await hashPassword('TestPassword123!'),
            role: 'INVALID_ROLE' as any,
          },
        })
      ).rejects.toThrow();
    });

    it('should handle cascade deletions', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'cascade@example.com',
          password: await hashPassword('TestPassword123!'),
          role: UserRole.ACTOR,
        },
      });

      await prisma.actor.create({
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

      await prisma.session.create({
        data: {
          id: 'cascade-session',
          userId: user.id,
          token: 'cascade-token',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // Delete user should cascade to related records
      await prisma.user.delete({
        where: { id: user.id },
      });

      const actor = await prisma.actor.findFirst({
        where: { userId: user.id },
      });
      const session = await prisma.session.findFirst({
        where: { userId: user.id },
      });

      expect(actor).toBeNull();
      expect(session).toBeNull();
    });
  });
});