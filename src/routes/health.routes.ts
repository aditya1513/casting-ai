/**
 * Health Check Routes
 * Endpoints for monitoring application health
 */

import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';

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

export default router;