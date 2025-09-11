/**
 * Simple AI Agents Server - Node.js Compatible
 * Basic AI service for CastMatch with OpenAI and Anthropic integration
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { OpenAI } = require('openai');

// Load environment variables
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;

// Initialize OpenAI (skip Anthropic for now to avoid SDK issues)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001').split(',').map(o => o.trim()),
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      qdrant: !!process.env.QDRANT_URL,
      database: !!process.env.DATABASE_URL
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    features: {
      scriptAnalysis: true,
      talentDiscovery: true,
      smartChat: true,
      vectorSearch: false // Simplified for now
    }
  });
});

// Script analysis endpoint
app.post('/api/agents/script-analysis', async (req, res) => {
  try {
    const { script, analysisType = 'character_breakdown' } = req.body;

    if (!script) {
      return res.status(400).json({
        success: false,
        error: 'Script content is required'
      });
    }

    const prompt = `Analyze this script for casting purposes. Focus on character breakdown, required skills, and casting requirements:

${script}

Please provide:
1. Main characters with descriptions
2. Required acting skills/experience
3. Age ranges and characteristics
4. Special requirements (accents, physical traits, etc.)
5. Estimated shooting timeline

Format as JSON with structured data.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.7,
    });

    res.json({
      success: true,
      data: {
        analysis: completion.choices[0].message.content,
        analysisType,
        timestamp: new Date().toISOString(),
        tokens_used: completion.usage?.total_tokens || 0
      }
    });

  } catch (error) {
    console.error('Script analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze script',
      message: error.message
    });
  }
});

// Talent discovery endpoint
app.post('/api/agents/talent-discovery', async (req, res) => {
  try {
    const { requirements, budget, location } = req.body;

    if (!requirements) {
      return res.status(400).json({
        success: false,
        error: 'Talent requirements are required'
      });
    }

    const prompt = `Based on these casting requirements, suggest talent search strategies and criteria:

Requirements: ${JSON.stringify(requirements)}
Budget: ${budget || 'Not specified'}
Location: ${location || 'Not specified'}

Provide:
1. Search keywords and criteria
2. Recommended talent databases/platforms
3. Experience level recommendations
4. Budget considerations
5. Geographic considerations

Format as structured recommendations.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
      temperature: 0.7,
    });

    res.json({
      success: true,
      data: {
        recommendations: completion.choices[0].message.content,
        requirements,
        timestamp: new Date().toISOString(),
        tokens_used: completion.usage?.total_tokens || 0
      }
    });

  } catch (error) {
    console.error('Talent discovery error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate talent discovery recommendations',
      message: error.message
    });
  }
});

// Smart chat endpoint
app.post('/api/agents/chat', async (req, res) => {
  try {
    const { message, context = {} } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    const systemPrompt = `You are an AI casting assistant for CastMatch. You help with casting decisions, talent recommendations, and production planning. Be professional, knowledgeable, and helpful.

Context: ${JSON.stringify(context)}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 1000,
      temperature: 0.8,
    });

    res.json({
      success: true,
      data: {
        response: completion.choices[0].message.content,
        timestamp: new Date().toISOString(),
        tokens_used: completion.usage?.total_tokens || 0
      }
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process chat message',
      message: error.message
    });
  }
});

// Status endpoint
app.get('/api/agents/status', (req, res) => {
  res.json({
    success: true,
    status: 'operational',
    services: {
      openai: !!process.env.OPENAI_API_KEY,
      server: 'running'
    },
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /health',
      'GET /api/agents/status',
      'POST /api/agents/script-analysis',
      'POST /api/agents/talent-discovery',
      'POST /api/agents/chat'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(port, () => {
  console.log(`
🤖 CastMatch AI Agents Server is LIVE! 🤖

🔗 Server: http://localhost:${port}
📊 Health: http://localhost:${port}/health
🎯 API: http://localhost:${port}/api/agents/

✨ Features Available:
  • Script Analysis: ✅
  • Talent Discovery: ✅
  • Smart Chat: ✅
  • Health Monitoring: ✅

🚀 Ready to power CastMatch with AI!
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});
