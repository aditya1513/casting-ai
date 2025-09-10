import React from 'react';

interface SocialPostProps {
  platform: 'instagram' | 'twitter' | 'linkedin' | 'facebook';
  type: 'carousel' | 'single' | 'story' | 'reel';
  day: number; // Day of campaign (1-30)
}

export const SocialMediaPost: React.FC<SocialPostProps> = ({ 
  platform, 
  type, 
  day 
}) => {
  // Campaign content calendar
  const campaignContent = [
    {
      day: 1,
      theme: "Announcement",
      content: {
        en: "The future of casting arrives in Mumbai! 🎬",
        hi: "कास्टिंग का भविष्य मुंबई में आ रहा है! 🎬"
      },
      visual: "launch-hero",
      hashtags: ["#CastMatchMumbai", "#BollywoodCasting", "#TalentMeetsOpportunity"]
    },
    {
      day: 2,
      theme: "Feature Highlight - AI Matching",
      content: {
        en: "AI-powered casting that understands your unique talent",
        hi: "AI-संचालित कास्टिंग जो आपकी अनूठी प्रतिभा को समझती है"
      },
      visual: "ai-feature",
      hashtags: ["#AIinBollywood", "#SmartCasting", "#FutureOfFilm"]
    },
    {
      day: 3,
      theme: "Success Story",
      content: {
        en: "From audition to stardom - Real stories, real dreams",
        hi: "ऑडिशन से स्टारडम तक - असली कहानियां, असली सपने"
      },
      visual: "success-story",
      hashtags: ["#SuccessStory", "#DreamsComeTrue", "#MumbaiDreams"]
    },
    {
      day: 7,
      theme: "Countdown",
      content: {
        en: "7 days until Mumbai's casting revolution begins!",
        hi: "मुंबई की कास्टिंग क्रांति शुरू होने में 7 दिन!"
      },
      visual: "countdown",
      hashtags: ["#7DaysToGo", "#CastMatchCountdown", "#MumbaiReady"]
    },
    {
      day: 13,
      theme: "Launch Day",
      content: {
        en: "IT'S HERE! CastMatch is LIVE in Mumbai! 🚀",
        hi: "यह यहाँ है! CastMatch मुंबई में LIVE है! 🚀"
      },
      visual: "launch-celebration",
      hashtags: ["#LaunchDay", "#CastMatchLive", "#MumbaiLaunch", "#JoinTheRevolution"]
    }
  ];

  const currentContent = campaignContent.find(c => c.day === day) || campaignContent[0];

  // Platform-specific dimensions
  const dimensions = {
    instagram: {
      single: { width: 1080, height: 1080 },
      story: { width: 1080, height: 1920 },
      carousel: { width: 1080, height: 1080 },
      reel: { width: 1080, height: 1920 }
    },
    twitter: {
      single: { width: 1200, height: 675 },
      story: { width: 1080, height: 1920 },
      carousel: { width: 1200, height: 675 },
      reel: { width: 1080, height: 1920 }
    },
    linkedin: {
      single: { width: 1200, height: 630 },
      story: { width: 1080, height: 1920 },
      carousel: { width: 1200, height: 630 },
      reel: { width: 1080, height: 1920 }
    },
    facebook: {
      single: { width: 1200, height: 630 },
      story: { width: 1080, height: 1920 },
      carousel: { width: 1080, height: 1080 },
      reel: { width: 1080, height: 1920 }
    }
  };

  const { width, height } = dimensions[platform][type];

  return (
    <div className="social-media-post">
      <svg 
        width={width} 
        height={height} 
        viewBox={`0 0 ${width} ${height}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Mumbai theme gradients */}
          <linearGradient id="mumbaiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF0066" />
            <stop offset="50%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#00D9FF" />
          </linearGradient>

          <linearGradient id="darkBg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0A0E27" />
            <stop offset="100%" stopColor="#1A1E37" />
          </linearGradient>

          <filter id="softGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width={width} height={height} fill="url(#darkBg)" />

        {/* Visual content based on theme */}
        {currentContent.visual === 'launch-hero' && (
          <>
            <circle 
              cx={width / 2} 
              cy={height / 2} 
              r={Math.min(width, height) * 0.3}
              fill="none"
              stroke="url(#mumbaiGradient)"
              strokeWidth="4"
              opacity="0.8"
              filter="url(#softGlow)"
            />
            <text 
              x={width / 2} 
              y={height / 2} 
              textAnchor="middle"
              fontSize={Math.min(width, height) * 0.08}
              fontFamily="Montserrat, sans-serif"
              fontWeight="800"
              fill="#FFFFFF"
            >
              CASTMATCH
            </text>
          </>
        )}

        {/* Content text */}
        <text 
          x={width / 2} 
          y={height * 0.7} 
          textAnchor="middle"
          fontSize={type === 'story' ? '32' : '24'}
          fontFamily="Inter, sans-serif"
          fontWeight="600"
          fill="#FFFFFF"
          style={{ maxWidth: width * 0.8 }}
        >
          {currentContent.content.en}
        </text>

        {/* Hashtags */}
        <text 
          x={width / 2} 
          y={height * 0.85} 
          textAnchor="middle"
          fontSize="16"
          fontFamily="Inter, sans-serif"
          fontWeight="400"
          fill="#00D9FF"
          opacity="0.8"
        >
          {currentContent.hashtags.join(' ')}
        </text>

        {/* Platform indicator */}
        <text 
          x="20" 
          y={height - 20} 
          fontSize="12"
          fontFamily="Inter, sans-serif"
          fill="#FFFFFF"
          opacity="0.3"
        >
          {platform.toUpperCase()} • Day {day}
        </text>
      </svg>
    </div>
  );
};

// Instagram Story Templates
export const InstagramStoryTemplates = {
  countdown: {
    frames: 10,
    duration: 15, // seconds
    interactive: {
      poll: "Are you ready for CastMatch?",
      quiz: "Guess how many auditions happen daily in Mumbai?",
      slider: "Rate your excitement level!"
    }
  },
  behindScenes: {
    frames: 5,
    duration: 10,
    content: [
      "Building the future of casting",
      "Our team in Mumbai",
      "Testing with real casting directors",
      "AI technology at work",
      "Launch preparations"
    ]
  },
  testimonials: {
    frames: 8,
    duration: 20,
    speakers: [
      "Aspiring Actor",
      "Casting Director",
      "Production House",
      "Acting Coach"
    ]
  }
};

// Twitter Thread Templates
export const TwitterThreads = [
  {
    title: "Why Mumbai Needs CastMatch",
    tweets: [
      "1/ Mumbai's film industry conducts 10,000+ auditions daily. Most go unnoticed. It's time for change. 🎬",
      "2/ Traditional casting = endless queues, missed opportunities, and talent lost in the crowd.",
      "3/ Enter CastMatch: AI-powered matching that connects the right talent with the right role, instantly.",
      "4/ No more waiting. No more missing out. Just pure opportunity meeting preparation.",
      "5/ Join us on January 13 as we revolutionize casting in Mumbai. The future starts now. #CastMatchMumbai"
    ]
  },
  {
    title: "Success Stories Preview",
    tweets: [
      "Meet Priya: Waited 6 months for her big break. With CastMatch? 2 weeks. 🌟",
      "Rahul's story: From 50 failed auditions to landing his dream role through smart AI matching.",
      "Casting Director Amit saved 100+ hours monthly using CastMatch's intelligent filtering.",
      "These aren't just stats. They're dreams realized. Lives changed. Careers launched.",
      "Your story could be next. January 13. Be ready. #CastMatchMumbai"
    ]
  }
];

// LinkedIn Article Templates
export const LinkedInArticles = [
  {
    title: "The Digital Transformation of Mumbai's Film Industry",
    excerpt: "How AI is democratizing access to Bollywood opportunities",
    readTime: "5 min",
    topics: ["Film Industry", "AI Technology", "Digital Transformation", "Mumbai", "Startups"]
  },
  {
    title: "From Queue to Click: The Evolution of Casting",
    excerpt: "CastMatch's journey to revolutionize talent discovery",
    readTime: "7 min",
    topics: ["Innovation", "Entertainment Tech", "Talent Management", "India"]
  }
];