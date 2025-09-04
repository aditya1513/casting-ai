/**
 * Minimal CastMatch Backend Server for testing
 * Only health routes enabled to isolate Prisma issues
 */

import express, { Express } from 'express';
import 'express-async-errors';
import cors from 'cors';
import { config } from './config/config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';

// Import only health routes
import healthRoutes from './routes/health.routes';

// Initialize Express app
const app: Express = express();

// Basic middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API Routes - minimal
app.use('/api/health', healthRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(config.port, () => {
  logger.info(`
    🚀 Minimal CastMatch Backend Server Started
    ====================================
    Environment: ${config.env}
    Port: ${config.port}
    API URL: http://localhost:${config.port}/api
    Health Check: http://localhost:${config.port}/api/health
    ====================================
  `);
});

export { app, server };