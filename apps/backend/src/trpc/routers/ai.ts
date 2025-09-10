/**
 * AI Agents tRPC Router
 * Exposes AI agent functionality through tRPC procedures
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { ConversationService } from '../../services/ai/conversation.service';
import { TalentMatchingAgent, TalentMatchingInput } from '../../services/ai/agents/talent-matching.agent';
import { ScriptAnalysisAgent, ScriptAnalysisInput } from '../../services/ai/agents/script-analysis.agent';
import { SchedulingAgent, SchedulingInput } from '../../services/ai/agents/scheduling.agent';
import { CommunicationAgent, CommunicationInput } from '../../services/ai/agents/communication.agent';
import { AnalyticsAgent, AnalyticsInput } from '../../services/ai/agents/analytics.agent';
import { AgentRouter, AgentType } from '../../services/ai/agent-router';
import { rateLimiter } from '../../services/ai/config';
import { TRPCError } from '@trpc/server';
import { logger } from '../../utils/logger';

// Initialize services
const conversationService = new ConversationService();
const talentMatchingAgent = new TalentMatchingAgent();
const scriptAnalysisAgent = new ScriptAnalysisAgent();
const schedulingAgent = new SchedulingAgent();
const communicationAgent = new CommunicationAgent();
const analyticsAgent = new AnalyticsAgent();
const agentRouter = new AgentRouter();

export const aiRouter = router({
  // ==================== Conversation Management ====================
  
  /**
   * Create a new conversation
   */
  createConversation: protectedProcedure
    .input(z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      initialContext: z.record(z.any()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await conversationService.createConversation({
          userId: ctx.userId!,
          ...input,
        });
        return result;
      } catch (error) {
        logger.error('Failed to create conversation:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create conversation',
        });
      }
    }),
  
  /**
   * Send a message in a conversation
   */
  sendMessage: protectedProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
      content: z.string().min(1).max(5000),
      type: z.enum(['text', 'image', 'document']).default('text'),
      metadata: z.record(z.any()).optional(),
      preferredAgent: z.nativeEnum(AgentType).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Check rate limits
        const quota = rateLimiter.getRemainingQuota(ctx.userId!);
        if (quota.requestsRemaining <= 0) {
          throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: `Rate limit exceeded. Please wait ${quota.resetInMinutes} minutes.`,
          });
        }
        
        const result = await conversationService.sendMessage({
          userId: ctx.userId!,
          ...input,
        });
        
        return result;
      } catch (error: any) {
        logger.error('Failed to send message:', error);
        
        if (error.code === 'TOO_MANY_REQUESTS') {
          throw error;
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to process message',
        });
      }
    }),
  
  /**
   * Get conversation history
   */
  getConversation: protectedProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const result = await conversationService.getConversationHistory({
          userId: ctx.userId!,
          ...input,
        });
        return result;
      } catch (error) {
        logger.error('Failed to get conversation:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve conversation',
        });
      }
    }),
  
  /**
   * List user's conversations
   */
  listConversations: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const result = await conversationService.getUserConversations(
          ctx.userId!,
          input.limit,
          input.offset
        );
        return result;
      } catch (error) {
        logger.error('Failed to list conversations:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve conversations',
        });
      }
    }),
  
  /**
   * Delete a conversation
   */
  deleteConversation: protectedProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        await conversationService.deleteConversation(
          input.conversationId,
          ctx.userId!
        );
        return { success: true };
      } catch (error) {
        logger.error('Failed to delete conversation:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete conversation',
        });
      }
    }),
  
  /**
   * Search conversations
   */
  searchConversations: protectedProcedure
    .input(z.object({
      query: z.string().min(1).max(100),
      limit: z.number().min(1).max(20).default(10),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const results = await conversationService.searchConversations(
          ctx.userId!,
          input.query,
          input.limit
        );
        return { results };
      } catch (error) {
        logger.error('Failed to search conversations:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to search conversations',
        });
      }
    }),
  
  // ==================== Direct Agent Access ====================
  
  /**
   * Talent Matching Agent
   */
  findTalentMatches: protectedProcedure
    .input(TalentMatchingInput)
    .query(async ({ ctx, input }) => {
      try {
        const result = await talentMatchingAgent.findMatches(input);
        return result;
      } catch (error) {
        logger.error('Talent matching failed:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to find talent matches',
        });
      }
    }),
  
  /**
   * Find similar talents
   */
  findSimilarTalents: protectedProcedure
    .input(z.object({
      talentId: z.string().uuid(),
      limit: z.number().min(1).max(20).default(5),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const result = await talentMatchingAgent.findSimilarTalents(
          input.talentId,
          input.limit
        );
        return { talents: result };
      } catch (error) {
        logger.error('Similar talent search failed:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to find similar talents',
        });
      }
    }),
  
  /**
   * Script Analysis Agent
   */
  analyzeScript: protectedProcedure
    .input(ScriptAnalysisInput)
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await scriptAnalysisAgent.analyzeScript(input);
        return result;
      } catch (error) {
        logger.error('Script analysis failed:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to analyze script',
        });
      }
    }),
  
  /**
   * Generate casting brief from script analysis
   */
  generateCastingBrief: protectedProcedure
    .input(z.object({
      analysis: z.any(), // ScriptAnalysisResultType
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const brief = await scriptAnalysisAgent.generateCastingBrief(input.analysis);
        return { brief };
      } catch (error) {
        logger.error('Casting brief generation failed:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate casting brief',
        });
      }
    }),
  
  /**
   * Scheduling Agent
   */
  optimizeSchedule: protectedProcedure
    .input(SchedulingInput)
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await schedulingAgent.optimizeSchedule(input);
        return result;
      } catch (error) {
        logger.error('Schedule optimization failed:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to optimize schedule',
        });
      }
    }),
  
  /**
   * Check scheduling conflicts
   */
  checkSchedulingConflicts: protectedProcedure
    .input(z.object({
      talentId: z.string().uuid(),
      proposedTime: z.string().datetime(),
      duration: z.number().min(15).max(180),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const result = await schedulingAgent.checkConflicts(
          input.talentId,
          new Date(input.proposedTime),
          input.duration
        );
        return result;
      } catch (error) {
        logger.error('Conflict check failed:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to check scheduling conflicts',
        });
      }
    }),
  
  /**
   * Communication Agent
   */
  generateMessage: protectedProcedure
    .input(CommunicationInput)
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await communicationAgent.generateMessage(input);
        return result;
      } catch (error) {
        logger.error('Message generation failed:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate message',
        });
      }
    }),
  
  /**
   * Translate message
   */
  translateMessage: protectedProcedure
    .input(z.object({
      message: z.string(),
      fromLang: z.string(),
      toLang: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const translated = await communicationAgent.translateMessage(
          input.message,
          input.fromLang,
          input.toLang
        );
        return { translated };
      } catch (error) {
        logger.error('Translation failed:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to translate message',
        });
      }
    }),
  
  /**
   * Analytics Agent
   */
  getAnalytics: protectedProcedure
    .input(AnalyticsInput)
    .query(async ({ ctx, input }) => {
      try {
        const result = await analyticsAgent.analyze(input);
        return result;
      } catch (error) {
        logger.error('Analytics query failed:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate analytics',
        });
      }
    }),
  
  /**
   * Predict performance
   */
  predictPerformance: protectedProcedure
    .input(z.object({
      talentId: z.string().uuid(),
      roleId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const prediction = await analyticsAgent.predictPerformance(
          input.talentId,
          input.roleId
        );
        return prediction;
      } catch (error) {
        logger.error('Performance prediction failed:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to predict performance',
        });
      }
    }),
  
  // ==================== Utility Procedures ====================
  
  /**
   * Get AI usage quota
   */
  getUsageQuota: protectedProcedure
    .query(async ({ ctx }) => {
      const quota = rateLimiter.getRemainingQuota(ctx.userId!);
      return quota;
    }),
  
  /**
   * Route message to appropriate agent
   */
  routeMessage: protectedProcedure
    .input(z.object({
      message: z.string(),
      context: z.record(z.any()).optional(),
      preferredAgent: z.nativeEnum(AgentType).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await agentRouter.routeMessage({
          message: input.message,
          userId: ctx.userId!,
          context: input.context,
          preferredAgent: input.preferredAgent,
        });
        return result;
      } catch (error) {
        logger.error('Message routing failed:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to process message',
        });
      }
    }),
  
  /**
   * Get available AI agents
   */
  getAvailableAgents: publicProcedure
    .query(async () => {
      return {
        agents: [
          {
            type: AgentType.TALENT_MATCHING,
            name: 'Talent Matching',
            description: 'Find and recommend suitable actors for roles',
            capabilities: ['talent search', 'similarity matching', 'recommendation'],
          },
          {
            type: AgentType.SCRIPT_ANALYSIS,
            name: 'Script Analysis',
            description: 'Analyze scripts and extract character details',
            capabilities: ['character extraction', 'scene analysis', 'casting brief generation'],
          },
          {
            type: AgentType.SCHEDULING,
            name: 'Scheduling',
            description: 'Optimize audition schedules and manage conflicts',
            capabilities: ['schedule optimization', 'conflict detection', 'calendar management'],
          },
          {
            type: AgentType.COMMUNICATION,
            name: 'Communication',
            description: 'Generate professional messages and notifications',
            capabilities: ['message generation', 'translation', 'bulk messaging'],
          },
          {
            type: AgentType.ANALYTICS,
            name: 'Analytics',
            description: 'Provide insights and performance predictions',
            capabilities: ['data analysis', 'trend detection', 'performance prediction'],
          },
        ],
      };
    }),
});