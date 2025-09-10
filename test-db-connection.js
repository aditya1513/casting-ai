const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/castmatch_db',
});

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/castmatch_db');
    
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL successfully');
    
    const result = await client.query('SELECT COUNT(*) FROM talents WHERE "isActive" = true');
    console.log('✅ Query executed successfully:', result.rows[0]);
    
    client.release();
    await pool.end();
    console.log('✅ Connection closed successfully');
    
  } catch (err) {
    console.error('❌ Database connection error:', err);
    process.exit(1);
  }
}

testConnection();