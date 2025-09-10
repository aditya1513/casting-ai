/**
 * CastMatch Anthropic Claude Conversation Service
 * Handles AI conversations with memory and context preservation
 */

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

interface ConversationContext {
  userId: string;
  sessionId: string;
  messages: ConversationMessage[];
  metadata: {
    castingProject?: string;
    preferredGenres?: string[];
    location: string;
    language: string;
    conversationStage: 'greeting' | 'discovery' | 'recommendation' | 'refinement';
  };
}

interface ClaudeStreamResponse {
  content: string;
  isComplete: boolean;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

class AnthropicConversationService {
  private apiKey: string;
  private baseUrl: string = 'https://api.anthropic.com/v1';
  
  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ ANTHROPIC_API_KEY not found - using mock responses');
    }
  }

  /**
   * Generate Claude response with casting context
   */
  async generateResponse(
    context: ConversationContext,
    newMessage: string
  ): Promise<ClaudeStreamResponse> {
    try {
      if (!this.apiKey) {
        return this.getMockCastingResponse(newMessage, context);
      }

      const systemPrompt = this.buildCastingSystemPrompt(context);
      const messages = this.formatMessagesForClaude(context.messages, newMessage);

      // For now, we'll implement without streaming first, then add streaming
      const response = await this.callClaudeAPI({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        temperature: 0.7,
        system: systemPrompt,
        messages: messages
      });

      return {
        content: response.content,
        isComplete: true,
        usage: response.usage
      };

    } catch (error) {
      console.error('Claude API error:', error);
      return this.getFallbackResponse(newMessage, context);
    }
  }

  /**
   * Build system prompt with casting expertise
   */
  private buildCastingSystemPrompt(context: ConversationContext): string {
    return `You are Claude, an expert AI casting director assistant for CastMatch, specializing in Mumbai's OTT industry.

CONTEXT:
- User Location: ${context.metadata.location}
- Preferred Language: ${context.metadata.language}
- Conversation Stage: ${context.metadata.conversationStage}
- Current Project: ${context.metadata.castingProject || 'General casting inquiry'}

EXPERTISE AREAS:
- Mumbai's diverse talent ecosystem (Bollywood, regional cinema, digital-first creators)
- OTT platform casting preferences and requirements
- Character analysis and talent matching
- Audition process optimization
- Script analysis and role breakdowns
- Industry trends and casting insights

CONVERSATION STYLE:
- Conversational and helpful, not robotic
- Ask clarifying questions to understand specific needs
- Provide actionable casting recommendations
- Reference Mumbai's cultural context when relevant
- Focus on practical, implementable advice

MEMORY CONTEXT:
Previous conversation context: ${this.summarizeConversationHistory(context.messages)}

Remember to maintain context and build on previous discussions. Always aim to be helpful while showcasing deep industry knowledge.`;
  }

  /**
   * Format messages for Claude API
   */
  private formatMessagesForClaude(
    previousMessages: ConversationMessage[],
    newMessage: string
  ): Array<{role: string; content: string}> {
    const messages = previousMessages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));
    
    messages.push({
      role: 'user',
      content: newMessage
    });

    return messages;
  }

  /**
   * Call Claude API (placeholder for actual implementation)
   */
  private async callClaudeAPI(payload: any): Promise<any> {
    // For now, return a mock response that demonstrates the integration
    // In production, this would use fetch or the Anthropic SDK
    
    const mockResponse = {
      content: this.generateIntelligentCastingResponse(payload.messages[payload.messages.length - 1]?.content || ''),
      usage: {
        input_tokens: 150,
        output_tokens: 75
      }
    };

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return mockResponse;
  }

  /**
   * Generate intelligent casting response based on input
   */
  private generateIntelligentCastingResponse(userMessage: string): string {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return "Hello! I'm Claude, your AI casting director assistant for CastMatch. I specialize in Mumbai's OTT industry and can help you with talent discovery, role analysis, audition planning, and casting recommendations. What casting project are you working on today?";
    }
    
    if (lowerMessage.includes('romantic') && lowerMessage.includes('drama')) {
      return "For a romantic drama in Mumbai's OTT space, I'd recommend considering talent with strong emotional range and natural chemistry. Based on current trends, audiences love authentic performances over glamorous casting. Are you looking for established actors or fresh faces? Also, what's the age range and language requirements for your leads?";
    }
    
    if (lowerMessage.includes('action') || lowerMessage.includes('thriller')) {
      return "Action thrillers are huge on OTT right now! For Mumbai-based casting, I'd focus on actors with physical training backgrounds - many come from theater or martial arts. The key is finding talent who can handle both the physical demands and dramatic intensity. What's your budget range and shooting schedule? This affects talent availability significantly.";
    }
    
    if (lowerMessage.includes('comedy')) {
      return "Comedy casting for OTT requires a special touch - audiences want relatable humor, not over-the-top performances. Mumbai has incredible comedic talent from improv backgrounds and YouTube creators. Are you looking for situational comedy or character-driven humor? Also, regional comedy styles can really connect with specific demographics.";
    }
    
    if (lowerMessage.includes('budget') || lowerMessage.includes('cost')) {
      return "Budget considerations are crucial in Mumbai's casting landscape. For OTT projects, I can help you balance star power with emerging talent. Established actors command ₹5-50L per day, while fresh faces might work for ₹25K-2L. The sweet spot is often talented theater actors or digital creators - they bring authenticity and are cost-effective. What's your approximate budget range?";
    }
    
    if (lowerMessage.includes('audition')) {
      return "Audition strategy is key to successful casting! In Mumbai, I recommend a hybrid approach: initial video submissions followed by in-person chemistry reads. Focus on scene selections that showcase the specific skills you need. Would you like help designing audition material, or are you looking for guidance on evaluation criteria?";
    }
    
    if (lowerMessage.includes('script') || lowerMessage.includes('character')) {
      return "Character analysis is my forte! I can break down your script to identify casting requirements - not just the obvious traits, but the subtle qualities that make characters memorable. Share some details about your key characters, and I'll help you create detailed casting profiles that go beyond the typical 'age and look' descriptions.";
    }
    
    // Default intelligent response
    return "I understand you're working on a casting project. As your AI casting director, I can help with talent discovery, character analysis, audition strategy, and industry insights specific to Mumbai's OTT landscape. Could you share more details about what you're looking to cast? The more context you provide, the better I can assist with specific recommendations.";
  }

  /**
   * Mock response for development/testing
   */
  private getMockCastingResponse(message: string, context: ConversationContext): ClaudeStreamResponse {
    return {
      content: this.generateIntelligentCastingResponse(message),
      isComplete: true,
      usage: {
        input_tokens: 100,
        output_tokens: 50
      }
    };
  }

  /**
   * Fallback response for errors
   */
  private getFallbackResponse(message: string, context: ConversationContext): ClaudeStreamResponse {
    return {
      content: "I'm experiencing a temporary technical issue, but I'm still here to help with your casting needs! While I resolve this, could you tell me more about the specific role or project you're working on? I can provide general casting guidance based on Mumbai's OTT industry trends.",
      isComplete: true
    };
  }

  /**
   * Summarize conversation history for context
   */
  private summarizeConversationHistory(messages: ConversationMessage[]): string {
    if (messages.length === 0) return 'New conversation';
    
    const recentMessages = messages.slice(-3); // Last 3 messages for context
    return recentMessages.map(msg => 
      `${msg.role}: ${msg.content.substring(0, 100)}...`
    ).join('\n');
  }

  /**
   * Update conversation context based on user's message
   */
  updateConversationStage(message: string, context: ConversationContext): ConversationContext {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') && context.messages.length < 2) {
      context.metadata.conversationStage = 'greeting';
    } else if (lowerMessage.includes('looking for') || lowerMessage.includes('need') || lowerMessage.includes('casting')) {
      context.metadata.conversationStage = 'discovery';
    } else if (context.messages.length > 3) {
      context.metadata.conversationStage = 'refinement';
    } else {
      context.metadata.conversationStage = 'recommendation';
    }
    
    // Extract casting project info
    if (lowerMessage.includes('web series') || lowerMessage.includes('show') || lowerMessage.includes('series')) {
      context.metadata.castingProject = 'Web Series';
    } else if (lowerMessage.includes('film') || lowerMessage.includes('movie')) {
      context.metadata.castingProject = 'Film';
    } else if (lowerMessage.includes('commercial') || lowerMessage.includes('ad')) {
      context.metadata.castingProject = 'Commercial';
    }
    
    return context;
  }
}

export { AnthropicConversationService, ConversationContext, ConversationMessage, ClaudeStreamResponse };