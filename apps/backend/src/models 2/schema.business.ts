/**
 * Business-Only Drizzle ORM Schema
 * Core business entities without authentication tables (handled by Auth0)
 * Consistent camelCase naming throughout
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

export const talentStatusEnum = pgEnum('talent_status', [
  'active',
  'inactive',
  'pending_verification',
  'suspended'
]);

export const projectStatusEnum = pgEnum('project_status', [
  'planning',
  'casting',
  'in_production',
  'post_production',
  'completed',
  'cancelled'
]);

export const applicationStatusEnum = pgEnum('application_status', [
  'submitted',
  'under_review',
  'shortlisted',
  'callback_scheduled',
  'selected',
  'rejected'
]);

// ==================== CORE BUSINESS TABLES ====================

export const talents = pgTable('talents', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  
  // Auth0 user reference (no foreign key since Auth0 manages users)
  auth0UserId: text('auth0_user_id').notNull().unique(),
  
  // Basic Information
  firstName: text('firstName').notNull(),
  lastName: text('lastName').notNull(),
  email: text('email').notNull().unique(),
  phoneNumber: text('phoneNumber'),
  dateOfBirth: timestamp('dateOfBirth'),
  gender: text('gender'),
  
  // Professional Information
  bio: text('bio'),
  experience: text('experience'),
  skills: json('skills').$type<string[]>().default([]),
  portfolio: json('portfolio').$type<{ type: string; url: string; title?: string }[]>().default([]),
  
  // Physical Attributes
  height: integer('height'), // in cm
  weight: integer('weight'), // in kg
  eyeColor: text('eyeColor'),
  hairColor: text('hairColor'),
  
  // Location
  city: text('city'),
  state: text('state'),
  country: text('country').default('India'),
  
  // Status and Metadata
  status: talentStatusEnum('status').default('active'),
  profilePicture: text('profilePicture'),
  
  // AI/ML Enhancement Fields
  embedding: json('embedding').$type<number[]>(), // Vector embedding for AI matching
  tags: json('tags').$type<string[]>().default([]), // AI-generated tags
  lastProfileUpdate: timestamp('lastProfileUpdate'),
  
  // Timestamps
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('idx_talents_email').on(table.email),
  auth0UserIdx: uniqueIndex('idx_talents_auth0_user').on(table.auth0UserId),
  statusIdx: index('idx_talents_status').on(table.status),
  locationIdx: index('idx_talents_location').on(table.city, table.state),
}));

export const projects = pgTable('projects', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  
  // Project Basic Information
  title: text('title').notNull(),
  description: text('description').notNull(),
  genre: text('genre'),
  language: text('language').default('Hindi'),
  
  // Production Details
  productionHouse: text('productionHouse'),
  director: text('director'),
  producer: text('producer'),
  
  // Casting Information
  castingDirector: text('castingDirector'),
  castingDirectorAuth0Id: text('castingDirectorAuth0Id'), // Reference to Auth0 user
  
  // Timeline
  startDate: timestamp('startDate'),
  endDate: timestamp('endDate'),
  applicationDeadline: timestamp('applicationDeadline'),
  
  // Budget and Compensation
  budget: decimal('budget', { precision: 15, scale: 2 }),
  compensation: json('compensation').$type<{ min: number; max: number; currency: string }>(),
  
  // Requirements
  ageRange: json('ageRange').$type<{ min: number; max: number }>(),
  requirements: json('requirements').$type<string[]>().default([]),
  
  // Status and Metadata
  status: projectStatusEnum('status').default('planning'),
  isPublic: boolean('isPublic').default(true),
  
  // AI/ML Enhancement
  embedding: json('embedding').$type<number[]>(), // Vector embedding for AI matching
  
  // Timestamps
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  titleIdx: index('idx_projects_title').on(table.title),
  statusIdx: index('idx_projects_status').on(table.status),
  castingDirectorIdx: index('idx_projects_casting_director').on(table.castingDirectorAuth0Id),
  deadlineIdx: index('idx_projects_deadline').on(table.applicationDeadline),
}));

export const applications = pgTable('applications', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  
  // References
  talentId: text('talentId').notNull().references(() => talents.id, { onDelete: 'cascade' }),
  projectId: text('projectId').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  
  // Application Details
  coverLetter: text('coverLetter'),
  auditionTape: text('auditionTape'), // URL to audition video
  portfolio: json('portfolio').$type<{ type: string; url: string; title?: string }[]>().default([]),
  
  // Status and Feedback
  status: applicationStatusEnum('status').default('submitted'),
  feedback: text('feedback'),
  rating: integer('rating'), // 1-10 rating from casting director
  
  // AI/ML Enhancement
  matchScore: decimal('matchScore', { precision: 3, scale: 2 }), // AI-generated match score
  aiNotes: text('aiNotes'), // AI-generated notes about the match
  
  // Timestamps
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  talentIdx: index('idx_applications_talent').on(table.talentId),
  projectIdx: index('idx_applications_project').on(table.projectId),
  statusIdx: index('idx_applications_status').on(table.status),
  matchScoreIdx: index('idx_applications_match_score').on(table.matchScore),
  uniqueApplication: uniqueIndex('idx_unique_application').on(table.talentId, table.projectId),
}));

export const conversations = pgTable('conversations', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  
  // Participants (Auth0 user IDs)
  participantIds: json('participantIds').$type<string[]>().notNull(),
  
  // Conversation Metadata
  title: text('title'),
  isGroup: boolean('isGroup').default(false),
  
  // Related Business Entity
  relatedProjectId: text('relatedProjectId').references(() => projects.id),
  relatedApplicationId: text('relatedApplicationId').references(() => applications.id),
  
  // Status
  isActive: boolean('isActive').default(true),
  
  // Timestamps
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  participantsIdx: index('idx_conversations_participants').on(table.participantIds),
  projectIdx: index('idx_conversations_project').on(table.relatedProjectId),
  activeIdx: index('idx_conversations_active').on(table.isActive),
}));

export const messages = pgTable('messages', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  
  // References
  conversationId: text('conversationId').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  senderAuth0Id: text('senderAuth0Id').notNull(), // Auth0 user ID
  
  // Message Content
  content: text('content').notNull(),
  messageType: text('messageType').default('text'), // text, file, image, video
  fileUrl: text('fileUrl'),
  
  // Status
  isRead: boolean('isRead').default(false),
  isAiGenerated: boolean('isAiGenerated').default(false),
  
  // Timestamps
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  conversationIdx: index('idx_messages_conversation').on(table.conversationId),
  senderIdx: index('idx_messages_sender').on(table.senderAuth0Id),
  createdAtIdx: index('idx_messages_created_at').on(table.createdAt),
}));

// ==================== TYPES ====================

export type Talent = typeof talents.$inferSelect;
export type NewTalent = typeof talents.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;