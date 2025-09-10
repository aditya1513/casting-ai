/**
 * Drizzle ORM Schema Definitions
 * Complete database schema for CastMatch platform
 */

import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  uniqueIndex,
  pgEnum,
  decimal,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

// ==================== ENUMS ====================

export const userRoleEnum = pgEnum('user_role', [
  'casting_director',
  'producer',
  'assistant',
  'actor',
  'admin',
]);

export const projectStatusEnum = pgEnum('project_status', [
  'draft',
  'active',
  'in_progress',
  'completed',
  'cancelled',
]);

export const auditionStatusEnum = pgEnum('audition_status', [
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
]);

export const applicationStatusEnum = pgEnum('application_status', [
  'pending',
  'shortlisted',
  'auditioned',
  'selected',
  'rejected',
  'withdrawn',
]);

export const messageTypeEnum = pgEnum('message_type', [
  'text',
  'image',
  'video',
  'audio',
  'document',
  'system',
]);

export const memoryTypeEnum = pgEnum('memory_type', [
  'short_term',
  'long_term',
  'episodic',
  'semantic',
]);

// ==================== USERS ====================

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password'),
  firstName: varchar('firstName', { length: 100 }),
  lastName: varchar('lastName', { length: 100 }),
  role: userRoleEnum('role').notNull().default('actor'),
  phoneNumber: varchar('phoneNumber', { length: 20 }),
  profileImage: text('profileImage'),
  bio: text('bio'),
  
  // Verification flags
  emailVerified: boolean('emailVerified').default(false),
  isPhoneVerified: boolean('isPhoneVerified').default(false),
  isActive: boolean('isActive').default(true),
  
  // Email verification
  emailVerificationToken: text('emailVerificationToken'),
  emailVerificationExpires: timestamp('emailVerificationExpires'),
  
  // Additional fields
  dateOfBirth: timestamp('dateOfBirth'),
  gender: text('gender'),
  location: text('location'),
  lastLogin: timestamp('lastLogin'),
  loginCount: integer('loginCount').default(0),
  authProvider: text('authProvider'),
  authProviderUserId: text('authProviderUserId'),
  twoFactorEnabled: boolean('twoFactorEnabled').default(false),
  twoFactorMethod: text('twoFactorMethod'),
  twoFactorBackupCodes: jsonb('twoFactorBackupCodes'),
  passwordResetToken: text('passwordResetToken'),
  passwordResetExpires: timestamp('passwordResetExpires'),
  
  // Timestamps
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('idx_users_email').on(table.email),
  roleIdx: index('idx_users_role').on(table.role),
}));

// ==================== SESSIONS ====================

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  refreshToken: text('refresh_token'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdx: index('idx_sessions_user').on(table.userId),
  tokenIdx: uniqueIndex('idx_sessions_token').on(table.token),
}));

// ==================== CONVERSATIONS ====================

export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }),
  description: text('description'),
  context: jsonb('context'), // Stores conversation context and metadata
  isActive: boolean('is_active').default(true),
  lastMessageAt: timestamp('last_message_at'),
  messageCount: integer('message_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdx: index('idx_conversations_user').on(table.userId),
  activeIdx: index('idx_conversations_active').on(table.isActive),
  lastMessageIdx: index('idx_conversations_last_message').on(table.lastMessageAt),
}));

// ==================== MESSAGES ====================

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  type: messageTypeEnum('type').notNull().default('text'),
  content: text('content').notNull(),
  metadata: jsonb('metadata'), // Additional data like file URLs, dimensions, etc.
  isAiResponse: boolean('is_ai_response').default(false),
  parentMessageId: uuid('parent_message_id'),
  editedAt: timestamp('edited_at'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  conversationIdx: index('idx_messages_conversation').on(table.conversationId),
  userIdx: index('idx_messages_user').on(table.userId),
  createdAtIdx: index('idx_messages_created').on(table.createdAt),
}));

// ==================== MEMORY SYSTEM ====================

export const memories = pgTable('memories', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }),
  type: memoryTypeEnum('type').notNull(),
  category: varchar('category', { length: 100 }), // e.g., 'preference', 'requirement', 'context'
  key: varchar('key', { length: 255 }).notNull(),
  value: jsonb('value').notNull(),
  embedding: jsonb('embedding'), // Vector embedding for semantic search
  importance: decimal('importance', { precision: 3, scale: 2 }).default('1.00'), // 0.00 to 9.99
  accessCount: integer('access_count').default(0),
  lastAccessedAt: timestamp('last_accessed_at'),
  expiresAt: timestamp('expires_at'), // For STM items
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdx: index('idx_memories_user').on(table.userId),
  conversationIdx: index('idx_memories_conversation').on(table.conversationId),
  typeIdx: index('idx_memories_type').on(table.type),
  categoryIdx: index('idx_memories_category').on(table.category),
  keyIdx: index('idx_memories_key').on(table.key),
  expiresIdx: index('idx_memories_expires').on(table.expiresAt),
}));

// ==================== TALENT PROFILES ====================

export const talentProfiles = pgTable('talent_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  
  // Basic Information
  stageName: varchar('stage_name', { length: 255 }),
  gender: varchar('gender', { length: 20 }),
  dateOfBirth: timestamp('date_of_birth'),
  height: integer('height'), // in cm
  weight: integer('weight'), // in kg
  
  // Location
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  country: varchar('country', { length: 100 }).default('India'),
  languages: jsonb('languages'), // Array of languages
  
  // Professional Details
  experience: jsonb('experience'), // Array of experience objects
  skills: jsonb('skills'), // Array of skills
  training: jsonb('training'), // Array of training/education
  achievements: jsonb('achievements'), // Array of achievements
  
  // Physical Attributes
  eyeColor: varchar('eye_color', { length: 50 }),
  hairColor: varchar('hair_color', { length: 50 }),
  bodyType: varchar('body_type', { length: 50 }),
  ethnicity: varchar('ethnicity', { length: 100 }),
  
  // Media
  headshots: jsonb('headshots'), // Array of headshot URLs
  portfolio: jsonb('portfolio'), // Array of portfolio items
  reels: jsonb('reels'), // Array of demo reel URLs
  
  // Preferences
  willingToTravel: boolean('willing_to_travel').default(false),
  minBudget: decimal('min_budget', { precision: 10, scale: 2 }),
  maxBudget: decimal('max_budget', { precision: 10, scale: 2 }),
  availability: jsonb('availability'), // Availability schedule
  
  // Search Optimization
  searchTags: jsonb('search_tags'), // Array of search tags
  aiEmbedding: jsonb('ai_embedding'), // Vector for AI matching
  
  // Stats
  viewCount: integer('view_count').default(0),
  applicationCount: integer('application_count').default(0),
  selectionCount: integer('selection_count').default(0),
  rating: decimal('rating', { precision: 3, scale: 2 }),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdx: uniqueIndex('idx_talent_profiles_user').on(table.userId),
  cityIdx: index('idx_talent_profiles_city').on(table.city),
  ratingIdx: index('idx_talent_profiles_rating').on(table.rating),
}));

// ==================== PROJECTS ====================

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  
  // Project Details
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }), // 'film', 'series', 'commercial', 'theater'
  genre: jsonb('genre'), // Array of genres
  language: varchar('language', { length: 50 }),
  
  // Production Details
  productionHouse: varchar('production_house', { length: 255 }),
  director: varchar('director', { length: 255 }),
  producer: varchar('producer', { length: 255 }),
  budget: decimal('budget', { precision: 12, scale: 2 }),
  
  // Timeline
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  auditionDeadline: timestamp('audition_deadline'),
  
  // Location
  shootingLocation: jsonb('shooting_location'), // Array of locations
  auditionLocation: varchar('audition_location', { length: 255 }),
  
  // Status
  status: projectStatusEnum('status').default('draft'),
  isPublished: boolean('is_published').default(false),
  isFeatured: boolean('is_featured').default(false),
  
  // Requirements
  requirements: jsonb('requirements'), // Specific project requirements
  
  // Stats
  viewCount: integer('view_count').default(0),
  applicationCount: integer('application_count').default(0),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  createdByIdx: index('idx_projects_created_by').on(table.createdBy),
  statusIdx: index('idx_projects_status').on(table.status),
  publishedIdx: index('idx_projects_published').on(table.isPublished),
  deadlineIdx: index('idx_projects_deadline').on(table.auditionDeadline),
}));

// ==================== PROJECT ROLES ====================

export const projectRoles = pgTable('project_roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  
  // Role Details
  roleName: varchar('role_name', { length: 255 }).notNull(),
  description: text('description'),
  characterDetails: jsonb('character_details'),
  
  // Requirements
  ageMin: integer('age_min'),
  ageMax: integer('age_max'),
  gender: varchar('gender', { length: 20 }),
  languages: jsonb('languages'),
  skills: jsonb('skills'),
  experience: varchar('experience', { length: 100 }),
  
  // Compensation
  budget: decimal('budget', { precision: 10, scale: 2 }),
  compensationType: varchar('compensation_type', { length: 50 }), // 'per_day', 'per_project', 'negotiable'
  
  // Slots
  slotsAvailable: integer('slots_available').default(1),
  slotsFilled: integer('slots_filled').default(0),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  projectIdx: index('idx_project_roles_project').on(table.projectId),
}));

// ==================== APPLICATIONS ====================

export const applications = pgTable('applications', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectRoleId: uuid('project_role_id').notNull().references(() => projectRoles.id, { onDelete: 'cascade' }),
  talentId: uuid('talent_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Application Details
  coverLetter: text('cover_letter'),
  proposedBudget: decimal('proposed_budget', { precision: 10, scale: 2 }),
  availability: jsonb('availability'),
  
  // Status
  status: applicationStatusEnum('status').default('pending'),
  statusNote: text('status_note'),
  
  // Review
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  rating: integer('rating'), // 1-5 star rating
  notes: text('notes'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  projectRoleIdx: index('idx_applications_project_role').on(table.projectRoleId),
  talentIdx: index('idx_applications_talent').on(table.talentId),
  statusIdx: index('idx_applications_status').on(table.status),
  uniqueApplication: uniqueIndex('idx_unique_application').on(table.projectRoleId, table.talentId),
}));

// ==================== AUDITIONS ====================

export const auditions = pgTable('auditions', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
  
  // Schedule
  scheduledAt: timestamp('scheduled_at').notNull(),
  duration: integer('duration'), // in minutes
  location: varchar('location', { length: 255 }),
  isOnline: boolean('is_online').default(false),
  meetingLink: text('meeting_link'),
  
  // Details
  instructions: text('instructions'),
  script: text('script'),
  requirements: jsonb('requirements'),
  
  // Status
  status: auditionStatusEnum('status').default('scheduled'),
  
  // Feedback
  feedback: text('feedback'),
  rating: integer('rating'), // 1-5 star rating
  evaluatedBy: uuid('evaluated_by').references(() => users.id),
  evaluatedAt: timestamp('evaluated_at'),
  
  // Recording
  recordingUrl: text('recording_url'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  applicationIdx: index('idx_auditions_application').on(table.applicationId),
  scheduledIdx: index('idx_auditions_scheduled').on(table.scheduledAt),
  statusIdx: index('idx_auditions_status').on(table.status),
}));

// ==================== NOTIFICATIONS ====================

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  type: varchar('type', { length: 50 }).notNull(), // 'application', 'audition', 'message', 'system'
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  data: jsonb('data'), // Additional notification data
  
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at'),
  
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdx: index('idx_notifications_user').on(table.userId),
  readIdx: index('idx_notifications_read').on(table.isRead),
  createdIdx: index('idx_notifications_created').on(table.createdAt),
}));

// ==================== RELATIONS ====================

export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions),
  conversations: many(conversations),
  messages: many(messages),
  memories: many(memories),
  talentProfile: one(talentProfiles),
  projects: many(projects),
  applications: many(applications),
  notifications: many(notifications),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  messages: many(messages),
  memories: many(memories),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  user: one(users, {
    fields: [messages.userId],
    references: [users.id],
  }),
  parentMessage: one(messages, {
    fields: [messages.parentMessageId],
    references: [messages.id],
  }),
}));

export const memoriesRelations = relations(memories, ({ one }) => ({
  user: one(users, {
    fields: [memories.userId],
    references: [users.id],
  }),
  conversation: one(conversations, {
    fields: [memories.conversationId],
    references: [conversations.id],
  }),
}));

export const talentProfilesRelations = relations(talentProfiles, ({ one }) => ({
  user: one(users, {
    fields: [talentProfiles.userId],
    references: [users.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  creator: one(users, {
    fields: [projects.createdBy],
    references: [users.id],
  }),
  roles: many(projectRoles),
}));

export const projectRolesRelations = relations(projectRoles, ({ one, many }) => ({
  project: one(projects, {
    fields: [projectRoles.projectId],
    references: [projects.id],
  }),
  applications: many(applications),
}));

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  projectRole: one(projectRoles, {
    fields: [applications.projectRoleId],
    references: [projectRoles.id],
  }),
  talent: one(users, {
    fields: [applications.talentId],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [applications.reviewedBy],
    references: [users.id],
  }),
  auditions: many(auditions),
}));

export const auditionsRelations = relations(auditions, ({ one }) => ({
  application: one(applications, {
    fields: [auditions.applicationId],
    references: [applications.id],
  }),
  evaluator: one(users, {
    fields: [auditions.evaluatedBy],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Export all tables for easy access
export const schema = {
  users,
  sessions,
  conversations,
  messages,
  memories,
  talentProfiles,
  projects,
  projectRoles,
  applications,
  auditions,
  notifications,
};

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Memory = typeof memories.$inferSelect;
export type NewMemory = typeof memories.$inferInsert;
export type TalentProfile = typeof talentProfiles.$inferSelect;
export type NewTalentProfile = typeof talentProfiles.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectRole = typeof projectRoles.$inferSelect;
export type NewProjectRole = typeof projectRoles.$inferInsert;
export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
export type Audition = typeof auditions.$inferSelect;
export type NewAudition = typeof auditions.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;