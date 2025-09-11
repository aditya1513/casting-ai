/**
 * AI Agent Router
 * Routes messages to appropriate AI agents based on context
 */

import { z } from 'zod';
import { TalentMatchingAgent } from './agents/talent-matching.agent';
import { ScriptAnalysisAgent } from './agents/script-analysis.agent';
import { SchedulingAgent } from './agents/scheduling.agent';
import { CommunicationAgent } from './agents/communication.agent';
import { AnalyticsAgent } from './agents/analytics.agent';
import { getOpenAIClient, AI_MODELS, withRetry } from './config';
import { logger } from '../../utils/logger';

// Agent types
export enum AgentType {
  TALENT_MATCHING = 'talent_matching',
  SCRIPT_ANALYSIS = 'script_analysis',
  SCHEDULING = 'scheduling',
  COMMUNICATION = 'communication',
  ANALYTICS = 'analytics',
  GENERAL = 'general',
}

// Message classification result
export interface MessageClassification {
  primaryAgent: AgentType;
  confidence: number;
  secondaryAgent?: AgentType;
  intent: string;
  entities: Record<string, any>;
  requiresContext: boolean;
}

// Agent router input
export const RouterInput = z.object({
  message: z.string(),
  conversationId: z.string().uuid().optional(),
  userId: z.string().uuid(),
  context: z.record(z.any()).optional(),
  preferredAgent: z.nativeEnum(AgentType).optional(),
});

export type RouterInputType = z.infer<typeof RouterInput>;

export class AgentRouter {
  private openai = getOpenAIClient();
  private talentAgent = new TalentMatchingAgent();
  private scriptAgent = new ScriptAnalysisAgent();
  private schedulingAgent = new SchedulingAgent();
  private communicationAgent = new CommunicationAgent();
  private analyticsAgent = new AnalyticsAgent();
  
  /**
   * Route message to appropriate agent
   */
  async routeMessage(input: RouterInputType): Promise<{
    agent: AgentType;
    response: any;
    metadata: {
      processingTime: number;
      confidence: number;
      intent: string;
    };
  }> {
    const startTime = Date.now();
    
    try {
      // Classify the message if no preferred agent
      const classification = input.preferredAgent 
        ? { 
            primaryAgent: input.preferredAgent, 
            confidence: 1, 
            intent: 'direct',
            entities: {},
            requiresContext: false,
          }
        : await this.classifyMessage(input.message, input.context);
      
      // Route to appropriate agent
      const response = await this.executeAgentAction(
        classification,
        input
      );
      
      const processingTime = Date.now() - startTime;
      
      return {
        agent: classification.primaryAgent,
        response,
        metadata: {
          processingTime,
          confidence: classification.confidence,
          intent: classification.intent,
        },
      };
    } catch (error) {
      logger.error('Agent routing failed:', error);
      throw error;
    }
  }
  
  /**
   * Classify message to determine appropriate agent
   */
  private async classifyMessage(
    message: string,
    context?: Record<string, any>
  ): Promise<MessageClassification> {
    const prompt = `Classify this message for a casting platform and determine which AI agent should handle it.

Message: "${message}"
Context: ${JSON.stringify(context || {})}

Available agents:
1. talent_matching - Finding actors, talent recommendations, similarity searches
2. script_analysis - Analyzing scripts, extracting character details, understanding roles
3. scheduling - Audition scheduling, time slots, calendar management, conflicts
4. communication - Generating emails, messages, notifications, responses
5. analytics - Data insights, performance metrics, predictions, trends
6. general - General questions, help, information

Analyze and return JSON:
{
  "primaryAgent": "agent_name",
  "confidence": 0.0-1.0,
  "secondaryAgent": "optional_fallback_agent",
  "intent": "user_intent_summary",
  "entities": {
    "extractedEntities": "like dates, names, roles, etc"
  },
  "requiresContext": true/false
}`;
    
    const response = await withRetry(async () => {
      return await this.openai.chat.completions.create({
        model: AI_MODELS.chat,
        messages: [
          { 
            role: 'system', 
            content: 'You are a message classifier for a casting platform AI system. Accurately identify user intent and route to the correct specialized agent.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });
    });
    
    const content = response.choices[0].message.content;
    if (!content) {
      // Default to general agent if classification fails
      return {
        primaryAgent: AgentType.GENERAL,
        confidence: 0.5,
        intent: 'unknown',
        entities: {},
        requiresContext: false,
      };
    }
    
    const result = JSON.parse(content);
    return {
      primaryAgent: this.validateAgentType(result.primaryAgent),
      confidence: result.confidence || 0.7,
      secondaryAgent: result.secondaryAgent ? this.validateAgentType(result.secondaryAgent) : undefined,
      intent: result.intent || 'general_query',
      entities: result.entities || {},
      requiresContext: result.requiresContext || false,
    };
  }
  
  /**
   * Execute action with selected agent
   */
  private async executeAgentAction(
    classification: MessageClassification,
    input: RouterInputType
  ): Promise<any> {
    const { primaryAgent, entities } = classification;
    
    switch (primaryAgent) {
      case AgentType.TALENT_MATCHING:
        return await this.handleTalentMatching(input, entities);
        
      case AgentType.SCRIPT_ANALYSIS:
        return await this.handleScriptAnalysis(input, entities);
        
      case AgentType.SCHEDULING:
        return await this.handleScheduling(input, entities);
        
      case AgentType.COMMUNICATION:
        return await this.handleCommunication(input, entities);
        
      case AgentType.ANALYTICS:
        return await this.handleAnalytics(input, entities);
        
      case AgentType.GENERAL:
      default:
        return await this.handleGeneralQuery(input);
    }
  }
  
  /**
   * Handle talent matching requests
   */
  private async handleTalentMatching(
    input: RouterInputType,
    entities: Record<string, any>
  ): Promise<any> {
    // Extract requirements from message
    const requirements = this.extractTalentRequirements(input.message, entities);
    
    const result = await this.talentAgent.findMatches({
      requirements,
      characterDescription: input.message,
      limit: 10,
    });
    
    return {
      type: 'talent_matches',
      data: result,
      message: `Found ${result.matches.length} matching talents based on your requirements.`,
    };
  }
  
  /**
   * Handle script analysis requests
   */
  private async handleScriptAnalysis(
    input: RouterInputType,
    entities: Record<string, any>
  ): Promise<any> {
    const result = await this.scriptAgent.analyzeScript({
      scriptText: input.message,
      extractionType: entities.extractionType || 'characters',
      language: entities.language || 'en',
    });
    
    return {
      type: 'script_analysis',
      data: result,
      message: `Script analysis complete. Found ${result.analysis.characters.length} characters.`,
    };
  }
  
  /**
   * Handle scheduling requests
   */
  private async handleScheduling(
    input: RouterInputType,
    entities: Record<string, any>
  ): Promise<any> {
    const dateRange = this.extractDateRange(entities);
    
    const result = await this.schedulingAgent.optimizeSchedule({
      dateRange,
      location: entities.location,
      isOnline: entities.isOnline || false,
      duration: entities.duration || 30,
      breakDuration: 15,
      maxPerDay: 8,
    });
    
    return {
      type: 'schedule',
      data: result,
      message: `Created optimized schedule with ${result.schedule.length} slots across ${result.summary.totalDays} days.`,
    };
  }
  
  /**
   * Handle communication requests
   */
  private async handleCommunication(
    input: RouterInputType,
    entities: Record<string, any>
  ): Promise<any> {
    const messageType = this.determineMessageType(input.message, entities);
    
    const result = await this.communicationAgent.generateMessage({
      messageType: messageType as any,
      recipient: {
        name: entities.recipientName || 'Recipient',
        role: entities.recipientRole || 'talent',
      },
      context: {
        projectName: entities.projectName,
        roleName: entities.roleName,
        additionalInfo: entities,
      },
      tone: entities.tone || 'formal',
      language: entities.language || 'en',
      includeSignature: true,
    });
    
    return {
      type: 'generated_message',
      data: result,
      message: 'Message generated successfully.',
    };
  }
  
  /**
   * Handle analytics requests
   */
  private async handleAnalytics(
    input: RouterInputType,
    entities: Record<string, any>
  ): Promise<any> {
    const queryType = this.determineAnalyticsType(input.message, entities);
    
    const result = await this.analyticsAgent.analyze({
      queryType: queryType as any,
      projectId: entities.projectId,
      dateRange: this.extractDateRange(entities),
      filters: {
        role: entities.role,
        location: entities.location,
        gender: entities.gender,
      },
      format: 'summary',
    });
    
    return {
      type: 'analytics',
      data: result,
      message: `Analytics report generated with ${result.insights.length} insights and ${result.recommendations.length} recommendations.`,
    };
  }
  
  /**
   * Handle general queries
   */
  private async handleGeneralQuery(input: RouterInputType): Promise<any> {
    const response = await withRetry(async () => {
      return await this.openai.chat.completions.create({
        model: AI_MODELS.chat,
        messages: [
          { 
            role: 'system', 
            content: `You are CastMatch AI, a helpful assistant for the Mumbai casting industry. 
                     Provide informative, professional responses about casting, talent management, 
                     and the entertainment industry.` 
          },
          { role: 'user', content: input.message }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });
    });
    
    return {
      type: 'general_response',
      data: {
        message: response.choices[0].message.content,
      },
      message: response.choices[0].message.content,
    };
  }
  
  /**
   * Extract talent requirements from message
   */
  private extractTalentRequirements(message: string, entities: Record<string, any>): any {
    const requirements: any = {};
    
    // Extract age from message
    const ageMatch = message.match(/(\d+)[-\s]?(?:to|-)[-\s]?(\d+)[-\s]?(?:years?|yrs?)/i);
    if (ageMatch) {
      requirements.ageMin = parseInt(ageMatch[1]);
      requirements.ageMax = parseInt(ageMatch[2]);
    }
    
    // Extract gender
    if (/\b(male|man|actor)\b/i.test(message)) {
      requirements.gender = 'male';
    } else if (/\b(female|woman|actress)\b/i.test(message)) {
      requirements.gender = 'female';
    }
    
    // Extract languages
    const languages = [];
    if (/hindi/i.test(message)) languages.push('Hindi');
    if (/english/i.test(message)) languages.push('English');
    if (/marathi/i.test(message)) languages.push('Marathi');
    if (languages.length > 0) {
      requirements.languages = languages;
    }
    
    // Merge with entities
    return { ...requirements, ...entities };
  }
  
  /**
   * Extract date range from entities
   */
  private extractDateRange(entities: Record<string, any>): { start: string; end: string } {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return {
      start: entities.startDate || now.toISOString(),
      end: entities.endDate || weekFromNow.toISOString(),
    };
  }
  
  /**
   * Determine message type for communication
   */
  private determineMessageType(message: string, entities: Record<string, any>): string {
    if (/audition|invite/i.test(message)) return 'audition_invitation';
    if (/select|chosen|congratulat/i.test(message)) return 'selection_notification';
    if (/reject|sorry|unfortunate/i.test(message)) return 'rejection_notification';
    if (/reschedul|change|update.*time/i.test(message)) return 'schedule_update';
    if (/remind|don't forget/i.test(message)) return 'reminder';
    if (/thank/i.test(message)) return 'thank_you';
    return 'general_update';
  }
  
  /**
   * Determine analytics query type
   */
  private determineAnalyticsType(message: string, entities: Record<string, any>): string {
    if (/talent|actor|performer/i.test(message)) return 'talent_insights';
    if (/project|production|film/i.test(message)) return 'project_performance';
    if (/trend|market|demand/i.test(message)) return 'market_trends';
    if (/divers|inclusion|representation/i.test(message)) return 'diversity_metrics';
    if (/cost|budget|expense/i.test(message)) return 'cost_analysis';
    if (/predict|forecast|future/i.test(message)) return 'success_prediction';
    return 'project_performance';
  }
  
  /**
   * Validate agent type
   */
  private validateAgentType(agent: string): AgentType {
    const validAgents = Object.values(AgentType);
    const normalizedAgent = agent?.toLowerCase().replace(/-/g, '_');
    
    if (validAgents.includes(normalizedAgent as AgentType)) {
      return normalizedAgent as AgentType;
    }
    
    return AgentType.GENERAL;
  }
}