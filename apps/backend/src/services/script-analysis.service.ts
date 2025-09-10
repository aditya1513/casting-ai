/**
 * Script Analysis Service
 * Advanced NLP for script parsing, character extraction, and requirement generation
 * Specialized for Mumbai OTT/Bollywood content with multilingual support
 */

import { Anthropic } from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import natural from 'natural';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { CacheManager } from '../config/redis';
import { embeddingService } from './embedding.service';
import { mlEngineService, RoleRequirements } from './ml-engine.service';
import { performance } from 'perf_hooks';
import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';

/**
 * Character information extracted from script
 */
export interface CharacterInfo {
  name: string;
  role: 'lead' | 'supporting' | 'cameo' | 'extra';
  description: string;
  traits: string[];
  dialogueCount: number;
  sceneCount: number;
  relationships: Array<{
    character: string;
    type: string;
  }>;
  emotionalRange: string[];
  physicalRequirements?: string[];
  ageRange?: { min: number; max: number };
  gender?: string;
  language?: string[];
  culturalContext?: string[];
}

/**
 * Scene information
 */
export interface SceneInfo {
  number: number;
  location: string;
  timeOfDay: string;
  characters: string[];
  description: string;
  mood: string;
  actionIntensity: 'low' | 'medium' | 'high';
}

/**
 * Script analysis result
 */
export interface ScriptAnalysisResult {
  title: string;
  genre: string[];
  themes: string[];
  synopsis: string;
  characters: CharacterInfo[];
  scenes: SceneInfo[];
  castingRequirements: Array<{
    character: CharacterInfo;
    requirements: RoleRequirements;
    priority: 'high' | 'medium' | 'low';
  }>;
  language: string;
  culturalElements: string[];
  productionRequirements: {
    estimatedDuration: number;
    locationCount: number;
    castSize: number;
    budgetCategory: 'low' | 'medium' | 'high';
  };
  sentiment: {
    overall: number;
    progression: number[];
  };
  keywords: string[];
}

/**
 * Script format types
 */
export enum ScriptFormat {
  FOUNTAIN = 'fountain',
  FINAL_DRAFT = 'fdx',
  CELTX = 'celtx',
  PDF = 'pdf',
  DOCX = 'docx',
  PLAIN_TEXT = 'txt',
}

class ScriptAnalysisService {
  private anthropic: Anthropic;
  private openai: OpenAI;
  private sentimentAnalyzer: natural.SentimentAnalyzer;
  private tokenizer: natural.WordTokenizer;
  private tfidf: natural.TfIdf;
  private languageDetector: natural.BayesClassifier;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Initialize NLP tools
    this.sentimentAnalyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');
    this.tokenizer = new natural.WordTokenizer();
    this.tfidf = new natural.TfIdf();
    this.languageDetector = new natural.BayesClassifier();
    
    this.initializeLanguageDetector();
  }

  /**
   * Initialize language detector with common patterns
   */
  private initializeLanguageDetector(): void {
    // English patterns
    this.languageDetector.addDocument('the and to of a in that is', 'english');
    this.languageDetector.addDocument('INT EXT FADE CUT TO SCENE', 'english');
    
    // Hindi patterns
    this.languageDetector.addDocument('aur ka ki ke hai mein se', 'hindi');
    this.languageDetector.addDocument('namaste kya haal hai aap kaise', 'hindi');
    
    // Train the classifier
    this.languageDetector.train();
  }

  /**
   * Analyze a script file
   */
  async analyzeScript(
    content: string | Buffer,
    format: ScriptFormat,
    options: {
      extractCharacters?: boolean;
      extractScenes?: boolean;
      generateCastingReqs?: boolean;
      analyzeSentiment?: boolean;
      detectLanguage?: boolean;
      cacheResults?: boolean;
    } = {}
  ): Promise<ScriptAnalysisResult> {
    const startTime = performance.now();
    const {
      extractCharacters = true,
      extractScenes = true,
      generateCastingReqs = true,
      analyzeSentiment = true,
      detectLanguage = true,
      cacheResults = true,
    } = options;

    try {
      // Convert content to text based on format
      const scriptText = await this.convertToText(content, format);
      
      // Check cache
      if (cacheResults) {
        const cacheKey = `script_analysis:${this.generateHash(scriptText)}`;
        const cached = await CacheManager.get(cacheKey);
        if (cached) {
          logger.info('Returning cached script analysis');
          return JSON.parse(cached);
        }
      }

      // Detect language
      const language = detectLanguage
        ? this.detectScriptLanguage(scriptText)
        : 'english';

      // Parse script structure
      const structure = this.parseScriptStructure(scriptText, format);

      // Extract characters
      const characters = extractCharacters
        ? await this.extractCharacters(scriptText, structure)
        : [];

      // Extract scenes
      const scenes = extractScenes
        ? this.extractScenes(scriptText, structure)
        : [];

      // Analyze themes and genre
      const { genres, themes, culturalElements } = await this.analyzeThemesAndGenre(
        scriptText,
        language
      );

      // Generate synopsis
      const synopsis = await this.generateSynopsis(scriptText, characters, scenes);

      // Sentiment analysis
      const sentiment = analyzeSentiment
        ? this.analyzeSentiment(scriptText, scenes)
        : { overall: 0, progression: [] };

      // Extract keywords
      const keywords = this.extractKeywords(scriptText);

      // Generate casting requirements
      const castingRequirements = generateCastingReqs
        ? await this.generateCastingRequirements(characters, themes, language)
        : [];

      // Calculate production requirements
      const productionRequirements = this.calculateProductionRequirements(
        characters,
        scenes,
        scriptText
      );

      const result: ScriptAnalysisResult = {
        title: structure.title || 'Untitled Script',
        genre: genres,
        themes,
        synopsis,
        characters,
        scenes,
        castingRequirements,
        language,
        culturalElements,
        productionRequirements,
        sentiment,
        keywords,
      };

      // Cache results
      if (cacheResults) {
        const cacheKey = `script_analysis:${this.generateHash(scriptText)}`;
        await CacheManager.set(cacheKey, JSON.stringify(result), 3600);
      }

      const processingTime = performance.now() - startTime;
      logger.info(`Script analysis completed in ${processingTime.toFixed(2)}ms`);

      return result;
    } catch (error) {
      logger.error('Script analysis failed:', error);
      throw new AppError('Failed to analyze script', 500);
    }
  }

  /**
   * Convert various formats to plain text
   */
  private async convertToText(content: string | Buffer, format: ScriptFormat): Promise<string> {
    switch (format) {
      case ScriptFormat.PDF:
        if (Buffer.isBuffer(content)) {
          const pdfData = await pdfParse(content);
          return pdfData.text;
        }
        throw new Error('PDF content must be a Buffer');

      case ScriptFormat.DOCX:
        if (Buffer.isBuffer(content)) {
          const result = await mammoth.extractRawText({ buffer: content });
          return result.value;
        }
        throw new Error('DOCX content must be a Buffer');

      case ScriptFormat.PLAIN_TEXT:
      case ScriptFormat.FOUNTAIN:
      default:
        return content.toString();
    }
  }

  /**
   * Parse script structure
   */
  private parseScriptStructure(
    text: string,
    format: ScriptFormat
  ): {
    title?: string;
    author?: string;
    scenes: string[];
    dialogue: Map<string, string[]>;
    actions: string[];
  } {
    const structure = {
      title: undefined as string | undefined,
      author: undefined as string | undefined,
      scenes: [] as string[],
      dialogue: new Map<string, string[]>(),
      actions: [] as string[],
    };

    const lines = text.split('\n');
    let currentCharacter: string | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Title detection
      if (trimmed.startsWith('Title:') || trimmed.startsWith('TITLE:')) {
        structure.title = trimmed.substring(6).trim();
      }
      
      // Author detection
      if (trimmed.startsWith('By:') || trimmed.startsWith('Written by:')) {
        structure.author = trimmed.replace(/^(By:|Written by:)/i, '').trim();
      }
      
      // Scene heading (INT./EXT.)
      if (/^(INT\.|EXT\.|INT\/EXT\.)/.test(trimmed)) {
        structure.scenes.push(trimmed);
        currentCharacter = null;
      }
      
      // Character name (usually in caps)
      else if (/^[A-Z][A-Z\s]+$/.test(trimmed) && trimmed.length < 30) {
        currentCharacter = trimmed;
        if (!structure.dialogue.has(currentCharacter)) {
          structure.dialogue.set(currentCharacter, []);
        }
      }
      
      // Dialogue
      else if (currentCharacter && trimmed.length > 0 && !trimmed.startsWith('(')) {
        structure.dialogue.get(currentCharacter)!.push(trimmed);
      }
      
      // Action lines
      else if (trimmed.length > 0 && !trimmed.startsWith('(') && !currentCharacter) {
        structure.actions.push(trimmed);
      }
    }

    return structure;
  }

  /**
   * Extract characters from script
   */
  private async extractCharacters(
    text: string,
    structure: any
  ): Promise<CharacterInfo[]> {
    const characters: Map<string, CharacterInfo> = new Map();

    // Extract from dialogue
    for (const [name, dialogues] of structure.dialogue.entries()) {
      const character: CharacterInfo = {
        name,
        role: this.determineCharacterRole(dialogues.length, structure.scenes.length),
        description: '',
        traits: [],
        dialogueCount: dialogues.length,
        sceneCount: 0,
        relationships: [],
        emotionalRange: [],
      };

      // Analyze dialogue for traits and emotions
      const dialogueText = dialogues.join(' ');
      character.traits = await this.extractCharacterTraits(dialogueText, name);
      character.emotionalRange = this.extractEmotions(dialogueText);
      
      characters.set(name, character);
    }

    // Use AI to extract detailed character information
    const aiCharacters = await this.extractCharactersWithAI(text);
    
    // Merge AI insights with parsed data
    for (const aiChar of aiCharacters) {
      const existing = characters.get(aiChar.name);
      if (existing) {
        existing.description = aiChar.description;
        existing.traits = [...new Set([...existing.traits, ...aiChar.traits])];
        existing.ageRange = aiChar.ageRange;
        existing.gender = aiChar.gender;
        existing.physicalRequirements = aiChar.physicalRequirements;
        existing.culturalContext = aiChar.culturalContext;
      } else {
        characters.set(aiChar.name, aiChar);
      }
    }

    // Analyze relationships
    this.analyzeCharacterRelationships(characters, text);

    return Array.from(characters.values());
  }

  /**
   * Determine character role based on dialogue count
   */
  private determineCharacterRole(
    dialogueCount: number,
    totalScenes: number
  ): 'lead' | 'supporting' | 'cameo' | 'extra' {
    const ratio = dialogueCount / Math.max(totalScenes, 1);
    
    if (ratio > 5) return 'lead';
    if (ratio > 2) return 'supporting';
    if (ratio > 0.5) return 'cameo';
    return 'extra';
  }

  /**
   * Extract character traits using NLP
   */
  private async extractCharacterTraits(
    dialogue: string,
    characterName: string
  ): Promise<string[]> {
    const traits: string[] = [];
    
    // Personality indicators
    const personalityPatterns = {
      confident: /\b(sure|definitely|absolutely|certainly|of course)\b/gi,
      nervous: /\b(um|uh|well|maybe|perhaps|I guess)\b/gi,
      aggressive: /\b(must|will|shall|demand|insist)\b/gi,
      caring: /\b(help|care|love|support|comfort)\b/gi,
      intellectual: /\b(think|believe|understand|realize|analyze)\b/gi,
    };

    for (const [trait, pattern] of Object.entries(personalityPatterns)) {
      if (pattern.test(dialogue)) {
        traits.push(trait);
      }
    }

    return traits;
  }

  /**
   * Extract emotions from text
   */
  private extractEmotions(text: string): string[] {
    const emotions = new Set<string>();
    
    const emotionKeywords = {
      happy: ['happy', 'joy', 'excited', 'delighted', 'pleased'],
      sad: ['sad', 'depressed', 'melancholy', 'sorrow', 'grief'],
      angry: ['angry', 'furious', 'rage', 'mad', 'irritated'],
      fear: ['afraid', 'scared', 'terrified', 'anxious', 'worried'],
      love: ['love', 'affection', 'caring', 'tender', 'romantic'],
      surprise: ['surprised', 'shocked', 'amazed', 'astonished'],
    };

    const lowerText = text.toLowerCase();
    
    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        emotions.add(emotion);
      }
    }

    return Array.from(emotions);
  }

  /**
   * Extract characters using AI
   */
  private async extractCharactersWithAI(text: string): Promise<CharacterInfo[]> {
    try {
      const prompt = `Analyze this script and extract all characters with their descriptions, traits, and requirements.
        Focus on Mumbai/Bollywood context. Extract:
        1. Character name
        2. Age range
        3. Gender
        4. Physical description
        5. Personality traits
        6. Cultural background
        7. Language requirements
        
        Script excerpt: ${text.substring(0, 6000)}
        
        Return as JSON array with CharacterInfo structure.`;

      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
      });

      const content = response.content[0].type === 'text' ? response.content[0].text : '[]';
      return JSON.parse(content);
    } catch (error) {
      logger.error('AI character extraction failed:', error);
      return [];
    }
  }

  /**
   * Analyze character relationships
   */
  private analyzeCharacterRelationships(
    characters: Map<string, CharacterInfo>,
    text: string
  ): void {
    const relationshipPatterns = [
      { pattern: /(\w+)'s (father|mother|parent)/gi, type: 'parent' },
      { pattern: /(\w+)'s (son|daughter|child)/gi, type: 'child' },
      { pattern: /(\w+)'s (brother|sister|sibling)/gi, type: 'sibling' },
      { pattern: /(\w+)'s (husband|wife|spouse)/gi, type: 'spouse' },
      { pattern: /(\w+)'s (friend|buddy|pal)/gi, type: 'friend' },
      { pattern: /(\w+)'s (boss|supervisor|manager)/gi, type: 'boss' },
      { pattern: /(\w+)'s (employee|subordinate|assistant)/gi, type: 'subordinate' },
    ];

    for (const [name, character] of characters.entries()) {
      for (const { pattern, type } of relationshipPatterns) {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          if (match[1] === name || match[1].toUpperCase() === name) {
            const relatedChar = Array.from(characters.keys()).find(
              charName => text.includes(`${charName} ${match[2]}`)
            );
            if (relatedChar) {
              character.relationships.push({
                character: relatedChar,
                type,
              });
            }
          }
        }
      }
    }
  }

  /**
   * Extract scenes from script
   */
  private extractScenes(text: string, structure: any): SceneInfo[] {
    const scenes: SceneInfo[] = [];
    const sceneHeadings = structure.scenes;
    
    for (let i = 0; i < sceneHeadings.length; i++) {
      const heading = sceneHeadings[i];
      const nextHeading = sceneHeadings[i + 1];
      
      // Extract scene content
      const startIndex = text.indexOf(heading);
      const endIndex = nextHeading ? text.indexOf(nextHeading) : text.length;
      const sceneContent = text.substring(startIndex, endIndex);
      
      // Parse scene heading
      const { location, timeOfDay } = this.parseSceneHeading(heading);
      
      // Find characters in scene
      const charactersInScene = this.findCharactersInScene(sceneContent, structure.dialogue);
      
      // Analyze scene mood and action
      const mood = this.analyzeSceneMood(sceneContent);
      const actionIntensity = this.analyzeActionIntensity(sceneContent);
      
      scenes.push({
        number: i + 1,
        location,
        timeOfDay,
        characters: charactersInScene,
        description: sceneContent.substring(0, 200),
        mood,
        actionIntensity,
      });
    }
    
    return scenes;
  }

  /**
   * Parse scene heading
   */
  private parseSceneHeading(heading: string): {
    location: string;
    timeOfDay: string;
  } {
    const parts = heading.split('-').map(p => p.trim());
    
    return {
      location: parts[0] || 'Unknown',
      timeOfDay: parts[1] || 'DAY',
    };
  }

  /**
   * Find characters in a scene
   */
  private findCharactersInScene(
    sceneContent: string,
    dialogueMap: Map<string, string[]>
  ): string[] {
    const characters: Set<string> = new Set();
    
    for (const character of dialogueMap.keys()) {
      if (sceneContent.includes(character)) {
        characters.add(character);
      }
    }
    
    return Array.from(characters);
  }

  /**
   * Analyze scene mood
   */
  private analyzeSceneMood(sceneContent: string): string {
    const tokens = this.tokenizer.tokenize(sceneContent.toLowerCase());
    const sentiment = this.sentimentAnalyzer.getSentiment(tokens || []);
    
    if (sentiment > 0.5) return 'positive';
    if (sentiment < -0.5) return 'negative';
    return 'neutral';
  }

  /**
   * Analyze action intensity
   */
  private analyzeActionIntensity(sceneContent: string): 'low' | 'medium' | 'high' {
    const actionWords = [
      'run', 'jump', 'fight', 'chase', 'explosion', 'crash',
      'shoot', 'battle', 'escape', 'attack', 'pursuit',
    ];
    
    const lowerContent = sceneContent.toLowerCase();
    const actionCount = actionWords.filter(word => lowerContent.includes(word)).length;
    
    if (actionCount >= 3) return 'high';
    if (actionCount >= 1) return 'medium';
    return 'low';
  }

  /**
   * Analyze themes and genre
   */
  private async analyzeThemesAndGenre(
    text: string,
    language: string
  ): Promise<{
    genres: string[];
    themes: string[];
    culturalElements: string[];
  }> {
    try {
      const prompt = `Analyze this ${language} script and identify:
        1. Genres (e.g., Drama, Romance, Action, Thriller)
        2. Themes (e.g., love, betrayal, family, justice)
        3. Cultural elements specific to Mumbai/Bollywood
        
        Text: ${text.substring(0, 4000)}
        
        Return as JSON with arrays for genres, themes, and culturalElements.`;

      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
      });

      const content = response.content[0].type === 'text' ? response.content[0].text : '{}';
      return JSON.parse(content);
    } catch (error) {
      logger.error('Theme analysis failed:', error);
      return {
        genres: ['Drama'],
        themes: [],
        culturalElements: [],
      };
    }
  }

  /**
   * Generate synopsis
   */
  private async generateSynopsis(
    text: string,
    characters: CharacterInfo[],
    scenes: SceneInfo[]
  ): Promise<string> {
    try {
      const mainCharacters = characters
        .filter(c => c.role === 'lead' || c.role === 'supporting')
        .map(c => c.name)
        .join(', ');

      const prompt = `Generate a concise synopsis (150 words) for this script.
        Main characters: ${mainCharacters}
        Number of scenes: ${scenes.length}
        Script excerpt: ${text.substring(0, 3000)}`;

      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
      });

      return response.content[0].type === 'text' 
        ? response.content[0].text 
        : 'Synopsis not available';
    } catch (error) {
      logger.error('Synopsis generation failed:', error);
      return 'Synopsis generation failed';
    }
  }

  /**
   * Analyze sentiment progression
   */
  private analyzeSentiment(
    text: string,
    scenes: SceneInfo[]
  ): {
    overall: number;
    progression: number[];
  } {
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    const overall = this.sentimentAnalyzer.getSentiment(tokens || []);
    
    const progression = scenes.map(scene => {
      const sceneTokens = this.tokenizer.tokenize(scene.description.toLowerCase());
      return this.sentimentAnalyzer.getSentiment(sceneTokens || []);
    });
    
    return { overall, progression };
  }

  /**
   * Extract keywords
   */
  private extractKeywords(text: string): string[] {
    this.tfidf.addDocument(text);
    
    const keywords: Array<{ term: string; tfidf: number }> = [];
    
    this.tfidf.listTerms(0).forEach((item: any) => {
      if (item.tfidf > 0.5) {
        keywords.push({ term: item.term, tfidf: item.tfidf });
      }
    });
    
    return keywords
      .sort((a, b) => b.tfidf - a.tfidf)
      .slice(0, 20)
      .map(k => k.term);
  }

  /**
   * Generate casting requirements
   */
  private async generateCastingRequirements(
    characters: CharacterInfo[],
    themes: string[],
    language: string
  ): Promise<Array<{
    character: CharacterInfo;
    requirements: RoleRequirements;
    priority: 'high' | 'medium' | 'low';
  }>> {
    const requirements = [];
    
    for (const character of characters) {
      const req: RoleRequirements = {
        title: `${character.name} - ${character.role}`,
        description: character.description || `${character.role} character in ${themes.join(', ')} production`,
        requiredSkills: this.mapTraitsToSkills(character.traits),
        preferredSkills: character.emotionalRange.map(e => `${e} portrayal`),
        experienceLevel: this.determineExperienceLevel(character.role),
        languages: character.language || [language],
        ageRange: character.ageRange,
        gender: character.gender,
        culturalFit: character.culturalContext,
      };
      
      requirements.push({
        character,
        requirements: req,
        priority: this.determinePriority(character.role),
      });
    }
    
    return requirements;
  }

  /**
   * Map character traits to required skills
   */
  private mapTraitsToSkills(traits: string[]): string[] {
    const skillMap: Record<string, string> = {
      confident: 'Strong stage presence',
      nervous: 'Subtle emotional expression',
      aggressive: 'Action sequences',
      caring: 'Emotional depth',
      intellectual: 'Complex dialogue delivery',
    };
    
    return traits
      .map(trait => skillMap[trait] || trait)
      .filter((skill, index, self) => self.indexOf(skill) === index);
  }

  /**
   * Determine experience level based on role
   */
  private determineExperienceLevel(role: string): string {
    switch (role) {
      case 'lead':
        return 'senior';
      case 'supporting':
        return 'mid';
      case 'cameo':
        return 'junior';
      default:
        return 'entry';
    }
  }

  /**
   * Determine casting priority
   */
  private determinePriority(role: string): 'high' | 'medium' | 'low' {
    switch (role) {
      case 'lead':
        return 'high';
      case 'supporting':
        return 'medium';
      default:
        return 'low';
    }
  }

  /**
   * Calculate production requirements
   */
  private calculateProductionRequirements(
    characters: CharacterInfo[],
    scenes: SceneInfo[],
    text: string
  ): {
    estimatedDuration: number;
    locationCount: number;
    castSize: number;
    budgetCategory: 'low' | 'medium' | 'high';
  } {
    const uniqueLocations = new Set(scenes.map(s => s.location));
    const wordCount = text.split(/\s+/).length;
    const estimatedDuration = Math.round(wordCount / 150); // Rough estimate: 150 words per minute
    
    let budgetCategory: 'low' | 'medium' | 'high' = 'low';
    
    if (characters.length > 20 || uniqueLocations.size > 10) {
      budgetCategory = 'high';
    } else if (characters.length > 10 || uniqueLocations.size > 5) {
      budgetCategory = 'medium';
    }
    
    // Check for expensive elements
    const expensiveKeywords = ['explosion', 'vfx', 'cgi', 'helicopter', 'car chase'];
    if (expensiveKeywords.some(keyword => text.toLowerCase().includes(keyword))) {
      budgetCategory = 'high';
    }
    
    return {
      estimatedDuration,
      locationCount: uniqueLocations.size,
      castSize: characters.length,
      budgetCategory,
    };
  }

  /**
   * Detect script language
   */
  private detectScriptLanguage(text: string): string {
    const sample = text.substring(0, 1000);
    const classification = this.languageDetector.classify(sample);
    
    // Additional check for Hindi/Devanagari script
    if (/[\u0900-\u097F]/.test(sample)) {
      return 'hindi';
    }
    
    return classification as string || 'english';
  }

  /**
   * Generate hash for caching
   */
  private generateHash(text: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  /**
   * Batch process multiple scripts
   */
  async batchAnalyzeScripts(
    scripts: Array<{
      id: string;
      content: string | Buffer;
      format: ScriptFormat;
    }>,
    options: {
      parallel?: boolean;
      onProgress?: (processed: number, total: number) => void;
    } = {}
  ): Promise<Map<string, ScriptAnalysisResult>> {
    const { parallel = false, onProgress } = options;
    const results = new Map<string, ScriptAnalysisResult>();

    if (parallel) {
      const promises = scripts.map(script =>
        this.analyzeScript(script.content, script.format)
          .then(result => ({ id: script.id, result }))
          .catch(error => {
            logger.error(`Script ${script.id} analysis failed:`, error);
            return null;
          })
      );

      const batchResults = await Promise.all(promises);
      
      batchResults.forEach((item, index) => {
        if (item) {
          results.set(item.id, item.result);
        }
        if (onProgress) {
          onProgress(index + 1, scripts.length);
        }
      });
    } else {
      for (let i = 0; i < scripts.length; i++) {
        try {
          const result = await this.analyzeScript(
            scripts[i].content,
            scripts[i].format
          );
          results.set(scripts[i].id, result);
        } catch (error) {
          logger.error(`Script ${scripts[i].id} analysis failed:`, error);
        }
        
        if (onProgress) {
          onProgress(i + 1, scripts.length);
        }
      }
    }

    return results;
  }
}

// Export singleton instance
export const scriptAnalysisService = new ScriptAnalysisService();