const { Client } = require('pg');

async function testConnection() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'castmatch_db'
  });

  try {
    await client.connect();
    console.log('✅ Direct PostgreSQL connection successful!');
    
    // Test query
    const result = await client.query('SELECT COUNT(*) FROM talents');
    console.log('Talents count:', result.rows[0].count);
    
    await client.end();
  } catch (error) {
    console.error('❌ Connection error:', error.message);
  }
}

testConnection();