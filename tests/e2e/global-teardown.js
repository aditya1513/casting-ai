"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../../src/config/database");
const redis_1 = require("../../src/config/redis");
async function globalTeardown(config) {
    console.log('Tearing down E2E test environment...');
    try {
        await database_1.prisma.session.deleteMany();
        await database_1.prisma.actor.deleteMany();
        await database_1.prisma.castingDirector.deleteMany();
        await database_1.prisma.producer.deleteMany();
        await database_1.prisma.user.deleteMany();
        console.log('✅ Test data cleaned up');
        await redis_1.redis.flushdb();
        console.log('✅ Redis cache cleared');
        await database_1.prisma.$disconnect();
        console.log('✅ Database disconnected');
        await redis_1.redis.quit();
        console.log('✅ Redis disconnected');
        console.log('✅ E2E test environment teardown complete');
    }
    catch (error) {
        console.error('❌ Failed to teardown E2E test environment:', error);
    }
}
exports.default = globalTeardown;
//# sourceMappingURL=global-teardown.js.map