/**
 * Extended Express Types
 * Adds custom properties to Request interface
 */

// Define UserRole based on Drizzle schema instead of Prisma
export type UserRole = 'casting_director' | 'producer' | 'assistant' | 'actor' | 'admin';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
        sessionId?: string;
        emailVerified?: boolean;
      };
      session?: any;
      sessionID?: string;
      id?: string;
      token?: string;
      rateLimit?: {
        limit: number;
        current: number;
        remaining: number;
        resetTime: Date;
      };
      securityEvents?: Array<{
        type: string;
        timestamp: Date;
        details: any;
      }>;
      startTime?: number;
    }
  }
}

// This export is required to make the file a module
export {};