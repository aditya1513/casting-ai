import client from 'prom-client';
import { Request, Response, NextFunction } from 'express';
import os from 'os';

// Create a Registry to register the metrics
const register = new client.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'castmatch',
  version: process.env.APP_VERSION || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
});

// Collect default system metrics
client.collectDefaultMetrics({
  register,
  prefix: 'castmatch_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// Custom Metrics

// HTTP request metrics
export const httpRequestDuration = new client.Histogram({
  name: 'castmatch_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status', 'user_role'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [register],
});

export const httpRequestsTotal = new client.Counter({
  name: 'castmatch_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status', 'user_role'],
  registers: [register],
});

// Authentication metrics
export const authAttemptsTotal = new client.Counter({
  name: 'castmatch_auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['method', 'provider', 'result', 'client_ip'],
  registers: [register],
});

export const authFailuresTotal = new client.Counter({
  name: 'castmatch_auth_failures_total',
  help: 'Total number of authentication failures',
  labelNames: ['method', 'provider', 'reason', 'client_ip'],
  registers: [register],
});

export const activeSessionsTotal = new client.Gauge({
  name: 'castmatch_active_sessions_total',
  help: 'Total number of active user sessions',
  registers: [register],
});

export const sessionDuration = new client.Histogram({
  name: 'castmatch_session_duration_seconds',
  help: 'Duration of user sessions in seconds',
  labelNames: ['user_role', 'logout_reason'],
  buckets: [60, 300, 900, 1800, 3600, 7200, 21600, 86400],
  registers: [register],
});

// Rate limiting metrics
export const rateLimitExceededTotal = new client.Counter({
  name: 'castmatch_rate_limit_exceeded_total',
  help: 'Total number of rate limit violations',
  labelNames: ['endpoint', 'limit_type', 'client_ip', 'user_id'],
  registers: [register],
});

export const rateLimitCurrentRequests = new client.Gauge({
  name: 'castmatch_rate_limit_current_requests',
  help: 'Current number of requests in rate limit window',
  labelNames: ['endpoint', 'limit_type', 'client_ip'],
  registers: [register],
});

// CSRF protection metrics
export const csrfFailuresTotal = new client.Counter({
  name: 'castmatch_csrf_failures_total',
  help: 'Total number of CSRF validation failures',
  labelNames: ['endpoint', 'client_ip', 'user_id'],
  registers: [register],
});

export const csrfTokensGenerated = new client.Counter({
  name: 'castmatch_csrf_tokens_generated_total',
  help: 'Total number of CSRF tokens generated',
  labelNames: ['session_type'],
  registers: [register],
});

// Business metrics
export const userRegistrationsTotal = new client.Counter({
  name: 'castmatch_user_registrations_total',
  help: 'Total number of user registrations',
  labelNames: ['user_type', 'provider', 'email_verified'],
  registers: [register],
});

export const userLoginFrequency = new client.Histogram({
  name: 'castmatch_user_login_frequency_days',
  help: 'Days between user logins',
  labelNames: ['user_role'],
  buckets: [1, 3, 7, 14, 30, 60, 90, 180, 365],
  registers: [register],
});

export const castingApplicationsTotal = new client.Counter({
  name: 'castmatch_casting_applications_total',
  help: 'Total number of casting applications',
  labelNames: ['casting_type', 'application_status'],
  registers: [register],
});

// Database metrics
export const databaseQueriesTotal = new client.Counter({
  name: 'castmatch_database_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table', 'status'],
  registers: [register],
});

export const databaseQueryDuration = new client.Histogram({
  name: 'castmatch_database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

export const databaseConnectionsActive = new client.Gauge({
  name: 'castmatch_database_connections_active',
  help: 'Number of active database connections',
  registers: [register],
});

// File upload metrics
export const fileUploadsTotal = new client.Counter({
  name: 'castmatch_file_uploads_total',
  help: 'Total number of file uploads',
  labelNames: ['file_type', 'user_role', 'status'],
  registers: [register],
});

export const fileUploadFailuresTotal = new client.Counter({
  name: 'castmatch_file_upload_failures_total',
  help: 'Total number of file upload failures',
  labelNames: ['file_type', 'error_type', 'user_role'],
  registers: [register],
});

export const fileUploadSize = new client.Histogram({
  name: 'castmatch_file_upload_size_bytes',
  help: 'Size of uploaded files in bytes',
  labelNames: ['file_type', 'user_role'],
  buckets: [1024, 10240, 102400, 1048576, 10485760, 52428800, 104857600],
  registers: [register],
});

// Email metrics
export const emailsSentTotal = new client.Counter({
  name: 'castmatch_email_sent_total',
  help: 'Total number of emails sent',
  labelNames: ['email_type', 'provider', 'status'],
  registers: [register],
});

export const emailFailuresTotal = new client.Counter({
  name: 'castmatch_email_failures_total',
  help: 'Total number of email failures',
  labelNames: ['email_type', 'error_type'],
  registers: [register],
});

export const emailDeliveryTime = new client.Histogram({
  name: 'castmatch_email_delivery_time_seconds',
  help: 'Time taken to deliver emails',
  labelNames: ['email_type', 'provider'],
  buckets: [1, 5, 10, 30, 60, 300, 600, 1800],
  registers: [register],
});

// Cache metrics
export const cacheHitsTotal = new client.Counter({
  name: 'castmatch_cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type', 'key_prefix'],
  registers: [register],
});

export const cacheMissesTotal = new client.Counter({
  name: 'castmatch_cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type', 'key_prefix'],
  registers: [register],
});

export const cacheOperationDuration = new client.Histogram({
  name: 'castmatch_cache_operation_duration_seconds',
  help: 'Duration of cache operations',
  labelNames: ['operation', 'cache_type'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

// API key metrics
export const apiKeyRequestsTotal = new client.Counter({
  name: 'castmatch_api_key_requests_total',
  help: 'Total number of API key requests',
  labelNames: ['api_key_id', 'endpoint', 'status'],
  registers: [register],
});

export const apiKeyRateLimitHits = new client.Counter({
  name: 'castmatch_api_key_rate_limit_hits_total',
  help: 'Total number of API key rate limit hits',
  labelNames: ['api_key_id', 'limit_type'],
  registers: [register],
});

// Search metrics
export const searchQueriesTotal = new client.Counter({
  name: 'castmatch_search_queries_total',
  help: 'Total number of search queries',
  labelNames: ['search_type', 'user_role', 'results_count'],
  registers: [register],
});

export const searchDuration = new client.Histogram({
  name: 'castmatch_search_duration_seconds',
  help: 'Duration of search queries',
  labelNames: ['search_type', 'index_name'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

// Error tracking metrics
export const errorsTotal = new client.Counter({
  name: 'castmatch_errors_total',
  help: 'Total number of application errors',
  labelNames: ['error_type', 'severity', 'component'],
  registers: [register],
});

export const uncaughtExceptionsTotal = new client.Counter({
  name: 'castmatch_uncaught_exceptions_total',
  help: 'Total number of uncaught exceptions',
  labelNames: ['error_type', 'component'],
  registers: [register],
});

// Performance metrics
export const responseTimeP95 = new client.Gauge({
  name: 'castmatch_response_time_p95_seconds',
  help: '95th percentile response time',
  labelNames: ['endpoint'],
  registers: [register],
});

export const throughputRPS = new client.Gauge({
  name: 'castmatch_throughput_requests_per_second',
  help: 'Current requests per second',
  registers: [register],
});

// System resource metrics
export const memoryUsage = new client.Gauge({
  name: 'castmatch_memory_usage_bytes',
  help: 'Memory usage in bytes',
  labelNames: ['type'],
  registers: [register],
});

export const cpuUsage = new client.Gauge({
  name: 'castmatch_cpu_usage_percent',
  help: 'CPU usage percentage',
  registers: [register],
});

// Middleware for collecting HTTP metrics
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const startHrTime = process.hrtime.bigint();
  
  // Store start time for calculating duration
  req.startTime = startTime;
  
  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - startHrTime) / 1e9;
    const route = req.route?.path || req.path;
    const method = req.method;
    const status = res.statusCode.toString();
    const userRole = req.user?.role || 'anonymous';
    
    // Record metrics
    httpRequestDuration
      .labels(method, route, status, userRole)
      .observe(duration);
    
    httpRequestsTotal
      .labels(method, route, status, userRole)
      .inc();
  });
  
  next();
};

// Function to update system metrics periodically
export const updateSystemMetrics = () => {
  const memUsage = process.memoryUsage();
  
  memoryUsage.labels('rss').set(memUsage.rss);
  memoryUsage.labels('heapTotal').set(memUsage.heapTotal);
  memoryUsage.labels('heapUsed').set(memUsage.heapUsed);
  memoryUsage.labels('external').set(memUsage.external);
  
  // CPU usage (basic implementation)
  const cpuUsagePercent = process.cpuUsage();
  cpuUsage.set((cpuUsagePercent.user + cpuUsagePercent.system) / 1000000);
};

// Start system metrics collection
setInterval(updateSystemMetrics, 30000); // Update every 30 seconds

// Metrics endpoint handler
export const metricsHandler = async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    console.error('Error generating metrics:', error);
    res.status(500).end('Error generating metrics');
  }
};

// Health check with metrics
export const healthCheckHandler = (req: Request, res: Response) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    pid: process.pid,
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    loadavg: os.loadavg(),
  };
  
  res.json(healthCheck);
};

// Helper functions for specific metric types
export const recordAuthAttempt = (
  method: string,
  provider: string,
  result: 'success' | 'failure',
  clientIp: string,
  reason?: string
) => {
  authAttemptsTotal.labels(method, provider, result, clientIp).inc();
  
  if (result === 'failure') {
    authFailuresTotal.labels(method, provider, reason || 'unknown', clientIp).inc();
  }
};

export const recordRateLimitHit = (
  endpoint: string,
  limitType: string,
  clientIp: string,
  userId?: string
) => {
  rateLimitExceededTotal.labels(endpoint, limitType, clientIp, userId || 'anonymous').inc();
};

export const recordCSRFFailure = (endpoint: string, clientIp: string, userId?: string) => {
  csrfFailuresTotal.labels(endpoint, clientIp, userId || 'anonymous').inc();
};

export const recordDatabaseQuery = (
  operation: string,
  table: string,
  duration: number,
  status: 'success' | 'error' = 'success'
) => {
  databaseQueriesTotal.labels(operation, table, status).inc();
  databaseQueryDuration.labels(operation, table).observe(duration);
};

export const recordFileUpload = (
  fileType: string,
  userRole: string,
  size: number,
  status: 'success' | 'failure'
) => {
  fileUploadsTotal.labels(fileType, userRole, status).inc();
  
  if (status === 'success') {
    fileUploadSize.labels(fileType, userRole).observe(size);
  }
};

export const recordEmailSent = (
  emailType: string,
  provider: string,
  status: 'success' | 'failure',
  deliveryTime?: number
) => {
  emailsSentTotal.labels(emailType, provider, status).inc();
  
  if (status === 'success' && deliveryTime) {
    emailDeliveryTime.labels(emailType, provider).observe(deliveryTime);
  }
};

export const recordCacheOperation = (
  operation: 'get' | 'set' | 'delete',
  cacheType: 'redis' | 'memory',
  hit: boolean,
  duration: number,
  keyPrefix?: string
) => {
  if (operation === 'get') {
    if (hit) {
      cacheHitsTotal.labels(cacheType, keyPrefix || 'unknown').inc();
    } else {
      cacheMissesTotal.labels(cacheType, keyPrefix || 'unknown').inc();
    }
  }
  
  cacheOperationDuration.labels(operation, cacheType).observe(duration);
};

export const recordError = (
  errorType: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  component: string
) => {
  errorsTotal.labels(errorType, severity, component).inc();
};

// Export the registry for external use
export { register };

export default {
  register,
  metricsHandler,
  healthCheckHandler,
  metricsMiddleware,
  recordAuthAttempt,
  recordRateLimitHit,
  recordCSRFFailure,
  recordDatabaseQuery,
  recordFileUpload,
  recordEmailSent,
  recordCacheOperation,
  recordError,
};