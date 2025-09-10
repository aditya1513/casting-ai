/**
 * Agents tRPC Router
 * Exposes external AI agent capabilities through tRPC procedures
 * Integrates with database for context and persistence
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { agentClient } from '../../services/agent-client.service';
import { db } from '../../config/database';
import { 
  conversations, 
  messages, 
  projects, 
  projectRoles,
  applications,
  talentProfiles,
  auditions,
  users 
} from '../../models/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { logger } from '../../utils/logger';
import type { MumbaiCastingContext } from '../../types/agents';

// Input validation schemas
const ScriptAnalysisInput = z.object({
  scriptContent: z.string().min(1),
  fileType: z.enum(['pdf', 'txt', 'docx', 'fdx']),
  projectId: z.string().uuid().optional(),
  projectContext: z.object({
    type: z.string(),
    genre: z.array(z.string()),
    budgetTier: z.enum(['low', 'medium', 'high', 'mega']).optional(),
    location: z.string().optional(),
  }).optional(),
});

const TalentDiscoveryInput = z.object({
  roleDescription: z.string(),
  roleId: z.string().uuid().optional(),
  physicalRequirements: z.object({
    ageRange: z.object({
      min: z.number().min(0).max(100),
      max: z.number().min(0).max(100),
    }),
    gender: z.string().optional(),
    height: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
    }).optional(),
  }),
  experienceLevel: z.enum(['fresher', 'emerging', 'experienced', 'veteran']),
  budgetRange: z.object({
    min: z.number().min(0),
    max: z.number().min(0),
  }),
  locationPreference: z.string().optional(),
  skills: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
});

const ApplicationScreeningInput = z.object({
  projectRoleId: z.string().uuid(),
  applicationIds: z.array(z.string().uuid()).optional(),
  autoFetch: z.boolean().default(true),
  screeningCriteria: z.object({
    minimumExperience: z.number().optional(),
    requiredSkills: z.array(z.string()).optional(),
    preferredSkills: z.array(z.string()).optional(),
  }).optional(),
});

const SchedulingOptimizationInput = z.object({
  projectId: z.string().uuid(),
  auditionIds: z.array(z.string().uuid()).optional(),
  constraints: z.object({
    startDate: z.string(),
    endDate: z.string(),
    dailyStartTime: z.string(),
    dailyEndTime: z.string(),
    breakDuration: z.number().optional(),
    location: z.string().optional(),
  }),
  autoSchedule: z.boolean().default(false),
});

export const agentsRouter = router({
  // ==================== Health & Status ====================
  
  /**
   * Check agent server health and status
   */
  status: publicProcedure
    .query(async () => {
      try {
        const status = await agentClient.getAgentStatus();
        return {
          success: true,
          ...status,
        };
      } catch (error) {
        logger.error('Failed to get agent status', error);
        return {
          success: false,
          status: 'error',
          agents: {},
          serverHealth: false,
          lastHealthCheck: null,
          error: 'Agent server is unavailable',
        };
      }
    }),

  // ==================== Script Analysis ====================
  
  /**
   * Analyze script and extract character information
   */
  analyzeScript: protectedProcedure
    .input(ScriptAnalysisInput)
    .mutation(async ({ ctx, input }) => {
      try {
        // Get project context from database if projectId provided
        let projectContext = input.projectContext;
        if (input.projectId) {
          const project = await db
            .select()
            .from(projects)
            .where(eq(projects.id, input.projectId))
            .limit(1);
            
          if (project[0]) {
            projectContext = {
              type: project[0].type || 'film',
              genre: (project[0].genre as string[]) || ['drama'],
              budgetTier: determineBudgetTier(project[0].budget),
              location: project[0].shootingLocation?.[0] || 'Mumbai',
            };
          }
        }

        // Add Mumbai context
        const mumbaiContext: MumbaiCastingContext = {
          industryType: determineIndustryType(projectContext?.type),
          productionScale: projectContext?.budgetTier || 'medium',
          languageRequirements: ['Hindi', 'English'],
          locations: [
            { name: 'Film City', type: 'studio' },
            { name: 'Mehboob Studio', type: 'studio' },
          ],
        };

        // Analyze script
        const result = await agentClient.analyzeScript(
          input.scriptContent,
          input.fileType,
          projectContext
        );

        // Store analysis in conversation if user wants to discuss it
        const conversation = await db.insert(conversations).values({
          userId: ctx.userId!,
          title: `Script Analysis - ${new Date().toLocaleDateString()}`,
          description: 'Automated script analysis results',
          context: {
            scriptAnalysis: result,
            projectId: input.projectId,
            mumbaiContext,
          },
        }).returning();

        // Add system message with results
        await db.insert(messages).values({
          conversationId: conversation[0].id,
          userId: null,
          type: 'system',
          content: `Script analyzed successfully. Found ${result.characters.length} characters.`,
          metadata: result,
          isAiResponse: true,
        });

        logger.info('Script analysis completed', {
          userId: ctx.userId,
          projectId: input.projectId,
          charactersFound: result.characters.length,
        });

        return {
          success: true,
          conversationId: conversation[0].id,
          analysis: result,
        };
      } catch (error: any) {
        logger.error('Script analysis failed', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to analyze script',
        });
      }
    }),

  // ==================== Talent Discovery ====================
  
  /**
   * Discover talent based on role requirements
   */
  discoverTalent: protectedProcedure
    .input(TalentDiscoveryInput)
    .mutation(async ({ ctx, input }) => {
      try {
        // Get role details from database if roleId provided
        let roleDetails = null;
        if (input.roleId) {
          roleDetails = await db
            .select()
            .from(projectRoles)
            .where(eq(projectRoles.id, input.roleId))
            .limit(1);
        }

        // Search existing talent in database first
        const existingTalent = await db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            profile: talentProfiles,
          })
          .from(users)
          .leftJoin(talentProfiles, eq(users.id, talentProfiles.userId))
          .where(
            and(
              eq(users.role, 'actor'),
              eq(users.isActive, true)
            )
          )
          .limit(10);

        // Call agent for AI-powered discovery
        const agentResults = await agentClient.discoverTalent({
          ...input,
          locationPreference: input.locationPreference || 'Mumbai',
        });

        // Merge database results with AI results
        const mergedCandidates = [
          ...existingTalent.map((talent, index) => ({
            id: talent.id,
            name: `${talent.firstName} ${talent.lastName}`,
            age: talent.profile?.dateOfBirth 
              ? calculateAge(talent.profile.dateOfBirth) 
              : 25,
            experience: talent.profile?.experience 
              ? `${(talent.profile.experience as any[]).length} projects` 
              : 'Emerging',
            matchScore: 85 - index * 5, // Simulated score
            skills: talent.profile?.skills as string[] || [],
            languages: talent.profile?.languages as string[] || ['Hindi', 'English'],
            location: talent.profile?.city || 'Mumbai',
            fromDatabase: true,
          })),
          ...agentResults.candidates.map(c => ({ ...c, fromDatabase: false })),
        ];

        // Store search in conversation for reference
        const conversation = await db.insert(conversations).values({
          userId: ctx.userId!,
          title: `Talent Search - ${input.roleDescription.substring(0, 50)}`,
          description: 'AI-powered talent discovery results',
          context: {
            searchParams: input,
            roleId: input.roleId,
          },
        }).returning();

        await db.insert(messages).values({
          conversationId: conversation[0].id,
          userId: null,
          type: 'system',
          content: `Found ${mergedCandidates.length} potential candidates for "${input.roleDescription}"`,
          metadata: {
            candidates: mergedCandidates,
            searchMetrics: agentResults.searchMetrics,
          },
          isAiResponse: true,
        });

        logger.info('Talent discovery completed', {
          userId: ctx.userId,
          roleId: input.roleId,
          candidatesFound: mergedCandidates.length,
        });

        return {
          success: true,
          conversationId: conversation[0].id,
          candidates: mergedCandidates,
          searchMetrics: {
            ...agentResults.searchMetrics,
            databaseMatches: existingTalent.length,
            aiMatches: agentResults.candidates.length,
          },
        };
      } catch (error: any) {
        logger.error('Talent discovery failed', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to discover talent',
        });
      }
    }),

  // ==================== Application Screening ====================
  
  /**
   * Screen applications using AI
   */
  screenApplications: protectedProcedure
    .input(ApplicationScreeningInput)
    .mutation(async ({ ctx, input }) => {
      try {
        // Fetch applications from database
        let applicationData;
        if (input.autoFetch) {
          applicationData = await db
            .select({
              application: applications,
              talent: users,
              profile: talentProfiles,
            })
            .from(applications)
            .innerJoin(users, eq(applications.talentId, users.id))
            .leftJoin(talentProfiles, eq(users.id, talentProfiles.userId))
            .where(
              and(
                eq(applications.projectRoleId, input.projectRoleId),
                input.applicationIds 
                  ? sql`${applications.id} IN ${input.applicationIds}`
                  : sql`1=1`
              )
            );
        }

        if (!applicationData || applicationData.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'No applications found for screening',
          });
        }

        // Prepare data for agent
        const applicationsForScreening = applicationData.map(app => ({
          id: app.application.id,
          talentId: app.application.talentId,
          roleId: input.projectRoleId,
          coverLetter: app.application.coverLetter,
          experience: app.profile?.experience || [],
          skills: app.profile?.skills as string[] || [],
        }));

        // Call agent for screening
        const screeningResults = await agentClient.screenApplications(
          applicationsForScreening
        );

        // Update application statuses in database
        for (const screened of screeningResults.screenedApplications) {
          const status = screened.recommendation === 'highly_recommended' 
            ? 'shortlisted' 
            : screened.recommendation === 'not_recommended'
            ? 'rejected'
            : 'pending';

          await db
            .update(applications)
            .set({
              status,
              notes: screened.notes,
              rating: Math.round(screened.score / 20), // Convert to 1-5 scale
              reviewedBy: ctx.userId,
              reviewedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(applications.id, screened.applicationId));
        }

        logger.info('Application screening completed', {
          userId: ctx.userId,
          projectRoleId: input.projectRoleId,
          screened: screeningResults.screenedApplications.length,
        });

        return {
          success: true,
          results: screeningResults,
          databaseUpdated: true,
        };
      } catch (error: any) {
        logger.error('Application screening failed', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to screen applications',
        });
      }
    }),

  // ==================== Audition Scheduling ====================
  
  /**
   * Optimize audition scheduling
   */
  optimizeScheduling: protectedProcedure
    .input(SchedulingOptimizationInput)
    .mutation(async ({ ctx, input }) => {
      try {
        // Fetch auditions from database
        const auditionData = await db
          .select({
            audition: auditions,
            application: applications,
            talent: users,
            profile: talentProfiles,
          })
          .from(auditions)
          .innerJoin(applications, eq(auditions.applicationId, applications.id))
          .innerJoin(users, eq(applications.talentId, users.id))
          .leftJoin(talentProfiles, eq(users.id, talentProfiles.userId))
          .where(
            and(
              eq(auditions.status, 'scheduled'),
              input.auditionIds 
                ? sql`${auditions.id} IN ${input.auditionIds}`
                : sql`1=1`
            )
          );

        // Prepare data for scheduling optimization
        const auditionsForScheduling = auditionData.map(aud => ({
          talentId: aud.talent.id,
          talentName: `${aud.talent.firstName} ${aud.talent.lastName}`,
          duration: aud.audition.duration || 30,
          availability: aud.profile?.availability || {},
        }));

        // Call agent for optimization
        const schedulingResults = await agentClient.optimizeScheduling({
          auditions: auditionsForScheduling,
          constraints: {
            ...input.constraints,
            location: input.constraints.location || 'Mumbai Film City',
          },
        });

        // Update audition schedules in database if autoSchedule is true
        if (input.autoSchedule && schedulingResults.schedule) {
          for (const scheduled of schedulingResults.schedule) {
            const auditionToUpdate = auditionData.find(
              a => a.talent.id === scheduled.talentId
            );
            
            if (auditionToUpdate) {
              await db
                .update(auditions)
                .set({
                  scheduledAt: new Date(scheduled.scheduledTime),
                  location: scheduled.location || input.constraints.location,
                  updatedAt: new Date(),
                })
                .where(eq(auditions.id, auditionToUpdate.audition.id));
            }
          }
        }

        logger.info('Scheduling optimization completed', {
          userId: ctx.userId,
          projectId: input.projectId,
          scheduled: schedulingResults.schedule.length,
          autoScheduled: input.autoSchedule,
        });

        return {
          success: true,
          results: schedulingResults,
          databaseUpdated: input.autoSchedule,
        };
      } catch (error: any) {
        logger.error('Scheduling optimization failed', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to optimize scheduling',
        });
      }
    }),

  // ==================== Communication Generation ====================
  
  /**
   * Generate communication messages
   */
  generateCommunication: protectedProcedure
    .input(z.object({
      type: z.enum(['invitation', 'rejection', 'callback', 'update', 'reminder']),
      recipientId: z.string().uuid(),
      projectId: z.string().uuid().optional(),
      roleId: z.string().uuid().optional(),
      customContext: z.record(z.any()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Fetch recipient details
        const recipient = await db
          .select()
          .from(users)
          .where(eq(users.id, input.recipientId))
          .limit(1);

        if (!recipient[0]) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Recipient not found',
          });
        }

        // Fetch project details if provided
        let projectName = 'the project';
        if (input.projectId) {
          const project = await db
            .select()
            .from(projects)
            .where(eq(projects.id, input.projectId))
            .limit(1);
          
          if (project[0]) {
            projectName = project[0].title;
          }
        }

        // Generate communication
        const communication = await agentClient.generateCommunication({
          type: input.type,
          recipientName: `${recipient[0].firstName} ${recipient[0].lastName}`,
          recipientRole: recipient[0].role,
          projectName,
          customContext: {
            ...input.customContext,
            location: 'Mumbai',
            language: 'English', // Can be made dynamic
          },
        });

        logger.info('Communication generated', {
          userId: ctx.userId,
          type: input.type,
          recipientId: input.recipientId,
        });

        return {
          success: true,
          message: communication.message,
          subject: communication.subject,
        };
      } catch (error: any) {
        logger.error('Communication generation failed', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to generate communication',
        });
      }
    }),

  // ==================== Decision Support ====================
  
  /**
   * Get AI-powered decision support
   */
  getDecisionSupport: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      roleId: z.string().uuid(),
      candidateIds: z.array(z.string().uuid()),
      criteria: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const decisionSupport = await agentClient.getDecisionSupport({
          projectId: input.projectId,
          roleId: input.roleId,
          candidateIds: input.candidateIds,
          criteria: input.criteria || [
            'acting_skills',
            'experience',
            'availability',
            'budget_fit',
            'chemistry',
          ],
        });

        logger.info('Decision support generated', {
          userId: ctx.userId,
          projectId: input.projectId,
          candidateCount: input.candidateIds.length,
        });

        return {
          success: true,
          support: decisionSupport,
        };
      } catch (error: any) {
        logger.error('Decision support failed', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to generate decision support',
        });
      }
    }),

  // ==================== Budget Optimization ====================
  
  /**
   * Optimize budget allocation across roles
   */
  optimizeBudget: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      totalBudget: z.number().min(0),
      roleIds: z.array(z.string().uuid()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Fetch project roles
        const roles = await db
          .select()
          .from(projectRoles)
          .where(
            and(
              eq(projectRoles.projectId, input.projectId),
              input.roleIds 
                ? sql`${projectRoles.id} IN ${input.roleIds}`
                : sql`1=1`
            )
          );

        if (roles.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'No roles found for budget optimization',
          });
        }

        // Prepare roles for optimization
        const rolesForOptimization = roles.map((role, index) => ({
          id: role.id,
          name: role.roleName,
          priority: determineRolePriority(role),
          minBudget: Number(role.budget) * 0.8 || 10000,
          maxBudget: Number(role.budget) * 1.2 || 100000,
        }));

        // Call agent for optimization
        const budgetOptimization = await agentClient.optimizeBudget({
          totalBudget: input.totalBudget,
          roles: rolesForOptimization,
          constraints: {
            mustCover: 'all_roles',
            allowFlexibility: true,
          },
        });

        logger.info('Budget optimization completed', {
          userId: ctx.userId,
          projectId: input.projectId,
          rolesOptimized: roles.length,
        });

        return {
          success: true,
          optimization: budgetOptimization,
        };
      } catch (error: any) {
        logger.error('Budget optimization failed', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to optimize budget',
        });
      }
    }),

  // ==================== Complete Workflow ====================
  
  /**
   * Execute complete casting workflow
   */
  executeWorkflow: protectedProcedure
    .input(z.object({
      workflowType: z.enum(['demo', 'full', 'quick']).default('demo'),
      projectId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        logger.info('Executing workflow', {
          userId: ctx.userId,
          type: input.workflowType,
          projectId: input.projectId,
        });

        const workflowResult = await agentClient.executeWorkflow(input.workflowType);

        // Store workflow results in conversation
        const conversation = await db.insert(conversations).values({
          userId: ctx.userId!,
          title: `Casting Workflow - ${input.workflowType}`,
          description: 'Complete casting workflow execution',
          context: {
            workflowType: input.workflowType,
            projectId: input.projectId,
            results: workflowResult,
          },
        }).returning();

        await db.insert(messages).values({
          conversationId: conversation[0].id,
          userId: null,
          type: 'system',
          content: `Workflow completed successfully. ${workflowResult.summary.completedSteps}/${workflowResult.summary.totalSteps} steps completed.`,
          metadata: workflowResult,
          isAiResponse: true,
        });

        return {
          success: true,
          conversationId: conversation[0].id,
          workflow: workflowResult,
        };
      } catch (error: any) {
        logger.error('Workflow execution failed', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to execute workflow',
        });
      }
    }),

  // ==================== Agent Chat Interface ====================
  
  /**
   * Chat with agents through natural language
   */
  chatWithAgent: protectedProcedure
    .input(z.object({
      message: z.string().min(1).max(5000),
      conversationId: z.string().uuid().optional(),
      agentType: z.enum([
        'script_analysis',
        'talent_discovery',
        'scheduling',
        'communication',
        'decision_support',
        'budget',
        'general',
      ]).default('general'),
      context: z.record(z.any()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Create or get conversation
        let conversationId = input.conversationId;
        if (!conversationId) {
          const newConversation = await db.insert(conversations).values({
            userId: ctx.userId!,
            title: `Agent Chat - ${input.agentType}`,
            description: 'AI agent conversation',
            context: input.context || {},
          }).returning();
          conversationId = newConversation[0].id;
        }

        // Store user message
        await db.insert(messages).values({
          conversationId,
          userId: ctx.userId,
          type: 'text',
          content: input.message,
          isAiResponse: false,
        });

        // Process message based on agent type
        let agentResponse: string;
        let metadata: any = {};

        switch (input.agentType) {
          case 'script_analysis':
            agentResponse = "I can help you analyze scripts and extract character information. Please provide the script content or upload a file.";
            break;
          case 'talent_discovery':
            agentResponse = "I'll help you find the perfect talent for your roles. What kind of actor are you looking for?";
            break;
          case 'scheduling':
            agentResponse = "I can optimize your audition schedules. Do you have specific time constraints or preferences?";
            break;
          default:
            agentResponse = "I'm here to help with your casting needs. How can I assist you today?";
        }

        // Store agent response
        await db.insert(messages).values({
          conversationId,
          userId: null,
          type: 'text',
          content: agentResponse,
          metadata,
          isAiResponse: true,
        });

        // Update conversation last message time
        await db
          .update(conversations)
          .set({
            lastMessageAt: new Date(),
            messageCount: sql`${conversations.messageCount} + 2`,
            updatedAt: new Date(),
          })
          .where(eq(conversations.id, conversationId));

        return {
          success: true,
          conversationId,
          response: agentResponse,
          metadata,
        };
      } catch (error: any) {
        logger.error('Agent chat failed', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to process chat message',
        });
      }
    }),
});

// ==================== Helper Functions ====================

function determineBudgetTier(budget: any): 'low' | 'medium' | 'high' | 'mega' {
  const budgetNum = Number(budget) || 0;
  if (budgetNum < 1000000) return 'low';
  if (budgetNum < 10000000) return 'medium';
  if (budgetNum < 100000000) return 'high';
  return 'mega';
}

function determineIndustryType(projectType?: string): MumbaiCastingContext['industryType'] {
  switch (projectType?.toLowerCase()) {
    case 'film':
    case 'movie':
      return 'bollywood';
    case 'series':
    case 'serial':
      return 'television';
    case 'web-series':
    case 'ott':
      return 'ott';
    case 'commercial':
    case 'ad':
      return 'advertising';
    case 'play':
    case 'theater':
      return 'theater';
    default:
      return 'bollywood';
  }
}

function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

function determineRolePriority(role: any): number {
  // Priority based on role characteristics
  if (role.roleName?.toLowerCase().includes('lead')) return 10;
  if (role.roleName?.toLowerCase().includes('main')) return 9;
  if (role.roleName?.toLowerCase().includes('supporting')) return 5;
  if (role.roleName?.toLowerCase().includes('background')) return 1;
  return 5; // Default medium priority
}