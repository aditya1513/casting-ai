/**
 * CastMatch Backend Server
 * Main entry point for the Express application
 */

import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from './config/config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { requestLogger } from './middleware/requestLogger';
import { prisma } from './config/database';
import { redis } from './config/redis';
import { notificationService } from './services/notification.service';
import { createServer } from 'http';

// Import routes
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import userRoutes from './routes/user.routes';
import actorRoutes from './routes/actor.routes';
import projectRoutes from './routes/project.routes';
import applicationRoutes from './routes/application.routes';
import auditionRoutes from './routes/audition.routes';
import pineconeHealthRoutes from './routes/pinecone-health.routes';
// import aiRoutes from './routes/ai.routes'; // Temporarily disabled due to TypeScript errors
// import { monitoringRouter } from './routes/monitoring'; // Temporarily disabled due to TypeScript errors

// Initialize Express app
const app = express(); // Restart trigger

// Trust proxy - important for production deployments behind reverse proxies
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
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
}));

// Compression middleware
app.use(compression({
  level: 6,
  threshold: 100 * 1024, // Only compress responses larger than 100KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
if (config.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(requestLogger);
}

// Global rate limiter
app.use('/api', rateLimiter);

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/users', userRoutes);
app.use('/api/actors', actorRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/auditions', auditionRoutes);
app.use('/api/pinecone', pineconeHealthRoutes);
// app.use('/api/ai', aiRoutes); // Temporarily disabled due to TypeScript errors
// app.use('/api/monitoring', monitoringRouter); // Temporarily disabled due to TypeScript errors

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  
  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      // Close database connections
      await prisma.$disconnect();
      logger.info('Database connection closed');
      
      // Close Redis connection
      await redis.quit();
      logger.info('Redis connection closed');
      
      // Exit process
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Start server
const server = app.listen(config.port, () => {
  logger.info(`
    🚀 CastMatch Backend Server Started
    ====================================
    Environment: ${config.env}
    Port: ${config.port}
    API URL: http://localhost:${config.port}/api
    Health Check: http://localhost:${config.port}/api/health
    ====================================
  `);
});

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

export { app, server };// Trigger restart
