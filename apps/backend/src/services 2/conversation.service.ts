/**
 * Conversation Service
 * Manages chat conversations and their metadata
 */

import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../config/database';
import { conversations, messages, type Conversation, type NewConversation } from '../models/schema.business';
import { CacheManager, CacheKeys } from '../config/redis';
import { logger } from '../utils/logger';
import { AppError, NotFoundError, ForbiddenError } from '../utils/errors';

interface CreateConversationInput {
  userId: string;
  title?: string;
  description?: string;
  context?: any;
}

interface UpdateConversationInput {
  title?: string;
  description?: string;
  context?: any;
  isActive?: boolean;
}

interface ConversationWithStats extends Conversation {
  unreadCount?: number;
  lastMessage?: any;
}

export class ConversationService {
  /**
   * Create a new conversation
   */
  async createConversation(input: CreateConversationInput): Promise<Conversation> {
    try {
      const { userId, title, description, context } = input;
      
      // Generate default title if not provided
      const conversationTitle = title || `Conversation ${new Date().toLocaleDateString()}`;
      
      const [conversation] = await db
        .insert(conversations)
        .values({
          userId,
          title: conversationTitle,
          description,
          context: context || {},
          isActive: true,
          messageCount: 0,
        })
        .returning();
      
      // Cache the conversation
      await CacheManager.set(
        `conversation:${conversation.id}`,
        conversation,
        3600 // 1 hour
      );
      
      logger.info(`Conversation created: ${conversation.id} for user: ${userId}`);
      return conversation;
    } catch (error) {
      logger.error('Error creating conversation:', error);
      throw new AppError('Failed to create conversation', 500);
    }
  }
  
  /**
   * Get conversation by ID
   */
  async getConversationById(conversationId: string, userId?: string): Promise<Conversation | null> {
    try {
      // Try to get from cache first
      const cached = await CacheManager.get<Conversation>(`conversation:${conversationId}`);
      if (cached) {
        // Verify user access if userId provided
        if (userId && cached.userId !== userId) {
          throw new ForbiddenError('Access denied to this conversation');
        }
        return cached;
      }
      
      // Get from database
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);
      
      if (!conversation) {
        return null;
      }
      
      // Verify user access if userId provided
      if (userId && conversation.userId !== userId) {
        throw new ForbiddenError('Access denied to this conversation');
      }
      
      // Cache the result
      await CacheManager.set(
        `conversation:${conversationId}`,
        conversation,
        3600
      );
      
      return conversation;
    } catch (error) {
      if (error instanceof ForbiddenError) throw error;
      logger.error('Error getting conversation:', error);
      throw new AppError('Failed to get conversation', 500);
    }
  }
  
  /**
   * Get user's conversations
   */
  async getUserConversations(
    userId: string,
    page: number = 1,
    limit: number = 20,
    includeInactive: boolean = false
  ): Promise<{ conversations: ConversationWithStats[]; total: number }> {
    try {
      const offset = (page - 1) * limit;
      
      // Build query conditions
      const conditions = [eq(conversations.userId, userId)];
      if (!includeInactive) {
        conditions.push(eq(conversations.isActive, true));
      }
      
      // Get conversations with last message
      const conversationList = await db
        .select()
        .from(conversations)
        .where(and(...conditions))
        .orderBy(desc(conversations.lastMessageAt), desc(conversations.createdAt))
        .limit(limit)
        .offset(offset);
      
      // Get total count
      const [{ count }] = await db
        .select({ count: sql`count(*)::int` })
        .from(conversations)
        .where(and(...conditions));
      
      // Enhance with additional stats (could be optimized with a single query)
      const enhancedConversations: ConversationWithStats[] = await Promise.all(
        conversationList.map(async (conv) => {
          // Get last message
          const [lastMessage] = await db
            .select()
            .from(messages)
            .where(eq(messages.conversationId, conv.id))
            .orderBy(desc(messages.createdAt))
            .limit(1);
          
          return {
            ...conv,
            lastMessage,
          };
        })
      );
      
      return {
        conversations: enhancedConversations,
        total: count,
      };
    } catch (error) {
      logger.error('Error getting user conversations:', error);
      throw new AppError('Failed to get conversations', 500);
    }
  }
  
  /**
   * Update conversation
   */
  async updateConversation(
    conversationId: string,
    userId: string,
    updates: UpdateConversationInput
  ): Promise<Conversation> {
    try {
      // Verify ownership
      const conversation = await this.getConversationById(conversationId, userId);
      if (!conversation) {
        throw new NotFoundError('Conversation not found');
      }
      
      const [updatedConversation] = await db
        .update(conversations)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, conversationId))
        .returning();
      
      // Invalidate cache
      await CacheManager.delete(`conversation:${conversationId}`);
      
      logger.info(`Conversation updated: ${conversationId}`);
      return updatedConversation;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError) throw error;
      logger.error('Error updating conversation:', error);
      throw new AppError('Failed to update conversation', 500);
    }
  }
  
  /**
   * Delete conversation (soft delete)
   */
  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    try {
      // Verify ownership
      const conversation = await this.getConversationById(conversationId, userId);
      if (!conversation) {
        throw new NotFoundError('Conversation not found');
      }
      
      // Soft delete by marking as inactive
      await db
        .update(conversations)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, conversationId));
      
      // Invalidate cache
      await CacheManager.delete(`conversation:${conversationId}`);
      
      logger.info(`Conversation soft deleted: ${conversationId}`);
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError) throw error;
      logger.error('Error deleting conversation:', error);
      throw new AppError('Failed to delete conversation', 500);
    }
  }
  
  /**
   * Update last message timestamp
   */
  async updateLastMessage(conversationId: string): Promise<void> {
    try {
      await db
        .update(conversations)
        .set({
          lastMessageAt: new Date(),
          messageCount: sql`${conversations.messageCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, conversationId));
      
      // Invalidate cache
      await CacheManager.delete(`conversation:${conversationId}`);
    } catch (error) {
      logger.error('Error updating last message:', error);
      // Non-critical error, don't throw
    }
  }
  
  /**
   * Check if user has access to conversation
   */
  async userHasAccess(userId: string, conversationId: string): Promise<boolean> {
    try {
      const [conversation] = await db
        .select({ userId: conversations.userId })
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);
      
      return conversation?.userId === userId;
    } catch (error) {
      logger.error('Error checking conversation access:', error);
      return false;
    }
  }
  
  /**
   * Search conversations
   */
  async searchConversations(
    userId: string,
    query: string,
    limit: number = 10
  ): Promise<Conversation[]> {
    try {
      const searchResults = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.userId, userId),
            sql`(${conversations.title} ILIKE ${'%' + query + '%'} OR ${conversations.description} ILIKE ${'%' + query + '%'})`
          )
        )
        .orderBy(desc(conversations.lastMessageAt))
        .limit(limit);
      
      return searchResults;
    } catch (error) {
      logger.error('Error searching conversations:', error);
      throw new AppError('Failed to search conversations', 500);
    }
  }
  
  /**
   * Get conversation context
   */
  async getConversationContext(conversationId: string, userId: string): Promise<any> {
    try {
      const conversation = await this.getConversationById(conversationId, userId);
      if (!conversation) {
        throw new NotFoundError('Conversation not found');
      }
      
      return conversation.context || {};
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError) throw error;
      logger.error('Error getting conversation context:', error);
      throw new AppError('Failed to get conversation context', 500);
    }
  }
  
  /**
   * Update conversation context
   */
  async updateConversationContext(
    conversationId: string,
    userId: string,
    context: any
  ): Promise<void> {
    try {
      const conversation = await this.getConversationById(conversationId, userId);
      if (!conversation) {
        throw new NotFoundError('Conversation not found');
      }
      
      // Merge with existing context
      const updatedContext = {
        ...(conversation.context as any || {}),
        ...context,
      };
      
      await db
        .update(conversations)
        .set({
          context: updatedContext,
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, conversationId));
      
      // Invalidate cache
      await CacheManager.delete(`conversation:${conversationId}`);
      
      logger.info(`Conversation context updated: ${conversationId}`);
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError) throw error;
      logger.error('Error updating conversation context:', error);
      throw new AppError('Failed to update conversation context', 500);
    }
  }
  
  /**
   * Get conversation statistics
   */
  async getConversationStats(userId: string): Promise<{
    totalConversations: number;
    activeConversations: number;
    totalMessages: number;
    lastActivityAt: Date | null;
  }> {
    try {
      const stats = await db
        .select({
          totalConversations: sql`count(*)::int`,
          activeConversations: sql`sum(case when ${conversations.isActive} = true then 1 else 0 end)::int`,
          totalMessages: sql`sum(${conversations.messageCount})::int`,
          lastActivityAt: sql`max(${conversations.lastMessageAt})`,
        })
        .from(conversations)
        .where(eq(conversations.userId, userId));
      
      return stats[0] || {
        totalConversations: 0,
        activeConversations: 0,
        totalMessages: 0,
        lastActivityAt: null,
      };
    } catch (error) {
      logger.error('Error getting conversation stats:', error);
      throw new AppError('Failed to get conversation statistics', 500);
    }
  }
}

export const conversationService = new ConversationService();