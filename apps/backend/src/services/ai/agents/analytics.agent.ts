/**
 * Analytics Agent
 * Provides insights and performance predictions for casting operations
 */

import { z } from 'zod';
import { getOpenAIClient, AI_MODELS, SYSTEM_PROMPTS, withRetry } from '../config';
import { db } from '../../../db/client';
import { projects, applications, auditions, talentProfiles, users } from '../../../models/schema';
import { eq, sql, and, gte, lte, desc } from 'drizzle-orm';
import { logger } from '../../../utils/logger';

// Analytics query types
export const AnalyticsQueryType = z.enum([
  'project_performance',
  'talent_insights',
  'market_trends',
  'diversity_metrics',
  'cost_analysis',
  'success_prediction',
  'bottleneck_analysis',
  'recommendation_effectiveness',
]);

// Input schema
export const AnalyticsInput = z.object({
  queryType: AnalyticsQueryType,
  projectId: z.string().uuid().optional(),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }).optional(),
  filters: z.object({
    role: z.string().optional(),
    location: z.string().optional(),
    ageGroup: z.string().optional(),
    gender: z.string().optional(),
  }).optional(),
  compareWith: z.object({
    previousPeriod: z.boolean().default(false),
    industryBenchmark: z.boolean().default(false),
  }).optional(),
  format: z.enum(['summary', 'detailed', 'visualization']).default('summary'),
});

export type AnalyticsInputType = z.infer<typeof AnalyticsInput>;

// Analytics result schemas
export const MetricValue = z.object({
  value: z.number(),
  change: z.number().optional(), // Percentage change
  trend: z.enum(['up', 'down', 'stable']).optional(),
  benchmark: z.number().optional(),
});

export const AnalyticsResult = z.object({
  queryType: AnalyticsQueryType,
  period: z.object({
    start: z.string(),
    end: z.string(),
  }),
  metrics: z.record(MetricValue),
  insights: z.array(z.string()),
  recommendations: z.array(z.string()),
  predictions: z.array(z.object({
    metric: z.string(),
    prediction: z.number(),
    confidence: z.number(),
    factors: z.array(z.string()),
  })).optional(),
  visualizations: z.array(z.object({
    type: z.string(),
    data: z.any(),
    title: z.string(),
  })).optional(),
});

export type AnalyticsResultType = z.infer<typeof AnalyticsResult>;

export class AnalyticsAgent {
  private openai = getOpenAIClient();
  
  /**
   * Perform analytics query
   */
  async analyze(input: AnalyticsInputType): Promise<AnalyticsResultType> {
    try {
      // Fetch relevant data based on query type
      const data = await this.fetchAnalyticsData(input);
      
      // Generate insights using AI
      const insights = await this.generateInsights(input, data);
      
      return insights;
    } catch (error) {
      logger.error('Analytics query failed:', error);
      throw error;
    }
  }
  
  /**
   * Fetch analytics data from database
   */
  private async fetchAnalyticsData(input: AnalyticsInputType): Promise<any> {
    const data: any = {};
    
    switch (input.queryType) {
      case 'project_performance':
        data.projects = await this.fetchProjectMetrics(input);
        data.applications = await this.fetchApplicationMetrics(input);
        data.auditions = await this.fetchAuditionMetrics(input);
        break;
        
      case 'talent_insights':
        data.talents = await this.fetchTalentMetrics(input);
        data.performance = await this.fetchTalentPerformance(input);
        break;
        
      case 'market_trends':
        data.demand = await this.fetchMarketDemand(input);
        data.supply = await this.fetchTalentSupply(input);
        break;
        
      case 'diversity_metrics':
        data.diversity = await this.fetchDiversityMetrics(input);
        break;
        
      case 'cost_analysis':
        data.costs = await this.fetchCostMetrics(input);
        break;
        
      default:
        data.general = await this.fetchGeneralMetrics(input);
    }
    
    return data;
  }
  
  /**
   * Fetch project metrics
   */
  private async fetchProjectMetrics(input: AnalyticsInputType): Promise<any> {
    const conditions = [];
    
    if (input.projectId) {
      conditions.push(eq(projects.id, input.projectId));
    }
    
    if (input.dateRange) {
      conditions.push(
        and(
          gte(projects.createdAt, new Date(input.dateRange.start)),
          lte(projects.createdAt, new Date(input.dateRange.end))
        )
      );
    }
    
    const metrics = await db
      .select({
        totalProjects: sql<number>`count(*)`,
        avgApplications: sql<number>`avg(${projects.applicationCount})`,
        completionRate: sql<number>`
          sum(case when ${projects.status} = 'completed' then 1 else 0 end)::float / count(*)
        `,
      })
      .from(projects)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    return metrics[0];
  }
  
  /**
   * Fetch application metrics
   */
  private async fetchApplicationMetrics(input: AnalyticsInputType): Promise<any> {
    const metrics = await db
      .select({
        totalApplications: sql<number>`count(*)`,
        selectionRate: sql<number>`
          sum(case when ${applications.status} = 'selected' then 1 else 0 end)::float / count(*)
        `,
        avgResponseTime: sql<number>`
          avg(extract(epoch from (${applications.reviewedAt} - ${applications.createdAt})) / 3600)
        `,
        statusBreakdown: sql<any>`
          json_object_agg(${applications.status}, count(*))
        `,
      })
      .from(applications);
    
    return metrics[0];
  }
  
  /**
   * Fetch audition metrics
   */
  private async fetchAuditionMetrics(input: AnalyticsInputType): Promise<any> {
    const metrics = await db
      .select({
        totalAuditions: sql<number>`count(*)`,
        completionRate: sql<number>`
          sum(case when ${auditions.status} = 'completed' then 1 else 0 end)::float / count(*)
        `,
        noShowRate: sql<number>`
          sum(case when ${auditions.status} = 'no_show' then 1 else 0 end)::float / count(*)
        `,
        avgRating: sql<number>`avg(${auditions.rating})`,
      })
      .from(auditions);
    
    return metrics[0];
  }
  
  /**
   * Fetch talent metrics
   */
  private async fetchTalentMetrics(input: AnalyticsInputType): Promise<any> {
    const conditions = [];
    
    if (input.filters?.location) {
      conditions.push(eq(talentProfiles.city, input.filters.location));
    }
    
    if (input.filters?.gender) {
      conditions.push(eq(talentProfiles.gender, input.filters.gender));
    }
    
    const metrics = await db
      .select({
        totalTalents: sql<number>`count(*)`,
        avgRating: sql<number>`avg(${talentProfiles.rating})`,
        avgApplications: sql<number>`avg(${talentProfiles.applicationCount})`,
        avgSelections: sql<number>`avg(${talentProfiles.selectionCount})`,
        locationDistribution: sql<any>`
          json_object_agg(${talentProfiles.city}, count(*))
        `,
      })
      .from(talentProfiles)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    return metrics[0];
  }
  
  /**
   * Fetch talent performance data
   */
  private async fetchTalentPerformance(input: AnalyticsInputType): Promise<any> {
    const topPerformers = await db
      .select({
        talentId: talentProfiles.id,
        name: talentProfiles.stageName,
        rating: talentProfiles.rating,
        selections: talentProfiles.selectionCount,
        applications: talentProfiles.applicationCount,
        successRate: sql<number>`
          ${talentProfiles.selectionCount}::float / nullif(${talentProfiles.applicationCount}, 0)
        `,
      })
      .from(talentProfiles)
      .orderBy(desc(talentProfiles.rating))
      .limit(10);
    
    return topPerformers;
  }
  
  /**
   * Fetch market demand data
   */
  private async fetchMarketDemand(input: AnalyticsInputType): Promise<any> {
    // Analyze project roles to understand demand
    const demand = await db
      .select({
        roleType: sql<string>`
          case 
            when lower(${projectRoles.roleName}) like '%lead%' then 'Lead'
            when lower(${projectRoles.roleName}) like '%support%' then 'Supporting'
            else 'Other'
          end
        `,
        count: sql<number>`count(*)`,
        avgBudget: sql<number>`avg(${projectRoles.budget})`,
      })
      .from(projectRoles)
      .groupBy(sql`1`);
    
    return demand;
  }
  
  /**
   * Fetch talent supply data
   */
  private async fetchTalentSupply(input: AnalyticsInputType): Promise<any> {
    const supply = await db
      .select({
        ageGroup: sql<string>`
          case 
            when extract(year from age(${talentProfiles.dateOfBirth})) < 25 then '18-24'
            when extract(year from age(${talentProfiles.dateOfBirth})) < 35 then '25-34'
            when extract(year from age(${talentProfiles.dateOfBirth})) < 45 then '35-44'
            else '45+'
          end
        `,
        count: sql<number>`count(*)`,
        avgExperience: sql<number>`
          avg(json_array_length(${talentProfiles.experience}::json))
        `,
      })
      .from(talentProfiles)
      .groupBy(sql`1`);
    
    return supply;
  }
  
  /**
   * Fetch diversity metrics
   */
  private async fetchDiversityMetrics(input: AnalyticsInputType): Promise<any> {
    const diversity = await db
      .select({
        genderDistribution: sql<any>`
          json_object_agg(${talentProfiles.gender}, count(*))
        `,
        ethnicityDistribution: sql<any>`
          json_object_agg(${talentProfiles.ethnicity}, count(*))
        `,
        languageCount: sql<number>`
          avg(json_array_length(${talentProfiles.languages}::json))
        `,
      })
      .from(talentProfiles);
    
    return diversity[0];
  }
  
  /**
   * Fetch cost metrics
   */
  private async fetchCostMetrics(input: AnalyticsInputType): Promise<any> {
    const costs = await db
      .select({
        avgTalentBudget: sql<number>`
          avg((${talentProfiles.minBudget} + ${talentProfiles.maxBudget}) / 2)
        `,
        avgProjectBudget: sql<number>`avg(${projects.budget})`,
        budgetUtilization: sql<number>`
          avg(${projectRoles.budget} / nullif(${projects.budget}, 0))
        `,
      })
      .from(projects)
      .leftJoin(projectRoles, eq(projectRoles.projectId, projects.id))
      .leftJoin(talentProfiles, sql`true`);
    
    return costs[0];
  }
  
  /**
   * Fetch general metrics
   */
  private async fetchGeneralMetrics(input: AnalyticsInputType): Promise<any> {
    return {
      projects: await this.fetchProjectMetrics(input),
      applications: await this.fetchApplicationMetrics(input),
      auditions: await this.fetchAuditionMetrics(input),
    };
  }
  
  /**
   * Generate AI insights from data
   */
  private async generateInsights(
    input: AnalyticsInputType,
    data: any
  ): Promise<AnalyticsResultType> {
    const prompt = this.buildInsightsPrompt(input, data);
    
    const response = await withRetry(async () => {
      return await this.openai.chat.completions.create({
        model: AI_MODELS.analysis,
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.analytics },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });
    });
    
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from AI');
    }
    
    const result = JSON.parse(content);
    return this.validateAnalyticsResult(result, input);
  }
  
  /**
   * Build insights prompt
   */
  private buildInsightsPrompt(input: AnalyticsInputType, data: any): string {
    return `Analyze this casting platform data and provide insights for the Mumbai entertainment industry.

Query Type: ${input.queryType}
Date Range: ${JSON.stringify(input.dateRange)}
Filters: ${JSON.stringify(input.filters)}

Data:
${JSON.stringify(data, null, 2)}

Provide comprehensive analytics in JSON format:
{
  "queryType": "${input.queryType}",
  "period": {
    "start": "date",
    "end": "date"
  },
  "metrics": {
    "metricName": {
      "value": number,
      "change": percentage_change,
      "trend": "up/down/stable",
      "benchmark": industry_benchmark_if_available
    }
  },
  "insights": [
    "Key insight about the data",
    "Trend observation",
    "Anomaly or interesting pattern"
  ],
  "recommendations": [
    "Actionable recommendation based on data",
    "Optimization suggestion",
    "Strategic advice"
  ],
  "predictions": [
    {
      "metric": "metric_name",
      "prediction": predicted_value,
      "confidence": 0.85,
      "factors": ["factor1", "factor2"]
    }
  ]
}

Consider:
1. Mumbai market specifics (seasonality, festivals, industry trends)
2. Bollywood and regional cinema patterns
3. Talent availability and demand cycles
4. Budget optimization opportunities
5. Diversity and inclusion metrics
6. Success factors and patterns`;
  }
  
  /**
   * Validate analytics result
   */
  private validateAnalyticsResult(
    result: any,
    input: AnalyticsInputType
  ): AnalyticsResultType {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    return {
      queryType: input.queryType,
      period: {
        start: input.dateRange?.start || thirtyDaysAgo.toISOString(),
        end: input.dateRange?.end || now.toISOString(),
      },
      metrics: result.metrics || {},
      insights: result.insights || ['Data analysis completed'],
      recommendations: result.recommendations || ['Continue monitoring metrics'],
      predictions: result.predictions || undefined,
      visualizations: input.format === 'visualization' ? 
        this.generateVisualizations(result.metrics) : undefined,
    };
  }
  
  /**
   * Generate visualization data
   */
  private generateVisualizations(metrics: any): any[] {
    return [
      {
        type: 'bar',
        title: 'Key Metrics Overview',
        data: Object.entries(metrics).map(([key, value]: [string, any]) => ({
          label: key,
          value: value.value,
        })),
      },
      {
        type: 'line',
        title: 'Trend Analysis',
        data: Object.entries(metrics).map(([key, value]: [string, any]) => ({
          label: key,
          trend: value.trend,
          change: value.change,
        })),
      },
    ];
  }
  
  /**
   * Generate performance prediction
   */
  async predictPerformance(
    talentId: string,
    roleId: string
  ): Promise<{
    matchScore: number;
    successProbability: number;
    factors: string[];
    recommendations: string[];
  }> {
    // Fetch talent and role data
    const talentData = await db
      .select()
      .from(talentProfiles)
      .where(eq(talentProfiles.id, talentId))
      .limit(1);
    
    const roleData = await db
      .select()
      .from(projectRoles)
      .where(eq(projectRoles.id, roleId))
      .limit(1);
    
    if (!talentData[0] || !roleData[0]) {
      throw new Error('Talent or role not found');
    }
    
    // Use AI to predict performance
    const prompt = `Predict casting success for this talent-role combination:

Talent: ${JSON.stringify(talentData[0], null, 2)}
Role: ${JSON.stringify(roleData[0], null, 2)}

Provide prediction as JSON:
{
  "matchScore": 0-100,
  "successProbability": 0-1,
  "factors": ["positive factor", "negative factor"],
  "recommendations": ["suggestion to improve match"]
}`;
    
    const response = await withRetry(async () => {
      return await this.openai.chat.completions.create({
        model: AI_MODELS.analysis,
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.analytics },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });
    });
    
    const content = response.choices[0].message.content;
    return content ? JSON.parse(content) : {
      matchScore: 70,
      successProbability: 0.7,
      factors: ['Experience matches requirements'],
      recommendations: ['Consider additional training'],
    };
  }
}