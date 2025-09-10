/**
 * Message Service
 * Handles chat messages within conversations
 */

import { eq, desc, and, sql, lt, gt } from 'drizzle-orm';
import { db } from '../config/database';
import { messages, conversations, type Message, type NewMessage } from '../models/schema.business';
import { CacheManager } from '../config/redis';
import { logger } from '../utils/logger';
import { AppError, NotFoundError, ForbiddenError } from '../utils/errors';
import { getSocketServer } from '../websocket/socketServer';

interface CreateMessageInput {
  conversationId: string;
  userId: string;
  content: string;
  type?: 'text' | 'image' | 'video' | 'audio' | 'document' | 'system';
  metadata?: any;
  isAiResponse?: boolean;
  parentMessageId?: string;
}

interface MessageWithUser extends Message {
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    profilePicture: string | null;
  };
}

export class MessageService {
  /**
   * Create a new message
   */
  async createMessage(input: CreateMessageInput): Promise<Message> {
    try {
      const {
        conversationId,
        userId,
        content,
        type = 'text',
        metadata,
        isAiResponse = false,
        parentMessageId,
      } = input;
      
      // Verify conversation exists and user has access
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);
      
      if (!conversation) {
        throw new NotFoundError('Conversation not found');
      }
      
      if (!isAiResponse && conversation.userId !== userId) {
        throw new ForbiddenError('Access denied to this conversation');
      }
      
      // Create message
      const [message] = await db
        .insert(messages)
        .values({
          conversationId,
          userId: isAiResponse ? null : userId,
          content,
          type: type as any,
          metadata,
          isAiResponse,
          parentMessageId,
        })
        .returning();
      
      // Update conversation stats
      await db
        .update(conversations)
        .set({
          lastMessageAt: new Date(),
          messageCount: sql`${conversations.messageCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, conversationId));
      
      logger.info(`Message created in conversation: ${conversationId}`);
      return message;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError) throw error;
      logger.error('Error creating message:', error);
      throw new AppError('Failed to create message', 500);
    }
  }
  
  /**
   * Get message by ID
   */
  async getMessageById(messageId: string): Promise<Message | null> {
    try {
      const [message] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);
      
      return message || null;
    } catch (error) {
      logger.error('Error getting message:', error);
      throw new AppError('Failed to get message', 500);
    }
  }
  
  /**
   * Get conversation messages with pagination
   */
  async getConversationMessages(
    conversationId: string,
    userId: string,
    page: number = 1,
    limit: number = 50,
    beforeMessageId?: string
  ): Promise<{ messages: MessageWithUser[]; hasMore: boolean }> {
    try {
      // Verify user has access to conversation
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);
      
      if (!conversation || conversation.userId !== userId) {
        throw new ForbiddenError('Access denied to this conversation');
      }
      
      // Build query conditions
      const conditions = [
        eq(messages.conversationId, conversationId),
        messages.deletedAt === null,
      ];
      
      // If beforeMessageId provided, get messages before that message
      if (beforeMessageId) {
        const [referenceMessage] = await db
          .select({ createdAt: messages.createdAt })
          .from(messages)
          .where(eq(messages.id, beforeMessageId))
          .limit(1);
        
        if (referenceMessage) {
          conditions.push(lt(messages.createdAt, referenceMessage.createdAt));
        }
      }
      
      // Get messages with user info
      const messageList = await db
        .select()
        .from(messages)
        .where(and(...conditions))
        .orderBy(desc(messages.createdAt))
        .limit(limit + 1); // Get one extra to check if there are more
      
      const hasMore = messageList.length > limit;
      const returnMessages = hasMore ? messageList.slice(0, -1) : messageList;
      
      // Reverse to get chronological order
      returnMessages.reverse();
      
      return {
        messages: returnMessages as MessageWithUser[],
        hasMore,
      };
    } catch (error) {
      if (error instanceof ForbiddenError) throw error;
      logger.error('Error getting conversation messages:', error);
      throw new AppError('Failed to get messages', 500);
    }
  }
  
  /**
   * Get recent messages
   */
  async getRecentMessages(
    conversationId: string,
    limit: number = 50
  ): Promise<Message[]> {
    try {
      const messageList = await db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conversationId),
            messages.deletedAt === null
          )
        )
        .orderBy(desc(messages.createdAt))
        .limit(limit);
      
      // Reverse to get chronological order
      messageList.reverse();
      
      return messageList;
    } catch (error) {
      logger.error('Error getting recent messages:', error);
      throw new AppError('Failed to get recent messages', 500);
    }
  }
  
  /**
   * Update message content
   */
  async updateMessage(messageId: string, content: string): Promise<Message> {
    try {
      const [updatedMessage] = await db
        .update(messages)
        .set({
          content,
          editedAt: new Date(),
        })
        .where(eq(messages.id, messageId))
        .returning();
      
      if (!updatedMessage) {
        throw new NotFoundError('Message not found');
      }
      
      logger.info(`Message updated: ${messageId}`);
      return updatedMessage;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error('Error updating message:', error);
      throw new AppError('Failed to update message', 500);
    }
  }
  
  /**
   * Delete message (soft delete)
   */
  async deleteMessage(messageId: string): Promise<void> {
    try {
      await db
        .update(messages)
        .set({
          deletedAt: new Date(),
        })
        .where(eq(messages.id, messageId));
      
      logger.info(`Message soft deleted: ${messageId}`);
    } catch (error) {
      logger.error('Error deleting message:', error);
      throw new AppError('Failed to delete message', 500);
    }
  }
  
  /**
   * Mark message as read
   */
  async markAsRead(messageId: string, userId: string): Promise<void> {
    try {
      // For now, we'll just log this action
      // In a full implementation, we'd track read receipts in a separate table
      logger.info(`Message ${messageId} marked as read by user ${userId}`);
    } catch (error) {
      logger.error('Error marking message as read:', error);
      // Non-critical error, don't throw
    }
  }
  
  /**
   * Mark all messages in conversation as read
   */
  async markConversationAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      // For now, we'll just log this action
      // In a full implementation, we'd update read status for all messages
      logger.info(`All messages in conversation ${conversationId} marked as read by user ${userId}`);
    } catch (error) {
      logger.error('Error marking conversation as read:', error);
      // Non-critical error, don't throw
    }
  }
  
  /**
   * Search messages in conversation
   */
  async searchMessages(
    conversationId: string,
    userId: string,
    query: string,
    limit: number = 20
  ): Promise<Message[]> {
    try {
      // Verify user has access
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);
      
      if (!conversation || conversation.userId !== userId) {
        throw new ForbiddenError('Access denied to this conversation');
      }
      
      const searchResults = await db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conversationId),
            messages.deletedAt === null,
            sql`${messages.content} ILIKE ${'%' + query + '%'}`
          )
        )
        .orderBy(desc(messages.createdAt))
        .limit(limit);
      
      return searchResults;
    } catch (error) {
      if (error instanceof ForbiddenError) throw error;
      logger.error('Error searching messages:', error);
      throw new AppError('Failed to search messages', 500);
    }
  }
  
  /**
   * Get message thread (parent and replies)
   */
  async getMessageThread(messageId: string, userId: string): Promise<Message[]> {
    try {
      // Get the original message
      const [originalMessage] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);
      
      if (!originalMessage) {
        throw new NotFoundError('Message not found');
      }
      
      // Verify user has access
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, originalMessage.conversationId))
        .limit(1);
      
      if (!conversation || conversation.userId !== userId) {
        throw new ForbiddenError('Access denied to this message');
      }
      
      // Get all replies to this message
      const replies = await db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.parentMessageId, messageId),
            messages.deletedAt === null
          )
        )
        .orderBy(messages.createdAt);
      
      return [originalMessage, ...replies];
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError) throw error;
      logger.error('Error getting message thread:', error);
      throw new AppError('Failed to get message thread', 500);
    }
  }
  
  /**
   * Create AI response message
   */
  async createAiResponse(
    conversationId: string,
    content: string,
    metadata?: any
  ): Promise<Message> {
    try {
      return await this.createMessage({
        conversationId,
        userId: 'system', // This will be null in the database
        content,
        type: 'text',
        metadata: {
          ...metadata,
          aiGenerated: true,
          timestamp: new Date().toISOString(),
        },
        isAiResponse: true,
      });
    } catch (error) {
      logger.error('Error creating AI response:', error);
      throw new AppError('Failed to create AI response', 500);
    }
  }
  
  /**
   * Get conversation statistics
   */
  async getMessageStats(conversationId: string): Promise<{
    totalMessages: number;
    userMessages: number;
    aiMessages: number;
    mediaMessages: number;
  }> {
    try {
      const stats = await db
        .select({
          totalMessages: sql`count(*)::int`,
          userMessages: sql`sum(case when ${messages.isAiResponse} = false then 1 else 0 end)::int`,
          aiMessages: sql`sum(case when ${messages.isAiResponse} = true then 1 else 0 end)::int`,
          mediaMessages: sql`sum(case when ${messages.type} != 'text' then 1 else 0 end)::int`,
        })
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conversationId),
            messages.deletedAt === null
          )
        );
      
      return stats[0] || {
        totalMessages: 0,
        userMessages: 0,
        aiMessages: 0,
        mediaMessages: 0,
      };
    } catch (error) {
      logger.error('Error getting message stats:', error);
      throw new AppError('Failed to get message statistics', 500);
    }
  }
}

export const messageService = new MessageService();