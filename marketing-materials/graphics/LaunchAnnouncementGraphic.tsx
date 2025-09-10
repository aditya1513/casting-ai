import React from 'react';

interface LaunchGraphicProps {
  variant: 'hero' | 'square' | 'story' | 'banner';
  language: 'en' | 'hi' | 'mr';
}

export const LaunchAnnouncementGraphic: React.FC<LaunchGraphicProps> = ({ 
  variant = 'hero',
  language = 'en' 
}) => {
  const dimensions = {
    hero: { width: 1920, height: 1080 },
    square: { width: 1080, height: 1080 },
    story: { width: 1080, height: 1920 },
    banner: { width: 1200, height: 630 }
  };

  const content = {
    en: {
      headline: "CastMatch Arrives in Mumbai",
      subheadline: "Where Talent Meets Opportunity",
      date: "Launching January 13, 2025",
      cta: "Join the Revolution"
    },
    hi: {
      headline: "CastMatch मुंबई में आ रहा है",
      subheadline: "जहाँ प्रतिभा मिलती है अवसर से",
      date: "13 जनवरी 2025 को लॉन्च",
      cta: "क्रांति में शामिल हों"
    },
    mr: {
      headline: "CastMatch मुंबईत येत आहे",
      subheadline: "जिथे प्रतिभा भेटते संधीला",
      date: "13 जानेवारी 2025 रोजी लॉन्च",
      cta: "क्रांतीत सामील व्हा"
    }
  };

  const { width, height } = dimensions[variant];
  const text = content[language];

  return (
    <svg 
      width={width} 
      height={height} 
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      className="launch-graphic"
    >
      {/* Background with Mumbai skyline gradient */}
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0A0E27" />
          <stop offset="50%" stopColor="#1A1E37" />
          <stop offset="100%" stopColor="#0A0E27" />
        </linearGradient>
        
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="50%" stopColor="#FFA500" />
          <stop offset="100%" stopColor="#FFD700" />
        </linearGradient>

        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        {/* Film reel pattern */}
        <pattern id="filmStrip" x="0" y="0" width="40" height="20" patternUnits="userSpaceOnUse">
          <rect width="40" height="20" fill="#000"/>
          <rect x="5" y="2" width="10" height="16" fill="#FFF" opacity="0.1"/>
          <rect x="25" y="2" width="10" height="16" fill="#FFF" opacity="0.1"/>
        </pattern>
      </defs>

      {/* Main background */}
      <rect width={width} height={height} fill="url(#bgGradient)" />

      {/* Mumbai skyline silhouette */}
      <g opacity="0.3">
        <path 
          d={`M 0 ${height * 0.7} 
              L ${width * 0.1} ${height * 0.6} 
              L ${width * 0.15} ${height * 0.5} 
              L ${width * 0.2} ${height * 0.65} 
              L ${width * 0.3} ${height * 0.55} 
              L ${width * 0.4} ${height * 0.45} 
              L ${width * 0.5} ${height * 0.6} 
              L ${width * 0.6} ${height * 0.5} 
              L ${width * 0.7} ${height * 0.65} 
              L ${width * 0.8} ${height * 0.55} 
              L ${width * 0.9} ${height * 0.7} 
              L ${width} ${height * 0.6} 
              L ${width} ${height} 
              L 0 ${height} Z`}
          fill="#00D9FF"
          opacity="0.2"
        />
      </g>

      {/* Film strip borders */}
      {variant === 'hero' && (
        <>
          <rect x="0" y="0" width={width} height="60" fill="url(#filmStrip)" opacity="0.5"/>
          <rect x="0" y={height - 60} width={width} height="60" fill="url(#filmStrip)" opacity="0.5"/>
        </>
      )}

      {/* Spotlight effect */}
      <ellipse 
        cx={width / 2} 
        cy={height / 2} 
        rx={width * 0.4} 
        ry={height * 0.3}
        fill="url(#goldGradient)"
        opacity="0.1"
        filter="url(#glow)"
      />

      {/* Logo placeholder */}
      <g transform={`translate(${width / 2}, ${height * 0.3})`}>
        <circle r="80" fill="#00D9FF" opacity="0.2" />
        <circle r="60" fill="#00D9FF" opacity="0.4" />
        <text 
          x="0" 
          y="10" 
          textAnchor="middle" 
          fontSize="48" 
          fontFamily="Montserrat, sans-serif"
          fontWeight="800"
          fill="#FFFFFF"
        >
          CM
        </text>
      </g>

      {/* Main headline */}
      <text 
        x={width / 2} 
        y={height * 0.5} 
        textAnchor="middle"
        fontFamily={language === 'hi' || language === 'mr' ? 'Noto Sans Devanagari, sans-serif' : 'Montserrat, sans-serif'}
        fontSize={variant === 'story' ? '56' : '72'}
        fontWeight="800"
        fill="url(#goldGradient)"
        filter="url(#glow)"
      >
        {text.headline}
      </text>

      {/* Subheadline */}
      <text 
        x={width / 2} 
        y={height * 0.58} 
        textAnchor="middle"
        fontFamily={language === 'hi' || language === 'mr' ? 'Noto Sans Devanagari, sans-serif' : 'Inter, sans-serif'}
        fontSize={variant === 'story' ? '32' : '36'}
        fontWeight="600"
        fill="#00D9FF"
        opacity="0.9"
      >
        {text.subheadline}
      </text>

      {/* Launch date */}
      <text 
        x={width / 2} 
        y={height * 0.7} 
        textAnchor="middle"
        fontFamily="Inter, sans-serif"
        fontSize="24"
        fontWeight="400"
        fill="#FFFFFF"
        opacity="0.8"
      >
        {text.date}
      </text>

      {/* CTA Button */}
      <g transform={`translate(${width / 2}, ${height * 0.8})`}>
        <rect 
          x="-150" 
          y="-30" 
          width="300" 
          height="60" 
          rx="30"
          fill="#FF0066"
          filter="url(#glow)"
        />
        <text 
          x="0" 
          y="7" 
          textAnchor="middle"
          fontFamily={language === 'hi' || language === 'mr' ? 'Noto Sans Devanagari, sans-serif' : 'Montserrat, sans-serif'}
          fontSize="20"
          fontWeight="700"
          fill="#FFFFFF"
        >
          {text.cta}
        </text>
      </g>

      {/* Decorative elements */}
      <circle cx={width * 0.1} cy={height * 0.2} r="3" fill="#FFD700" opacity="0.6">
        <animate attributeName="opacity" values="0.6;1;0.6" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx={width * 0.9} cy={height * 0.3} r="3" fill="#00D9FF" opacity="0.6">
        <animate attributeName="opacity" values="0.6;1;0.6" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx={width * 0.15} cy={height * 0.8} r="3" fill="#FF0066" opacity="0.6">
        <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
};

// Export configuration for different platforms
export const graphicExports = {
  instagram: {
    feed: { width: 1080, height: 1080, format: 'jpg' },
    story: { width: 1080, height: 1920, format: 'jpg' },
    reel: { width: 1080, height: 1920, format: 'mp4' }
  },
  twitter: {
    post: { width: 1200, height: 675, format: 'jpg' },
    header: { width: 1500, height: 500, format: 'jpg' }
  },
  linkedin: {
    post: { width: 1200, height: 630, format: 'jpg' },
    cover: { width: 1584, height: 396, format: 'jpg' }
  },
  facebook: {
    post: { width: 1200, height: 630, format: 'jpg' },
    cover: { width: 820, height: 312, format: 'jpg' }
  },
  youtube: {
    thumbnail: { width: 1280, height: 720, format: 'jpg' },
    banner: { width: 2560, height: 1440, format: 'jpg' }
  }
};