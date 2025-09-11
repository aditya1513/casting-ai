/**
 * Simplified Drizzle ORM Schema - Core Authentication Tables Only
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
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ==================== ENUMS ====================

export const userRoleEnum = pgEnum('user_role', [
  'casting_director',
  'producer', 
  'assistant',
  'actor',
]);

// ==================== CORE TABLES ====================

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  email: text('email').notNull().unique(),
  password: text('password'),
  firstName: text('firstName'),
  lastName: text('lastName'),
  role: text('role').notNull().default('ACTOR'),
  
  // Essential fields for auth service
  isEmailVerified: boolean('emailVerified').default(false),
  isPhoneVerified: boolean('phoneVerified').default(false),
  isActive: boolean('isActive').default(true),
  lastLoginAt: timestamp('lastLogin'),
  
  // Additional fields needed by auth service
  phoneNumber: text('phoneNumber'),
  profilePicture: text('profilePicture'),
  bio: text('bio'),
  googleId: text('googleId'),
  facebookId: text('facebookId'),
  linkedinId: text('linkedinId'),
  resetToken: text('resetToken'),
  resetTokenExpiry: timestamp('resetTokenExpiry'),
  
  // Timestamps
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('idx_users_email').on(table.email),
  roleIdx: index('idx_users_role').on(table.role),
}));

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  refreshToken: text('refreshToken'),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('idx_sessions_user').on(table.userId),
  tokenIdx: uniqueIndex('idx_sessions_token').on(table.token),
}));

// ==================== TYPES ====================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;