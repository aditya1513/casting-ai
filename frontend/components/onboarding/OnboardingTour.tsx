'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { InteractiveTooltip } from './InteractiveTooltip';
import { 
  TourConfig, 
  getTourByRole, 
  getAvailableTours,
  UserRole 
} from '@/lib/onboarding/tour-config';
import { tourProgressManager } from '@/lib/onboarding/tour-progress';
import { Sparkles, Play, X } from 'lucide-react';

interface OnboardingTourProps {
  userId: string;
  userRole: UserRole | UserRole[];
  onComplete?: () => void;
  autoStart?: boolean;
  showWelcomeModal?: boolean;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  userId,
  userRole,
  onComplete,
  autoStart = false,
  showWelcomeModal = true
}) => {
  const [isActive, setIsActive] = useState(false);
  const [currentTour, setCurrentTour] = useState<TourConfig | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);
  const [stepStartTime, setStepStartTime] = useState(Date.now());
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    // Detect device type
    const width = window.innerWidth;
    if (width < 768) {
      setDeviceType('mobile');
    } else if (width < 1024) {
      setDeviceType('tablet');
    } else {
      setDeviceType('desktop');
    }

    // Get available tours
    const roles = Array.isArray(userRole) ? userRole : [userRole];
    const availableTours = getAvailableTours(roles);
    
    // Check if we should show a tour
    const recommendedTour = tourProgressManager.getRecommendedTour(userId, availableTours);
    
    if (recommendedTour) {
      // Check for existing progress
      const existingProgress = tourProgressManager.loadProgress(userId, recommendedTour.id);
      
      if (existingProgress && !existingProgress.completedAt && !existingProgress.skippedAt) {
        // Resume existing tour
        setCurrentTour(recommendedTour);
        setCurrentStepIndex(existingProgress.currentStepIndex);
        
        if (autoStart) {
          setTimeout(() => {
            setShowWelcome(true);
          }, 1000);
        }
      } else if (tourProgressManager.shouldShowTour(userId, recommendedTour.id)) {
        // Start new tour
        setCurrentTour(recommendedTour);
        
        if (autoStart) {
          setTimeout(() => {
            setShowWelcome(true);
          }, 1000);
        }
      }
    }

    // Listen for tour completion events
    const handleTourComplete = (event: CustomEvent) => {
      if (event.detail.userId === userId) {
        celebrateCompletion();
      }
    };

    window.addEventListener('tour-completed' as any, handleTourComplete);
    
    return () => {
      window.removeEventListener('tour-completed' as any, handleTourComplete);
    };
  }, [userId, userRole, autoStart]);

  const startTour = useCallback(() => {
    if (!currentTour) return;
    
    setShowWelcome(false);
    setIsActive(true);
    setStepStartTime(Date.now());
    
    // Initialize or resume progress
    const existingProgress = tourProgressManager.loadProgress(userId, currentTour.id);
    if (!existingProgress) {
      tourProgressManager.startTour(currentTour, userId, deviceType);
    } else {
      const resumeData = tourProgressManager.resumeTour();
      // Apply resume data if needed
      if (resumeData?.scrollPosition) {
        window.scrollTo(0, resumeData.scrollPosition);
      }
    }
  }, [currentTour, userId, deviceType]);

  const handleNext = useCallback(() => {
    if (!currentTour) return;
    
    const timeSpent = (Date.now() - stepStartTime) / 1000;
    const currentStep = currentTour.steps[currentStepIndex];
    
    tourProgressManager.nextStep(currentStep.id, timeSpent);
    
    if (currentStepIndex < currentTour.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
      setStepStartTime(Date.now());
      
      // Handle step actions
      const nextStep = currentTour.steps[currentStepIndex + 1];
      if (nextStep.action) {
        performStepAction(nextStep.action);
      }
    } else {
      // Tour completed
      completeTour();
    }
  }, [currentTour, currentStepIndex, stepStartTime]);

  const handlePrevious = useCallback(() => {
    if (currentStepIndex > 0) {
      tourProgressManager.previousStep();
      setCurrentStepIndex(prev => prev - 1);
      setStepStartTime(Date.now());
    }
  }, [currentStepIndex]);

  const handleSkip = useCallback(() => {
    tourProgressManager.skipTour();
    setIsActive(false);
    setShowWelcome(false);
    
    // Show feedback
    showSkipFeedback();
  }, []);

  const handleClose = useCallback(() => {
    // Save current state for resume
    tourProgressManager.pauseTour({
      scrollPosition: window.scrollY,
      lastAction: 'closed'
    });
    setIsActive(false);
  }, []);

  const completeTour = () => {
    if (!currentTour) return;
    
    tourProgressManager.completeTour();
    setIsActive(false);
    celebrateCompletion();
    
    if (onComplete) {
      onComplete();
    }
    
    // Check for next tour
    setTimeout(() => {
      checkForNextTour();
    }, 3000);
  };

  const checkForNextTour = () => {
    const roles = Array.isArray(userRole) ? userRole : [userRole];
    const availableTours = getAvailableTours(roles);
    const nextTour = tourProgressManager.getRecommendedTour(userId, availableTours);
    
    if (nextTour && nextTour.id !== currentTour?.id) {
      setCurrentTour(nextTour);
      setCurrentStepIndex(0);
      setShowWelcome(true);
    }
  };

  const performStepAction = (action: NonNullable<TourConfig['steps'][0]['action']>) => {
    switch (action.type) {
      case 'navigate':
        if (action.value) {
          window.location.href = action.value;
        }
        break;
      case 'click':
        if (action.value) {
          const element = document.querySelector(action.value) as HTMLElement;
          element?.click();
        }
        break;
      case 'scroll':
        if (action.value) {
          const element = document.querySelector(action.value);
          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        break;
      case 'input':
        // Handle input action if needed
        break;
    }
  };

  const celebrateCompletion = () => {
    // Create confetti effect
    const confetti = document.createElement('div');
    confetti.className = 'confetti-container';
    confetti.innerHTML = `
      <div class="confetti-celebration">
        🎉 Tour Completed! 🎉
      </div>
    `;
    document.body.appendChild(confetti);
    
    setTimeout(() => {
      confetti.remove();
    }, 3000);
  };

  const showSkipFeedback = () => {
    const feedback = document.createElement('div');
    feedback.className = 'skip-feedback';
    feedback.textContent = 'You can restart the tour anytime from the help menu';
    document.body.appendChild(feedback);
    
    setTimeout(() => {
      feedback.remove();
    }, 3000);
  };

  if (!currentTour) return null;

  const currentStep = currentTour.steps[currentStepIndex];

  return (
    <>
      {/* Welcome Modal */}
      <AnimatePresence>
        {showWelcome && showWelcomeModal && (
          <motion.div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowWelcome(false)}
            />
            
            <motion.div
              className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <button
                onClick={() => setShowWelcome(false)}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                
                <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                  {currentTour.name}
                </h2>
                
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  {currentTour.description}
                </p>
                
                <div className="flex items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-8">
                  <span>⏱ {currentTour.estimatedTime} min</span>
                  <span>•</span>
                  <span>📍 {currentTour.steps.length} steps</span>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowWelcome(false)}
                    className="flex-1 px-4 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Maybe Later
                  </button>
                  
                  <motion.button
                    onClick={startTour}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Play className="w-4 h-4" />
                    Start Tour
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tour Tooltip */}
      {isActive && (
        <InteractiveTooltip
          step={currentStep}
          currentStepIndex={currentStepIndex}
          totalSteps={currentTour.steps.length}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onSkip={handleSkip}
          onClose={handleClose}
        />
      )}

      {/* Floating Tour Button (when tour is available but not active) */}
      {!isActive && !showWelcome && currentTour && (
        <motion.button
          onClick={() => setShowWelcome(true)}
          className="fixed bottom-6 right-6 z-[9990] px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-full shadow-lg flex items-center gap-2"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1, type: 'spring', stiffness: 400, damping: 25 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Sparkles className="w-5 h-5" />
          <span className="font-medium">Take a Tour</span>
        </motion.button>
      )}

      {/* Global Styles */}
      <style jsx global>{`
        .confetti-container {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 10001;
          pointer-events: none;
        }
        
        .confetti-celebration {
          font-size: 3rem;
          animation: celebrate 3s ease-out forwards;
        }
        
        @keyframes celebrate {
          0% {
            transform: scale(0) rotate(0deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.2) rotate(360deg);
            opacity: 1;
          }
          100% {
            transform: scale(1) rotate(720deg);
            opacity: 0;
          }
        }
        
        .skip-feedback {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: #1f2937;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          z-index: 10000;
          animation: slideUp 0.3s ease-out;
        }
        
        @keyframes slideUp {
          from {
            transform: translateX(-50%) translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
};