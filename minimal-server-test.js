#!/usr/bin/env node

/**
 * Minimal CastMatch Server Test
 * Testing individual components to identify the hanging issue
 */

const express = require('express');

console.log('🔍 Starting minimal server test...');

const app = express();

// Basic middleware
app.use(express.json());

// Test route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const server = app.listen(3001, () => {
  console.log('✅ Minimal server started successfully on port 3001');
  console.log('Test: http://localhost:3001/api/health');
  
  // Auto-shutdown after test
  setTimeout(() => {
    console.log('✅ Minimal server test completed - shutting down');
    server.close();
  }, 2000);
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
});