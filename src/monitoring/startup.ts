#!/usr/bin/env npx ts-node

/**
 * CastMatch Agent Orchestrator Startup Script
 * 
 * This script initializes and starts the automated monitoring system
 * that coordinates all 6 development agents.
 */

import { logger } from '../config/logger';
import { AgentOrchestrator, MONITORING_CONFIG } from './index';

async function startMonitoringSystem(): Promise<void> {
  try {
    logger.info(`
    ╔══════════════════════════════════════════════════════════════════╗
    ║                                                                  ║
    ║               🤖 CASTMATCH AGENT ORCHESTRATOR                    ║
    ║                                                                  ║
    ║  Automated Development Agent Monitoring & Coordination System    ║
    ║                                                                  ║
    ╚══════════════════════════════════════════════════════════════════╝
    `);

    // Initialize the orchestrator
    const orchestrator = new AgentOrchestrator(MONITORING_CONFIG);

    // Set up comprehensive event logging
    orchestrator.on('monitoring:cycle:complete', (data) => {
      const { successCount, errorCount, results } = data;
      logger.info(`📊 Monitoring Cycle Complete: ${successCount} healthy agents, ${errorCount} errors`);
      
      if (errorCount > 0) {
        const failedAgents = results.filter(r => !r.success).map(r => r.agentType);
        logger.warn(`⚠️  Failed agents: ${failedAgents.join(', ')}`);
      }
    });

    orchestrator.on('report:generated', (data) => {
      const { report } = data;
      logger.info(`📈 Progress Report: ${report.overallProgress}% complete, ${report.blockers.length} blockers`);
      
      if (report.recommendations.length > 0) {
        logger.info('💡 Top Recommendations:');
        report.recommendations.slice(0, 3).forEach((rec, i) => {
          logger.info(`   ${i + 1}. ${rec}`);
        });
      }
    });

    orchestrator.on('agent:status:updated', (agentType, status) => {
      const statusIcon = getStatusIcon(status.health);
      logger.info(`${statusIcon} ${agentType}: ${status.status}/${status.health} (${status.progress}%)`);
    });

    orchestrator.on('notification:broadcast', (payload) => {
      logger.info(`📢 Broadcasting to all agents: ${payload.message}`);
    });

    orchestrator.on('notification:agent', (target, payload) => {
      logger.info(`📨 Notifying ${target}: ${payload.message}`);
    });

    orchestrator.on('automation:trigger:executed', (trigger) => {
      logger.info(`⚡ Automation Trigger: "${trigger.name}" executed successfully`);
    });

    // Auto-resolution event handlers
    orchestrator.on('auto_resolve:database_restart', () => {
      logger.info('🔧 Auto-resolving: Restarting database container...');
      // In real implementation, would execute Docker restart
    });

    orchestrator.on('auto_resolve:docker_restart', () => {
      logger.info('🔧 Auto-resolving: Restarting Docker services...');
      // In real implementation, would execute docker-compose restart
    });

    orchestrator.on('auto_resolve:frontend_rebuild', () => {
      logger.info('🔧 Auto-resolving: Rebuilding frontend application...');
      // In real implementation, would execute npm run build
    });

    orchestrator.on('issue:escalated', (target, payload) => {
      logger.warn(`🚨 Issue escalated to ${target}: ${payload.message}`);
    });

    // Start the monitoring system
    await orchestrator.start();

    // Display startup summary
    const healthSummary = orchestrator.getHealthSummary();
    logger.info(`
    🎯 Agent Orchestrator Status:
    =============================
    ✅ Healthy Agents: ${healthSummary.healthy}
    ❌ Unhealthy Agents: ${healthSummary.unhealthy}
    ❓ Unknown Status: ${healthSummary.unknown}
    
    🔄 Monitoring: Every 15 minutes
    📊 Reporting: Every 30 minutes
    ⚡ Auto-Resolution: Enabled
    =============================
    `);

    // Schedule periodic status updates
    setInterval(() => {
      const summary = orchestrator.getHealthSummary();
      logger.info(`💓 Heartbeat: ${summary.healthy} healthy, ${summary.unhealthy} unhealthy agents`);
    }, 5 * 60 * 1000); // Every 5 minutes

    logger.info('🚀 CastMatch Agent Orchestrator is now fully operational!');

  } catch (error) {
    logger.error('❌ Failed to start Agent Orchestrator:', error);
    process.exit(1);
  }
}

function getStatusIcon(health: string): string {
  switch (health) {
    case 'HEALTHY': return '✅';
    case 'DEGRADED': return '⚠️';
    case 'UNHEALTHY': return '❌';
    default: return '❓';
  }
}

// Handle process signals
process.on('SIGINT', () => {
  logger.info('🛑 Received SIGINT, shutting down Agent Orchestrator...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('🛑 Received SIGTERM, shutting down Agent Orchestrator...');
  process.exit(0);
});

// Start the monitoring system if this file is run directly
if (require.main === module) {
  startMonitoringSystem().catch(error => {
    logger.error('❌ Startup failed:', error);
    process.exit(1);
  });
}

export { startMonitoringSystem };