import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize images
  images: {
    domains: ['localhost', 'castmatch.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Enable compression
  compress: true,
  
  // Turbopack configuration
  turbopack: {
    root: '/Users/Aditya/Desktop/casting-ai/frontend',
  },
  
  // Optimize bundle
  experimental: {
    optimizeCss: true,
    optimizeServerReact: true,
  },
  
  // Headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
