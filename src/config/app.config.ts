/**
 * Application Configuration
 * Central configuration for all app settings
 */

import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
  app: {
    name: process.env.APP_NAME || 'CastMatch',
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '5001', 10),
    url: process.env.APP_URL || 'http://localhost:5001',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
  },
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://castmatch:castmatch123@localhost:5432/castmatch_db',
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    ttl: parseInt(process.env.REDIS_TTL || '3600', 10),
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    issuer: process.env.JWT_ISSUER || 'castmatch.ai',
    audience: process.env.JWT_AUDIENCE || 'castmatch-users',
  },
  
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackUrl: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      callbackUrl: process.env.GITHUB_CALLBACK_URL || '/api/auth/github/callback',
    },
  },
  
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'noreply@castmatch.ai',
    replyTo: process.env.EMAIL_REPLY_TO || 'support@castmatch.ai',
  },
  
  twoFactor: {
    appName: process.env.TWO_FACTOR_APP_NAME || 'CastMatch',
    backupCodeCount: parseInt(process.env.TWO_FACTOR_BACKUP_CODES || '10', 10),
  },
  
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '900000', 10), // 15 minutes in ms
    passwordResetExpiry: parseInt(process.env.PASSWORD_RESET_EXPIRY || '3600000', 10), // 1 hour in ms
    sessionExpiry: parseInt(process.env.SESSION_EXPIRY || '86400000', 10), // 24 hours in ms
    passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
    passwordRequireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
    passwordRequireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
    passwordRequireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
    passwordRequireSpecial: process.env.PASSWORD_REQUIRE_SPECIAL !== 'false',
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    loginMaxRequests: parseInt(process.env.RATE_LIMIT_LOGIN_MAX || '5', 10),
    passwordResetMaxRequests: parseInt(process.env.RATE_LIMIT_PASSWORD_RESET_MAX || '3', 10),
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001'],
    credentials: true,
  },
  
  aws: {
    region: process.env.AWS_REGION || 'ap-south-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    s3: {
      bucket: process.env.AWS_S3_BUCKET || '',
      endpoint: process.env.AWS_S3_ENDPOINT,
    },
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    directory: process.env.LOG_DIRECTORY || './logs',
  },
};

// Validate required configuration
export function validateConfig(): void {
  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
  ];
  
  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  );
  
  if (missingEnvVars.length > 0) {
    console.error(
      `Missing required environment variables: ${missingEnvVars.join(', ')}`
    );
    console.error('Please check your .env file');
    process.exit(1);
  }
  
  // Warn about OAuth configuration
  if (!config.oauth.google.clientId || !config.oauth.google.clientSecret) {
    console.warn('Google OAuth is not configured. Social login with Google will not work.');
  }
  
  if (!config.oauth.github.clientId || !config.oauth.github.clientSecret) {
    console.warn('GitHub OAuth is not configured. Social login with GitHub will not work.');
  }
  
  if (!config.email.user || !config.email.password) {
    console.warn('Email configuration is incomplete. Email features will not work.');
  }
}