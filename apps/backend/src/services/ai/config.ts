/**
 * AI Service Configuration
 * Central configuration for OpenAI and other AI services
 */

import OpenAI from 'openai';
import { config } from '../../config/config';
import { logger } from '../../utils/logger';

// Rate limiting configuration
export const AI_RATE_LIMITS = {
  requestsPerMinute: 60,
  requestsPerDay: 5000,
  tokensPerMinute: 90000,
  tokensPerDay: 2000000,
};

// Model configurations
export const AI_MODELS = {
  // Primary models for different tasks
  chat: 'gpt-4-turbo-preview',
  analysis: 'gpt-4-turbo-preview',
  embedding: 'text-embedding-3-small',
  
  // Fallback models for cost optimization
  fallback: {
    chat: 'gpt-3.5-turbo',
    analysis: 'gpt-3.5-turbo',
  },
  
  // Model parameters
  parameters: {
    chat: {
      temperature: 0.7,
      max_tokens: 2000,
      top_p: 0.9,
      frequency_penalty: 0.2,
      presence_penalty: 0.1,
    },
    analysis: {
      temperature: 0.3,
      max_tokens: 3000,
      top_p: 0.95,
      frequency_penalty: 0,
      presence_penalty: 0,
    },
    creative: {
      temperature: 0.9,
      max_tokens: 2000,
      top_p: 0.95,
      frequency_penalty: 0.5,
      presence_penalty: 0.5,
    },
  },
};

// Initialize OpenAI client with error handling
let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = config.openai?.apiKey;
    
    if (!apiKey) {
      logger.error('OpenAI API key not configured');
      throw new Error('OpenAI API key is required but not configured');
    }
    
    try {
      openaiClient = new OpenAI({
        apiKey,
        maxRetries: 3,
        timeout: 30000, // 30 seconds
      });
      
      logger.info('OpenAI client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize OpenAI client:', error);
      throw new Error('Failed to initialize OpenAI client');
    }
  }
  
  return openaiClient;
}

// Cost tracking
export interface UsageMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

export function calculateCost(model: string, usage: { prompt_tokens: number; completion_tokens: number }): number {
  // Pricing per 1K tokens (as of 2024)
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    'text-embedding-3-small': { input: 0.00002, output: 0 },
  };
  
  const modelPricing = pricing[model] || pricing['gpt-3.5-turbo'];
  const inputCost = (usage.prompt_tokens / 1000) * modelPricing.input;
  const outputCost = (usage.completion_tokens / 1000) * modelPricing.output;
  
  return inputCost + outputCost;
}

// Rate limiting tracker
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private tokens: Map<string, number[]> = new Map();
  
  canMakeRequest(userId: string): boolean {
    const now = Date.now();
    const minuteAgo = now - 60000;
    const dayAgo = now - 86400000;
    
    // Clean old entries
    this.cleanOldEntries(userId, dayAgo);
    
    // Get user's request history
    const userRequests = this.requests.get(userId) || [];
    const recentRequests = userRequests.filter(t => t > minuteAgo);
    const dailyRequests = userRequests.filter(t => t > dayAgo);
    
    // Check limits
    if (recentRequests.length >= AI_RATE_LIMITS.requestsPerMinute) {
      logger.warn(`Rate limit exceeded for user ${userId}: requests per minute`);
      return false;
    }
    
    if (dailyRequests.length >= AI_RATE_LIMITS.requestsPerDay) {
      logger.warn(`Rate limit exceeded for user ${userId}: requests per day`);
      return false;
    }
    
    return true;
  }
  
  recordRequest(userId: string, tokens: number): void {
    const now = Date.now();
    
    // Record request
    const userRequests = this.requests.get(userId) || [];
    userRequests.push(now);
    this.requests.set(userId, userRequests);
    
    // Record tokens
    const userTokens = this.tokens.get(userId) || [];
    userTokens.push(tokens);
    this.tokens.set(userId, userTokens);
  }
  
  private cleanOldEntries(userId: string, threshold: number): void {
    const userRequests = this.requests.get(userId) || [];
    const userTokens = this.tokens.get(userId) || [];
    
    this.requests.set(userId, userRequests.filter(t => t > threshold));
    this.tokens.set(userId, userTokens.filter(t => t > threshold));
  }
  
  getRemainingQuota(userId: string): {
    requestsRemaining: number;
    tokensRemaining: number;
    resetInMinutes: number;
  } {
    const now = Date.now();
    const minuteAgo = now - 60000;
    const dayAgo = now - 86400000;
    
    const userRequests = this.requests.get(userId) || [];
    const recentRequests = userRequests.filter(t => t > minuteAgo).length;
    const dailyRequests = userRequests.filter(t => t > dayAgo).length;
    
    return {
      requestsRemaining: Math.min(
        AI_RATE_LIMITS.requestsPerMinute - recentRequests,
        AI_RATE_LIMITS.requestsPerDay - dailyRequests
      ),
      tokensRemaining: AI_RATE_LIMITS.tokensPerMinute, // Simplified for now
      resetInMinutes: 1,
    };
  }
}

export const rateLimiter = new RateLimiter();

// Error handling with retries
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on certain errors
      if (error.status === 401 || error.status === 403) {
        throw error;
      }
      
      // Rate limit error - wait longer
      if (error.status === 429) {
        const waitTime = error.headers?.['retry-after'] 
          ? parseInt(error.headers['retry-after']) * 1000 
          : delay * Math.pow(2, i);
        
        logger.warn(`Rate limited, waiting ${waitTime}ms before retry ${i + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // Other errors - exponential backoff
      if (i < maxRetries - 1) {
        const waitTime = delay * Math.pow(2, i);
        logger.warn(`Request failed, waiting ${waitTime}ms before retry ${i + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw lastError;
}

// System prompts for Mumbai casting industry context
export const SYSTEM_PROMPTS = {
  base: `You are CastMatch AI, an intelligent assistant for the Mumbai entertainment industry. 
You have deep knowledge of Bollywood, regional cinema, theater, and commercial productions.
You understand the unique requirements of Indian casting, including language diversity, 
cultural nuances, and industry-specific terminology.`,

  talentMatching: `You are a talent matching specialist for the Mumbai entertainment industry.
You analyze character requirements and actor profiles to find the best matches.
Consider factors like:
- Physical attributes and appearance
- Acting experience and training
- Language proficiency (Hindi, English, regional languages)
- Previous work in similar roles
- Availability and location
- Budget compatibility
- Cultural fit for the character`,

  scriptAnalysis: `You are a script analyst specializing in Indian cinema and theater.
Extract detailed character information including:
- Character name and role importance
- Age range and gender
- Physical description
- Personality traits and arc
- Required skills (dance, martial arts, singing, etc.)
- Language requirements
- Screen time estimation
- Cultural and social background`,

  scheduling: `You are a production scheduling expert for Mumbai's entertainment industry.
Optimize audition schedules considering:
- Actor availability and other commitments
- Studio/location availability
- Casting director schedules
- Travel time in Mumbai traffic
- Meal breaks and union regulations
- Festival dates and holidays
- Optimal time slots for different actor categories`,

  communication: `You are a professional communication specialist for the casting industry.
Generate clear, respectful, and culturally appropriate messages.
Use formal but friendly tone suitable for Indian business culture.
Include all necessary details while being concise.`,

  analytics: `You are a data analyst for the casting industry.
Provide insights on:
- Talent pool trends
- Success rates and patterns
- Budget optimization
- Time-to-fill metrics
- Diversity and representation
- Market demand for different role types`,
};