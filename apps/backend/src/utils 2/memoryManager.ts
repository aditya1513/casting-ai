/**
 * Memory Management Utility
 * Provides tools to monitor and prevent memory leaks
 */

import { logger } from './logger';

export interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
}

export class MemoryManager {
  private static intervals: Set<NodeJS.Timeout> = new Set();
  private static eventEmitters: WeakMap<any, number> = new WeakMap();
  
  /**
   * Get current memory usage in a formatted way
   */
  static getMemoryStats(): MemoryStats {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      external: Math.round(memUsage.external / 1024 / 1024), // MB
      rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      arrayBuffers: Math.round(memUsage.arrayBuffers / 1024 / 1024), // MB
    };
  }

  /**
   * Log memory usage with context
   */
  static logMemoryUsage(context: string = 'general'): void {
    const stats = this.getMemoryStats();
    logger.info(`Memory usage [${context}]:`, stats);
  }

  /**
   * Register an interval for cleanup tracking
   */
  static registerInterval(interval: NodeJS.Timeout): void {
    this.intervals.add(interval);
  }

  /**
   * Clear a registered interval
   */
  static clearInterval(interval: NodeJS.Timeout): void {
    clearInterval(interval);
    this.intervals.delete(interval);
  }

  /**
   * Clear all registered intervals
   */
  static clearAllIntervals(): void {
    for (const interval of this.intervals) {
      clearInterval(interval);
    }
    this.intervals.clear();
    logger.info('Cleared all registered intervals');
  }

  /**
   * Monitor EventEmitter for potential leaks
   */
  static monitorEventEmitter(emitter: any, name: string): void {
    const currentListeners = emitter.listenerCount ? emitter.getMaxListeners() : 0;
    this.eventEmitters.set(emitter, currentListeners);
    
    // Set reasonable limits
    if (emitter.setMaxListeners) {
      emitter.setMaxListeners(50);
    }

    logger.debug(`Monitoring EventEmitter [${name}] with ${currentListeners} listeners`);
  }

  /**
   * Force garbage collection (if available)
   */
  static forceGarbageCollection(): boolean {
    if (global.gc) {
      global.gc();
      logger.debug('Forced garbage collection');
      return true;
    }
    logger.warn('Garbage collection not available. Start Node.js with --expose-gc');
    return false;
  }

  /**
   * Check for potential memory leaks
   */
  static checkForLeaks(): {
    heapGrowth: boolean;
    highMemory: boolean;
    recommendations: string[];
  } {
    const stats = this.getMemoryStats();
    const heapGrowth = stats.heapUsed > 500; // > 500MB
    const highMemory = stats.rss > 1000; // > 1GB
    
    const recommendations: string[] = [];
    
    if (heapGrowth) {
      recommendations.push('Heap memory usage is high. Check for memory leaks in EventEmitters, intervals, and database connections.');
    }
    
    if (highMemory) {
      recommendations.push('RSS memory usage is very high. Consider restarting the application.');
    }
    
    if (this.intervals.size > 20) {
      recommendations.push(`Too many intervals registered (${this.intervals.size}). Check for interval cleanup.`);
    }

    return { heapGrowth, highMemory, recommendations };
  }

  /**
   * Set up automatic memory monitoring
   */
  static startMonitoring(intervalMs: number = 60000): NodeJS.Timeout {
    const monitoringInterval = setInterval(() => {
      const stats = this.getMemoryStats();
      const leakCheck = this.checkForLeaks();
      
      if (leakCheck.heapGrowth || leakCheck.highMemory) {
        logger.warn('Memory leak detected:', {
          stats,
          recommendations: leakCheck.recommendations,
          intervalCount: this.intervals.size,
        });
        
        // Auto garbage collection in development
        if (process.env.NODE_ENV !== 'production') {
          this.forceGarbageCollection();
        }
      }
    }, intervalMs);
    
    this.registerInterval(monitoringInterval);
    logger.info('Memory monitoring started');
    
    return monitoringInterval;
  }

  /**
   * Create a safe interval that auto-registers for cleanup
   */
  static createSafeInterval(callback: () => void, ms: number): NodeJS.Timeout {
    const interval = setInterval(callback, ms);
    this.registerInterval(interval);
    return interval;
  }

  /**
   * Create a safe timeout that auto-clears
   */
  static createSafeTimeout(callback: () => void, ms: number): NodeJS.Timeout {
    const timeout = setTimeout(() => {
      callback();
      // Auto-cleanup after execution
    }, ms);
    return timeout;
  }

  /**
   * Cleanup resources before shutdown
   */
  static async cleanup(): Promise<void> {
    logger.info('Starting memory cleanup...');
    
    // Clear all intervals
    this.clearAllIntervals();
    
    // Force garbage collection
    this.forceGarbageCollection();
    
    // Wait a moment for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.logMemoryUsage('cleanup-complete');
    logger.info('Memory cleanup completed');
  }
}

// Global cleanup handler
process.on('exit', () => {
  MemoryManager.clearAllIntervals();
});

process.on('SIGINT', async () => {
  await MemoryManager.cleanup();
});

process.on('SIGTERM', async () => {
  await MemoryManager.cleanup();
});

export default MemoryManager;