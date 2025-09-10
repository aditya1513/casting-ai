/**
 * Custom hook for managing onboarding tours
 */

import { useState, useEffect, useCallback } from 'react';
import { UserRole, TourConfig, getAvailableTours } from '@/lib/onboarding/tour-config';
import { tourProgressManager, TourProgress } from '@/lib/onboarding/tour-progress';

interface UseOnboardingTourOptions {
  userId: string;
  userRole: UserRole | UserRole[];
  autoStart?: boolean;
  delay?: number;
}

interface UseOnboardingTourReturn {
  // Tour state
  currentTour: TourConfig | null;
  isActive: boolean;
  currentStepIndex: number;
  progress: TourProgress | null;
  
  // Tour controls
  startTour: () => void;
  pauseTour: () => void;
  resumeTour: () => void;
  skipTour: () => void;
  nextStep: () => void;
  previousStep: () => void;
  restartTour: () => void;
  
  // Tour info
  availableTours: TourConfig[];
  hasCompletedTour: (tourId: string) => boolean;
  getCompletionRate: () => number;
  shouldShowTour: boolean;
  
  // Analytics
  analytics: {
    totalTimeSpent: number;
    completedSteps: number;
    totalSteps: number;
    completionPercentage: number;
  };
}

export const useOnboardingTour = ({
  userId,
  userRole,
  autoStart = false,
  delay = 1000
}: UseOnboardingTourOptions): UseOnboardingTourReturn => {
  const [currentTour, setCurrentTour] = useState<TourConfig | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState<TourProgress | null>(null);
  const [availableTours, setAvailableTours] = useState<TourConfig[]>([]);
  const [shouldShowTour, setShouldShowTour] = useState(false);
  const [stepStartTime, setStepStartTime] = useState(Date.now());

  // Initialize tours
  useEffect(() => {
    const roles = Array.isArray(userRole) ? userRole : [userRole];
    const tours = getAvailableTours(roles);
    setAvailableTours(tours);
    
    // Find recommended tour
    const recommendedTour = tourProgressManager.getRecommendedTour(userId, tours);
    
    if (recommendedTour) {
      setCurrentTour(recommendedTour);
      
      // Load existing progress
      const existingProgress = tourProgressManager.loadProgress(userId, recommendedTour.id);
      if (existingProgress) {
        setProgress(existingProgress);
        setCurrentStepIndex(existingProgress.currentStepIndex);
      }
      
      // Check if should show
      const shouldShow = tourProgressManager.shouldShowTour(userId, recommendedTour.id);
      setShouldShowTour(shouldShow);
      
      // Auto-start if configured
      if (autoStart && shouldShow && delay > 0) {
        const timer = setTimeout(() => {
          startTour();
        }, delay);
        
        return () => clearTimeout(timer);
      }
    }
  }, [userId, userRole]);

  // Start tour
  const startTour = useCallback(() => {
    if (!currentTour) return;
    
    const deviceType = window.innerWidth < 768 ? 'mobile' : 
                      window.innerWidth < 1024 ? 'tablet' : 'desktop';
    
    const newProgress = tourProgressManager.startTour(currentTour, userId, deviceType);
    setProgress(newProgress);
    setIsActive(true);
    setCurrentStepIndex(0);
    setStepStartTime(Date.now());
  }, [currentTour, userId]);

  // Pause tour
  const pauseTour = useCallback(() => {
    if (!isActive) return;
    
    tourProgressManager.pauseTour({
      scrollPosition: window.scrollY,
      formData: collectFormData(),
      lastAction: 'paused'
    });
    
    setIsActive(false);
  }, [isActive]);

  // Resume tour
  const resumeTour = useCallback(() => {
    if (!currentTour || isActive) return;
    
    const resumeData = tourProgressManager.resumeTour();
    setIsActive(true);
    setStepStartTime(Date.now());
    
    // Apply resume data
    if (resumeData) {
      if (resumeData.scrollPosition !== undefined) {
        window.scrollTo(0, resumeData.scrollPosition);
      }
      if (resumeData.formData) {
        applyFormData(resumeData.formData);
      }
    }
  }, [currentTour, isActive]);

  // Skip tour
  const skipTour = useCallback(() => {
    tourProgressManager.skipTour();
    setIsActive(false);
    setShouldShowTour(false);
  }, []);

  // Next step
  const nextStep = useCallback(() => {
    if (!currentTour || !isActive) return;
    
    const timeSpent = (Date.now() - stepStartTime) / 1000;
    const currentStep = currentTour.steps[currentStepIndex];
    
    tourProgressManager.nextStep(currentStep.id, timeSpent);
    
    if (currentStepIndex < currentTour.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
      setStepStartTime(Date.now());
    } else {
      // Tour completed
      tourProgressManager.completeTour();
      setIsActive(false);
      setShouldShowTour(false);
    }
    
    // Update progress
    const updatedProgress = tourProgressManager.loadProgress(userId, currentTour.id);
    setProgress(updatedProgress);
  }, [currentTour, isActive, currentStepIndex, stepStartTime, userId]);

  // Previous step
  const previousStep = useCallback(() => {
    if (!isActive || currentStepIndex === 0) return;
    
    tourProgressManager.previousStep();
    setCurrentStepIndex(prev => prev - 1);
    setStepStartTime(Date.now());
    
    // Update progress
    if (currentTour) {
      const updatedProgress = tourProgressManager.loadProgress(userId, currentTour.id);
      setProgress(updatedProgress);
    }
  }, [isActive, currentStepIndex, currentTour, userId]);

  // Restart tour
  const restartTour = useCallback(() => {
    if (!currentTour) return;
    
    // Clear existing progress
    localStorage.removeItem(`castmatch_tour_progress_${userId}_${currentTour.id}`);
    
    // Start fresh
    startTour();
  }, [currentTour, userId, startTour]);

  // Check if tour is completed
  const hasCompletedTour = useCallback((tourId: string): boolean => {
    const tourProgress = tourProgressManager.loadProgress(userId, tourId);
    return !!tourProgress?.completedAt;
  }, [userId]);

  // Get completion rate
  const getCompletionRate = useCallback((): number => {
    if (!progress) return 0;
    return tourProgressManager.getCompletionPercentage();
  }, [progress]);

  // Collect form data helper
  const collectFormData = (): Record<string, any> => {
    const formData: Record<string, any> = {};
    document.querySelectorAll('input, textarea, select').forEach((element) => {
      const input = element as HTMLInputElement;
      if (input.name && input.value) {
        formData[input.name] = input.value;
      }
    });
    return formData;
  };

  // Apply form data helper
  const applyFormData = (formData: Record<string, any>) => {
    Object.entries(formData).forEach(([name, value]) => {
      const element = document.querySelector(`[name="${name}"]`) as HTMLInputElement;
      if (element) {
        element.value = value;
      }
    });
  };

  // Calculate analytics
  const analytics = {
    totalTimeSpent: progress?.totalTimeSpent || 0,
    completedSteps: progress?.completedSteps.length || 0,
    totalSteps: currentTour?.steps.length || 0,
    completionPercentage: getCompletionRate()
  };

  return {
    // Tour state
    currentTour,
    isActive,
    currentStepIndex,
    progress,
    
    // Tour controls
    startTour,
    pauseTour,
    resumeTour,
    skipTour,
    nextStep,
    previousStep,
    restartTour,
    
    // Tour info
    availableTours,
    hasCompletedTour,
    getCompletionRate,
    shouldShowTour,
    
    // Analytics
    analytics
  };
};