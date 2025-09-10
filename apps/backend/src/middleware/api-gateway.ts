import { Request, Response, NextFunction } from 'express';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import CircuitBreaker from 'opossum';

/**
 * API Gateway Middleware
 * Routes requests to appropriate services with circuit breaker pattern
 */

// Service endpoints configuration
const SERVICES = {
  AI_SERVICE: config.env === 'production' 
    ? 'http://ai-service:8000'
    : process.env.AI_SERVICE_URL || 'http://localhost:8000',
  BACKEND: config.env === 'production'
    ? 'http://backend:3001'
    : process.env.BACKEND_URL || 'http://localhost:3001',
  FRONTEND: config.env === 'production'
    ? 'http://frontend:3000'
    : process.env.FRONTEND_URL || 'http://localhost:3000'
};

// Circuit breaker options
const CIRCUIT_BREAKER_OPTIONS = {
  timeout: 10000, // 10 seconds
  errorThresholdPercentage: 50,
  resetTimeout: 30000, // 30 seconds
  volumeThreshold: 10,
  fallback: (error: Error) => {
    logger.error('Circuit breaker fallback triggered:', error);
    return {
      error: 'Service temporarily unavailable',
      fallback: true,
      timestamp: new Date().toISOString()
    };
  }
};

// Service client factory with retry logic
class ServiceClient {
  private client: AxiosInstance;
  private breaker: CircuitBreaker;
  private serviceName: string;

  constructor(serviceName: string, baseURL: string) {
    this.serviceName = serviceName;
    
    // Create axios instance with default config
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`[${this.serviceName}] Request:`, {
          method: config.method,
          url: config.url,
          headers: config.headers,
        });
        return config;
      },
      (error) => {
        logger.error(`[${this.serviceName}] Request error:`, error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`[${this.serviceName}] Response:`, {
          status: response.status,
          data: response.data,
        });
        return response;
      },
      (error: AxiosError) => {
        logger.error(`[${this.serviceName}] Response error:`, {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );

    // Wrap client calls in circuit breaker
    this.breaker = new CircuitBreaker(
      this.makeRequest.bind(this),
      CIRCUIT_BREAKER_OPTIONS
    );

    // Circuit breaker event listeners
    this.breaker.on('open', () => {
      logger.warn(`[${this.serviceName}] Circuit breaker opened`);
    });

    this.breaker.on('halfOpen', () => {
      logger.info(`[${this.serviceName}] Circuit breaker half-open`);
    });

    this.breaker.on('close', () => {
      logger.info(`[${this.serviceName}] Circuit breaker closed`);
    });
  }

  private async makeRequest(options: any) {
    try {
      const response = await this.client.request(options);
      return response.data;
    } catch (error: any) {
      // Implement exponential backoff retry
      if (this.shouldRetry(error)) {
        return this.retryWithBackoff(options);
      }
      throw error;
    }
  }

  private shouldRetry(error: any): boolean {
    // Retry on network errors or 5xx status codes
    if (!error.response) return true;
    if (error.response.status >= 500) return true;
    if (error.code === 'ECONNABORTED') return true;
    if (error.code === 'ECONNREFUSED') return true;
    return false;
  }

  private async retryWithBackoff(options: any, attempt = 1, maxAttempts = 3): Promise<any> {
    if (attempt >= maxAttempts) {
      throw new Error(`Max retry attempts reached for ${this.serviceName}`);
    }

    const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
    logger.info(`[${this.serviceName}] Retrying after ${delay}ms (attempt ${attempt + 1}/${maxAttempts})`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      const response = await this.client.request(options);
      return response.data;
    } catch (error: any) {
      if (this.shouldRetry(error) && attempt < maxAttempts) {
        return this.retryWithBackoff(options, attempt + 1, maxAttempts);
      }
      throw error;
    }
  }

  async get(path: string, config?: any) {
    return this.breaker.fire({ method: 'GET', url: path, ...config });
  }

  async post(path: string, data?: any, config?: any) {
    return this.breaker.fire({ method: 'POST', url: path, data, ...config });
  }

  async put(path: string, data?: any, config?: any) {
    return this.breaker.fire({ method: 'PUT', url: path, data, ...config });
  }

  async delete(path: string, config?: any) {
    return this.breaker.fire({ method: 'DELETE', url: path, ...config });
  }

  async patch(path: string, data?: any, config?: any) {
    return this.breaker.fire({ method: 'PATCH', url: path, data, ...config });
  }
}

// Service clients
export const aiServiceClient = new ServiceClient('AI_SERVICE', SERVICES.AI_SERVICE);
export const backendClient = new ServiceClient('BACKEND', SERVICES.BACKEND);

// Route mapping configuration
const ROUTE_MAPPING = {
  '/api/auth': { service: 'BACKEND', strip: false },
  '/api/chat': { service: 'BACKEND', strip: false }, // Backend handles chat and forwards to AI
  '/api/ai': { service: 'AI_SERVICE', strip: true }, // Direct AI service calls
  '/api/talent': { service: 'BACKEND', strip: false },
  '/api/conversations': { service: 'BACKEND', strip: false },
  '/api/projects': { service: 'BACKEND', strip: false },
  '/api/auditions': { service: 'BACKEND', strip: false },
};

// API Gateway middleware
export const apiGateway = async (req: Request, res: Response, next: NextFunction) => {
  const path = req.path;
  
  // Find matching route
  const route = Object.keys(ROUTE_MAPPING).find(prefix => path.startsWith(prefix));
  
  if (!route) {
    // No matching route, pass to next middleware
    return next();
  }

  const routeConfig = ROUTE_MAPPING[route as keyof typeof ROUTE_MAPPING];
  const service = routeConfig.service;
  const stripPrefix = routeConfig.strip;
  
  // Construct target path
  let targetPath = path;
  if (stripPrefix) {
    targetPath = path.replace(route, '') || '/';
  }

  // Select appropriate service client
  let client: ServiceClient;
  switch (service) {
    case 'AI_SERVICE':
      client = aiServiceClient;
      break;
    case 'BACKEND':
      client = backendClient;
      break;
    default:
      return res.status(500).json({ error: 'Invalid service configuration' });
  }

  try {
    // Forward request headers
    const headers = {
      ...req.headers,
      'x-forwarded-for': req.ip,
      'x-original-url': req.originalUrl,
      'x-request-id': req.headers['x-request-id'] || generateRequestId(),
    };

    // Remove host header to avoid conflicts
    delete headers.host;

    // Make request to service
    let response;
    const config = { headers, params: req.query };

    switch (req.method) {
      case 'GET':
        response = await client.get(targetPath, config);
        break;
      case 'POST':
        response = await client.post(targetPath, req.body, config);
        break;
      case 'PUT':
        response = await client.put(targetPath, req.body, config);
        break;
      case 'DELETE':
        response = await client.delete(targetPath, config);
        break;
      case 'PATCH':
        response = await client.patch(targetPath, req.body, config);
        break;
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Send response
    res.json(response);
  } catch (error: any) {
    logger.error('API Gateway error:', error);
    
    // Handle circuit breaker fallback
    if (error.fallback) {
      return res.status(503).json(error);
    }

    // Handle axios errors
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }

    // Handle other errors
    res.status(500).json({
      error: 'Internal gateway error',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

// Health check endpoint for gateway
export const gatewayHealthCheck = async (req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {} as any,
  };

  // Check AI service health
  try {
    await aiServiceClient.get('/health');
    health.services.ai = 'healthy';
  } catch (error) {
    health.services.ai = 'unhealthy';
    health.status = 'degraded';
  }

  // Check backend health
  try {
    await backendClient.get('/api/health');
    health.services.backend = 'healthy';
  } catch (error) {
    health.services.backend = 'unhealthy';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
};

// Request ID generator
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Export middleware and utilities
export default {
  apiGateway,
  gatewayHealthCheck,
  aiServiceClient,
  backendClient,
};