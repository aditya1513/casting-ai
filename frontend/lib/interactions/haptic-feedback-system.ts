/**
 * Haptic Feedback System for CastMatch Mobile Platform
 * Provides native iOS/Android haptic patterns for casting workflows
 */

export interface HapticPattern {
  type: 'impact' | 'notification' | 'selection' | 'custom';
  intensity?: 'light' | 'medium' | 'heavy';
  duration?: number;
  pattern?: number[];
}

export interface HapticPreferences {
  enabled: boolean;
  intensity: 'off' | 'light' | 'medium' | 'heavy';
  customPatterns: boolean;
  accessibilityMode: boolean;
}

class HapticFeedbackSystem {
  private preferences: HapticPreferences;
  private isSupported: boolean;
  private vibrationAPI: any;

  constructor() {
    this.isSupported = this.detectHapticSupport();
    this.preferences = this.loadPreferences();
    this.initializeVibrationAPI();
  }

  private detectHapticSupport(): boolean {
    // Check for iOS Haptic Feedback API
    if (window.DeviceMotionEvent && typeof (window as any).DeviceMotionEvent.requestPermission === 'function') {
      return true;
    }
    
    // Check for Android Vibration API
    if ('vibrate' in navigator) {
      return true;
    }
    
    // Check for Web Vibration API
    if ('vibrate' in navigator || 'webkitVibrate' in navigator) {
      return true;
    }
    
    return false;
  }

  private initializeVibrationAPI(): void {
    this.vibrationAPI = navigator.vibrate || (navigator as any).webkitVibrate || null;
  }

  private loadPreferences(): HapticPreferences {
    const stored = localStorage.getItem('castmatch-haptic-preferences');
    return stored ? JSON.parse(stored) : {
      enabled: true,
      intensity: 'medium' as const,
      customPatterns: true,
      accessibilityMode: false
    };
  }

  public savePreferences(preferences: Partial<HapticPreferences>): void {
    this.preferences = { ...this.preferences, ...preferences };
    localStorage.setItem('castmatch-haptic-preferences', JSON.stringify(this.preferences));
  }

  private shouldTriggerHaptic(): boolean {
    return this.isSupported && this.preferences.enabled && this.preferences.intensity !== 'off';
  }

  private getIntensityMultiplier(): number {
    switch (this.preferences.intensity) {
      case 'light': return 0.5;
      case 'medium': return 1.0;
      case 'heavy': return 1.5;
      default: return 0;
    }
  }

  private triggerVibration(pattern: number | number[]): void {
    if (!this.shouldTriggerHaptic() || !this.vibrationAPI) return;
    
    const multiplier = this.getIntensityMultiplier();
    
    if (Array.isArray(pattern)) {
      const adjustedPattern = pattern.map(duration => Math.floor(duration * multiplier));
      this.vibrationAPI.call(navigator, adjustedPattern);
    } else {
      this.vibrationAPI.call(navigator, Math.floor(pattern * multiplier));
    }
  }

  private triggerIOSHaptic(type: string, intensity?: string): void {
    if (!this.shouldTriggerHaptic()) return;
    
    // iOS Haptic Feedback (requires iOS 10+)
    if ((window as any).TapticEngine) {
      (window as any).TapticEngine.impact({ 
        style: intensity || this.preferences.intensity 
      });
    }
    
    // Fallback to vibration
    this.triggerVibration(50);
  }

  // SUCCESS ACTIONS
  public profileSaved(): void {
    this.triggerIOSHaptic('impact', 'light');
    this.triggerVibration(50);
  }

  public auditionBooked(): void {
    this.triggerIOSHaptic('impact', 'medium');
    this.triggerVibration(100);
  }

  public matchFound(): void {
    // Success pattern: 3 light pulses
    this.triggerVibration([50, 50, 50, 50, 50]);
  }

  public talentShortlisted(): void {
    this.triggerIOSHaptic('notification', 'success');
    this.triggerVibration([30, 30, 60]);
  }

  public conversationStarted(): void {
    this.triggerIOSHaptic('impact', 'light');
    this.triggerVibration([40, 20, 40]);
  }

  // NAVIGATION FEEDBACK
  public buttonTap(): void {
    this.triggerIOSHaptic('selection');
    this.triggerVibration(10);
  }

  public pageTransition(): void {
    this.triggerIOSHaptic('impact', 'light');
    this.triggerVibration(20);
  }

  public menuOpen(): void {
    this.triggerIOSHaptic('impact', 'light');
    this.triggerVibration(30);
  }

  public swipeAction(): void {
    this.triggerIOSHaptic('selection');
    this.triggerVibration(25);
  }

  public longPress(): void {
    this.triggerIOSHaptic('impact', 'medium');
    this.triggerVibration(80);
  }

  // ALERT PATTERNS
  public error(): void {
    this.triggerIOSHaptic('notification', 'error');
    this.triggerVibration(150);
  }

  public warning(): void {
    this.triggerIOSHaptic('notification', 'warning');
    this.triggerVibration(100);
  }

  public notification(): void {
    // Light pattern: 2 pulses
    this.triggerVibration([30, 50, 30]);
  }

  // CASTING WORKFLOW SPECIFIC
  public talentCardFlip(): void {
    this.triggerIOSHaptic('selection');
    this.triggerVibration(15);
  }

  public filterApplied(): void {
    this.triggerIOSHaptic('impact', 'light');
    this.triggerVibration(40);
  }

  public searchComplete(): void {
    this.triggerIOSHaptic('impact', 'light');
    this.triggerVibration([20, 10, 30]);
  }

  public undoAction(): void {
    this.triggerIOSHaptic('impact', 'medium');
    this.triggerVibration([60, 30, 60]);
  }

  // MEDIA INTERACTION
  public photoZoom(): void {
    this.triggerIOSHaptic('selection');
    this.triggerVibration(12);
  }

  public gallerySwipe(): void {
    this.triggerIOSHaptic('selection');
    this.triggerVibration(8);
  }

  public videoPlay(): void {
    this.triggerIOSHaptic('impact', 'light');
    this.triggerVibration(35);
  }

  // ACCESSIBILITY PATTERNS
  public focusChange(): void {
    if (this.preferences.accessibilityMode) {
      this.triggerVibration(5);
    }
  }

  public screenReaderFeedback(): void {
    if (this.preferences.accessibilityMode) {
      this.triggerVibration([10, 10, 10]);
    }
  }

  // CUSTOM PATTERNS
  public playCustomPattern(pattern: HapticPattern): void {
    if (!this.preferences.customPatterns) return;

    switch (pattern.type) {
      case 'impact':
        this.triggerIOSHaptic('impact', pattern.intensity);
        this.triggerVibration(pattern.duration || 50);
        break;
      case 'notification':
        this.triggerIOSHaptic('notification', pattern.intensity);
        this.triggerVibration(pattern.duration || 100);
        break;
      case 'selection':
        this.triggerIOSHaptic('selection');
        this.triggerVibration(pattern.duration || 15);
        break;
      case 'custom':
        if (pattern.pattern) {
          this.triggerVibration(pattern.pattern);
        }
        break;
    }
  }

  // UTILITY METHODS
  public testHaptic(): void {
    this.triggerVibration([100, 50, 100, 50, 200]);
  }

  public isHapticSupported(): boolean {
    return this.isSupported;
  }

  public getPreferences(): HapticPreferences {
    return { ...this.preferences };
  }

  public disable(): void {
    this.preferences.enabled = false;
    this.savePreferences(this.preferences);
  }

  public enable(): void {
    this.preferences.enabled = true;
    this.savePreferences(this.preferences);
  }
}

// Export singleton instance
export const hapticFeedback = new HapticFeedbackSystem();

// Export React hook for easy integration
export function useHapticFeedback() {
  return {
    haptic: hapticFeedback,
    isSupported: hapticFeedback.isHapticSupported(),
    preferences: hapticFeedback.getPreferences(),
    updatePreferences: (prefs: Partial<HapticPreferences>) => hapticFeedback.savePreferences(prefs)
  };
}