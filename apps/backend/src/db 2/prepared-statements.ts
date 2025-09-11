/**
 * Drizzle Prepared Statements for Zero Overhead Performance
 * Based on documentation: https://orm.drizzle.team/docs/perf-queries
 * FIXED: Removed problematic prepared statements to ensure system stability
 */

import { eq, desc, and, count } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { db } from './drizzle';
import { projects, projectRoles, applications, users, talentProfiles } from '../models/schema';

// PERMANENT: Disabled prepared statements to fix Object.entries error
// Using regular queries for stability - performance difference is minimal for our use case
export const preparedStatements = {};

// Export prepared statement execution helpers
export const executePreparedStatement = {
  async getProjectsByUserId(userId: string, limit: number = 20, offset: number = 0) {
    return await db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        type: projects.type,
        status: projects.status,
        isPublished: projects.isPublished,
        createdAt: projects.createdAt,
        startDate: projects.startDate,
        endDate: projects.endDate,
        auditionDeadline: projects.auditionDeadline,
        shootingLocation: projects.shootingLocation,
      })
      .from(projects)
      .where(eq(projects.createdBy, userId))
      .orderBy(desc(projects.createdAt))
      .limit(limit)
      .offset(offset);
  },

  async getProjectById(projectId: string) {
    const result = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    return result[0] || null;
  },

  async getProjectRoleCount(projectId: string) {
    const result = await db
      .select({ count: count() })
      .from(projectRoles)
      .where(eq(projectRoles.projectId, projectId));
    return result[0]?.count || 0;
  },

  async getProjectApplicationCount(projectId: string) {
    const result = await db
      .select({ count: count() })
      .from(applications)
      .innerJoin(projectRoles, eq(applications.projectRoleId, projectRoles.id))
      .where(eq(projectRoles.projectId, projectId));
    return result[0]?.count || 0;
  },

  async getProjectStatsForUser(userId: string) {
    const [total, active, draft] = await Promise.all([
      db.select({ count: count() }).from(projects).where(eq(projects.createdBy, userId)),
      db.select({ count: count() }).from(projects).where(and(eq(projects.createdBy, userId), eq(projects.status, 'active'))),
      db.select({ count: count() }).from(projects).where(and(eq(projects.createdBy, userId), eq(projects.status, 'draft'))),
    ]);

    return {
      total: total[0]?.count || 0,
      active: active[0]?.count || 0,
      draft: draft[0]?.count || 0,
    };
  },

  async getAllTalents(limit: number = 20, offset: number = 0) {
    // Use regular query temporarily to avoid prepared statement issues
    return await db
      .select({
        id: talentProfiles.id,
        userId: talentProfiles.userId,
        stageName: talentProfiles.stageName,
        realName: talentProfiles.realName,
        age: talentProfiles.age,
        city: talentProfiles.city,
        height: talentProfiles.height,
        weight: talentProfiles.weight,
        skills: talentProfiles.skills,
        languages: talentProfiles.languages,
        experience: talentProfiles.experience,
        profilePicture: talentProfiles.profilePicture,
        createdAt: talentProfiles.createdAt,
        // User data
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(talentProfiles)
      .innerJoin(users, eq(talentProfiles.userId, users.id))
      .where(eq(users.isActive, true))
      .orderBy(desc(talentProfiles.createdAt))
      .limit(limit)
      .offset(offset);
  },

  async getTalentById(talentId: string) {
    // Use regular query temporarily to avoid prepared statement issues
    const result = await db
      .select({
        id: talentProfiles.id,
        userId: talentProfiles.userId,
        stageName: talentProfiles.stageName,
        realName: talentProfiles.realName,
        age: talentProfiles.age,
        city: talentProfiles.city,
        height: talentProfiles.height,
        weight: talentProfiles.weight,
        skills: talentProfiles.skills,
        languages: talentProfiles.languages,
        experience: talentProfiles.experience,
        profilePicture: talentProfiles.profilePicture,
        createdAt: talentProfiles.createdAt,
        // User data
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(talentProfiles)
      .innerJoin(users, eq(talentProfiles.userId, users.id))
      .where(eq(talentProfiles.id, talentId))
      .limit(1);
    return result[0] || null;
  },

  async getDashboardStats() {
    const result = await db
      .select({
        totalTalents: count(talentProfiles.id),
      })
      .from(talentProfiles)
      .innerJoin(users, eq(talentProfiles.userId, users.id))
      .where(eq(users.isActive, true));
    return result[0] || { totalTalents: 0 };
  },
};