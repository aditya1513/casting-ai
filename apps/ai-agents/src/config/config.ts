/**
 * Configuration management for AI Agents Server
 * Loads and validates all environment variables
 */

import { z } from 'zod';

// Environment validation schema
const envSchema = z.object({
  // Server Configuration
  PORT: z.string().default('8080').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // AI API Keys
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API key is required'),
  ANTHROPIC_API_KEY: z.string().min(1, 'Anthropic API key is required'),

  // Vector Database
  QDRANT_URL: z.string().url('Invalid Qdrant URL'),
  QDRANT_API_KEY: z.string().optional(),

  // Database
  DATABASE_URL: z.string().url('Invalid database URL'),

  // Performance Settings
  MAX_CONCURRENT_REQUESTS: z.string().default('10').transform(Number),
  REQUEST_TIMEOUT_MS: z.string().default('30000').transform(Number),
  RATE_LIMIT_PER_MINUTE: z.string().default('60').transform(Number),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE: z.string().optional(),

  // CORS
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001'),

  // Feature Flags
  ENABLE_SCRIPT_ANALYSIS: z.string().default('true').transform(val => val === 'true'),
  ENABLE_TALENT_DISCOVERY: z.string().default('true').transform(val => val === 'true'),
  ENABLE_SMART_CHAT: z.string().default('true').transform(val => val === 'true'),
  ENABLE_VECTOR_SEARCH: z.string().default('true').transform(val => val === 'true'),
  ENABLE_CACHING: z.string().default('true').transform(val => val === 'true'),
});

// Parse and validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Configuration validation failed:\n${missingVars.join('\n')}`);
    }
    throw error;
  }
};

const env = parseEnv();

// Export typed configuration
export const config = {
  // Server
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',

  // AI Services
  openaiApiKey: env.OPENAI_API_KEY,
  anthropicApiKey: env.ANTHROPIC_API_KEY,

  // Vector Database
  qdrantUrl: env.QDRANT_URL,
  qdrantApiKey: env.QDRANT_API_KEY,

  // Database
  databaseUrl: env.DATABASE_URL,

  // Performance
  maxConcurrentRequests: env.MAX_CONCURRENT_REQUESTS,
  requestTimeoutMs: env.REQUEST_TIMEOUT_MS,
  rateLimitPerMinute: env.RATE_LIMIT_PER_MINUTE,

  // Logging
  logLevel: env.LOG_LEVEL,
  logFile: env.LOG_FILE,

  // CORS
  allowedOrigins: env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()),

  // Features
  features: {
    scriptAnalysis: env.ENABLE_SCRIPT_ANALYSIS,
    talentDiscovery: env.ENABLE_TALENT_DISCOVERY,
    smartChat: env.ENABLE_SMART_CHAT,
    vectorSearch: env.ENABLE_VECTOR_SEARCH,
    caching: env.ENABLE_CACHING,
  },

  // AI Model Configuration
  ai: {
    openai: {
      model: 'gpt-4-turbo-preview',
      maxTokens: 4096,
      temperature: 0.7,
    },
    anthropic: {
      model: 'claude-3-haiku-20240307',
      maxTokens: 4096,
      temperature: 0.7,
    },
  },

  // Vector Search Configuration
  vector: {
    dimensions: 1536, // OpenAI embeddings
    similarity: 'cosine',
    indexName: 'castmatch-vectors',
  },

  // Caching Configuration
  cache: {
    ttlSeconds: 3600, // 1 hour
    maxSize: 1000, // max cached items
  },
} as const;

// Validate configuration on startup
export const validateConfig = (): void => {
  const requiredServices = [];
  
  if (!config.openaiApiKey) requiredServices.push('OpenAI API key');
  if (!config.anthropicApiKey) requiredServices.push('Anthropic API key');
  if (!config.qdrantUrl) requiredServices.push('Qdrant URL');
  if (!config.databaseUrl) requiredServices.push('Database URL');

  if (requiredServices.length > 0) {
    throw new Error(`Missing required configuration: ${requiredServices.join(', ')}`);
  }

  console.log('✅ Configuration validated successfully');
};