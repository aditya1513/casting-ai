/**
 * Claude AI Service for CastMatch
 * Integrates with Anthropic's Claude API for intelligent conversations
 */

import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import { messageService } from './message.service';
import { memoryService } from './memory.service';
import { talentCrudService } from './talent-crud.service';
import { CacheManager, CacheKeys } from '../config/redis';

// Response types
interface ClaudeResponse {
  content: string;
  conversationId: string;
  messageId?: string;
  metadata?: Record<string, any>;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

interface StreamChunk {
  type: 'text' | 'thinking' | 'error' | 'done';
  content: string;
  metadata?: Record<string, any>;
}

interface ConversationContext {
  userId: string;
  conversationId: string;
  role?: string;
  projectContext?: Record<string, any>;
  preferences?: Record<string, any>;
}

interface TalentSearchRequest {
  query: string;
  filters?: {
    ageRange?: [number, number];
    location?: string;
    skills?: string[];
    availability?: boolean;
    experience?: string;
  };
}

export class ClaudeService {
  private client: Anthropic;
  private readonly MAX_CONTEXT_LENGTH = 100000; // Claude 3's context window
  private readonly MAX_OUTPUT_TOKENS = 4096;
  private readonly DEFAULT_MODEL = 'claude-3-opus-20240229';
  private readonly FAST_MODEL = 'claude-3-haiku-20240307';
  
  private readonly systemPrompt = `You are CastMatch AI, Mumbai's premier talent discovery assistant for OTT platforms and digital content, powered by Claude.

🎬 **Your Role**: Expert casting advisor for India's booming OTT industry, specializing in Mumbai's diverse talent ecosystem.

🎯 **Core Expertise**:
1. **OTT-First Casting**: Deep understanding of web series, digital films, and streaming platform content requirements
2. **Mumbai Talent Intelligence**: Comprehensive knowledge of local acting schools, theater groups, and talent hotspots
3. **Multi-lingual Casting**: Expert in Hindi, Marathi, English, and regional language projects
4. **Genre Specialization**: Romance, thriller, comedy, drama, crime, biographical content for Indian audiences
5. **Industry Network**: Connected to talent agencies, casting directors, and production houses across Mumbai

🌟 **Mumbai-Specific Knowledge**:
- Acting institutes: FTII, NSD, Barry John's, Kishore Namit Kapoor
- Theater circuits: Prithvi, NCPA, Comedy Store, Canvas Laugh Club
- Talent neighborhoods: Andheri, Juhu, Bandra, Versova, Goregaon
- Production hubs: Film City, Madh Island, Lokhandwala
- Casting trends: Method acting, improv skills, social media presence

🎭 **Casting Intelligence**:
- **Fresh Faces**: Identify emerging talent from theater, YouTube, Instagram
- **Seasoned Actors**: Match established talent with new-age content
- **Chemistry Analysis**: Predict on-screen compatibility and ensemble dynamics
- **Budget Optimization**: Balance star power with cost-effectiveness
- **Diversity Focus**: Ensure inclusive casting across gender, age, background

📱 **OTT Content Trends (2025)**:
- Authentic storytelling over glamour
- Relatable, middle-class narratives
- Strong female protagonists
- LGBTQ+ representation
- Regional stories with universal appeal
- Social media integration in storylines

🎥 **Response Framework**:
1. **Quick Analysis**: Understand project genre, budget tier, target audience
2. **Talent Curation**: 3-5 perfect matches with detailed reasoning
3. **Alternative Options**: Backup choices and fresh discoveries
4. **Industry Context**: Market trends, availability insights, budget considerations
5. **Next Steps**: Specific actionable recommendations

Remember: You're not just finding faces - you're crafting the perfect ensemble that resonates with today's digital-first Indian audience while honoring Mumbai's rich entertainment legacy.`;

  constructor() {
    const apiKey = config.anthropic?.apiKey || process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      logger.warn('Anthropic API key not configured - Claude service will use mock responses');
    }
    
    this.client = new Anthropic({
      apiKey: apiKey || 'sk-dummy-key', // Use dummy key to prevent initialization errors
    });
  }

  /**
   * Process a message and generate Claude's response
   */
  async processMessage(
    content: string,
    context: ConversationContext
  ): Promise<ClaudeResponse> {
    try {
      // Check rate limiting
      const rateLimitKey = CacheKeys.rateLimit(`claude:${context.userId}`);
      const requestCount = await CacheManager.get(rateLimitKey) || 0;
      
      if (requestCount >= 50) { // 50 requests per minute per user
        throw new Error('Rate limit exceeded. Please wait a moment before sending another message.');
      }
      
      // Increment rate limit counter
      await CacheManager.set(rateLimitKey, requestCount + 1, 60); // Reset after 1 minute
      
      // Get conversation history for context
      const recentMessages = await messageService.getRecentMessages(context.conversationId, 20);
      
      // Get user's memory context
      const memoryContext = await memoryService.getUserContext(context.userId, context.conversationId);
      
      // Check if this is a talent search request
      const talentSearch = this.extractTalentSearchIntent(content);
      
      // Build messages array for Claude
      const messages = this.buildMessageContext(content, recentMessages, memoryContext, context);
      
      // Handle talent search if detected
      if (talentSearch) {
        return await this.handleTalentSearch(talentSearch, context, messages);
      }
      
      // Generate Claude response
      const response = await this.generateClaudeResponse(messages, false);
      
      // Save the response as a message
      const savedMessage = await messageService.createMessage({
        conversationId: context.conversationId,
        userId: 'system', // System user for AI responses
        content: response.content,
        type: 'text',
        isAiResponse: true,
        metadata: {
          model: this.DEFAULT_MODEL,
          usage: response.usage,
        },
      });
      
      // Update memory with important information
      await this.updateMemoryFromResponse(context, content, response.content);
      
      return {
        content: response.content,
        conversationId: context.conversationId,
        messageId: savedMessage.id,
        metadata: response.metadata,
        usage: response.usage,
      };
      
    } catch (error) {
      logger.error('Error processing Claude message:', error);
      
      // Return a helpful error message
      const errorContent = this.getErrorResponse(error);
      
      // Save error response
      const savedMessage = await messageService.createMessage({
        conversationId: context.conversationId,
        userId: 'system',
        content: errorContent,
        type: 'text',
        isAiResponse: true,
        metadata: { error: true },
      });
      
      return {
        content: errorContent,
        conversationId: context.conversationId,
        messageId: savedMessage.id,
        metadata: { error: true },
      };
    }
  }

  /**
   * Stream Claude's response for real-time interaction
   */
  async *streamResponse(
    content: string,
    context: ConversationContext
  ): AsyncGenerator<StreamChunk, void, unknown> {
    try {
      // Initial thinking indicator
      yield {
        type: 'thinking',
        content: 'Analyzing your request...',
      };
      
      // Get conversation context
      const recentMessages = await messageService.getRecentMessages(context.conversationId, 10);
      const memoryContext = await memoryService.getUserContext(context.userId, context.conversationId);
      
      // Check for talent search
      const talentSearch = this.extractTalentSearchIntent(content);
      
      if (talentSearch) {
        yield {
          type: 'thinking',
          content: 'Searching our talent database...',
        };
        
        // Search for talents
        const talents = await this.searchTalents(talentSearch);
        
        yield {
          type: 'text',
          content: `Found ${talents.length} matching talents based on your criteria.`,
          metadata: { talentCount: talents.length },
        };
      }
      
      // Build message context
      const messages = this.buildMessageContext(content, recentMessages, memoryContext, context);
      
      // Stream Claude's response
      const stream = await this.client.messages.create({
        model: this.DEFAULT_MODEL,
        max_tokens: this.MAX_OUTPUT_TOKENS,
        messages,
        system: this.systemPrompt,
        stream: true,
      });
      
      let fullResponse = '';
      
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          const text = chunk.delta.text;
          fullResponse += text;
          
          yield {
            type: 'text',
            content: text,
          };
        }
      }
      
      // Save the complete response
      await messageService.createMessage({
        conversationId: context.conversationId,
        userId: 'system',
        content: fullResponse,
        type: 'text',
        isAiResponse: true,
        metadata: {
          model: this.DEFAULT_MODEL,
          streamed: true,
        },
      });
      
      // Update memory
      await this.updateMemoryFromResponse(context, content, fullResponse);
      
      yield {
        type: 'done',
        content: '',
      };
      
    } catch (error) {
      logger.error('Error streaming Claude response:', error);
      yield {
        type: 'error',
        content: this.getErrorResponse(error),
      };
    }
  }

  /**
   * Handle talent search requests
   */
  private async handleTalentSearch(
    searchRequest: TalentSearchRequest,
    context: ConversationContext,
    messages: Anthropic.MessageParam[]
  ): Promise<ClaudeResponse> {
    try {
      // Search for talents using the talent service
      const talents = await this.searchTalents(searchRequest);
      
      // Add talent results to the context
      const talentContext = `
Based on the search criteria, I found ${talents.length} matching talents:

${talents.slice(0, 5).map((talent, idx) => `
${idx + 1}. ${talent.firstName} ${talent.lastName}
   - Age: ${talent.age || 'Not specified'}
   - Location: ${talent.currentCity || 'Mumbai'}
   - Skills: ${talent.skills?.join(', ') || 'Various'}
   - Experience: ${talent.yearsOfExperience || 0} years
   - Availability: ${talent.availabilityStatus || 'Check directly'}
   - Match Score: ${talent.matchScore || 0}%
`).join('\n')}

Please provide insights and recommendations based on these results.`;
      
      // Add talent context to messages
      messages.push({
        role: 'assistant',
        content: talentContext,
      });
      
      messages.push({
        role: 'user',
        content: 'Based on these talent search results, provide recommendations and insights.',
      });
      
      // Generate Claude's analysis
      const response = await this.generateClaudeResponse(messages, true);
      
      // Format the response with talent data
      const formattedContent = `${response.content}

**Top Matches:**
${talents.slice(0, 3).map(t => 
  `• ${t.firstName} ${t.lastName} - ${t.currentCity}, ${t.yearsOfExperience}y exp`
).join('\n')}`;
      
      // Save the response
      const savedMessage = await messageService.createMessage({
        conversationId: context.conversationId,
        userId: 'system',
        content: formattedContent,
        type: 'text',
        isAiResponse: true,
        metadata: {
          model: this.DEFAULT_MODEL,
          talentSearch: true,
          talentCount: talents.length,
          usage: response.usage,
        },
      });
      
      return {
        content: formattedContent,
        conversationId: context.conversationId,
        messageId: savedMessage.id,
        metadata: {
          talents: talents.slice(0, 5),
          totalFound: talents.length,
        },
        usage: response.usage,
      };
      
    } catch (error) {
      logger.error('Error in talent search:', error);
      throw error;
    }
  }

  /**
   * Search for talents based on criteria
   */
  private async searchTalents(searchRequest: TalentSearchRequest): Promise<any[]> {
    try {
      const filters: any = {
        isVerified: true,
      };
      
      if (searchRequest.filters) {
        const { ageRange, location, skills, availability, experience } = searchRequest.filters;
        
        if (ageRange) {
          filters.ageMin = ageRange[0];
          filters.ageMax = ageRange[1];
        }
        
        if (location) {
          filters.currentCity = location;
        }
        
        if (skills && skills.length > 0) {
          filters.actingSkills = skills;
        }
        
        if (availability !== undefined) {
          filters.availabilityStatus = availability ? 'AVAILABLE' : undefined;
        }
        
        if (experience) {
          // Parse experience like "5+ years" or "2-5 years"
          const expMatch = experience.match(/(\d+)/);
          if (expMatch) {
            filters.minExperience = parseInt(expMatch[1]);
          }
        }
      }
      
      // Add the search query for full-text search
      filters.searchQuery = searchRequest.query;
      
      // Use the fast AI search
      const talents = await talentCrudService.fastSearchForAI(filters, 20);
      
      // Calculate match scores
      return talents.map(talent => ({
        ...talent,
        matchScore: this.calculateMatchScore(talent, searchRequest),
      }));
      
    } catch (error) {
      logger.error('Error searching talents:', error);
      return [];
    }
  }

  /**
   * Calculate match score for a talent
   */
  private calculateMatchScore(talent: any, searchRequest: TalentSearchRequest): number {
    let score = 50; // Base score
    
    const filters = searchRequest.filters;
    if (!filters) return score;
    
    // Age match
    if (filters.ageRange && talent.age) {
      const [min, max] = filters.ageRange;
      if (talent.age >= min && talent.age <= max) {
        score += 15;
      }
    }
    
    // Location match
    if (filters.location && talent.currentCity) {
      if (talent.currentCity.toLowerCase().includes(filters.location.toLowerCase())) {
        score += 15;
      }
    }
    
    // Skills match
    if (filters.skills && talent.skills) {
      const matchedSkills = filters.skills.filter(skill =>
        talent.skills.some((ts: string) => 
          ts.toLowerCase().includes(skill.toLowerCase())
        )
      );
      score += (matchedSkills.length / filters.skills.length) * 20;
    }
    
    // Availability bonus
    if (filters.availability && talent.availabilityStatus === 'AVAILABLE') {
      score += 10;
    }
    
    // Profile completeness bonus
    if (talent.profileScore) {
      score += (talent.profileScore / 100) * 10;
    }
    
    return Math.min(Math.round(score), 100);
  }

  /**
   * Extract talent search intent from message
   */
  private extractTalentSearchIntent(message: string): TalentSearchRequest | null {
    const searchKeywords = [
      'find', 'search', 'show', 'look for', 'need', 'want',
      'actor', 'actress', 'talent', 'performer', 'model',
      'cast', 'casting', 'audition',
    ];
    
    const hasSearchIntent = searchKeywords.some(keyword =>
      message.toLowerCase().includes(keyword)
    );
    
    if (!hasSearchIntent) return null;
    
    // Extract filters from the message
    const filters: any = {};
    
    // Age extraction
    const ageMatch = message.match(/(\d+)[-\s](?:to|-)[-\s](\d+)[-\s]?(?:years?|yrs?)?/i);
    if (ageMatch) {
      filters.ageRange = [parseInt(ageMatch[1]), parseInt(ageMatch[2])];
    }
    
    // Location extraction
    const locations = ['mumbai', 'delhi', 'bangalore', 'chennai', 'kolkata', 'pune', 'hyderabad'];
    const foundLocation = locations.find(loc => message.toLowerCase().includes(loc));
    if (foundLocation) {
      filters.location = foundLocation.charAt(0).toUpperCase() + foundLocation.slice(1);
    }
    
    // Skills extraction
    const skillKeywords = ['dance', 'singing', 'martial arts', 'comedy', 'drama', 'action'];
    const foundSkills = skillKeywords.filter(skill => message.toLowerCase().includes(skill));
    if (foundSkills.length > 0) {
      filters.skills = foundSkills;
    }
    
    // Availability
    if (message.toLowerCase().includes('available')) {
      filters.availability = true;
    }
    
    return {
      query: message,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    };
  }

  /**
   * Build message context for Claude
   */
  private buildMessageContext(
    content: string,
    recentMessages: any[],
    memoryContext: any,
    context: ConversationContext
  ): Anthropic.MessageParam[] {
    const messages: Anthropic.MessageParam[] = [];
    
    // Add conversation history
    recentMessages.forEach(msg => {
      messages.push({
        role: msg.isAiResponse ? 'assistant' : 'user',
        content: msg.content,
      });
    });
    
    // Add memory context if available
    if (memoryContext && Object.keys(memoryContext).length > 0) {
      messages.unshift({
        role: 'user',
        content: `Context from previous conversations: ${JSON.stringify(memoryContext)}`,
      });
    }
    
    // Add project context if available
    if (context.projectContext) {
      messages.unshift({
        role: 'user',
        content: `Current project context: ${JSON.stringify(context.projectContext)}`,
      });
    }
    
    // Add the current message
    messages.push({
      role: 'user',
      content,
    });
    
    return messages;
  }

  /**
   * Generate Claude response
   */
  private async generateClaudeResponse(
    messages: Anthropic.MessageParam[],
    useFactModel: boolean = false
  ): Promise<{ content: string; usage?: any; metadata?: any }> {
    try {
      const response = await this.client.messages.create({
        model: useFactModel ? this.FAST_MODEL : this.DEFAULT_MODEL,
        max_tokens: this.MAX_OUTPUT_TOKENS,
        messages,
        system: this.systemPrompt,
      });
      
      const content = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as any).text)
        .join('\n');
      
      return {
        content,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        metadata: {
          model: response.model,
          stopReason: response.stop_reason,
        },
      };
    } catch (error: any) {
      // Check if it's an API key error
      if (error.status === 401 || error.message?.includes('API key')) {
        logger.warn('Anthropic API key invalid or not set - returning mock response');
        return this.getMockResponse(messages);
      }
      throw error;
    }
  }

  /**
   * Get mock response for testing without API key
   */
  private getMockResponse(messages: Anthropic.MessageParam[]): { content: string; usage?: any; metadata?: any } {
    const lastMessage = messages[messages.length - 1]?.content || '';
    
    return {
      content: `I understand you're looking for assistance with: "${lastMessage}"

As CastMatch AI, I'm here to help you find the perfect talent for your project. While I'm currently in test mode, I can assist you with:

1. **Talent Search**: Describe the type of talent you need (age, skills, location)
2. **Project Requirements**: Share your project details for tailored recommendations
3. **Casting Strategy**: Get advice on casting approaches for your production

Please provide more details about your casting needs, and I'll help you find suitable talent from our Mumbai-based database.

*Note: This is a test response. Full AI capabilities will be available once the Anthropic API is configured.*`,
      usage: {
        inputTokens: 100,
        outputTokens: 150,
        totalTokens: 250,
      },
      metadata: {
        model: 'mock',
        testMode: true,
      },
    };
  }

  /**
   * Update memory from response
   */
  private async updateMemoryFromResponse(
    context: ConversationContext,
    userMessage: string,
    aiResponse: string
  ): Promise<void> {
    try {
      // Extract important information from the conversation
      const importantInfo = this.extractImportantInfo(userMessage, aiResponse);
      
      if (importantInfo.length > 0) {
        // Store in memory service
        for (const info of importantInfo) {
          await memoryService.storeMemory({
            userId: context.userId,
            conversationId: context.conversationId,
            type: 'semantic',
            content: info.content,
            metadata: info.metadata,
          });
        }
      }
    } catch (error) {
      logger.error('Error updating memory:', error);
      // Non-critical error, continue
    }
  }

  /**
   * Extract important information from conversation
   */
  private extractImportantInfo(userMessage: string, aiResponse: string): any[] {
    const important = [];
    
    // Check for project details
    if (userMessage.toLowerCase().includes('project') || userMessage.toLowerCase().includes('film')) {
      important.push({
        content: `User discussed project: ${userMessage.substring(0, 200)}`,
        metadata: { type: 'project_context' },
      });
    }
    
    // Check for specific talent requirements
    if (userMessage.toLowerCase().includes('need') || userMessage.toLowerCase().includes('looking for')) {
      important.push({
        content: `Talent requirement: ${userMessage.substring(0, 200)}`,
        metadata: { type: 'talent_requirement' },
      });
    }
    
    // Check for preferences
    if (userMessage.toLowerCase().includes('prefer') || userMessage.toLowerCase().includes('like')) {
      important.push({
        content: `User preference: ${userMessage.substring(0, 200)}`,
        metadata: { type: 'preference' },
      });
    }
    
    return important;
  }

  /**
   * Get error response
   */
  private getErrorResponse(error: any): string {
    if (error.message?.includes('Rate limit')) {
      return "I'm receiving too many requests right now. Please wait a moment and try again.";
    }
    
    if (error.message?.includes('API key')) {
      return "I'm having trouble connecting to my AI service. Please contact support if this persists.";
    }
    
    if (error.message?.includes('Network')) {
      return "I'm experiencing network issues. Please check your connection and try again.";
    }
    
    return "I encountered an unexpected error. Please try rephrasing your message or contact support if the issue persists.";
  }

  /**
   * Get conversation summary
   */
  async getConversationSummary(conversationId: string): Promise<string> {
    try {
      const messages = await messageService.getRecentMessages(conversationId, 50);
      
      if (messages.length === 0) {
        return 'No messages in this conversation yet.';
      }
      
      const conversationText = messages
        .map(m => `${m.isAiResponse ? 'AI' : 'User'}: ${m.content}`)
        .join('\n');
      
      const response = await this.client.messages.create({
        model: this.FAST_MODEL,
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `Summarize this conversation in 2-3 sentences:\n\n${conversationText}`,
          },
        ],
        system: 'You are a helpful assistant that creates concise summaries.',
      });
      
      return response.content
        .filter(block => block.type === 'text')
        .map(block => (block as any).text)
        .join('\n');
        
    } catch (error) {
      logger.error('Error generating summary:', error);
      return 'Unable to generate summary.';
    }
  }

  /**
   * Check if Claude service is available
   */
  async healthCheck(): Promise<{ available: boolean; model: string; error?: string }> {
    try {
      const response = await this.client.messages.create({
        model: this.FAST_MODEL,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      });
      
      return {
        available: true,
        model: this.DEFAULT_MODEL,
      };
    } catch (error: any) {
      return {
        available: false,
        model: this.DEFAULT_MODEL,
        error: error.message,
      };
    }
  }
}

// Export singleton instance
export const claudeService = new ClaudeService();