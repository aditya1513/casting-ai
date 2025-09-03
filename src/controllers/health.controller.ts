/**
 * Health Check Controller
 * Handles health monitoring endpoints
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

export class HealthController {
  /**
   * Basic health check
   */
  async check(_req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
    });
  }
  
  /**
   * Readiness probe - checks all dependencies
   */
  async ready(_req: Request, res: Response): Promise<void> {
    const checks = {
      database: false,
      redis: false,
    };
    
    try {
      // Check database connection - using raw query due to Prisma P1010 issue
      // For now, we'll just check if tables exist
      const result = await prisma.$queryRawUnsafe('SELECT COUNT(*) FROM users');
      checks.database = true;
    } catch (error: any) {
      // If it's the P1010 error, try a simple query
      if (error.code === 'P1010') {
        checks.database = false; // Known issue, mark as false but don't log
      } else {
        logger.error('Database health check failed:', error);
      }
    }
    
    try {
      // Check Redis connection
      await redis.ping();
      checks.redis = true;
    } catch (error) {
      logger.error('Redis health check failed:', error);
    }
    
    const allHealthy = Object.values(checks).every(check => check === true);
    const statusCode = allHealthy ? 200 : 503;
    
    res.status(statusCode).json({
      success: allHealthy,
      status: allHealthy ? 'ready' : 'not_ready',
      checks,
      timestamp: new Date().toISOString(),
    });
  }
  
  /**
   * Liveness probe - checks if app is running
   */
  async live(_req: Request, res: Response): Promise<void> {
    const memoryUsage = process.memoryUsage();
    
    res.status(200).json({
      success: true,
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
      },
      pid: process.pid,
      nodeVersion: process.version,
    });
  }
}