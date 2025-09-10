#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import winston from 'winston';

// Load environment variables
dotenv.config();

// Import agents
import {
  scriptAnalysisAgent,
  talentDiscoveryAgent, 
  applicationScreeningAgent,
  auditionSchedulingAgent,
  agentOrchestrator,
} from './src/agents/index.ts';

// Configure logging
const logger = winston.createLogger({
  level: process.env.AGENT_LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'agents.log' }),
  ],
});

// Express app setup
const app = express();
const port = process.env.PORT || 8080;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    agents: {
      scriptAnalysis: 'active',
      talentDiscovery: 'active', 
      applicationScreening: 'active',
      auditionScheduling: 'active',
      orchestrator: 'active',
    }
  });
});

// ===========================================
// AGENT ENDPOINTS
// ===========================================

/**
 * Script Analysis Endpoint
 * POST /api/agents/script-analysis
 */
app.post('/api/agents/script-analysis', async (req, res) => {
  try {
    logger.info('Script analysis request received');
    
    const { scriptContent, fileType, projectContext } = req.body;
    
    if (!scriptContent || !fileType) {
      return res.status(400).json({ 
        error: 'Script content and file type are required' 
      });
    }

    const result = await scriptAnalysisAgent.analyzeScript(
      Buffer.from(scriptContent, 'base64'),
      fileType,
      projectContext || { type: 'web-series', genre: ['drama'] }
    );

    logger.info('Script analysis completed successfully');
    
    res.json({
      success: true,
      data: result,
      message: 'Script analyzed successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Script analysis failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Talent Discovery Endpoint
 * POST /api/agents/talent-discovery
 */
app.post('/api/agents/talent-discovery', async (req, res) => {
  try {
    logger.info('Talent discovery request received');
    
    const searchParams = req.body;
    
    // Validate required parameters
    if (!searchParams.roleDescription || !searchParams.physicalRequirements) {
      return res.status(400).json({
        error: 'Role description and physical requirements are required'
      });
    }

    const result = await talentDiscoveryAgent.searchTalent(searchParams);

    logger.info(`Talent discovery completed: ${result.candidates.length} candidates found`);
    
    res.json({
      success: true,
      data: result,
      message: `Found ${result.candidates.length} suitable candidates`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Talent discovery failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Application Screening Endpoint
 * POST /api/agents/application-screening
 */
app.post('/api/agents/application-screening', async (req, res) => {
  try {
    logger.info('Application screening request received');
    
    const { applications, roleRequirement, screeningCriteria } = req.body;
    
    if (!applications || !roleRequirement) {
      return res.status(400).json({
        error: 'Applications and role requirement are required'
      });
    }

    // Process batch screening
    const result = await applicationScreeningAgent.batchScreenApplications(
      applications,
      roleRequirement,
      screeningCriteria || {
        minimumScore: 70,
        autoRejectThreshold: 40,
        priorityFactors: ['experience', 'skills'],
        batchSize: 10,
      }
    );

    logger.info(`Application screening completed: ${result.results.length} applications processed`);
    
    res.json({
      success: true,
      data: result,
      message: `Screened ${result.results.length} applications`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Application screening failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Audition Scheduling Endpoint
 * POST /api/agents/audition-scheduling
 */
app.post('/api/agents/audition-scheduling', async (req, res) => {
  try {
    logger.info('Audition scheduling request received');
    
    const schedulingRequest = req.body;
    
    if (!schedulingRequest.candidates || !schedulingRequest.preferences) {
      return res.status(400).json({
        error: 'Candidates and preferences are required'
      });
    }

    const result = await auditionSchedulingAgent.scheduleAuditions(schedulingRequest);

    logger.info(`Audition scheduling completed: ${result.scheduledAuditions.length} auditions scheduled`);
    
    res.json({
      success: true,
      data: result,
      message: `Scheduled ${result.scheduledAuditions.length} auditions`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Audition scheduling failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Complete Workflow Endpoint
 * POST /api/agents/full-workflow
 */
app.post('/api/agents/full-workflow', async (req, res) => {
  try {
    logger.info('Full casting workflow request received');
    
    const workflowRequest = req.body;
    
    if (!workflowRequest.scriptFile || !workflowRequest.projectContext) {
      return res.status(400).json({
        error: 'Script file and project context are required'
      });
    }

    const result = await agentOrchestrator.executeFullCastingWorkflow(workflowRequest);

    logger.info(`Full workflow completed with status: ${result.status}`);
    
    res.json({
      success: true,
      data: result,
      message: `Workflow ${result.status} in ${result.timeline.duration}ms`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Full workflow failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Script to Shortlist Workflow
 * POST /api/agents/script-to-shortlist
 */
app.post('/api/agents/script-to-shortlist', async (req, res) => {
  try {
    logger.info('Script-to-shortlist workflow request received');
    
    const { scriptFile, fileType, projectContext, maxCandidatesPerRole } = req.body;
    
    const result = await agentOrchestrator.executeScriptToShortlistWorkflow({
      scriptFile: Buffer.from(scriptFile, 'base64'),
      fileType,
      projectContext,
      maxCandidatesPerRole: maxCandidatesPerRole || 5,
    });

    logger.info(`Script-to-shortlist completed: ${result.shortlists.length} roles processed`);
    
    res.json({
      success: true,
      data: result,
      message: `Generated shortlists for ${result.shortlists.length} roles`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Script-to-shortlist workflow failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ===========================================
// DEMO & TESTING ENDPOINTS
// ===========================================

/**
 * Demo Endpoint - Complete showcase
 * GET /api/demo/complete-workflow
 */
app.get('/api/demo/complete-workflow', async (req, res) => {
  try {
    logger.info('Demo workflow started');

    // Mock script content for demonstration
    const mockScript = `
FADE IN:

EXT. MUMBAI STREET - DAY

ARJUN (30s), a determined journalist, walks quickly through the busy streets of Mumbai. His phone rings.

ARJUN
(answering)
Yes, I found the evidence. Meet me at the café.

PRIYA (20s), a tech expert, appears from the shadows. She looks nervous.

PRIYA
They're tracking us, Arjun. We need to be careful.

ARJUN
(resolute)
We can't stop now. Too many lives depend on this story.

They continue walking as the camera pulls back to reveal they're being followed.

FADE OUT.
`;

    const scriptBuffer = Buffer.from(mockScript);
    
    // Execute the complete workflow
    const workflowResult = await agentOrchestrator.executeFullCastingWorkflow({
      projectId: 'demo_project',
      scriptFile: scriptBuffer,
      fileType: 'txt',
      projectContext: {
        type: 'web-series',
        genre: ['thriller', 'drama'],
        budgetTier: 'medium',
      },
      castingPreferences: {
        priorityRoles: ['Arjun', 'Priya'],
        budgetConstraints: { total: 1000000, perRole: 100000 },
        timeline: { 
          castingDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          auditionDates: [new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)],
        },
      },
    });

    logger.info('Demo workflow completed successfully');

    res.json({
      success: true,
      demo: true,
      data: workflowResult,
      message: 'Complete casting workflow demo executed successfully',
      timestamp: new Date().toISOString(),
      performance: {
        totalTime: workflowResult.timeline.duration,
        stepsCompleted: workflowResult.summary.completedSteps,
        charactersFound: workflowResult.results.scriptAnalysis?.characters?.length || 0,
        recommendationsGenerated: workflowResult.summary.recommendations.length,
      },
    });

  } catch (error) {
    logger.error('Demo workflow failed:', error);
    res.status(500).json({
      success: false,
      demo: true,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Agent Status Endpoint
 * GET /api/agents/status
 */
app.get('/api/agents/status', (req, res) => {
  res.json({
    status: 'All agents operational',
    agents: {
      scriptAnalysis: {
        name: 'Script Analysis Agent',
        status: 'active',
        description: 'Analyzes scripts and extracts character requirements',
        capabilities: ['PDF parsing', 'Character extraction', 'Budget estimation'],
      },
      talentDiscovery: {
        name: 'Talent Discovery Agent',
        status: 'active',
        description: 'Finds and ranks talent based on role requirements',
        capabilities: ['Semantic search', 'Candidate ranking', 'Alternative suggestions'],
      },
      applicationScreening: {
        name: 'Application Screening Agent',
        status: 'active',
        description: 'Screens applications and provides recommendations',
        capabilities: ['Batch processing', 'Compatibility scoring', 'Risk assessment'],
      },
      auditionScheduling: {
        name: 'Audition Scheduling Agent', 
        status: 'active',
        description: 'Manages audition scheduling and calendar integration',
        capabilities: ['Conflict detection', 'Calendar sync', 'Automated notifications'],
      },
      orchestrator: {
        name: 'Agent Orchestrator',
        status: 'active',
        description: 'Coordinates workflows across multiple agents',
        capabilities: ['Workflow management', 'Process optimization', 'Result aggregation'],
      },
    },
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((error: any, req: any, res: any, next: any) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(port, () => {
  logger.info(`CastMatch Agents API server started on port ${port}`);
  logger.info('Available endpoints:');
  logger.info('  - GET  /health - Health check');
  logger.info('  - GET  /api/agents/status - Agent status');
  logger.info('  - POST /api/agents/script-analysis - Analyze scripts');
  logger.info('  - POST /api/agents/talent-discovery - Discover talent');
  logger.info('  - POST /api/agents/application-screening - Screen applications');
  logger.info('  - POST /api/agents/audition-scheduling - Schedule auditions');
  logger.info('  - POST /api/agents/full-workflow - Complete workflow');
  logger.info('  - POST /api/agents/script-to-shortlist - Script to shortlist');
  logger.info('  - GET  /api/demo/complete-workflow - Demo showcase');
  console.log(`\n🚀 CastMatch Agents API is running on http://localhost:${port}`);
  console.log(`🔧 Try the demo: http://localhost:${port}/api/demo/complete-workflow\n`);
});

export { app };