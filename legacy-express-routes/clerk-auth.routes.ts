/**
 * Clerk Authentication Routes
 * Routes for Clerk-based authentication system
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { clerkAuth, optionalClerkAuth, requireRole } from '../middleware/clerk-auth';
import { ensureClerkClient } from '../config/clerk';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

const router = Router();

/**
 * @route   GET /api/clerk/me
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get('/me', clerkAuth, async (req: Request, res: Response) => {
  try {
    if (!req.auth?.user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: {
        user: req.auth.user
      }
    });
  } catch (error) {
    logger.error('Get user failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user information'
    });
  }
});

/**
 * @route   POST /api/clerk/update-profile
 * @desc    Update user profile metadata
 * @access  Private
 */
router.post('/update-profile', clerkAuth, async (req: Request, res: Response) => {
  try {
    if (!req.auth?.userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { role, profileData } = req.body;
    const client = ensureClerkClient();

    // Update user metadata
    const updatedUser = await client.users.updateUserMetadata(req.auth.userId, {
      publicMetadata: {
        role: role || 'USER',
        ...profileData
      }
    });

    res.json({
      success: true,
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.emailAddresses[0]?.emailAddress,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          role: updatedUser.publicMetadata?.role || 'USER'
        }
      }
    });
  } catch (error) {
    logger.error('Update profile failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

/**
 * @route   GET /api/clerk/session
 * @desc    Verify session and get user info (optional auth)
 * @access  Public
 */
router.get('/session', optionalClerkAuth, (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      authenticated: !!req.auth?.user,
      user: req.auth?.user || null,
      sessionId: req.auth?.sessionId || null
    }
  });
});

/**
 * @route   POST /api/clerk/set-role
 * @desc    Set user role (admin only)
 * @access  Private (Admin only)
 */
router.post('/set-role', clerkAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { userId, role } = req.body;
    
    if (!userId || !role) {
      throw new AppError('User ID and role are required', 400);
    }

    if (!['CASTING_DIRECTOR', 'ACTOR', 'PRODUCER', 'ADMIN', 'USER'].includes(role)) {
      throw new AppError('Invalid role', 400);
    }

    const client = ensureClerkClient();
    
    const updatedUser = await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: role
      }
    });

    res.json({
      success: true,
      data: {
        userId: updatedUser.id,
        role: updatedUser.publicMetadata?.role
      }
    });
  } catch (error) {
    logger.error('Set role failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set user role'
    });
  }
});

/**
 * @route   GET /api/clerk/users
 * @desc    Get all users (admin only)
 * @access  Private (Admin only)
 */
router.get('/users', clerkAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const client = ensureClerkClient();
    
    const { data: users } = await client.users.getUserList({
      limit: 50,
      offset: 0
    });

    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.publicMetadata?.role || 'USER',
      createdAt: user.createdAt,
      lastSignInAt: user.lastSignInAt
    }));

    res.json({
      success: true,
      data: {
        users: formattedUsers,
        total: users.length
      }
    });
  } catch (error) {
    logger.error('Get users failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users'
    });
  }
});

/**
 * @route   DELETE /api/clerk/users/:userId
 * @desc    Delete user (admin only)
 * @access  Private (Admin only)
 */
router.delete('/users/:userId', clerkAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      throw new AppError('User ID is required', 400);
    }

    // Prevent admin from deleting themselves
    if (userId === req.auth?.userId) {
      throw new AppError('Cannot delete your own account', 400);
    }

    const client = ensureClerkClient();
    await client.users.deleteUser(userId);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Delete user failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
});

export default router;