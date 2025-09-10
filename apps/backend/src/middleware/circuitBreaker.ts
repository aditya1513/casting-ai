/**
 * Circuit Breaker Middleware for CastMatch
 * Implements the circuit breaker pattern to prevent cascading failures
 * and protect services from being overwhelmed
 */

import { Request, Response, NextFunction } from 'express';
import { EventEmitter } from 'events';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold?: number;
  successThreshold?: number;
  timeout?: number;
  resetTimeout?: number;
  monitoringPeriod?: number;
  fallbackFunction?: (req: Request, res: Response) => void;
  healthCheck?: () => Promise<boolean>;
  onStateChange?: (state: CircuitState) => void;
}

export interface CircuitMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  timeouts: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  averageResponseTime: number;
  state: CircuitState;
}

class CircuitBreaker extends EventEmitter {
  private name: string;
  private state: CircuitState;
  private failureCount: number;
  private successCount: number;
  private nextAttempt: number;
  private failureThreshold: number;
  private successThreshold: number;
  private timeout: number;
  private resetTimeout: number;
  private monitoringPeriod: number;
  private fallbackFunction?: (req: Request, res: Response) => void;
  private healthCheck?: () => Promise<boolean>;
  private metrics: CircuitMetrics;
  private requestTimings: number[];
  private onStateChange?: (state: CircuitState) => void;

  constructor(options: CircuitBreakerOptions) {
    super();
    this.name = options.name;
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 3000;
    this.resetTimeout = options.resetTimeout || 60000;
    this.monitoringPeriod = options.monitoringPeriod || 60000;
    this.fallbackFunction = options.fallbackFunction;
    this.healthCheck = options.healthCheck;
    this.onStateChange = options.onStateChange;
    this.requestTimings = [];

    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      timeouts: 0,
      averageResponseTime: 0,
      state: this.state
    };

    // Start monitoring
    this.startMonitoring();
  }

  private startMonitoring(): void {
    setInterval(() => {
      // Calculate average response time
      if (this.requestTimings.length > 0) {
        const sum = this.requestTimings.reduce((a, b) => a + b, 0);
        this.metrics.averageResponseTime = sum / this.requestTimings.length;
        
        // Keep only recent timings (last monitoring period)
        const cutoffTime = Date.now() - this.monitoringPeriod;
        this.requestTimings = this.requestTimings.filter(timing => timing > cutoffTime);
      }

      // Run health check if configured
      if (this.healthCheck && this.state === CircuitState.OPEN) {
        this.healthCheck()
          .then(isHealthy => {
            if (isHealthy) {
              this.attemptReset();
            }
          })
          .catch(() => {
            // Health check failed, keep circuit open
          });
      }

      // Emit metrics event
      this.emit('metrics', this.getMetrics());
    }, 10000); // Check every 10 seconds
  }

  private changeState(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.metrics.state = newState;

    console.log(`[CircuitBreaker: ${this.name}] State changed from ${oldState} to ${newState}`);
    
    if (this.onStateChange) {
      this.onStateChange(newState);
    }
    
    this.emit('stateChange', { from: oldState, to: newState });
  }

  private success(): void {
    this.failureCount = 0;
    this.metrics.successfulRequests++;
    this.metrics.lastSuccessTime = new Date();

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.changeState(CircuitState.CLOSED);
        this.successCount = 0;
      }
    }
  }

  private failure(): void {
    this.failureCount++;
    this.successCount = 0;
    this.metrics.failedRequests++;
    this.metrics.lastFailureTime = new Date();

    if (this.failureCount >= this.failureThreshold) {
      this.changeState(CircuitState.OPEN);
      this.nextAttempt = Date.now() + this.resetTimeout;
    }
  }

  private attemptReset(): void {
    if (this.state === CircuitState.OPEN && Date.now() >= this.nextAttempt) {
      this.changeState(CircuitState.HALF_OPEN);
      this.failureCount = 0;
      this.successCount = 0;
    }
  }

  public async execute(fn: Function): Promise<any> {
    this.metrics.totalRequests++;

    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (Date.now() >= this.nextAttempt) {
        this.attemptReset();
      } else {
        throw new Error(`Circuit breaker is OPEN for ${this.name}`);
      }
    }

    const startTime = Date.now();

    try {
      // Set timeout for the function execution
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Request timeout for ${this.name}`));
        }, this.timeout);
      });

      const result = await Promise.race([fn(), timeoutPromise]);
      
      const responseTime = Date.now() - startTime;
      this.requestTimings.push(responseTime);
      
      this.success();
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.requestTimings.push(responseTime);
      
      if ((error as Error).message.includes('timeout')) {
        this.metrics.timeouts++;
      }
      
      this.failure();
      throw error;
    }
  }

  public getMetrics(): CircuitMetrics {
    return { ...this.metrics };
  }

  public getState(): CircuitState {
    return this.state;
  }

  public reset(): void {
    this.changeState(CircuitState.CLOSED);
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
  }

  public forceOpen(): void {
    this.changeState(CircuitState.OPEN);
    this.nextAttempt = Date.now() + this.resetTimeout;
  }
}

// Circuit breaker instances for different services
const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Create a circuit breaker for a specific service
 */
export function createCircuitBreaker(options: CircuitBreakerOptions): CircuitBreaker {
  const breaker = new CircuitBreaker(options);
  circuitBreakers.set(options.name, breaker);
  return breaker;
}

/**
 * Get an existing circuit breaker by name
 */
export function getCircuitBreaker(name: string): CircuitBreaker | undefined {
  return circuitBreakers.get(name);
}

/**
 * Express middleware factory for circuit breaker
 */
export function circuitBreakerMiddleware(options: CircuitBreakerOptions) {
  const breaker = createCircuitBreaker(options);

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await breaker.execute(async () => {
        return new Promise((resolve, reject) => {
          // Store original methods
          const originalJson = res.json;
          const originalSend = res.send;
          const originalStatus = res.status;

          let responseHandled = false;

          // Override response methods to capture success
          res.json = function(data: any) {
            responseHandled = true;
            resolve(data);
            return originalJson.call(this, data);
          };

          res.send = function(data: any) {
            responseHandled = true;
            resolve(data);
            return originalSend.call(this, data);
          };

          res.status = function(code: number) {
            if (code >= 500) {
              responseHandled = true;
              reject(new Error(`Server error: ${code}`));
            }
            return originalStatus.call(this, code);
          };

          // Call next middleware
          next();

          // Set a timeout to ensure we don't wait forever
          setTimeout(() => {
            if (!responseHandled) {
              reject(new Error('Response timeout'));
            }
          }, options.timeout || 3000);
        });
      });
    } catch (error) {
      console.error(`[CircuitBreaker: ${options.name}] Request failed:`, error);

      // Use fallback function if provided
      if (options.fallbackFunction) {
        options.fallbackFunction(req, res);
      } else {
        res.status(503).json({
          error: 'Service temporarily unavailable',
          service: options.name,
          retryAfter: breaker.getState() === CircuitState.OPEN ? 
            Math.ceil((breaker as any).nextAttempt - Date.now()) / 1000 : 0
        });
      }
    }
  };
}

/**
 * Get metrics for all circuit breakers
 */
export function getAllMetrics(): Record<string, CircuitMetrics> {
  const metrics: Record<string, CircuitMetrics> = {};
  
  circuitBreakers.forEach((breaker, name) => {
    metrics[name] = breaker.getMetrics();
  });
  
  return metrics;
}

/**
 * Reset all circuit breakers
 */
export function resetAllBreakers(): void {
  circuitBreakers.forEach(breaker => breaker.reset());
}

/**
 * Express endpoint to expose circuit breaker metrics
 */
export function metricsEndpoint(req: Request, res: Response): void {
  res.json({
    timestamp: new Date().toISOString(),
    breakers: getAllMetrics()
  });
}

// Predefined circuit breakers for common services
export const databaseCircuitBreaker = createCircuitBreaker({
  name: 'database',
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 5000,
  resetTimeout: 30000,
  healthCheck: async () => {
    // Implement database health check
    try {
      // Your database health check logic here
      return true;
    } catch {
      return false;
    }
  },
  onStateChange: (state) => {
    console.log(`Database circuit breaker state: ${state}`);
    // Could send alerts here
  }
});

export const aiServiceCircuitBreaker = createCircuitBreaker({
  name: 'ai-service',
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 30000, // AI services can be slow
  resetTimeout: 60000,
  fallbackFunction: (req, res) => {
    res.status(503).json({
      error: 'AI service is temporarily unavailable',
      fallback: true,
      message: 'Please try again in a few moments'
    });
  }
});

export const redisCircuitBreaker = createCircuitBreaker({
  name: 'redis',
  failureThreshold: 10,
  successThreshold: 2,
  timeout: 2000,
  resetTimeout: 20000
});

export const externalApiCircuitBreaker = createCircuitBreaker({
  name: 'external-api',
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 10000,
  resetTimeout: 45000
});

export default {
  circuitBreakerMiddleware,
  createCircuitBreaker,
  getCircuitBreaker,
  getAllMetrics,
  resetAllBreakers,
  metricsEndpoint,
  CircuitState
};