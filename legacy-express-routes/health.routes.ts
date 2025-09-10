/**
 * Health Check Routes
 * Endpoints for monitoring application health
 */

import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';
import { poolHealthHandler } from '../middleware/connectionPool';
// import { compressionHealthHandler } from '../middleware/compression'; // Temporarily disabled

const router = Router();
const healthController = new HealthController();

/**
 * @route   GET /api/health
 * @desc    Basic health check
 * @access  Public
 */
router.get('/', healthController.check);

/**
 * @route   GET /api/health/ready
 * @desc    Readiness probe - checks all dependencies
 * @access  Public
 */
router.get('/ready', healthController.ready);

/**
 * @route   GET /api/health/live
 * @desc    Liveness probe - checks if app is running
 * @access  Public
 */
router.get('/live', healthController.live);

/**
 * @route   GET /api/health/db-pool
 * @desc    Database connection pool health check
 * @access  Public
 */
router.get('/db-pool', poolHealthHandler);

/**
 * @route   GET /api/health/compression
 * @desc    Compression middleware health check
 * @access  Public
 */
// router.get('/compression', compressionHealthHandler); // Temporarily disabled

export default router;