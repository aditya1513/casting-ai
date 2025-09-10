/**
 * Contextual Help & Smart Tooltip System for CastMatch
 * Intelligent help system that learns user behavior and provides contextual guidance
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface HelpContent {
  id: string;
  title: string;
  description: string;
  steps?: string[];
  videoUrl?: string;
  imageUrl?: string;
  relatedTopics?: string[];
  priority: 'low' | 'medium' | 'high';
  userRole?: 'talent' | 'casting_director' | 'both';
  complexity: 'beginner' | 'intermediate' | 'advanced';
}

export interface UserBehavior {
  pageVisits: Record<string, number>;
  helpRequests: Record<string, number>;
  taskCompletions: Record<string, boolean>;
  strugglingAreas: string[];
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  preferredHelpFormat: 'text' | 'video' | 'interactive';
}

export interface HelpContext {
  page: string;
  component: string;
  userAction: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface TooltipProps {
  content: string | HelpContent;
  trigger: 'hover' | 'click' | 'focus' | 'auto';
  position: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  delay?: number;
  persistent?: boolean;
  interactive?: boolean;
  children: React.ReactNode;
}

class ContextualHelpSystem {
  private userBehavior: UserBehavior;
  private helpContent: Map<string, HelpContent> = new Map();
  private behaviorTracking: HelpContext[] = [];
  private onboardingState: Record<string, boolean> = {};
  private helpPreferences: {
    enabled: boolean;
    smartSuggestions: boolean;
    autoShow: boolean;
    complexity: 'beginner' | 'intermediate' | 'advanced';
    format: 'text' | 'video' | 'interactive';
  };

  constructor() {
    this.userBehavior = {
      pageVisits: {},
      helpRequests: {},
      taskCompletions: {},
      strugglingAreas: [],
      experienceLevel: 'beginner',
      preferredHelpFormat: 'text'
    };

    this.helpPreferences = {
      enabled: true,
      smartSuggestions: true,
      autoShow: true,
      complexity: 'beginner',
      format: 'text'
    };

    this.loadUserData();
    this.initializeHelpContent();
    this.startBehaviorTracking();
  }

  private loadUserData(): void {
    const stored = localStorage.getItem('castmatch-help-behavior');
    if (stored) {
      this.userBehavior = { ...this.userBehavior, ...JSON.parse(stored) };
    }

    const preferences = localStorage.getItem('castmatch-help-preferences');
    if (preferences) {
      this.helpPreferences = { ...this.helpPreferences, ...JSON.parse(preferences) };
    }

    const onboarding = localStorage.getItem('castmatch-onboarding');
    if (onboarding) {
      this.onboardingState = JSON.parse(onboarding);
    }
  }

  private saveUserData(): void {
    localStorage.setItem('castmatch-help-behavior', JSON.stringify(this.userBehavior));
    localStorage.setItem('castmatch-help-preferences', JSON.stringify(this.helpPreferences));
    localStorage.setItem('castmatch-onboarding', JSON.stringify(this.onboardingState));
  }

  private initializeHelpContent(): void {
    const content: HelpContent[] = [
      // CASTING DIRECTOR HELP
      {
        id: 'create-audition',
        title: 'Creating Your First Audition',
        description: 'Learn how to create and manage casting calls effectively',
        steps: [
          'Click the "New Audition" button',
          'Fill in project details and requirements',
          'Set audition parameters and dates',
          'Review and publish your casting call'
        ],
        videoUrl: '/help/videos/create-audition.mp4',
        priority: 'high',
        userRole: 'casting_director',
        complexity: 'beginner'
      },
      {
        id: 'talent-search',
        title: 'Finding the Perfect Talent',
        description: 'Advanced techniques for discovering and filtering talent',
        steps: [
          'Use smart filters to narrow down candidates',
          'Save search criteria for future use',
          'Review talent portfolios and reels',
          'Create shortlists for comparison'
        ],
        priority: 'high',
        userRole: 'casting_director',
        complexity: 'intermediate'
      },
      {
        id: 'shortlist-management',
        title: 'Managing Your Talent Shortlists',
        description: 'Organize and compare your selected candidates',
        steps: [
          'Add talent to shortlists with one swipe',
          'Create multiple lists for different roles',
          'Compare candidates side-by-side',
          'Share shortlists with your team'
        ],
        priority: 'medium',
        userRole: 'casting_director',
        complexity: 'beginner'
      },

      // TALENT HELP
      {
        id: 'complete-profile',
        title: 'Creating a Standout Profile',
        description: 'Build a compelling profile that gets you noticed',
        steps: [
          'Upload high-quality headshots',
          'Add your performance reel',
          'List your skills and experience',
          'Write an engaging bio',
          'Keep your availability updated'
        ],
        videoUrl: '/help/videos/profile-creation.mp4',
        priority: 'high',
        userRole: 'talent',
        complexity: 'beginner'
      },
      {
        id: 'audition-response',
        title: 'Responding to Casting Calls',
        description: 'How to submit compelling audition responses',
        steps: [
          'Read the brief carefully',
          'Prepare your audition materials',
          'Record or upload your response',
          'Submit before the deadline',
          'Follow up professionally'
        ],
        priority: 'high',
        userRole: 'talent',
        complexity: 'beginner'
      },
      {
        id: 'portfolio-management',
        title: 'Managing Your Portfolio',
        description: 'Keep your work samples current and impressive',
        steps: [
          'Organize media by category',
          'Update regularly with new work',
          'Optimize for mobile viewing',
          'Add context and descriptions'
        ],
        priority: 'medium',
        userRole: 'talent',
        complexity: 'intermediate'
      },

      // GENERAL FEATURES
      {
        id: 'chat-system',
        title: 'Professional Communication',
        description: 'Best practices for messaging on the platform',
        steps: [
          'Keep messages professional and concise',
          'Respond promptly to inquiries',
          'Use attachments for additional materials',
          'Schedule meetings through integrated calendar'
        ],
        priority: 'medium',
        userRole: 'both',
        complexity: 'beginner'
      },
      {
        id: 'mobile-gestures',
        title: 'Mobile Navigation Gestures',
        description: 'Speed up your workflow with touch gestures',
        steps: [
          'Swipe right on talent cards to shortlist',
          'Swipe left to pass',
          'Long press for quick actions menu',
          'Pinch to zoom on photos and videos',
          'Pull down to refresh content'
        ],
        priority: 'low',
        userRole: 'both',
        complexity: 'beginner'
      },
      {
        id: 'keyboard-shortcuts',
        title: 'Keyboard Shortcuts',
        description: 'Work faster with keyboard navigation',
        steps: [
          'Ctrl/Cmd + K for global search',
          'S to shortlist current talent',
          'P to pass on talent',
          'C to start conversation',
          'V to view full profile'
        ],
        priority: 'low',
        userRole: 'both',
        complexity: 'intermediate'
      },
      {
        id: 'ai-matching',
        title: 'Understanding AI Recommendations',
        description: 'How our smart matching system works',
        steps: [
          'AI analyzes your preferences over time',
          'Matches are scored by compatibility',
          'Provide feedback to improve suggestions',
          'Use filters to refine AI recommendations'
        ],
        priority: 'medium',
        userRole: 'casting_director',
        complexity: 'advanced'
      }
    ];

    content.forEach(item => this.helpContent.set(item.id, item));
  }

  private startBehaviorTracking(): void {
    // Track page visits
    let currentPage = window.location.pathname;
    this.trackPageVisit(currentPage);

    // Listen for navigation changes
    window.addEventListener('popstate', () => {
      const newPage = window.location.pathname;
      if (newPage !== currentPage) {
        this.trackPageVisit(newPage);
        currentPage = newPage;
      }
    });

    // Track user interactions
    document.addEventListener('click', this.trackInteraction.bind(this));
    document.addEventListener('focus', this.trackInteraction.bind(this), true);

    // Track struggling behavior
    this.detectStruggling();
  }

  private trackPageVisit(page: string): void {
    this.userBehavior.pageVisits[page] = (this.userBehavior.pageVisits[page] || 0) + 1;
    this.saveUserData();
  }

  private trackInteraction(event: Event): void {
    const target = event.target as HTMLElement;
    const context: HelpContext = {
      page: window.location.pathname,
      component: target.getAttribute('data-component') || target.tagName.toLowerCase(),
      userAction: event.type,
      timestamp: Date.now(),
      metadata: {
        className: target.className,
        id: target.id
      }
    };

    this.behaviorTracking.push(context);

    // Keep tracking history manageable
    if (this.behaviorTracking.length > 1000) {
      this.behaviorTracking = this.behaviorTracking.slice(-500);
    }

    // Analyze for help suggestions
    this.analyzeForHelpSuggestions();
  }

  private detectStruggling(): void {
    setInterval(() => {
      const recentActivity = this.behaviorTracking.slice(-50);
      const now = Date.now();
      const fiveMinutesAgo = now - 5 * 60 * 1000;

      // Look for signs of struggling
      const recentClicks = recentActivity.filter(
        activity => activity.userAction === 'click' && activity.timestamp > fiveMinutesAgo
      );

      const rapidClicks = recentClicks.filter((click, index, arr) => {
        if (index === 0) return false;
        return click.timestamp - arr[index - 1].timestamp < 1000; // Less than 1 second apart
      });

      const backAndForth = this.detectBackAndForthNavigation(recentActivity);
      const repeatedActions = this.detectRepeatedActions(recentActivity);

      if (rapidClicks.length > 5 || backAndForth || repeatedActions) {
        this.suggestHelp('struggling-detected');
      }
    }, 30000); // Check every 30 seconds
  }

  private detectBackAndForthNavigation(activities: HelpContext[]): boolean {
    const pages = activities
      .filter(a => a.userAction === 'navigation')
      .slice(-10)
      .map(a => a.page);

    let backAndForthCount = 0;
    for (let i = 2; i < pages.length; i++) {
      if (pages[i] === pages[i - 2] && pages[i] !== pages[i - 1]) {
        backAndForthCount++;
      }
    }

    return backAndForthCount >= 2;
  }

  private detectRepeatedActions(activities: HelpContext[]): boolean {
    const recentActions = activities.slice(-20);
    const actionCounts: Record<string, number> = {};

    recentActions.forEach(activity => {
      const key = `${activity.component}-${activity.userAction}`;
      actionCounts[key] = (actionCounts[key] || 0) + 1;
    });

    return Object.values(actionCounts).some(count => count >= 5);
  }

  private analyzeForHelpSuggestions(): void {
    if (!this.helpPreferences.smartSuggestions) return;

    const currentPage = window.location.pathname;
    const pageVisitCount = this.userBehavior.pageVisits[currentPage] || 0;
    
    // Suggest help for new pages after a few visits
    if (pageVisitCount === 3) {
      this.suggestPageSpecificHelp(currentPage);
    }

    // Check if user has completed key tasks
    this.checkTaskCompletion();
  }

  private suggestPageSpecificHelp(page: string): void {
    const helpSuggestions: Record<string, string> = {
      '/auditions/create': 'create-audition',
      '/talent/search': 'talent-search',
      '/shortlists': 'shortlist-management',
      '/profile': 'complete-profile',
      '/auditions': 'audition-response'
    };

    const suggestionId = helpSuggestions[page];
    if (suggestionId && this.helpContent.has(suggestionId)) {
      this.showHelpSuggestion(suggestionId);
    }
  }

  private checkTaskCompletion(): void {
    // Define critical tasks and check completion
    const tasks = {
      'profile-completion': () => document.querySelector('[data-profile-complete="true"]'),
      'first-audition': () => document.querySelector('[data-audition-created="true"]'),
      'talent-shortlisted': () => document.querySelector('[data-talent-shortlisted="true"]')
    };

    Object.entries(tasks).forEach(([taskId, checkFn]) => {
      if (!this.userBehavior.taskCompletions[taskId] && checkFn()) {
        this.userBehavior.taskCompletions[taskId] = true;
        this.trackTaskCompletion(taskId);
      }
    });
  }

  private trackTaskCompletion(taskId: string): void {
    this.userBehavior.taskCompletions[taskId] = true;
    this.saveUserData();

    // Update experience level based on completed tasks
    const completedTasks = Object.keys(this.userBehavior.taskCompletions).length;
    if (completedTasks >= 10) {
      this.userBehavior.experienceLevel = 'advanced';
    } else if (completedTasks >= 5) {
      this.userBehavior.experienceLevel = 'intermediate';
    }
  }

  private suggestHelp(reason: string): void {
    if (!this.helpPreferences.autoShow) return;

    document.dispatchEvent(new CustomEvent('castmatch:help-suggestion', {
      detail: { reason, timestamp: Date.now() }
    }));
  }

  private showHelpSuggestion(contentId: string): void {
    const content = this.helpContent.get(contentId);
    if (!content) return;

    document.dispatchEvent(new CustomEvent('castmatch:show-help-suggestion', {
      detail: { content, timestamp: Date.now() }
    }));
  }

  // PUBLIC API
  public getHelpContent(id: string): HelpContent | undefined {
    return this.helpContent.get(id);
  }

  public getRecommendedHelp(): HelpContent[] {
    const userRole = this.getUserRole();
    const complexity = this.userBehavior.experienceLevel;
    
    return Array.from(this.helpContent.values())
      .filter(content => 
        (content.userRole === 'both' || content.userRole === userRole) &&
        content.complexity <= complexity
      )
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
      .slice(0, 5);
  }

  public searchHelp(query: string): HelpContent[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.helpContent.values())
      .filter(content =>
        content.title.toLowerCase().includes(lowerQuery) ||
        content.description.toLowerCase().includes(lowerQuery) ||
        content.steps?.some(step => step.toLowerCase().includes(lowerQuery))
      )
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
  }

  public trackHelpRequest(contentId: string): void {
    this.userBehavior.helpRequests[contentId] = (this.userBehavior.helpRequests[contentId] || 0) + 1;
    this.saveUserData();
  }

  public updatePreferences(preferences: Partial<typeof this.helpPreferences>): void {
    this.helpPreferences = { ...this.helpPreferences, ...preferences };
    this.saveUserData();
  }

  public startOnboarding(flow: string): void {
    this.onboardingState[flow] = false;
    document.dispatchEvent(new CustomEvent('castmatch:start-onboarding', {
      detail: { flow }
    }));
  }

  public completeOnboarding(flow: string): void {
    this.onboardingState[flow] = true;
    this.saveUserData();
  }

  public shouldShowOnboarding(flow: string): boolean {
    return this.onboardingState[flow] !== true;
  }

  private getUserRole(): 'talent' | 'casting_director' {
    // This would typically come from user authentication/profile
    return (document.body.getAttribute('data-user-role') as 'talent' | 'casting_director') || 'talent';
  }

  public getUserBehavior(): UserBehavior {
    return { ...this.userBehavior };
  }

  public getPreferences(): typeof this.helpPreferences {
    return { ...this.helpPreferences };
  }
}

// REACT COMPONENTS

export const SmartTooltip: React.FC<TooltipProps> = ({
  content,
  trigger = 'hover',
  position = 'auto',
  delay = 300,
  persistent = false,
  interactive = false,
  children
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState(position);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const showTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  }, [delay]);

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (!persistent) {
      setIsVisible(false);
    }
  }, [persistent]);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current || position !== 'auto') return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    let newPosition = 'top';
    
    // Check if tooltip fits above
    if (triggerRect.top - tooltipRect.height < 0) {
      newPosition = 'bottom';
    }
    
    // Check if tooltip fits below
    if (triggerRect.bottom + tooltipRect.height > viewport.height) {
      newPosition = 'top';
    }

    // Check horizontal constraints
    if (triggerRect.left - tooltipRect.width < 0) {
      newPosition = 'right';
    }
    
    if (triggerRect.right + tooltipRect.width > viewport.width) {
      newPosition = 'left';
    }

    setTooltipPosition(newPosition as any);
  }, [position]);

  useEffect(() => {
    if (isVisible) {
      calculatePosition();
    }
  }, [isVisible, calculatePosition]);

  const eventHandlers = {
    hover: {
      onMouseEnter: showTooltip,
      onMouseLeave: hideTooltip
    },
    focus: {
      onFocus: showTooltip,
      onBlur: hideTooltip
    },
    click: {
      onClick: () => setIsVisible(!isVisible)
    }
  };

  const tooltipContent = typeof content === 'string' ? { title: content, description: '' } : content;

  return (
    <>
      <div 
        ref={triggerRef}
        {...eventHandlers[trigger]}
        className="relative inline-block"
      >
        {children}
      </div>
      
      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`fixed z-50 max-w-xs p-3 text-sm bg-gray-900 text-white rounded-lg shadow-lg ${
              interactive ? 'cursor-pointer' : 'pointer-events-none'
            }`}
            style={{
              top: tooltipPosition === 'bottom' ? triggerRef.current?.getBoundingClientRect().bottom! + 8 : 
                   tooltipPosition === 'top' ? triggerRef.current?.getBoundingClientRect().top! - 8 : undefined,
              left: tooltipPosition === 'right' ? triggerRef.current?.getBoundingClientRect().right! + 8 :
                    tooltipPosition === 'left' ? triggerRef.current?.getBoundingClientRect().left! - 8 : undefined,
              transform: tooltipPosition === 'top' ? 'translateY(-100%)' :
                        tooltipPosition === 'left' ? 'translateX(-100%)' : undefined
            }}
            onMouseEnter={interactive ? showTooltip : undefined}
            onMouseLeave={interactive ? hideTooltip : undefined}
          >
            <div className="font-medium mb-1">{tooltipContent.title}</div>
            {tooltipContent.description && (
              <div className="text-gray-300 text-xs">{tooltipContent.description}</div>
            )}
            
            {/* Arrow */}
            <div 
              className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${
                tooltipPosition === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' :
                tooltipPosition === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2' :
                tooltipPosition === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2' :
                'left-[-4px] top-1/2 -translate-y-1/2'
              }`}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export const HelpSuggestionPanel: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState<HelpContent | null>(null);

  useEffect(() => {
    const handleSuggestion = (event: CustomEvent) => {
      setCurrentSuggestion(event.detail.content);
      setIsVisible(true);
    };

    document.addEventListener('castmatch:show-help-suggestion', handleSuggestion as any);
    
    return () => {
      document.removeEventListener('castmatch:show-help-suggestion', handleSuggestion as any);
    };
  }, []);

  if (!currentSuggestion) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 right-4 max-w-sm bg-blue-50 border border-blue-200 rounded-lg shadow-lg p-4 z-50"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-2">
                  <span className="text-white text-xs font-bold">?</span>
                </div>
                <h3 className="text-sm font-medium text-blue-900">Need help?</h3>
              </div>
              <p className="text-xs text-blue-700 mb-3">{currentSuggestion.description}</p>
              <div className="flex space-x-2">
                <button 
                  className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                  onClick={() => {
                    helpSystem.trackHelpRequest(currentSuggestion.id);
                    document.dispatchEvent(new CustomEvent('castmatch:show-help-detail', {
                      detail: { content: currentSuggestion }
                    }));
                    setIsVisible(false);
                  }}
                >
                  Show Help
                </button>
                <button 
                  className="px-3 py-1 text-blue-500 text-xs hover:text-blue-700"
                  onClick={() => setIsVisible(false)}
                >
                  Dismiss
                </button>
              </div>
            </div>
            <button 
              className="text-blue-400 hover:text-blue-600 ml-2"
              onClick={() => setIsVisible(false)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const FloatingHelpButton: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="mb-4 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-64"
          >
            <h3 className="font-medium text-gray-900 mb-3">Quick Help</h3>
            <div className="space-y-2">
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                Keyboard Shortcuts
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                Getting Started Guide  
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                Contact Support
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </motion.button>
    </div>
  );
};

// Export singleton instance
export const helpSystem = new ContextualHelpSystem();

// Export React hook
export function useContextualHelp() {
  const [recommendations, setRecommendations] = useState<HelpContent[]>([]);
  
  useEffect(() => {
    setRecommendations(helpSystem.getRecommendedHelp());
  }, []);

  return {
    helpSystem,
    recommendations,
    getHelpContent: (id: string) => helpSystem.getHelpContent(id),
    searchHelp: (query: string) => helpSystem.searchHelp(query),
    trackHelpRequest: (id: string) => helpSystem.trackHelpRequest(id),
    updatePreferences: (prefs: any) => helpSystem.updatePreferences(prefs),
    userBehavior: helpSystem.getUserBehavior(),
    preferences: helpSystem.getPreferences()
  };
}