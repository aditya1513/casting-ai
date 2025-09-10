/**
 * Auth0 Integration Routes
 * Handles Auth0 callback and user profile synchronization
 */

import { Router, Request, Response } from 'express';
import { auth0JWT, extractAuth0User, requireRole } from '../middleware/auth0-jwt';
import { logger } from '../utils/logger';

const router = Router();

// Auth0 user profile endpoint
router.get('/profile', auth0JWT, extractAuth0User, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    
    logger.info('Auth0 user profile accessed:', {
      userId: user.id,
      email: user.email,
    });

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
        permissions: user.permissions,
      },
    });
  } catch (error) {
    logger.error('Auth0 profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
    });
  }
});

// Auth0 logout endpoint
router.post('/logout', auth0JWT, extractAuth0User, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    
    logger.info('Auth0 user logged out:', {
      userId: user.id,
      email: user.email,
    });

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('Auth0 logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
    });
  }
});

// Admin-only endpoint example
router.get('/admin/users', 
  auth0JWT, 
  extractAuth0User, 
  requireRole(['casting_director', 'producer', 'admin']), 
  async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      
      logger.info('Admin users endpoint accessed:', {
        userId: user.id,
        role: user.role,
      });

      // This would typically fetch users from database
      res.json({
        success: true,
        message: 'Admin endpoint accessed successfully',
        user: {
          id: user.id,
          role: user.role,
        },
      });
    } catch (error) {
      logger.error('Admin users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch admin data',
      });
    }
  }
);

// Health check endpoint (no auth required)
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Auth0 routes healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;