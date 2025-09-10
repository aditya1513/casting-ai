/**
 * CastMatch Backend Server - Hono.js + tRPC Implementation
 * Modern, type-safe API server with tRPC procedures
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
// Removed compress import - causes CompressionStream issues with Bun
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { config } from './config/config';
import { logger as appLogger } from './utils/logger';
import { appRouter } from './trpc/router';
import { createContext } from './trpc/context';

// Initialize Hono app
const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', secureHeaders());
// Removed compress() - causes CompressionStream errors with Bun runtime

// CORS configuration
app.use('/api/*', cors({
  origin: config.cors.origins,
  allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
    version: '1.0.0',
    server: 'hono'
  });
});

// tRPC handler
app.use('/api/trpc/*', (c) => {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: c.req.raw,
    router: appRouter,
    createContext: () => createContext(c),
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: {
      message: 'Route not found',
      code: 'NOT_FOUND',
      statusCode: 404,
    },
  }, 404);
});

// Error handler
app.onError((err, c) => {
  appLogger.error('Server error:', err);
  return c.json({
    success: false,
    error: {
      message: config.isDevelopment ? err.message : 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
      statusCode: 500,
    },
  }, 500);
});

// Start server
const port = config.port;
appLogger.info(`
🚀 CastMatch Hono + tRPC Server Started
====================================
Environment: ${config.env}
Port: ${port}
API URL: http://localhost:${port}/api
Health Check: http://localhost:${port}/api/health
tRPC Endpoint: http://localhost:${port}/api/trpc
====================================

Available tRPC Procedures:
- health.check
- talents.list
- talents.getById
====================================
`);

export default {
  port,
  fetch: app.fetch,
};