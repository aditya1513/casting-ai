/**
 * CastMatch Backend Server - Minimal Version
 * Temporary server without WebSocket/Realtime services for debugging
 */

import express, { Express } from 'express';
import 'express-async-errors';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { connectionPoolMiddleware } from './middleware/connectionPool';
import morgan from 'morgan';
import { config } from './config/config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { requestLogger } from './middleware/requestLogger';
import { createServer } from 'http';

// Import only essential routes
import healthRoutes from './routes/health.routes';
import talentSimpleRoutes from './routes/talent-simple.routes';

// Initialize Express app
const app: Express = express();

// Trust proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: !config.isDevelopment,
}));

// CORS configuration
app.use(cors({
  origin: config.cors.origins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// Compression
app.use(compression());

// Database connection pool
app.use(connectionPoolMiddleware);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
if (config.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(requestLogger);
}

// Routes - minimal set
app.use('/api/health', healthRoutes);
app.use('/api/talents', talentSimpleRoutes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Create HTTP server
const server = createServer(app);

// Start server
server.listen(config.port, () => {
  logger.info(`
    🚀 CastMatch Minimal Server Started
    ====================================
    Environment: ${config.env}
    Port: ${config.port}
    API URL: http://localhost:${config.port}/api
    Health Check: http://localhost:${config.port}/api/health
    ====================================
    
    Available Endpoints:
    - GET  /api/health (Health check)
    - GET  /api/talents (List talents)
    ====================================
  `);
});

// Handle shutdown signals
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

export { app, server };