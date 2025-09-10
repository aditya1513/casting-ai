/**
 * CastMatch Mobile Interaction Systems - Complete Integration
 * Export all interaction systems and provide unified initialization
 */

// Core Systems
export { hapticFeedback, useHapticFeedback } from './haptic-feedback-system';
export { keyboardNavigation, useKeyboardNavigation } from './keyboard-navigation';
export { touchGestures, useTouchGestures } from './touch-gestures';
export { helpSystem, useContextualHelp, SmartTooltip, HelpSuggestionPanel, FloatingHelpButton } from './contextual-help-system';
export { accessibilitySystem, useAccessibility, accessibilityUtils } from './accessibility-interactions';

// UI Components
export {
  SwipeableTalentCard,
  ZoomableImage,
  SwipeableMediaGallery,
  PullToRefreshContainer,
  LongPressContextMenu,
  HapticButton,
  GestureCardStack,
  useShakeToUndo
} from './mobile-interaction-patterns';

// Types
export type { HapticPattern, HapticPreferences } from './haptic-feedback-system';
export type { KeyboardShortcut, NavigationState } from './keyboard-navigation';
export type { GestureConfig, TouchPoint, SwipeGestureData, PinchGestureData } from './touch-gestures';
export type { HelpContent, UserBehavior, TooltipProps } from './contextual-help-system';
export type { AccessibilityOptions, FocusManagementOptions } from './accessibility-interactions';

/**
 * Unified Interaction System Manager
 * Coordinates all interaction systems and provides centralized configuration
 */
class InteractionSystemManager {
  private initialized = false;
  private config: InteractionSystemConfig;

  constructor() {
    this.config = {
      haptics: {
        enabled: true,
        intensity: 'medium',
        customPatterns: true
      },
      keyboard: {
        shortcuts: true,
        vimMode: false,
        accessibility: true
      },
      touch: {
        gestures: true,
        sensitivity: 'medium',
        preventScrolling: false
      },
      help: {
        contextual: true,
        smartSuggestions: true,
        onboarding: true
      },
      accessibility: {
        screenReader: 'auto',
        highContrast: 'auto',
        reducedMotion: 'auto'
      }
    };
  }

  /**
   * Initialize all interaction systems
   */
  public async initialize(customConfig?: Partial<InteractionSystemConfig>): Promise<void> {
    if (this.initialized) {
      console.warn('Interaction systems already initialized');
      return;
    }

    // Merge custom configuration
    if (customConfig) {
      this.config = this.deepMerge(this.config, customConfig);
    }

    try {
      // Initialize systems in order
      await this.initializeHapticSystem();
      await this.initializeKeyboardSystem();
      await this.initializeTouchSystem();
      await this.initializeHelpSystem();
      await this.initializeAccessibilitySystem();

      // Set up cross-system integrations
      this.setupIntegrations();

      // Mark as initialized
      this.initialized = true;

      console.log('✅ CastMatch interaction systems initialized successfully');
      
      // Announce to screen readers
      if (accessibilitySystem.getPreferences().screenReaderMode) {
        accessibilitySystem.announce('CastMatch interaction systems ready', 'polite');
      }

    } catch (error) {
      console.error('❌ Failed to initialize interaction systems:', error);
      throw error;
    }
  }

  private async initializeHapticSystem(): Promise<void> {
    if (!this.config.haptics.enabled) return;

    hapticFeedback.savePreferences({
      enabled: this.config.haptics.enabled,
      intensity: this.config.haptics.intensity as any,
      customPatterns: this.config.haptics.customPatterns
    });

    console.log('✓ Haptic feedback system initialized');
  }

  private async initializeKeyboardSystem(): Promise<void> {
    if (!this.config.keyboard.shortcuts) return;

    if (this.config.keyboard.vimMode) {
      keyboardNavigation.setMode('vim');
    }

    // Add custom shortcuts for casting workflow
    this.addCastingShortcuts();

    console.log('✓ Keyboard navigation system initialized');
  }

  private async initializeTouchSystem(): Promise<void> {
    if (!this.config.touch.gestures) return;

    // Configure gesture sensitivity
    touchGestures.updateConfig('swipe', {
      sensitivity: this.config.touch.sensitivity === 'high' ? 0.2 : 
                  this.config.touch.sensitivity === 'low' ? 0.5 : 0.3,
      preventScrolling: this.config.touch.preventScrolling
    });

    touchGestures.updateConfig('pinch', {
      sensitivity: this.config.touch.sensitivity === 'high' ? 0.05 : 
                  this.config.touch.sensitivity === 'low' ? 0.2 : 0.1
    });

    console.log('✓ Touch gesture system initialized');
  }

  private async initializeHelpSystem(): Promise<void> {
    if (!this.config.help.contextual) return;

    helpSystem.updatePreferences({
      enabled: this.config.help.contextual,
      smartSuggestions: this.config.help.smartSuggestions,
      autoShow: this.config.help.onboarding
    });

    // Start onboarding for new users
    if (this.config.help.onboarding && this.isNewUser()) {
      await this.startOnboarding();
    }

    console.log('✓ Contextual help system initialized');
  }

  private async initializeAccessibilitySystem(): Promise<void> {
    const preferences = accessibilitySystem.getPreferences();
    
    // Apply system settings if set to auto
    const updates: Partial<typeof preferences> = {};
    
    if (this.config.accessibility.screenReader !== 'auto') {
      updates.screenReaderMode = this.config.accessibility.screenReader === 'enabled';
    }
    
    if (this.config.accessibility.highContrast !== 'auto') {
      updates.highContrast = this.config.accessibility.highContrast === 'enabled';
    }
    
    if (this.config.accessibility.reducedMotion !== 'auto') {
      updates.reducedMotion = this.config.accessibility.reducedMotion === 'enabled';
    }

    if (Object.keys(updates).length > 0) {
      accessibilitySystem.updatePreferences(updates);
    }

    console.log('✓ Accessibility system initialized');
  }

  private setupIntegrations(): void {
    // Integrate haptic feedback with gestures
    touchGestures.on('swipe', () => hapticFeedback.swipeAction());
    touchGestures.on('longPress', () => hapticFeedback.longPress());
    touchGestures.on('pinch', () => hapticFeedback.photoZoom());

    // Integrate keyboard shortcuts with help system
    document.addEventListener('castmatch:keyboard-shortcut', (event: CustomEvent) => {
      const { shortcut } = event.detail;
      helpSystem.trackHelpRequest(`keyboard-${shortcut.action}`);
    });

    // Integrate accessibility announcements
    document.addEventListener('castmatch:gesture:talent:shortlist', () => {
      accessibilitySystem.announce('Talent added to shortlist');
    });

    document.addEventListener('castmatch:gesture:talent:pass', () => {
      accessibilitySystem.announce('Talent passed');
    });

    // Integrate help with accessibility
    document.addEventListener('castmatch:show-help-suggestion', () => {
      accessibilitySystem.announce('Help suggestion available');
    });
  }

  private addCastingShortcuts(): void {
    const castingShortcuts = [
      {
        key: 'F1',
        action: 'showKeyboardHelp',
        description: 'Show keyboard shortcuts help',
        category: 'global' as const,
        preventDefault: true
      },
      {
        key: 'r',
        action: 'refreshTalentList',
        description: 'Refresh talent list',
        category: 'casting' as const,
        context: ['talent-search']
      },
      {
        key: 'f',
        action: 'openFilters',
        description: 'Open search filters',
        category: 'casting' as const,
        context: ['talent-search']
      },
      {
        key: 'Escape',
        action: 'clearSelection',
        description: 'Clear current selection',
        category: 'casting' as const
      }
    ];

    castingShortcuts.forEach(shortcut => {
      keyboardNavigation.addCustomShortcut(shortcut);
    });
  }

  private isNewUser(): boolean {
    return !localStorage.getItem('castmatch-onboarding-completed');
  }

  private async startOnboarding(): Promise<void> {
    const userRole = document.body.getAttribute('data-user-role') as 'talent' | 'casting_director';
    const onboardingFlow = userRole === 'talent' ? 'talent-onboarding' : 'casting-director-onboarding';
    
    if (helpSystem.shouldShowOnboarding(onboardingFlow)) {
      helpSystem.startOnboarding(onboardingFlow);
    }
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  // PUBLIC API
  public isInitialized(): boolean {
    return this.initialized;
  }

  public getConfig(): InteractionSystemConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<InteractionSystemConfig>): void {
    this.config = this.deepMerge(this.config, newConfig);
    
    // Re-apply configurations to systems
    if (this.initialized) {
      this.reinitialize();
    }
  }

  public async reinitialize(): Promise<void> {
    this.initialized = false;
    await this.initialize(this.config);
  }

  public getSystemStatus(): SystemStatus {
    return {
      haptics: hapticFeedback.isHapticSupported(),
      keyboard: keyboardNavigation.getShortcuts().length > 0,
      touch: touchGestures.getCurrentGesture() !== null || true, // Available
      help: helpSystem.getRecommendedHelp().length > 0,
      accessibility: accessibilitySystem.getPreferences().enabled
    };
  }

  public enableDebugging(): void {
    // Add debug event listeners
    document.addEventListener('castmatch:gesture:swipe', (e: CustomEvent) => {
      console.log('🤏 Swipe detected:', e.detail);
    });

    document.addEventListener('castmatch:keyboard-shortcut', (e: CustomEvent) => {
      console.log('⌨️ Keyboard shortcut:', e.detail.shortcut.action);
    });

    document.addEventListener('castmatch:help-suggestion', (e: CustomEvent) => {
      console.log('💡 Help suggestion:', e.detail);
    });

    console.log('🐛 Interaction debugging enabled');
  }
}

// Configuration interfaces
export interface InteractionSystemConfig {
  haptics: {
    enabled: boolean;
    intensity: 'light' | 'medium' | 'heavy';
    customPatterns: boolean;
  };
  keyboard: {
    shortcuts: boolean;
    vimMode: boolean;
    accessibility: boolean;
  };
  touch: {
    gestures: boolean;
    sensitivity: 'low' | 'medium' | 'high';
    preventScrolling: boolean;
  };
  help: {
    contextual: boolean;
    smartSuggestions: boolean;
    onboarding: boolean;
  };
  accessibility: {
    screenReader: 'auto' | 'enabled' | 'disabled';
    highContrast: 'auto' | 'enabled' | 'disabled';
    reducedMotion: 'auto' | 'enabled' | 'disabled';
  };
}

export interface SystemStatus {
  haptics: boolean;
  keyboard: boolean;
  touch: boolean;
  help: boolean;
  accessibility: boolean;
}

// Export singleton instance
export const interactionManager = new InteractionSystemManager();

// React hook for unified interaction system
export function useInteractionSystems() {
  return {
    manager: interactionManager,
    initialize: (config?: Partial<InteractionSystemConfig>) => interactionManager.initialize(config),
    isInitialized: interactionManager.isInitialized(),
    status: interactionManager.getSystemStatus(),
    config: interactionManager.getConfig(),
    updateConfig: (config: Partial<InteractionSystemConfig>) => interactionManager.updateConfig(config)
  };
}

// Auto-initialize with default configuration if in browser environment
if (typeof window !== 'undefined') {
  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      interactionManager.initialize();
    });
  } else {
    // DOM already ready
    interactionManager.initialize();
  }
}