/**
 * Accessibility Motion System
 * WCAG 2.1 AA compliant motion controls with reduced motion support
 */

export interface MotionPreferences {
  reducedMotion: boolean;
  disableParallax: boolean;
  disableAutoplay: boolean;
  preferStaticContent: boolean;
  allowEssentialMotion: boolean;
  vestibularSafe: boolean;
  motionIntensity: 'none' | 'minimal' | 'reduced' | 'normal' | 'enhanced';
}

export interface AccessibilityConfig {
  respectSystemSettings: boolean;
  showMotionControls: boolean;
  announceAnimations: boolean;
  provideFocusAlternatives: boolean;
  allowOverrides: boolean;
}

class MotionAccessibilityManager {
  private preferences: MotionPreferences;
  private config: AccessibilityConfig;
  private observers: Set<(prefs: MotionPreferences) => void> = new Set();
  private mediaQuery: MediaQueryList | null = null;
  private currentAnimations = new Map<string, Animation>();

  constructor() {
    this.config = this.getDefaultConfig();
    this.preferences = this.detectUserPreferences();
    this.initializeMediaQuery();
    this.loadUserPreferences();
  }

  private getDefaultConfig(): AccessibilityConfig {
    return {
      respectSystemSettings: true,
      showMotionControls: true,
      announceAnimations: true,
      provideFocusAlternatives: true,
      allowOverrides: true
    };
  }

  private detectUserPreferences(): MotionPreferences {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    return {
      reducedMotion,
      disableParallax: reducedMotion,
      disableAutoplay: reducedMotion,
      preferStaticContent: reducedMotion,
      allowEssentialMotion: !reducedMotion,
      vestibularSafe: reducedMotion,
      motionIntensity: reducedMotion ? 'minimal' : 'normal'
    };
  }

  private initializeMediaQuery(): void {
    if (typeof window !== 'undefined') {
      this.mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.mediaQuery.addEventListener('change', (e) => {
        this.updateMotionPreferences({ reducedMotion: e.matches });
      });
    }
  }

  private loadUserPreferences(): void {
    try {
      const saved = localStorage.getItem('motion-preferences');
      if (saved) {
        const savedPrefs = JSON.parse(saved);
        this.preferences = { ...this.preferences, ...savedPrefs };
      }
    } catch (error) {
      console.warn('Failed to load motion preferences:', error);
    }
  }

  private saveUserPreferences(): void {
    try {
      localStorage.setItem('motion-preferences', JSON.stringify(this.preferences));
    } catch (error) {
      console.warn('Failed to save motion preferences:', error);
    }
  }

  /**
   * Updates motion preferences and notifies observers
   */
  updateMotionPreferences(updates: Partial<MotionPreferences>): void {
    const oldPrefs = { ...this.preferences };
    this.preferences = { ...this.preferences, ...updates };
    
    // Auto-adjust related preferences
    if (updates.reducedMotion !== undefined) {
      this.preferences.disableParallax = updates.reducedMotion;
      this.preferences.disableAutoplay = updates.reducedMotion;
      this.preferences.vestibularSafe = updates.reducedMotion;
      this.preferences.motionIntensity = updates.reducedMotion ? 'minimal' : 'normal';
    }

    this.saveUserPreferences();
    this.notifyObservers();
    this.updateAnimationStates(oldPrefs);
  }

  private notifyObservers(): void {
    this.observers.forEach(callback => {
      try {
        callback(this.preferences);
      } catch (error) {
        console.error('Observer callback failed:', error);
      }
    });
  }

  private updateAnimationStates(oldPrefs: MotionPreferences): void {
    // Stop or modify existing animations based on new preferences
    this.currentAnimations.forEach((animation, id) => {
      if (this.preferences.reducedMotion && !oldPrefs.reducedMotion) {
        this.pauseAnimation(id);
      } else if (!this.preferences.reducedMotion && oldPrefs.reducedMotion) {
        this.resumeAnimation(id);
      }
    });
  }

  /**
   * Subscribes to motion preference changes
   */
  subscribe(callback: (prefs: MotionPreferences) => void): () => void {
    this.observers.add(callback);
    
    return () => {
      this.observers.delete(callback);
    };
  }

  /**
   * Determines if animation should be allowed
   */
  shouldAnimate(animationType: 'essential' | 'decorative' | 'enhancement'): boolean {
    if (this.preferences.reducedMotion) {
      return animationType === 'essential' && this.preferences.allowEssentialMotion;
    }
    
    return true;
  }

  /**
   * Gets safe animation properties based on preferences
   */
  getSafeAnimationProps(originalProps: any): any {
    if (!this.preferences.reducedMotion) {
      return originalProps;
    }

    // Create reduced motion alternatives
    const safeProps = { ...originalProps };

    // Remove potentially problematic animations
    if (this.preferences.disableParallax) {
      delete safeProps.translateY;
      delete safeProps.translateX;
    }

    if (this.preferences.vestibularSafe) {
      delete safeProps.rotateX;
      delete safeProps.rotateY;
      delete safeProps.rotateZ;
      delete safeProps.scale;
    }

    // Reduce animation intensity
    if (safeProps.duration) {
      safeProps.duration = Math.min(safeProps.duration, 200); // Max 200ms for reduced motion
    }

    if (safeProps.delay) {
      safeProps.delay = Math.min(safeProps.delay, 100);
    }

    return safeProps;
  }

  /**
   * Creates accessibility-friendly animation
   */
  createAccessibleAnimation(
    element: HTMLElement,
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions & {
      type?: 'essential' | 'decorative' | 'enhancement';
      reducedMotionAlternative?: () => void;
      description?: string;
    }
  ): Animation | null {
    const animationType = options.type || 'decorative';
    
    if (!this.shouldAnimate(animationType)) {
      // Execute reduced motion alternative
      if (options.reducedMotionAlternative) {
        options.reducedMotionAlternative();
      } else {
        // Apply final state immediately
        const finalFrame = keyframes[keyframes.length - 1];
        if (finalFrame && typeof finalFrame === 'object') {
          Object.assign(element.style, finalFrame);
        }
      }
      
      // Announce state change for screen readers
      if (options.description && this.config.announceAnimations) {
        this.announceToScreenReader(options.description);
      }
      
      return null;
    }

    // Apply safe animation properties
    const safeOptions = this.getSafeAnimationProps(options);
    const safeKeyframes = keyframes.map(frame => this.getSafeAnimationProps(frame));

    try {
      const animation = element.animate(safeKeyframes, safeOptions);
      const animationId = this.generateAnimationId();
      this.currentAnimations.set(animationId, animation);

      // Announce animation start
      if (options.description && this.config.announceAnimations) {
        this.announceToScreenReader(`Animation started: ${options.description}`);
      }

      // Clean up on finish
      animation.addEventListener('finish', () => {
        this.currentAnimations.delete(animationId);
        if (options.description && this.config.announceAnimations) {
          this.announceToScreenReader(`Animation completed: ${options.description}`);
        }
      });

      return animation;
    } catch (error) {
      console.error('Animation creation failed:', error);
      return null;
    }
  }

  private generateAnimationId(): string {
    return `anim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private announceToScreenReader(message: string): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  /**
   * Pauses a specific animation
   */
  pauseAnimation(animationId: string): void {
    const animation = this.currentAnimations.get(animationId);
    if (animation) {
      animation.pause();
    }
  }

  /**
   * Resumes a specific animation
   */
  resumeAnimation(animationId: string): void {
    const animation = this.currentAnimations.get(animationId);
    if (animation && this.shouldAnimate('enhancement')) {
      animation.play();
    }
  }

  /**
   * Cancels all animations
   */
  pauseAllAnimations(): void {
    this.currentAnimations.forEach(animation => {
      animation.pause();
    });
  }

  /**
   * Resumes all animations if preferences allow
   */
  resumeAllAnimations(): void {
    if (this.shouldAnimate('enhancement')) {
      this.currentAnimations.forEach(animation => {
        animation.play();
      });
    }
  }

  /**
   * Gets current preferences
   */
  getPreferences(): MotionPreferences {
    return { ...this.preferences };
  }

  /**
   * Gets accessibility configuration
   */
  getConfiguration(): AccessibilityConfig {
    return { ...this.config };
  }

  /**
   * Updates accessibility configuration
   */
  updateConfiguration(updates: Partial<AccessibilityConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

// Singleton instance
export const motionAccessibility = new MotionAccessibilityManager();

// Utility components and hooks
export const AccessibilityUtils = {
  /**
   * Creates motion-safe CSS class based on current preferences
   */
  getMotionSafeClasses(baseClasses: string = ''): string {
    const prefs = motionAccessibility.getPreferences();
    const classes = [baseClasses];

    if (prefs.reducedMotion) {
      classes.push('motion-reduced');
    }

    if (prefs.vestibularSafe) {
      classes.push('motion-safe');
    }

    if (prefs.preferStaticContent) {
      classes.push('prefer-static');
    }

    return classes.filter(Boolean).join(' ');
  },

  /**
   * Applies motion-safe styles to element
   */
  applyMotionSafeStyles(element: HTMLElement): void {
    const prefs = motionAccessibility.getPreferences();
    
    if (prefs.reducedMotion) {
      element.style.animation = 'none';
      element.style.transition = 'none';
    }

    if (prefs.vestibularSafe) {
      element.style.transform = 'none';
    }
  },

  /**
   * Creates focus-visible alternative for motion
   */
  createFocusAlternative(
    element: HTMLElement,
    description: string
  ): void {
    element.setAttribute('role', 'button');
    element.setAttribute('aria-label', description);
    element.setAttribute('tabindex', '0');
    
    element.addEventListener('focus', () => {
      element.style.outline = '2px solid #0066cc';
      element.style.outlineOffset = '2px';
    });

    element.addEventListener('blur', () => {
      element.style.outline = '';
      element.style.outlineOffset = '';
    });
  }
};

// CSS for motion accessibility
export const AccessibleMotionCSS = `
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }

    .motion-reduced {
      animation: none !important;
      transition: none !important;
      transform: none !important;
    }

    .motion-safe {
      transform: none !important;
    }

    .prefer-static * {
      animation-play-state: paused !important;
    }
  }

  .motion-control-panel {
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 9999;
    font-size: 14px;
    max-width: 300px;
  }

  .motion-control-panel h3 {
    margin: 0 0 12px 0;
    font-size: 16px;
    color: #333;
  }

  .motion-control-panel label {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    cursor: pointer;
  }

  .motion-control-panel input[type="checkbox"] {
    margin-right: 8px;
  }

  .motion-control-panel button {
    background: #0066cc;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    margin-right: 8px;
    margin-top: 8px;
  }

  .motion-control-panel button:hover {
    background: #0052a3;
  }

  .motion-control-panel button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
`;