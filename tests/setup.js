"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)({ path: '.env.test' });
process.env.NODE_ENV = 'test';
jest.mock('../src/utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
    LogContext: {
        apiRequest: jest.fn(),
        apiResponse: jest.fn(),
        dbQuery: jest.fn(),
        auth: jest.fn(),
        business: jest.fn(),
        error: jest.fn(),
    },
    httpLogStream: {
        write: jest.fn(),
    },
}));
jest.setTimeout(30000);
afterAll(async () => {
    const { prisma } = require('../src/config/database');
    await prisma.$disconnect();
    const { redis } = require('../src/config/redis');
    await redis.quit();
});
//# sourceMappingURL=setup.js.map