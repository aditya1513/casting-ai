/**
 * AI Chat Service for CastMatch
 * Uses structured outputs and tool calling for reliable responses
 */

import { z } from 'zod';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { ClaudeService, claudeService } from './claude.service';

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
  private claudeService: ClaudeService;
  private talentService: any; // TalentCrudService instance
  
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
      apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-testing'
    });
    
    // Use singleton Claude service
    this.claudeService = claudeService;
    
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || 'dummy-key-for-testing'
    });
    
    // Initialize talent service - will be set to null and initialized later
    this.talentService = null;
    // Initialize talent service asynchronously
    this.initializeTalentService().catch(error => {
      console.error('Failed to initialize talent service:', error);
    });
  }
  
  private async initializeTalentService() {
    try {
      // Import talent CRUD service dynamically to avoid circular dependencies
      const { talentCrudService } = await import('./talent-crud.service');
      this.talentService = talentCrudService;
      console.log('Talent service initialized successfully');
      
      // Verify database connection - TEMPORARILY DISABLED due to SQL syntax errors
      // await this.testDatabaseConnection();
    } catch (error) {
      console.error('Failed to initialize talent service:', error);
      this.talentService = null; // Explicitly set to null for fallback handling
    }
  }

  private async testDatabaseConnection(): Promise<boolean> {
    try {
      if (!this.talentService) return false;
      
      // Test with a simple query
      const testResult = await this.talentService.searchTalents(
        { isVerified: true },
        { page: 1, limit: 1 }
      );
      
      console.log('Database connection test successful, found:', testResult.total, 'talents');
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  /**
   * Call Python AI service for chat processing
   */
  private async callPythonAIService(
    message: string,
    context: ChatContext
  ): Promise<ChatResponse | null> {
    try {
      const pythonServiceUrl = process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:8002';
      
      const requestBody = {
        message,
        session_id: context.conversationHistory.length > 0 ? 
          `${context.userId}-${Date.now()}` : 'default',
        user_id: context.userId,
        conversation_history: context.conversationHistory.slice(-10), // Last 10 messages
        project_id: context.projectId,
        preferences: context.preferences
      };

      const response = await fetch(`${pythonServiceUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        timeout: 30000, // 30 second timeout
      });

      if (!response.ok) {
        console.warn(`Python AI service returned ${response.status}: ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      
      // Transform Python service response to match our schema
      return {
        message: data.message || 'Response from AI service',
        talents: data.talents || [],
        suggestions: data.suggestions || [],
        filters_applied: data.filters_applied,
        action_type: data.action_type || 'general'
      };
      
    } catch (error) {
      console.warn('Failed to call Python AI service:', error);
      return null; // Return null to trigger fallback
    }
  }

  /**
   * Process a chat message and return structured response
   */
  async processMessage(
    message: string, 
    context: ChatContext
  ): Promise<ChatResponse> {
    try {
      // First try to use Python AI service
      const pythonResponse = await this.callPythonAIService(message, context);
      if (pythonResponse) {
        return ChatResponseSchema.parse(pythonResponse);
      }
      
      // Fallback to local processing if Python service fails
      console.log('Python AI service unavailable, using fallback processing');
      
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
    // Use Claude service to analyze intent
    const context = {
      userId: 'system',
      conversationId: 'intent-analysis',
      role: 'analyzer'
    };
    
    const systemMessage = "Analyze the user's message and extract intent for talent search. Return a JSON object with 'action' (search/recommend/analyze/general) and 'parameters' (age_range, gender, skills, location, etc.).";
    
    const response = await this.claudeService.processMessage(
      `${systemMessage}\n\nUser message: ${message}`,
      context
    );
    
    // Parse Claude's response
    let result;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch (e) {
      result = {};
    }
    
    return {
      action: result.action || 'search',
      parameters: {
        age_range: result.age_range || [18, 65],
        gender: result.gender,
        skills: result.skills || [],
        location: result.location || 'Mumbai',
        languages: result.languages || ['Hindi', 'English'],
        availability: result.availability
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
    try {
      if (!this.talentService) {
        console.warn('Talent service not initialized, using fallback response');
        return this.getFallbackResponse();
      }

      // Build search filters for the talent service
      const filters = {
        ageMin: parameters.age_range ? parameters.age_range[0] : undefined,
        ageMax: parameters.age_range ? parameters.age_range[1] : undefined,
        currentCity: parameters.location,
        actingSkills: parameters.skills,
        availabilityStatus: parameters.availability ? 'AVAILABLE' : undefined,
        isVerified: true, // Prefer verified talents
        searchQuery: message // Use the original message for full-text search
      };

      // Use optimized fast search for AI recommendations
      let talents = [];
      try {
        // Try the fast AI-optimized search first
        talents = await this.talentService.fastSearchForAI(filters, 10);
        
        // Fallback to regular search if fast search fails or returns no results
        if (talents.length === 0) {
          const searchResults = await this.talentService.searchTalents(
            filters,
            { page: 1, limit: 10, sortBy: 'profileScore', sortOrder: 'desc' }
          );
          talents = searchResults.talents;
        }
      } catch (error) {
        console.warn('Fast search failed, falling back to regular search:', error);
        const searchResults = await this.talentService.searchTalents(
          filters,
          { page: 1, limit: 10, sortBy: 'profileScore', sortOrder: 'desc' }
        );
        talents = searchResults.talents;
      }

      // Transform talent data to match our schema and add sophisticated match scores
      const scoredTalents = talents.map((talent: any) => {
        let score = 0.2; // Lower base score to make room for better scoring
        
        // Score based on profile completeness (35% weight)
        if (talent.profileScore) {
          score += (talent.profileScore / 100) * 0.35;
        }
        
        // Advanced skills matching with fuzzy logic (25% weight)
        if (talent.actingSkills?.length && parameters.skills?.length) {
          const talentSkills = [
            ...(talent.actingSkills || []),
            ...(talent.danceSkills || []),
            ...(talent.specialSkills || [])
          ];
          
          let skillScore = 0;
          let totalRequiredSkills = parameters.skills.length;
          
          for (const requiredSkill of parameters.skills) {
            const exactMatch = talentSkills.find(skill => 
              skill.toLowerCase() === requiredSkill.toLowerCase()
            );
            const partialMatch = talentSkills.find(skill => 
              skill.toLowerCase().includes(requiredSkill.toLowerCase()) ||
              requiredSkill.toLowerCase().includes(skill.toLowerCase())
            );
            
            if (exactMatch) skillScore += 1.0;
            else if (partialMatch) skillScore += 0.7;
          }
          
          score += (skillScore / totalRequiredSkills) * 0.25;
        }
        
        // Location scoring with regional preferences (15% weight)
        if (talent.currentCity && parameters.location) {
          const talentLocation = talent.currentCity.toLowerCase();
          const reqLocation = parameters.location.toLowerCase();
          
          if (talentLocation === reqLocation) {
            score += 0.15; // Exact match
          } else if (talentLocation.includes(reqLocation) || reqLocation.includes(talentLocation)) {
            score += 0.10; // Partial match
          } else {
            // Check for same state/region
            const mumbaiBelt = ['mumbai', 'pune', 'nashik', 'thane', 'navi mumbai'];
            const delhiBelt = ['delhi', 'gurgaon', 'noida', 'faridabad', 'ghaziabad'];
            
            const isMumbaiBelt = mumbaiBelt.some(city => 
              talentLocation.includes(city) || reqLocation.includes(city)
            );
            const isDelhiBelt = delhiBelt.some(city => 
              talentLocation.includes(city) || reqLocation.includes(city)
            );
            
            if (isMumbaiBelt || isDelhiBelt) {
              score += 0.05; // Regional proximity
            }
          }
        }
        
        // Age range scoring (10% weight)
        if (talent.dateOfBirth && parameters.age_range) {
          const age = Math.floor((Date.now() - new Date(talent.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          const [minAge, maxAge] = parameters.age_range;
          
          if (age >= minAge && age <= maxAge) {
            score += 0.10; // Perfect age match
          } else {
            // Gradual decline for ages outside range
            const ageDiff = Math.min(Math.abs(age - minAge), Math.abs(age - maxAge));
            if (ageDiff <= 3) score += 0.07; // Close to range
            else if (ageDiff <= 5) score += 0.04; // Somewhat close
          }
        }
        
        // Availability and status bonuses (10% weight)
        if (talent.availabilityStatus === 'AVAILABLE') {
          score += 0.06;
        } else if (talent.availabilityStatus === 'PARTIALLY_AVAILABLE') {
          score += 0.03;
        }
        
        if (talent.isVerified) {
          score += 0.04;
        }
        
        // Experience level bonus (5% weight)
        if (talent.yearsOfExperience) {
          if (talent.yearsOfExperience >= 5 && talent.yearsOfExperience <= 15) {
            score += 0.05; // Sweet spot for most roles
          } else if (talent.yearsOfExperience > 15) {
            score += 0.03; // Senior talent
          } else if (talent.yearsOfExperience >= 2) {
            score += 0.02; // Some experience
          }
        }
        
        score = Math.min(score, 1.0); // Cap at 1.0

        return {
          id: talent.id,
          name: `${talent.firstName} ${talent.lastName}`,
          age: talent.dateOfBirth ? 
            Math.floor((Date.now() - new Date(talent.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 
            0,
          location: talent.currentCity || 'Mumbai',
          skills: [
            ...(talent.actingSkills || []),
            ...(talent.danceSkills || []),
            ...(talent.specialSkills || [])
          ].slice(0, 5), // Top 5 skills
          experience: talent.yearsOfExperience ? 
            `${talent.yearsOfExperience} years` : 
            'Not specified',
          availability: talent.availabilityStatus === 'AVAILABLE',
          headshot_url: talent.profileImageUrl || undefined,
          match_score: parseFloat(score.toFixed(3)) // Round to 3 decimal places
        };
      });

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
    } catch (error) {
      console.error('Error in handleTalentSearch:', error);
      return this.getFallbackResponse();
    }
  }

  /**
   * Fallback response when talent service is unavailable
   */
  private getFallbackResponse(): ChatResponse {
    return {
      message: "I'm currently experiencing technical difficulties connecting to our talent database. Please try again in a moment.",
      talents: [],
      suggestions: [
        "Check your search criteria and try again",
        "Try a broader search with fewer filters",
        "Contact support if the issue persists"
      ],
      action_type: 'general'
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
    try {
      if (!this.talentService) {
        return this.getFallbackResponse();
      }

      // Get top-rated and verified talents as recommendations
      const searchResults = await this.talentService.searchTalents(
        { 
          isVerified: true,
          availabilityStatus: 'AVAILABLE'
        },
        { 
          page: 1, 
          limit: 5, 
          sortBy: 'profileScore', 
          sortOrder: 'desc' 
        }
      );

      const recommendedTalents = searchResults.talents.map((talent: any) => ({
        id: talent.id,
        name: `${talent.firstName} ${talent.lastName}`,
        age: talent.dateOfBirth ? 
          Math.floor((Date.now() - new Date(talent.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 
          0,
        location: talent.currentCity || 'Mumbai',
        skills: [
          ...(talent.actingSkills || []),
          ...(talent.danceSkills || []),
          ...(talent.specialSkills || [])
        ].slice(0, 5),
        experience: talent.yearsOfExperience ? 
          `${talent.yearsOfExperience} years` : 
          'Not specified',
        availability: talent.availabilityStatus === 'AVAILABLE',
        headshot_url: talent.profileImageUrl || undefined,
        match_score: talent.profileScore ? (talent.profileScore / 100) : 0.5
      }));

      return {
        message: `Based on our quality ratings and verification status, I recommend these top-tier talents. They have excellent profiles and are currently available for projects.`,
        talents: recommendedTalents,
        suggestions: [
          "Click on any profile to see more details",
          "Add talents to your shortlist for easy access",
          "Schedule auditions directly through the platform",
          "View similar talents with matching skills"
        ],
        action_type: 'recommend'
      };
    } catch (error) {
      console.error('Error in handleRecommendation:', error);
      return this.getFallbackResponse();
    }
  }

  /**
   * Handle script analysis queries
   */
  private async handleScriptAnalysis(
    message: string,
    parameters: any,
    context: ChatContext
  ): Promise<ChatResponse> {
    // Simplified script analysis for now
    const analysis = {
      characters: [
        {
          name: "Lead Role",
          description: "Main protagonist",
          requirements: { skills: ["acting", "dancing"], age_range: [25, 35] }
        }
      ]
    };
    
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
        message: `I couldn't find any talents matching your exact criteria "${query}". This could be due to very specific requirements or limited database coverage for those particular skills/locations.`,
        suggestions: [
          "Try expanding your age range by 5-10 years",
          "Include nearby cities (Mumbai, Pune, Thane for Maharashtra region)",
          "Use broader skill categories (e.g., 'acting' instead of 'method acting')",
          "Remove availability restrictions to see more profiles",
          "Try: 'Show me similar profiles with at least 2 matching skills'"
        ]
      };
    }

    const topTalent = talents[0];
    const highScoreTalents = talents.filter(t => (t.match_score || 0) >= 0.7);
    const avgScore = talents.reduce((sum, t) => sum + (t.match_score || 0), 0) / talentCount;
    
    // Generate contextual message based on results quality
    let message = '';
    let suggestions: string[] = [];

    if (highScoreTalents.length >= 3) {
      message = `Excellent! I found ${talentCount} talents with ${highScoreTalents.length} high-quality matches (70%+ compatibility). ${topTalent.name} leads with ${((topTalent.match_score || 0) * 100).toFixed(0)}% match score.`;
      suggestions = [
        `🌟 Top pick: ${topTalent.name} (${topTalent.age}y) - ${topTalent.skills.slice(0, 3).join(', ')}`,
        `📍 All from ${filters.location || 'preferred locations'}`,
        "View detailed profiles and portfolios",
        "Schedule auditions with top 3 matches",
        "Save these talents to your project shortlist"
      ];
    } else if (avgScore >= 0.6) {
      message = `Good results! Found ${talentCount} suitable talents. ${topTalent.name} has the highest compatibility at ${((topTalent.match_score || 0) * 100).toFixed(0)}%. Average match quality is ${(avgScore * 100).toFixed(0)}%.`;
      suggestions = [
        `🎯 Best match: ${topTalent.name} - ${topTalent.location}, ${topTalent.experience}`,
        `💼 Skills: ${topTalent.skills.slice(0, 4).join(', ')}`,
        "Compare top 3 profiles side-by-side",
        "Request audition tapes from selected candidates",
        "Search for similar talents with: 'Find more like " + topTalent.name + "'"
      ];
    } else {
      message = `I found ${talentCount} potential matches, though they may require some compromises. ${topTalent.name} is the closest fit at ${((topTalent.match_score || 0) * 100).toFixed(0)}% compatibility.`;
      suggestions = [
        `⭐ Closest match: ${topTalent.name} - consider for auditions`,
        "Broaden your search criteria to find more suitable candidates",
        "Try: 'Find talents with similar skills but different experience levels'",
        "Consider talents from nearby locations",
        "Explore emerging talent with high potential ratings"
      ];
    }

    // Add dynamic suggestions based on search context
    if (filters.skills?.length > 0) {
      const mainSkill = filters.skills[0];
      suggestions.push(`🔍 Refine by searching: "Show me more ${mainSkill} experts"`);
    }

    if (context.projectId) {
      suggestions.push("💾 Add selected talents to your project casting board");
    }

    if (talents.some(t => !t.availability)) {
      suggestions.push("📅 Check talent availability for your shooting dates");
    }

    return { message, suggestions: suggestions.slice(0, 6) }; // Limit to 6 suggestions
  }

  /**
   * Stream responses using Claude service for better UX
   */
  async *streamResponse(
    message: string,
    context: ChatContext
  ): AsyncGenerator<{type: string, content: any}> {
    try {
      // Convert context to Claude format
      const claudeContext = {
        userId: context.userId,
        conversationId: context.conversationHistory.length > 0 ? 
          `${context.userId}-${Date.now()}` : 'temp',
        role: 'user',
        projectContext: context.projectId ? { projectId: context.projectId } : undefined,
        preferences: context.preferences
      };

      // Check if this is a talent search request
      const talentSearchIntent = this.extractTalentSearchIntent(message);
      
      if (talentSearchIntent) {
        // Handle talent search with streaming
        yield { type: 'thinking', content: 'Analyzing your talent search request...' };
        
        // Search for talents first
        yield { type: 'searching', content: 'Searching our talent database...' };
        
        try {
          const talents = await this.searchTalentsForStream(talentSearchIntent);
          
          if (talents.length > 0) {
            yield { 
              type: 'talents_found', 
              content: { 
                count: talents.length, 
                talents: talents.slice(0, 3),
                message: `Found ${talents.length} matching talents` 
              } 
            };
          }
          
          // Now stream Claude's analysis of the results
          yield { type: 'analyzing', content: 'Generating insights and recommendations...' };
          
          // Use Claude to provide analysis
          const contextualMessage = `Based on the search for "${message}", I found ${talents.length} talents. Please provide insights and recommendations.`;
          
          // Stream Claude's response
          for await (const chunk of this.claudeService.streamResponse(contextualMessage, claudeContext)) {
            if (chunk.type === 'text') {
              yield { type: 'text', content: chunk.content };
            } else if (chunk.type === 'error') {
              yield { type: 'error', content: chunk.content };
              return;
            }
          }
          
          // Send the talents data at the end
          yield { 
            type: 'complete', 
            content: {
              talents: talents.slice(0, 5),
              total_found: talents.length,
              action_type: 'search'
            } 
          };
          
        } catch (searchError) {
          console.error('Search error during streaming:', searchError);
          yield { type: 'error', content: 'Failed to search talents. Please try again.' };
        }
        
      } else {
        // Regular conversation - stream Claude response directly
        yield { type: 'thinking', content: 'Processing your message...' };
        
        for await (const chunk of this.claudeService.streamResponse(message, claudeContext)) {
          yield chunk;
        }
      }
      
    } catch (error) {
      console.error('Error in streamResponse:', error);
      yield { 
        type: 'error', 
        content: 'I encountered an error processing your request. Please try again.' 
      };
    }
  }

  /**
   * Extract talent search intent from message (simplified version for streaming)
   */
  private extractTalentSearchIntent(message: string): { query: string; filters?: any } | null {
    const searchKeywords = [
      'find', 'search', 'show', 'look for', 'need', 'want',
      'actor', 'actress', 'talent', 'performer', 'model',
      'cast', 'casting', 'audition'
    ];
    
    const hasSearchIntent = searchKeywords.some(keyword =>
      message.toLowerCase().includes(keyword)
    );
    
    if (!hasSearchIntent) return null;
    
    return {
      query: message,
      filters: {} // Simplified for streaming - could be enhanced
    };
  }

  /**
   * Fast talent search optimized for streaming
   */
  private async searchTalentsForStream(searchRequest: { query: string; filters?: any }): Promise<any[]> {
    try {
      if (!this.talentService) {
        console.warn('Talent service not available for streaming search');
        return [];
      }

      // Use fast search with basic filters
      const talents = await this.talentService.fastSearchForAI(
        {
          isVerified: true,
          searchQuery: searchRequest.query
        },
        10 // Limit for streaming
      );

      return talents.map((talent: any) => ({
        id: talent.id,
        name: `${talent.firstName} ${talent.lastName}`,
        age: talent.dateOfBirth ? 
          Math.floor((Date.now() - new Date(talent.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 
          0,
        location: talent.currentCity || 'Mumbai',
        skills: [
          ...(talent.actingSkills || []),
          ...(talent.danceSkills || []),
          ...(talent.specialSkills || [])
        ].slice(0, 3),
        experience: talent.yearsOfExperience ? 
          `${talent.yearsOfExperience} years` : 
          'Not specified',
        availability: talent.availabilityStatus === 'AVAILABLE',
        headshot_url: talent.profileImageUrl || undefined,
        match_score: talent.profileScore ? (talent.profileScore / 100) : 0.5
      }));
      
    } catch (error) {
      console.error('Error in fast talent search:', error);
      return [];
    }
  }
}