/**
 * Route setup for AI Agents Server
 */

import { Application } from 'express';
import { agentsRouter } from './agents.js';
import { demoRouter } from './demo.js';

export const setupRoutes = (app: Application): void => {
  // API routes
  app.use('/api/agents', agentsRouter);
  app.use('/api/demo', demoRouter);
  
  // Root API info
  app.get('/api', (req, res) => {
    res.json({
      name: 'CastMatch AI Agents Server',
      version: '1.0.0',
      status: 'operational',
      endpoints: {
        health: 'GET /health',
        agents: {
          status: 'GET /api/agents/status',
          scriptAnalysis: 'POST /api/agents/script-analysis',
          talentDiscovery: 'POST /api/agents/talent-discovery',
          applicationScreening: 'POST /api/agents/application-screening',
          auditionScheduling: 'POST /api/agents/audition-scheduling',
          communication: 'POST /api/agents/communication',
          decisionSupport: 'POST /api/agents/decision-support',
          budgetOptimization: 'POST /api/agents/budget-optimization'
        },
        demo: {
          workflow: 'GET /api/demo/complete-workflow'
        }
      },
      documentation: 'https://docs.castmatch.ai/ai-agents'
    });
  });
};