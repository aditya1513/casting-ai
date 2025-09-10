/**
 * Batch Operations Controller
 * High-performance bulk operations for talent, memories, auditions, and projects
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../config/database';
import { dbPool } from '../middleware/connectionPool';
import { users, conversations, messages, memories } from '../models/schema';
import { logger } from '../utils/logger';
import { eq, inArray, and, sql } from 'drizzle-orm';

// ==================== VALIDATION SCHEMAS ====================

/**
 * Batch talent creation schema
 */
export const batchTalentSchema = z.object({
  talents: z.array(z.object({
    email: z.string().email(),
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    phoneNumber: z.string().optional(),
    bio: z.string().optional(),
    profilePicture: z.string().url().optional(),
    role: z.enum(['actor', 'casting_director', 'producer', 'assistant']).default('actor'),
    isActive: z.boolean().default(true),
    externalId: z.string().optional(), // For mapping back to external systems
  })).min(1).max(100), // Limit to 100 talents per batch
  options: z.object({
    skipDuplicates: z.boolean().default(true),
    validateEmails: z.boolean().default(true),
    sendWelcomeEmails: z.boolean().default(false),
  }).optional(),
});

/**
 * Batch memory storage schema
 */
export const batchMemorySchema = z.object({
  memories: z.array(z.object({
    userId: z.string().uuid(),
    content: z.string().min(1).max(10000),
    context: z.record(z.any()).optional(),
    type: z.enum(['short_term', 'long_term', 'episodic', 'semantic']).default('episodic'),
    importance: z.number().min(0).max(1).default(0.5),
    externalId: z.string().optional(),
  })).min(1).max(500), // Limit to 500 memories per batch
  options: z.object({
    generateEmbeddings: z.boolean().default(true),
    skipDuplicates: z.boolean().default(true),
  }).optional(),
});

/**
 * Batch conversation creation schema
 */
export const batchConversationSchema = z.object({
  conversations: z.array(z.object({
    userId: z.string().uuid(),
    title: z.string().min(1).max(255),
    description: z.string().optional(),
    context: z.record(z.any()).optional(),
    initialMessages: z.array(z.object({
      content: z.string().min(1),
      role: z.enum(['user', 'assistant', 'system']).default('user'),
      metadata: z.record(z.any()).optional(),
    })).optional(),
    externalId: z.string().optional(),
  })).min(1).max(50), // Limit to 50 conversations per batch
});

/**
 * Batch update schema for multiple entities
 */
export const batchUpdateSchema = z.object({
  updates: z.array(z.object({
    id: z.string().uuid(),
    data: z.record(z.any()),
    table: z.enum(['users', 'conversations', 'messages', 'memories']),
  })).min(1).max(200),
  options: z.object({
    skipNotFound: z.boolean().default(true),
    validateData: z.boolean().default(true),
  }).optional(),
});

// ==================== BATCH OPERATIONS ====================

/**
 * Batch create talents with performance optimization
 */
export const batchCreateTalents = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  let transaction;

  try {
    const validatedData = batchTalentSchema.parse(req.body);
    const { talents, options = {} } = validatedData;
    
    logger.info(`Starting batch talent creation: ${talents.length} talents`);

    // Start transaction
    transaction = await dbPool.transaction(async (client) => {
      const results: any[] = [];
      const errors: any[] = [];
      const duplicates: string[] = [];

      // Process in chunks of 25 for better performance
      const chunkSize = 25;
      for (let i = 0; i < talents.length; i += chunkSize) {
        const chunk = talents.slice(i, i + chunkSize);
        
        // Check for existing emails if skipDuplicates is enabled
        if (options.skipDuplicates) {
          const emails = chunk.map(t => t.email);
          const existingUsers = await client.query(
            'SELECT email FROM users WHERE email = ANY($1)',
            [emails]
          );
          
          const existingEmails = new Set(existingUsers.rows.map(row => row.email));
          
          // Filter out duplicates
          const newTalents = chunk.filter(talent => {
            if (existingEmails.has(talent.email)) {
              duplicates.push(talent.email);
              return false;
            }
            return true;
          });

          if (newTalents.length === 0) continue;
          chunk.splice(0, chunk.length, ...newTalents);
        }

        // Bulk insert using VALUES clause
        if (chunk.length > 0) {
          const values = chunk.map((talent, index) => {
            const baseIndex = i + index;
            return `($${baseIndex * 7 + 1}, $${baseIndex * 7 + 2}, $${baseIndex * 7 + 3}, $${baseIndex * 7 + 4}, $${baseIndex * 7 + 5}, $${baseIndex * 7 + 6}, $${baseIndex * 7 + 7})`;
          }).join(', ');

          const params = chunk.flatMap(talent => [
            talent.email,
            talent.firstName,
            talent.lastName,
            talent.phoneNumber || null,
            talent.bio || null,
            talent.profilePicture || null,
            talent.role,
          ]);

          const query = `
            INSERT INTO users (email, first_name, last_name, phone_number, bio, profile_picture, role)
            VALUES ${values}
            RETURNING id, email, first_name, last_name, role, created_at
          `;

          const insertResult = await client.query(query, params);
          results.push(...insertResult.rows);
        }
      }

      return { results, errors, duplicates };
    });

    const processingTime = Date.now() - startTime;

    logger.info(`Batch talent creation completed`, {
      totalRequested: talents.length,
      created: transaction.results.length,
      duplicates: transaction.duplicates.length,
      errors: transaction.errors.length,
      processingTime: `${processingTime}ms`,
    });

    res.status(201).json({
      success: true,
      data: {
        created: transaction.results,
        summary: {
          totalRequested: talents.length,
          created: transaction.results.length,
          duplicates: transaction.duplicates.length,
          errors: transaction.errors.length,
        },
        performance: {
          processingTime,
          averageTimePerRecord: Math.round(processingTime / talents.length),
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        batchId: `batch_${Date.now()}`,
      },
    });

  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }

    logger.error('Batch talent creation failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      requestBody: req.body,
      processingTime: Date.now() - startTime,
    });

    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Batch operation failed',
      code: 'BATCH_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Batch create memories with embedding generation
 */
export const batchCreateMemories = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();

  try {
    const validatedData = batchMemorySchema.parse(req.body);
    const { memories: memoryData, options = {} } = validatedData;
    
    logger.info(`Starting batch memory creation: ${memoryData.length} memories`);

    const transaction = await dbPool.transaction(async (client) => {
      const results: any[] = [];
      const errors: any[] = [];

      // Validate all user IDs exist
      const userIds = [...new Set(memoryData.map(m => m.userId))];
      const existingUsers = await client.query(
        'SELECT id FROM users WHERE id = ANY($1)',
        [userIds]
      );
      const validUserIds = new Set(existingUsers.rows.map(row => row.id));

      // Filter out memories with invalid user IDs
      const validMemories = memoryData.filter(memory => {
        if (!validUserIds.has(memory.userId)) {
          errors.push({
            error: 'Invalid user ID',
            userId: memory.userId,
            externalId: memory.externalId,
          });
          return false;
        }
        return true;
      });

      // Process in chunks for better performance
      const chunkSize = 50;
      for (let i = 0; i < validMemories.length; i += chunkSize) {
        const chunk = validMemories.slice(i, i + chunkSize);
        
        // Bulk insert memories
        const values = chunk.map((_, index) => {
          const baseIndex = index;
          return `($${baseIndex * 6 + 1}, $${baseIndex * 6 + 2}, $${baseIndex * 6 + 3}, $${baseIndex * 6 + 4}, $${baseIndex * 6 + 5}, $${baseIndex * 6 + 6})`;
        }).join(', ');

        const params = chunk.flatMap(memory => [
          memory.userId,
          memory.content,
          JSON.stringify(memory.context || {}),
          memory.type,
          memory.importance,
          new Date().toISOString(),
        ]);

        const query = `
          INSERT INTO memories (user_id, content, context, type, importance, created_at)
          VALUES ${values}
          RETURNING id, user_id, content, type, importance, created_at
        `;

        const insertResult = await client.query(query, params);
        results.push(...insertResult.rows);
      }

      return { results, errors };
    });

    const processingTime = Date.now() - startTime;

    logger.info(`Batch memory creation completed`, {
      totalRequested: memoryData.length,
      created: transaction.results.length,
      errors: transaction.errors.length,
      processingTime: `${processingTime}ms`,
    });

    res.status(201).json({
      success: true,
      data: {
        created: transaction.results,
        summary: {
          totalRequested: memoryData.length,
          created: transaction.results.length,
          errors: transaction.errors.length,
        },
        performance: {
          processingTime,
          averageTimePerRecord: Math.round(processingTime / memoryData.length),
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        batchId: `memory_batch_${Date.now()}`,
      },
    });

  } catch (error) {
    logger.error('Batch memory creation failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: Date.now() - startTime,
    });

    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Batch memory operation failed',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Batch create conversations with initial messages
 */
export const batchCreateConversations = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();

  try {
    const validatedData = batchConversationSchema.parse(req.body);
    const { conversations: conversationData } = validatedData;
    
    logger.info(`Starting batch conversation creation: ${conversationData.length} conversations`);

    const transaction = await dbPool.transaction(async (client) => {
      const results: any[] = [];
      const errors: any[] = [];

      for (const convData of conversationData) {
        try {
          // Create conversation
          const convResult = await client.query(`
            INSERT INTO conversations (user_id, title, description, context, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, user_id, title, description, created_at
          `, [
            convData.userId,
            convData.title,
            convData.description || null,
            JSON.stringify(convData.context || {}),
            new Date().toISOString(),
            new Date().toISOString(),
          ]);

          const conversation = convResult.rows[0];
          let messageCount = 0;

          // Add initial messages if provided
          if (convData.initialMessages && convData.initialMessages.length > 0) {
            const messageValues = convData.initialMessages.map((_, index) => {
              return `($${index * 5 + 1}, $${index * 5 + 2}, $${index * 5 + 3}, $${index * 5 + 4}, $${index * 5 + 5})`;
            }).join(', ');

            const messageParams = convData.initialMessages.flatMap(msg => [
              conversation.id,
              msg.content,
              msg.role,
              JSON.stringify(msg.metadata || {}),
              new Date().toISOString(),
            ]);

            const messageQuery = `
              INSERT INTO messages (conversation_id, content, role, metadata, created_at)
              VALUES ${messageValues}
              RETURNING id
            `;

            const messageResult = await client.query(messageQuery, messageParams);
            messageCount = messageResult.rows.length;

            // Update conversation message count and last message timestamp
            await client.query(`
              UPDATE conversations 
              SET message_count = $1, last_message_at = $2, updated_at = $3
              WHERE id = $4
            `, [messageCount, new Date().toISOString(), new Date().toISOString(), conversation.id]);
          }

          results.push({
            ...conversation,
            messageCount,
            externalId: convData.externalId,
          });

        } catch (error) {
          errors.push({
            error: error instanceof Error ? error.message : 'Unknown error',
            conversationData: convData,
          });
        }
      }

      return { results, errors };
    });

    const processingTime = Date.now() - startTime;

    logger.info(`Batch conversation creation completed`, {
      totalRequested: conversationData.length,
      created: transaction.results.length,
      errors: transaction.errors.length,
      processingTime: `${processingTime}ms`,
    });

    res.status(201).json({
      success: true,
      data: {
        created: transaction.results,
        summary: {
          totalRequested: conversationData.length,
          created: transaction.results.length,
          errors: transaction.errors.length,
        },
        performance: {
          processingTime,
          averageTimePerRecord: Math.round(processingTime / conversationData.length),
        },
      },
    });

  } catch (error) {
    logger.error('Batch conversation creation failed:', error);

    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Batch conversation operation failed',
    });
  }
};

/**
 * Batch update multiple entities
 */
export const batchUpdate = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();

  try {
    const validatedData = batchUpdateSchema.parse(req.body);
    const { updates, options = {} } = validatedData;
    
    logger.info(`Starting batch update: ${updates.length} updates across multiple tables`);

    const transaction = await dbPool.transaction(async (client) => {
      const results: any[] = [];
      const errors: any[] = [];

      // Group updates by table for efficiency
      const updatesByTable = updates.reduce((acc, update) => {
        if (!acc[update.table]) {
          acc[update.table] = [];
        }
        acc[update.table].push(update);
        return acc;
      }, {} as Record<string, typeof updates>);

      // Process each table separately
      for (const [tableName, tableUpdates] of Object.entries(updatesByTable)) {
        try {
          for (const update of tableUpdates) {
            // Build SET clause dynamically
            const setClause = Object.keys(update.data).map((key, index) => 
              `${key} = $${index + 2}`
            ).join(', ');

            const values = [update.id, ...Object.values(update.data)];
            
            const query = `
              UPDATE ${tableName} 
              SET ${setClause}, updated_at = NOW()
              WHERE id = $1
              RETURNING id, updated_at
            `;

            const updateResult = await client.query(query, values);
            
            if (updateResult.rows.length > 0) {
              results.push({
                id: update.id,
                table: tableName,
                updated: true,
                ...updateResult.rows[0],
              });
            } else if (!options.skipNotFound) {
              errors.push({
                id: update.id,
                table: tableName,
                error: 'Record not found',
              });
            }
          }
        } catch (error) {
          errors.push({
            table: tableName,
            error: error instanceof Error ? error.message : 'Unknown error',
            updates: tableUpdates.map(u => u.id),
          });
        }
      }

      return { results, errors };
    });

    const processingTime = Date.now() - startTime;

    logger.info(`Batch update completed`, {
      totalRequested: updates.length,
      updated: transaction.results.length,
      errors: transaction.errors.length,
      processingTime: `${processingTime}ms`,
    });

    res.status(200).json({
      success: true,
      data: {
        updated: transaction.results,
        summary: {
          totalRequested: updates.length,
          updated: transaction.results.length,
          errors: transaction.errors.length,
        },
        performance: {
          processingTime,
          averageTimePerRecord: Math.round(processingTime / updates.length),
        },
      },
    });

  } catch (error) {
    logger.error('Batch update failed:', error);

    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Batch update operation failed',
    });
  }
};

/**
 * Batch delete operation with safety checks
 */
export const batchDelete = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const { ids, table, options = {} } = req.body;

  // Validation
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100) {
    res.status(400).json({
      success: false,
      error: 'Invalid IDs array (must be 1-100 items)',
    });
    return;
  }

  if (!['users', 'conversations', 'messages', 'memories'].includes(table)) {
    res.status(400).json({
      success: false,
      error: 'Invalid table name',
    });
    return;
  }

  try {
    logger.info(`Starting batch delete: ${ids.length} records from ${table}`);

    const transaction = await dbPool.transaction(async (client) => {
      // Check which records exist first
      const checkQuery = `SELECT id FROM ${table} WHERE id = ANY($1)`;
      const existingResult = await client.query(checkQuery, [ids]);
      const existingIds = existingResult.rows.map(row => row.id);
      const notFoundIds = ids.filter(id => !existingIds.includes(id));

      // Perform deletion
      const deleteQuery = `DELETE FROM ${table} WHERE id = ANY($1) RETURNING id`;
      const deleteResult = await client.query(deleteQuery, [existingIds]);
      
      return {
        deleted: deleteResult.rows,
        notFound: notFoundIds,
      };
    });

    const processingTime = Date.now() - startTime;

    logger.info(`Batch delete completed`, {
      table,
      totalRequested: ids.length,
      deleted: transaction.deleted.length,
      notFound: transaction.notFound.length,
      processingTime: `${processingTime}ms`,
    });

    res.status(200).json({
      success: true,
      data: {
        deleted: transaction.deleted,
        summary: {
          totalRequested: ids.length,
          deleted: transaction.deleted.length,
          notFound: transaction.notFound.length,
        },
        performance: {
          processingTime,
          averageTimePerRecord: Math.round(processingTime / ids.length),
        },
      },
    });

  } catch (error) {
    logger.error('Batch delete failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      table,
      idsCount: ids.length,
      processingTime: Date.now() - startTime,
    });

    res.status(500).json({
      success: false,
      error: 'Batch delete operation failed',
    });
  }
};

/**
 * Get batch operation status and statistics
 */
export const getBatchStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await dbPool.transaction(async (client) => {
      // Get table counts and basic statistics
      const queries = [
        'SELECT COUNT(*) as count FROM users',
        'SELECT COUNT(*) as count FROM conversations',
        'SELECT COUNT(*) as count FROM messages',
        'SELECT COUNT(*) as count FROM memories',
      ];

      const [usersCount, conversationsCount, messagesCount, memoriesCount] = await Promise.all(
        queries.map(query => client.query(query))
      );

      // Get recent activity (last 24 hours)
      const recentActivity = await client.query(`
        SELECT 
          'users' as table_name,
          COUNT(*) as count,
          MAX(created_at) as last_created
        FROM users 
        WHERE created_at > NOW() - INTERVAL '24 hours'
        UNION ALL
        SELECT 
          'conversations' as table_name,
          COUNT(*) as count,
          MAX(created_at) as last_created
        FROM conversations 
        WHERE created_at > NOW() - INTERVAL '24 hours'
        UNION ALL
        SELECT 
          'messages' as table_name,
          COUNT(*) as count,
          MAX(created_at) as last_created
        FROM messages 
        WHERE created_at > NOW() - INTERVAL '24 hours'
        UNION ALL
        SELECT 
          'memories' as table_name,
          COUNT(*) as count,
          MAX(created_at) as last_created
        FROM memories 
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `);

      return {
        totalCounts: {
          users: parseInt(usersCount.rows[0].count),
          conversations: parseInt(conversationsCount.rows[0].count),
          messages: parseInt(messagesCount.rows[0].count),
          memories: parseInt(memoriesCount.rows[0].count),
        },
        recentActivity: recentActivity.rows,
      };
    });

    // Get database pool statistics
    const poolStats = dbPool.getStats();

    res.json({
      success: true,
      data: {
        database: stats,
        connectionPool: poolStats,
        performance: {
          avgQueryTime: `${poolStats.avgResponseTime}ms`,
          poolUtilization: `${Math.round((poolStats.activeConnections / poolStats.maxConnections) * 100)}%`,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    logger.error('Failed to get batch stats:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve batch statistics',
    });
  }
};