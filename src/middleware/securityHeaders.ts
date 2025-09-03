import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

// Security headers configuration
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for Next.js in development
        "'unsafe-eval'", // Required for Next.js in development
        'accounts.google.com',
        'apis.google.com',
        'www.google.com',
        'github.com',
        'cdn.jsdelivr.net',
        'unpkg.com',
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        'fonts.googleapis.com',
        'cdn.jsdelivr.net',
        'unpkg.com',
      ],
      fontSrc: [
        "'self'",
        'fonts.gstatic.com',
        'cdn.jsdelivr.net',
      ],
      imgSrc: [
        "'self'",
        'data:',
        'blob:',
        '*.googleusercontent.com',
        '*.githubusercontent.com',
        '*.gravatar.com',
        'avatars.githubusercontent.com',
        process.env.AWS_CLOUDFRONT_URL || '',
        'https:', // Allow HTTPS images
      ].filter(Boolean),
      mediaSrc: [
        "'self'",
        'blob:',
        process.env.AWS_CLOUDFRONT_URL || '',
      ].filter(Boolean),
      connectSrc: [
        "'self'",
        'api.github.com',
        'accounts.google.com',
        'www.google.com',
        process.env.NEXT_PUBLIC_API_URL || '',
        'wss:', // WebSocket connections
        'ws:', // WebSocket connections (development)
      ].filter(Boolean),
      frameSrc: [
        "'none'",
        // Add trusted iframe sources if needed
      ],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
    reportOnly: false,
  },
  
  // Strict Transport Security
  hsts: {
    maxAge: 63072000, // 2 years in seconds
    includeSubDomains: true,
    preload: true,
  },
  
  // X-Frame-Options
  frameguard: {
    action: 'deny',
  },
  
  // X-Content-Type-Options
  noSniff: true,
  
  // X-XSS-Protection (legacy but still useful for older browsers)
  xssFilter: true,
  
  // Referrer Policy
  referrerPolicy: {
    policy: ['strict-origin-when-cross-origin'],
  },
  
  // X-Permitted-Cross-Domain-Policies
  permittedCrossDomainPolicies: false,
  
  // X-Download-Options
  ieNoOpen: true,
  
  // Remove X-Powered-By header
  hidePoweredBy: true,
  
  // DNS Prefetch Control
  dnsPrefetchControl: {
    allow: false,
  },
  
  // Expect-CT is deprecated in helmet v7+, removed
});

// Custom security headers middleware
export const customSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Permissions Policy (formerly Feature Policy)
  res.setHeader('Permissions-Policy', [
    'geolocation=()',
    'microphone=()',
    'camera=()',
    'magnetometer=()',
    'gyroscope=()',
    'speaker=()',
    'vibrate=()',
    'fullscreen=(self)',
    'payment=()',
    'usb=()',
  ].join(', '));
  
  // Cross-Origin Embedder Policy
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  
  // Cross-Origin Opener Policy
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  
  // Cross-Origin Resource Policy
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  
  // Clear-Site-Data header for logout endpoints
  if (req.path.includes('/logout')) {
    res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage"');
  }
  
  // Custom security identifier
  res.setHeader('X-Security-Framework', 'CastMatch-Security-v1.0');
  
  // Request ID for tracking
  if (!res.getHeader('X-Request-ID')) {
    res.setHeader('X-Request-ID', req.id || `req_${Date.now()}`);
  }
  
  next();
};

// Development-specific security headers
export const developmentSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'development') {
    // Relaxed CSP for development
    res.setHeader('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' localhost:* 127.0.0.1:*",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: localhost:* 127.0.0.1:*",
      "connect-src 'self' localhost:* 127.0.0.1:* ws: wss:",
      "font-src 'self' data:",
    ].join('; '));
    
    // Allow development tools
    res.setHeader('X-Development-Mode', 'true');
  }
  
  next();
};

// Production security headers
export const productionSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production') {
    // Strict security headers for production
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Public Key Pinning (only if you have stable certificates)
    if (process.env.HPKP_PINS) {
      res.setHeader('Public-Key-Pins', process.env.HPKP_PINS);
    }
    
    // Expect-CT for certificate transparency
    if (process.env.CT_REPORT_URI) {
      res.setHeader('Expect-CT', `enforce, max-age=86400, report-uri="${process.env.CT_REPORT_URI}"`);
    }
  }
  
  next();
};

// API-specific security headers
export const apiSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // API responses should not be cached
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // API-specific CORS headers (if not using cors middleware)
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'];
  const origin = req.get('Origin');
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-CSRF-Token',
    'X-API-Key',
  ].join(', '));
  
  // API rate limiting headers
  res.setHeader('X-RateLimit-Remaining', req.rateLimit?.remaining?.toString() || '');
  res.setHeader('X-RateLimit-Reset', req.rateLimit?.resetTime?.toISOString() || '');
  
  next();
};

// Security headers for file uploads
export const uploadSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Content disposition for downloads
  if (req.query.download === 'true') {
    res.setHeader('Content-Disposition', 'attachment');
  }
  
  // Sandbox for user-generated content
  res.setHeader('Content-Security-Policy', [
    "default-src 'none'",
    "style-src 'unsafe-inline'",
    "img-src 'self' data:",
    "media-src 'self'",
    "sandbox allow-same-origin",
  ].join('; '));
  
  next();
};

// OAuth-specific security headers
export const oauthSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Allow OAuth providers in CSP
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' accounts.google.com github.com",
    "frame-src 'self' accounts.google.com github.com",
    "connect-src 'self' accounts.google.com api.github.com",
    "img-src 'self' data: *.googleusercontent.com *.githubusercontent.com",
  ].join('; '));
  
  // Referrer policy for OAuth
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // PKCE and state parameter validation
  if (req.query.state || req.body.state) {
    res.setHeader('X-OAuth-State-Validated', 'true');
  }
  
  next();
};

// Security logging middleware
export const securityLogging = (req: Request, res: Response, next: NextFunction) => {
  const securityEvents: Array<{ type: string; timestamp: Date; details: any }> = [];
  
  // Log potential security issues
  if (req.get('User-Agent')?.includes('bot') || req.get('User-Agent')?.includes('crawler')) {
    securityEvents.push({
      type: 'bot_detected',
      timestamp: new Date(),
      details: { userAgent: req.get('User-Agent') }
    });
  }
  
  if (req.get('X-Forwarded-For') !== req.ip) {
    securityEvents.push({
      type: 'proxy_detected',
      timestamp: new Date(),
      details: { forwardedFor: req.get('X-Forwarded-For'), ip: req.ip }
    });
  }
  
  if (req.protocol !== 'https' && process.env.NODE_ENV === 'production') {
    securityEvents.push({
      type: 'insecure_connection',
      timestamp: new Date(),
      details: { protocol: req.protocol }
    });
  }
  
  // Add security events to request for logging
  req.securityEvents = securityEvents;
  
  next();
};

// Comprehensive security middleware stack
export const comprehensiveSecurityHeaders = [
  securityHeaders,
  customSecurityHeaders,
  process.env.NODE_ENV === 'development' ? developmentSecurityHeaders : productionSecurityHeaders,
  securityLogging,
];

export default {
  securityHeaders,
  customSecurityHeaders,
  developmentSecurityHeaders,
  productionSecurityHeaders,
  apiSecurityHeaders,
  uploadSecurityHeaders,
  oauthSecurityHeaders,
  securityLogging,
  comprehensiveSecurityHeaders,
};