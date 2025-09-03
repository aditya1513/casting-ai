/**
 * Test Environment Setup
 * Comprehensive test environment configuration and utilities
 */

import { PrismaClient } from '@prisma/client';
import { setupAllMocks, clearAllMocks } from '../mocks/external-services';
import { createBatchMockUsers } from '../factories/user.factory';
import Redis from 'ioredis';

export class TestEnvironment {
  private static instance: TestEnvironment;
  private prisma: PrismaClient;
  private redis: Redis;
  private isSetup: boolean = false;

  private constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/castmatch_test'
        }
      }
    });

    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: parseInt(process.env.REDIS_TEST_DB || '1'), // Use separate DB for tests
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 1
    });
  }

  public static getInstance(): TestEnvironment {
    if (!TestEnvironment.instance) {
      TestEnvironment.instance = new TestEnvironment();
    }
    return TestEnvironment.instance;
  }

  public async setup(): Promise<void> {
    if (this.isSetup) {
      return;
    }

    try {
      console.log('🚀 Setting up test environment...');

      // 1. Setup database
      await this.setupDatabase();

      // 2. Setup Redis
      await this.setupRedis();

      // 3. Setup external service mocks
      setupAllMocks();

      // 4. Setup test data
      await this.setupTestData();

      this.isSetup = true;
      console.log('✅ Test environment setup complete');
    } catch (error) {
      console.error('❌ Failed to setup test environment:', error);
      throw error;
    }
  }

  public async cleanup(): Promise<void> {
    try {
      console.log('🧹 Cleaning up test environment...');

      // 1. Clear database
      await this.clearDatabase();

      // 2. Clear Redis
      await this.clearRedis();

      // 3. Clear mocks
      clearAllMocks();

      // 4. Disconnect services
      await this.disconnect();

      this.isSetup = false;
      console.log('✅ Test environment cleanup complete');
    } catch (error) {
      console.error('❌ Failed to cleanup test environment:', error);
      throw error;
    }
  }

  private async setupDatabase(): Promise<void> {
    try {
      // Clear all existing data
      await this.clearDatabase();

      // Ensure database is accessible
      await this.prisma.$connect();
      
      console.log('📦 Database connection established');
    } catch (error) {
      console.error('Failed to setup database:', error);
      throw error;
    }
  }

  private async clearDatabase(): Promise<void> {
    const tableNames = [
      'AuditionApplication',
      'Audition',
      'ProjectCastingDirector', 
      'Project',
      'Session',
      'OAuthAccount',
      'UserProfile',
      'User',
      'PasswordReset',
      'EmailVerification'
    ];

    for (const tableName of tableNames) {
      try {
        await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tableName}" CASCADE;`);
      } catch (error) {
        // Table might not exist, continue
        console.warn(`Could not truncate ${tableName}:`, error.message);
      }
    }
  }

  private async setupRedis(): Promise<void> {
    try {
      await this.redis.ping();
      console.log('📦 Redis connection established');
    } catch (error) {
      console.warn('⚠️  Redis not available, some tests may fail');
      // Don't throw - Redis is optional for many tests
    }
  }

  private async clearRedis(): Promise<void> {
    try {
      await this.redis.flushdb();
    } catch (error) {
      console.warn('Could not clear Redis:', error.message);
    }
  }

  private async setupTestData(): Promise<void> {
    // Create basic test users for common scenarios
    const testUsers = [
      {
        email: 'test.actor@castmatch.ai',
        role: 'ACTOR',
        isEmailVerified: true
      },
      {
        email: 'test.director@castmatch.ai', 
        role: 'CASTING_DIRECTOR',
        isEmailVerified: true
      },
      {
        email: 'test.producer@castmatch.ai',
        role: 'PRODUCER', 
        isEmailVerified: true
      },
      {
        email: 'test.admin@castmatch.ai',
        role: 'ADMIN',
        isEmailVerified: true
      }
    ];

    for (const userData of testUsers) {
      try {
        await this.prisma.user.create({
          data: {
            ...userData,
            password: '$2b$12$8k8.H1V9j0QJ2j7k8K2K2K2K2K2K2K2K2K2K2K2K2K2K2K2K2', // TestPassword123!
            profile: {
              create: {
                firstName: userData.role.toLowerCase().replace('_', ' '),
                lastName: 'User',
                bio: `Test ${userData.role.toLowerCase()} user for automated tests`,
                completionScore: 85
              }
            }
          }
        });
      } catch (error) {
        // User might already exist, continue
        console.warn(`Could not create test user ${userData.email}:`, error.message);
      }
    }

    console.log('📝 Test data setup complete');
  }

  public async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      await this.redis.disconnect();
    } catch (error) {
      console.warn('Error disconnecting from services:', error);
    }
  }

  public getPrisma(): PrismaClient {
    return this.prisma;
  }

  public getRedis(): Redis {
    return this.redis;
  }

  // Helper methods for tests
  public async createTestUser(overrides: any = {}) {
    const userData = {
      email: `test.${Date.now()}@castmatch.ai`,
      password: '$2b$12$8k8.H1V9j0QJ2j7k8K2K2K2K2K2K2K2K2K2K2K2K2K2K2K2K2',
      role: 'ACTOR',
      isEmailVerified: true,
      ...overrides
    };

    return this.prisma.user.create({
      data: {
        ...userData,
        profile: {
          create: {
            firstName: 'Test',
            lastName: 'User',
            bio: 'Test user created by test environment'
          }
        }
      },
      include: {
        profile: true
      }
    });
  }

  public async createTestProject(createdById: string, overrides: any = {}) {
    return this.prisma.project.create({
      data: {
        title: 'Test Project',
        description: 'A test project for automated testing',
        status: 'ACTIVE',
        createdById,
        requirements: {
          roles: ['Lead Actor'],
          skills: ['Acting'],
          languages: ['English']
        },
        ...overrides
      }
    });
  }
}

// Global test hooks
export const setupTestEnvironment = async () => {
  const testEnv = TestEnvironment.getInstance();
  await testEnv.setup();
  return testEnv;
};

export const cleanupTestEnvironment = async () => {
  const testEnv = TestEnvironment.getInstance();
  await testEnv.cleanup();
};

// Jest global setup
export default async function globalSetup() {
  await setupTestEnvironment();
}

// Jest global teardown
export async function globalTeardown() {
  await cleanupTestEnvironment();
}