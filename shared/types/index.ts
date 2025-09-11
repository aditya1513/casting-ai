// Base Types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// User Types
export interface User extends BaseEntity {
  email: string;
  name: string;
  role: UserRole;
  profile?: UserProfile;
}

export interface UserProfile extends BaseEntity {
  userId: string;
  bio?: string;
  avatar?: string;
  location?: string;
  skills?: string[];
  experience?: number;
}

export enum UserRole {
  ADMIN = 'admin',
  CASTING_DIRECTOR = 'casting_director',
  TALENT = 'talent',
  AGENT = 'agent',
}

// Project Types
export interface Project extends BaseEntity {
  title: string;
  description: string;
  budget?: number;
  status: ProjectStatus;
  createdBy: string;
  castingDirector?: string;
}

export enum ProjectStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// Casting Types
export interface CastingCall extends BaseEntity {
  projectId: string;
  title: string;
  description: string;
  requirements: string[];
  location: string;
  startDate: Date;
  endDate?: Date;
  status: CastingStatus;
}

export enum CastingStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  IN_REVIEW = 'in_review',
  COMPLETED = 'completed',
}

// File Upload Types
export interface FileUpload {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
}

// Environment Types
export interface EnvironmentConfig {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  REDIS_URL?: string;
  AWS_REGION?: string;
  AWS_BUCKET?: string;
}
