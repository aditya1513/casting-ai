const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function pushSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/castmatch_db'
  });

  try {
    await client.connect();
    console.log('✓ Connected to PostgreSQL directly');

    // Read the generated SQL from Prisma
    const sqlPath = path.join(__dirname, '../../prisma/migrations/init/migration.sql');
    
    // Generate SQL from Prisma schema
    const { execSync } = require('child_process');
    
    try {
      // Create a migration SQL file
      execSync('npx prisma migrate dev --create-only --name init', { stdio: 'pipe' });
      console.log('✓ Generated migration SQL');
    } catch (e) {
      console.log('Note: Using existing schema structure');
    }

    // Create tables manually if migration doesn't exist
    console.log('✓ Creating/updating database schema...');
    
    // We'll use Prisma's db push through direct connection
    execSync('npx prisma db push --skip-generate --accept-data-loss', { stdio: 'inherit' });
    
    console.log('✓ Database schema updated successfully');
    
  } catch (error) {
    console.error('Error pushing schema:', error);
    
    // Fallback: Try to fix permissions
    try {
      await client.query('GRANT ALL PRIVILEGES ON DATABASE castmatch_db TO postgres;');
      await client.query('GRANT ALL ON SCHEMA public TO postgres;');
      console.log('✓ Fixed permissions, retrying...');
      
      const { execSync } = require('child_process');
      execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
      
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError.message);
    }
  } finally {
    await client.end();
  }
}

pushSchema().catch(console.error);