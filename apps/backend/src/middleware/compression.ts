/**
 * Advanced Response Compression Middleware
 * High-performance compression with intelligent content-type detection and optimization
 */

import { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import { logger } from '../utils/logger';
import { config } from '../config/config';

export interface CompressionStats {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  compressionTime: number;
  encoding: string;
}

/**
 * Content types that benefit from compression
 */
const COMPRESSIBLE_TYPES = new Set([
  'application/json',
  'application/javascript',
  'application/xml',
  'text/plain',
  'text/html',
  'text/css',
  'text/xml',
  'text/javascript',
  'image/svg+xml',
  'application/rss+xml',
  'application/atom+xml',
  'application/x-javascript',
  'application/x-font-ttf',
  'application/vnd.ms-fontobject',
  'font/opentype',
]);

/**
 * Content types that should never be compressed
 */
const NON_COMPRESSIBLE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'audio/mpeg',
  'video/mp4',
  'video/quicktime',
  'application/pdf',
  'application/zip',
  'application/gzip',
  'application/x-rar-compressed',
]);

/**
 * Advanced compression filter with intelligent content-type detection
 */
const shouldCompress = (req: Request, res: Response): boolean => {
  // Skip compression if client doesn't support it
  if (!req.headers['accept-encoding']) {
    return false;
  }

  // Skip compression for specific routes (e.g., file uploads)
  if (req.path.includes('/upload') || req.path.includes('/stream')) {
    return false;
  }

  // Skip if explicitly disabled
  if (req.headers['x-no-compression'] === '1') {
    return false;
  }

  // Get content type
  const contentType = res.get('Content-Type') || '';
  const baseContentType = contentType.split(';')[0].toLowerCase();

  // Never compress already compressed formats
  if (NON_COMPRESSIBLE_TYPES.has(baseContentType)) {
    return false;
  }

  // Always compress known compressible types
  if (COMPRESSIBLE_TYPES.has(baseContentType)) {
    return true;
  }

  // For unknown types, check if it's text-based
  if (baseContentType.startsWith('text/') || baseContentType.includes('json') || baseContentType.includes('xml')) {
    return true;
  }

  // Default to compression.filter for other cases
  return compression.filter(req, res);
};

/**
 * Get optimal compression level based on content type and size
 */
const getCompressionLevel = (contentType: string, contentLength?: number): number => {
  const baseType = contentType.split(';')[0].toLowerCase();
  const length = contentLength || 0;

  // High compression for text content
  if (baseType.startsWith('text/') || baseType.includes('json') || baseType.includes('xml')) {
    if (length > 100 * 1024) { // > 100KB
      return config.isProduction ? 9 : 6; // Maximum compression for large text files
    }
    return config.isProduction ? 7 : 5; // High compression for smaller text files
  }

  // Medium compression for JavaScript/CSS
  if (baseType.includes('javascript') || baseType.includes('css')) {
    return config.isProduction ? 6 : 4;
  }

  // Lower compression for SVG (already optimized)
  if (baseType === 'image/svg+xml') {
    return config.isProduction ? 4 : 3;
  }

  // Default compression level
  return config.isProduction ? 6 : 4;
};

/**
 * Compression statistics tracking middleware
 */
export const compressionStatsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const originalWrite = res.write;
  const originalEnd = res.end;
  const startTime = Date.now();
  let originalSize = 0;

  // Track original response size
  res.write = function(chunk: any, encoding?: any) {
    if (chunk) {
      originalSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk, encoding);
    }
    return originalWrite.call(this, chunk, encoding);
  };

  res.end = function(chunk?: any, encoding?: any) {
    if (chunk) {
      originalSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk, encoding);
    }

    const compressionTime = Date.now() - startTime;
    const compressedSize = res.get('Content-Length') ? parseInt(res.get('Content-Length')!) : originalSize;
    const compressionRatio = originalSize > 0 ? (1 - compressedSize / originalSize) * 100 : 0;
    const encoding = res.get('Content-Encoding') || 'none';

    // Log compression stats for monitoring
    if (originalSize > 1024 && compressionRatio > 10) { // Only log if size > 1KB and compression > 10%
      logger.debug('Compression applied', {
        path: req.path,
        originalSize: `${Math.round(originalSize / 1024)}KB`,
        compressedSize: `${Math.round(compressedSize / 1024)}KB`,
        compressionRatio: `${compressionRatio.toFixed(1)}%`,
        encoding,
        compressionTime: `${compressionTime}ms`,
        contentType: res.get('Content-Type'),
      });
    }

    // Add compression stats to response headers for monitoring
    if (config.isDevelopment) {
      res.setHeader('X-Original-Size', originalSize.toString());
      res.setHeader('X-Compressed-Size', compressedSize.toString());
      res.setHeader('X-Compression-Ratio', compressionRatio.toFixed(2));
      res.setHeader('X-Compression-Time', compressionTime.toString());
    }

    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Create advanced compression middleware with production optimizations
 */
export const createCompressionMiddleware = (): any => {
  return compression({
    // Compression level (1-9, higher = better compression but slower)
    level: -1, // Use dynamic level based on content type
    
    // Minimum size threshold (only compress responses larger than 1KB)
    threshold: 1024,
    
    // Advanced filtering
    filter: shouldCompress,
    
    // Memory level (1-9, higher = more memory but better compression)
    memLevel: config.isProduction ? 8 : 6,
    
    // Window size for deflate algorithm
    windowBits: 15,
    
    // Compression strategy
    strategy: compression.constants.Z_DEFAULT_STRATEGY,
    
    // Custom compression function for dynamic level selection
    compression: (options: any) => {
      return (req: Request, res: Response) => {
        const contentType = res.get('Content-Type') || '';
        const contentLength = res.get('Content-Length') ? parseInt(res.get('Content-Length')!) : undefined;
        
        // Override level based on content
        options.level = getCompressionLevel(contentType, contentLength);
        
        return compression(options)(req, res, () => {});
      };
    },
  });
};

/**
 * Brotli compression middleware for modern browsers
 * Only use if client supports it and for specific content types
 */
export const brotliCompressionMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Check if client supports Brotli
  const acceptEncoding = req.headers['accept-encoding'] || '';
  const supportsBrotli = acceptEncoding.includes('br');
  
  if (!supportsBrotli) {
    return next();
  }

  // Check if content type benefits from Brotli
  const contentType = res.get('Content-Type') || '';
  const baseType = contentType.split(';')[0].toLowerCase();
  
  const brotliTypes = new Set([
    'application/json',
    'application/javascript',
    'text/css',
    'text/html',
    'text/plain',
    'image/svg+xml',
  ]);

  if (brotliTypes.has(baseType)) {
    res.setHeader('Vary', 'Accept-Encoding');
    
    // Add Brotli preference header for reverse proxies
    res.setHeader('X-Brotli-Preferred', '1');
    
    logger.debug('Brotli compression preferred for content type:', baseType);
  }

  next();
};

/**
 * Content-Length adjustment middleware for accurate size reporting
 */
export const contentLengthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const originalJson = res.json;
  
  res.json = function(body: any) {
    // Calculate accurate content length for JSON responses
    if (body && typeof body === 'object') {
      const jsonString = JSON.stringify(body);
      const contentLength = Buffer.byteLength(jsonString, 'utf8');
      
      // Set accurate content length before compression
      this.setHeader('X-Pre-Compression-Length', contentLength.toString());
      
      // For large JSON responses, hint that compression will be beneficial
      if (contentLength > 10 * 1024) { // > 10KB
        this.setHeader('X-Compression-Beneficial', '1');
      }
    }
    
    return originalJson.call(this, body);
  };

  next();
};

/**
 * Response size monitoring middleware
 */
export const responseSizeMonitoringMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  
  const originalSend = res.send;
  res.send = function(body: any) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Calculate response size
    const contentLength = res.get('Content-Length') ? parseInt(res.get('Content-Length')!) : 0;
    const encoding = res.get('Content-Encoding');
    
    // Log large or slow responses
    if (contentLength > 100 * 1024 || responseTime > 1000) { // > 100KB or > 1s
      logger.warn('Large or slow response detected', {
        path: req.path,
        method: req.method,
        statusCode: res.statusCode,
        contentLength: `${Math.round(contentLength / 1024)}KB`,
        responseTime: `${responseTime}ms`,
        encoding: encoding || 'none',
        userAgent: req.headers['user-agent']?.substring(0, 100),
      });
    }
    
    // Add performance headers for monitoring
    res.setHeader('X-Response-Time', responseTime.toString());
    if (contentLength > 0) {
      res.setHeader('X-Response-Size', contentLength.toString());
    }
    
    return originalSend.call(this, body);
  };

  next();
};

/**
 * Combined advanced compression middleware
 */
export const advancedCompressionMiddleware = [
  compressionStatsMiddleware,
  brotliCompressionMiddleware,
  contentLengthMiddleware,
  responseSizeMonitoringMiddleware,
  createCompressionMiddleware(),
];

/**
 * Compression health check endpoint
 */
export const compressionHealthHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const testData = {
    message: 'Compression health check',
    data: new Array(1000).fill('This is a test string for compression. '.repeat(10)),
    timestamp: new Date().toISOString(),
    randomData: Math.random().toString().repeat(100),
  };

  const originalSize = Buffer.byteLength(JSON.stringify(testData), 'utf8');
  
  res.setHeader('X-Test-Original-Size', originalSize.toString());
  res.setHeader('X-Compression-Test', '1');
  
  res.json({
    status: 'ok',
    compressionSupport: {
      gzip: req.headers['accept-encoding']?.includes('gzip') || false,
      deflate: req.headers['accept-encoding']?.includes('deflate') || false,
      brotli: req.headers['accept-encoding']?.includes('br') || false,
    },
    testData,
    meta: {
      originalSize,
      path: req.path,
      timestamp: new Date().toISOString(),
    },
  });
};

export default advancedCompressionMiddleware;