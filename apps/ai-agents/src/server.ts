/**
 * CastMatch AI Agents Server
 * Real AI-powered casting intelligence server
 * Provides script analysis, talent discovery, and intelligent chat
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config/config';
import { logger } from './utils/logger';
import { setupRoutes } from './routes/index';
import { initializeServices } from './services/index';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

class CastMatchAIServer {
  private app: express.Application;
  private server: any;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security and performance middleware
    this.app.use(helmet());
    this.app.use(compression());
    
    // CORS configuration
    this.app.use(cors({
      origin: config.allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Client']
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    this.app.use('/api', rateLimiter);

    // Request logging
    this.app.use((req, res, next) => {
      logger.info('Incoming request', {
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        requestId: req.get('X-Request-ID')
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check endpoint (always available)
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        services: {
          openai: !!config.openaiApiKey,
          anthropic: !!config.anthropicApiKey,
          qdrant: !!config.qdrantUrl,
          database: !!config.databaseUrl
        },
        uptime: process.uptime(),
        memory: process.memoryUsage()
      });
    });

    // API routes
    setupRoutes(this.app);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        availableEndpoints: [
          'GET /health',
          'GET /api/agents/status',
          'POST /api/agents/script-analysis',
          'POST /api/agents/talent-discovery',
          'POST /api/agents/application-screening',
          'POST /api/agents/audition-scheduling',
          'POST /api/agents/communication',
          'POST /api/agents/decision-support',
          'POST /api/agents/budget-optimization',
          'GET /api/demo/complete-workflow'
        ]
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);

    // Graceful shutdown handling
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      this.shutdown();
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      this.shutdown();
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', { reason, promise });
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', error);
      this.shutdown(1);
    });
  }

  public async start(): Promise<void> {
    try {
      // Initialize all services
      logger.info('Initializing AI services...');
      await initializeServices();
      logger.info('AI services initialized successfully');

      // Start server
      this.server = this.app.listen(config.port, () => {
        logger.info(`🤖 CastMatch AI Agents Server started`, {
          port: config.port,
          environment: config.nodeEnv,
          features: {
            scriptAnalysis: config.features.scriptAnalysis,
            talentDiscovery: config.features.talentDiscovery,
            smartChat: config.features.smartChat,
            vectorSearch: config.features.vectorSearch
          }
        });
        
        console.log(`
🎬 CastMatch AI Agents Server is LIVE! 🎬

🔗 Server: http://localhost:${config.port}
📊 Health: http://localhost:${config.port}/health
🤖 API: http://localhost:${config.port}/api/agents/

✨ Features Enabled:
  • Script Analysis: ${config.features.scriptAnalysis ? '✅' : '❌'}
  • Talent Discovery: ${config.features.talentDiscovery ? '✅' : '❌'}
  • Smart Chat: ${config.features.smartChat ? '✅' : '❌'}
  • Vector Search: ${config.features.vectorSearch ? '✅' : '❌'}

🚀 Ready to power CastMatch with real AI!
        `);
      });

    } catch (error) {
      logger.error('Failed to start server', error);
      process.exit(1);
    }
  }

  private shutdown(code: number = 0): void {
    if (this.server) {
      this.server.close(() => {
        logger.info('Server closed');
        process.exit(code);
      });
    } else {
      process.exit(code);
    }
  }
}

// Start the server
const server = new CastMatchAIServer();
server.start().catch((error) => {
  logger.error('Failed to start CastMatch AI Server', error);
  process.exit(1);
});