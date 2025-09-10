/**
 * CastMatch Typography System - Main Integration
 * Production-Optimized Typography for Mumbai Entertainment Industry
 */

// Core system imports
import { FontLoadingStrategy, initializeFontLoading } from './font-loading-strategy';
import { MultilingualTypographyManager, initializeMultilingualSupport } from './multilingual-support';
import { AccessibilityScalingManager, initializeAccessibilityScaling } from './accessibility-scaling';
import { FontOptimizationUtils, FontPerformanceMonitor, initializeFontOptimization } from './font-optimization-config';

// System configuration
export interface CastMatchTypographyConfig {
  enableFontOptimization: boolean;
  enableMultilingualSupport: boolean;
  enableAccessibilityScaling: boolean;
  enablePerformanceMonitoring: boolean;
  enableMicrocopySystem: boolean;
  debugMode: boolean;
}

// Default configuration for production
export const DEFAULT_CONFIG: CastMatchTypographyConfig = {
  enableFontOptimization: true,
  enableMultilingualSupport: true,
  enableAccessibilityScaling: true,
  enablePerformanceMonitoring: true,
  enableMicrocopySystem: true,
  debugMode: false
};

// Main typography system class
export class CastMatchTypographySystem {
  private fontLoadingStrategy: FontLoadingStrategy;
  private multilingualManager: MultilingualTypographyManager;
  private accessibilityManager: AccessibilityScalingManager;
  private performanceMonitor: FontPerformanceMonitor;
  private config: CastMatchTypographyConfig;
  private isInitialized = false;

  constructor(config: Partial<CastMatchTypographyConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize core managers
    this.fontLoadingStrategy = FontLoadingStrategy.getInstance();
    this.multilingualManager = new MultilingualTypographyManager();
    this.accessibilityManager = new AccessibilityScalingManager();
    this.performanceMonitor = new FontPerformanceMonitor();
  }

  /**
   * Initialize the complete typography system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('CastMatch Typography System already initialized');
      return;
    }

    try {
      console.log('🎭 Initializing CastMatch Typography System...');

      // 1. Initialize font loading optimization
      if (this.config.enableFontOptimization) {
        await this.initializeFontOptimization();
      }

      // 2. Initialize multilingual support
      if (this.config.enableMultilingualSupport) {
        await this.initializeMultilingualSupport();
      }

      // 3. Initialize accessibility features
      if (this.config.enableAccessibilityScaling) {
        this.initializeAccessibilityFeatures();
      }

      // 4. Initialize performance monitoring
      if (this.config.enablePerformanceMonitoring) {
        this.initializePerformanceMonitoring();
      }

      // 5. Apply system-wide typography styles
      this.applyTypographySystem();

      // 6. Set up event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      console.log('✅ CastMatch Typography System initialized successfully');

      // Log performance metrics
      if (this.config.debugMode) {
        this.logSystemStatus();
      }

    } catch (error) {
      console.error('❌ Failed to initialize CastMatch Typography System:', error);
      throw error;
    }
  }

  /**
   * Initialize font optimization
   */
  private async initializeFontOptimization(): Promise<void> {
    console.log('🔤 Initializing font optimization...');
    
    // Start font loading process
    await this.fontLoadingStrategy.loadFontsProgressively();
    
    // Apply fallback strategy
    this.fontLoadingStrategy.implementFallbackStrategy();
    
    // Start performance monitoring
    this.fontLoadingStrategy.monitorFontPerformance();
    
    console.log('✅ Font optimization initialized');
  }

  /**
   * Initialize multilingual support
   */
  private async initializeMultilingualSupport(): Promise<void> {
    console.log('🌏 Initializing multilingual support...');
    
    // Detect user's preferred language
    const userLanguage = this.multilingualManager.detectUserLanguage();
    
    // Set initial language
    await this.multilingualManager.setLanguage(userLanguage);
    
    console.log(`✅ Multilingual support initialized (Language: ${userLanguage})`);
  }

  /**
   * Initialize accessibility features
   */
  private initializeAccessibilityFeatures(): void {
    console.log('♿ Initializing accessibility features...');
    
    // Initialize accessibility scaling
    initializeAccessibilityScaling();
    
    // Subscribe to preference changes
    this.accessibilityManager.subscribe((preferences) => {
      if (this.config.debugMode) {
        console.log('Accessibility preferences updated:', preferences);
      }
    });
    
    console.log('✅ Accessibility features initialized');
  }

  /**
   * Initialize performance monitoring
   */
  private initializePerformanceMonitoring(): void {
    console.log('📊 Initializing performance monitoring...');
    
    // Start monitoring
    this.performanceMonitor.startMonitoring();
    
    // Subscribe to performance events
    this.performanceMonitor.subscribe((event, data) => {
      if (this.config.debugMode) {
        console.log(`Performance event: ${event}`, data);
      }
      
      // Send to analytics if configured
      this.sendPerformanceMetrics(event, data);
    });
    
    console.log('✅ Performance monitoring initialized');
  }

  /**
   * Apply system-wide typography styles
   */
  private applyTypographySystem(): void {
    console.log('🎨 Applying typography system styles...');
    
    // Add CastMatch typography class to document
    document.documentElement.classList.add('castmatch-typography');
    
    // Set typography custom properties
    this.setTypographyProperties();
    
    // Apply entertainment industry optimizations
    this.applyIndustryOptimizations();
    
    console.log('✅ Typography system styles applied');
  }

  /**
   * Set typography custom properties
   */
  private setTypographyProperties(): void {
    const root = document.documentElement;
    
    // Typography scale
    root.style.setProperty('--castmatch-font-scale-hero', 'clamp(3rem, 8vw, 4.5rem)');
    root.style.setProperty('--castmatch-font-scale-title', 'clamp(2rem, 5vw, 3rem)');
    root.style.setProperty('--castmatch-font-scale-subtitle', 'clamp(1.5rem, 4vw, 2rem)');
    root.style.setProperty('--castmatch-font-scale-body', 'clamp(1rem, 2.5vw, 1.125rem)');
    root.style.setProperty('--castmatch-font-scale-caption', '0.875rem');
    root.style.setProperty('--castmatch-font-scale-label', '0.75rem');
    
    // Line heights
    root.style.setProperty('--castmatch-line-height-tight', '1.25');
    root.style.setProperty('--castmatch-line-height-normal', '1.5');
    root.style.setProperty('--castmatch-line-height-loose', '1.75');
    
    // Letter spacing
    root.style.setProperty('--castmatch-letter-spacing-tight', '-0.025em');
    root.style.setProperty('--castmatch-letter-spacing-normal', '0em');
    root.style.setProperty('--castmatch-letter-spacing-wide', '0.025em');
  }

  /**
   * Apply entertainment industry-specific optimizations
   */
  private applyIndustryOptimizations(): void {
    // Optimize for headshot and portfolio viewing
    const viewportMetaTag = document.querySelector('meta[name="viewport"]');
    if (viewportMetaTag) {
      viewportMetaTag.setAttribute('content', 
        'width=device-width, initial-scale=1, viewport-fit=cover'
      );
    }
    
    // Add industry-specific CSS classes
    document.body.classList.add('entertainment-industry', 'mumbai-optimized');
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Language change detection
    window.addEventListener('languagechange', async () => {
      if (this.config.enableMultilingualSupport) {
        const newLanguage = this.multilingualManager.detectUserLanguage();
        await this.multilingualManager.setLanguage(newLanguage);
      }
    });

    // Network status change
    window.addEventListener('online', () => {
      if (this.config.enableFontOptimization) {
        this.fontLoadingStrategy.loadFontsProgressively();
      }
    });

    // Visibility change (for performance optimization)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.config.enablePerformanceMonitoring) {
        // Pause non-critical monitoring when page is hidden
        this.pausePerformanceMonitoring();
      } else if (!document.hidden) {
        // Resume monitoring when page becomes visible
        this.resumePerformanceMonitoring();
      }
    });
  }

  /**
   * Get system status
   */
  getSystemStatus(): object {
    return {
      initialized: this.isInitialized,
      config: this.config,
      fontLoadingStatus: this.fontLoadingStrategy ? 'active' : 'inactive',
      multilingualStatus: this.multilingualManager ? 'active' : 'inactive',
      accessibilityStatus: this.accessibilityManager ? 'active' : 'inactive',
      performanceMonitoringStatus: this.performanceMonitor ? 'active' : 'inactive',
      currentLanguage: this.multilingualManager?.detectUserLanguage() || 'en',
      loadedFonts: document.fonts ? Array.from(document.fonts).map(f => f.family) : [],
      performanceMetrics: this.performanceMonitor?.getMetrics() || {}
    };
  }

  /**
   * Update system configuration
   */
  updateConfig(newConfig: Partial<CastMatchTypographyConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.debugMode) {
      console.log('Typography system configuration updated:', this.config);
    }
  }

  /**
   * Change language programmatically
   */
  async changeLanguage(languageCode: string): Promise<void> {
    if (!this.config.enableMultilingualSupport) {
      console.warn('Multilingual support is disabled');
      return;
    }
    
    try {
      await this.multilingualManager.setLanguage(languageCode);
      console.log(`Language changed to: ${languageCode}`);
    } catch (error) {
      console.error(`Failed to change language to ${languageCode}:`, error);
    }
  }

  /**
   * Update accessibility preferences
   */
  updateAccessibilityPreferences(preferences: any): void {
    if (!this.config.enableAccessibilityScaling) {
      console.warn('Accessibility scaling is disabled');
      return;
    }
    
    // Apply preferences
    if (preferences.fontSize) {
      this.accessibilityManager.setFontSize(preferences.fontSize);
    }
    if (preferences.contrast) {
      this.accessibilityManager.setContrast(preferences.contrast);
    }
    if (preferences.dyslexia !== undefined) {
      this.accessibilityManager.setDyslexiaFriendly(preferences.dyslexia);
    }
  }

  /**
   * Get typography metrics for analytics
   */
  getTypographyMetrics(): object {
    const metrics = this.performanceMonitor?.getMetrics() || {};
    const systemStatus = this.getSystemStatus();
    
    return {
      timestamp: Date.now(),
      system: systemStatus,
      performance: metrics,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio
      }
    };
  }

  /**
   * Send performance metrics to analytics
   */
  private sendPerformanceMetrics(event: string, data: any): void {
    // Implementation for sending to analytics service
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'typography_performance', {
        event_category: 'Typography',
        event_label: event,
        value: data,
        custom_map: { metric_1: 'typography_system' }
      });
    }
  }

  /**
   * Log system status (debug mode)
   */
  private logSystemStatus(): void {
    const status = this.getSystemStatus();
    console.group('🎭 CastMatch Typography System Status');
    console.table(status);
    console.groupEnd();
  }

  /**
   * Pause performance monitoring
   */
  private pausePerformanceMonitoring(): void {
    // Implementation for pausing monitoring
    if (this.config.debugMode) {
      console.log('Performance monitoring paused');
    }
  }

  /**
   * Resume performance monitoring
   */
  private resumePerformanceMonitoring(): void {
    // Implementation for resuming monitoring
    if (this.config.debugMode) {
      console.log('Performance monitoring resumed');
    }
  }

  /**
   * Cleanup and destroy the typography system
   */
  destroy(): void {
    // Remove event listeners
    window.removeEventListener('languagechange', this.changeLanguage);
    window.removeEventListener('online', this.initializeFontOptimization);
    document.removeEventListener('visibilitychange', this.pausePerformanceMonitoring);
    
    // Reset document classes
    document.documentElement.classList.remove('castmatch-typography');
    document.body.classList.remove('entertainment-industry', 'mumbai-optimized');
    
    this.isInitialized = false;
    
    if (this.config.debugMode) {
      console.log('🧹 CastMatch Typography System destroyed');
    }
  }
}

// Global instance management
let globalTypographySystem: CastMatchTypographySystem | null = null;

/**
 * Initialize the global CastMatch Typography System
 */
export async function initializeCastMatchTypography(
  config?: Partial<CastMatchTypographyConfig>
): Promise<CastMatchTypographySystem> {
  if (globalTypographySystem) {
    console.warn('CastMatch Typography System already initialized globally');
    return globalTypographySystem;
  }

  globalTypographySystem = new CastMatchTypographySystem(config);
  await globalTypographySystem.initialize();
  
  return globalTypographySystem;
}

/**
 * Get the global typography system instance
 */
export function getCastMatchTypography(): CastMatchTypographySystem | null {
  return globalTypographySystem;
}

/**
 * Destroy the global typography system
 */
export function destroyCastMatchTypography(): void {
  if (globalTypographySystem) {
    globalTypographySystem.destroy();
    globalTypographySystem = null;
  }
}

// Auto-initialize if in browser environment
if (typeof window !== 'undefined' && document.readyState !== 'loading') {
  // Initialize with default config if no explicit initialization
  setTimeout(() => {
    if (!globalTypographySystem) {
      initializeCastMatchTypography();
    }
  }, 100);
} else if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    if (!globalTypographySystem) {
      initializeCastMatchTypography();
    }
  });
}

// Export individual managers for advanced usage
export {
  FontLoadingStrategy,
  MultilingualTypographyManager,
  AccessibilityScalingManager,
  FontOptimizationUtils,
  FontPerformanceMonitor
};

// Export utility functions
export {
  initializeFontLoading,
  initializeMultilingualSupport,
  initializeAccessibilityScaling,
  initializeFontOptimization
};

export default CastMatchTypographySystem;