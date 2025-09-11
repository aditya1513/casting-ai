/**
 * OpenAI Service for CastMatch AI Agents
 * Handles OpenAI API interactions with error handling and retries
 */

import OpenAI from 'openai';
import { logger, logAIRequest, logAIResponse } from '../../utils/logger.js';
import { AIServiceError } from '../../middleware/errorHandler.js';
import { config } from '../../config/config.js';

export class OpenAIService {
  private client: OpenAI;
  private retryAttempts = 3;
  private retryDelay = 1000; // 1 second

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      timeout: config.requestTimeoutMs,
    });
  }

  /**
   * Health check for OpenAI service
   */
  async healthCheck(): Promise<void> {
    try {
      // Simple API call to test connectivity
      await this.client.models.list();
      logger.info('OpenAI service health check passed');
    } catch (error: any) {
      logger.error('OpenAI service health check failed', error);
      throw new AIServiceError(`OpenAI service unavailable: ${error.message}`, 'openai');
    }
  }

  /**
   * Generate chat completion with retry logic
   */
  async generateChatCompletion(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    } = {}
  ): Promise<string> {
    const startTime = Date.now();
    const requestId = `openai_${Date.now()}`;
    
    logAIRequest('chat_completion', {
      requestId,
      model: options.model || config.ai.openai.model,
      messageCount: messages.length
    });

    let attempt = 0;
    while (attempt < this.retryAttempts) {
      try {
        // Add system prompt if provided
        const finalMessages = options.systemPrompt
          ? [{ role: 'system' as const, content: options.systemPrompt }, ...messages]
          : messages;

        const completion = await this.client.chat.completions.create({
          model: options.model || config.ai.openai.model,
          messages: finalMessages,
          temperature: options.temperature ?? config.ai.openai.temperature,
          max_tokens: options.maxTokens || config.ai.openai.maxTokens,
        });

        const response = completion.choices[0]?.message?.content || '';
        const duration = Date.now() - startTime;

        logAIResponse('chat_completion', duration, {
          requestId,
          responseLength: response.length,
          tokensUsed: completion.usage?.total_tokens || 0
        });

        return response;

      } catch (error: any) {
        attempt++;
        
        // Handle rate limits with exponential backoff
        if (error.status === 429 && attempt < this.retryAttempts) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          logger.warn(`OpenAI rate limited, retrying in ${delay}ms`, { attempt, requestId });
          await this.sleep(delay);
          continue;
        }

        // Handle other retryable errors
        if (error.status >= 500 && attempt < this.retryAttempts) {
          const delay = this.retryDelay * attempt;
          logger.warn(`OpenAI server error, retrying in ${delay}ms`, { attempt, requestId, status: error.status });
          await this.sleep(delay);
          continue;
        }

        logger.error('OpenAI API error', { error: error.message, requestId, attempt });
        throw new AIServiceError(`OpenAI API error: ${error.message}`, 'openai');
      }
    }

    throw new AIServiceError('OpenAI API failed after all retry attempts', 'openai');
  }

  /**
   * Generate embeddings for vector search
   */
  async generateEmbeddings(text: string): Promise<number[]> {
    const startTime = Date.now();
    const requestId = `openai_embed_${Date.now()}`;
    
    logAIRequest('embeddings', { requestId, textLength: text.length });

    try {
      const embedding = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      const result = embedding.data[0]?.embedding || [];
      const duration = Date.now() - startTime;

      logAIResponse('embeddings', duration, {
        requestId,
        dimensionality: result.length,
        tokensUsed: embedding.usage?.total_tokens || 0
      });

      return result;

    } catch (error: any) {
      logger.error('OpenAI embeddings error', { error: error.message, requestId });
      throw new AIServiceError(`OpenAI embeddings error: ${error.message}`, 'openai');
    }
  }

  /**
   * Analyze script content
   */
  async analyzeScript(scriptContent: string, context?: any): Promise<any> {
    const systemPrompt = `You are a professional script analyst specializing in Indian film and OTT content. Analyze the provided script and extract comprehensive information about characters, scenes, and casting requirements.

Focus on:
1. Character profiles with detailed descriptions
2. Age ranges, physical attributes, and personality traits  
3. Screen time and importance rankings
4. Language requirements (Hindi, English, regional languages)
5. Special skills or experience needed
6. Mumbai/regional casting considerations

Provide analysis in structured JSON format.`;

    const userMessage = `Analyze this script content and extract character information for casting purposes:\n\n${scriptContent}`;

    const response = await this.generateChatCompletion(
      [{ role: 'user', content: userMessage }],
      {
        systemPrompt,
        temperature: 0.3, // Lower temperature for more consistent analysis
        maxTokens: 2000
      }
    );

    try {
      return JSON.parse(response);
    } catch {
      // If JSON parsing fails, return structured response
      return {
        characters: [],
        summary: response,
        analysisType: 'text_format',
        context
      };
    }
  }

  /**
   * Generate casting communication
   */
  async generateCommunication(
    type: string,
    context: any
  ): Promise<{ message: string; subject?: string }> {
    const systemPrompt = `You are a professional casting director's assistant. Generate appropriate communication messages for talent and production teams. Use a professional, friendly tone suitable for the Mumbai entertainment industry.

Message types:
- invitation: Audition invitations
- rejection: Polite rejection messages  
- callback: Callback notifications
- update: Project updates
- reminder: Audition reminders

Include cultural sensitivity for the Indian market and maintain professionalism.`;

    const userMessage = `Generate a ${type} message with this context: ${JSON.stringify(context)}`;

    const response = await this.generateChatCompletion(
      [{ role: 'user', content: userMessage }],
      {
        systemPrompt,
        temperature: 0.5
      }
    );

    return {
      message: response,
      subject: `CastMatch - ${type.charAt(0).toUpperCase() + type.slice(1)} Notification`
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}