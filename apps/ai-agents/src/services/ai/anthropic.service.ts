/**
 * Anthropic Service for CastMatch AI Agents  
 * Handles Claude API interactions for advanced reasoning tasks
 */

import Anthropic from '@anthropic-ai/sdk';
import { logger, logAIRequest, logAIResponse } from '../../utils/logger.js';
import { AIServiceError } from '../../middleware/errorHandler.js';
import { config } from '../../config/config.js';

export class AnthropicService {
  private client: Anthropic;
  private retryAttempts = 3;
  private retryDelay = 1000;

  constructor(apiKey: string) {
    this.client = new Anthropic({
      apiKey,
      timeout: config.requestTimeoutMs,
    });
  }

  /**
   * Health check for Anthropic service
   */
  async healthCheck(): Promise<void> {
    try {
      // Test with a minimal message
      await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }],
      });
      logger.info('Anthropic service health check passed');
    } catch (error: any) {
      logger.error('Anthropic service health check failed', error);
      throw new AIServiceError(`Anthropic service unavailable: ${error.message}`, 'anthropic');
    }
  }

  /**
   * Generate message with Claude
   */
  async generateMessage(
    messages: Anthropic.Messages.MessageParam[],
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    } = {}
  ): Promise<string> {
    const startTime = Date.now();
    const requestId = `claude_${Date.now()}`;
    
    logAIRequest('claude_message', {
      requestId,
      model: options.model || config.ai.anthropic.model,
      messageCount: messages.length
    });

    let attempt = 0;
    while (attempt < this.retryAttempts) {
      try {
        const messageParams: Anthropic.Messages.MessageCreateParamsNonStreaming = {
          model: options.model || config.ai.anthropic.model,
          messages,
          max_tokens: options.maxTokens || config.ai.anthropic.maxTokens,
          temperature: options.temperature ?? config.ai.anthropic.temperature,
        };

        // Add system prompt if provided
        if (options.systemPrompt) {
          messageParams.system = options.systemPrompt;
        }

        const response = await this.client.messages.create(messageParams);
        
        const content = response.content[0];
        const textResponse = content.type === 'text' ? content.text : '';
        const duration = Date.now() - startTime;

        logAIResponse('claude_message', duration, {
          requestId,
          responseLength: textResponse.length,
          tokensUsed: response.usage?.input_tokens + response.usage?.output_tokens || 0
        });

        return textResponse;

      } catch (error: any) {
        attempt++;
        
        // Handle rate limits
        if (error.status === 429 && attempt < this.retryAttempts) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          logger.warn(`Anthropic rate limited, retrying in ${delay}ms`, { attempt, requestId });
          await this.sleep(delay);
          continue;
        }

        // Handle server errors
        if (error.status >= 500 && attempt < this.retryAttempts) {
          const delay = this.retryDelay * attempt;
          logger.warn(`Anthropic server error, retrying in ${delay}ms`, { attempt, requestId });
          await this.sleep(delay);
          continue;
        }

        logger.error('Anthropic API error', { error: error.message, requestId, attempt });
        throw new AIServiceError(`Anthropic API error: ${error.message}`, 'anthropic');
      }
    }

    throw new AIServiceError('Anthropic API failed after all retry attempts', 'anthropic');
  }

  /**
   * Analyze talent profiles for matching
   */
  async analyzeTalentMatch(
    roleRequirements: any,
    talentProfiles: any[]
  ): Promise<any> {
    const systemPrompt = `You are an expert casting director with deep knowledge of the Mumbai entertainment industry. Analyze talent profiles against role requirements and provide detailed matching scores and reasoning.

Consider:
1. Physical attributes and age range compatibility
2. Acting experience and skill level
3. Language proficiency requirements
4. Previous work relevance  
5. Availability and location
6. Cultural fit for the project
7. Chemistry potential with other cast members

Provide detailed analysis with scores (0-100) and specific reasoning for each candidate.`;

    const userMessage = `
Role Requirements:
${JSON.stringify(roleRequirements, null, 2)}

Talent Profiles to Evaluate:
${JSON.stringify(talentProfiles, null, 2)}

Analyze each talent's suitability for this role and rank them with detailed reasoning.`;

    const response = await this.generateMessage(
      [{ role: 'user', content: userMessage }],
      {
        systemPrompt,
        temperature: 0.2, // Low temperature for consistent scoring
        maxTokens: 3000
      }
    );

    try {
      return JSON.parse(response);
    } catch {
      return {
        analysis: response,
        candidates: [],
        analysisType: 'text_format'
      };
    }
  }

  /**
   * Generate decision support analysis
   */
  async generateDecisionSupport(
    projectContext: any,
    candidates: any[],
    criteria: string[]
  ): Promise<any> {
    const systemPrompt = `You are a strategic casting consultant providing data-driven decision support for film and OTT projects. Analyze candidates comprehensively and provide actionable insights for casting decisions.

Focus on:
1. ROI analysis based on candidate profiles
2. Risk assessment for each choice
3. Market appeal and audience connection
4. Budget implications
5. Schedule compatibility
6. Chemistry and ensemble dynamics
7. Alternative recommendations

Provide clear pros/cons and strategic recommendations.`;

    const userMessage = `
Project Context:
${JSON.stringify(projectContext, null, 2)}

Candidates for Analysis:
${JSON.stringify(candidates, null, 2)}

Decision Criteria:
${criteria.join(', ')}

Provide comprehensive decision support with strategic recommendations.`;

    const response = await this.generateMessage(
      [{ role: 'user', content: userMessage }],
      {
        systemPrompt,
        temperature: 0.3,
        maxTokens: 4000
      }
    );

    try {
      return JSON.parse(response);
    } catch {
      return {
        analysis: response,
        recommendations: [],
        analysisType: 'text_format'
      };
    }
  }

  /**
   * Optimize audition scheduling
   */
  async optimizeScheduling(
    auditions: any[],
    constraints: any
  ): Promise<any> {
    const systemPrompt = `You are a scheduling optimization expert specializing in casting and production logistics. Create optimal audition schedules considering all constraints and efficiency factors.

Optimize for:
1. Minimizing travel time between venues
2. Talent availability windows  
3. Casting team preferences
4. Buffer time between auditions
5. Emergency slots for adjustments
6. Grouping by character types
7. VIP and priority scheduling

Generate practical, executable schedules with contingency plans.`;

    const userMessage = `
Auditions to Schedule:
${JSON.stringify(auditions, null, 2)}

Scheduling Constraints:
${JSON.stringify(constraints, null, 2)}

Create an optimized schedule with detailed timing and logistics.`;

    const response = await this.generateMessage(
      [{ role: 'user', content: userMessage }],
      {
        systemPrompt,
        temperature: 0.1, // Very low temperature for consistent scheduling
        maxTokens: 3000
      }
    );

    try {
      return JSON.parse(response);
    } catch {
      return {
        schedule: [],
        optimization: response,
        analysisType: 'text_format'
      };
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}