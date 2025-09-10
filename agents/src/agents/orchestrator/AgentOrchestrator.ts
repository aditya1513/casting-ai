import { 
  scriptAnalysisAgent,
  talentDiscoveryAgent,
  applicationScreeningAgent,
  auditionSchedulingAgent,
} from '../index.js';

import {
  CastingProject,
  RoleRequirement,
  TalentProfile,
  ScriptAnalysisResult,
  TalentSearchParams,
  ApplicationScreeningResult,
} from '../../types/agent.types.js';

interface WorkflowRequest {
  type: 'full_casting_workflow' | 'script_to_shortlist' | 'scheduling_optimization';
  projectId: string;
  input: any;
  options?: {
    priority: 'high' | 'medium' | 'low';
    notifications: boolean;
    autoApproval: boolean;
  };
}

interface WorkflowResult {
  workflowId: string;
  status: 'completed' | 'partial' | 'failed';
  results: {
    scriptAnalysis?: ScriptAnalysisResult;
    talentSearchResults?: any;
    screeningResults?: ApplicationScreeningResult[];
    schedulingResults?: any;
  };
  timeline: {
    started: Date;
    completed?: Date;
    duration?: number;
  };
  summary: {
    totalSteps: number;
    completedSteps: number;
    errors: string[];
    recommendations: string[];
  };
}

export class AgentOrchestrator {
  private activeWorkflows: Map<string, any> = new Map();
  
  /**
   * Execute complete casting workflow from script to scheduled auditions
   */
  async executeFullCastingWorkflow(request: {
    projectId: string;
    scriptFile: Buffer | string;
    fileType: 'pdf' | 'doc' | 'docx' | 'txt';
    projectContext: {
      type: 'film' | 'tv-series' | 'web-series' | 'commercial';
      genre?: string[];
      budgetTier?: 'low' | 'medium' | 'high';
    };
    castingPreferences: {
      priorityRoles: string[];
      budgetConstraints: { total: number; perRole: number };
      timeline: { castingDeadline: Date; auditionDates: Date[] };
    };
  }): Promise<WorkflowResult> {
    const workflowId = `workflow_${Date.now()}`;
    const startTime = Date.now();
    
    try {
      console.log(`Starting full casting workflow: ${workflowId}`);
      
      // Step 1: Script Analysis
      console.log('Step 1: Analyzing script...');
      const scriptAnalysis = await scriptAnalysisAgent.analyzeScript(
        request.scriptFile,
        request.fileType,
        request.projectContext
      );

      // Step 2: Create role requirements from script analysis
      const roleRequirements = this.convertScriptAnalysisToRoles(
        scriptAnalysis,
        request.castingPreferences
      );

      // Step 3: Talent Discovery for each role
      console.log('Step 2: Discovering talent...');
      const talentSearchResults = await Promise.all(
        roleRequirements.map(role => 
          this.searchTalentForRole(role, request.castingPreferences)
        )
      );

      // Step 4: Application Screening (simulate applications)
      console.log('Step 3: Screening applications...');
      const screeningResults = await this.screenCandidatesForRoles(
        talentSearchResults,
        roleRequirements
      );

      // Step 5: Schedule auditions for shortlisted candidates
      console.log('Step 4: Scheduling auditions...');
      const schedulingResults = await this.scheduleAuditionsForProject(
        screeningResults,
        request.castingPreferences.timeline
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      const result: WorkflowResult = {
        workflowId,
        status: 'completed',
        results: {
          scriptAnalysis,
          talentSearchResults,
          screeningResults,
          schedulingResults,
        },
        timeline: {
          started: new Date(startTime),
          completed: new Date(endTime),
          duration,
        },
        summary: {
          totalSteps: 4,
          completedSteps: 4,
          errors: [],
          recommendations: this.generateWorkflowRecommendations(
            scriptAnalysis,
            talentSearchResults,
            screeningResults
          ),
        },
      };

      console.log(`Workflow completed in ${duration}ms`);
      return result;

    } catch (error) {
      console.error(`Workflow ${workflowId} failed:`, error);
      
      return {
        workflowId,
        status: 'failed',
        results: {},
        timeline: {
          started: new Date(startTime),
          duration: Date.now() - startTime,
        },
        summary: {
          totalSteps: 4,
          completedSteps: 0,
          errors: [error.message],
          recommendations: ['Manual intervention required'],
        },
      };
    }
  }

  /**
   * Execute script-to-shortlist workflow
   */
  async executeScriptToShortlistWorkflow(request: {
    scriptFile: Buffer | string;
    fileType: string;
    projectContext: any;
    maxCandidatesPerRole: number;
  }): Promise<{
    scriptAnalysis: ScriptAnalysisResult;
    shortlists: Array<{
      roleName: string;
      candidates: TalentProfile[];
      recommendations: string[];
    }>;
  }> {
    try {
      // Analyze script
      const scriptAnalysis = await scriptAnalysisAgent.analyzeScript(
        request.scriptFile,
        request.fileType as any,
        request.projectContext
      );

      // Generate shortlists for each character
      const shortlists = await Promise.all(
        scriptAnalysis.characters.map(async (character) => {
          const searchParams: TalentSearchParams = {
            roleDescription: character.description,
            physicalRequirements: {
              ageRange: this.parseAgeRange(character.ageRange),
              gender: character.gender,
            },
            experienceLevel: this.mapImportanceToExperience(character.importance),
            budgetRange: this.estimateBudgetRange(character.budgetTier),
            locationPreference: 'Mumbai',
            availabilityWindow: {
              start: new Date(),
              end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
            },
            specialSkills: character.specialSkills,
          };

          const searchResults = await talentDiscoveryAgent.searchTalent(searchParams);
          
          return {
            roleName: character.name,
            candidates: searchResults.candidates.slice(0, request.maxCandidatesPerRole),
            recommendations: [
              `Found ${searchResults.candidates.length} suitable candidates`,
              `Average match score: ${searchResults.rankings.reduce((sum, r) => sum + r.matchScore, 0) / searchResults.rankings.length}`,
              `Search completed in ${searchResults.searchMetrics.searchTime}ms`,
            ],
          };
        })
      );

      return { scriptAnalysis, shortlists };
    } catch (error) {
      console.error('Script-to-shortlist workflow failed:', error);
      throw error;
    }
  }

  /**
   * Optimize existing audition schedule
   */
  async optimizeScheduling(request: {
    projectId: string;
    existingSchedule: any[];
    constraints: any;
    optimizationGoals: ('minimize_time' | 'maximize_efficiency' | 'reduce_conflicts')[];
  }): Promise<{
    originalSchedule: any[];
    optimizedSchedule: any[];
    improvements: {
      timeSaved: number;
      conflictsResolved: number;
      efficiencyGain: number;
    };
    recommendations: string[];
  }> {
    try {
      // This would use the scheduling agent to optimize
      const optimizedSchedule = await auditionSchedulingAgent.scheduleAuditions({
        projectId: request.projectId,
        roleId: 'optimization',
        candidates: request.existingSchedule.map(s => s.talentId),
        preferences: request.constraints.preferences,
        constraints: request.constraints.constraints,
      });

      return {
        originalSchedule: request.existingSchedule,
        optimizedSchedule: optimizedSchedule.scheduledAuditions,
        improvements: {
          timeSaved: this.calculateTimeSavings(request.existingSchedule, optimizedSchedule.scheduledAuditions),
          conflictsResolved: optimizedSchedule.conflicts.length,
          efficiencyGain: 15, // Placeholder percentage
        },
        recommendations: optimizedSchedule.suggestions,
      };
    } catch (error) {
      console.error('Schedule optimization failed:', error);
      throw error;
    }
  }

  /**
   * Get workflow status
   */
  getWorkflowStatus(workflowId: string): {
    status: string;
    progress: number;
    currentStep: string;
    estimatedCompletion?: Date;
  } | null {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) return null;

    return {
      status: workflow.status,
      progress: (workflow.completedSteps / workflow.totalSteps) * 100,
      currentStep: workflow.currentStep,
      estimatedCompletion: workflow.estimatedCompletion,
    };
  }

  /**
   * Cancel active workflow
   */
  async cancelWorkflow(workflowId: string): Promise<{ success: boolean; message: string }> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      return { success: false, message: 'Workflow not found' };
    }

    workflow.status = 'cancelled';
    this.activeWorkflows.delete(workflowId);

    return { success: true, message: 'Workflow cancelled successfully' };
  }

  // Private helper methods
  private convertScriptAnalysisToRoles(
    analysis: ScriptAnalysisResult,
    preferences: any
  ): RoleRequirement[] {
    return analysis.characters.map((character, index) => ({
      id: `role_${index}`,
      characterName: character.name,
      description: character.description,
      importance: character.importance as any,
      ageRange: this.parseAgeRange(character.ageRange),
      gender: character.gender as any,
      skills: character.specialSkills,
      experience: this.mapImportanceToExperience(character.importance),
      budgetRange: this.estimateBudgetRange(character.budgetTier),
      availability: {
        startDate: new Date(),
        endDate: preferences.timeline.castingDeadline,
        location: 'Mumbai',
      },
    }));
  }

  private async searchTalentForRole(
    role: RoleRequirement,
    preferences: any
  ): Promise<any> {
    const searchParams: TalentSearchParams = {
      roleDescription: role.description,
      physicalRequirements: {
        ageRange: role.ageRange,
        gender: role.gender,
      },
      experienceLevel: role.experience || 'any',
      budgetRange: role.budgetRange || { min: 0, max: preferences.budgetConstraints.perRole },
      locationPreference: role.availability.location,
      availabilityWindow: {
        start: role.availability.startDate,
        end: role.availability.endDate,
      },
      specialSkills: role.skills,
    };

    return await talentDiscoveryAgent.searchTalent(searchParams);
  }

  private async screenCandidatesForRoles(
    talentSearchResults: any[],
    roleRequirements: RoleRequirement[]
  ): Promise<ApplicationScreeningResult[]> {
    const allScreeningResults: ApplicationScreeningResult[] = [];

    for (let i = 0; i < talentSearchResults.length; i++) {
      const searchResult = talentSearchResults[i];
      const role = roleRequirements[i];

      // Simulate applications from discovered talent
      const mockApplications = searchResult.candidates.slice(0, 10).map((candidate: TalentProfile) => ({
        id: `app_${candidate.id}_${role.id}`,
        talentId: candidate.id,
        roleId: role.id,
        projectId: 'current_project',
        submittedAt: new Date(),
        talentProfile: candidate,
        applicationMaterials: {
          coverLetter: `I am very interested in the role of ${role.characterName}`,
        },
        status: 'submitted' as const,
      }));

      // Screen each application
      for (const application of mockApplications) {
        try {
          const screeningResult = await applicationScreeningAgent.screenApplication(
            application,
            role,
            {
              minimumScore: 70,
              autoRejectThreshold: 40,
              priorityFactors: ['experience', 'physical_fit'],
            }
          );
          allScreeningResults.push(screeningResult);
        } catch (error) {
          console.error(`Failed to screen application ${application.id}:`, error);
        }
      }
    }

    return allScreeningResults;
  }

  private async scheduleAuditionsForProject(
    screeningResults: ApplicationScreeningResult[],
    timeline: any
  ): Promise<any> {
    // Get shortlisted candidates
    const shortlistedCandidates = screeningResults
      .filter(result => result.recommendation === 'shortlist')
      .map(result => result.applicationId.split('_')[1]); // Extract talent ID

    if (shortlistedCandidates.length === 0) {
      return { message: 'No candidates shortlisted for auditions' };
    }

    // Schedule auditions
    const schedulingRequest = {
      projectId: 'current_project',
      roleId: 'multiple_roles',
      candidates: shortlistedCandidates,
      preferences: {
        dateRange: {
          start: new Date(),
          end: timeline.auditionDates[0] || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        timeSlots: [
          { start: '09:00', end: '17:00' },
        ],
        duration: 30,
        bufferTime: 15,
        location: 'CastMatch Studios, Mumbai',
        auditionType: 'in-person' as const,
      },
      constraints: {
        maxAuditionsPerDay: 8,
      },
    };

    return await auditionSchedulingAgent.scheduleAuditions(schedulingRequest);
  }

  private generateWorkflowRecommendations(
    scriptAnalysis: ScriptAnalysisResult,
    talentResults: any[],
    screeningResults: ApplicationScreeningResult[]
  ): string[] {
    const recommendations: string[] = [];

    // Script analysis recommendations
    const leadRoles = scriptAnalysis.characters.filter(c => c.importance === 'lead').length;
    if (leadRoles > 3) {
      recommendations.push('Consider consolidating lead roles to manage casting complexity');
    }

    // Talent discovery recommendations
    const avgCandidatesPerRole = talentResults.reduce((sum, r) => sum + r.candidates.length, 0) / talentResults.length;
    if (avgCandidatesPerRole < 5) {
      recommendations.push('Expand search criteria to increase candidate pool');
    }

    // Screening recommendations  
    const shortlistRate = screeningResults.filter(r => r.recommendation === 'shortlist').length / screeningResults.length;
    if (shortlistRate < 0.2) {
      recommendations.push('Review role requirements - screening criteria may be too strict');
    }

    return recommendations;
  }

  private parseAgeRange(ageRangeString: string): { min: number; max: number } {
    const match = ageRangeString.match(/(\d+)-(\d+)/);
    if (match) {
      return { min: parseInt(match[1]), max: parseInt(match[2]) };
    }
    return { min: 25, max: 35 }; // Default range
  }

  private mapImportanceToExperience(importance: string): string {
    switch (importance) {
      case 'lead': return 'experienced';
      case 'supporting': return 'emerging';
      case 'background': return 'newcomer';
      default: return 'any';
    }
  }

  private estimateBudgetRange(budgetTier: string): { min: number; max: number } {
    switch (budgetTier) {
      case 'A': return { min: 50000, max: 200000 };
      case 'B': return { min: 20000, max: 50000 };
      case 'C': return { min: 5000, max: 20000 };
      default: return { min: 0, max: 100000 };
    }
  }

  private calculateTimeSavings(originalSchedule: any[], optimizedSchedule: any[]): number {
    // Simplified calculation - in reality this would be more complex
    return Math.max(0, originalSchedule.length - optimizedSchedule.length) * 30; // 30 minutes saved per removed item
  }
}

// Export singleton instance
export const agentOrchestrator = new AgentOrchestrator();