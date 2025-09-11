/**
 * Voice Synthesis Service
 * Handles text-to-speech conversion using ElevenLabs API
 */

import { config } from '../config/config';
import { logger } from '../utils/logger';

interface VoiceConfig {
  voiceId: string;
  stability: number;
  similarityBoost: number;
  style: number;
  useSpeakerBoost: boolean;
}

interface SynthesisOptions {
  voice?: 'professional' | 'friendly' | 'authoritative' | 'warm';
  speed?: number;
  emotion?: 'neutral' | 'excited' | 'calm' | 'confident';
  language?: 'en-US' | 'en-IN' | 'hi-IN';
}

export class VoiceSynthesisService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.elevenlabs.io/v1';
  
  // Pre-configured voices for different use cases
  private readonly voices: Record<string, VoiceConfig> = {
    professional: {
      voiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella - professional female
      stability: 0.75,
      similarityBoost: 0.8,
      style: 0.0,
      useSpeakerBoost: true,
    },
    friendly: {
      voiceId: 'TxGEqnHWrfWFTfGW9XjX', // Josh - friendly male
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0.2,
      useSpeakerBoost: true,
    },
    authoritative: {
      voiceId: 'VR6AewLTigWG4xSOukaG', // Arnold - authoritative
      stability: 0.9,
      similarityBoost: 0.9,
      style: 0.0,
      useSpeakerBoost: true,
    },
    warm: {
      voiceId: 'oWAxZDx7w5VEj9dCyTzz', // Grace - warm female
      stability: 0.6,
      similarityBoost: 0.7,
      style: 0.3,
      useSpeakerBoost: true,
    },
  };

  constructor() {
    this.apiKey = config.elevenlabs?.apiKey || process.env.ELEVENLABS_API_KEY || '';
    
    if (!this.apiKey) {
      logger.warn('ElevenLabs API key not configured. Voice synthesis will be disabled.');
    }
  }

  /**
   * Check if voice synthesis is available
   */
  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Synthesize text to speech
   */
  async synthesizeText(
    text: string,
    options: SynthesisOptions = {}
  ): Promise<{
    audioBuffer: Buffer;
    mimeType: string;
    duration?: number;
  }> {
    if (!this.isAvailable()) {
      throw new Error('Voice synthesis not available - API key not configured');
    }

    try {
      const voice = this.voices[options.voice || 'professional'];
      
      // Clean and prepare text
      const cleanText = this.prepareText(text);
      
      if (cleanText.length > 5000) {
        throw new Error('Text too long for synthesis (max 5000 characters)');
      }

      const requestBody = {
        text: cleanText,
        voice_settings: {
          stability: voice.stability,
          similarity_boost: voice.similarityBoost,
          style: voice.style,
          use_speaker_boost: voice.useSpeakerBoost,
        },
        model_id: this.getModelForLanguage(options.language),
      };

      const response = await fetch(
        `${this.baseUrl}/text-to-speech/${voice.voiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      
      logger.info(`Synthesized ${cleanText.length} characters to ${audioBuffer.length} bytes of audio`);

      return {
        audioBuffer,
        mimeType: 'audio/mpeg',
        duration: this.estimateDuration(cleanText),
      };
    } catch (error) {
      logger.error('Voice synthesis failed:', error);
      throw error;
    }
  }

  /**
   * Synthesize message for chat response
   */
  async synthesizeChatResponse(
    message: string,
    agentType: string = 'professional'
  ): Promise<{
    audioBuffer: Buffer;
    mimeType: string;
    duration?: number;
  }> {
    // Choose voice based on agent type
    const voiceMap: Record<string, SynthesisOptions['voice']> = {
      'talent_matching': 'friendly',
      'script_analysis': 'professional',
      'scheduling': 'authoritative',
      'communication': 'warm',
      'analytics': 'professional',
    };

    const voice = voiceMap[agentType] || 'professional';

    return this.synthesizeText(message, {
      voice,
      emotion: 'neutral',
      language: 'en-IN', // Indian English for Mumbai casting platform
    });
  }

  /**
   * Get available voices
   */
  async getAvailableVoices(): Promise<any[]> {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.status}`);
      }

      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      logger.error('Failed to fetch available voices:', error);
      return [];
    }
  }

  /**
   * Get user's voice generation quota
   */
  async getQuota(): Promise<{
    characterCount: number;
    characterLimit: number;
    canSynthesize: boolean;
  }> {
    if (!this.isAvailable()) {
      return { characterCount: 0, characterLimit: 0, canSynthesize: false };
    }

    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch quota: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        characterCount: data.subscription?.character_count || 0,
        characterLimit: data.subscription?.character_limit || 0,
        canSynthesize: data.subscription?.character_count < data.subscription?.character_limit,
      };
    } catch (error) {
      logger.error('Failed to fetch quota:', error);
      return { characterCount: 0, characterLimit: 0, canSynthesize: false };
    }
  }

  /**
   * Prepare text for synthesis
   */
  private prepareText(text: string): string {
    return text
      // Remove markdown formatting
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/#{1,6}\s/g, '')
      // Remove URLs
      .replace(/https?:\/\/[^\s]+/g, 'link')
      // Clean up extra whitespace
      .replace(/\s+/g, ' ')
      .trim()
      // Add proper pauses
      .replace(/\. /g, '. ')
      .replace(/\? /g, '? ')
      .replace(/! /g, '! ')
      .replace(/: /g, ': ')
      .replace(/; /g, '; ');
  }

  /**
   * Get appropriate model for language
   */
  private getModelForLanguage(language?: string): string {
    switch (language) {
      case 'hi-IN':
        return 'eleven_multilingual_v2';
      case 'en-IN':
      case 'en-US':
      default:
        return 'eleven_monolingual_v1';
    }
  }

  /**
   * Estimate audio duration in seconds
   */
  private estimateDuration(text: string): number {
    // Rough estimate: ~150 words per minute
    const words = text.split(/\s+/).length;
    return Math.ceil((words / 150) * 60);
  }

  /**
   * Create audio response for streaming
   */
  async *streamSynthesis(
    text: string,
    options: SynthesisOptions = {}
  ): AsyncGenerator<Buffer, void, unknown> {
    if (!this.isAvailable()) {
      throw new Error('Voice synthesis not available');
    }

    // Split text into chunks for streaming
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    for (const sentence of sentences) {
      if (sentence.trim().length > 0) {
        try {
          const result = await this.synthesizeText(sentence.trim() + '.', options);
          yield result.audioBuffer;
        } catch (error) {
          logger.error(`Failed to synthesize sentence: ${sentence}`, error);
          // Continue with next sentence rather than failing completely
        }
      }
    }
  }
}

export const voiceSynthesisService = new VoiceSynthesisService();