/**
 * Enhanced AI Agent System for CastMatch
 * Incorporating learnings from OpenAI Agent SDK and Anthropic Claude API
 * 
 * Features:
 * - Agent handoffs for complex workflows
 * - Parallel tool execution
 * - Guardrails and validation
 * - Session-based conversation management
 * - Structured JSON output with schemas
 * - Chain-of-thought reasoning
 */

import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../../utils/logger';
import { cacheService } from '../../cache/redis-cache';

// ==================== Core Types ====================

export enum EnhancedAgentType {
  CASTING_DIRECTOR = 'casting_director',
  TALENT_SCOUT = 'talent_scout',
  SCRIPT_ANALYST = 'script_analyst',
  SCHEDULE_COORDINATOR = 'schedule_coordinator',
  PRODUCTION_MANAGER = 'production_manager',
  COMMUNICATION_SPECIALIST = 'communication_specialist'
}

export interface AgentCapability {
  name: string;
  description: string;
  inputSchema: z.ZodSchema;
  outputSchema: z.ZodSchema;
  tools?: string[];
}

export interface AgentHandoff {
  toAgent: EnhancedAgentType;
  reason: string;
  context: Record<string, any>;
  inputFilter?: (input: any) => any;
}

export interface AgentSession {
  id: string;
  userId: string;
  workflowName: string;
  currentAgent: EnhancedAgentType;
  conversationHistory: any[];
  context: Record<string, any>;
  metadata: Record<string, any>;
  createdAt: Date;
  lastActive: Date;
}

// ==================== Schemas ====================

const TalentMatchResultSchema = z.object({
  talentId: z.string().uuid(),
  name: z.string(),
  matchScore: z.number().min(0).max(100),
  reasons: z.array(z.string()),
  skillMatches: z.array(z.string()),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  availability: z.object({
    available: z.boolean(),
    startDate: z.string().optional(),
    constraints: z.array(z.string()).optional()
  }),
  demographics: z.object({
    ageRange: z.string(),
    location: z.string(),
    languages: z.array(z.string())
  }),
  portfolio: z.object({
    headshots: z.array(z.string()),
    reels: z.array(z.string()),
    credits: z.array(z.string())
  })
});

const ScriptAnalysisResultSchema = z.object({
  characters: z.array(z.object({
    name: z.string(),
    description: z.string(),
    ageRange: z.string(),
    gender: z.string(),
    personality: z.array(z.string()),
    physicalRequirements: z.array(z.string()),
    dialogueStyle: z.string(),
    importance: z.enum(['lead', 'supporting', 'minor']),
    screenTime: z.number().min(0).max(100)
  })),
  genre: z.string(),
  tone: z.string(),
  setting: z.object({
    timeframe: z.string(),
    location: z.string(),
    environment: z.string()
  }),
  themes: z.array(z.string()),
  complexity: z.enum(['low', 'medium', 'high']),
  castingRequirements: z.object({
    totalRoles: z.number(),
    leadRoles: z.number(),
    supportingRoles: z.number(),
    specialSkills: z.array(z.string()),
    locationRequirements: z.array(z.string())
  })
});

const ScheduleOptimizationResultSchema = z.object({
  optimizedSchedule: z.array(z.object({
    talentId: z.string().uuid(),
    talentName: z.string(),
    auditionTime: z.string().datetime(),
    duration: z.number(),
    preparation: z.number(),
    roomAssignment: z.string(),
    panelMembers: z.array(z.string()),
    conflictStatus: z.enum(['none', 'minor', 'major']),
    optimizationNotes: z.string()
  })),
  metrics: z.object({
    totalDuration: z.number(),
    utilizationRate: z.number().min(0).max(100),
    conflictCount: z.number(),
    travelTimeOptimized: z.number(),
    panelEfficiency: z.number().min(0).max(100)
  }),
  recommendations: z.array(z.string()),
  alternatives: z.array(z.object({
    description: z.string(),
    impact: z.string(),
    feasibility: z.enum(['low', 'medium', 'high'])
  }))
});

// ==================== Enhanced Agent System ====================

export class EnhancedAgentSystem {
  private anthropic: Anthropic;
  private agents: Map<EnhancedAgentType, EnhancedAgent>;
  private sessions: Map<string, AgentSession>;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    this.agents = new Map();
    this.sessions = new Map();
    this.initializeAgents();
  }

  private initializeAgents() {
    // Casting Director Agent - Orchestrates the entire casting process
    this.agents.set(EnhancedAgentType.CASTING_DIRECTOR, new EnhancedAgent(
      EnhancedAgentType.CASTING_DIRECTOR,
      "I am an expert casting director with 15+ years of experience in Mumbai's entertainment industry. I orchestrate the entire casting process, from script analysis to final talent selection.",
      [
        {
          name: 'analyze_script_for_casting',
          description: 'Analyze a script to identify casting requirements',
          inputSchema: z.object({ script: z.string(), projectType: z.string() }),
          outputSchema: ScriptAnalysisResultSchema,
          tools: ['script_parser', 'character_extractor']
        },
        {
          name: 'create_casting_strategy',
          description: 'Create comprehensive casting strategy',
          inputSchema: z.object({ analysis: ScriptAnalysisResultSchema, budget: z.number() }),
          outputSchema: z.object({ strategy: z.string(), timeline: z.array(z.string()) }),
        }
      ],
      [
        { toAgent: EnhancedAgentType.SCRIPT_ANALYST, reason: 'detailed_script_analysis', context: {} },
        { toAgent: EnhancedAgentType.TALENT_SCOUT, reason: 'talent_discovery', context: {} },
        { toAgent: EnhancedAgentType.SCHEDULE_COORDINATOR, reason: 'audition_scheduling', context: {} }
      ]
    ));

    // Talent Scout Agent - Specialized in finding and evaluating talent
    this.agents.set(EnhancedAgentType.TALENT_SCOUT, new EnhancedAgent(
      EnhancedAgentType.TALENT_SCOUT,
      "I am a talent scout specializing in discovering and evaluating actors for diverse roles. I have deep knowledge of Mumbai's talent ecosystem and can identify perfect matches.",
      [
        {
          name: 'find_talent_matches',
          description: 'Find talents matching specific criteria',
          inputSchema: z.object({ 
            role: z.string(), 
            requirements: z.array(z.string()),
            preferences: z.record(z.any()).optional()
          }),
          outputSchema: z.array(TalentMatchResultSchema),
          tools: ['talent_database', 'similarity_engine', 'portfolio_analyzer']
        },
        {
          name: 'evaluate_talent_fit',
          description: 'Evaluate how well a talent fits a specific role',
          inputSchema: z.object({ talentId: z.string(), roleRequirements: z.object({}) }),
          outputSchema: z.object({ 
            fitScore: z.number(), 
            strengths: z.array(z.string()), 
            concerns: z.array(z.string()) 
          })
        }
      ],
      [
        { toAgent: EnhancedAgentType.CASTING_DIRECTOR, reason: 'approval_needed', context: {} },
        { toAgent: EnhancedAgentType.SCHEDULE_COORDINATOR, reason: 'schedule_auditions', context: {} }
      ]
    ));

    // Add other agents...
    this.initializeOtherAgents();
  }

  private initializeOtherAgents() {
    // Script Analyst Agent
    this.agents.set(EnhancedAgentType.SCRIPT_ANALYST, new EnhancedAgent(
      EnhancedAgentType.SCRIPT_ANALYST,
      "I am an expert script analyst with deep understanding of narrative structure, character development, and casting requirements. I extract detailed insights from scripts.",
      [
        {
          name: 'deep_script_analysis',
          description: 'Perform comprehensive script analysis',
          inputSchema: z.object({ script: z.string(), focus: z.array(z.string()).optional() }),
          outputSchema: ScriptAnalysisResultSchema,
          tools: ['nlp_processor', 'character_analyzer', 'dialogue_analyzer']
        }
      ],
      [
        { toAgent: EnhancedAgentType.CASTING_DIRECTOR, reason: 'analysis_complete', context: {} }
      ]
    ));

    // Schedule Coordinator Agent
    this.agents.set(EnhancedAgentType.SCHEDULE_COORDINATOR, new EnhancedAgent(
      EnhancedAgentType.SCHEDULE_COORDINATOR,
      "I am a scheduling expert who optimizes audition schedules, manages conflicts, and ensures efficient use of time and resources.",
      [
        {
          name: 'optimize_audition_schedule',
          description: 'Create optimized audition schedule',
          inputSchema: z.object({ 
            talents: z.array(z.string()), 
            constraints: z.record(z.any()),
            preferences: z.record(z.any()).optional()
          }),
          outputSchema: ScheduleOptimizationResultSchema,
          tools: ['calendar_manager', 'conflict_detector', 'optimization_engine']
        }
      ],
      [
        { toAgent: EnhancedAgentType.CASTING_DIRECTOR, reason: 'schedule_approval', context: {} },
        { toAgent: EnhancedAgentType.COMMUNICATION_SPECIALIST, reason: 'send_notifications', context: {} }
      ]
    ));
  }

  // ==================== Session Management ====================

  async createSession(userId: string, workflowName: string, initialAgent: EnhancedAgentType): Promise<string> {
    const sessionId = `session_${userId}_${Date.now()}`;
    const session: AgentSession = {
      id: sessionId,
      userId,
      workflowName,
      currentAgent: initialAgent,
      conversationHistory: [],
      context: {},
      metadata: { traceId: sessionId, groupId: userId },
      createdAt: new Date(),
      lastActive: new Date()
    };

    this.sessions.set(sessionId, session);
    
    // Cache session for persistence
    await cacheService.set(`agent_session:${sessionId}`, session, 3600); // 1 hour TTL
    
    logger.info(`Created new agent session: ${sessionId} for user: ${userId}`, {
      workflow: workflowName,
      agent: initialAgent,
      service: 'enhanced-agent-system'
    });

    return sessionId;
  }

  async runAgentWorkflow(
    sessionId: string, 
    input: string | any[], 
    options: {
      maxTurns?: number;
      parallelTools?: boolean;
      guardrails?: boolean;
      chainOfThought?: boolean;
    } = {}
  ): Promise<{
    output: any;
    agentHandoffs: AgentHandoff[];
    toolCalls: any[];
    conversationHistory: any[];
    metadata: Record<string, any>;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const agent = this.agents.get(session.currentAgent);
    if (!agent) {
      throw new Error(`Agent not found: ${session.currentAgent}`);
    }

    const {
      maxTurns = 10,
      parallelTools = true,
      guardrails = true,
      chainOfThought = true
    } = options;

    let currentInput = typeof input === 'string' ? [{ role: 'user', content: input }] : input;
    let turns = 0;
    let handoffs: AgentHandoff[] = [];
    let allToolCalls: any[] = [];

    // Add conversation history
    currentInput = [...session.conversationHistory, ...currentInput];

    while (turns < maxTurns) {
      try {
        // Apply guardrails if enabled
        if (guardrails) {
          const guardrailCheck = await this.applyInputGuardrails(currentInput, session);
          if (!guardrailCheck.passed) {
            throw new Error(`Input guardrail failed: ${guardrailCheck.reason}`);
          }
        }

        // Build enhanced prompt with chain of thought
        const enhancedPrompt = this.buildEnhancedPrompt(agent, currentInput, {
          chainOfThought,
          parallelTools,
          sessionContext: session.context
        });

        // Call Anthropic API with tool definitions
        const response = await this.anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4096,
          tools: this.buildToolDefinitions(agent),
          messages: enhancedPrompt,
          system: agent.systemPrompt
        });

        session.lastActive = new Date();
        turns++;

        // Handle response
        if (response.stop_reason === 'tool_use') {
          // Extract tool calls
          const toolCalls = response.content.filter(block => block.type === 'tool_use');
          allToolCalls.push(...toolCalls);

          // Execute tools (parallel if enabled)
          const toolResults = parallelTools 
            ? await this.executeToolsParallel(toolCalls as any[], agent, session)
            : await this.executeToolsSequential(toolCalls as any[], agent, session);

          // Add tool results to conversation
          currentInput.push({
            role: 'assistant',
            content: response.content
          });
          currentInput.push({
            role: 'user',
            content: toolResults
          });

        } else if (response.stop_reason === 'stop_sequence') {
          // Check for handoff instructions
          const handoff = this.detectAgentHandoff(response, agent);
          if (handoff) {
            handoffs.push(handoff);
            session.currentAgent = handoff.toAgent;
            session.context = { ...session.context, ...handoff.context };
            
            // Apply input filter if specified
            if (handoff.inputFilter) {
              currentInput = handoff.inputFilter(currentInput);
            }

            // Continue with new agent
            const newAgent = this.agents.get(handoff.toAgent);
            if (newAgent) {
              logger.info(`Agent handoff: ${agent.type} -> ${handoff.toAgent}`, {
                reason: handoff.reason,
                session: sessionId
              });
              continue;
            }
          }

          // Final output
          const finalOutput = this.extractStructuredOutput(response, agent);
          
          // Apply output guardrails
          if (guardrails) {
            const outputGuardrailCheck = await this.applyOutputGuardrails(finalOutput, session);
            if (!outputGuardrailCheck.passed) {
              throw new Error(`Output guardrail failed: ${outputGuardrailCheck.reason}`);
            }
          }

          // Update session
          session.conversationHistory = currentInput;
          await cacheService.set(`agent_session:${sessionId}`, session, 3600);

          return {
            output: finalOutput,
            agentHandoffs: handoffs,
            toolCalls: allToolCalls,
            conversationHistory: session.conversationHistory,
            metadata: session.metadata
          };
        }

      } catch (error) {
        logger.error(`Agent workflow error in session ${sessionId}:`, error);
        throw error;
      }
    }

    throw new Error(`Maximum turns (${maxTurns}) exceeded for session ${sessionId}`);
  }

  // ==================== Tool Execution ====================

  private async executeToolsParallel(toolCalls: any[], agent: EnhancedAgent, session: AgentSession): Promise<any[]> {
    const toolPromises = toolCalls.map(async (toolCall) => {
      try {
        const result = await this.executeSingleTool(toolCall, agent, session);
        return {
          type: 'tool_result',
          tool_use_id: toolCall.id,
          content: JSON.stringify(result)
        };
      } catch (error) {
        logger.error(`Tool execution failed: ${toolCall.name}`, error);
        return {
          type: 'tool_result',
          tool_use_id: toolCall.id,
          content: JSON.stringify({ error: error.message, toolName: toolCall.name })
        };
      }
    });

    return await Promise.all(toolPromises);
  }

  private async executeToolsSequential(toolCalls: any[], agent: EnhancedAgent, session: AgentSession): Promise<any[]> {
    const results = [];
    
    for (const toolCall of toolCalls) {
      try {
        const result = await this.executeSingleTool(toolCall, agent, session);
        results.push({
          type: 'tool_result',
          tool_use_id: toolCall.id,
          content: JSON.stringify(result)
        });
      } catch (error) {
        logger.error(`Tool execution failed: ${toolCall.name}`, error);
        results.push({
          type: 'tool_result',
          tool_use_id: toolCall.id,
          content: JSON.stringify({ error: error.message, toolName: toolCall.name })
        });
      }
    }

    return results;
  }

  private async executeSingleTool(toolCall: any, agent: EnhancedAgent, session: AgentSession): Promise<any> {
    const capability = agent.capabilities.find(cap => cap.name === toolCall.name);
    if (!capability) {
      throw new Error(`Tool not found: ${toolCall.name}`);
    }

    // Validate input
    const validatedInput = capability.inputSchema.parse(toolCall.input);
    
    // Execute tool based on name
    switch (toolCall.name) {
      case 'find_talent_matches':
        return await this.executeTalentSearch(validatedInput, session);
      case 'deep_script_analysis':
        return await this.executeScriptAnalysis(validatedInput, session);
      case 'optimize_audition_schedule':
        return await this.executeScheduleOptimization(validatedInput, session);
      default:
        throw new Error(`Tool implementation not found: ${toolCall.name}`);
    }
  }

  // ==================== Tool Implementations ====================

  private async executeTalentSearch(input: any, session: AgentSession): Promise<any> {
    // Implementation would integrate with existing talent search
    // This is a simplified version for demonstration
    return {
      matches: [
        {
          talentId: "talent-123",
          name: "Arjun Sharma",
          matchScore: 92,
          reasons: ["Strong dramatic acting experience", "Age range matches perfectly", "Mumbai-based"],
          skillMatches: ["Method Acting", "Hindi", "English"],
          experienceLevel: "advanced",
          availability: { available: true, startDate: "2024-01-15" },
          demographics: { ageRange: "25-30", location: "Mumbai", languages: ["Hindi", "English", "Marathi"] },
          portfolio: { headshots: ["url1"], reels: ["url2"], credits: ["Film ABC", "Series XYZ"] }
        }
      ]
    };
  }

  private async executeScriptAnalysis(input: any, session: AgentSession): Promise<any> {
    // Simplified script analysis implementation
    return {
      characters: [
        {
          name: "Protagonist",
          description: "A young ambitious lawyer fighting corruption",
          ageRange: "28-35",
          gender: "Male",
          personality: ["Determined", "Idealistic", "Charismatic"],
          physicalRequirements: ["Athletic build", "Professional appearance"],
          dialogueStyle: "Eloquent and passionate",
          importance: "lead",
          screenTime: 85
        }
      ],
      genre: "Legal Drama",
      tone: "Serious with moments of hope",
      setting: { timeframe: "Contemporary", location: "Mumbai", environment: "Urban professional" },
      themes: ["Justice", "Corruption", "Personal growth"],
      complexity: "high",
      castingRequirements: {
        totalRoles: 12,
        leadRoles: 2,
        supportingRoles: 4,
        specialSkills: ["Legal terminology", "Court presence"],
        locationRequirements: ["Mumbai-based preferred"]
      }
    };
  }

  private async executeScheduleOptimization(input: any, session: AgentSession): Promise<any> {
    // Simplified schedule optimization
    return {
      optimizedSchedule: [
        {
          talentId: "talent-123",
          talentName: "Arjun Sharma",
          auditionTime: "2024-01-20T10:00:00Z",
          duration: 30,
          preparation: 15,
          roomAssignment: "Room A",
          panelMembers: ["Director", "Casting Director"],
          conflictStatus: "none",
          optimizationNotes: "Optimal morning slot for best performance"
        }
      ],
      metrics: {
        totalDuration: 480,
        utilizationRate: 85,
        conflictCount: 0,
        travelTimeOptimized: 120,
        panelEfficiency: 92
      },
      recommendations: ["Consider adding buffer time between auditions"],
      alternatives: []
    };
  }

  // ==================== Guardrails ====================

  private async applyInputGuardrails(input: any[], session: AgentSession): Promise<{ passed: boolean; reason?: string }> {
    // Check for inappropriate content, PII, etc.
    const textContent = input.map(msg => typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)).join(' ');
    
    // Basic content filtering
    const inappropriatePatterns = [
      /\b(password|credit.*card|ssn|social.*security)\b/i,
      /\b(hate|violence|discrimination)\b/i
    ];

    for (const pattern of inappropriatePatterns) {
      if (pattern.test(textContent)) {
        return { passed: false, reason: 'Inappropriate content detected' };
      }
    }

    return { passed: true };
  }

  private async applyOutputGuardrails(output: any, session: AgentSession): Promise<{ passed: boolean; reason?: string }> {
    // Validate output structure and content
    if (!output) {
      return { passed: false, reason: 'Empty output' };
    }

    // Check for data leakage
    const outputStr = JSON.stringify(output);
    if (outputStr.includes('internal_id') || outputStr.includes('password')) {
      return { passed: false, reason: 'Potential data leakage detected' };
    }

    return { passed: true };
  }

  // ==================== Helper Methods ====================

  private buildEnhancedPrompt(agent: EnhancedAgent, input: any[], options: any): any[] {
    if (options.chainOfThought) {
      const chainOfThoughtPrompt = {
        role: 'user',
        content: `Before responding, please think through this step by step:
1. What is the user asking for?
2. Which of my capabilities would be most helpful?
3. What information do I need to gather?
4. How should I structure my response?

${options.parallelTools ? 'You can use multiple tools simultaneously if they are independent operations.' : 'Use tools sequentially as needed.'}

Context from this session: ${JSON.stringify(options.sessionContext)}`
      };
      
      return [chainOfThoughtPrompt, ...input];
    }
    
    return input;
  }

  private buildToolDefinitions(agent: EnhancedAgent): any[] {
    return agent.capabilities.map(cap => ({
      name: cap.name,
      description: cap.description,
      input_schema: cap.inputSchema._def
    }));
  }

  private detectAgentHandoff(response: any, agent: EnhancedAgent): AgentHandoff | null {
    // Look for handoff indicators in the response
    const content = response.content.find((block: any) => block.type === 'text')?.text || '';
    
    // Simple pattern matching for handoffs
    if (content.includes('HANDOFF:')) {
      const handoffMatch = content.match(/HANDOFF:\s*(\w+)\s*-\s*(.+)/);
      if (handoffMatch) {
        const [, targetAgent, reason] = handoffMatch;
        const availableHandoffs = agent.handoffs;
        const validHandoff = availableHandoffs.find(h => h.toAgent === targetAgent);
        
        if (validHandoff) {
          return {
            ...validHandoff,
            reason: reason.trim()
          };
        }
      }
    }
    
    return null;
  }

  private extractStructuredOutput(response: any, agent: EnhancedAgent): any {
    const textContent = response.content.find((block: any) => block.type === 'text')?.text || '';
    
    // Try to extract JSON from the response
    try {
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      // Fallback to text content
    }
    
    return { response: textContent, type: 'text' };
  }

  // ==================== Public API ====================

  async getSessionStatus(sessionId: string): Promise<AgentSession | null> {
    return this.sessions.get(sessionId) || null;
  }

  async listUserSessions(userId: string): Promise<AgentSession[]> {
    return Array.from(this.sessions.values()).filter(session => session.userId === userId);
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    await cacheService.del(`agent_session:${sessionId}`);
  }
}

// ==================== Enhanced Agent Class ====================

class EnhancedAgent {
  constructor(
    public type: EnhancedAgentType,
    public systemPrompt: string,
    public capabilities: AgentCapability[],
    public handoffs: AgentHandoff[]
  ) {}
}

// Export singleton instance
export const enhancedAgentSystem = new EnhancedAgentSystem();