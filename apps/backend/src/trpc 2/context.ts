/**
 * tRPC Context - Request context with database and utilities
 */

import { Context } from 'hono';
import { db } from '../config/database';
import { logger } from '../utils/logger';
import { redis, CacheManager } from '../config/redis';
import { ensureClerkClient } from '../config/clerk';
import { config } from '../config/config';

export interface TRPCContext {
  db: typeof db;
  logger: typeof logger;
  redis: typeof redis;
  req: Request;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  isAuthenticated: boolean;
}

export async function createContext(c: Context): Promise<TRPCContext> {
  const authHeader = c.req.header('authorization');
  let userId: string | undefined;
  let userEmail: string | undefined;
  let userRole: string | undefined;
  let isAuthenticated = false;

  // Extract and verify Clerk session token
  if (authHeader?.startsWith('Bearer ') && config.clerk) {
    const token = authHeader.substring(7);
    
    try {
      const client = ensureClerkClient();
      const session = await client.sessions.verifySession(token, {});
      
      if (session?.userId) {
        const user = await client.users.getUser(session.userId);
        
        userId = session.userId;
        userEmail = user.emailAddresses[0]?.emailAddress;
        userRole = user.publicMetadata?.role as string || 'actor';
        isAuthenticated = true;
      }
    } catch (error) {
      logger.debug('Authentication failed for tRPC context:', error);
      // Continue without authentication
    }
  }

  return {
    db,
    logger,
    redis,
    req: c.req.raw,
    userId,
    userEmail,
    userRole,
    isAuthenticated,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;