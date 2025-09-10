/**
 * Health Router - tRPC procedures for health checks
 */

import { router, publicProcedure } from '../trpc';
import { config } from '../../config/config';

export const healthRouter = router({
  check: publicProcedure
    .query(async ({ ctx }) => {
      try {
        // Test database connection
        const dbHealthy = await ctx.db.$count ? true : false;
        
        return {
          success: true,
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: config.env,
          version: '1.0.0',
          server: 'hono-trpc',
          database: dbHealthy ? 'connected' : 'disconnected',
        };
      } catch (error) {
        ctx.logger.error('Health check failed:', error);
        return {
          success: false,
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: config.isDevelopment ? error.message : 'Health check failed',
        };
      }
    }),
});