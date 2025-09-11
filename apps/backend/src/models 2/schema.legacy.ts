/**
 * Legacy Database Schema - Matches existing database structure
 * This schema reflects the actual tables created in the database
 */

import { randomUUID } from 'crypto';
import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  decimal,
  json,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ==================== ENUMS ====================

export const userRoleEnum = pgEnum('user_role', [
  'actor',
  'casting_director',
  'producer',
  'admin'
]);

export const projectStatusEnum = pgEnum('project_status', [
  'draft',
  'active',
  'paused',
  'completed',
  'cancelled'
]);

export const applicationStatusEnum = pgEnum('application_status', [
  'submitted',
  'under_review',
  'shortlisted',
  'accepted',
  'rejected'
]);

// ==================== TABLES ====================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password'),
  firstName: varchar('firstName', { length: 100 }),
  lastName: varchar('lastName', { length: 100 }),
  role: userRoleEnum('role').notNull().default('actor'),
  phoneNumber: varchar('phoneNumber', { length: 20 }),
  profileImage: text('profileImage'),
  bio: text('bio'),
  emailVerified: boolean('emailVerified').default(false),
  isPhoneVerified: boolean('isPhoneVerified').default(false),
  isActive: boolean('isActive').default(true),
  emailVerificationToken: text('emailVerificationToken'),
  emailVerificationExpires: timestamp('emailVerificationExpires'),
  dateOfBirth: timestamp('dateOfBirth'),
  gender: text('gender'),
  location: text('location'),
  lastLogin: timestamp('lastLogin'),
  loginCount: integer('loginCount').default(0),
  authProvider: text('authProvider'),
  authProviderUserId: text('authProviderUserId'),
  twoFactorEnabled: boolean('twoFactorEnabled').default(false),
  twoFactorMethod: text('twoFactorMethod'),
  twoFactorBackupCodes: json('twoFactorBackupCodes'),
  passwordResetToken: text('passwordResetToken'),
  passwordResetExpires: timestamp('passwordResetExpires'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('idx_users_email').on(table.email),
  roleIdx: index('idx_users_role').on(table.role),
  emailUnique: uniqueIndex('users_email_unique').on(table.email),
}));

export const talentProfiles = pgTable('talent_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  stageName: text('stage_name'),
  gender: text('gender'),
  dateOfBirth: timestamp('date_of_birth'),
  height: integer('height'),
  weight: integer('weight'),
  city: text('city'),
  state: text('state'),
  country: text('country'),
  languages: json('languages').$type<string[]>(),
  experience: json('experience').$type<{ type: string; years: number }[]>(),
  skills: json('skills').$type<string[]>(),
  training: text('training'),
  achievements: text('achievements'),
  eyeColor: text('eye_color'),
  hairColor: text('hair_color'),
  bodyType: text('body_type'),
  ethnicity: text('ethnicity'),
  headshots: text('headshots'),
  portfolio: text('portfolio'),
  reels: text('reels'),
  willingToTravel: boolean('willing_to_travel'),
  minBudget: decimal('min_budget', { precision: 10, scale: 2 }),
  maxBudget: decimal('max_budget', { precision: 10, scale: 2 }),
  availability: text('availability'),
  searchTags: text('search_tags'),
  aiEmbedding: text('ai_embedding'),
  viewCount: integer('view_count').default(0),
  applicationCount: integer('application_count').default(0),
  selectionCount: integer('selection_count').default(0),
  rating: decimal('rating', { precision: 3, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  genre: varchar('genre', { length: 100 }),
  language: varchar('language', { length: 50 }),
  location: varchar('location', { length: 255 }),
  budget: decimal('budget', { precision: 15, scale: 2 }),
  compensation: text('compensation'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  applicationDeadline: timestamp('application_deadline'),
  requirements: json('requirements').$type<string[]>(),
  ageRange: json('age_range').$type<{ min: number; max: number }>(),
  genderPreference: text('gender_preference'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  status: projectStatusEnum('status').default('draft'),
  isPublic: boolean('is_public').default(true),
  viewCount: integer('view_count').default(0),
  applicationCount: integer('application_count').default(0),
  aiEmbedding: text('ai_embedding'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const applications = pgTable('applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  talentId: uuid('talent_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  coverLetter: text('cover_letter'),
  auditionTape: text('audition_tape'),
  additionalMaterials: json('additional_materials'),
  status: applicationStatusEnum('status').default('submitted'),
  submittedAt: timestamp('submitted_at').defaultNow(),
  reviewedAt: timestamp('reviewed_at'),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  feedback: text('feedback'),
  rating: integer('rating'),
  aiMatchScore: decimal('ai_match_score', { precision: 5, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  talentIdx: index('idx_applications_talent').on(table.talentId),
  projectIdx: index('idx_applications_project').on(table.projectId),
  statusIdx: index('idx_applications_status').on(table.status),
}));

export const auditions = pgTable('auditions', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
  scheduledDate: timestamp('scheduled_date'),
  scheduledTime: text('scheduled_time'),
  location: text('location'),
  type: text('type'), // 'in_person', 'virtual', 'self_tape'
  instructions: text('instructions'),
  status: text('status'), // 'scheduled', 'completed', 'cancelled', 'rescheduled'
  feedback: text('feedback'),
  rating: integer('rating'),
  evaluatedBy: uuid('evaluated_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title'),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  participantIds: json('participant_ids').$type<string[]>(),
  isGroup: boolean('is_group').default(false),
  relatedProjectId: uuid('related_project_id').references(() => projects.id),
  relatedApplicationId: uuid('related_application_id').references(() => applications.id),
  isActive: boolean('is_active').default(true),
  lastMessageAt: timestamp('last_message_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  content: text('content').notNull(),
  messageType: text('message_type').default('text'),
  fileUrl: text('file_url'),
  isRead: boolean('is_read').default(false),
  isAiGenerated: boolean('is_ai_generated').default(false),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at').notNull(),
  isActive: boolean('is_active').default(true),
  deviceInfo: json('device_info'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  lastActivity: timestamp('last_activity').defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type'), // 'application', 'audition', 'message', 'system'
  data: json('data'),
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const memories = pgTable('memories', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type'), // 'conversation', 'preference', 'context'
  content: text('content').notNull(),
  metadata: json('metadata'),
  embedding: text('embedding'),
  relevanceScore: decimal('relevance_score', { precision: 5, scale: 2 }),
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const projectRoles = pgTable('project_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  roleName: text('role_name').notNull(),
  description: text('description'),
  requirements: json('requirements').$type<string[]>(),
  ageRange: json('age_range').$type<{ min: number; max: number }>(),
  genderPreference: text('gender_preference'),
  compensation: text('compensation'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ==================== TYPES ====================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type TalentProfile = typeof talentProfiles.$inferSelect;
export type NewTalentProfile = typeof talentProfiles.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
export type Audition = typeof auditions.$inferSelect;
export type NewAudition = typeof auditions.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type Memory = typeof memories.$inferSelect;
export type NewMemory = typeof memories.$inferInsert;
export type ProjectRole = typeof projectRoles.$inferSelect;
export type NewProjectRole = typeof projectRoles.$inferInsert;