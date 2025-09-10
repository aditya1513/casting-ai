/**
 * Script Analysis Agent
 * Extracts character breakdowns from scripts and descriptions
 */

import { z } from 'zod';
import { getOpenAIClient, AI_MODELS, SYSTEM_PROMPTS, withRetry, calculateCost } from '../config';
import { logger } from '../../../utils/logger';

// Input schemas
export const ScriptAnalysisInput = z.object({
  scriptText: z.string().optional(),
  scriptUrl: z.string().url().optional(),
  projectDescription: z.string().optional(),
  extractionType: z.enum(['full', 'characters', 'summary']).default('characters'),
  language: z.string().default('en'),
});

export type ScriptAnalysisInputType = z.infer<typeof ScriptAnalysisInput>;

// Character breakdown schema
export const CharacterBreakdown = z.object({
  name: z.string(),
  role: z.enum(['lead', 'supporting', 'featured', 'background']),
  gender: z.string().nullable(),
  ageRange: z.object({
    min: z.number().nullable(),
    max: z.number().nullable(),
  }),
  description: z.string(),
  personality: z.array(z.string()),
  physicalAttributes: z.object({
    height: z.string().nullable(),
    build: z.string().nullable(),
    hairColor: z.string().nullable(),
    eyeColor: z.string().nullable(),
    ethnicity: z.string().nullable(),
    otherFeatures: z.array(z.string()),
  }),
  skills: z.array(z.string()),
  languages: z.array(z.string()),
  wardrobe: z.array(z.string()).optional(),
  relationships: z.array(z.object({
    character: z.string(),
    relationship: z.string(),
  })).optional(),
  arc: z.string().optional(),
  screenTime: z.enum(['high', 'medium', 'low']).optional(),
  scenes: z.array(z.string()).optional(),
});

export type CharacterBreakdownType = z.infer<typeof CharacterBreakdown>;

// Analysis result schema
export const ScriptAnalysisResult = z.object({
  title: z.string().nullable(),
  genre: z.array(z.string()),
  setting: z.string().nullable(),
  period: z.string().nullable(),
  synopsis: z.string(),
  themes: z.array(z.string()),
  characters: z.array(CharacterBreakdown),
  locations: z.array(z.string()),
  productionNotes: z.array(z.string()),
  estimatedDuration: z.string().nullable(),
  language: z.string(),
  culturalContext: z.string().nullable(),
});

export type ScriptAnalysisResultType = z.infer<typeof ScriptAnalysisResult>;

export class ScriptAnalysisAgent {
  private openai = getOpenAIClient();
  
  /**
   * Analyze script or project description
   */
  async analyzeScript(input: ScriptAnalysisInputType): Promise<{
    analysis: ScriptAnalysisResultType;
    confidence: number;
    usage?: any;
  }> {
    try {
      // Get script content
      const scriptContent = await this.getScriptContent(input);
      
      if (!scriptContent) {
        throw new Error('No script content provided');
      }
      
      // Perform analysis based on extraction type
      const analysis = await this.performAnalysis(scriptContent, input.extractionType, input.language);
      
      return analysis;
    } catch (error) {
      logger.error('Script analysis failed:', error);
      throw error;
    }
  }
  
  /**
   * Get script content from various sources
   */
  private async getScriptContent(input: ScriptAnalysisInputType): Promise<string | null> {
    if (input.scriptText) {
      return input.scriptText;
    }
    
    if (input.scriptUrl) {
      // TODO: Implement URL fetching with proper error handling
      // For now, we'll throw an error
      throw new Error('URL fetching not yet implemented');
    }
    
    if (input.projectDescription) {
      return input.projectDescription;
    }
    
    return null;
  }
  
  /**
   * Perform AI analysis on script content
   */
  private async performAnalysis(
    content: string,
    extractionType: string,
    language: string
  ): Promise<{
    analysis: ScriptAnalysisResultType;
    confidence: number;
    usage?: any;
  }> {
    const prompt = this.buildAnalysisPrompt(content, extractionType, language);
    
    const response = await withRetry(async () => {
      return await this.openai.chat.completions.create({
        model: AI_MODELS.analysis,
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.scriptAnalysis },
          { role: 'user', content: prompt }
        ],
        temperature: AI_MODELS.parameters.analysis.temperature,
        max_tokens: AI_MODELS.parameters.analysis.max_tokens,
        response_format: { type: 'json_object' },
      });
    });
    
    const responseContent = response.choices[0].message.content;
    if (!responseContent) {
      throw new Error('No response from AI');
    }
    
    const result = JSON.parse(responseContent);
    
    // Log usage for cost tracking
    if (response.usage) {
      const cost = calculateCost(AI_MODELS.analysis, response.usage);
      logger.info('Script analysis AI usage:', {
        tokens: response.usage.total_tokens,
        cost: `$${cost.toFixed(4)}`,
      });
    }
    
    // Validate and transform the result
    const analysis = this.validateAnalysisResult(result);
    
    return {
      analysis,
      confidence: result.confidence || 0.85,
      usage: response.usage,
    };
  }
  
  /**
   * Build analysis prompt
   */
  private buildAnalysisPrompt(content: string, extractionType: string, language: string): string {
    const basePrompt = `Analyze the following ${language === 'hi' ? 'Hindi' : 'English'} script/description and extract detailed information.

Content:
"""
${content.substring(0, 10000)} // Limit content length for token management
"""

Extract the following information and return as JSON:`;
    
    if (extractionType === 'full') {
      return `${basePrompt}

{
  "title": "Project title if mentioned",
  "genre": ["Genre1", "Genre2"],
  "setting": "Location and environment",
  "period": "Time period (contemporary/historical)",
  "synopsis": "Brief plot summary",
  "themes": ["Theme1", "Theme2"],
  "characters": [
    {
      "name": "Character name",
      "role": "lead/supporting/featured/background",
      "gender": "male/female/other",
      "ageRange": {"min": 20, "max": 30},
      "description": "Physical and personality description",
      "personality": ["Trait1", "Trait2"],
      "physicalAttributes": {
        "height": "tall/average/short",
        "build": "athletic/slim/average/heavy",
        "hairColor": "color",
        "eyeColor": "color",
        "ethnicity": "if specified",
        "otherFeatures": ["distinctive features"]
      },
      "skills": ["Required skills"],
      "languages": ["Languages needed"],
      "arc": "Character journey",
      "screenTime": "high/medium/low"
    }
  ],
  "locations": ["Location1", "Location2"],
  "productionNotes": ["Special requirements"],
  "estimatedDuration": "Runtime estimate",
  "language": "${language}",
  "culturalContext": "Cultural elements specific to Mumbai/Indian context",
  "confidence": 0.85
}`;
    } else if (extractionType === 'characters') {
      return `${basePrompt}

Focus on character extraction. For each character found, provide:
{
  "characters": [
    {
      "name": "Character name",
      "role": "lead/supporting/featured/background",
      "gender": "male/female/other/null if not specified",
      "ageRange": {"min": number or null, "max": number or null},
      "description": "Detailed character description",
      "personality": ["personality traits"],
      "physicalAttributes": {
        "height": "description or null",
        "build": "description or null",
        "hairColor": "color or null",
        "eyeColor": "color or null",
        "ethnicity": "if specified or null",
        "otherFeatures": ["any distinctive features"]
      },
      "skills": ["dance", "singing", "martial arts", etc.],
      "languages": ["Hindi", "English", etc.],
      "relationships": [{"character": "name", "relationship": "type"}],
      "arc": "character development",
      "screenTime": "high/medium/low"
    }
  ],
  "confidence": 0.85
}

Be thorough in extracting all character details, even minor ones.`;
    } else {
      return `${basePrompt}

Provide a summary:
{
  "title": "Title if available",
  "genre": ["Genres"],
  "synopsis": "Plot summary in 2-3 sentences",
  "themes": ["Main themes"],
  "characters": [
    {
      "name": "Character name",
      "role": "lead/supporting/featured/background",
      "description": "Brief description"
    }
  ],
  "culturalContext": "Mumbai/Indian specific elements",
  "confidence": 0.85
}`;
    }
  }
  
  /**
   * Validate and transform analysis result
   */
  private validateAnalysisResult(result: any): ScriptAnalysisResultType {
    // Ensure all required fields exist with defaults
    return {
      title: result.title || null,
      genre: result.genre || [],
      setting: result.setting || null,
      period: result.period || 'contemporary',
      synopsis: result.synopsis || '',
      themes: result.themes || [],
      characters: this.validateCharacters(result.characters || []),
      locations: result.locations || [],
      productionNotes: result.productionNotes || [],
      estimatedDuration: result.estimatedDuration || null,
      language: result.language || 'en',
      culturalContext: result.culturalContext || null,
    };
  }
  
  /**
   * Validate character data
   */
  private validateCharacters(characters: any[]): CharacterBreakdownType[] {
    return characters.map(char => ({
      name: char.name || 'Unknown',
      role: this.validateRole(char.role),
      gender: char.gender || null,
      ageRange: {
        min: char.ageRange?.min || null,
        max: char.ageRange?.max || null,
      },
      description: char.description || '',
      personality: char.personality || [],
      physicalAttributes: {
        height: char.physicalAttributes?.height || null,
        build: char.physicalAttributes?.build || null,
        hairColor: char.physicalAttributes?.hairColor || null,
        eyeColor: char.physicalAttributes?.eyeColor || null,
        ethnicity: char.physicalAttributes?.ethnicity || null,
        otherFeatures: char.physicalAttributes?.otherFeatures || [],
      },
      skills: char.skills || [],
      languages: char.languages || ['Hindi', 'English'],
      wardrobe: char.wardrobe || [],
      relationships: char.relationships || [],
      arc: char.arc || undefined,
      screenTime: char.screenTime || undefined,
      scenes: char.scenes || [],
    }));
  }
  
  /**
   * Validate role type
   */
  private validateRole(role: string): 'lead' | 'supporting' | 'featured' | 'background' {
    const validRoles = ['lead', 'supporting', 'featured', 'background'];
    const normalizedRole = role?.toLowerCase();
    
    if (validRoles.includes(normalizedRole)) {
      return normalizedRole as any;
    }
    
    // Map common variations
    if (normalizedRole?.includes('main') || normalizedRole?.includes('protagonist')) {
      return 'lead';
    }
    if (normalizedRole?.includes('support')) {
      return 'supporting';
    }
    if (normalizedRole?.includes('extra') || normalizedRole?.includes('minor')) {
      return 'background';
    }
    
    return 'featured';
  }
  
  /**
   * Extract scenes for a specific character
   */
  async extractCharacterScenes(
    scriptContent: string,
    characterName: string
  ): Promise<{
    scenes: string[];
    dialogue: string[];
    interactions: string[];
  }> {
    const prompt = `Extract all scenes, dialogue, and interactions for the character "${characterName}" from this script:

"""
${scriptContent.substring(0, 8000)}
"""

Return as JSON:
{
  "scenes": ["Scene descriptions where character appears"],
  "dialogue": ["Character's dialogue lines"],
  "interactions": ["Interactions with other characters"]
}`;
    
    const response = await withRetry(async () => {
      return await this.openai.chat.completions.create({
        model: AI_MODELS.analysis,
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.scriptAnalysis },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });
    });
    
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from AI');
    }
    
    return JSON.parse(content);
  }
  
  /**
   * Generate casting brief from analysis
   */
  async generateCastingBrief(analysis: ScriptAnalysisResultType): Promise<string> {
    const prompt = `Generate a professional casting brief for the Mumbai entertainment industry based on this analysis:

${JSON.stringify(analysis, null, 2)}

Include:
1. Project overview
2. Character requirements with specific Mumbai market considerations
3. Required skills and languages
4. Production timeline estimates
5. Special requirements or notes

Format it professionally for casting directors.`;
    
    const response = await withRetry(async () => {
      return await this.openai.chat.completions.create({
        model: AI_MODELS.chat,
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.communication },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      });
    });
    
    return response.choices[0].message.content || '';
  }
}