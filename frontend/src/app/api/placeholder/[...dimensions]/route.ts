import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { dimensions: string[] } }
) {
  const [width, height] = params.dimensions;
  
  // Simple SVG placeholder
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <circle cx="50%" cy="35%" r="15%" fill="#d1d5db"/>
      <rect x="30%" y="60%" width="40%" height="8%" rx="4%" fill="#d1d5db"/>
      <rect x="35%" y="72%" width="30%" height="6%" rx="3%" fill="#e5e7eb"/>
      <text x="50%" y="90%" text-anchor="middle" fill="#9ca3af" font-family="system-ui" font-size="12">
        ${width}x${height}
      </text>
    </svg>
  `;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
    },
  });
}