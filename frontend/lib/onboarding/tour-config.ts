/**
 * CastMatch Onboarding Tour Configuration
 * Role-specific tours with personalized experiences
 */

export type UserRole = 'talent' | 'casting_director' | 'producer' | 'agent';

export interface TourStep {
  id: string;
  target: string; // CSS selector for element to highlight
  title: string;
  content: string;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: {
    type: 'click' | 'input' | 'scroll' | 'navigate';
    value?: string;
  };
  showSkip: boolean;
  showProgress: boolean;
  allowInteraction?: boolean; // Allow user to interact with highlighted element
  mobileOptimized?: boolean;
  delay?: number; // Delay before showing step (ms)
  hapticFeedback?: 'light' | 'medium' | 'heavy';
}

export interface TourConfig {
  id: string;
  name: string;
  description: string;
  role: UserRole;
  estimatedTime: number; // in minutes
  priority: number; // For sorting multiple available tours
  steps: TourStep[];
  completionReward?: {
    type: 'badge' | 'credits' | 'feature_unlock';
    value: string;
  };
}

// Talent Actor Tour
export const talentTour: TourConfig = {
  id: 'talent-onboarding-v1',
  name: 'Welcome to CastMatch',
  description: 'Learn how to showcase your talent and land your dream roles',
  role: 'talent',
  estimatedTime: 3,
  priority: 1,
  steps: [
    {
      id: 'welcome',
      target: 'body',
      title: 'Welcome to CastMatch! 🎬',
      content: 'Let\'s get you set up to showcase your talent and connect with casting directors.',
      placement: 'center',
      showSkip: true,
      showProgress: true,
      delay: 500,
      hapticFeedback: 'light'
    },
    {
      id: 'profile-setup',
      target: '[data-tour="profile-button"]',
      title: 'Complete Your Profile',
      content: 'Start by adding your headshots, resume, and demo reel. A complete profile gets 3x more views!',
      placement: 'bottom',
      showSkip: true,
      showProgress: true,
      allowInteraction: true,
      hapticFeedback: 'medium'
    },
    {
      id: 'ai-assistant',
      target: '[data-tour="ai-chat"]',
      title: 'Your AI Casting Assistant',
      content: 'Meet your personal AI assistant! Ask about auditions, get role recommendations, or practice lines.',
      placement: 'left',
      showSkip: true,
      showProgress: true,
      allowInteraction: true,
      mobileOptimized: true
    },
    {
      id: 'audition-search',
      target: '[data-tour="search-auditions"]',
      title: 'Find Perfect Auditions',
      content: 'Search for roles that match your type, skills, and experience. Use filters to narrow down results.',
      placement: 'bottom',
      showSkip: true,
      showProgress: true,
      allowInteraction: true
    },
    {
      id: 'self-tape',
      target: '[data-tour="self-tape-studio"]',
      title: 'Self-Tape Studio',
      content: 'Record and submit auditions directly from your device. Our AI helps with lighting and framing tips!',
      placement: 'top',
      showSkip: true,
      showProgress: true,
      mobileOptimized: true,
      hapticFeedback: 'light'
    },
    {
      id: 'calendar',
      target: '[data-tour="calendar"]',
      title: 'Manage Your Schedule',
      content: 'Keep track of auditions, callbacks, and bookings all in one place.',
      placement: 'left',
      showSkip: true,
      showProgress: true,
      allowInteraction: true
    },
    {
      id: 'notifications',
      target: '[data-tour="notifications"]',
      title: 'Stay Updated',
      content: 'Get instant notifications for new opportunities, callbacks, and messages.',
      placement: 'bottom',
      showSkip: true,
      showProgress: true,
      hapticFeedback: 'light'
    },
    {
      id: 'completion',
      target: 'body',
      title: 'You\'re All Set! 🌟',
      content: 'Start exploring CastMatch and land your next big role. Break a leg!',
      placement: 'center',
      showSkip: false,
      showProgress: true,
      delay: 300,
      hapticFeedback: 'heavy'
    }
  ],
  completionReward: {
    type: 'badge',
    value: 'onboarding_complete'
  }
};

// Casting Director Tour
export const castingDirectorTour: TourConfig = {
  id: 'casting-director-onboarding-v1',
  name: 'Casting Director Dashboard',
  description: 'Streamline your casting process with AI-powered tools',
  role: 'casting_director',
  estimatedTime: 4,
  priority: 1,
  steps: [
    {
      id: 'welcome',
      target: 'body',
      title: 'Welcome to CastMatch Pro! 🎯',
      content: 'Let\'s show you how to find perfect talent faster than ever before.',
      placement: 'center',
      showSkip: true,
      showProgress: true,
      delay: 500,
      hapticFeedback: 'light'
    },
    {
      id: 'create-project',
      target: '[data-tour="create-project"]',
      title: 'Create Your First Project',
      content: 'Start by creating a casting project. Add roles, requirements, and submission deadlines.',
      placement: 'right',
      showSkip: true,
      showProgress: true,
      allowInteraction: true,
      hapticFeedback: 'medium'
    },
    {
      id: 'ai-matching',
      target: '[data-tour="ai-matching"]',
      title: 'AI-Powered Talent Matching',
      content: 'Our AI analyzes thousands of profiles to find actors that perfectly match your requirements.',
      placement: 'bottom',
      showSkip: true,
      showProgress: true,
      mobileOptimized: true
    },
    {
      id: 'talent-pool',
      target: '[data-tour="talent-pool"]',
      title: 'Browse Talent Database',
      content: 'Access our extensive database of verified talent. Filter by type, experience, location, and more.',
      placement: 'top',
      showSkip: true,
      showProgress: true,
      allowInteraction: true
    },
    {
      id: 'review-submissions',
      target: '[data-tour="submissions"]',
      title: 'Review Submissions',
      content: 'Watch self-tapes, review profiles, and organize talent into lists. Use keyboard shortcuts for faster review!',
      placement: 'left',
      showSkip: true,
      showProgress: true,
      allowInteraction: true,
      hapticFeedback: 'light'
    },
    {
      id: 'collaboration',
      target: '[data-tour="team-collaboration"]',
      title: 'Team Collaboration',
      content: 'Share shortlists with your team, gather feedback, and make decisions together.',
      placement: 'bottom',
      showSkip: true,
      showProgress: true,
      mobileOptimized: true
    },
    {
      id: 'schedule-auditions',
      target: '[data-tour="scheduling"]',
      title: 'Smart Scheduling',
      content: 'Schedule auditions and callbacks with automatic conflict detection and calendar sync.',
      placement: 'right',
      showSkip: true,
      showProgress: true,
      allowInteraction: true
    },
    {
      id: 'analytics',
      target: '[data-tour="analytics"]',
      title: 'Casting Analytics',
      content: 'Track submission rates, diversity metrics, and casting funnel performance.',
      placement: 'top',
      showSkip: true,
      showProgress: true,
      hapticFeedback: 'light'
    },
    {
      id: 'completion',
      target: 'body',
      title: 'Ready to Cast! 🎬',
      content: 'You\'re all set to revolutionize your casting process. Let\'s find your perfect cast!',
      placement: 'center',
      showSkip: false,
      showProgress: true,
      delay: 300,
      hapticFeedback: 'heavy'
    }
  ],
  completionReward: {
    type: 'feature_unlock',
    value: 'advanced_ai_features'
  }
};

// Producer Tour
export const producerTour: TourConfig = {
  id: 'producer-onboarding-v1',
  name: 'Producer Overview',
  description: 'Oversee casting projects and manage production pipelines',
  role: 'producer',
  estimatedTime: 3,
  priority: 1,
  steps: [
    {
      id: 'welcome',
      target: 'body',
      title: 'Welcome to CastMatch Executive! 🎭',
      content: 'Get a bird\'s eye view of all your casting projects.',
      placement: 'center',
      showSkip: true,
      showProgress: true,
      delay: 500,
      hapticFeedback: 'light'
    },
    {
      id: 'dashboard',
      target: '[data-tour="executive-dashboard"]',
      title: 'Executive Dashboard',
      content: 'Monitor all active projects, budgets, and timelines in one place.',
      placement: 'bottom',
      showSkip: true,
      showProgress: true,
      allowInteraction: true
    },
    {
      id: 'project-oversight',
      target: '[data-tour="project-overview"]',
      title: 'Project Oversight',
      content: 'Track casting progress, review key decisions, and approve final selections.',
      placement: 'right',
      showSkip: true,
      showProgress: true,
      mobileOptimized: true
    },
    {
      id: 'budget-tracking',
      target: '[data-tour="budget-tracker"]',
      title: 'Budget Management',
      content: 'Monitor casting budgets, actor rates, and negotiate deals directly through the platform.',
      placement: 'left',
      showSkip: true,
      showProgress: true,
      allowInteraction: true
    },
    {
      id: 'reports',
      target: '[data-tour="reports"]',
      title: 'Detailed Reports',
      content: 'Generate casting reports, diversity analytics, and compliance documentation.',
      placement: 'top',
      showSkip: true,
      showProgress: true,
      hapticFeedback: 'light'
    },
    {
      id: 'completion',
      target: 'body',
      title: 'Production Ready! 🚀',
      content: 'You\'re ready to oversee world-class productions with CastMatch.',
      placement: 'center',
      showSkip: false,
      showProgress: true,
      delay: 300,
      hapticFeedback: 'heavy'
    }
  ],
  completionReward: {
    type: 'credits',
    value: '100_platform_credits'
  }
};

// Agent Tour
export const agentTour: TourConfig = {
  id: 'agent-onboarding-v1',
  name: 'Talent Agent Tools',
  description: 'Manage your roster and find opportunities for your clients',
  role: 'agent',
  estimatedTime: 3,
  priority: 1,
  steps: [
    {
      id: 'welcome',
      target: 'body',
      title: 'Welcome to CastMatch Agency! 📊',
      content: 'Manage your talent roster and discover opportunities like never before.',
      placement: 'center',
      showSkip: true,
      showProgress: true,
      delay: 500,
      hapticFeedback: 'light'
    },
    {
      id: 'roster-management',
      target: '[data-tour="roster"]',
      title: 'Talent Roster',
      content: 'Manage all your clients in one place. Track their availability, bookings, and career progress.',
      placement: 'bottom',
      showSkip: true,
      showProgress: true,
      allowInteraction: true
    },
    {
      id: 'opportunity-matching',
      target: '[data-tour="opportunities"]',
      title: 'AI Opportunity Matching',
      content: 'Get personalized casting opportunities for each client based on their profile and goals.',
      placement: 'right',
      showSkip: true,
      showProgress: true,
      mobileOptimized: true
    },
    {
      id: 'batch-submissions',
      target: '[data-tour="batch-submit"]',
      title: 'Batch Submissions',
      content: 'Submit multiple clients to roles quickly with our streamlined submission system.',
      placement: 'left',
      showSkip: true,
      showProgress: true,
      allowInteraction: true,
      hapticFeedback: 'medium'
    },
    {
      id: 'client-analytics',
      target: '[data-tour="client-stats"]',
      title: 'Client Performance',
      content: 'Track submission success rates, callback ratios, and booking trends for each client.',
      placement: 'top',
      showSkip: true,
      showProgress: true
    },
    {
      id: 'completion',
      target: 'body',
      title: 'Agency Activated! 💼',
      content: 'You\'re ready to take your clients\' careers to the next level!',
      placement: 'center',
      showSkip: false,
      showProgress: true,
      delay: 300,
      hapticFeedback: 'heavy'
    }
  ],
  completionReward: {
    type: 'feature_unlock',
    value: 'bulk_submission_tools'
  }
};

// Get tour by role
export const getTourByRole = (role: UserRole): TourConfig => {
  const tours: Record<UserRole, TourConfig> = {
    talent: talentTour,
    casting_director: castingDirectorTour,
    producer: producerTour,
    agent: agentTour
  };
  
  return tours[role] || talentTour;
};

// Get all available tours for a user (some users might have multiple roles)
export const getAvailableTours = (roles: UserRole[]): TourConfig[] => {
  return roles.map(role => getTourByRole(role))
    .sort((a, b) => a.priority - b.priority);
};