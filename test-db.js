const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testConnection() {
  try {
    console.log('Testing database connection...');
    await prisma.$connect();
    console.log('✅ Connected to database successfully!');
    
    // Try to query the database
    const result = await prisma.$queryRaw`SELECT current_database(), current_user`;
    console.log('Database info:', result);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(error.message);
    process.exit(1);
  }
}

testConnection();