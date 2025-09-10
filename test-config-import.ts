#!/usr/bin/env node

console.log('🔍 Testing config import...');

try {
  console.log('1. Testing dotenv...');
  import('dotenv').then(dotenv => {
    dotenv.config();
    console.log('✅ dotenv loaded');
    
    console.log('2. Testing zod...');
    import('zod').then(() => {
      console.log('✅ zod loaded');
      
      console.log('3. Testing config...');
      import('./src/config/config.js').then(() => {
        console.log('✅ config loaded successfully');
        process.exit(0);
      }).catch(err => {
        console.error('❌ config error:', err.message);
        process.exit(1);
      });
    }).catch(err => {
      console.error('❌ zod error:', err.message);
      process.exit(1);
    });
  }).catch(err => {
    console.error('❌ dotenv error:', err.message);
    process.exit(1);
  });
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}