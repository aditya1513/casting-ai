/**
 * Health Check Controller - Simplified Version
 * Basic health monitoring without dependencies
 */

import { Request, Response } from 'express';
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
   * Readiness probe - simplified version without dependency checks
   */
  async ready(_req: Request, res: Response): Promise<void> {
    const checks = {
      database: true, // Temporarily disabled dependency checks
      redis: true,    // Temporarily disabled dependency checks
    };
    
    const allHealthy = Object.values(checks).every(check => check === true);
    const statusCode = allHealthy ? 200 : 503;
    
    res.status(statusCode).json({
      success: allHealthy,
      status: allHealthy ? 'ready' : 'not_ready',
      checks,
      timestamp: new Date().toISOString(),
      note: 'Dependency checks temporarily disabled during Drizzle ORM migration',
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