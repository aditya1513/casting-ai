/**
 * Conversation Management Service
 * Manages chat history, context preservation, and user-specific threads
 */

import { z } from 'zod';
import { db } from '../../db/client';
import { conversations, messages, memories, users } from '../../models/schema';
import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { AgentRouter, AgentType } from './agent-router';
import { rateLimiter } from './config';
import { logger } from '../../utils/logger';
import { Redis } from 'ioredis';

// Conversation input schemas
export const CreateConversationInput = z.object({
  userId: z.string().uuid(),
  title: z.string().optional(),
  description: z.string().optional(),
  initialContext: z.record(z.any()).optional(),
});

export const SendMessageInput = z.object({
  conversationId: z.string().uuid(),
  userId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  type: z.enum(['text', 'image', 'document']).default('text'),
  metadata: z.record(z.any()).optional(),
  preferredAgent: z.nativeEnum(AgentType).optional(),
});

export const GetConversationInput = z.object({
  conversationId: z.string().uuid(),
  userId: z.string().uuid(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

// Types
export type CreateConversationInputType = z.infer<typeof CreateConversationInput>;
export type SendMessageInputType = z.infer<typeof SendMessageInput>;
export type GetConversationInputType = z.infer<typeof GetConversationInput>;

export class ConversationService {
  private agentRouter = new AgentRouter();
  private redis: Redis | null = null;
  
  constructor(redisClient?: Redis) {
    this.redis = redisClient || null;
  }
  
  /**
   * Create a new conversation
   */
  async createConversation(input: CreateConversationInputType): Promise<{
    id: string;
    title: string;
    createdAt: Date;
  }> {
    try {
      // Generate title if not provided
      const title = input.title || `Conversation ${new Date().toLocaleDateString()}`;
      
      const [conversation] = await db
        .insert(conversations)
        .values({
          userId: input.userId,
          title,
          description: input.description,
          context: input.initialContext || {},
          isActive: true,
          messageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      
      // Cache conversation context in Redis if available
      if (this.redis) {
        await this.redis.setex(
          `conversation:${conversation.id}:context`,
          3600, // 1 hour TTL
          JSON.stringify(conversation.context)
        );
      }
      
      logger.info(`Created conversation ${conversation.id} for user ${input.userId}`);
      
      return {
        id: conversation.id,
        title: conversation.title || title,
        createdAt: conversation.createdAt,
      };
    } catch (error) {
      logger.error('Failed to create conversation:', error);
      throw error;
    }
  }
  
  /**
   * Send a message in a conversation
   */
  async sendMessage(input: SendMessageInputType): Promise<{
    messageId: string;
    response: any;
    agent: AgentType;
    processingTime: number;
  }> {
    const startTime = Date.now();
    
    try {
      // Check rate limits
      if (!rateLimiter.canMakeRequest(input.userId)) {
        throw new Error('Rate limit exceeded. Please wait before sending another message.');
      }
      
      // Verify conversation ownership
      const conversation = await this.getConversationById(input.conversationId, input.userId);
      if (!conversation) {
        throw new Error('Conversation not found or access denied');
      }
      
      // Store user message
      const [userMessage] = await db
        .insert(messages)
        .values({
          conversationId: input.conversationId,
          userId: input.userId,
          type: input.type as any,
          content: input.content,
          metadata: input.metadata,
          isAiResponse: false,
          createdAt: new Date(),
        })
        .returning();
      
      // Get conversation context
      const context = await this.getConversationContext(input.conversationId);
      
      // Route message to appropriate agent
      const agentResponse = await this.agentRouter.routeMessage({
        message: input.content,
        conversationId: input.conversationId,
        userId: input.userId,
        context,
        preferredAgent: input.preferredAgent,
      });
      
      // Store AI response
      const [aiMessage] = await db
        .insert(messages)
        .values({
          conversationId: input.conversationId,
          userId: null, // AI message
          type: 'text',
          content: JSON.stringify(agentResponse.response),
          metadata: {
            agent: agentResponse.agent,
            confidence: agentResponse.metadata.confidence,
            intent: agentResponse.metadata.intent,
          },
          isAiResponse: true,
          parentMessageId: userMessage.id,
          createdAt: new Date(),
        })
        .returning();
      
      // Update conversation metadata
      await this.updateConversationMetadata(input.conversationId, agentResponse);
      
      // Store important information in memory
      await this.storeMemory(input.conversationId, input.userId, agentResponse);
      
      // Record usage for rate limiting
      const processingTime = Date.now() - startTime;
      rateLimiter.recordRequest(input.userId, 100); // Approximate token count
      
      return {
        messageId: aiMessage.id,
        response: agentResponse.response,
        agent: agentResponse.agent,
        processingTime,
      };
    } catch (error) {
      logger.error('Failed to send message:', error);
      throw error;
    }
  }
  
  /**
   * Get conversation by ID
   */
  private async getConversationById(conversationId: string, userId: string): Promise<any> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, userId),
          eq(conversations.isActive, true)
        )
      )
      .limit(1);
    
    return conversation;
  }
  
  /**
   * Get conversation history
   */
  async getConversationHistory(input: GetConversationInputType): Promise<{
    conversation: any;
    messages: any[];
    hasMore: boolean;
  }> {
    try {
      // Get conversation
      const conversation = await this.getConversationById(input.conversationId, input.userId);
      if (!conversation) {
        throw new Error('Conversation not found or access denied');
      }
      
      // Get messages
      const messagesQuery = await db
        .select({
          id: messages.id,
          type: messages.type,
          content: messages.content,
          metadata: messages.metadata,
          isAiResponse: messages.isAiResponse,
          createdAt: messages.createdAt,
          userName: users.firstName,
        })
        .from(messages)
        .leftJoin(users, eq(messages.userId, users.id))
        .where(
          and(
            eq(messages.conversationId, input.conversationId),
            isNull(messages.deletedAt)
          )
        )
        .orderBy(desc(messages.createdAt))
        .limit(input.limit + 1)
        .offset(input.offset);
      
      const hasMore = messagesQuery.length > input.limit;
      const messageList = messagesQuery.slice(0, input.limit).reverse();
      
      return {
        conversation: {
          id: conversation.id,
          title: conversation.title,
          description: conversation.description,
          createdAt: conversation.createdAt,
          messageCount: conversation.messageCount,
        },
        messages: messageList,
        hasMore,
      };
    } catch (error) {
      logger.error('Failed to get conversation history:', error);
      throw error;
    }
  }
  
  /**
   * Get conversation context
   */
  private async getConversationContext(conversationId: string): Promise<any> {
    // Try to get from Redis cache first
    if (this.redis) {
      const cached = await this.redis.get(`conversation:${conversationId}:context`);
      if (cached) {
        return JSON.parse(cached);
      }
    }
    
    // Get from database
    const [conversation] = await db
      .select({ context: conversations.context })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);
    
    // Get recent messages for context
    const recentMessages = await db
      .select({
        content: messages.content,
        isAiResponse: messages.isAiResponse,
      })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(10);
    
    // Get relevant memories
    const relevantMemories = await db
      .select({
        key: memories.key,
        value: memories.value,
      })
      .from(memories)
      .where(eq(memories.conversationId, conversationId))
      .orderBy(desc(memories.importance))
      .limit(5);
    
    const context = {
      ...conversation?.context,
      recentMessages: recentMessages.reverse(),
      memories: relevantMemories,
    };
    
    // Cache in Redis
    if (this.redis) {
      await this.redis.setex(
        `conversation:${conversationId}:context`,
        3600,
        JSON.stringify(context)
      );
    }
    
    return context;
  }
  
  /**
   * Update conversation metadata
   */
  private async updateConversationMetadata(
    conversationId: string,
    agentResponse: any
  ): Promise<void> {
    await db
      .update(conversations)
      .set({
        lastMessageAt: new Date(),
        messageCount: sql`${conversations.messageCount} + 2`, // User + AI messages
        context: sql`jsonb_set(
          COALESCE(${conversations.context}, '{}'), 
          '{lastAgent}', 
          '"${agentResponse.agent}"'
        )`,
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversationId));
  }
  
  /**
   * Store important information in memory
   */
  private async storeMemory(
    conversationId: string,
    userId: string,
    agentResponse: any
  ): Promise<void> {
    try {
      // Determine what to store based on agent type
      const memoryData = this.extractMemoryData(agentResponse);
      
      if (memoryData.length === 0) return;
      
      // Store memories
      for (const memory of memoryData) {
        await db
          .insert(memories)
          .values({
            userId,
            conversationId,
            type: memory.type as any,
            category: memory.category,
            key: memory.key,
            value: memory.value,
            importance: memory.importance,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [memories.userId, memories.key],
            set: {
              value: memory.value,
              importance: memory.importance,
              accessCount: sql`${memories.accessCount} + 1`,
              lastAccessedAt: new Date(),
              updatedAt: new Date(),
            },
          });
      }
    } catch (error) {
      logger.error('Failed to store memory:', error);
      // Don't throw - memory storage failure shouldn't break the conversation
    }
  }
  
  /**
   * Extract memory data from agent response
   */
  private extractMemoryData(agentResponse: any): any[] {
    const memories = [];
    const { agent, response } = agentResponse;
    
    switch (agent) {
      case AgentType.TALENT_MATCHING:
        if (response.data?.searchCriteria) {
          memories.push({
            type: 'semantic',
            category: 'preference',
            key: 'talent_search_criteria',
            value: response.data.searchCriteria,
            importance: '0.8',
          });
        }
        break;
        
      case AgentType.SCRIPT_ANALYSIS:
        if (response.data?.analysis?.characters) {
          memories.push({
            type: 'semantic',
            category: 'requirement',
            key: 'script_characters',
            value: response.data.analysis.characters,
            importance: '0.9',
          });
        }
        break;
        
      case AgentType.SCHEDULING:
        if (response.data?.schedule) {
          memories.push({
            type: 'episodic',
            category: 'context',
            key: 'audition_schedule',
            value: response.data.schedule,
            importance: '0.7',
          });
        }
        break;
        
      case AgentType.ANALYTICS:
        if (response.data?.insights) {
          memories.push({
            type: 'semantic',
            category: 'context',
            key: 'analytics_insights',
            value: response.data.insights,
            importance: '0.6',
          });
        }
        break;
    }
    
    return memories;
  }
  
  /**
   * Get user's conversations
   */
  async getUserConversations(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{
    conversations: any[];
    total: number;
  }> {
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(conversations)
      .where(
        and(
          eq(conversations.userId, userId),
          eq(conversations.isActive, true)
        )
      );
    
    const conversationList = await db
      .select({
        id: conversations.id,
        title: conversations.title,
        description: conversations.description,
        lastMessageAt: conversations.lastMessageAt,
        messageCount: conversations.messageCount,
        createdAt: conversations.createdAt,
      })
      .from(conversations)
      .where(
        and(
          eq(conversations.userId, userId),
          eq(conversations.isActive, true)
        )
      )
      .orderBy(desc(conversations.lastMessageAt))
      .limit(limit)
      .offset(offset);
    
    return {
      conversations: conversationList,
      total: totalResult.count,
    };
  }
  
  /**
   * Delete conversation
   */
  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    await db
      .update(conversations)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, userId)
        )
      );
    
    // Clear Redis cache
    if (this.redis) {
      await this.redis.del(`conversation:${conversationId}:context`);
    }
  }
  
  /**
   * Search conversations
   */
  async searchConversations(
    userId: string,
    query: string,
    limit: number = 10
  ): Promise<any[]> {
    const results = await db
      .select({
        conversationId: messages.conversationId,
        conversationTitle: conversations.title,
        messageContent: messages.content,
        messageDate: messages.createdAt,
      })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(
        and(
          eq(conversations.userId, userId),
          eq(conversations.isActive, true),
          sql`${messages.content} ILIKE ${'%' + query + '%'}`
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(limit);
    
    return results;
  }
}