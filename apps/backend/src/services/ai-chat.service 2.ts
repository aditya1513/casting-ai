/**
 * AI Chat Service for CastMatch
 * Uses structured outputs and tool calling for reliable responses
 */

import { z } from 'zod';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '../db/drizzle';
import { talents } from '../db/schema';
import { and, gte, lte, ilike, sql, eq } from 'drizzle-orm';
import { TalentSearchService } from './talent.service';
import { MLEngineService } from './ml-engine.service';
import { ScriptAnalysisService } from './script-analysis.service';

// Define structured output schemas using Zod (similar to Pydantic in Python)
const TalentProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number(),
  location: z.string(),
  skills: z.array(z.string()),
  experience: z.string(),
  availability: z.boolean(),
  headshot_url: z.string().optional(),
  match_score: z.number().min(0).max(1).optional()
});

const ChatResponseSchema = z.object({
  message: z.string(),
  talents: z.array(TalentProfileSchema),
  suggestions: z.array(z.string()),
  filters_applied: z.object({
    age_range: z.tuple([z.number(), z.number()]).optional(),
    location: z.string().optional(),
    skills: z.array(z.string()).optional(),
    availability: z.boolean().optional()
  }).optional(),
  action_type: z.enum(['search', 'recommend', 'explain', 'filter', 'general'])
});

export type TalentProfile = z.infer<typeof TalentProfileSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;

interface ChatContext {
  userId: string;
  projectId?: string;
  conversationHistory: Array<{role: string, content: string}>;
  preferences?: Record<string, any>;
}

export class AIChatService {
  private openai: OpenAI;
  private anthropic: Anthropic;
  private talentService: TalentSearchService;
  private mlEngine: MLEngineService;
  private scriptAnalysis: ScriptAnalysisService;
  
  private readonly systemPrompt = `You are CastMatch AI, an intelligent talent discovery assistant for Mumbai's entertainment industry.

Your primary role is to help casting directors, producers, and filmmakers find the perfect talent for their projects.

Key Responsibilities:
1. Search and recommend actors, models, and performers based on specific requirements
2. Analyze project needs and suggest suitable talent
3. Provide insights about talent availability, experience, and skills
4. Help refine search criteria for better matches
5. Explain talent recommendations with clear reasoning

Always:
- Be specific about Mumbai/Bollywood context
- Consider both established and emerging talent
- Provide actionable suggestions
- Structure responses with clear talent recommendations
- Include match scores when relevant
- Suggest alternative search criteria if results are limited

Response Format:
- Always provide a helpful message explaining your findings
- Include relevant talent profiles when searching
- Add suggestions for refining the search or next steps
- Indicate what filters were applied`;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    
    this.talentService = new TalentSearchService();
    this.mlEngine = new MLEngineService();
    this.scriptAnalysis = new ScriptAnalysisService();
  }

  /**
   * Process a chat message and return structured response
   */
  async processMessage(
    message: string, 
    context: ChatContext
  ): Promise<ChatResponse> {
    try {
      // Parse user intent
      const intent = await this.analyzeIntent(message);
      
      // Execute appropriate action based on intent
      let response: ChatResponse;
      
      switch (intent.action) {
        case 'search':
          response = await this.handleTalentSearch(message, intent.parameters, context);
          break;
        case 'recommend':
          response = await this.handleRecommendation(message, intent.parameters, context);
          break;
        case 'analyze':
          response = await this.handleScriptAnalysis(message, intent.parameters, context);
          break;
        default:
          response = await this.handleGeneralQuery(message, context);
      }
      
      // Validate response against schema
      return ChatResponseSchema.parse(response);
      
    } catch (error) {
      console.error('AI Chat Error:', error);
      return {
        message: "I encountered an error processing your request. Please try rephrasing your query.",
        talents: [],
        suggestions: [
          "Try: 'Show me actors in Mumbai aged 25-35'",
          "Or: 'Find female leads with dance experience'",
          "Or: 'Who's available for shooting next month?'"
        ],
        action_type: 'general'
      };
    }
  }

  /**
   * Analyze user intent using AI
   */
  private async analyzeIntent(message: string): Promise<{action: string, parameters: any}> {
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "Analyze the user's message and extract intent for talent search. Return JSON."
        },
        {
          role: "user",
          content: message
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 500
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    
    return {
      action: result.action || 'search',
      parameters: {
        age_range: result.age_range || [18, 65],
        gender: result.gender,
        skills: result.skills || [],
        location: result.location || 'Mumbai',
        availability: result.availability,
        experience_level: result.experience_level
      }
    };
  }

  /**
   * Handle talent search queries
   */
  private async handleTalentSearch(
    message: string,
    parameters: any,
    context: ChatContext
  ): Promise<ChatResponse> {
    // Build where conditions for Drizzle
    const whereConditions = [];
    
    // Age range filter
    if (parameters.age_range) {
      whereConditions.push(
        and(
          gte(talents.age, parameters.age_range[0]),
          lte(talents.age, parameters.age_range[1])
        )
      );
    }
    
    // Location filter
    if (parameters.location) {
      whereConditions.push(
        ilike(talents.location, `%${parameters.location}%`)
      );
    }
    
    // Availability filter
    if (parameters.availability !== undefined) {
      whereConditions.push(
        eq(talents.availability, parameters.availability)
      );
    }
    
    // Skills filter - check if any skills match
    if (parameters.skills?.length) {
      const skillConditions = parameters.skills.map((skill: string) => 
        ilike(talents.skills, `%${skill}%`)
      );
      if (skillConditions.length > 0) {
        whereConditions.push(sql`(${skillConditions.reduce((a, b) => sql`${a} OR ${b}`)})`);
      }
    }
    
    // Search database using parameters
    const searchResults = await db
      .select()
      .from(talents)
      .where(whereConditions.length > 0 ? and(...whereConditions) : sql`1=1`)
      .limit(10);

    // Calculate match scores using ML
    const scoredTalents = await Promise.all(
      searchResults.map(async (talent) => {
        const score = await this.mlEngine.calculateMatchScore(talent, parameters);
        return {
          id: talent.id,
          name: talent.name,
          age: talent.age || 0,
          location: talent.location || 'Mumbai',
          skills: talent.skills ? talent.skills.split(',').map(s => s.trim()) : [],
          experience: talent.experience || 'Not specified',
          availability: talent.availability || false,
          headshot_url: talent.headshot_url || undefined,
          match_score: score
        };
      })
    );

    // Sort by match score
    scoredTalents.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));

    // Generate AI response
    const aiResponse = await this.generateAIResponse(
      message,
      scoredTalents,
      parameters,
      context
    );

    return {
      message: aiResponse.message,
      talents: scoredTalents.slice(0, 5), // Top 5 matches
      suggestions: aiResponse.suggestions,
      filters_applied: {
        age_range: parameters.age_range,
        location: parameters.location,
        skills: parameters.skills,
        availability: parameters.availability
      },
      action_type: 'search'
    };
  }

  /**
   * Handle recommendation queries
   */
  private async handleRecommendation(
    message: string,
    parameters: any,
    context: ChatContext
  ): Promise<ChatResponse> {
    // Use ML engine for smart recommendations
    const recommendations = await this.mlEngine.getRecommendations(
      context.userId,
      parameters
    );

    const talents = recommendations.map(rec => ({
      id: rec.id,
      name: rec.name,
      age: rec.age || 0,
      location: rec.location || 'Mumbai',
      skills: rec.skills ? (Array.isArray(rec.skills) ? rec.skills : rec.skills.split(',').map(s => s.trim())) : [],
      experience: rec.experience || 'Not specified',
      availability: rec.availability || false,
      headshot_url: rec.headshot_url || undefined,
      match_score: rec.score
    }));

    return {
      message: `Based on your preferences and past selections, I recommend these talents for your consideration. They have been selected using our AI matching algorithm.`,
      talents,
      suggestions: [
        "Click on any profile to see more details",
        "Save talents you like for future reference",
        "Request audition tapes directly through the platform"
      ],
      action_type: 'recommend'
    };
  }

  /**
   * Handle script analysis queries
   */
  private async handleScriptAnalysis(
    message: string,
    parameters: any,
    context: ChatContext
  ): Promise<ChatResponse> {
    const analysis = await this.scriptAnalysis.analyzeRequirements(parameters.script_text);
    
    // Find matching talents for each character
    const characterMatches = await Promise.all(
      analysis.characters.map(async (character) => {
        const matches = await this.handleTalentSearch(
          `Find ${character.description}`,
          character.requirements,
          context
        );
        return matches.talents.slice(0, 2); // Top 2 for each character
      })
    );

    const allTalents = characterMatches.flat();

    return {
      message: `I've analyzed your script and identified ${analysis.characters.length} key roles. Here are talent suggestions for each character based on the requirements.`,
      talents: allTalents,
      suggestions: analysis.characters.map(c => 
        `${c.name}: ${c.description} - ${c.requirements.skills?.join(', ')}`
      ),
      action_type: 'general'
    };
  }

  /**
   * Handle general queries
   */
  private async handleGeneralQuery(
    message: string,
    context: ChatContext
  ): Promise<ChatResponse> {
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: this.systemPrompt },
        ...context.conversationHistory.slice(-5), // Last 5 messages
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    return {
      message: completion.choices[0].message.content || "I'm here to help you find talent. Try asking me to search for specific types of actors or performers.",
      talents: [],
      suggestions: [
        "Search for actors by age, location, and skills",
        "Get recommendations based on your project needs",
        "Analyze scripts to find matching talent"
      ],
      action_type: 'general'
    };
  }

  /**
   * Generate AI response with context
   */
  private async generateAIResponse(
    query: string,
    talents: TalentProfile[],
    filters: any,
    context: ChatContext
  ): Promise<{message: string, suggestions: string[]}> {
    const talentCount = talents.length;
    
    if (talentCount === 0) {
      return {
        message: `I couldn't find any talents matching your exact criteria. Try broadening your search parameters.`,
        suggestions: [
          "Expand the age range",
          "Include nearby locations",
          "Remove some skill requirements",
          "Check availability settings"
        ]
      };
    }

    const topTalent = talents[0];
    const avgScore = talents.reduce((sum, t) => sum + (t.match_score || 0), 0) / talentCount;

    return {
      message: `I found ${talentCount} talented individuals matching your requirements. ${topTalent.name} has the highest compatibility score of ${(topTalent.match_score || 0) * 100}%. The average match score is ${(avgScore * 100).toFixed(0)}%.`,
      suggestions: [
        `Top match: ${topTalent.name} - ${topTalent.skills.slice(0, 3).join(', ')}`,
        `Age range: ${filters.age_range[0]}-${filters.age_range[1]} years`,
        `Location: ${filters.location}`,
        talentCount > 5 ? "Refine your search for more specific results" : "View all profiles for detailed information"
      ]
    };
  }

  /**
   * Stream responses for better UX
   */
  async *streamResponse(
    message: string,
    context: ChatContext
  ): AsyncGenerator<{type: string, content: any}> {
    yield { type: 'thinking', content: 'Analyzing your request...' };
    
    const intent = await this.analyzeIntent(message);
    yield { type: 'intent', content: intent };
    
    yield { type: 'searching', content: 'Searching talent database...' };
    
    const response = await this.processMessage(message, context);
    
    yield { type: 'complete', content: response };
  }
}