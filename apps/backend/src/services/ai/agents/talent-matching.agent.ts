/**
 * Talent Matching Agent
 * Analyzes character requirements and recommends suitable actors
 */

import { z } from 'zod';
import { getOpenAIClient, AI_MODELS, SYSTEM_PROMPTS, withRetry, calculateCost } from '../config';
import { db } from '../../../db/client';
import { talentProfiles, projects, projectRoles, users } from '../../../models/schema';
import { eq, and, gte, lte, sql, or, ilike } from 'drizzle-orm';
import { logger } from '../../../utils/logger';

// Input schemas
export const TalentMatchingInput = z.object({
  projectId: z.string().uuid().optional(),
  roleId: z.string().uuid().optional(),
  requirements: z.object({
    ageMin: z.number().optional(),
    ageMax: z.number().optional(),
    gender: z.string().optional(),
    languages: z.array(z.string()).optional(),
    skills: z.array(z.string()).optional(),
    experience: z.string().optional(),
    location: z.string().optional(),
    budgetMin: z.number().optional(),
    budgetMax: z.number().optional(),
  }).optional(),
  characterDescription: z.string().optional(),
  limit: z.number().min(1).max(50).default(10),
});

export type TalentMatchingInputType = z.infer<typeof TalentMatchingInput>;

// Output schema
export const TalentMatchResult = z.object({
  talentId: z.string(),
  userId: z.string(),
  name: z.string(),
  profileImage: z.string().nullable(),
  matchScore: z.number().min(0).max(100),
  matchReasons: z.array(z.string()),
  strengths: z.array(z.string()),
  considerations: z.array(z.string()),
  availability: z.boolean(),
  estimatedBudget: z.number().nullable(),
});

export type TalentMatchResultType = z.infer<typeof TalentMatchResult>;

export class TalentMatchingAgent {
  private openai = getOpenAIClient();
  
  /**
   * Find matching talents for a role
   */
  async findMatches(input: TalentMatchingInputType): Promise<{
    matches: TalentMatchResultType[];
    totalCandidates: number;
    searchCriteria: any;
    usage?: any;
  }> {
    try {
      // Build search criteria from input
      const criteria = await this.buildSearchCriteria(input);
      
      // Fetch candidates from database
      const candidates = await this.fetchCandidates(criteria, input.limit * 3); // Fetch 3x for AI filtering
      
      if (candidates.length === 0) {
        return {
          matches: [],
          totalCandidates: 0,
          searchCriteria: criteria,
        };
      }
      
      // Use AI to rank and score candidates
      const rankedMatches = await this.rankCandidatesWithAI(
        candidates,
        input.requirements || {},
        input.characterDescription,
        input.limit
      );
      
      return {
        matches: rankedMatches,
        totalCandidates: candidates.length,
        searchCriteria: criteria,
      };
    } catch (error) {
      logger.error('Talent matching failed:', error);
      throw error;
    }
  }
  
  /**
   * Build database search criteria from input
   */
  private async buildSearchCriteria(input: TalentMatchingInputType): Promise<any> {
    const criteria: any = {};
    
    // If roleId is provided, fetch role requirements
    if (input.roleId) {
      const role = await db
        .select()
        .from(projectRoles)
        .where(eq(projectRoles.id, input.roleId))
        .limit(1);
      
      if (role[0]) {
        criteria.ageMin = role[0].ageMin;
        criteria.ageMax = role[0].ageMax;
        criteria.gender = role[0].gender;
        criteria.languages = role[0].languages;
        criteria.skills = role[0].skills;
        criteria.experience = role[0].experience;
      }
    }
    
    // Override with explicit requirements
    if (input.requirements) {
      Object.assign(criteria, input.requirements);
    }
    
    return criteria;
  }
  
  /**
   * Fetch candidate profiles from database
   */
  private async fetchCandidates(criteria: any, limit: number): Promise<any[]> {
    const conditions = [];
    
    // Age range
    if (criteria.ageMin || criteria.ageMax) {
      const today = new Date();
      if (criteria.ageMax) {
        const minDob = new Date(today.getFullYear() - criteria.ageMax - 1, today.getMonth(), today.getDate());
        conditions.push(gte(talentProfiles.dateOfBirth, minDob));
      }
      if (criteria.ageMin) {
        const maxDob = new Date(today.getFullYear() - criteria.ageMin, today.getMonth(), today.getDate());
        conditions.push(lte(talentProfiles.dateOfBirth, maxDob));
      }
    }
    
    // Gender
    if (criteria.gender) {
      conditions.push(eq(talentProfiles.gender, criteria.gender));
    }
    
    // Location
    if (criteria.location) {
      conditions.push(
        or(
          ilike(talentProfiles.city, `%${criteria.location}%`),
          ilike(talentProfiles.state, `%${criteria.location}%`)
        )
      );
    }
    
    // Budget range
    if (criteria.budgetMin) {
      conditions.push(lte(talentProfiles.minBudget, criteria.budgetMin));
    }
    if (criteria.budgetMax) {
      conditions.push(gte(talentProfiles.maxBudget, criteria.budgetMax));
    }
    
    // Fetch profiles with user info
    const query = db
      .select({
        talentId: talentProfiles.id,
        userId: talentProfiles.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        profileImage: users.profileImage,
        stageName: talentProfiles.stageName,
        gender: talentProfiles.gender,
        dateOfBirth: talentProfiles.dateOfBirth,
        height: talentProfiles.height,
        city: talentProfiles.city,
        state: talentProfiles.state,
        languages: talentProfiles.languages,
        skills: talentProfiles.skills,
        experience: talentProfiles.experience,
        minBudget: talentProfiles.minBudget,
        maxBudget: talentProfiles.maxBudget,
        availability: talentProfiles.availability,
        rating: talentProfiles.rating,
        viewCount: talentProfiles.viewCount,
        applicationCount: talentProfiles.applicationCount,
        selectionCount: talentProfiles.selectionCount,
      })
      .from(talentProfiles)
      .innerJoin(users, eq(talentProfiles.userId, users.id))
      .limit(limit);
    
    if (conditions.length > 0) {
      query.where(and(...conditions));
    }
    
    const results = await query;
    return results;
  }
  
  /**
   * Use AI to rank and score candidates
   */
  private async rankCandidatesWithAI(
    candidates: any[],
    requirements: any,
    characterDescription?: string,
    limit: number = 10
  ): Promise<TalentMatchResultType[]> {
    const prompt = this.buildRankingPrompt(candidates, requirements, characterDescription);
    
    const response = await withRetry(async () => {
      return await this.openai.chat.completions.create({
        model: AI_MODELS.analysis,
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.talentMatching },
          { role: 'user', content: prompt }
        ],
        temperature: AI_MODELS.parameters.analysis.temperature,
        max_tokens: AI_MODELS.parameters.analysis.max_tokens,
        response_format: { type: 'json_object' },
      });
    });
    
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from AI');
    }
    
    const result = JSON.parse(content);
    
    // Log usage for cost tracking
    if (response.usage) {
      const cost = calculateCost(AI_MODELS.analysis, response.usage);
      logger.info('Talent matching AI usage:', {
        tokens: response.usage.total_tokens,
        cost: `$${cost.toFixed(4)}`,
      });
    }
    
    // Transform AI response to match output schema
    const matches: TalentMatchResultType[] = result.matches
      .slice(0, limit)
      .map((match: any) => {
        const candidate = candidates.find(c => c.talentId === match.talentId);
        return {
          talentId: match.talentId,
          userId: candidate?.userId || '',
          name: candidate?.stageName || `${candidate?.firstName} ${candidate?.lastName}`,
          profileImage: candidate?.profileImage || null,
          matchScore: match.score,
          matchReasons: match.reasons,
          strengths: match.strengths,
          considerations: match.considerations,
          availability: this.checkAvailability(candidate?.availability),
          estimatedBudget: this.estimateBudget(candidate?.minBudget, candidate?.maxBudget),
        };
      });
    
    return matches;
  }
  
  /**
   * Build prompt for AI ranking
   */
  private buildRankingPrompt(candidates: any[], requirements: any, characterDescription?: string): string {
    const candidateProfiles = candidates.map(c => ({
      talentId: c.talentId,
      name: c.stageName || `${c.firstName} ${c.lastName}`,
      gender: c.gender,
      age: c.dateOfBirth ? this.calculateAge(c.dateOfBirth) : null,
      location: `${c.city}, ${c.state}`,
      languages: c.languages,
      skills: c.skills,
      experience: c.experience,
      rating: c.rating,
      previousSelections: c.selectionCount,
    }));
    
    return `Analyze and rank these talent profiles for a casting role.

Requirements:
${JSON.stringify(requirements, null, 2)}

${characterDescription ? `Character Description: ${characterDescription}` : ''}

Talent Profiles:
${JSON.stringify(candidateProfiles, null, 2)}

Rank the top candidates and provide a JSON response with this structure:
{
  "matches": [
    {
      "talentId": "uuid",
      "score": 85,
      "reasons": ["Matches age requirement", "Has required dance skills", "Based in Mumbai"],
      "strengths": ["Experienced in similar roles", "Strong ratings"],
      "considerations": ["May need schedule adjustment", "Budget slightly higher"]
    }
  ]
}

Consider:
1. How well they match the requirements
2. Their experience and skills
3. Location and availability
4. Previous performance (rating, selections)
5. Cultural fit for Mumbai entertainment industry

Score from 0-100 based on overall match quality.`;
  }
  
  /**
   * Calculate age from date of birth
   */
  private calculateAge(dob: Date): number {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
  
  /**
   * Check availability status
   */
  private checkAvailability(availability: any): boolean {
    if (!availability) return true;
    
    // Parse availability data if it's JSON
    if (typeof availability === 'object') {
      // Check if there are any available slots
      return Object.values(availability).some((slot: any) => slot === true || slot === 'available');
    }
    
    return true;
  }
  
  /**
   * Estimate budget midpoint
   */
  private estimateBudget(min: any, max: any): number | null {
    if (!min && !max) return null;
    if (!min) return Number(max);
    if (!max) return Number(min);
    return (Number(min) + Number(max)) / 2;
  }
  
  /**
   * Get similar talents based on a reference talent
   */
  async findSimilarTalents(talentId: string, limit: number = 5): Promise<TalentMatchResultType[]> {
    // Fetch reference talent
    const referenceTalent = await db
      .select()
      .from(talentProfiles)
      .where(eq(talentProfiles.id, talentId))
      .limit(1);
    
    if (!referenceTalent[0]) {
      throw new Error('Reference talent not found');
    }
    
    const ref = referenceTalent[0];
    
    // Find similar talents based on attributes
    const similar = await this.fetchCandidates({
      gender: ref.gender,
      ageMin: ref.dateOfBirth ? this.calculateAge(ref.dateOfBirth) - 5 : undefined,
      ageMax: ref.dateOfBirth ? this.calculateAge(ref.dateOfBirth) + 5 : undefined,
      location: ref.city,
    }, limit * 2);
    
    // Filter out the reference talent
    const filtered = similar.filter(s => s.talentId !== talentId);
    
    // Use AI to rank similarity
    if (filtered.length > 0) {
      return await this.rankCandidatesWithAI(
        filtered,
        {
          skills: ref.skills,
          languages: ref.languages,
          experience: ref.experience,
        },
        `Find talents similar to ${ref.stageName} with similar skills and experience`,
        limit
      );
    }
    
    return [];
  }
}