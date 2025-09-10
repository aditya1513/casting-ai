/**
 * User Factory
 * Provides factory functions for creating test user data
 */

import { User, UserRole, UserProfile, Session } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';

interface MockUserOptions {
  id?: string;
  email?: string;
  role?: UserRole;
  isEmailVerified?: boolean;
  isActive?: boolean;
  profile?: Partial<UserProfile>;
}

export const createMockUser = (options: MockUserOptions = {}): User & { profile?: UserProfile } => {
  const userId = options.id || uuidv4();
  
  const user: User = {
    id: userId,
    email: options.email || `user-${userId}@castmatch.ai`,
    password: bcrypt.hashSync('TestPassword123!', 10),
    role: options.role || UserRole.ACTOR,
    isEmailVerified: options.isEmailVerified !== undefined ? options.isEmailVerified : true,
    isActive: options.isActive !== undefined ? options.isActive : true,
    emailVerificationToken: null,
    emailVerificationExpiry: null,
    passwordResetToken: null,
    passwordResetExpiry: null,
    twoFactorSecret: null,
    twoFactorEnabled: false,
    lastLoginAt: new Date(),
    failedLoginAttempts: 0,
    lockoutUntil: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  if (options.profile) {
    (user as any).profile = createMockProfile({ ...options.profile, userId });
  }

  return user;
};

export const createMockProfile = (options: Partial<UserProfile> = {}): UserProfile => {
  const profileId = options.id || uuidv4();
  const userId = options.userId || uuidv4();

  return {
    id: profileId,
    userId: userId,
    firstName: options.firstName || 'John',
    lastName: options.lastName || 'Doe',
    bio: options.bio || 'Talented professional in the entertainment industry',
    avatarUrl: options.avatarUrl || null,
    phoneNumber: options.phoneNumber || null,
    dateOfBirth: options.dateOfBirth || null,
    gender: options.gender || null,
    location: options.location || 'Mumbai, India',
    languages: options.languages || ['English', 'Hindi'],
    skills: options.skills || [],
    experience: options.experience || [],
    education: options.education || [],
    socialLinks: options.socialLinks || {},
    preferences: options.preferences || {},
    portfolioUrl: options.portfolioUrl || null,
    resumeUrl: options.resumeUrl || null,
    isPublic: options.isPublic !== undefined ? options.isPublic : true,
    completionScore: options.completionScore || 80,
    createdAt: options.createdAt || new Date(),
    updatedAt: options.updatedAt || new Date()
  } as UserProfile;
};

export const createMockSession = (options: Partial<Session> = {}): Session => {
  const sessionId = options.id || uuidv4();
  const userId = options.userId || uuidv4();

  return {
    id: sessionId,
    userId: userId,
    token: options.token || `session-token-${sessionId}`,
    userAgent: options.userAgent || 'Mozilla/5.0 Test Browser',
    ipAddress: options.ipAddress || '127.0.0.1',
    isActive: options.isActive !== undefined ? options.isActive : true,
    expiresAt: options.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    createdAt: options.createdAt || new Date(),
    updatedAt: options.updatedAt || new Date()
  } as Session;
};

export const createMockTokens = () => {
  return {
    accessToken: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify({
      sub: uuidv4(),
      email: 'test@castmatch.ai',
      role: UserRole.ACTOR,
      iat: Date.now() / 1000,
      exp: (Date.now() / 1000) + 3600
    })).toString('base64')}`,
    refreshToken: `refresh-token-${uuidv4()}`
  };
};

export const createMockActorProfile = (options: Partial<UserProfile> = {}) => {
  return createMockProfile({
    ...options,
    skills: ['Acting', 'Voice Acting', 'Dance', 'Singing'],
    experience: [
      {
        title: 'Lead Actor',
        company: 'Mumbai Theatre Company',
        duration: '2020-2023',
        description: 'Performed in various theatrical productions'
      }
    ]
  });
};

export const createMockCastingDirectorProfile = (options: Partial<UserProfile> = {}) => {
  return createMockProfile({
    ...options,
    skills: ['Casting', 'Talent Scouting', 'Script Analysis'],
    experience: [
      {
        title: 'Senior Casting Director',
        company: 'Mumbai OTT Productions',
        duration: '2018-Present',
        description: 'Cast for multiple successful OTT series'
      }
    ]
  });
};

export const createMockProducerProfile = (options: Partial<UserProfile> = {}) => {
  return createMockProfile({
    ...options,
    skills: ['Production Management', 'Budget Planning', 'Team Leadership'],
    experience: [
      {
        title: 'Executive Producer',
        company: 'Premier Productions',
        duration: '2015-Present',
        description: 'Produced award-winning films and series'
      }
    ]
  });
};

export const createBatchMockUsers = (count: number, role: UserRole = UserRole.ACTOR): User[] => {
  return Array.from({ length: count }, (_, index) => 
    createMockUser({
      email: `user-${index}@castmatch.ai`,
      role
    })
  );
};

export const createMockAuthContext = (user: User) => {
  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    },
    sessionId: uuidv4(),
    accessToken: createMockTokens().accessToken
  };
};