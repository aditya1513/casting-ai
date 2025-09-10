/**
 * Motion Accessibility Controls Component
 * User interface for managing motion preferences with WCAG compliance
 */

import React, { useState, useEffect } from 'react';
import { motionAccessibility, MotionPreferences, AccessibilityUtils } from './accessibility-motion';

interface MotionControlsProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  showAdvanced?: boolean;
  compact?: boolean;
  className?: string;
  onPreferencesChange?: (preferences: MotionPreferences) => void;
}

export const MotionAccessibilityControls: React.FC<MotionControlsProps> = ({
  position = 'top-right',
  showAdvanced = false,
  compact = false,
  className = '',
  onPreferencesChange
}) => {
  const [preferences, setPreferences] = useState<MotionPreferences>(
    motionAccessibility.getPreferences()
  );
  const [isOpen, setIsOpen] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  useEffect(() => {
    const unsubscribe = motionAccessibility.subscribe((newPrefs) => {
      setPreferences(newPrefs);
      onPreferencesChange?.(newPrefs);
    });

    return unsubscribe;
  }, [onPreferencesChange]);

  const handlePreferenceChange = (key: keyof MotionPreferences, value: any) => {
    setHasUserInteracted(true);
    motionAccessibility.updateMotionPreferences({ [key]: value });
  };

  const handlePauseAll = () => {
    motionAccessibility.pauseAllAnimations();
    setHasUserInteracted(true);
  };

  const handleResumeAll = () => {
    motionAccessibility.resumeAllAnimations();
    setHasUserInteracted(true);
  };

  const handleReset = () => {
    const defaultPrefs = motionAccessibility.detectUserPreferences();
    motionAccessibility.updateMotionPreferences(defaultPrefs);
    setHasUserInteracted(true);
  };

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  const controlId = 'motion-accessibility-controls';

  if (compact) {
    return (
      <div 
        className={`fixed ${positionClasses[position]} z-50 ${className}`}
        role="region"
        aria-labelledby={`${controlId}-label`}
      >
        <button
          id={`${controlId}-toggle`}
          className="bg-white border border-gray-300 rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls={controlId}
          aria-label="Motion settings"
          title="Open motion accessibility controls"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L19 8V5C19 4.45 18.55 4 18 4H16C15.45 4 15 4.45 15 5V8L13 7V9L15 10V12C15 12.55 15.45 13 16 13H18C18.55 13 19 12.55 19 12V10L21 9Z"
              fill="currentColor"
            />
          </svg>
        </button>

        {isOpen && (
          <div
            id={controlId}
            className="absolute top-14 right-0 bg-white border border-gray-300 rounded-lg shadow-xl p-4 w-64"
            role="dialog"
            aria-labelledby={`${controlId}-label`}
          >
            <h3 id={`${controlId}-label`} className="text-lg font-semibold mb-3 text-gray-900">
              Motion Settings
            </h3>
            <QuickControls
              preferences={preferences}
              onPreferenceChange={handlePreferenceChange}
              onPauseAll={handlePauseAll}
              onResumeAll={handleResumeAll}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`fixed ${positionClasses[position]} z-50 bg-white border border-gray-300 rounded-lg shadow-xl p-6 max-w-sm ${className}`}
      role="region"
      aria-labelledby={`${controlId}-label`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 id={`${controlId}-label`} className="text-lg font-semibold text-gray-900">
          Motion Preferences
        </h3>
        
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-gray-400 hover:text-gray-600"
          aria-label={isOpen ? 'Collapse controls' : 'Expand controls'}
        >
          <svg
            className={`w-5 h-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="space-y-4">
          <QuickControls
            preferences={preferences}
            onPreferenceChange={handlePreferenceChange}
            onPauseAll={handlePauseAll}
            onResumeAll={handleResumeAll}
          />

          {showAdvanced && (
            <AdvancedControls
              preferences={preferences}
              onPreferenceChange={handlePreferenceChange}
            />
          )}

          <div className="flex gap-2 pt-4 border-t border-gray-200">
            <button
              onClick={handleReset}
              className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              Reset
            </button>
            
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          </div>

          {hasUserInteracted && (
            <div 
              className="text-xs text-gray-500 text-center"
              role="status"
              aria-live="polite"
            >
              Settings saved automatically
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface ControlsProps {
  preferences: MotionPreferences;
  onPreferenceChange: (key: keyof MotionPreferences, value: any) => void;
  onPauseAll: () => void;
  onResumeAll: () => void;
}

const QuickControls: React.FC<ControlsProps> = ({
  preferences,
  onPreferenceChange,
  onPauseAll,
  onResumeAll
}) => (
  <div className="space-y-3">
    <MotionToggle
      id="reduced-motion"
      label="Reduce motion"
      description="Minimizes animations that may cause discomfort"
      checked={preferences.reducedMotion}
      onChange={(checked) => onPreferenceChange('reducedMotion', checked)}
    />

    <MotionToggle
      id="disable-parallax"
      label="Disable parallax scrolling"
      description="Prevents moving backgrounds during scroll"
      checked={preferences.disableParallax}
      onChange={(checked) => onPreferenceChange('disableParallax', checked)}
    />

    <MotionToggle
      id="disable-autoplay"
      label="Disable autoplay animations"
      description="Prevents animations from starting automatically"
      checked={preferences.disableAutoplay}
      onChange={(checked) => onPreferenceChange('disableAutoplay', checked)}
    />

    <div className="flex gap-2 pt-2">
      <button
        onClick={onPauseAll}
        className="flex-1 px-3 py-2 text-sm bg-orange-100 text-orange-800 rounded hover:bg-orange-200 transition-colors"
        disabled={preferences.reducedMotion}
      >
        Pause All
      </button>
      
      <button
        onClick={onResumeAll}
        className="flex-1 px-3 py-2 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
        disabled={preferences.reducedMotion}
      >
        Resume All
      </button>
    </div>
  </div>
);

const AdvancedControls: React.FC<ControlsProps> = ({
  preferences,
  onPreferenceChange
}) => (
  <div className="space-y-3 pt-4 border-t border-gray-200">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Motion Intensity
      </label>
      <select
        value={preferences.motionIntensity}
        onChange={(e) => onPreferenceChange('motionIntensity', e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="none">None</option>
        <option value="minimal">Minimal</option>
        <option value="reduced">Reduced</option>
        <option value="normal">Normal</option>
        <option value="enhanced">Enhanced</option>
      </select>
    </div>

    <MotionToggle
      id="vestibular-safe"
      label="Vestibular safe mode"
      description="Removes rotations and scaling that may cause dizziness"
      checked={preferences.vestibularSafe}
      onChange={(checked) => onPreferenceChange('vestibularSafe', checked)}
    />

    <MotionToggle
      id="prefer-static"
      label="Prefer static content"
      description="Shows final animation states immediately"
      checked={preferences.preferStaticContent}
      onChange={(checked) => onPreferenceChange('preferStaticContent', checked)}
    />

    <MotionToggle
      id="allow-essential"
      label="Allow essential animations"
      description="Permits animations needed for functionality"
      checked={preferences.allowEssentialMotion}
      onChange={(checked) => onPreferenceChange('allowEssentialMotion', checked)}
    />
  </div>
);

interface MotionToggleProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const MotionToggle: React.FC<MotionToggleProps> = ({
  id,
  label,
  description,
  checked,
  onChange
}) => (
  <div className="flex items-start space-x-3">
    <div className="flex-shrink-0 pt-0.5">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
      />
    </div>
    
    <div className="flex-1 min-w-0">
      <label htmlFor={id} className="text-sm font-medium text-gray-900 cursor-pointer">
        {label}
      </label>
      {description && (
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      )}
    </div>
  </div>
);

// Hook for using motion accessibility in components
export const useMotionAccessibility = () => {
  const [preferences, setPreferences] = useState<MotionPreferences>(
    motionAccessibility.getPreferences()
  );

  useEffect(() => {
    const unsubscribe = motionAccessibility.subscribe(setPreferences);
    return unsubscribe;
  }, []);

  return {
    preferences,
    shouldAnimate: motionAccessibility.shouldAnimate.bind(motionAccessibility),
    createAccessibleAnimation: motionAccessibility.createAccessibleAnimation.bind(motionAccessibility),
    updatePreferences: motionAccessibility.updateMotionPreferences.bind(motionAccessibility),
    getSafeAnimationProps: motionAccessibility.getSafeAnimationProps.bind(motionAccessibility),
    utils: AccessibilityUtils
  };
};

// Provider component for motion accessibility context
interface MotionAccessibilityProviderProps {
  children: React.ReactNode;
  showControls?: boolean;
  controlsPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  controlsCompact?: boolean;
}

export const MotionAccessibilityProvider: React.FC<MotionAccessibilityProviderProps> = ({
  children,
  showControls = true,
  controlsPosition = 'top-right',
  controlsCompact = true
}) => {
  return (
    <>
      {children}
      {showControls && (
        <MotionAccessibilityControls
          position={controlsPosition}
          compact={controlsCompact}
          showAdvanced={false}
        />
      )}
      
      {/* Global styles for accessibility */}
      <style jsx global>{`
        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>
    </>
  );
};