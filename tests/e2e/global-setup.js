"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const database_1 = require("../../src/config/database");
const redis_1 = require("../../src/config/redis");
async function globalSetup(config) {
    console.log('Setting up E2E test environment...');
    try {
        await database_1.prisma.$connect();
        console.log('✅ Database connected');
        await redis_1.redis.ping();
        console.log('✅ Redis connected');
        await database_1.prisma.session.deleteMany();
        await database_1.prisma.actor.deleteMany();
        await database_1.prisma.castingDirector.deleteMany();
        await database_1.prisma.producer.deleteMany();
        await database_1.prisma.user.deleteMany();
        console.log('✅ Database cleaned');
        await redis_1.redis.flushdb();
        console.log('✅ Redis cache cleared');
        const browser = await test_1.chromium.launch();
        const context = await browser.newContext();
        await context.close();
        await browser.close();
        console.log('✅ E2E test environment setup complete');
    }
    catch (error) {
        console.error('❌ Failed to setup E2E test environment:', error);
        throw error;
    }
}
exports.default = globalSetup;
//# sourceMappingURL=global-setup.js.map