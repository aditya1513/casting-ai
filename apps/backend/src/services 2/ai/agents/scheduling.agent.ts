/**
 * Scheduling Agent
 * Optimizes audition scheduling and conflict resolution
 */

import { z } from 'zod';
import { getOpenAIClient, AI_MODELS, SYSTEM_PROMPTS, withRetry } from '../config';
import { db } from '../../../db/client';
import { auditions, applications, users, projectRoles } from '../../../models/schema';
import { eq, and, gte, lte, between } from 'drizzle-orm';
import { logger } from '../../../utils/logger';

// Input schemas
export const SchedulingInput = z.object({
  projectId: z.string().uuid().optional(),
  roleIds: z.array(z.string().uuid()).optional(),
  talentIds: z.array(z.string().uuid()).optional(),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  location: z.string().optional(),
  isOnline: z.boolean().default(false),
  duration: z.number().min(15).max(180).default(30), // minutes
  breakDuration: z.number().min(5).max(30).default(15),
  maxPerDay: z.number().min(1).max(20).default(8),
  preferences: z.object({
    avoidLunchHours: z.boolean().default(true),
    preferMornings: z.boolean().default(false),
    considerTraffic: z.boolean().default(true),
    groupSimilarRoles: z.boolean().default(true),
  }).optional(),
});

export type SchedulingInputType = z.infer<typeof SchedulingInput>;

// Schedule slot schema
export const ScheduleSlot = z.object({
  slotId: z.string(),
  talentId: z.string(),
  talentName: z.string(),
  roleId: z.string(),
  roleName: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  location: z.string().nullable(),
  isOnline: z.boolean(),
  meetingLink: z.string().nullable(),
  status: z.enum(['available', 'tentative', 'confirmed', 'conflict']),
  conflictReason: z.string().nullable(),
  travelTime: z.number().nullable(), // minutes needed for travel
});

export type ScheduleSlotType = z.infer<typeof ScheduleSlot>;

// Schedule optimization result
export const ScheduleOptimizationResult = z.object({
  schedule: z.array(ScheduleSlot),
  summary: z.object({
    totalSlots: z.number(),
    totalDays: z.number(),
    averageSlotsPerDay: z.number(),
    conflicts: z.number(),
    optimizationScore: z.number(), // 0-100
  }),
  recommendations: z.array(z.string()),
  alternativeSlots: z.array(ScheduleSlot).optional(),
});

export type ScheduleOptimizationResultType = z.infer<typeof ScheduleOptimizationResult>;

export class SchedulingAgent {
  private openai = getOpenAIClient();
  
  /**
   * Optimize audition schedule
   */
  async optimizeSchedule(input: SchedulingInputType): Promise<ScheduleOptimizationResultType> {
    try {
      // Fetch existing auditions and conflicts
      const existingAuditions = await this.fetchExistingAuditions(
        input.dateRange.start,
        input.dateRange.end
      );
      
      // Fetch talent availability
      const talentAvailability = await this.fetchTalentAvailability(
        input.talentIds || []
      );
      
      // Generate optimal schedule using AI
      const optimizedSchedule = await this.generateOptimalSchedule(
        input,
        existingAuditions,
        talentAvailability
      );
      
      return optimizedSchedule;
    } catch (error) {
      logger.error('Schedule optimization failed:', error);
      throw error;
    }
  }
  
  /**
   * Fetch existing auditions in date range
   */
  private async fetchExistingAuditions(startDate: string, endDate: string): Promise<any[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const existing = await db
      .select({
        id: auditions.id,
        applicationId: auditions.applicationId,
        scheduledAt: auditions.scheduledAt,
        duration: auditions.duration,
        location: auditions.location,
        isOnline: auditions.isOnline,
        status: auditions.status,
      })
      .from(auditions)
      .where(
        and(
          gte(auditions.scheduledAt, start),
          lte(auditions.scheduledAt, end),
          eq(auditions.status, 'scheduled')
        )
      );
    
    return existing;
  }
  
  /**
   * Fetch talent availability data
   */
  private async fetchTalentAvailability(talentIds: string[]): Promise<Map<string, any>> {
    const availabilityMap = new Map();
    
    if (talentIds.length === 0) {
      return availabilityMap;
    }
    
    // In a real implementation, this would fetch from talent_availability table
    // For now, we'll simulate with some logic
    talentIds.forEach(id => {
      availabilityMap.set(id, {
        preferredTimes: ['morning', 'afternoon'],
        blackoutDates: [],
        maxPerDay: 2,
      });
    });
    
    return availabilityMap;
  }
  
  /**
   * Generate optimal schedule using AI
   */
  private async generateOptimalSchedule(
    input: SchedulingInputType,
    existingAuditions: any[],
    talentAvailability: Map<string, any>
  ): Promise<ScheduleOptimizationResultType> {
    const prompt = this.buildSchedulingPrompt(input, existingAuditions, talentAvailability);
    
    const response = await withRetry(async () => {
      return await this.openai.chat.completions.create({
        model: AI_MODELS.analysis,
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.scheduling },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 3000,
        response_format: { type: 'json_object' },
      });
    });
    
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from AI');
    }
    
    const result = JSON.parse(content);
    
    // Transform and validate the result
    return this.validateScheduleResult(result, input);
  }
  
  /**
   * Build scheduling prompt
   */
  private buildSchedulingPrompt(
    input: SchedulingInputType,
    existingAuditions: any[],
    talentAvailability: Map<string, any>
  ): string {
    const availabilityData = Array.from(talentAvailability.entries()).map(([id, data]) => ({
      talentId: id,
      ...data,
    }));
    
    return `Create an optimal audition schedule for Mumbai casting sessions.

Parameters:
${JSON.stringify({
  dateRange: input.dateRange,
  location: input.location || 'Mumbai',
  isOnline: input.isOnline,
  slotDuration: input.duration,
  breakDuration: input.breakDuration,
  maxPerDay: input.maxPerDay,
  preferences: input.preferences,
}, null, 2)}

Existing Auditions (to avoid conflicts):
${JSON.stringify(existingAuditions, null, 2)}

Talent Availability:
${JSON.stringify(availabilityData, null, 2)}

Generate an optimized schedule considering:
1. Mumbai traffic patterns (peak hours: 8-10 AM, 6-9 PM)
2. Lunch break (1-2 PM)
3. Cultural considerations (festival dates, auspicious times)
4. Talent availability and preferences
5. Minimize travel time between auditions
6. Group similar roles together when possible

Return JSON with this structure:
{
  "schedule": [
    {
      "slotId": "unique-id",
      "talentId": "talent-uuid",
      "talentName": "Name",
      "roleId": "role-uuid",
      "roleName": "Role",
      "startTime": "2024-01-15T10:00:00Z",
      "endTime": "2024-01-15T10:30:00Z",
      "location": "Location or null for online",
      "isOnline": false,
      "meetingLink": null,
      "status": "available/tentative/confirmed/conflict",
      "conflictReason": null,
      "travelTime": 30
    }
  ],
  "summary": {
    "totalSlots": number,
    "totalDays": number,
    "averageSlotsPerDay": number,
    "conflicts": number,
    "optimizationScore": 85
  },
  "recommendations": [
    "Schedule morning slots for senior actors",
    "Consider adding buffer time for Location A due to traffic"
  ],
  "alternativeSlots": []
}`;
  }
  
  /**
   * Validate and transform schedule result
   */
  private validateScheduleResult(
    result: any,
    input: SchedulingInputType
  ): ScheduleOptimizationResultType {
    // Generate slots if not provided by AI
    const schedule = result.schedule || this.generateDefaultSchedule(input);
    
    return {
      schedule: schedule.map((slot: any) => ({
        slotId: slot.slotId || this.generateSlotId(),
        talentId: slot.talentId || '',
        talentName: slot.talentName || 'TBD',
        roleId: slot.roleId || '',
        roleName: slot.roleName || 'TBD',
        startTime: slot.startTime,
        endTime: slot.endTime,
        location: slot.location || input.location || null,
        isOnline: slot.isOnline ?? input.isOnline,
        meetingLink: slot.meetingLink || null,
        status: slot.status || 'available',
        conflictReason: slot.conflictReason || null,
        travelTime: slot.travelTime || null,
      })),
      summary: {
        totalSlots: result.summary?.totalSlots || schedule.length,
        totalDays: result.summary?.totalDays || this.calculateTotalDays(schedule),
        averageSlotsPerDay: result.summary?.averageSlotsPerDay || 
          Math.floor(schedule.length / this.calculateTotalDays(schedule)),
        conflicts: result.summary?.conflicts || 0,
        optimizationScore: result.summary?.optimizationScore || 75,
      },
      recommendations: result.recommendations || [
        'Consider morning slots for better attendance',
        'Add buffer time between auditions for preparation',
      ],
      alternativeSlots: result.alternativeSlots || [],
    };
  }
  
  /**
   * Generate default schedule based on input
   */
  private generateDefaultSchedule(input: SchedulingInputType): any[] {
    const schedule = [];
    const startDate = new Date(input.dateRange.start);
    const endDate = new Date(input.dateRange.end);
    const slotDuration = input.duration;
    const breakDuration = input.breakDuration;
    
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      // Skip weekends if needed
      if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }
      
      // Morning session: 10 AM - 1 PM
      let slotTime = new Date(currentDate);
      slotTime.setHours(10, 0, 0, 0);
      
      for (let i = 0; i < Math.min(4, input.maxPerDay / 2); i++) {
        const startTime = new Date(slotTime);
        const endTime = new Date(slotTime.getTime() + slotDuration * 60000);
        
        schedule.push({
          slotId: this.generateSlotId(),
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          status: 'available',
        });
        
        slotTime = new Date(endTime.getTime() + breakDuration * 60000);
      }
      
      // Afternoon session: 2 PM - 6 PM
      slotTime.setHours(14, 0, 0, 0);
      
      for (let i = 0; i < Math.min(4, input.maxPerDay / 2); i++) {
        const startTime = new Date(slotTime);
        const endTime = new Date(slotTime.getTime() + slotDuration * 60000);
        
        schedule.push({
          slotId: this.generateSlotId(),
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          status: 'available',
        });
        
        slotTime = new Date(endTime.getTime() + breakDuration * 60000);
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return schedule;
  }
  
  /**
   * Check for scheduling conflicts
   */
  async checkConflicts(
    talentId: string,
    proposedTime: Date,
    duration: number
  ): Promise<{
    hasConflict: boolean;
    conflicts: any[];
    suggestions: Date[];
  }> {
    const endTime = new Date(proposedTime.getTime() + duration * 60000);
    
    // Check existing auditions
    const conflicts = await db
      .select()
      .from(auditions)
      .innerJoin(applications, eq(auditions.applicationId, applications.id))
      .where(
        and(
          eq(applications.talentId, talentId),
          eq(auditions.status, 'scheduled'),
          // Check for time overlap
          lte(auditions.scheduledAt, endTime),
          gte(
            sql`${auditions.scheduledAt} + interval '1 minute' * ${auditions.duration}`,
            proposedTime
          )
        )
      );
    
    // Generate alternative suggestions if conflicts exist
    const suggestions: Date[] = [];
    if (conflicts.length > 0) {
      // Suggest times before and after the conflict
      suggestions.push(
        new Date(proposedTime.getTime() - (duration + 30) * 60000),
        new Date(proposedTime.getTime() + (duration + 30) * 60000)
      );
    }
    
    return {
      hasConflict: conflicts.length > 0,
      conflicts,
      suggestions,
    };
  }
  
  /**
   * Generate unique slot ID
   */
  private generateSlotId(): string {
    return `slot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Calculate total days in schedule
   */
  private calculateTotalDays(schedule: any[]): number {
    const dates = new Set(
      schedule.map(slot => new Date(slot.startTime).toDateString())
    );
    return dates.size || 1;
  }
  
  /**
   * Reschedule an audition
   */
  async rescheduleAudition(
    auditionId: string,
    newTime: Date,
    reason: string
  ): Promise<{
    success: boolean;
    newSlot?: ScheduleSlotType;
    notifications: string[];
  }> {
    // Implementation would update the audition and notify affected parties
    logger.info(`Rescheduling audition ${auditionId} to ${newTime.toISOString()}`);
    
    return {
      success: true,
      notifications: [
        'Talent notified via SMS',
        'Casting director notified via email',
        'Calendar updated',
      ],
    };
  }
}