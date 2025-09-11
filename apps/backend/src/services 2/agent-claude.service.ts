/**
 * Enhanced Claude AI Service with Agent Integration
 * Extends Claude service with intelligent routing to 14 casting workflow agents
 */

import axios from 'axios';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import { claudeService } from './claude.service';
import { messageService } from './message.service';
import { memoryService } from './memory.service';

// Agent service endpoints
const AGENT_SERVICE_URL = 'http://localhost:3005'; // Our agents server

interface AgentResponse {
  success: boolean;
  agent: string;
  data: any;
  execution_time?: number;
  message?: string;
  error?: string;
}

interface ConversationContext {
  userId: string;
  conversationId: string;
  role?: string;
  projectContext?: Record<string, any>;
  preferences?: Record<string, any>;
}

interface StreamChunk {
  type: 'text' | 'thinking' | 'agent_progress' | 'agent_complete' | 'error' | 'done';
  content: string;
  metadata?: Record<string, any>;
}

export class AgentClaudeService {
  private readonly agentIntents = {
    // Core Agents
    'script-analysis': {
      keywords: ['script', 'analyze', 'character', 'breakdown', 'roles', 'scene analysis', 'dialogue'],
      description: 'Script analysis and character extraction',
      examples: ['Analyze this script for character breakdowns', 'Extract roles from screenplay']
    },
    
    'talent-discovery': {
      keywords: ['find talent', 'search actors', 'discover performers', 'casting search', 'talent pool'],
      description: 'AI-powered talent search and discovery',
      examples: ['Find actors for romantic lead', 'Search for comedy performers in Mumbai']
    },
    
    'application-screening': {
      keywords: ['review applications', 'screen candidates', 'evaluate submissions', 'shortlist'],
      description: 'Automated application screening and ranking',
      examples: ['Screen applications for lead role', 'Rank candidates by compatibility']
    },
    
    'audition-scheduling': {
      keywords: ['schedule audition', 'book appointment', 'calendar', 'availability', 'time slot'],
      description: 'Smart audition scheduling with conflict detection',
      examples: ['Schedule auditions for selected candidates', 'Find available time slots']
    },
    
    'communication': {
      keywords: ['send message', 'notify', 'email', 'contact', 'outreach', 'follow up'],
      description: 'Automated communication and outreach',
      examples: ['Send callback notifications', 'Follow up with casting directors']
    },
    
    'decision-support': {
      keywords: ['recommendation', 'suggest', 'best choice', 'decision help', 'compare candidates'],
      description: 'AI-powered casting decision support',
      examples: ['Recommend best actor for villain role', 'Compare top 3 candidates']
    },
    
    'budget-optimization': {
      keywords: ['budget', 'cost', 'optimize spending', 'financial', 'rates', 'negotiate'],
      description: 'Budget optimization and cost analysis',
      examples: ['Optimize casting budget', 'Analyze actor rates and negotiate']
    },
    
    'progress-tracking': {
      keywords: ['track progress', 'timeline', 'milestone', 'status update', 'project status'],
      description: 'Project progress tracking and timeline management',
      examples: ['Track casting progress', 'Update project milestones']
    },
    
    // Advanced Agents
    'talent-research': {
      keywords: ['research talent', 'background check', 'actor history', 'portfolio analysis'],
      description: 'Deep talent research and background analysis',
      examples: ['Research actor background', 'Analyze talent portfolio']
    },
    
    'contract-negotiation': {
      keywords: ['contract', 'negotiate', 'terms', 'deal', 'agreement', 'legal'],
      description: 'Contract analysis and negotiation support',
      examples: ['Review talent contract', 'Negotiate performance terms']
    },
    
    'quality-assurance': {
      keywords: ['quality check', 'validate', 'review decision', 'ensure quality'],
      description: 'Casting decision validation and quality assurance',
      examples: ['Validate casting choices', 'Quality check final selections']
    },
    
    'stakeholder-management': {
      keywords: ['stakeholder', 'coordinate', 'producer', 'director', 'communication'],
      description: 'Stakeholder communication and coordination',
      examples: ['Coordinate with director', 'Update producer on casting status']
    },
    
    'learning-optimization': {
      keywords: ['optimize process', 'improve workflow', 'performance analysis', 'efficiency'],
      description: 'Process optimization and performance improvement',
      examples: ['Optimize casting workflow', 'Analyze process efficiency']
    },
    
    'crisis-management': {
      keywords: ['emergency', 'crisis', 'urgent', 'backup plan', 'contingency'],
      description: 'Emergency handling and crisis management',
      examples: ['Handle actor withdrawal emergency', 'Create backup casting plan']
    }
  };

  constructor() {
    // Initialize with existing Claude service
  }

  /**
   * Enhanced message processing with agent integration
   */
  async processMessage(
    content: string,
    context: ConversationContext
  ): Promise<any> {
    try {
      // Check if message requires agent assistance
      const agentIntent = this.detectAgentIntent(content);
      
      if (agentIntent) {
        logger.info(`Agent intent detected: ${agentIntent}`);
        
        // Process with agent and get conversational response
        const agentResponse = await this.executeAgent(agentIntent, content, context);
        const conversationalResponse = await this.createConversationalResponse(
          agentResponse, 
          agentIntent, 
          content, 
          context
        );
        
        return conversationalResponse;
      } else {
        // Use standard Claude service for general conversation
        return await claudeService.processMessage(content, context);
      }
    } catch (error) {
      logger.error('Error in agent-enhanced message processing:', error);
      
      // Fallback to standard Claude service
      return await claudeService.processMessage(content, context);
    }
  }

  /**
   * Enhanced streaming with agent progress updates
   */
  async *streamResponse(
    content: string,
    context: ConversationContext
  ): AsyncGenerator<StreamChunk, void, unknown> {
    try {
      const agentIntent = this.detectAgentIntent(content);
      
      if (agentIntent) {
        // Agent-enhanced streaming
        yield {
          type: 'thinking',
          content: `I detected this is a ${this.agentIntents[agentIntent].description} request. Let me process this for you...`,
        };
        
        yield {
          type: 'agent_progress',
          content: `🤖 Activating ${agentIntent} agent...`,
          metadata: { agent: agentIntent }
        };
        
        // Execute agent
        const agentResponse = await this.executeAgent(agentIntent, content, context);
        
        yield {
          type: 'agent_complete',
          content: `✅ Agent execution completed in ${agentResponse.execution_time || 'N/A'}s`,
          metadata: { 
            agent: agentIntent,
            executionTime: agentResponse.execution_time,
            success: agentResponse.success
          }
        };
        
        // Stream conversational response
        const conversationalContent = await this.createConversationalResponse(
          agentResponse, 
          agentIntent, 
          content, 
          context
        );
        
        // Stream the response in chunks
        const chunks = this.splitIntoChunks(conversationalContent.content);
        for (const chunk of chunks) {
          yield {
            type: 'text',
            content: chunk,
          };
          
          // Small delay for realistic streaming
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
      } else {
        // Standard Claude streaming
        yield* claudeService.streamResponse(content, context);
      }
      
      yield {
        type: 'done',
        content: '',
      };
      
    } catch (error) {
      logger.error('Error in agent streaming:', error);
      yield {
        type: 'error',
        content: 'I encountered an error while processing your request. Let me try a different approach...',
      };
      
      // Fallback to standard streaming
      yield* claudeService.streamResponse(content, context);
    }
  }

  /**
   * Detect agent intent from user message
   */
  private detectAgentIntent(message: string): string | null {
    const messageLower = message.toLowerCase();
    
    // Check each agent's keywords
    for (const [agentName, config] of Object.entries(this.agentIntents)) {
      const hasKeyword = config.keywords.some(keyword => 
        messageLower.includes(keyword.toLowerCase())
      );
      
      if (hasKeyword) {
        return agentName;
      }
    }
    
    // Advanced intent detection using patterns
    if (this.isScriptAnalysisIntent(messageLower)) return 'script-analysis';
    if (this.isTalentSearchIntent(messageLower)) return 'talent-discovery';
    if (this.isSchedulingIntent(messageLower)) return 'audition-scheduling';
    if (this.isCommunicationIntent(messageLower)) return 'communication';
    
    return null;
  }

  /**
   * Execute specific agent
   */
  private async executeAgent(
    agentName: string,
    message: string,
    context: ConversationContext
  ): Promise<AgentResponse> {
    try {
      // Prepare agent request
      const agentRequest = {
        message,
        context: {
          userId: context.userId,
          conversationId: context.conversationId,
          role: context.role || 'casting_director',
          projectContext: context.projectContext,
          preferences: context.preferences
        }
      };

      // Map agent names to endpoints
      const agentEndpoints: Record<string, string> = {
        'script-analysis': '/api/agents/script-analysis',
        'talent-discovery': '/api/agents/talent-discovery', 
        'application-screening': '/api/agents/application-screening',
        'audition-scheduling': '/api/agents/audition-scheduling',
        'communication': '/api/agents/communication',
        'decision-support': '/api/agents/decision-support',
        'budget-optimization': '/api/agents/budget-optimization',
        'progress-tracking': '/api/agents/progress-tracking',
        'talent-research': '/api/agents/talent-research',
        'contract-negotiation': '/api/agents/contract-negotiation',
        'quality-assurance': '/api/agents/quality-assurance',
        'stakeholder-management': '/api/agents/stakeholder-management',
        'learning-optimization': '/api/agents/learning-optimization',
        'crisis-management': '/api/agents/crisis-management'
      };

      const endpoint = agentEndpoints[agentName];
      if (!endpoint) {
        throw new Error(`Unknown agent: ${agentName}`);
      }

      // Make request to agent service
      const response = await axios.post(`${AGENT_SERVICE_URL}${endpoint}`, agentRequest, {
        timeout: 30000, // 30 second timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data;

    } catch (error: any) {
      logger.error(`Error executing agent ${agentName}:`, error);
      
      return {
        success: false,
        agent: agentName,
        data: null,
        error: error.message || 'Agent execution failed',
        message: `I encountered an issue while processing your ${this.agentIntents[agentName]?.description} request.`
      };
    }
  }

  /**
   * Create conversational response from agent result
   */
  private async createConversationalResponse(
    agentResponse: AgentResponse,
    agentName: string,
    originalMessage: string,
    context: ConversationContext
  ): Promise<any> {
    try {
      if (!agentResponse.success) {
        const errorContent = `I apologize, but I encountered an issue while processing your ${this.agentIntents[agentName]?.description} request: ${agentResponse.error || 'Unknown error'}. 

Let me try to help you in a different way. Could you provide more details about what you need?`;

        // Save error response
        const savedMessage = await messageService.createMessage({
          conversationId: context.conversationId,
          userId: 'system',
          content: errorContent,
          type: 'text',
          isAiResponse: true,
          metadata: {
            agent: agentName,
            error: true,
            agentResponse
          },
        });

        return {
          content: errorContent,
          conversationId: context.conversationId,
          messageId: savedMessage.id,
          metadata: {
            agent: agentName,
            error: true
          },
        };
      }

      // Create contextual prompt for Claude to generate conversational response
      const contextPrompt = `
Agent: ${agentName}
User Request: "${originalMessage}"
Agent Result: ${JSON.stringify(agentResponse.data, null, 2)}
Execution Time: ${agentResponse.execution_time || 'N/A'}s

Please create a natural, conversational response that:
1. Acknowledges what the user requested
2. Presents the agent results in an easy-to-understand format
3. Provides actionable next steps
4. Maintains a professional but friendly tone
5. Highlights the most important findings

Make it feel like a knowledgeable casting assistant is personally helping them.`;

      // Use Claude to generate conversational response
      const conversationalResponse = await claudeService.processMessage(contextPrompt, context);

      // Enhance with agent metadata
      const enhancedContent = `${conversationalResponse.content}

---
*Processed by ${agentName} agent in ${agentResponse.execution_time || 'N/A'}s*`;

      // Save enhanced response
      const savedMessage = await messageService.createMessage({
        conversationId: context.conversationId,
        userId: 'system',
        content: enhancedContent,
        type: 'text',
        isAiResponse: true,
        metadata: {
          agent: agentName,
          agentResponse: agentResponse.data,
          executionTime: agentResponse.execution_time,
          enhanced: true
        },
      });

      return {
        content: enhancedContent,
        conversationId: context.conversationId,
        messageId: savedMessage.id,
        metadata: {
          agent: agentName,
          agentData: agentResponse.data,
          executionTime: agentResponse.execution_time
        },
        usage: conversationalResponse.usage,
      };

    } catch (error) {
      logger.error('Error creating conversational response:', error);
      
      // Fallback response
      const fallbackContent = `I was able to process your ${this.agentIntents[agentName]?.description} request, but had trouble formatting the response. Here's what I found:

${JSON.stringify(agentResponse.data, null, 2)}`;

      const savedMessage = await messageService.createMessage({
        conversationId: context.conversationId,
        userId: 'system',
        content: fallbackContent,
        type: 'text',
        isAiResponse: true,
        metadata: {
          agent: agentName,
          fallback: true
        },
      });

      return {
        content: fallbackContent,
        conversationId: context.conversationId,
        messageId: savedMessage.id,
        metadata: { agent: agentName, fallback: true },
      };
    }
  }

  /**
   * Split content into chunks for streaming
   */
  private splitIntoChunks(content: string, chunkSize: number = 50): string[] {
    const words = content.split(' ');
    const chunks = [];
    
    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(' ') + ' ');
    }
    
    return chunks;
  }

  // Intent detection helpers
  private isScriptAnalysisIntent(message: string): boolean {
    const patterns = [
      /analyze.*script/,
      /script.*analysis/,
      /character.*breakdown/,
      /extract.*roles/,
      /parse.*screenplay/
    ];
    return patterns.some(pattern => pattern.test(message));
  }

  private isTalentSearchIntent(message: string): boolean {
    const patterns = [
      /find.*actor/,
      /search.*talent/,
      /looking for.*performer/,
      /need.*actress/,
      /cast.*role/
    ];
    return patterns.some(pattern => pattern.test(message));
  }

  private isSchedulingIntent(message: string): boolean {
    const patterns = [
      /schedule.*audition/,
      /book.*appointment/,
      /when.*available/,
      /set.*time/,
      /calendar/
    ];
    return patterns.some(pattern => pattern.test(message));
  }

  private isCommunicationIntent(message: string): boolean {
    const patterns = [
      /send.*email/,
      /notify.*talent/,
      /contact.*actor/,
      /follow.*up/,
      /reach.*out/
    ];
    return patterns.some(pattern => pattern.test(message));
  }

  /**
   * Get available agents and their descriptions
   */
  getAvailableAgents(): Record<string, any> {
    return this.agentIntents;
  }

  /**
   * Health check for agent service
   */
  async healthCheck(): Promise<{ 
    claude: any; 
    agents: { available: boolean; url: string; error?: string } 
  }> {
    const claudeHealth = await claudeService.healthCheck();
    
    try {
      await axios.get(`${AGENT_SERVICE_URL}/health`, { timeout: 5000 });
      
      return {
        claude: claudeHealth,
        agents: {
          available: true,
          url: AGENT_SERVICE_URL
        }
      };
    } catch (error: any) {
      return {
        claude: claudeHealth,
        agents: {
          available: false,
          url: AGENT_SERVICE_URL,
          error: error.message
        }
      };
    }
  }
}

// Export singleton instance
export const agentClaudeService = new AgentClaudeService();