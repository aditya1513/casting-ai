'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';
import { TourStep } from '@/lib/onboarding/tour-config';

interface InteractiveTooltipProps {
  step: TourStep;
  currentStepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onClose: () => void;
}

export const InteractiveTooltip: React.FC<InteractiveTooltipProps> = ({
  step,
  currentStepIndex,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
  onClose
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [arrow, setArrow] = useState<'top' | 'bottom' | 'left' | 'right'>('top');
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if mobile
    setIsMobile(window.innerWidth < 768);
    
    // Find target element
    if (step.target === 'body') {
      // Center overlay for body target
      setPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
      });
      setTargetElement(null);
    } else {
      const element = document.querySelector(step.target) as HTMLElement;
      if (element) {
        setTargetElement(element);
        highlightElement(element);
        calculatePosition(element);
      }
    }

    // Trigger haptic feedback if available
    if (step.hapticFeedback && 'vibrate' in navigator) {
      const intensity = {
        light: [10],
        medium: [30],
        heavy: [50, 30, 50]
      };
      navigator.vibrate(intensity[step.hapticFeedback]);
    }

    return () => {
      if (targetElement) {
        removeHighlight(targetElement);
      }
    };
  }, [step, targetElement]);

  const highlightElement = (element: HTMLElement) => {
    // Add highlight overlay
    element.classList.add('tour-highlight');
    element.style.position = 'relative';
    element.style.zIndex = '9998';
    
    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'tour-backdrop';
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 9997;
      pointer-events: ${step.allowInteraction ? 'none' : 'auto'};
    `;
    document.body.appendChild(backdrop);

    // Create spotlight effect
    const rect = element.getBoundingClientRect();
    const spotlight = document.createElement('div');
    spotlight.className = 'tour-spotlight';
    spotlight.style.cssText = `
      position: fixed;
      top: ${rect.top - 8}px;
      left: ${rect.left - 8}px;
      width: ${rect.width + 16}px;
      height: ${rect.height + 16}px;
      border: 3px solid #06b6d4;
      border-radius: 8px;
      box-shadow: 0 0 0 99999px rgba(0, 0, 0, 0.7);
      z-index: 9997;
      pointer-events: none;
      animation: pulse 2s infinite;
    `;
    document.body.appendChild(spotlight);
  };

  const removeHighlight = (element: HTMLElement) => {
    element.classList.remove('tour-highlight');
    element.style.position = '';
    element.style.zIndex = '';
    
    // Remove backdrop and spotlight
    document.querySelectorAll('.tour-backdrop, .tour-spotlight').forEach(el => el.remove());
  };

  const calculatePosition = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const tooltipWidth = 380;
    const tooltipHeight = 200;
    const spacing = 16;
    
    let x = 0;
    let y = 0;
    let arrowDir: typeof arrow = 'top';

    // Mobile optimization
    if (isMobile || step.mobileOptimized) {
      // Always position at bottom on mobile
      x = window.innerWidth / 2;
      y = window.innerHeight - tooltipHeight - 20;
      arrowDir = 'bottom';
    } else {
      // Desktop positioning based on placement
      switch (step.placement) {
        case 'top':
          x = rect.left + rect.width / 2;
          y = rect.top - tooltipHeight - spacing;
          arrowDir = 'bottom';
          break;
        case 'bottom':
          x = rect.left + rect.width / 2;
          y = rect.bottom + spacing;
          arrowDir = 'top';
          break;
        case 'left':
          x = rect.left - tooltipWidth - spacing;
          y = rect.top + rect.height / 2;
          arrowDir = 'right';
          break;
        case 'right':
          x = rect.right + spacing;
          y = rect.top + rect.height / 2;
          arrowDir = 'left';
          break;
        case 'center':
          x = window.innerWidth / 2;
          y = window.innerHeight / 2;
          arrowDir = 'top';
          break;
      }

      // Boundary checks
      x = Math.max(tooltipWidth / 2, Math.min(x, window.innerWidth - tooltipWidth / 2));
      y = Math.max(20, Math.min(y, window.innerHeight - tooltipHeight - 20));
    }

    setPosition({ x, y });
    setArrow(arrowDir);
  };

  const springConfig = {
    type: 'spring',
    stiffness: 400,
    damping: 25
  };

  const tooltipVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8,
      y: 20
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        ...springConfig,
        delay: step.delay ? step.delay / 1000 : 0
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.9,
      y: -10,
      transition: {
        duration: 0.2
      }
    }
  };

  const progressPercentage = ((currentStepIndex + 1) / totalSteps) * 100;

  return (
    <AnimatePresence>
      <motion.div
        ref={tooltipRef}
        className="fixed z-[9999] pointer-events-none"
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={tooltipVariants}
        style={{
          left: step.placement === 'center' ? '50%' : position.x,
          top: step.placement === 'center' ? '50%' : position.y,
          transform: step.placement === 'center' 
            ? 'translate(-50%, -50%)' 
            : arrow === 'left' || arrow === 'right' 
              ? 'translateY(-50%)' 
              : 'translateX(-50%)'
        }}
      >
        <div className={`
          relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl 
          ${isMobile ? 'w-[calc(100vw-40px)]' : 'w-96'}
          pointer-events-auto
        `}>
          {/* Arrow */}
          {step.placement !== 'center' && (
            <div className={`
              absolute w-0 h-0 
              ${arrow === 'top' ? 'bottom-full left-1/2 -translate-x-1/2 border-l-[10px] border-r-[10px] border-b-[10px] border-transparent border-b-white dark:border-b-gray-800' : ''}
              ${arrow === 'bottom' ? 'top-full left-1/2 -translate-x-1/2 border-l-[10px] border-r-[10px] border-t-[10px] border-transparent border-t-white dark:border-t-gray-800' : ''}
              ${arrow === 'left' ? 'right-full top-1/2 -translate-y-1/2 border-t-[10px] border-b-[10px] border-r-[10px] border-transparent border-r-white dark:border-r-gray-800' : ''}
              ${arrow === 'right' ? 'left-full top-1/2 -translate-y-1/2 border-t-[10px] border-b-[10px] border-l-[10px] border-transparent border-l-white dark:border-l-gray-800' : ''}
            `} />
          )}

          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {step.title}
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Close tour"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
              {step.content}
            </p>
          </div>

          {/* Progress Bar */}
          {step.showProgress && (
            <div className="px-4 pb-2">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Step {currentStepIndex + 1} of {totalSteps}</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={springConfig}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between p-4 border-t dark:border-gray-700">
            <div className="flex gap-2">
              {currentStepIndex > 0 && (
                <motion.button
                  onClick={onPrevious}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors flex items-center gap-1"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </motion.button>
              )}
              {step.showSkip && (
                <motion.button
                  onClick={onSkip}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors flex items-center gap-1"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <SkipForward className="w-4 h-4" />
                  Skip Tour
                </motion.button>
              )}
            </div>
            
            <motion.button
              onClick={onNext}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium text-sm flex items-center gap-1"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={springConfig}
            >
              {currentStepIndex === totalSteps - 1 ? 'Finish' : 'Next'}
              {currentStepIndex < totalSteps - 1 && <ChevronRight className="w-4 h-4" />}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Add global styles for tour
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
    
    .tour-highlight {
      transition: all 0.3s ease;
    }
    
    @media (prefers-reduced-motion: reduce) {
      .tour-spotlight {
        animation: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}