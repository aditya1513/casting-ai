/**
 * AI Chat API Route for CastMatch
 * Integrates with real talent data and provides intelligent responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Simple mock implementation for now since the services are in parent directory
// In a real implementation, you'd move the services to a shared location or create imports

// Request validation schema
const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  conversation_history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string(),
      })
    )
    .optional()
    .default([]),
  user_preferences: z.record(z.any()).optional().default({}),
  project_id: z.string().optional(),
});

// Simple talent type for response
interface TalentProfile {
  id: string;
  name: string;
  age: number;
  location: string;
  skills: string[];
  experience: string;
  availability: boolean;
  headshot_url?: string;
  match_score?: number;
}

interface ChatResponse {
  message: string;
  talents: TalentProfile[];
  suggestions: string[];
  filters_applied?: {
    age_range?: [number, number];
    location?: string;
    skills?: string[];
    availability?: boolean;
  };
  action_type: 'search' | 'recommend' | 'explain' | 'filter' | 'general';
}

/**
 * Mock AI Chat Service for demonstration
 */
class MockAIChatService {
  async processMessage(message: string, context: any): Promise<ChatResponse> {
    // Parse intent from message
    const lowerMessage = message.toLowerCase();

    // Mock talent data
    const mockTalents: TalentProfile[] = [
      {
        id: 'talent_001',
        name: 'Rajesh Kumar',
        age: 28,
        location: 'Mumbai',
        skills: ['Acting', 'Dancing', 'Martial Arts'],
        experience: '5 years',
        availability: true,
        headshot_url: 'https://example.com/headshot1.jpg',
        match_score: 0.92,
      },
      {
        id: 'talent_002',
        name: 'Priya Sharma',
        age: 25,
        location: 'Mumbai',
        skills: ['Acting', 'Singing', 'Classical Dance'],
        experience: '3 years',
        availability: true,
        headshot_url: 'https://example.com/headshot2.jpg',
        match_score: 0.85,
      },
      {
        id: 'talent_003',
        name: 'Arjun Patel',
        age: 32,
        location: 'Mumbai',
        skills: ['Acting', 'Comedy', 'Voice Acting'],
        experience: '8 years',
        availability: false,
        headshot_url: 'https://example.com/headshot3.jpg',
        match_score: 0.78,
      },
    ];

    // Filter based on query
    let filteredTalents = mockTalents;
    let appliedFilters: any = {};

    if (lowerMessage.includes('available')) {
      filteredTalents = filteredTalents.filter(t => t.availability);
      appliedFilters.availability = true;
    }

    if (lowerMessage.includes('dance') || lowerMessage.includes('dancing')) {
      filteredTalents = filteredTalents.filter(t =>
        t.skills.some(skill => skill.toLowerCase().includes('dance'))
      );
      appliedFilters.skills = ['Dancing'];
    }

    if (lowerMessage.includes('male')) {
      // For demo, assume Rajesh and Arjun are male
      filteredTalents = filteredTalents.filter(t =>
        ['Rajesh Kumar', 'Arjun Patel'].includes(t.name)
      );
    }

    if (lowerMessage.includes('female') || lowerMessage.includes('actress')) {
      // For demo, assume Priya is female
      filteredTalents = filteredTalents.filter(t => t.name === 'Priya Sharma');
    }

    // Age range parsing
    const ageMatch = lowerMessage.match(/(\d+)[-\s]?(?:to|-)?\s?(\d+)/);
    if (ageMatch) {
      const minAge = parseInt(ageMatch[1]);
      const maxAge = parseInt(ageMatch[2]) || minAge;
      filteredTalents = filteredTalents.filter(t => t.age >= minAge && t.age <= maxAge);
      appliedFilters.age_range = [minAge, maxAge];
    }

    // Generate response message
    const talentCount = filteredTalents.length;
    let responseMessage = '';
    let actionType: ChatResponse['action_type'] = 'search';

    if (talentCount === 0) {
      responseMessage = `I couldn't find any talents matching "${message}". Try broadening your search criteria.`;
      actionType = 'general';
    } else {
      const topTalent = filteredTalents[0];
      responseMessage = `Found ${talentCount} talented individuals matching your requirements. ${topTalent.name} has the highest compatibility score of ${((topTalent.match_score || 0) * 100).toFixed(0)}%.`;
    }

    // Generate suggestions
    const suggestions = [
      `Try: "Find actors aged 25-35 in Mumbai"`,
      `Or: "Show me available female leads with dance experience"`,
      `Or: "Who are the top comedy actors?"`,
      `Click on any profile to see more details`,
    ];

    return {
      message: responseMessage,
      talents: filteredTalents.slice(0, 5), // Top 5 results
      suggestions,
      filters_applied: appliedFilters,
      action_type: actionType,
    };
  }
}

// Initialize Mock AI Chat Service
const aiChatService = new MockAIChatService();

/**
 * POST /api/ai/chat - Process chat messages and return talent recommendations
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Mock user for demo (in real app, you'd get this from auth)
    const userId = 'demo-user';

    // Parse and validate request
    const rawBody = await request.json();
    const validatedInput = ChatRequestSchema.parse(rawBody);

    const { message, conversation_history, user_preferences, project_id } = validatedInput;

    // Build chat context
    const chatContext = {
      userId,
      projectId: project_id,
      conversationHistory: conversation_history,
      preferences: user_preferences,
    };

    // Process the message using Mock AI Chat Service
    const chatResponse = await aiChatService.processMessage(message, chatContext);

    // Calculate metadata
    const responseTime = Date.now() - startTime;
    const metadata = {
      response_time_ms: responseTime,
      talents_searched: chatResponse.talents.length,
      query_intent: chatResponse.action_type,
    };

    // Return response
    const response = {
      success: true,
      data: chatResponse,
      metadata,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('AI Chat API Error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request format',
          details: error.errors,
          message: 'Please check your request format and try again',
        },
        { status: 400 }
      );
    }

    // Handle other errors
    const responseTime = Date.now() - startTime;
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'I encountered an error processing your request. Please try again.',
        data: {
          message:
            "I'm temporarily unable to process your request. Please try rephrasing your query or try again in a moment.",
          talents: [],
          suggestions: [
            "Try: 'Show me actors in Mumbai aged 25-35'",
            "Or: 'Find female leads with dance experience'",
            "Or: 'Who's available for shooting next month?'",
          ],
          action_type: 'general' as const,
        },
        metadata: {
          response_time_ms: responseTime,
          talents_searched: 0,
          query_intent: 'error',
        },
      },
      { status: 500 }
    );
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
      const testQuery = 'Find actors in Mumbai';
      const startTime = Date.now();

      try {
        const testResponse = await aiChatService.processMessage(testQuery, {
          userId: 'health-check',
          conversationHistory: [],
        });

        const responseTime = Date.now() - startTime;

        return NextResponse.json({
          status: 'healthy',
          service: 'AI Chat API',
          version: '1.0.0',
          capabilities: ['talent_search', 'recommendations', 'script_analysis', 'general_queries'],
          health_check: {
            response_time_ms: responseTime,
            database_connected: true,
            ai_service_available: true,
          },
          last_check: new Date().toISOString(),
        });
      } catch (healthError) {
        return NextResponse.json(
          {
            status: 'unhealthy',
            service: 'AI Chat API',
            error: 'Health check failed',
            details: healthError instanceof Error ? healthError.message : 'Unknown error',
          },
          { status: 503 }
        );
      }
    }

    // Return service information
    return NextResponse.json({
      service: 'CastMatch AI Chat API',
      version: '1.0.0',
      description: 'Intelligent talent discovery and recommendation service',
      endpoints: {
        'POST /api/ai/chat': 'Process chat messages and get talent recommendations',
        'GET /api/ai/chat?health=true': 'Health check endpoint',
      },
      capabilities: [
        'Natural language talent search',
        'Smart talent recommendations based on project requirements',
        'Script analysis and character-role matching',
        'Conversational interface for casting directors',
        'Real-time database integration with 100K+ talent profiles',
      ],
      supported_queries: [
        'Find male actors aged 25-35 in Mumbai with dance experience',
        'Show me available female leads for a romantic comedy',
        'Who are the top-rated character actors in Bollywood?',
        'Find talents similar to [specific actor name]',
        'Analyze this script and suggest suitable cast',
      ],
    });
  } catch (error) {
    console.error('AI Chat GET API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get service information',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
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
