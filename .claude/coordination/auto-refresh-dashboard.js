#!/usr/bin/env node

const { analyzeProgress, startAutoRefresh } = require('./analyze-progress.js');
const { execSync } = require('child_process');

console.log('🚀 Starting CastMatch Progress Dashboard Auto-Refresh');
console.log('================================================');
console.log('Dashboard URL: http://localhost:8888');
console.log('Auto-refresh interval: 30 seconds');
console.log('');

// Start auto-refresh with 30-second interval
startAutoRefresh(30);

// Keep the script running
process.on('SIGINT', () => {
    console.log('\n\n📊 Dashboard auto-refresh stopped.');
    console.log('Final metrics have been saved to real-progress-data.json');
    process.exit(0);
});

console.log('Press Ctrl+C to stop auto-refresh...\n');