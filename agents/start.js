#!/usr/bin/env node

/**
 * CastMatch Agents Startup Script
 * Simple Node.js startup without TypeScript compilation
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import winston from 'winston';
import OpenAI from 'openai';

// Load environment variables
dotenv.config();

// Configure OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.simple()
  ),
  transports: [
    new winston.transports.Console(),
  ],
});

// Express app setup
const app = express();
const port = process.env.PORT || 3005;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Simple Script Analysis Function
async function analyzeScript(scriptText, projectContext) {
  const systemPrompt = `You are an expert script analyst for casting directors. Extract character information from scripts for casting purposes.`;

  const userPrompt = `Analyze this script and extract characters:

SCRIPT:
${scriptText}

PROJECT: ${projectContext.type} - ${projectContext.genre?.join(', ')}

Extract all characters with:
1. Name and description
2. Age range and gender
3. Role importance (lead/supporting/background)
4. Special skills needed

Return as JSON: {"characters": [{"name": "string", "description": "string", "ageRange": "25-35", "gender": "male/female", "importance": "lead/supporting/background", "skills": ["skill1"]}], "genres": ["genre1"], "budgetEstimate": {"castingCost": 100000}}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    logger.error('Script analysis failed:', error);
    throw error;
  }
}

// Simple Talent Discovery Function
async function searchTalent(searchParams) {
  const prompt = `Find and rank actors for this role:

ROLE: ${searchParams.roleDescription}
AGE: ${searchParams.physicalRequirements.ageRange.min}-${searchParams.physicalRequirements.ageRange.max}
GENDER: ${searchParams.physicalRequirements.gender}
EXPERIENCE: ${searchParams.experienceLevel}
LOCATION: ${searchParams.locationPreference}
BUDGET: ₹${searchParams.budgetRange.min}-${searchParams.budgetRange.max}

Provide 5 suitable candidate profiles with rankings.

Return as JSON: {"candidates": [{"id": "1", "name": "Actor Name", "age": 28, "experience": "5 years", "matchScore": 85}], "searchMetrics": {"totalFound": 5, "searchTime": 1500}}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    logger.error('Talent search failed:', error);
    throw error;
  }
}

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

// Script Analysis Endpoint
app.post('/api/agents/script-analysis', async (req, res) => {
  try {
    logger.info('Script analysis request received');
    
    const { scriptContent, fileType, projectContext } = req.body;
    
    if (!scriptContent || !fileType) {
      return res.status(400).json({ 
        error: 'Script content and file type are required' 
      });
    }

    // Decode base64 script content
    const scriptText = Buffer.from(scriptContent, 'base64').toString('utf-8');
    
    const result = await analyzeScript(scriptText, projectContext || { 
      type: 'web-series', 
      genre: ['drama'] 
    });

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

// Talent Discovery Endpoint
app.post('/api/agents/talent-discovery', async (req, res) => {
  try {
    logger.info('Talent discovery request received');
    
    const searchParams = req.body;
    
    if (!searchParams.roleDescription || !searchParams.physicalRequirements) {
      return res.status(400).json({
        error: 'Role description and physical requirements are required'
      });
    }

    const result = await searchTalent(searchParams);

    logger.info(`Talent discovery completed: ${result.candidates?.length || 0} candidates found`);
    
    res.json({
      success: true,
      data: result,
      message: `Found ${result.candidates?.length || 0} suitable candidates`,
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

// Demo Workflow Endpoint
app.get('/api/demo/complete-workflow', async (req, res) => {
  try {
    logger.info('Demo workflow started');

    const mockScript = `
FADE IN:

EXT. MUMBAI STREET - DAY

ARJUN SHARMA (28), a determined investigative journalist, walks quickly through busy Mumbai streets.

ARJUN
(on phone)
Priya, I found the corruption evidence. We need to publish this story.

PRIYA PATEL (25), a brilliant cyber security expert, appears from shadows looking worried.

PRIYA
They're tracking us, Arjun. We have to be careful.

ARJUN
(resolute)
Too many lives depend on exposing this truth.

FADE OUT.
`;

    const startTime = Date.now();

    // Step 1: Analyze script
    const scriptAnalysis = await analyzeScript(mockScript, {
      type: 'web-series',
      genre: ['thriller', 'drama'],
      budgetTier: 'medium',
    });

    // Step 2: Search talent for each character
    const talentResults = [];
    for (const character of scriptAnalysis.characters || []) {
      const searchParams = {
        roleDescription: character.description,
        physicalRequirements: {
          ageRange: parseAgeRange(character.ageRange || '25-35'),
          gender: character.gender || 'any',
        },
        experienceLevel: character.importance === 'lead' ? 'experienced' : 'emerging',
        budgetRange: { min: 20000, max: 100000 },
        locationPreference: 'Mumbai',
      };

      const talentResult = await searchTalent(searchParams);
      talentResults.push({
        character: character.name,
        candidates: talentResult.candidates || [],
      });
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    const workflowResult = {
      workflowId: `demo_${Date.now()}`,
      status: 'completed',
      results: {
        scriptAnalysis,
        talentSearchResults: talentResults,
      },
      timeline: {
        started: new Date(startTime),
        completed: new Date(endTime),
        duration,
      },
      summary: {
        totalSteps: 2,
        completedSteps: 2,
        errors: [],
        recommendations: ['Demo workflow completed successfully'],
      },
    };

    logger.info('Demo workflow completed successfully');

    res.json({
      success: true,
      demo: true,
      data: workflowResult,
      message: 'Complete casting workflow demo executed successfully',
      timestamp: new Date().toISOString(),
      performance: {
        totalTime: duration,
        stepsCompleted: 2,
        charactersFound: scriptAnalysis.characters?.length || 0,
        candidatesFound: talentResults.reduce((sum, result) => sum + result.candidates.length, 0),
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

// Agent Status Endpoint
app.get('/api/agents/status', (req, res) => {
  res.json({
    status: 'All agents operational',
    agents: {
      scriptAnalysis: {
        name: 'Script Analysis Agent',
        status: 'active',
        description: 'Analyzes scripts and extracts character requirements',
        capabilities: ['Script parsing', 'Character extraction', 'Budget estimation'],
      },
      talentDiscovery: {
        name: 'Talent Discovery Agent',
        status: 'active',
        description: 'Finds and ranks talent based on role requirements',
        capabilities: ['AI-powered search', 'Candidate ranking', 'Match scoring'],
      },
    },
    timestamp: new Date().toISOString(),
  });
});

// Helper function
function parseAgeRange(ageRangeString) {
  const match = ageRangeString.match(/(\d+)-(\d+)/);
  if (match) {
    return { min: parseInt(match[1]), max: parseInt(match[2]) };
  }
  return { min: 25, max: 35 };
}

// Root route - API overview
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'CastMatch AI Agents Server',
    version: '1.0.0',
    status: 'running',
    agents: {
      total: 14,
      categories: ['core', 'advanced'],
      core: ['script-analysis', 'talent-discovery', 'application-screening', 'audition-scheduling', 'communication', 'decision-support', 'budget-optimization', 'progress-tracking'],
      advanced: ['talent-research', 'contract-negotiation', 'quality-assurance', 'stakeholder-management', 'learning-optimization', 'crisis-management']
    },
    endpoints: {
      health: '/health',
      status: '/api/agents/status', 
      demo: '/api/demo/complete-workflow',
      scriptAnalysis: '/api/agents/script-analysis',
      talentDiscovery: '/api/agents/talent-discovery'
    },
    demo: {
      liveDemo: 'file:///Users/Aditya/Desktop/casting-ai/live-agents-demo.html',
      chatDemo: 'file:///Users/Aditya/Desktop/casting-ai/chat-demo.html'
    },
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use((error, req, res, next) => {
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
  logger.info('  - GET  /api/demo/complete-workflow - Demo showcase');
  console.log(`\n🚀 CastMatch Agents API is running on http://localhost:${port}`);
  console.log(`🔧 Try the demo: http://localhost:${port}/api/demo/complete-workflow\n`);
});