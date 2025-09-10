/**
 * AI Chat API Route for CastMatch
 * Integrates with real talent data and provides intelligent responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { talentCrudService } from '@/src/services/talent-crud.service';
import { AIChatService } from '@/src/services/ai-chat.service';

// Request validation schema
const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  conversation_history: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string()
  })).optional().default([]),
  user_preferences: z.record(z.any()).optional().default({}),
  project_id: z.string().optional()
});

// Response schema
const ChatResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    message: z.string(),
    talents: z.array(z.object({
      id: z.string(),
      name: z.string(),
      age: z.number(),
      location: z.string(),
      skills: z.array(z.string()),
      experience: z.string(),
      availability: z.boolean(),
      headshot_url: z.string().optional(),
      match_score: z.number().min(0).max(1).optional()
    })),
    suggestions: z.array(z.string()),
    filters_applied: z.object({
      age_range: z.tuple([z.number(), z.number()]).optional(),
      location: z.string().optional(),
      skills: z.array(z.string()).optional(),
      availability: z.boolean().optional()
    }).optional(),
    action_type: z.enum(['search', 'recommend', 'explain', 'filter', 'general'])
  }),
  metadata: z.object({
    response_time_ms: z.number(),
    talents_searched: z.number(),
    query_intent: z.string()
  }).optional()
});

// Initialize AI Chat Service
const aiChatService = new AIChatService();

/**
 * POST /api/ai/chat - Process chat messages and return talent recommendations
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get user session
    const session = await getServerSession();
    const userId = session?.user?.email || 'anonymous';

    // Parse and validate request
    const rawBody = await request.json();
    const validatedInput = ChatRequestSchema.parse(rawBody);

    const { message, conversation_history, user_preferences, project_id } = validatedInput;

    // Build chat context
    const chatContext = {
      userId,
      projectId: project_id,
      conversationHistory: conversation_history,
      preferences: user_preferences
    };

    // Process the message using AI Chat Service
    const chatResponse = await aiChatService.processMessage(message, chatContext);

    // Calculate metadata
    const responseTime = Date.now() - startTime;
    const metadata = {
      response_time_ms: responseTime,
      talents_searched: chatResponse.talents.length,
      query_intent: chatResponse.action_type
    };

    // Validate and return response
    const response = {
      success: true,
      data: chatResponse,
      metadata
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('AI Chat API Error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request format',
        details: error.errors,
        message: 'Please check your request format and try again'
      }, { status: 400 });
    }

    // Handle AI service errors
    const responseTime = Date.now() - startTime;
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: 'I encountered an error processing your request. Please try again.',
      data: {
        message: "I'm temporarily unable to process your request. Please try rephrasing your query or try again in a moment.",
        talents: [],
        suggestions: [
          "Try: 'Show me actors in Mumbai aged 25-35'",
          "Or: 'Find female leads with dance experience'",
          "Or: 'Who's available for shooting next month?'"
        ],
        action_type: 'general' as const
      },
      metadata: {
        response_time_ms: responseTime,
        talents_searched: 0,
        query_intent: 'error'
      }
    }, { status: 500 });
  }
}

/**
 * GET /api/ai/chat - Get chat service status and capabilities
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const healthCheck = searchParams.get('health');

    if (healthCheck === 'true') {
      // Perform health check
      const testQuery = "Find actors in Mumbai";
      const startTime = Date.now();
      
      try {
        const testResponse = await aiChatService.processMessage(testQuery, {
          userId: 'health-check',
          conversationHistory: []
        });
        
        const responseTime = Date.now() - startTime;
        
        return NextResponse.json({
          status: 'healthy',
          service: 'AI Chat API',
          version: '1.0.0',
          capabilities: [
            'talent_search',
            'recommendations',
            'script_analysis',
            'general_queries'
          ],
          health_check: {
            response_time_ms: responseTime,
            database_connected: true,
            ai_service_available: true
          },
          last_check: new Date().toISOString()
        });
      } catch (healthError) {
        return NextResponse.json({
          status: 'unhealthy',
          service: 'AI Chat API',
          error: 'Health check failed',
          details: healthError instanceof Error ? healthError.message : 'Unknown error'
        }, { status: 503 });
      }
    }

    // Return service information
    return NextResponse.json({
      service: 'CastMatch AI Chat API',
      version: '1.0.0',
      description: 'Intelligent talent discovery and recommendation service',
      endpoints: {
        'POST /api/ai/chat': 'Process chat messages and get talent recommendations',
        'GET /api/ai/chat?health=true': 'Health check endpoint'
      },
      capabilities: [
        'Natural language talent search',
        'Smart talent recommendations based on project requirements',
        'Script analysis and character-role matching',
        'Conversational interface for casting directors',
        'Real-time database integration with 100K+ talent profiles'
      ],
      supported_queries: [
        "Find male actors aged 25-35 in Mumbai with dance experience",
        "Show me available female leads for a romantic comedy",
        "Who are the top-rated character actors in Bollywood?",
        "Find talents similar to [specific actor name]",
        "Analyze this script and suggest suitable cast"
      ]
    });

  } catch (error) {
    console.error('AI Chat GET API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get service information',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * OPTIONS /api/ai/chat - CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}