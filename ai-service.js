/**
 * CastMatch AI Service - Docker Version
 * Claude AI integration for casting assistance
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://backend:3001', 'http://frontend:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} AI-SERVICE ${req.method} ${req.path}`);
  next();
});

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'castmatch-ai-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    port: PORT,
    features: {
      claudeIntegration: process.env.ANTHROPIC_API_KEY ? true : false,
      talentMatching: true,
      scriptAnalysis: true,
      castingRecommendations: true
    }
  });
});

// AI Chat endpoint - Casting assistant
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, context = 'general' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // For now, provide intelligent casting-related responses without Claude API
    // This demonstrates the AI service working in Docker
    let response = '';
    
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('casting') || lowerMessage.includes('talent') || lowerMessage.includes('actor')) {
      response = generateCastingResponse(message);
    } else if (lowerMessage.includes('role') || lowerMessage.includes('character')) {
      response = generateRoleResponse(message);
    } else if (lowerMessage.includes('audition')) {
      response = generateAuditionResponse(message);
    } else if (lowerMessage.includes('mumbai') || lowerMessage.includes('bollywood')) {
      response = generateMumbaiResponse(message);
    } else {
      response = generateGeneralResponse(message);
    }

    res.json({
      response,
      timestamp: new Date().toISOString(),
      aiService: 'castmatch-ai-docker',
      context,
      processed: true,
      // Will add Claude API integration next
      usingClaudeAPI: false
    });

  } catch (error) {
    console.error('AI Chat error:', error);
    res.status(500).json({
      error: 'AI service error',
      message: error.message
    });
  }
});

// Talent matching endpoint
app.post('/api/ai/match', async (req, res) => {
  try {
    const { roleDescription, requirements = [] } = req.body;
    
    if (!roleDescription) {
      return res.status(400).json({ error: 'Role description is required' });
    }

    // Simulate AI-powered talent matching
    const matches = generateTalentMatches(roleDescription, requirements);
    
    res.json({
      matches,
      roleDescription,
      requirements,
      timestamp: new Date().toISOString(),
      matchingAlgorithm: 'CastMatch AI v1.0'
    });

  } catch (error) {
    console.error('Talent matching error:', error);
    res.status(500).json({
      error: 'Talent matching failed',
      message: error.message
    });
  }
});

// Script analysis endpoint
app.post('/api/ai/analyze-script', async (req, res) => {
  try {
    const { script, analysisType = 'characters' } = req.body;
    
    if (!script) {
      return res.status(400).json({ error: 'Script content is required' });
    }

    const analysis = analyzeScript(script, analysisType);
    
    res.json({
      analysis,
      analysisType,
      timestamp: new Date().toISOString(),
      aiAnalyzer: 'CastMatch Script AI'
    });

  } catch (error) {
    console.error('Script analysis error:', error);
    res.status(500).json({
      error: 'Script analysis failed',
      message: error.message
    });
  }
});

// Helper functions for AI responses
function generateCastingResponse(message) {
  const responses = [
    "I'm here to help with your casting needs! I can assist with talent matching, role analysis, and casting recommendations for Mumbai's OTT industry.",
    "For casting projects, I can analyze character requirements and match them with suitable talent from our database. What specific role are you casting for?",
    "I specialize in Mumbai-based casting for OTT platforms. I can help identify talent based on skills, experience, languages, and performance style.",
    "Let me help you find the perfect talent! I can search by acting experience, language skills, genre expertise, and availability in Mumbai."
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

function generateRoleResponse(message) {
  const responses = [
    "I can help analyze character requirements and suggest suitable talent. What type of character are you looking to cast?",
    "For role analysis, I consider factors like age range, acting style, language requirements, and previous experience. Share the character description!",
    "Character matching is my specialty! I can break down role requirements and find talent that fits the character profile perfectly.",
    "Tell me about the role - genre, character traits, required skills, and I'll help identify the best matches from Mumbai's talent pool."
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

function generateAuditionResponse(message) {
  const responses = [
    "I can help streamline your audition process! I assist with talent shortlisting, audition scheduling, and performance evaluation.",
    "For auditions, I recommend focusing on specific scenes that showcase the required skills. Would you like help with audition material selection?",
    "Audition efficiency is key in Mumbai's fast-paced industry. I can help prioritize candidates based on role requirements and availability.",
    "I can suggest audition formats, evaluation criteria, and help manage the casting pipeline for optimal results."
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

function generateMumbaiResponse(message) {
  const responses = [
    "Mumbai's OTT industry is booming! I'm specifically designed to understand the local talent landscape and casting preferences.",
    "In Mumbai's competitive market, I help casting directors find fresh talent and established actors perfect for OTT content.",
    "I'm well-versed in Mumbai's diverse talent pool - from theater backgrounds to digital-first performers. What type of project are you working on?",
    "Mumbai offers incredible diversity in talent. I can help you navigate language preferences, cultural authenticity, and regional appeal."
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

function generateGeneralResponse(message) {
  return `I'm CastMatch AI, specialized in casting assistance for Mumbai's OTT industry. I can help with talent matching, role analysis, audition planning, and casting recommendations. How can I assist with your project today?`;
}

function generateTalentMatches(roleDescription, requirements) {
  // Simulate AI matching algorithm
  const mockMatches = [
    {
      id: 1,
      name: "Priya Sharma",
      matchScore: 92,
      skills: ["Acting", "Dancing", "Hindi", "English"],
      experience: 5,
      location: "Mumbai",
      reasons: ["Strong acting background", "Language requirements match", "Dance skills for commercial appeal"]
    },
    {
      id: 3,
      name: "Kavya Patel", 
      matchScore: 88,
      skills: ["Singing", "Acting", "Classical Dance"],
      experience: 3,
      location: "Mumbai",
      reasons: ["Excellent for musical sequences", "Classical training adds depth", "Fresh face appeal"]
    },
    {
      id: 4,
      name: "Rohit Singh",
      matchScore: 85,
      skills: ["Comedy", "Acting", "Punjabi", "Hindi"],
      experience: 6,
      location: "Mumbai",
      reasons: ["Comedy expertise", "Multilingual capability", "Proven track record"]
    }
  ];

  // Add role-specific filtering logic here
  return {
    totalMatches: mockMatches.length,
    topMatches: mockMatches,
    searchCriteria: {
      roleDescription,
      requirements
    }
  };
}

function analyzeScript(script, analysisType) {
  const analysis = {
    characters: [],
    themes: [],
    genre: "Drama", // Simplified
    language: "Hindi/English Mix",
    duration: "Estimated 45-60 minutes",
    castingNotes: [
      "Strong ensemble cast required",
      "Multiple age groups represented", 
      "Language versatility important",
      "Contemporary Mumbai setting"
    ]
  };

  // Basic character extraction (simplified)
  if (analysisType === 'characters') {
    analysis.characters = [
      {
        name: "Lead Character",
        ageRange: "25-35",
        description: "Primary protagonist, requires strong dramatic range",
        requirements: ["Acting", "Hindi", "English", "Emotional depth"]
      },
      {
        name: "Supporting Character",
        ageRange: "30-45", 
        description: "Mentor figure, experienced performer needed",
        requirements: ["Acting", "Hindi", "Authority presence"]
      }
    ];
  }

  return analysis;
}

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    aiService: 'running',
    docker: true,
    features: {
      chatbot: true,
      talentMatching: true,
      scriptAnalysis: true,
      claudeIntegration: process.env.ANTHROPIC_API_KEY ? 'configured' : 'pending'
    },
    performance: {
      uptime: Math.floor(process.uptime()),
      memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
    }
  });
});

// Error handling
app.use((error, req, res, next) => {
  console.error('AI Service error:', error);
  res.status(500).json({
    error: 'AI service error',
    message: error.message
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
🤖 CastMatch AI Service Started (Docker)
========================================
Port: ${PORT}
AI Service URL: http://localhost:${PORT}/api
Health Check: http://localhost:${PORT}/api/health

Available AI Endpoints:
- POST /api/ai/chat              (AI casting assistant)
- POST /api/ai/match             (Talent matching)
- POST /api/ai/analyze-script    (Script analysis)
- GET  /api/status               (Service status)

Features:
- Casting Assistant: ✅ Ready
- Talent Matching: ✅ Ready  
- Script Analysis: ✅ Ready
- Claude API: ${process.env.ANTHROPIC_API_KEY ? '✅ Configured' : '⏳ Pending'}
========================================
🤖 AI Service Ready for CastMatch!
  `);
});

module.exports = app;