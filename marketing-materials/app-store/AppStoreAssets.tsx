import React from 'react';

interface AppStoreScreenshotProps {
  index: number; // 1-8 screenshots
  device: 'iphone' | 'ipad' | 'android';
  theme: 'light' | 'dark';
}

export const AppStoreScreenshot: React.FC<AppStoreScreenshotProps> = ({ 
  index, 
  device, 
  theme 
}) => {
  // Device dimensions for app store requirements
  const deviceSpecs = {
    iphone: {
      width: 1290,
      height: 2796,
      statusBarHeight: 120,
      homeIndicator: 80
    },
    ipad: {
      width: 2048,
      height: 2732,
      statusBarHeight: 80,
      homeIndicator: 60
    },
    android: {
      width: 1080,
      height: 2400,
      statusBarHeight: 100,
      homeIndicator: 70
    }
  };

  const screenshots = [
    {
      title: "Welcome Screen",
      subtitle: "Your Journey Starts Here",
      features: ["Sign up in seconds", "Multiple language support", "Secure authentication"],
      primaryColor: "#FFD700"
    },
    {
      title: "AI-Powered Matching",
      subtitle: "Find Your Perfect Role",
      features: ["Smart algorithm", "Instant matches", "Personalized recommendations"],
      primaryColor: "#00D9FF"
    },
    {
      title: "Profile Builder",
      subtitle: "Showcase Your Talent",
      features: ["Video portfolios", "Skill tags", "Experience timeline"],
      primaryColor: "#FF0066"
    },
    {
      title: "Audition Manager",
      subtitle: "Never Miss an Opportunity",
      features: ["Calendar integration", "Push notifications", "Location mapping"],
      primaryColor: "#FFD700"
    },
    {
      title: "Direct Messaging",
      subtitle: "Connect with Casting Directors",
      features: ["Secure chat", "File sharing", "Video calls"],
      primaryColor: "#00D9FF"
    },
    {
      title: "Analytics Dashboard",
      subtitle: "Track Your Progress",
      features: ["Profile views", "Application stats", "Success metrics"],
      primaryColor: "#FF0066"
    },
    {
      title: "Mumbai Network",
      subtitle: "Join the Community",
      features: ["Industry news", "Workshops", "Networking events"],
      primaryColor: "#FFD700"
    },
    {
      title: "Premium Features",
      subtitle: "Unlock Your Potential",
      features: ["Priority listing", "Advanced filters", "Exclusive auditions"],
      primaryColor: "#00D9FF"
    }
  ];

  const spec = deviceSpecs[device];
  const screen = screenshots[index - 1];
  const bgColor = theme === 'dark' ? '#0A0E27' : '#FFFFFF';
  const textColor = theme === 'dark' ? '#FFFFFF' : '#0A0E27';

  return (
    <svg 
      width={spec.width} 
      height={spec.height} 
      viewBox={`0 0 ${spec.width} ${spec.height}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`screenGradient${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={screen.primaryColor} stopOpacity="0.1" />
          <stop offset="100%" stopColor={bgColor} />
        </linearGradient>

        <filter id="deviceShadow">
          <feDropShadow dx="0" dy="10" stdDeviation="20" floodOpacity="0.2"/>
        </filter>

        <clipPath id="screenClip">
          <rect 
            x="0" 
            y={spec.statusBarHeight} 
            width={spec.width} 
            height={spec.height - spec.statusBarHeight - spec.homeIndicator} 
            rx="0" 
          />
        </clipPath>
      </defs>

      {/* Background */}
      <rect width={spec.width} height={spec.height} fill={bgColor} />

      {/* Status bar */}
      <rect x="0" y="0" width={spec.width} height={spec.statusBarHeight} fill={bgColor} opacity="0.95" />
      
      {/* Time */}
      <text x="60" y={spec.statusBarHeight * 0.6} fontSize="32" fill={textColor} fontFamily="SF Pro Display, Inter">
        9:41 AM
      </text>
      
      {/* Battery and signal indicators */}
      <g transform={`translate(${spec.width - 200}, ${spec.statusBarHeight * 0.4})`}>
        <rect x="0" y="0" width="50" height="24" rx="4" fill="none" stroke={textColor} strokeWidth="2" />
        <rect x="2" y="2" width="30" height="20" fill={textColor} />
        <circle cx="80" cy="12" r="4" fill={textColor} />
        <circle cx="100" cy="12" r="4" fill={textColor} />
        <circle cx="120" cy="12" r="4" fill={textColor} />
      </g>

      {/* Main screen content */}
      <g clipPath="url(#screenClip)">
        <rect 
          x="0" 
          y={spec.statusBarHeight} 
          width={spec.width} 
          height={spec.height - spec.statusBarHeight - spec.homeIndicator}
          fill={`url(#screenGradient${index})`}
        />

        {/* App header */}
        <rect 
          x="0" 
          y={spec.statusBarHeight} 
          width={spec.width} 
          height="200"
          fill={screen.primaryColor}
          opacity="0.1"
        />

        {/* Screen title */}
        <text 
          x={spec.width / 2} 
          y={spec.statusBarHeight + 120} 
          textAnchor="middle"
          fontSize="64"
          fontWeight="800"
          fill={screen.primaryColor}
          fontFamily="Montserrat, Inter"
        >
          {screen.title}
        </text>

        {/* Subtitle */}
        <text 
          x={spec.width / 2} 
          y={spec.statusBarHeight + 200} 
          textAnchor="middle"
          fontSize="36"
          fontWeight="400"
          fill={textColor}
          opacity="0.7"
          fontFamily="Inter"
        >
          {screen.subtitle}
        </text>

        {/* Feature cards */}
        {screen.features.map((feature, idx) => (
          <g key={idx} transform={`translate(100, ${spec.statusBarHeight + 400 + (idx * 200)})`}>
            <rect 
              x="0" 
              y="0" 
              width={spec.width - 200} 
              height="150"
              rx="20"
              fill={theme === 'dark' ? '#1A1E37' : '#F5F5F5'}
            />
            <circle 
              cx="75" 
              cy="75" 
              r="30"
              fill={screen.primaryColor}
              opacity="0.2"
            />
            <text 
              x="150" 
              y="85" 
              fontSize="32"
              fill={textColor}
              fontFamily="Inter"
            >
              {feature}
            </text>
          </g>
        ))}

        {/* CTA Button */}
        <g transform={`translate(${spec.width / 2}, ${spec.height - spec.homeIndicator - 300})`}>
          <rect 
            x="-300" 
            y="-60" 
            width="600" 
            height="120"
            rx="60"
            fill={screen.primaryColor}
            filter="url(#deviceShadow)"
          />
          <text 
            x="0" 
            y="15" 
            textAnchor="middle"
            fontSize="36"
            fontWeight="700"
            fill="#FFFFFF"
            fontFamily="Montserrat, Inter"
          >
            Get Started
          </text>
        </g>
      </g>

      {/* Home indicator */}
      <rect 
        x={spec.width / 2 - 100} 
        y={spec.height - spec.homeIndicator / 2 - 10} 
        width="200" 
        height="8"
        rx="4"
        fill={textColor}
        opacity="0.3"
      />
    </svg>
  );
};

// App Store Preview Video Storyboard
export const AppPreviewVideo = {
  duration: 30, // seconds
  scenes: [
    {
      start: 0,
      end: 3,
      title: "Welcome to CastMatch",
      action: "Logo animation with Mumbai skyline",
      voiceover: "Your dreams, one tap away"
    },
    {
      start: 3,
      end: 8,
      title: "Create Your Profile",
      action: "User filling profile, uploading headshots",
      voiceover: "Build your professional portfolio in minutes"
    },
    {
      start: 8,
      end: 13,
      title: "AI Matching Magic",
      action: "Animation of AI analyzing and matching",
      voiceover: "Our AI finds your perfect roles instantly"
    },
    {
      start: 13,
      end: 18,
      title: "Apply with Confidence",
      action: "One-tap application process",
      voiceover: "Apply to multiple auditions with a single tap"
    },
    {
      start: 18,
      end: 23,
      title: "Track Your Journey",
      action: "Dashboard showing progress and analytics",
      voiceover: "Monitor your success in real-time"
    },
    {
      start: 23,
      end: 27,
      title: "Success Stories",
      action: "Testimonials from actors and casting directors",
      voiceover: "Join thousands finding success"
    },
    {
      start: 27,
      end: 30,
      title: "Join CastMatch Today",
      action: "CTA with download button",
      voiceover: "Download now and start your journey"
    }
  ],
  music: "Upbeat Bollywood fusion instrumental",
  languages: ["English", "Hindi", "Marathi"]
};

// Play Store Feature Graphic
export const PlayStoreFeatureGraphic = () => (
  <svg width="1024" height="500" viewBox="0 0 1024 500" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="featureGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF0066" />
        <stop offset="50%" stopColor="#FFD700" />
        <stop offset="100%" stopColor="#00D9FF" />
      </linearGradient>
    </defs>

    <rect width="1024" height="500" fill="#0A0E27" />
    
    <rect 
      x="20" 
      y="20" 
      width="984" 
      height="460" 
      rx="20"
      fill="none"
      stroke="url(#featureGradient)"
      strokeWidth="4"
      opacity="0.5"
    />

    <text 
      x="512" 
      y="150" 
      textAnchor="middle"
      fontSize="72"
      fontWeight="800"
      fill="url(#featureGradient)"
      fontFamily="Montserrat"
    >
      CASTMATCH
    </text>

    <text 
      x="512" 
      y="220" 
      textAnchor="middle"
      fontSize="32"
      fontWeight="400"
      fill="#FFFFFF"
      fontFamily="Inter"
    >
      Where Mumbai's Talent Shines
    </text>

    <text 
      x="512" 
      y="350" 
      textAnchor="middle"
      fontSize="24"
      fontWeight="600"
      fill="#00D9FF"
      fontFamily="Inter"
    >
      AI-Powered Casting • 10,000+ Opportunities • Launch January 13
    </text>

    {/* Decorative film reel elements */}
    <circle cx="100" cy="250" r="40" fill="none" stroke="#FFD700" strokeWidth="2" opacity="0.3" />
    <circle cx="924" cy="250" r="40" fill="none" stroke="#FFD700" strokeWidth="2" opacity="0.3" />
  </svg>
);