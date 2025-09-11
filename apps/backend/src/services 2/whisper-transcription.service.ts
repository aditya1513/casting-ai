/**
 * Whisper Transcription Service
 * Handles speech-to-text conversion using OpenAI Whisper API
 */

import { config } from '../config/config';
import { logger } from '../utils/logger';
import FormData from 'form-data';

interface TranscriptionOptions {
  language?: 'en' | 'hi' | 'auto';
  model?: 'whisper-1';
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  temperature?: number;
  prompt?: string;
}

interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
  segments?: Array<{
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
    temperature: number;
    avg_logprob: number;
    compression_ratio: number;
    no_speech_prob: number;
  }>;
}

export class WhisperTranscriptionService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.openai.com/v1';

  constructor() {
    this.apiKey = config.openai?.apiKey || process.env.OPENAI_API_KEY || '';
    
    if (!this.apiKey) {
      logger.warn('OpenAI API key not configured. Whisper transcription will be disabled.');
    }
  }

  /**
   * Check if transcription is available
   */
  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Transcribe audio to text using Whisper
   */
  async transcribeAudio(
    audioBuffer: Buffer,
    filename: string,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    if (!this.isAvailable()) {
      throw new Error('Whisper transcription not available - API key not configured');
    }

    try {
      // Validate audio file size (max 25MB for Whisper)
      if (audioBuffer.length > 25 * 1024 * 1024) {
        throw new Error('Audio file too large (max 25MB for Whisper)');
      }

      const formData = new FormData();
      formData.append('file', audioBuffer, {
        filename: filename,
        contentType: this.getContentType(filename),
      });
      formData.append('model', options.model || 'whisper-1');
      formData.append('response_format', options.responseFormat || 'verbose_json');
      
      if (options.language && options.language !== 'auto') {
        formData.append('language', options.language);
      }
      
      if (options.temperature !== undefined) {
        formData.append('temperature', options.temperature.toString());
      }
      
      if (options.prompt) {
        formData.append('prompt', options.prompt);
      }

      const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          ...formData.getHeaders(),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Whisper API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      logger.info(`Transcribed ${audioBuffer.length} bytes of audio to ${result.text?.length || 0} characters`);

      // Handle different response formats
      if (options.responseFormat === 'text') {
        return { text: result };
      }

      return {
        text: result.text || '',
        language: result.language,
        duration: result.duration,
        segments: result.segments,
      };
    } catch (error) {
      logger.error('Whisper transcription failed:', error);
      throw error;
    }
  }

  /**
   * Transcribe audio file for real-time processing
   */
  async transcribeForChat(
    audioBuffer: Buffer,
    filename: string,
    userId?: string
  ): Promise<{
    text: string;
    confidence: number;
    language: string;
    processingTime: number;
  }> {
    const startTime = Date.now();

    try {
      // Use optimized settings for chat transcription
      const result = await this.transcribeAudio(audioBuffer, filename, {
        language: 'auto', // Auto-detect for multilingual Mumbai market
        responseFormat: 'verbose_json',
        temperature: 0.0, // Lower temperature for more consistent results
        prompt: 'This is a conversation about casting, acting, auditions, and entertainment industry in Mumbai, India.',
      });

      const processingTime = Date.now() - startTime;
      
      // Calculate confidence score from segments
      let avgConfidence = 0.8; // Default confidence
      if (result.segments && result.segments.length > 0) {
        const avgLogProb = result.segments.reduce((sum, seg) => sum + seg.avg_logprob, 0) / result.segments.length;
        // Convert log probability to confidence (rough approximation)
        avgConfidence = Math.max(0.1, Math.min(1.0, Math.exp(avgLogProb)));
      }

      logger.info(`Whisper transcription for user ${userId}: ${result.text?.substring(0, 50)}... (${processingTime}ms)`);

      return {
        text: result.text || '',
        confidence: avgConfidence,
        language: result.language || 'en',
        processingTime,
      };
    } catch (error) {
      logger.error('Chat transcription failed:', error);
      throw error;
    }
  }

  /**
   * Transcribe audio with speaker diarization context
   */
  async transcribeWithContext(
    audioBuffer: Buffer,
    filename: string,
    context: {
      previousMessages?: string[];
      speakerInfo?: string;
      domain?: 'casting' | 'audition' | 'production';
    } = {}
  ): Promise<TranscriptionResult> {
    // Build contextual prompt for better accuracy
    let prompt = 'This is a conversation about';
    
    switch (context.domain) {
      case 'casting':
        prompt += ' casting directors, talent selection, and actor recruitment in Mumbai film industry.';
        break;
      case 'audition':
        prompt += ' auditions, performances, and talent evaluation for films and productions.';
        break;
      case 'production':
        prompt += ' film production, shooting schedules, and entertainment industry operations.';
        break;
      default:
        prompt += ' the entertainment and film industry in Mumbai, India.';
    }

    if (context.previousMessages && context.previousMessages.length > 0) {
      prompt += ' Previous context: ' + context.previousMessages.slice(-2).join(' ');
    }

    return this.transcribeAudio(audioBuffer, filename, {
      language: 'auto',
      responseFormat: 'verbose_json',
      temperature: 0.1,
      prompt: prompt.substring(0, 224), // Whisper prompt limit
    });
  }

  /**
   * Get content type for audio file
   */
  private getContentType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'mp3':
        return 'audio/mpeg';
      case 'wav':
        return 'audio/wav';
      case 'webm':
        return 'audio/webm';
      case 'm4a':
        return 'audio/mp4';
      case 'ogg':
        return 'audio/ogg';
      default:
        return 'audio/mpeg';
    }
  }

  /**
   * Convert audio format if needed (placeholder for future enhancement)
   */
  private async convertAudioFormat(
    audioBuffer: Buffer,
    targetFormat: 'mp3' | 'wav' = 'mp3'
  ): Promise<Buffer> {
    // For now, return as-is
    // TODO: Implement audio conversion using ffmpeg if needed
    return audioBuffer;
  }

  /**
   * Split long audio into chunks for processing
   */
  async transcribeLongAudio(
    audioBuffer: Buffer,
    filename: string,
    options: TranscriptionOptions = {}
  ): Promise<{
    fullText: string;
    segments: TranscriptionResult[];
    totalDuration: number;
  }> {
    // For files larger than 20MB, we should split them
    if (audioBuffer.length <= 20 * 1024 * 1024) {
      const result = await this.transcribeAudio(audioBuffer, filename, options);
      return {
        fullText: result.text,
        segments: [result],
        totalDuration: result.duration || 0,
      };
    }

    // TODO: Implement audio chunking for large files
    // For now, throw an error for very large files
    throw new Error('Audio file too large. Please split into smaller chunks.');
  }
}

export const whisperTranscriptionService = new WhisperTranscriptionService();