/**
 * Playwright Global Setup
 * Setup database and environment before running E2E tests
 */

import { chromium, FullConfig } from '@playwright/test';
import { prisma } from '../../src/config/database';
import { redis } from '../../src/config/redis';

async function globalSetup(config: FullConfig) {
  console.log('Setting up E2E test environment...');

  try {
    // Ensure database is connected
    await prisma.$connect();
    console.log('✅ Database connected');

    // Ensure Redis is connected
    await redis.ping();
    console.log('✅ Redis connected');

    // Clean up any existing test data
    await prisma.session.deleteMany();
    await prisma.actor.deleteMany();
    await prisma.castingDirector.deleteMany();
    await prisma.producer.deleteMany();
    await prisma.user.deleteMany();
    console.log('✅ Database cleaned');

    // Clear Redis cache
    await redis.flushdb();
    console.log('✅ Redis cache cleared');

    // Create a browser instance for shared authentication if needed
    const browser = await chromium.launch();
    const context = await browser.newContext();
    
    // You can perform any global authentication or setup here
    // For example, create admin users, set up test data, etc.
    
    await context.close();
    await browser.close();

    console.log('✅ E2E test environment setup complete');
  } catch (error) {
    console.error('❌ Failed to setup E2E test environment:', error);
    throw error;
  }
}

export default globalSetup;