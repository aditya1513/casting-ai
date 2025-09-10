#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create OG and Twitter images for CastMatch
const publicDir = path.join(__dirname, 'public');

// OG Image (1200x630)
const ogImageSVG = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#06b6d4;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bgGrad)"/>
  
  <!-- Accent shapes -->
  <circle cx="1000" cy="100" r="60" fill="#8b5cf6" opacity="0.1"/>
  <circle cx="200" cy="500" r="40" fill="#06b6d4" opacity="0.15"/>
  <rect x="800" y="400" width="300" height="150" fill="#a855f7" opacity="0.05" rx="20"/>
  
  <!-- Main logo area -->
  <rect x="80" y="80" width="120" height="120" fill="url(#logoGrad)" rx="20"/>
  <text x="140" y="155" font-family="Arial, sans-serif" font-size="36" font-weight="bold" text-anchor="middle" fill="white">CM</text>
  
  <!-- Title -->
  <text x="240" y="130" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="white">CastMatch</text>
  <text x="240" y="180" font-family="Arial, sans-serif" font-size="24" fill="#94a3b8">Elite Casting Platform</text>
  
  <!-- Subtitle -->
  <text x="80" y="280" font-family="Arial, sans-serif" font-size="32" font-weight="600" fill="white">Connect. Discover. Create.</text>
  <text x="80" y="330" font-family="Arial, sans-serif" font-size="20" fill="#cbd5e1">AI-powered casting for Mumbai's entertainment industry</text>
  
  <!-- Features -->
  <circle cx="110" cy="400" r="8" fill="#10b981"/>
  <text x="140" y="410" font-family="Arial, sans-serif" font-size="18" fill="#e2e8f0">Smart talent matching</text>
  
  <circle cx="110" cy="440" r="8" fill="#10b981"/>
  <text x="140" y="450" font-family="Arial, sans-serif" font-size="18" fill="#e2e8f0">Real-time collaboration</text>
  
  <circle cx="110" cy="480" r="8" fill="#10b981"/>
  <text x="140" y="490" font-family="Arial, sans-serif" font-size="18" fill="#e2e8f0">Production management</text>
  
  <!-- CTA -->
  <rect x="80" y="520" width="200" height="50" fill="url(#logoGrad)" rx="25"/>
  <text x="180" y="550" font-family="Arial, sans-serif" font-size="18" font-weight="bold" text-anchor="middle" fill="white">Join CastMatch</text>
  
  <!-- Mumbai indicator -->
  <text x="950" y="580" font-family="Arial, sans-serif" font-size="16" fill="#64748b" text-anchor="end">Mumbai • India</text>
</svg>`.trim();

// Twitter Image (1200x600)
const twitterImageSVG = `
<svg width="1200" height="600" viewBox="0 0 1200 600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="logoGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#06b6d4;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="1200" height="600" fill="url(#bgGrad2)"/>
  
  <!-- Accent shapes -->
  <circle cx="950" cy="80" r="50" fill="#8b5cf6" opacity="0.1"/>
  <circle cx="150" cy="450" r="35" fill="#06b6d4" opacity="0.15"/>
  
  <!-- Main content centered -->
  <rect x="500" y="150" width="100" height="100" fill="url(#logoGrad2)" rx="15"/>
  <text x="550" y="215" font-family="Arial, sans-serif" font-size="32" font-weight="bold" text-anchor="middle" fill="white">CM</text>
  
  <!-- Title -->
  <text x="600" y="200" font-family="Arial, sans-serif" font-size="44" font-weight="bold" fill="white" text-anchor="middle">CastMatch</text>
  <text x="600" y="240" font-family="Arial, sans-serif" font-size="20" fill="#94a3b8" text-anchor="middle">AI-powered casting platform</text>
  
  <!-- Key features in row -->
  <rect x="200" y="320" width="240" height="120" fill="#1e293b" rx="12" stroke="#334155" stroke-width="1"/>
  <text x="320" y="350" font-family="Arial, sans-serif" font-size="16" font-weight="600" fill="white" text-anchor="middle">Smart Matching</text>
  <text x="320" y="380" font-family="Arial, sans-serif" font-size="14" fill="#94a3b8" text-anchor="middle">AI finds perfect</text>
  <text x="320" y="400" font-family="Arial, sans-serif" font-size="14" fill="#94a3b8" text-anchor="middle">talent matches</text>
  
  <rect x="480" y="320" width="240" height="120" fill="#1e293b" rx="12" stroke="#334155" stroke-width="1"/>
  <text x="600" y="350" font-family="Arial, sans-serif" font-size="16" font-weight="600" fill="white" text-anchor="middle">Real-time Sync</text>
  <text x="600" y="380" font-family="Arial, sans-serif" font-size="14" fill="#94a3b8" text-anchor="middle">Collaborate with</text>
  <text x="600" y="400" font-family="Arial, sans-serif" font-size="14" fill="#94a3b8" text-anchor="middle">your team</text>
  
  <rect x="760" y="320" width="240" height="120" fill="#1e293b" rx="12" stroke="#334155" stroke-width="1"/>
  <text x="880" y="350" font-family="Arial, sans-serif" font-size="16" font-weight="600" fill="white" text-anchor="middle">Mumbai Focus</text>
  <text x="880" y="380" font-family="Arial, sans-serif" font-size="14" fill="#94a3b8" text-anchor="middle">Built for India's</text>
  <text x="880" y="400" font-family="Arial, sans-serif" font-size="14" fill="#94a3b8" text-anchor="middle">entertainment hub</text>
  
  <!-- Footer -->
  <text x="600" y="520" font-family="Arial, sans-serif" font-size="16" fill="#64748b" text-anchor="middle">Ready to transform your casting process?</text>
</svg>`.trim();

// Write the images
fs.writeFileSync(path.join(publicDir, 'og-image.png'), ogImageSVG);
fs.writeFileSync(path.join(publicDir, 'twitter-image.png'), twitterImageSVG);

// Also create SVG versions
fs.writeFileSync(path.join(publicDir, 'og-image.svg'), ogImageSVG);
fs.writeFileSync(path.join(publicDir, 'twitter-image.svg'), twitterImageSVG);

console.log('✅ OG and Twitter images generated successfully!');
console.log('📁 Created og-image.png, twitter-image.png and SVG versions');