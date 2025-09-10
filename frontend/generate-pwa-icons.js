#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create PWA icon assets for CastMatch
const iconsDir = path.join(__dirname, 'public', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Base SVG template for CastMatch logo
const createSVGIcon = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#06b6d4;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#grad)" rx="${size * 0.15}"/>
  <text x="${size/2}" y="${size/2}" font-family="Arial, sans-serif" font-size="${size * 0.15}" 
        font-weight="bold" text-anchor="middle" dominant-baseline="central" fill="white">CM</text>
  <circle cx="${size * 0.25}" cy="${size * 0.75}" r="${size * 0.05}" fill="white" opacity="0.8"/>
  <circle cx="${size * 0.75}" cy="${size * 0.25}" r="${size * 0.03}" fill="white" opacity="0.6"/>
</svg>`.trim();

// Generate different sized icons
const iconSizes = [
  { size: 16, name: 'icon-16x16.png' },
  { size: 32, name: 'icon-32x32.png' },
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 120, name: 'apple-touch-icon-120x120.png' },
  { size: 152, name: 'apple-touch-icon-152x152.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' }
];

// Since we can't generate actual PNG files without image processing libs,
// let's create SVG files that browsers can use
iconSizes.forEach(({ size, name }) => {
  const svgContent = createSVGIcon(size);
  const svgName = name.replace('.png', '.svg');
  fs.writeFileSync(path.join(iconsDir, svgName), svgContent);
  
  // Also create the PNG filename but as SVG content for now
  // This is a temporary solution for development
  fs.writeFileSync(path.join(iconsDir, name), svgContent);
});

// Create safari-pinned-tab.svg
const safariIcon = `
<svg version="1.0" xmlns="http://www.w3.org/2000/svg" width="700" height="700" viewBox="0 0 700 700">
  <g transform="translate(0,700) scale(0.1,-0.1)" fill="#8b5cf6">
    <path d="M1200 6000 c-200 -50 -350 -200 -400 -400 -20 -80 -20 -4120 0 -4200 50 -200 200 -350 400 -400 80 -20 4120 -20 4200 0 200 50 350 200 400 400 20 80 20 4120 0 4200 -50 200 -200 350 -400 400 -80 20 -4120 20 -4200 0z m2300 -1500 c200 -50 400 -250 400 -500 0 -250 -200 -450 -400 -500 -200 -50 -400 50 -500 200 l-50 100 -50 -100 c-100 -150 -300 -250 -500 -200 -200 50 -400 250 -400 500 0 250 200 450 400 500 200 50 400 -50 500 -200 l50 -100 50 100 c100 150 300 250 500 200z"/>
  </g>
</svg>`.trim();

fs.writeFileSync(path.join(iconsDir, 'safari-pinned-tab.svg'), safariIcon);

console.log('✅ PWA icons generated successfully!');
console.log(`📁 Generated ${iconSizes.length + 1} icon files in ${iconsDir}`);