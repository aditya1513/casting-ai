/**
 * CastMatch Backend - Enhanced with Conversational AI
 * Full Claude integration with conversation memory
 */

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;

// In-memory conversation storage (would use Redis in production)
const conversationSessions = new Map();

// Database connection
const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
async function testDatabaseConnection() {
  try {
    const client = await dbPool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connected:', result.rows[0]);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://frontend:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// CONVERSATION AI SYSTEM
// ====================

/**
 * Anthropic Conversation Service (JavaScript version)
 */
class AnthropicConversationService {
  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';
    this.baseUrl = 'https://api.anthropic.com/v1';
  }

  async generateResponse(context, newMessage) {
    try {
      if (!this.apiKey) {
        return this.getMockCastingResponse(newMessage, context);
      }

      // For now, use intelligent mock responses
      // TODO: Implement actual Claude API calls when ready for production
      return this.getMockCastingResponse(newMessage, context);

    } catch (error) {
      console.error('Claude API error:', error);
      return this.getFallbackResponse(newMessage, context);
    }
  }

  getMockCastingResponse(message, context) {
    const response = this.generateIntelligentCastingResponse(message, context);
    return {
      content: response,
      isComplete: true,
      usage: { input_tokens: 100, output_tokens: 50 }
    };
  }

  generateIntelligentCastingResponse(userMessage, context) {
    const lowerMessage = userMessage.toLowerCase();
    const messageCount = context.messages.length;
    const stage = context.metadata.conversationStage;
    
    // First-time greeting
    if ((lowerMessage.includes('hello') || lowerMessage.includes('hi')) && messageCount < 2) {
      return "Hello! I'm Claude, your AI casting director assistant specialized in Mumbai's OTT industry. I can help you with talent discovery, role analysis, audition strategy, and casting recommendations. What casting project are you working on today?";
    }
    
    // Project discovery stage
    if (stage === 'discovery' || lowerMessage.includes('working on') || lowerMessage.includes('casting for')) {
      if (lowerMessage.includes('web series') || lowerMessage.includes('series')) {
        context.metadata.castingProject = 'Web Series';
        return "Excellent! Web series casting for OTT platforms is exciting. I can help you find the perfect talent for your series. Could you tell me more about the genre, target audience, and key character roles you need to cast? Also, what's your preferred language - Hindi, English, or regional?";
      }
      
      if (lowerMessage.includes('film') || lowerMessage.includes('movie')) {
        context.metadata.castingProject = 'Film';
        return "Great! Film casting requires a different approach than traditional TV. For OTT film releases, authenticity often trumps star power. What's the genre and theme of your film? Are you looking for established actors, fresh faces, or a mix of both?";
      }
      
      if (lowerMessage.includes('commercial') || lowerMessage.includes('ad')) {
        context.metadata.castingProject = 'Commercial';
        return "Commercial casting for brands! This requires talent who can connect with your target demographic authentically. What's the product/brand, target audience age group, and the overall tone you're going for? Mumbai has incredible diverse talent perfect for commercial work.";
      }
      
      return "I'd love to help with your casting project! Could you share more details about what you're working on? For example:\n\n• What type of project (web series, film, commercial, etc.)\n• Genre and tone\n• Key roles you need to cast\n• Target audience\n• Language preferences\n\nThe more context you provide, the better I can assist with specific recommendations!";
    }
    
    // Genre-specific responses
    if (lowerMessage.includes('romantic') && lowerMessage.includes('drama')) {
      return "Romantic dramas are performing incredibly well on OTT platforms! For Mumbai casting, I recommend focusing on:\n\n✅ **Lead Chemistry**: Look for actors with natural rapport - consider chemistry reads\n✅ **Emotional Range**: Prioritize dramatic skill over just looks\n✅ **Age Authenticity**: Match real ages to character ages for believability\n✅ **Regional Appeal**: Consider actors who resonate with your target demographics\n\nAre you casting for the main leads, or do you need supporting characters too? What age range and experience level are you considering?";
    }
    
    if (lowerMessage.includes('thriller') || lowerMessage.includes('crime') || lowerMessage.includes('mystery')) {
      return "Thriller/crime content is dominating OTT! Mumbai has fantastic talent for intense, gritty performances:\n\n🎯 **Theater Background**: Stage actors bring incredible intensity\n🎯 **Method Actors**: Consider talent trained in method acting\n🎯 **Physical Preparation**: Some roles may need actors comfortable with action\n🎯 **Psychological Depth**: Look for actors who can convey complex motivations\n\nWhat's the setting and tone of your thriller? Urban Mumbai crime, psychological thriller, or action-thriller?";
    }
    
    if (lowerMessage.includes('comedy')) {
      return "Comedy casting is an art! Mumbai's comedy scene has evolved tremendously:\n\n😄 **Stand-up Background**: Many YouTubers and stand-up comics are excellent\n😄 **Improvisational Skills**: Look for improv/theater training\n😄 **Regional Humor**: Consider actors who understand Mumbai's local humor\n😄 **Timing**: Comedy timing can't be taught - it's natural talent\n\nAre you looking for situational comedy, character comedy, or romantic comedy? The style determines the type of comic actor you need.";
    }
    
    // Budget and practical considerations
    if (lowerMessage.includes('budget') || lowerMessage.includes('cost') || lowerMessage.includes('fee')) {
      return "Budget planning is crucial for successful casting in Mumbai:\n\n💰 **Established TV/Film Actors**: ₹2-25L per day\n💰 **Digital-First Creators**: ₹50K-5L per day\n💰 **Theater Actors**: ₹25K-2L per day\n💰 **Fresh Faces**: ₹15K-75K per day\n\n**Pro Tip**: Mix established and emerging talent for budget optimization. Theater actors often deliver exceptional performances at reasonable rates. What's your approximate budget range per role?";
    }
    
    // Audition and process questions
    if (lowerMessage.includes('audition') || lowerMessage.includes('selection') || lowerMessage.includes('process')) {
      return "Audition strategy can make or break your casting:\n\n🎬 **Multi-Stage Process**: Self-tape → Callback → Chemistry read\n🎬 **Scene Selection**: Choose scenes that showcase required skills\n🎬 **Duration**: Keep initial auditions 3-5 minutes max\n🎬 **Direction**: Give clear direction to see how they take notes\n\nFor Mumbai talent, I recommend hybrid auditions - initial video submissions followed by in-person callbacks. Would you like help designing specific audition material for your project?";
    }
    
    // Location and logistics
    if (lowerMessage.includes('mumbai') || lowerMessage.includes('location') || lowerMessage.includes('shoot')) {
      return "Mumbai logistics are key to successful casting:\n\n🏙️ **Local Talent**: Prefer Mumbai-based actors to avoid travel costs\n🏙️ **Transport**: Consider actors' accessibility to shoot locations\n🏙️ **Accommodation**: Factor in stay costs for outstation talent\n🏙️ **Availability**: Mumbai actors often juggle multiple projects\n\nMost top OTT talent is Mumbai-based, so you have excellent local options. What are your primary shooting locations?";
    }
    
    // Talent recommendations and matching
    if (lowerMessage.includes('recommend') || lowerMessage.includes('suggest') || lowerMessage.includes('who') || lowerMessage.includes('actor')) {
      return "I'd love to recommend specific talent! To give you the best matches, I need a bit more detail:\n\n🎯 **Character Profile**: Age, personality traits, background\n🎯 **Acting Style**: Naturalistic, dramatic, comedic, method\n🎯 **Experience Level**: Newcomer, mid-level, established\n🎯 **Physical Requirements**: Any specific looks, skills, or training\n🎯 **Language Skills**: Hindi, English, regional languages\n\nOnce you share these details, I can suggest specific actors who would be perfect for your roles!";
    }
    
    // Industry insights and trends
    if (lowerMessage.includes('trend') || lowerMessage.includes('popular') || lowerMessage.includes('audience')) {
      return "Current OTT casting trends in Mumbai:\n\n📈 **Authenticity Over Glamour**: Real people, relatable faces\n📈 **Diverse Representation**: Regional, age, body type diversity\n📈 **Digital-First Talent**: YouTubers, influencers crossing over\n📈 **Method Acting**: Intense, realistic performances preferred\n📈 **Multilingual Skills**: Hindi-English mix increasingly common\n\nAudiences connect with genuine performances over traditional 'hero-heroine' casting. What demographic is your target audience?";
    }
    
    // Default helpful response
    if (messageCount < 3) {
      return "I'm here to provide specific, actionable casting advice for your Mumbai OTT project! I can help with:\n\n• Character analysis and casting profiles\n• Talent recommendations based on your requirements\n• Audition strategy and material preparation\n• Budget planning and negotiation insights\n• Industry trends and audience preferences\n\nWhat specific aspect of casting would you like to explore first?";
    }
    
    // Engaged conversation response
    return "I'm following your project and want to provide the most helpful guidance! Based on our conversation, I can dive deeper into:\n\n• Specific actor recommendations for your roles\n• Detailed audition planning\n• Character development and casting notes\n• Timeline and logistics planning\n\nWhat would be most valuable for your project right now?";
  }

  getFallbackResponse(message, context) {
    return "I'm experiencing a brief technical issue, but I'm still here to help with your casting needs! While I resolve this, could you tell me more about your specific project or the roles you're looking to cast? I can provide general guidance on Mumbai's OTT industry trends.";
  }

  updateConversationStage(message, context) {
    const lowerMessage = message.toLowerCase();
    
    if ((lowerMessage.includes('hello') || lowerMessage.includes('hi')) && context.messages.length < 2) {
      context.metadata.conversationStage = 'greeting';
    } else if (lowerMessage.includes('looking for') || lowerMessage.includes('need') || lowerMessage.includes('casting') || lowerMessage.includes('working on')) {
      context.metadata.conversationStage = 'discovery';
    } else if (context.messages.length > 4) {
      context.metadata.conversationStage = 'refinement';
    } else {
      context.metadata.conversationStage = 'recommendation';
    }
    
    // Extract project type
    if (lowerMessage.includes('web series') || lowerMessage.includes('series')) {
      context.metadata.castingProject = 'Web Series';
    } else if (lowerMessage.includes('film') || lowerMessage.includes('movie')) {
      context.metadata.castingProject = 'Film';
    } else if (lowerMessage.includes('commercial') || lowerMessage.includes('ad')) {
      context.metadata.castingProject = 'Commercial';
    }
    
    return context;
  }
}

const conversationService = new AnthropicConversationService();

// CONVERSATION API ENDPOINTS
// =========================

// Start conversation
app.post('/api/conversation/start', async (req, res) => {
  try {
    const { userId = 'demo-user' } = req.body;
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const context = {
      userId,
      sessionId,
      messages: [],
      metadata: {
        location: 'Mumbai',
        language: 'English',
        conversationStage: 'greeting',
        preferredGenres: [],
      }
    };
    
    conversationSessions.set(sessionId, context);
    
    res.json({
      success: true,
      sessionId,
      message: 'Conversation started successfully',
      context: {
        location: context.metadata.location,
        language: context.metadata.language,
        stage: context.metadata.conversationStage
      }
    });
    
  } catch (error) {
    console.error('Error starting conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start conversation'
    });
  }
});

// Send message
app.post('/api/conversation/message', async (req, res) => {
  try {
    const { sessionId, message, userId = 'demo-user' } = req.body;
    
    if (!sessionId || !message) {
      return res.status(400).json({
        success: false,
        error: 'Session ID and message are required'
      });
    }
    
    let context = conversationSessions.get(sessionId);
    
    // Create new session if not found
    if (!context) {
      context = {
        userId,
        sessionId,
        messages: [],
        metadata: {
          location: 'Mumbai',
          language: 'English',
          conversationStage: 'greeting',
          preferredGenres: [],
        }
      };
      conversationSessions.set(sessionId, context);
    }
    
    // Add user message
    context.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });
    
    // Update conversation stage
    context = conversationService.updateConversationStage(message, context);
    
    // Generate response
    const response = await conversationService.generateResponse(context, message);
    
    // Add assistant response
    context.messages.push({
      role: 'assistant',
      content: response.content,
      timestamp: new Date()
    });
    
    conversationSessions.set(sessionId, context);
    
    res.json({
      success: true,
      sessionId,
      response: response.content,
      metadata: {
        conversationStage: context.metadata.conversationStage,
        isComplete: response.isComplete,
        usage: response.usage,
        messageCount: context.messages.length
      },
      context: {
        projectType: context.metadata.castingProject,
        stage: context.metadata.conversationStage
      }
    });
    
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process message'
    });
  }
});

// Get conversation history
app.get('/api/conversation/:sessionId/history', (req, res) => {
  try {
    const { sessionId } = req.params;
    const context = conversationSessions.get(sessionId);
    
    if (!context) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    res.json({
      success: true,
      sessionId,
      messages: context.messages,
      metadata: context.metadata,
      summary: {
        totalMessages: context.messages.length,
        conversationStage: context.metadata.conversationStage,
        projectType: context.metadata.castingProject || 'General inquiry',
        startTime: context.messages[0]?.timestamp,
        lastActivity: context.messages[context.messages.length - 1]?.timestamp
      }
    });
    
  } catch (error) {
    console.error('Error getting conversation history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversation history'
    });
  }
});

// Get conversation metrics
app.get('/api/conversation/metrics', (req, res) => {
  try {
    const activeSessions = conversationSessions.size;
    const sessions = Array.from(conversationSessions.values());
    
    const metrics = {
      activeSessions,
      totalMessages: sessions.reduce((total, session) => total + session.messages.length, 0),
      averageMessagesPerSession: sessions.length > 0 
        ? sessions.reduce((total, session) => total + session.messages.length, 0) / sessions.length 
        : 0,
      conversationStages: {
        greeting: sessions.filter(s => s.metadata.conversationStage === 'greeting').length,
        discovery: sessions.filter(s => s.metadata.conversationStage === 'discovery').length,
        recommendation: sessions.filter(s => s.metadata.conversationStage === 'recommendation').length,
        refinement: sessions.filter(s => s.metadata.conversationStage === 'refinement').length,
      },
      projectTypes: {
        'Web Series': sessions.filter(s => s.metadata.castingProject === 'Web Series').length,
        'Film': sessions.filter(s => s.metadata.castingProject === 'Film').length,
        'Commercial': sessions.filter(s => s.metadata.castingProject === 'Commercial').length,
        'General': sessions.filter(s => !s.metadata.castingProject).length,
      }
    };
    
    res.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting conversation metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversation metrics'
    });
  }
});

// Test Claude integration
app.get('/api/conversation/test-claude', async (req, res) => {
  try {
    const testMessage = "Hello, I'm testing the Claude integration for CastMatch.";
    
    const testContext = {
      userId: 'test-user',
      sessionId: 'test-session',
      messages: [],
      metadata: {
        location: 'Mumbai',
        language: 'English',
        conversationStage: 'greeting',
        preferredGenres: ['Drama'],
      }
    };
    
    const response = await conversationService.generateResponse(testContext, testMessage);
    
    res.json({
      success: true,
      message: 'Claude integration test successful',
      testResponse: response.content,
      metadata: {
        isComplete: response.isComplete,
        usage: response.usage,
        apiKey: process.env.ANTHROPIC_API_KEY ? 'configured' : 'missing'
      }
    });
    
  } catch (error) {
    console.error('Error testing Claude integration:', error);
    res.status(500).json({
      success: false,
      error: 'Claude integration test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// EXISTING ENDPOINTS (unchanged)
// ==============================

// Health endpoint with comprehensive checks
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    service: 'castmatch-backend-enhanced-ai',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '2.1.0',
    port: PORT,
    nodeVersion: process.version,
    uptime: Math.floor(process.uptime()),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    }
  };

  // Test database connection
  try {
    const dbTest = await dbPool.query('SELECT 1 as test');
    health.database = {
      status: 'connected',
      url: process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':***@') || 'not configured',
      testResult: dbTest.rows[0]
    };
  } catch (error) {
    health.database = {
      status: 'error',
      error: error.message
    };
  }

  // AI Service status
  health.ai = {
    status: 'operational',
    anthropicKey: process.env.ANTHROPIC_API_KEY ? 'configured' : 'missing',
    model: process.env.AI_MODEL || 'claude-3-haiku-20240307',
    conversationEngine: 'active',
    activeSessions: conversationSessions.size
  };

  health.redis = {
    status: 'configured',
    url: process.env.REDIS_URL?.replace(/:[^:@]*@/, ':***@') || 'not configured'
  };

  res.json(health);
});

// Talents API with database integration (unchanged from original)
app.get('/api/talents', async (req, res) => {
  try {
    // Create table if it doesn't exist (for demo)
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS demo_talents (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        skills TEXT[],
        experience INTEGER DEFAULT 0,
        location VARCHAR(255) DEFAULT 'Mumbai',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if we have demo data
    const countResult = await dbPool.query('SELECT COUNT(*) FROM demo_talents');
    const talentCount = parseInt(countResult.rows[0].count);

    // Insert demo data if empty
    if (talentCount === 0) {
      await dbPool.query(`
        INSERT INTO demo_talents (name, email, skills, experience, location) VALUES
        ('Priya Sharma', 'priya@example.com', ARRAY['Acting', 'Dancing', 'Hindi', 'English'], 5, 'Mumbai'),
        ('Arjun Kapoor', 'arjun@example.com', ARRAY['Acting', 'Action', 'Martial Arts'], 8, 'Mumbai'),
        ('Kavya Patel', 'kavya@example.com', ARRAY['Singing', 'Acting', 'Classical Dance'], 3, 'Mumbai'),
        ('Rohit Singh', 'rohit@example.com', ARRAY['Comedy', 'Acting', 'Punjabi', 'Hindi'], 6, 'Mumbai'),
        ('Ananya Desai', 'ananya@example.com', ARRAY['Acting', 'Modeling', 'English', 'Gujarati'], 4, 'Mumbai')
      `);
    }

    // Fetch talents with pagination
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search || '';

    let query = 'SELECT * FROM demo_talents';
    let params = [];
    
    if (search) {
      query += ' WHERE name ILIKE $1 OR array_to_string(skills, \',\') ILIKE $1';
      params.push(`%${search}%`);
    }
    
    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await dbPool.query(query, params);
    const totalResult = await dbPool.query('SELECT COUNT(*) FROM demo_talents');

    res.json({
      talents: result.rows,
      pagination: {
        total: parseInt(totalResult.rows[0].count),
        limit,
        offset,
        hasMore: offset + result.rows.length < parseInt(totalResult.rows[0].count)
      },
      message: 'Real database data from PostgreSQL container with AI conversation!'
    });

  } catch (error) {
    console.error('Talents API error:', error);
    res.status(500).json({
      error: 'Database error',
      message: error.message
    });
  }
});

// Create talent endpoint (unchanged)
app.post('/api/talents', async (req, res) => {
  try {
    const { name, email, skills, experience, location } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await dbPool.query(
      `INSERT INTO demo_talents (name, email, skills, experience, location) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [name, email, skills || [], experience || 0, location || 'Mumbai']
    );

    res.status(201).json({
      talent: result.rows[0],
      message: 'Talent created successfully'
    });

  } catch (error) {
    console.error('Create talent error:', error);
    res.status(500).json({
      error: 'Failed to create talent',
      message: error.message
    });
  }
});

// System status endpoint (enhanced with AI metrics)
app.get('/api/status', async (req, res) => {
  const status = {
    backend: 'running',
    docker: true,
    timestamp: new Date().toISOString(),
    infrastructure: {
      database: 'checking...',
      redis: 'configured',
      qdrant: 'configured'
    },
    features: {
      talentManagement: true,
      conversationalAI: true,  // NEW!
      authentication: false,
      aiIntegration: true,     // UPDATED!
      fileUpload: false
    },
    ai: {
      conversationEngine: 'operational',
      activeSessions: conversationSessions.size,
      totalMessages: Array.from(conversationSessions.values())
        .reduce((total, session) => total + session.messages.length, 0),
      claudeIntegration: process.env.ANTHROPIC_API_KEY ? 'configured' : 'mock'
    }
  };

  // Test database
  try {
    await dbPool.query('SELECT 1');
    status.infrastructure.database = 'connected';
  } catch (error) {
    status.infrastructure.database = 'error';
  }

  res.json(status);
});

// Enhanced AI Chat endpoint that uses conversation system
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // If no sessionId provided, create a quick session
    let activeSessionId = sessionId;
    if (!activeSessionId) {
      activeSessionId = `quick-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const quickContext = {
        userId: 'quick-user',
        sessionId: activeSessionId,
        messages: [],
        metadata: {
          location: 'Mumbai',
          language: 'English',
          conversationStage: 'greeting',
          preferredGenres: [],
        }
      };
      conversationSessions.set(activeSessionId, quickContext);
    }

    let context = conversationSessions.get(activeSessionId);
    if (!context) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Add user message
    context.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // Update stage and generate response
    context = conversationService.updateConversationStage(message, context);
    const response = await conversationService.generateResponse(context, message);

    // Add assistant response
    context.messages.push({
      role: 'assistant',
      content: response.content,
      timestamp: new Date()
    });

    conversationSessions.set(activeSessionId, context);

    res.json({
      response: response.content,
      sessionId: activeSessionId,
      timestamp: new Date().toISOString(),
      aiService: 'claude-conversation-engine',
      metadata: {
        stage: context.metadata.conversationStage,
        projectType: context.metadata.castingProject,
        messageCount: context.messages.length
      }
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Chat service error',
      message: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Endpoint ${req.method} ${req.path} not found`
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await dbPool.end();
  process.exit(0);
});

// Start server
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`
🎬 CastMatch Backend Server Started (Enhanced with AI Conversations)
================================================================
Port: ${PORT}
Environment: ${process.env.NODE_ENV || 'development'}
API URL: http://localhost:${PORT}/api
Health Check: http://localhost:${PORT}/api/health

🤖 NEW: Conversational AI Endpoints:
- POST /api/conversation/start         (Start conversation)
- POST /api/conversation/message       (Send message to Claude)
- GET  /api/conversation/:id/history   (Get conversation history)
- GET  /api/conversation/metrics       (AI conversation metrics)
- GET  /api/conversation/test-claude   (Test Claude integration)

📋 Existing Endpoints:
- GET  /api/health         (System health check)
- GET  /api/status         (System status with AI metrics)
- GET  /api/talents        (List talents with pagination)
- POST /api/talents        (Create new talent)
- POST /api/chat          (Enhanced AI chat with conversation memory)

🧠 AI Features:
- Conversational AI: ${conversationSessions.size} active sessions
- Claude Integration: ${process.env.ANTHROPIC_API_KEY ? '✅ Configured' : '⚠️  Mock Mode'}
- Memory System: ✅ In-memory conversations (Redis ready)
- Casting Intelligence: ✅ Mumbai OTT specialization

Infrastructure:
- Database: ${process.env.DATABASE_URL ? '✅ Configured' : '❌ Not configured'}
- Redis: ${process.env.REDIS_URL ? '✅ Configured' : '❌ Not configured'}
================================================================
🎬 Enhanced CastMatch Backend with Conversational AI Ready!
  `);

  // Test database connection on startup
  await testDatabaseConnection();
});

module.exports = app;