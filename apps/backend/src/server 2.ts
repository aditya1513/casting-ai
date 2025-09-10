/**
 * CastMatch Backend Server
 * Main entry point for the Express application
 */

import express, { Express } from 'express';
import 'express-async-errors';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { connectionPoolMiddleware, poolHealthHandler } from './middleware/connectionPool';
// import { advancedCompressionMiddleware, compressionHealthHandler } from './middleware/compression'; // Temporarily disabled
import { initializeRealtimeServices } from './services/realtime.service';
import { performanceMiddleware, performanceDashboardHandler, performanceBenchmarkHandler } from './middleware/performance';
import morgan from 'morgan';
import { config } from './config/config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
// import { rateLimiter } from './middleware/rateLimiter'; // Temporarily disabled - uses Redis
import { requestLogger } from './middleware/requestLogger';
// import { redis } from './config/redis'; // Temporarily disabled 
// import { notificationService } from './services/notification.service'; // Temporarily disabled
import { createServer } from 'http';
import { initializeWebSocket } from './websocket/socketServer';

// Import routes
import healthRoutes from './routes/health.routes';
import talentSimpleRoutes from './routes/talent-simple.routes'; // Simplified talent routes without Redis dependencies
import chatRoutes from './routes/chat.routes'; // Chat API routes
import authRoutes from './api/routes/auth.routes'; // Authentication routes
import vectorMigrationRoutes from './routes/vector-migration.routes'; // Vector migration management routes
// import conversationRoutes from './api/routes/conversation.routes'; // Conversation routes - temporarily disabled
// import memoryRoutes from './routes/memory.routes'; // Memory system routes - temporarily disabled
// import batchRoutes from './routes/batch.routes'; // Batch operations routes - temporarily disabled
// import authRoutes from './routes/auth.routes'; // Temporarily disabled
// import profileRoutes from './routes/profile.routes';
// import userRoutes from './routes/user.routes';
// import actorRoutes from './routes/actor.routes';
// import talentDirectRoutes from './routes/talent-direct.routes'; // Direct SQL workaround
// import talentRoutes from './routes/talent.routes'; // Temporarily disabled - missing Joi dependency
// import projectRoutes from './routes/project.routes';
// import applicationRoutes from './routes/application.routes';
// import auditionRoutes from './routes/audition.routes.minimal'; // Using minimal version temporarily
// import pineconeHealthRoutes from './routes/pinecone-health.routes';
// import aiMLRoutes from './routes/ai-ml.routes'; // New AI/ML routes - disabled due to missing dependencies
// import aiTalentRoutes from './routes/ai-talent.routes'; // Temporarily disabled due to TypeScript errors
// import aiRoutes from './routes/ai.routes'; // Temporarily disabled due to TypeScript errors
// import { monitoringRouter } from './routes/monitoring'; // Temporarily disabled due to TypeScript errors

// Initialize Express app
const app: Express = express(); // Restart trigger 2

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

// Performance monitoring middleware (must be early in the chain)
app.use(performanceMiddleware);

// Advanced compression middleware with production optimizations
// app.use(advancedCompressionMiddleware); // Temporarily disabled due to minor syntax issue

// Fallback: Use standard compression
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
}));

// Database connection pool monitoring middleware
app.use(connectionPoolMiddleware);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
if (config.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(requestLogger);
}

// Global rate limiter - temporarily disabled due to Redis authentication issues
// app.use('/api', rateLimiter);

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes); // Authentication endpoints
// app.use('/api/conversations', conversationRoutes); // Conversation endpoints - temporarily disabled
// app.use('/api/memory', memoryRoutes); // Memory system endpoints - temporarily disabled
app.use('/api/talents', talentSimpleRoutes); // Simplified talent routes without Redis dependencies
// app.use('/api/batch', batchRoutes); // Batch operations endpoints - temporarily disabled
app.use('/api', chatRoutes); // Chat API routes
app.use('/api/vector-migration', vectorMigrationRoutes); // Vector migration management routes

// Performance monitoring endpoints
app.get('/api/metrics', performanceDashboardHandler); // Performance metrics
app.get('/api/benchmark', performanceBenchmarkHandler); // Performance benchmarks
// app.use('/api/auth', authRoutes); // Temporarily disabled
// app.use('/api/profile', profileRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/actors', actorRoutes);
// app.use('/api/talents-direct', talentDirectRoutes); // Direct SQL workaround
// app.use('/api/ai', aiMLRoutes); // AI/ML endpoints - disabled due to missing dependencies
// app.use('/api/talents', talentRoutes); // Old talent routes - disabled
// app.use('/api/talents', aiTalentRoutes); // Temporarily disabled due to TypeScript errors
// app.use('/api/projects', projectRoutes);
// app.use('/api/applications', applicationRoutes);
// app.use('/api/auditions', auditionRoutes);
// app.use('/api/pinecone', pineconeHealthRoutes);
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
      // Close database connections (Drizzle connections are handled by pool)
      logger.info('Database connection closed');
      
      // Close Redis connection
      // await redis.quit(); // Temporarily disabled
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

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket server (legacy)
const socketServer = initializeWebSocket(server);

// Initialize enhanced real-time services
initializeRealtimeServices(server);

// Start server (force restart trigger)
server.listen(config.port, () => {
  logger.info(`
    🚀 CastMatch Backend Server Started
    ====================================
    Environment: ${config.env}
    Port: ${config.port}
    API URL: http://localhost:${config.port}/api
    Health Check: http://localhost:${config.port}/api/health
    WebSocket: ws://localhost:${config.port}
    ====================================
    
    Available Endpoints:
    - POST /api/auth/register
    - POST /api/auth/login
    - POST /api/auth/refresh
    - GET  /api/auth/me
    - POST /api/conversations/create
    - GET  /api/conversations
    - POST /api/conversations/:id/messages
    - POST /api/conversations/:id/messages/ai (Claude AI)
    - GET  /api/conversations/:id/history
    - GET  /api/conversations/:id/summary (AI Summary)
    - GET  /api/conversations/ai/health
    - GET  /api/conversations/ai/rate-limit
    - POST /api/batch/talents (Create talents in bulk)
    - POST /api/batch/memories (Create memories in bulk)
    - POST /api/batch/conversations (Create conversations in bulk)
    - PATCH /api/batch/update (Update multiple records)
    - DELETE /api/batch/delete (Delete multiple records - Admin only)
    - GET  /api/batch/stats (Get batch operation statistics)
    - POST /api/batch/search/talents (Bulk search talents)
    - POST /api/batch/export (Export data in bulk)
    
    Performance Monitoring:
    - GET  /api/metrics (Performance statistics)
    - GET  /api/metrics?format=prometheus (Prometheus metrics)
    - GET  /api/benchmark (Performance benchmarks)
    - GET  /api/health/db-pool (Database pool health)
    - GET  /api/health/compression (Compression health)
    
    WebSocket Events:
    - conversation:join
    - message:send
    - message:send:ai
    - typing:start/stop
    - ai:typing
    - ai:stream
    - Enhanced real-time features:
    - message:send/receive
    - typing:start/stop
    - presence:update
    - subscribe/unsubscribe to channels
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
 
