/**
 * ULTRA-SIMPLE AI Chat Service
 * Direct OpenAI integration - NO COMPLEXITY
 */

import OpenAI from 'openai';
import { db } from '../db/client';
import { conversations, messages } from '../models/schema';
import { eq, desc } from 'drizzle-orm';
import { logger } from '../utils/logger';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export class SimpleChatService {
  private readonly MODEL = 'gpt-3.5-turbo';
  
  /**
   * Simple chat - takes message, returns response
   */
  async chat(userId: string, message: string): Promise<{
    userMessage: string;
    aiResponse: string;
    conversationId: string;
  }> {
    try {
      // Get or create conversation
      let conversation = await db
        .select()
        .from(conversations)
        .where(eq(conversations.userId, userId))
        .orderBy(desc(conversations.updatedAt))
        .limit(1);

      let conversationId: string;
      
      if (conversation.length === 0) {
        // Create new conversation
        const [newConv] = await db
          .insert(conversations)
          .values({
            userId,
            title: 'Chat Session',
            isActive: true,
            messageCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        conversationId = newConv.id;
      } else {
        conversationId = conversation[0].id;
      }

      // Store user message
      await db.insert(messages).values({
        conversationId,
        userId,
        content: message,
        type: 'text',
        isAiResponse: false,
        createdAt: new Date(),
      });

      // Get last 5 messages for context
      const history = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(desc(messages.createdAt))
        .limit(5);

      // Build messages for OpenAI
      const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: `You are a helpful AI assistant for CastMatch, a casting platform for the Mumbai entertainment industry. 
Help casting directors find talent, manage auditions, and answer questions about actors and productions.
Be concise, professional, and culturally aware of Bollywood and Indian entertainment practices.`,
        },
      ];

      // Add history (reversed to chronological order)
      history.reverse().forEach(msg => {
        chatMessages.push({
          role: msg.isAiResponse ? 'assistant' : 'user',
          content: msg.content,
        });
      });

      // Add current message if not in history
      if (!history.find(h => h.content === message)) {
        chatMessages.push({
          role: 'user',
          content: message,
        });
      }

      // Call OpenAI
      const completion = await openai.chat.completions.create({
        model: this.MODEL,
        messages: chatMessages,
        max_tokens: 500,
        temperature: 0.7,
      });

      const aiResponse = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

      // Store AI response
      await db.insert(messages).values({
        conversationId,
        userId: null,
        content: aiResponse,
        type: 'text',
        isAiResponse: true,
        metadata: {
          model: this.MODEL,
          tokens: completion.usage,
        },
        createdAt: new Date(),
      });

      // Update conversation
      await db
        .update(conversations)
        .set({
          lastMessageAt: new Date(),
          messageCount: (conversation[0]?.messageCount || 0) + 2,
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, conversationId));

      logger.info(`Chat processed for user ${userId}`);

      return {
        userMessage: message,
        aiResponse,
        conversationId,
      };
    } catch (error: any) {
      logger.error('Chat error:', error);
      
      // Fallback response if OpenAI fails
      if (error.message?.includes('api_key')) {
        throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
      }
      
      throw new Error('Failed to process chat. Please try again.');
    }
  }

  /**
   * Get conversation history
   */
  async getHistory(userId: string, conversationId: string, limit: number = 20): Promise<any[]> {
    try {
      const history = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(desc(messages.createdAt))
        .limit(limit);

      return history.reverse(); // Return in chronological order
    } catch (error) {
      logger.error('Failed to get history:', error);
      return [];
    }
  }
}

// Export singleton
export const simpleChatService = new SimpleChatService();