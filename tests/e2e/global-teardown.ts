/**
 * Playwright Global Teardown
 * Cleanup after all E2E tests complete
 */

import { FullConfig } from '@playwright/test';
import { prisma } from '../../src/config/database';
import { redis } from '../../src/config/redis';

async function globalTeardown(config: FullConfig) {
  console.log('Tearing down E2E test environment...');

  try {
    // Clean up test data
    await prisma.session.deleteMany();
    await prisma.actor.deleteMany();
    await prisma.castingDirector.deleteMany();
    await prisma.producer.deleteMany();
    await prisma.user.deleteMany();
    console.log('✅ Test data cleaned up');

    // Clear Redis cache
    await redis.flushdb();
    console.log('✅ Redis cache cleared');

    // Disconnect from services
    await prisma.$disconnect();
    console.log('✅ Database disconnected');

    await redis.quit();
    console.log('✅ Redis disconnected');

    console.log('✅ E2E test environment teardown complete');
  } catch (error) {
    console.error('❌ Failed to teardown E2E test environment:', error);
    // Don't throw error during teardown to avoid masking test results
  }
}

export default globalTeardown;