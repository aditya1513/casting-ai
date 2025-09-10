#!/usr/bin/env node

/**
 * CastMatch Agent Monitoring CLI
 * Real-time command-line monitoring of all development agents
 */

import { liveMonitor } from '../monitoring/live-agent-monitor';
import chalk from 'chalk';

// ANSI escape codes for terminal manipulation
const clearScreen = () => process.stdout.write('\x1Bc');
const moveCursor = (x: number, y: number) => process.stdout.write(`\x1B[${y};${x}H`);

/**
 * Format agent status with colors
 */
function formatStatus(status: string): string {
  switch(status) {
    case 'active': return chalk.green('● ACTIVE');
    case 'idle': return chalk.yellow('● IDLE');
    case 'blocked': return chalk.red('● BLOCKED');
    case 'error': return chalk.magenta('● ERROR');
    default: return status;
  }
}

/**
 * Create a progress bar
 */
function createProgressBar(percentage: number, width: number = 20): string {
  const filled = Math.floor((percentage / 100) * width);
  const empty = width - filled;
  return chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
}

/**
 * Display live monitoring in terminal
 */
function displayMonitoring(): void {
  clearScreen();
  
  const agents = Array.from(liveMonitor.getSnapshot().values());
  const metrics = liveMonitor.getMetrics();
  
  // Header
  console.log(chalk.bold.cyan('═'.repeat(100)));
  console.log(chalk.bold.cyan('  🎬 CASTMATCH LIVE AGENT MONITOR - REAL-TIME ACTIVITY TRACKER'));
  console.log(chalk.bold.cyan('═'.repeat(100)));
  console.log(chalk.gray(`  Last Update: ${new Date().toLocaleString()} | Polling Interval: 2 minutes`));
  console.log();
  
  // Metrics Summary
  console.log(chalk.bold.white('  📊 SYSTEM METRICS'));
  console.log(chalk.gray('  ─'.repeat(96)));
  
  const activeAgents = agents.filter(a => a.status === 'active').length;
  const avgProgress = agents.reduce((sum, a) => sum + a.progressPercentage, 0) / agents.length;
  
  console.log(`  ${chalk.cyan('Active Agents:')} ${activeAgents}/${agents.length}` +
    `  ${chalk.cyan('Tool Calls:')} ${metrics.totalToolCalls}` +
    `  ${chalk.cyan('Files Edited:')} ${metrics.totalFileEdits}` +
    `  ${chalk.cyan('Errors:')} ${metrics.totalErrors}` +
    `  ${chalk.cyan('Avg Progress:')} ${avgProgress.toFixed(1)}%`);
  console.log();
  
  // Agent Details
  console.log(chalk.bold.white('  👥 AGENT ACTIVITY'));
  console.log(chalk.gray('  ─'.repeat(96)));
  
  agents.forEach((agent, index) => {
    console.log();
    console.log(`  ${chalk.bold.white(agent.agentName)} ${formatStatus(agent.status)}`);
    
    if (agent.activeTask) {
      console.log(`    ${chalk.gray('Task:')} ${chalk.white(agent.activeTask)}`);
    }
    
    if (agent.currentFile) {
      console.log(`    ${chalk.gray('File:')} ${chalk.yellow(agent.currentFile)}:${chalk.cyan(agent.currentLineNumber || 0)}`);
    }
    
    if (agent.currentOperation) {
      console.log(`    ${chalk.gray('Operation:')} ${chalk.white(agent.currentOperation)}`);
    }
    
    // Progress bar
    console.log(`    ${chalk.gray('Progress:')} ${createProgressBar(agent.progressPercentage)} ${agent.progressPercentage}%`);
    
    // Code changes
    if (agent.codeChanges) {
      console.log(`    ${chalk.gray('Changes:')} ${chalk.green('+' + agent.codeChanges.additions)} ${chalk.red('-' + agent.codeChanges.deletions)} (${agent.codeChanges.modified.length} files)`);
      console.log(`    ${chalk.gray('Modified:')} ${agent.codeChanges.modified.join(', ')}`);
    }
    
    // Tool usage
    if (Object.keys(agent.toolUsage).length > 0) {
      const tools = Object.entries(agent.toolUsage)
        .map(([tool, count]) => `${tool}(${count})`)
        .join(' ');
      console.log(`    ${chalk.gray('Tools:')} ${chalk.cyan(tools)}`);
    }
    
    // Dependencies
    if (agent.dependencies && agent.dependencies.length > 0) {
      console.log(`    ${chalk.gray('Dependencies:')} ${chalk.blue(agent.dependencies.join(', '))}`);
    }
    
    // Blockers
    if (agent.blockers && agent.blockers.length > 0) {
      agent.blockers.forEach(blocker => {
        console.log(`    ${chalk.red('⚠ Blocker:')} ${blocker}`);
      });
    }
    
    // Errors
    if (agent.errors && agent.errors.length > 0) {
      agent.errors.forEach(err => {
        console.log(`    ${chalk.red('❌ Error:')} ${err.error}`);
        if (err.resolution) {
          console.log(`    ${chalk.green('✓ Resolution:')} ${err.resolution}`);
        }
      });
    }
  });
  
  console.log();
  console.log(chalk.gray('  ─'.repeat(96)));
  console.log(chalk.gray(`  Press Ctrl+C to exit | Dashboard: http://localhost:3001`));
}

/**
 * Main monitoring loop
 */
async function main(): Promise<void> {
  console.log(chalk.bold.cyan('Starting CastMatch Agent Monitoring...'));
  
  // Start monitoring
  liveMonitor.startMonitoring();
  
  // Initial display
  setTimeout(() => {
    displayMonitoring();
  }, 1000);
  
  // Update display on polling complete
  liveMonitor.on('polling:complete', () => {
    displayMonitoring();
  });
  
  // Also refresh display every 10 seconds for smooth updates
  setInterval(() => {
    displayMonitoring();
  }, 10000);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    clearScreen();
    console.log(chalk.bold.red('\n🛑 Monitoring stopped'));
    liveMonitor.stopMonitoring();
    process.exit(0);
  });
}

// Run the monitor
main().catch(error => {
  console.error(chalk.red('Failed to start monitoring:'), error);
  process.exit(1);
});