const { execSync } = require('child_process');

// Test direct connection
try {
  console.log('Testing direct PostgreSQL connection...');
  const result = execSync(
    'docker exec castmatch-postgres psql -U postgres -d castmatch_db -c "SELECT current_database(), current_user"',
    { encoding: 'utf8' }
  );
  console.log('✅ Direct connection successful:', result);
} catch (error) {
  console.error('❌ Direct connection failed:', error.message);
}

// Test Prisma connection with explicit URL
process.env.DATABASE_URL = 'postgresql://postgres:castmatch123@localhost:5432/castmatch_db?schema=public';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testPrisma() {
  try {
    console.log('\nTesting Prisma connection...');
    await prisma.$connect();
    console.log('✅ Prisma connected successfully!');
    
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Query successful:', result);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Prisma connection failed:', error);
    process.exit(1);
  }
}

testPrisma();