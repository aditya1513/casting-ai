import { Router } from 'express';
import { AgentOrchestrator, MONITORING_CONFIG } from '../monitoring';
import { logger } from '../utils/logger';

const router = Router();

// Global orchestrator instance
let orchestrator: AgentOrchestrator | null = null;

// Initialize orchestrator
const initializeOrchestrator = async (): Promise<AgentOrchestrator> => {
  if (!orchestrator) {
    orchestrator = new AgentOrchestrator(MONITORING_CONFIG);
    
    // Set up event listeners for logging
    orchestrator.on('monitoring:cycle:complete', (data) => {
      logger.info(`📊 Monitoring cycle complete: ${data.successCount} healthy, ${data.errorCount} errors`);
    });

    orchestrator.on('report:generated', (data) => {
      logger.info(`📈 Progress report generated: ${data.report.overallProgress}% complete`);
    });

    orchestrator.on('agent:status:updated', (agentType, status) => {
      logger.info(`🔄 Agent ${agentType} status: ${status.status}/${status.health}`);
    });

    await orchestrator.start();
  }
  return orchestrator;
};

/**
 * @route GET /api/monitoring/health
 * @desc Get monitoring system health
 * @access Public
 */
router.get('/health', async (req, res) => {
  try {
    const orchestrator = await initializeOrchestrator();
    const healthSummary = orchestrator.getHealthSummary();
    
    res.json({
      success: true,
      monitoring: {
        status: 'operational',
        agents: healthSummary
      }
    });
  } catch (error) {
    logger.error('❌ Monitoring health check failed', error);
    res.status(500).json({
      success: false,
      error: 'Monitoring system health check failed'
    });
  }
});

/**
 * @route GET /api/monitoring/status
 * @desc Get all agent statuses
 * @access Private
 */
router.get('/status', async (req, res) => {
  try {
    const orchestrator = await initializeOrchestrator();
    const allStatuses = orchestrator.getAllStatuses();
    
    const statusArray = Array.from(allStatuses.entries()).map(([agentType, status]) => ({
      agentType,
      status: status
    }));

    res.json({
      success: true,
      data: statusArray,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Failed to get agent statuses', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve agent statuses'
    });
  }
});

/**
 * @route GET /api/monitoring/metrics
 * @desc Get all agent metrics
 * @access Private
 */
router.get('/metrics', async (req, res) => {
  try {
    const orchestrator = await initializeOrchestrator();
    const allMetrics = orchestrator.getAllMetrics();
    
    const metricsArray = Array.from(allMetrics.entries()).map(([agentType, metrics]) => ({
      agentType,
      metrics: metrics
    }));

    res.json({
      success: true,
      data: metricsArray,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Failed to get agent metrics', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve agent metrics'
    });
  }
});

/**
 * @route GET /api/monitoring/report
 * @desc Generate and return progress report
 * @access Private
 */
router.get('/report', async (req, res) => {
  try {
    const orchestrator = await initializeOrchestrator();
    const report = await orchestrator['reportGenerator'].generateProgressReport();
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('❌ Failed to generate progress report', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate progress report'
    });
  }
});

/**
 * @route GET /api/monitoring/agent/:agentType
 * @desc Get specific agent status and metrics
 * @access Private
 */
router.get('/agent/:agentType', async (req, res) => {
  try {
    const { agentType } = req.params;
    const orchestrator = await initializeOrchestrator();
    
    const status = orchestrator.getAgentStatus(agentType as any);
    const metrics = orchestrator.getAgentMetrics(agentType as any);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        error: `Agent ${agentType} not found`
      });
    }

    res.json({
      success: true,
      data: {
        agentType,
        status,
        metrics
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`❌ Failed to get agent ${req.params.agentType} data`, error);
    res.status(500).json({
      success: false,
      error: `Failed to retrieve agent ${req.params.agentType} data`
    });
  }
});

/**
 * @route POST /api/monitoring/trigger/:triggerName
 * @desc Execute manual trigger
 * @access Private
 */
router.post('/trigger/:triggerName', async (req, res) => {
  try {
    const { triggerName } = req.params;
    const params = req.body;
    
    const orchestrator = await initializeOrchestrator();
    const result = await orchestrator.executeManualTrigger(triggerName, params);
    
    res.json({
      success: true,
      data: result,
      message: `Trigger ${triggerName} executed successfully`
    });
  } catch (error) {
    logger.error(`❌ Failed to execute trigger ${req.params.triggerName}`, error);
    res.status(500).json({
      success: false,
      error: `Failed to execute trigger: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

/**
 * @route POST /api/monitoring/agent/:agentType/task
 * @desc Assign task to specific agent
 * @access Private
 */
router.post('/agent/:agentType/task', async (req, res) => {
  try {
    const { agentType } = req.params;
    const task = req.body;
    
    const orchestrator = await initializeOrchestrator();
    const success = await orchestrator.assignTask(agentType as any, task);
    
    if (success) {
      res.json({
        success: true,
        message: `Task assigned to ${agentType} successfully`
      });
    } else {
      res.status(400).json({
        success: false,
        error: `Failed to assign task to ${agentType}`
      });
    }
  } catch (error) {
    logger.error(`❌ Failed to assign task to ${req.params.agentType}`, error);
    res.status(500).json({
      success: false,
      error: `Failed to assign task: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

/**
 * @route GET /api/monitoring/triggers
 * @desc Get all available automation triggers
 * @access Private
 */
router.get('/triggers', async (req, res) => {
  try {
    const orchestrator = await initializeOrchestrator();
    const triggers = orchestrator['triggerProcessor'].getTriggers();
    
    res.json({
      success: true,
      data: triggers.map(trigger => ({
        id: trigger.id,
        name: trigger.name,
        type: trigger.type,
        description: trigger.description,
        enabled: trigger.enabled,
        lastExecuted: trigger.lastExecuted
      }))
    });
  } catch (error) {
    logger.error('❌ Failed to get triggers', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve triggers'
    });
  }
});

/**
 * @route PUT /api/monitoring/trigger/:triggerId/toggle
 * @desc Enable/disable specific trigger
 * @access Private
 */
router.put('/trigger/:triggerId/toggle', async (req, res) => {
  try {
    const { triggerId } = req.params;
    const { enabled } = req.body;
    
    const orchestrator = await initializeOrchestrator();
    const triggerProcessor = orchestrator['triggerProcessor'];
    
    const success = enabled ? 
      triggerProcessor.enableTrigger(triggerId) : 
      triggerProcessor.disableTrigger(triggerId);
    
    if (success) {
      res.json({
        success: true,
        message: `Trigger ${triggerId} ${enabled ? 'enabled' : 'disabled'} successfully`
      });
    } else {
      res.status(404).json({
        success: false,
        error: `Trigger ${triggerId} not found`
      });
    }
  } catch (error) {
    logger.error(`❌ Failed to toggle trigger ${req.params.triggerId}`, error);
    res.status(500).json({
      success: false,
      error: `Failed to toggle trigger: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

/**
 * @route POST /api/monitoring/start
 * @desc Start monitoring system
 * @access Admin
 */
router.post('/start', async (req, res) => {
  try {
    const orchestrator = await initializeOrchestrator();
    
    res.json({
      success: true,
      message: 'Agent monitoring system started successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Failed to start monitoring system', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start monitoring system'
    });
  }
});

/**
 * @route POST /api/monitoring/stop
 * @desc Stop monitoring system
 * @access Admin
 */
router.post('/stop', async (req, res) => {
  try {
    if (orchestrator) {
      await orchestrator.stop();
      orchestrator = null;
    }
    
    res.json({
      success: true,
      message: 'Agent monitoring system stopped successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Failed to stop monitoring system', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop monitoring system'
    });
  }
});

/**
 * @route GET /api/monitoring/dashboard
 * @desc Get dashboard data for all agents
 * @access Private
 */
router.get('/dashboard', async (req, res) => {
  try {
    const orchestrator = await initializeOrchestrator();
    
    const [statuses, metrics, report] = await Promise.all([
      orchestrator.getAllStatuses(),
      orchestrator.getAllMetrics(),
      orchestrator['reportGenerator'].generateProgressReport()
    ]);

    const healthSummary = orchestrator.getHealthSummary();

    res.json({
      success: true,
      data: {
        overview: {
          overallProgress: report.overallProgress,
          healthSummary,
          lastUpdate: new Date().toISOString()
        },
        agents: Array.from(statuses.entries()).map(([agentType, status]) => ({
          agentType,
          status: status.status,
          health: status.health,
          progress: status.progress,
          activeTask: status.activeTask?.name || null,
          blockers: status.blockers?.length || 0,
          metrics: metrics.get(agentType)
        })),
        report: {
          recommendations: report.recommendations,
          nextActions: report.nextActions.slice(0, 5), // Top 5 actions
          criticalPath: report.criticalPath,
          estimatedCompletion: report.estimatedCompletion
        }
      }
    });
  } catch (error) {
    logger.error('❌ Failed to get dashboard data', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve dashboard data'
    });
  }
});

// Initialize monitoring system on module load
setTimeout(async () => {
  try {
    await initializeOrchestrator();
    logger.info('🚀 Agent monitoring system auto-initialized');
  } catch (error) {
    logger.error('❌ Failed to auto-initialize monitoring system', error);
  }
}, 2000); // Delay to ensure other services are ready

export { router as monitoringRouter };