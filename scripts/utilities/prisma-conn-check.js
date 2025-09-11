require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['error'] });
async function main() {
  try {
    console.log('DATABASE_URL =', process.env.DATABASE_URL || '(not set)');
    const rows = await prisma.$queryRaw`SELECT current_database() as db, current_user as usr`;
    console.log('Prisma connection OK:', rows);
  } catch (e) {
    console.error('Prisma connection FAILED:', e.code || e.message);
    if (e.meta) console.error('Meta:', e.meta);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}
main();
