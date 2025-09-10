// Test Prisma connection with no password (trust auth)
process.env.DATABASE_URL = 'postgresql://postgres@localhost:5432/castmatch_db';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testPrisma() {
  try {
    console.log('Testing Prisma connection...');
    console.log('Using DATABASE_URL:', process.env.DATABASE_URL);
    
    // Try a raw query first
    const result = await prisma.$queryRaw`SELECT current_database(), current_user`;
    console.log('✅ Raw query successful:', result);
    
    // Try counting talents
    const count = await prisma.talent.count();
    console.log('✅ Talent count:', count);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Prisma error:', error.message);
    console.error('Error code:', error.code);
    if (error.meta) {
      console.error('Meta:', error.meta);
    }
    process.exit(1);
  }
}

testPrisma();