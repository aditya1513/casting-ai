/**
 * Application Configuration
 * Centralized configuration management using environment variables
 */

import * as dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment variable schema
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('5000').transform(Number),
  API_PREFIX: z.string().default('/api'),
  
  // Database
  DATABASE_URL: z.string().url().or(z.string().startsWith('postgresql://')),
  
  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),
  
  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  
  // Security
  BCRYPT_ROUNDS: z.string().default('12').transform(Number),
  RATE_LIMIT_WINDOW: z.string().default('15').transform(Number), // minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),
  
  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  
  // Email (optional for now)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().email().optional().or(z.literal('')),
  
  // AWS S3 (optional for media storage)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('ap-south-1'),
  AWS_S3_BUCKET: z.string().optional(),
  
  // AI/ML Service Configuration
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  PINECONE_API_KEY: z.string().optional(),
  PINECONE_ENVIRONMENT: z.string().optional(),
  PINECONE_PROJECT_ID: z.string().optional(),
  
  // Qdrant Configuration
  QDRANT_URL: z.string().optional(),
  QDRANT_API_KEY: z.string().optional(),
  
  // Clerk Authentication
  CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),
  CLERK_SIGN_IN_URL: z.string().default('/sign-in'),
  CLERK_SIGN_UP_URL: z.string().default('/sign-up'),
  CLERK_AFTER_SIGN_IN_URL: z.string().default('/dashboard'),
  CLERK_AFTER_SIGN_UP_URL: z.string().default('/dashboard'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_DIR: z.string().default('logs'),
  
  // Pagination
  DEFAULT_PAGE_SIZE: z.string().default('20').transform(Number),
  MAX_PAGE_SIZE: z.string().default('100').transform(Number),
});

// Parse and validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(e => e.path.join('.')).join(', ');
      console.error('❌ Invalid environment variables:', missingVars);
      console.error('Error details:', error.errors);
      process.exit(1);
    }
    throw error;
  }
};

const env = parseEnv();

/**
 * Application configuration object
 */
export const config = {
  // Environment
  env: env.NODE_ENV,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  
  // Server
  port: env.PORT,
  apiPrefix: env.API_PREFIX,
  
  // Database
  database: {
    url: env.DATABASE_URL,
    poolSize: env.NODE_ENV === 'production' ? 20 : 5,
  },
  
  // Redis
  redis: {
    url: env.REDIS_URL,
    password: env.REDIS_PASSWORD,
    ttl: {
      session: 60 * 60 * 24 * 7, // 7 days
      cache: 60 * 60, // 1 hour
      otp: 60 * 10, // 10 minutes
    },
  },
  
  // JWT
  jwt: {
    secret: env.JWT_SECRET,
    accessExpiry: env.JWT_ACCESS_EXPIRY,
    refreshExpiry: env.JWT_REFRESH_EXPIRY,
  },
  
  // Security
  security: {
    bcryptRounds: env.BCRYPT_ROUNDS,
    rateLimitWindow: env.RATE_LIMIT_WINDOW,
    rateLimitMaxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  },
  
  // CORS
  cors: {
    origins: env.CORS_ORIGINS.split(',').map(origin => origin.trim()),
  },
  
  // Email
  email: env.SMTP_HOST ? {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT!,
    user: env.SMTP_USER!,
    password: env.SMTP_PASSWORD!,
    from: env.SMTP_FROM!,
  } : undefined,
  
  // AWS
  aws: env.AWS_ACCESS_KEY_ID ? {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
    region: env.AWS_REGION,
    s3Bucket: env.AWS_S3_BUCKET!,
  } : undefined,
  
  // AI/ML Configuration
  ai: {
    openaiApiKey: env.OPENAI_API_KEY,
    anthropicApiKey: env.ANTHROPIC_API_KEY,
    pineconeApiKey: env.PINECONE_API_KEY,
    pineconeEnvironment: env.PINECONE_ENVIRONMENT,
    pineconeProjectId: env.PINECONE_PROJECT_ID,
  },
  
  // Separate configs for services
  openai: {
    apiKey: env.OPENAI_API_KEY,
  },
  
  anthropic: {
    apiKey: env.ANTHROPIC_API_KEY,
  },
  
  pinecone: {
    apiKey: env.PINECONE_API_KEY!,
    environment: env.PINECONE_ENVIRONMENT,
    projectId: env.PINECONE_PROJECT_ID,
  },
  
  qdrant: env.QDRANT_URL ? {
    url: env.QDRANT_URL,
    apiKey: env.QDRANT_API_KEY,
  } : {
    url: 'http://localhost:6333',
    apiKey: undefined,
  },
  
  // Clerk Authentication
  clerk: env.CLERK_SECRET_KEY ? {
    secretKey: env.CLERK_SECRET_KEY,
    publishableKey: env.CLERK_PUBLISHABLE_KEY!,
    signInUrl: env.CLERK_SIGN_IN_URL,
    signUpUrl: env.CLERK_SIGN_UP_URL,
    afterSignInUrl: env.CLERK_AFTER_SIGN_IN_URL,
    afterSignUpUrl: env.CLERK_AFTER_SIGN_UP_URL,
  } : undefined,
  
  // Legacy placeholder - can be removed if not needed
  aiService: undefined,
  
  // Logging
  logging: {
    level: env.LOG_LEVEL,
    dir: env.LOG_DIR,
  },
  
  // Pagination
  pagination: {
    defaultPageSize: env.DEFAULT_PAGE_SIZE,
    maxPageSize: env.MAX_PAGE_SIZE,
  },
  
  // Feature flags
  features: {
    emailVerification: !!env.SMTP_HOST,
    mediaUpload: !!env.AWS_ACCESS_KEY_ID,
    aiMatching: !!env.ANTHROPIC_API_KEY,
  },
} as const;

// Export type for configuration
export type Config = typeof config;