// Application Constants
export const APP_NAME = 'Casting AI';
export const APP_DESCRIPTION = 'AI-powered casting platform';

// API Constants
export const API_VERSION = 'v1';
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Environment Constants
export const NODE_ENVS = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test',
} as const;

// Database Constants
export const DB_MODELS = {
  USER: 'User',
  PROJECT: 'Project',
  CASTING: 'Casting',
  PROFILE: 'Profile',
} as const;

// Auth Constants
export const JWT_EXPIRES_IN = '7d';
export const REFRESH_TOKEN_EXPIRES_IN = '30d';

// File Upload Constants
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];

export type NodeEnv = typeof NODE_ENVS[keyof typeof NODE_ENVS];
export type DbModel = typeof DB_MODELS[keyof typeof DB_MODELS];
