/**
 * Voice Synthesis Service
 * Handles text-to-speech conversion using Murf AI API
 */

import { config } from '../config/config';
import { logger } from '../utils/logger';

interface VoiceConfig {
  voiceId: string;
  speed: number;
  pitch: number;
  emphasis: number;
  pause: number;
}

interface SynthesisOptions {
  voice?: 'professional' | 'friendly' | 'authoritative' | 'warm';
  speed?: number;
  emotion?: 'neutral' | 'excited' | 'calm' | 'confident';
  language?: 'en-US' | 'en-IN' | 'hi-IN';
  format?: 'mp3' | 'wav';
}

export class VoiceSynthesisService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.murf.ai/v1';
  
  // Pre-configured voices for different use cases (Murf AI voice IDs)
  private readonly voices: Record<string, VoiceConfig> = {
    professional: {
      voiceId: 'en-IN-kavya', // Professional Indian English female
      speed: 0,
      pitch: 0,
      emphasis: 0,
      pause: 0,
    },
    friendly: {
      voiceId: 'en-IN-aditi', // Friendly Indian English female
      speed: 10,
      pitch: 5,
      emphasis: 10,
      pause: 0,
    },
    authoritative: {
      voiceId: 'en-IN-ravi', // Authoritative Indian English male
      speed: -5,
      pitch: -5,
      emphasis: 20,
      pause: 5,
    },
    warm: {
      voiceId: 'en-IN-priya', // Warm Indian English female
      speed: 5,
      pitch: 10,
      emphasis: 5,
      pause: 0,
    },
  };

  constructor() {
    this.apiKey = config.murf?.apiKey || process.env.MURF_API_KEY || '';
    
    if (!this.apiKey) {
      logger.warn('Murf AI API key not configured. Voice synthesis will be disabled.');
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
      const format = options.format || 'mp3';
      
      // Clean and prepare text
      const cleanText = this.prepareText(text);
      
      if (cleanText.length > 3000) {
        throw new Error('Text too long for synthesis (max 3000 characters for Murf AI)');
      }

      const requestBody = {
        voiceId: voice.voiceId,
        text: cleanText,
        speed: voice.speed + (options.speed || 0),
        pitch: voice.pitch,
        emphasis: voice.emphasis,
        pause: voice.pause,
        format: format,
        sampleRate: 22050,
      };

      const response = await fetch(
        `${this.baseUrl}/speech/generate`,
        {
          method: 'POST',
          headers: {
            'Accept': `audio/${format}`,
            'Content-Type': 'application/json',
            'api-key': this.apiKey,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Murf AI API error: ${response.status} - ${errorText}`);
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      
      logger.info(`Synthesized ${cleanText.length} characters to ${audioBuffer.length} bytes of audio using Murf AI`);

      return {
        audioBuffer,
        mimeType: `audio/${format}`,
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
          'api-key': this.apiKey,
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
    charactersUsed: number;
    charactersLimit: number;
    canSynthesize: boolean;
  }> {
    if (!this.isAvailable()) {
      return { charactersUsed: 0, charactersLimit: 0, canSynthesize: false };
    }

    try {
      const response = await fetch(`${this.baseUrl}/user/usage`, {
        headers: {
          'api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch quota: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        charactersUsed: data.charactersUsed || 0,
        charactersLimit: data.charactersLimit || 0,
        canSynthesize: (data.charactersUsed || 0) < (data.charactersLimit || 0),
      };
    } catch (error) {
      logger.error('Failed to fetch quota:', error);
      return { charactersUsed: 0, charactersLimit: 0, canSynthesize: false };
    }
  }

  /**
   * Prepare text for synthesis
   */
  private prepareText(text: string): string {
    return text
      // Remove markdown formatting
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
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