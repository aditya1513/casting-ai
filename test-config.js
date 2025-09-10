#!/usr/bin/env node

console.log('🔍 Testing individual imports...');

try {
  console.log('1. Testing express...');
  const express = require('express');
  console.log('✅ Express imported');

  console.log('2. Testing config...');
  // This might be the issue
  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}