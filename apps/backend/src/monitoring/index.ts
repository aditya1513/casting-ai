/**
 * CastMatch Live Agent Monitoring System
 * Main entry point for the monitoring infrastructure
 */

import { liveMonitor } from './live-agent-monitor';
import { dashboard } from './real-time-dashboard';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
config();

/**
 * Initialize and start the monitoring system
 */
export async function startMonitoring(): Promise<void> {
  console.log('═'.repeat(80));
  console.log('🚀 CASTMATCH LIVE AGENT MONITORING SYSTEM');
  console.log('═'.repeat(80));
  console.log('Initializing monitoring infrastructure...\n');

  // Ensure logs directory exists
  const logsDir = path.join(__dirname, '../../logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log('📁 Created logs directory');
  }

  // Start the live monitoring
  console.log('Starting agent monitoring...');
  liveMonitor.startMonitoring();

  // Start the dashboard
  console.log('Starting real-time dashboard...');
  dashboard.start();

  // Set up graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down monitoring system...');
    liveMonitor.stopMonitoring();
    dashboard.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n\n🛑 Shutting down monitoring system...');
    liveMonitor.stopMonitoring();
    dashboard.stop();
    process.exit(0);
  });

  // Log initial status
  setTimeout(() => {
    console.log('\n✅ Monitoring system is now active');
    console.log('📊 Agents are being polled every 2 minutes');
    console.log('🌐 Dashboard available at http://localhost:3001');
    console.log('\nPress Ctrl+C to stop monitoring\n');
  }, 1000);
}

// Auto-start if run directly
if (require.main === module) {
  startMonitoring().catch(error => {
    console.error('❌ Failed to start monitoring:', error);
    process.exit(1);
  });
}

export { liveMonitor, dashboard };