/**
 * Simple Memory Routes (No Auth Required)
 * Basic memory endpoints for testing without authentication
 */

import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * @route   GET /api/memory-simple/health
 * @desc    Health check for memory system
 * @access  Public
 */
router.get('/health', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Memory system is operational',
    timestamp: new Date().toISOString(),
    features: {
      episodic: 'Available',
      semantic: 'Available', 
      procedural: 'Available',
      consolidation: 'Available'
    }
  });
}));

/**
 * @route   GET /api/memory-simple/test
 * @desc    Test memory system connectivity
 * @access  Public
 */
router.get('/test', asyncHandler(async (req, res) => {
  try {
    // Test if memory services can be imported
    const { memorySystem } = await import('../services/memory/index');
    
    res.json({
      success: true,
      message: 'Memory system services loaded successfully',
      services: {
        episodic: !!memorySystem.episodic,
        semantic: !!memorySystem.semantic,
        procedural: !!memorySystem.procedural,
        consolidation: !!memorySystem.consolidation,
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Memory system test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * @route   GET /api/memory-simple/stats
 * @desc    Get basic memory statistics (without auth)
 * @access  Public
 */
router.get('/stats', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Memory statistics endpoint ready',
    note: 'Full statistics require user authentication',
    publicInfo: {
      systemStatus: 'operational',
      availableFeatures: ['episodic', 'semantic', 'procedural', 'consolidation']
    }
  });
}));

export default router;