/**
 * Tour Progress Tracking System
 * Manages user progress through onboarding tours
 */

import { TourConfig, TourStep, UserRole } from './tour-config';

export interface TourProgress {
  tourId: string;
  userId: string;
  role: UserRole;
  currentStepIndex: number;
  completedSteps: string[];
  startedAt: Date;
  lastActiveAt: Date;
  completedAt?: Date;
  skippedAt?: Date;
  totalTimeSpent: number; // in seconds
  stepTimings: Record<string, number>; // time spent on each step
  interactionCount: number;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  resumeData?: {
    scrollPosition?: number;
    formData?: Record<string, any>;
    lastAction?: string;
  };
}

export interface TourAnalytics {
  tourId: string;
  completionRate: number;
  averageCompletionTime: number;
  dropOffPoints: Array<{
    stepId: string;
    dropOffRate: number;
  }>;
  mostEngagingSteps: string[];
  deviceBreakdown: Record<string, number>;
}

export class TourProgressManager {
  private static STORAGE_KEY = 'castmatch_tour_progress';
  private static ANALYTICS_KEY = 'castmatch_tour_analytics';
  private currentProgress: TourProgress | null = null;
  private saveDebounceTimer: NodeJS.Timeout | null = null;

  /**
   * Initialize progress for a new tour
   */
  startTour(tour: TourConfig, userId: string, deviceType: 'mobile' | 'tablet' | 'desktop'): TourProgress {
    const progress: TourProgress = {
      tourId: tour.id,
      userId,
      role: tour.role,
      currentStepIndex: 0,
      completedSteps: [],
      startedAt: new Date(),
      lastActiveAt: new Date(),
      totalTimeSpent: 0,
      stepTimings: {},
      interactionCount: 0,
      deviceType
    };

    this.currentProgress = progress;
    this.saveProgress();
    this.trackAnalytics('tour_started', { tourId: tour.id, role: tour.role });
    
    return progress;
  }

  /**
   * Load existing progress from storage
   */
  loadProgress(userId: string, tourId: string): TourProgress | null {
    try {
      const stored = localStorage.getItem(this.getStorageKey(userId, tourId));
      if (stored) {
        const progress = JSON.parse(stored);
        progress.startedAt = new Date(progress.startedAt);
        progress.lastActiveAt = new Date(progress.lastActiveAt);
        if (progress.completedAt) {
          progress.completedAt = new Date(progress.completedAt);
        }
        if (progress.skippedAt) {
          progress.skippedAt = new Date(progress.skippedAt);
        }
        this.currentProgress = progress;
        return progress;
      }
    } catch (error) {
      console.error('Failed to load tour progress:', error);
    }
    return null;
  }

  /**
   * Update progress when moving to next step
   */
  nextStep(stepId: string, timeSpent: number): void {
    if (!this.currentProgress) return;

    // Record time spent on current step
    this.currentProgress.stepTimings[stepId] = timeSpent;
    this.currentProgress.totalTimeSpent += timeSpent;
    
    // Mark step as completed
    if (!this.currentProgress.completedSteps.includes(stepId)) {
      this.currentProgress.completedSteps.push(stepId);
    }
    
    // Move to next step
    this.currentProgress.currentStepIndex++;
    this.currentProgress.lastActiveAt = new Date();
    this.currentProgress.interactionCount++;
    
    this.debouncedSave();
    this.trackAnalytics('step_completed', { 
      stepId, 
      timeSpent, 
      stepIndex: this.currentProgress.currentStepIndex 
    });
  }

  /**
   * Go back to previous step
   */
  previousStep(): void {
    if (!this.currentProgress || this.currentProgress.currentStepIndex === 0) return;
    
    this.currentProgress.currentStepIndex--;
    this.currentProgress.lastActiveAt = new Date();
    this.debouncedSave();
    this.trackAnalytics('step_back', { 
      stepIndex: this.currentProgress.currentStepIndex 
    });
  }

  /**
   * Skip the current tour
   */
  skipTour(): void {
    if (!this.currentProgress) return;
    
    this.currentProgress.skippedAt = new Date();
    this.saveProgress();
    this.trackAnalytics('tour_skipped', { 
      stepIndex: this.currentProgress.currentStepIndex,
      completionPercentage: this.getCompletionPercentage()
    });
  }

  /**
   * Complete the tour
   */
  completeTour(): void {
    if (!this.currentProgress) return;
    
    this.currentProgress.completedAt = new Date();
    this.saveProgress();
    this.trackAnalytics('tour_completed', { 
      totalTimeSpent: this.currentProgress.totalTimeSpent,
      interactionCount: this.currentProgress.interactionCount
    });
    
    // Award completion reward
    this.awardCompletionReward();
  }

  /**
   * Pause tour and save resume data
   */
  pauseTour(resumeData?: TourProgress['resumeData']): void {
    if (!this.currentProgress) return;
    
    this.currentProgress.resumeData = resumeData;
    this.currentProgress.lastActiveAt = new Date();
    this.saveProgress();
    this.trackAnalytics('tour_paused', { 
      stepIndex: this.currentProgress.currentStepIndex,
      hasResumeData: !!resumeData
    });
  }

  /**
   * Resume a paused tour
   */
  resumeTour(): TourProgress['resumeData'] | undefined {
    if (!this.currentProgress) return undefined;
    
    const resumeData = this.currentProgress.resumeData;
    this.currentProgress.resumeData = undefined;
    this.currentProgress.lastActiveAt = new Date();
    this.debouncedSave();
    this.trackAnalytics('tour_resumed', { 
      stepIndex: this.currentProgress.currentStepIndex 
    });
    
    return resumeData;
  }

  /**
   * Get completion percentage
   */
  getCompletionPercentage(): number {
    if (!this.currentProgress) return 0;
    return Math.round((this.currentProgress.completedSteps.length / 
      (this.currentProgress.completedSteps.length + 1)) * 100);
  }

  /**
   * Check if tour should be shown again
   */
  shouldShowTour(userId: string, tourId: string): boolean {
    const progress = this.loadProgress(userId, tourId);
    
    if (!progress) return true; // Never started
    if (progress.completedAt) return false; // Already completed
    if (progress.skippedAt) {
      // Show again after 7 days if skipped
      const daysSinceSkip = (Date.now() - progress.skippedAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceSkip > 7;
    }
    
    // Show if incomplete and last active more than 24 hours ago
    const hoursSinceActive = (Date.now() - progress.lastActiveAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceActive > 24;
  }

  /**
   * Get recommended next tour for user
   */
  getRecommendedTour(userId: string, availableTours: TourConfig[]): TourConfig | null {
    for (const tour of availableTours) {
      if (this.shouldShowTour(userId, tour.id)) {
        return tour;
      }
    }
    return null;
  }

  /**
   * Save progress with debouncing
   */
  private debouncedSave(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    
    this.saveDebounceTimer = setTimeout(() => {
      this.saveProgress();
    }, 1000);
  }

  /**
   * Save progress to storage
   */
  private saveProgress(): void {
    if (!this.currentProgress) return;
    
    try {
      const key = this.getStorageKey(
        this.currentProgress.userId, 
        this.currentProgress.tourId
      );
      localStorage.setItem(key, JSON.stringify(this.currentProgress));
    } catch (error) {
      console.error('Failed to save tour progress:', error);
    }
  }

  /**
   * Get storage key for progress
   */
  private getStorageKey(userId: string, tourId: string): string {
    return `${TourProgressManager.STORAGE_KEY}_${userId}_${tourId}`;
  }

  /**
   * Track analytics event
   */
  private trackAnalytics(event: string, data: Record<string, any>): void {
    try {
      // Send to analytics service
      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.track(event, {
          ...data,
          tourId: this.currentProgress?.tourId,
          userId: this.currentProgress?.userId,
          timestamp: new Date().toISOString()
        });
      }
      
      // Store locally for aggregation
      this.storeLocalAnalytics(event, data);
    } catch (error) {
      console.error('Failed to track analytics:', error);
    }
  }

  /**
   * Store analytics locally
   */
  private storeLocalAnalytics(event: string, data: Record<string, any>): void {
    try {
      const stored = localStorage.getItem(TourProgressManager.ANALYTICS_KEY) || '[]';
      const analytics = JSON.parse(stored);
      analytics.push({
        event,
        data,
        timestamp: Date.now()
      });
      
      // Keep only last 1000 events
      if (analytics.length > 1000) {
        analytics.splice(0, analytics.length - 1000);
      }
      
      localStorage.setItem(TourProgressManager.ANALYTICS_KEY, JSON.stringify(analytics));
    } catch (error) {
      console.error('Failed to store local analytics:', error);
    }
  }

  /**
   * Award completion reward
   */
  private awardCompletionReward(): void {
    // This would integrate with your reward system
    if (this.currentProgress) {
      const event = new CustomEvent('tour-completed', {
        detail: {
          tourId: this.currentProgress.tourId,
          userId: this.currentProgress.userId,
          role: this.currentProgress.role
        }
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * Get tour analytics
   */
  getTourAnalytics(tourId: string): TourAnalytics {
    try {
      const stored = localStorage.getItem(TourProgressManager.ANALYTICS_KEY) || '[]';
      const events = JSON.parse(stored);
      
      // Calculate analytics from events
      const tourEvents = events.filter((e: any) => e.data.tourId === tourId);
      
      // This is a simplified version - in production, this would aggregate from a backend
      return {
        tourId,
        completionRate: this.calculateCompletionRate(tourEvents),
        averageCompletionTime: this.calculateAverageTime(tourEvents),
        dropOffPoints: this.calculateDropOffPoints(tourEvents),
        mostEngagingSteps: this.calculateEngagingSteps(tourEvents),
        deviceBreakdown: this.calculateDeviceBreakdown(tourEvents)
      };
    } catch (error) {
      console.error('Failed to get tour analytics:', error);
      return {
        tourId,
        completionRate: 0,
        averageCompletionTime: 0,
        dropOffPoints: [],
        mostEngagingSteps: [],
        deviceBreakdown: {}
      };
    }
  }

  private calculateCompletionRate(events: any[]): number {
    const starts = events.filter((e: any) => e.event === 'tour_started').length;
    const completions = events.filter((e: any) => e.event === 'tour_completed').length;
    return starts > 0 ? (completions / starts) * 100 : 0;
  }

  private calculateAverageTime(events: any[]): number {
    const completions = events.filter((e: any) => e.event === 'tour_completed');
    if (completions.length === 0) return 0;
    
    const totalTime = completions.reduce((sum: number, e: any) => 
      sum + (e.data.totalTimeSpent || 0), 0);
    return totalTime / completions.length;
  }

  private calculateDropOffPoints(events: any[]): Array<{stepId: string; dropOffRate: number}> {
    // Simplified - would need more sophisticated analysis in production
    return [];
  }

  private calculateEngagingSteps(events: any[]): string[] {
    // Simplified - would track interaction metrics
    return [];
  }

  private calculateDeviceBreakdown(events: any[]): Record<string, number> {
    // Simplified - would aggregate device types
    return {
      mobile: 40,
      tablet: 20,
      desktop: 40
    };
  }
}

// Export singleton instance
export const tourProgressManager = new TourProgressManager();