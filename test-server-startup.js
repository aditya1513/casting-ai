console.log('Starting server test...');

// Test basic imports
try {
  console.log('Testing express import...');
  const express = require('express');
  console.log('✓ Express imported successfully');
} catch (error) {
  console.error('✗ Failed to import express:', error.message);
}

// Test database connection
try {
  console.log('Testing database connection...');
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://castmatch_user:castmatch_pass123@localhost:5432/castmatch_db',
    max: 5,
    connectionTimeoutMillis: 5000,
  });
  
  pool.query('SELECT 1', (err, result) => {
    if (err) {
      console.error('✗ Database connection failed:', err.message);
    } else {
      console.log('✓ Database connection successful');
    }
    pool.end();
    process.exit(0);
  });
} catch (error) {
  console.error('✗ Database setup error:', error.message);
  process.exit(1);
}