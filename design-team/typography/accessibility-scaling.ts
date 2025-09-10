/**
 * CastMatch Dynamic Accessibility Scaling System
 * WCAG AAA Compliant Typography with User Preferences
 */

export interface AccessibilityConfig {
  fontScale: number;
  lineHeightScale: number;
  letterSpacingScale: number;
  contrastMode: 'normal' | 'high' | 'max';
  dyslexiaFriendly: boolean;
  motionReduced: boolean;
  screenReaderOptimized: boolean;
}

export interface AccessibilityPreferences {
  fontSize: 'small' | 'normal' | 'large' | 'extra-large';
  contrast: 'normal' | 'high' | 'maximum';
  motion: 'normal' | 'reduced' | 'none';
  dyslexia: boolean;
  screenReader: boolean;
  colorBlindness: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
}

export interface ContrastRatios {
  normal: {
    text: number;
    largeText: number;
    ui: number;
  };
  high: {
    text: number;
    largeText: number;
    ui: number;
  };
  maximum: {
    text: number;
    largeText: number;
    ui: number;
  };
}

// WCAG AAA Contrast Requirements
export const CONTRAST_RATIOS: ContrastRatios = {
  normal: {
    text: 7.0,    // AAA Normal Text
    largeText: 4.5, // AAA Large Text
    ui: 3.0       // AA UI Components
  },
  high: {
    text: 12.0,   // Enhanced High Contrast
    largeText: 7.0,
    ui: 4.5
  },
  maximum: {
    text: 21.0,   // Maximum Contrast
    largeText: 12.0,
    ui: 7.0
  }
};

// Font scaling multipliers
export const FONT_SCALE_MULTIPLIERS = {
  'small': 0.875,      // 87.5% - 14px base becomes 12px
  'normal': 1.0,       // 100% - Default
  'large': 1.25,       // 125% - 16px becomes 20px
  'extra-large': 1.5   // 150% - 16px becomes 24px
};

// Dyslexia-friendly font stacks
export const DYSLEXIA_FRIENDLY_FONTS = {
  primary: 'OpenDyslexic, "Comic Sans MS", Verdana, Arial, sans-serif',
  monospace: 'OpenDyslexic Mono, "Courier New", monospace',
  fallback: 'Verdana, "Trebuchet MS", Arial, sans-serif'
};

// Color schemes for different contrast modes
export const COLOR_SCHEMES = {
  normal: {
    light: {
      background: '#FFFFFF',
      surface: '#F8F9FA',
      text: '#1A1A1A',
      textSecondary: '#666666',
      accent: '#007AFF',
      border: '#E5E5E5'
    },
    dark: {
      background: '#0D0D0D',
      surface: '#1A1A1A',
      text: '#FAFAFA',
      textSecondary: '#B3B3B3',
      accent: '#0A84FF',
      border: '#333333'
    }
  },
  high: {
    light: {
      background: '#FFFFFF',
      surface: '#FFFFFF',
      text: '#000000',
      textSecondary: '#000000',
      accent: '#0000FF',
      border: '#000000'
    },
    dark: {
      background: '#000000',
      surface: '#000000',
      text: '#FFFFFF',
      textSecondary: '#FFFFFF',
      accent: '#FFFF00',
      border: '#FFFFFF'
    }
  },
  maximum: {
    light: {
      background: '#FFFFFF',
      surface: '#FFFFFF',
      text: '#000000',
      textSecondary: '#000000',
      accent: '#FF0000',
      border: '#000000'
    },
    dark: {
      background: '#000000',
      surface: '#000000',
      text: '#FFFFFF',
      textSecondary: '#FFFFFF',
      accent: '#00FF00',
      border: '#FFFFFF'
    }
  }
};

export class AccessibilityScalingManager {
  private preferences: AccessibilityPreferences = {
    fontSize: 'normal',
    contrast: 'normal',
    motion: 'normal',
    dyslexia: false,
    screenReader: false,
    colorBlindness: 'none'
  };
  
  private observers: Set<(preferences: AccessibilityPreferences) => void> = new Set();
  
  constructor() {
    this.loadUserPreferences();
    this.initializeMediaQueries();
    this.detectSystemPreferences();
  }
  
  /**
   * Set font size preference
   */
  setFontSize(size: AccessibilityPreferences['fontSize']): void {
    this.preferences.fontSize = size;
    this.applyFontScaling();
    this.savePreferences();
    this.notifyObservers();
  }
  
  /**
   * Set contrast preference
   */
  setContrast(contrast: AccessibilityPreferences['contrast']): void {
    this.preferences.contrast = contrast;
    this.applyContrastMode();
    this.savePreferences();
    this.notifyObservers();
  }
  
  /**
   * Enable/disable dyslexia-friendly mode
   */
  setDyslexiaFriendly(enabled: boolean): void {
    this.preferences.dyslexia = enabled;
    this.applyDyslexiaFriendlyFonts();
    this.savePreferences();
    this.notifyObservers();
  }
  
  /**
   * Set motion preference
   */
  setMotionPreference(motion: AccessibilityPreferences['motion']): void {
    this.preferences.motion = motion;
    this.applyMotionSettings();
    this.savePreferences();
    this.notifyObservers();
  }
  
  /**
   * Enable/disable screen reader optimizations
   */
  setScreenReaderMode(enabled: boolean): void {
    this.preferences.screenReader = enabled;
    this.applyScreenReaderOptimizations();
    this.savePreferences();
    this.notifyObservers();
  }
  
  /**
   * Set color blindness accommodation
   */
  setColorBlindnessMode(type: AccessibilityPreferences['colorBlindness']): void {
    this.preferences.colorBlindness = type;
    this.applyColorBlindnessAccommodations();
    this.savePreferences();
    this.notifyObservers();
  }
  
  /**
   * Apply font scaling based on user preference
   */
  private applyFontScaling(): void {
    const multiplier = FONT_SCALE_MULTIPLIERS[this.preferences.fontSize];
    
    // Update CSS custom properties for responsive scaling
    document.documentElement.style.setProperty('--accessibility-font-scale', multiplier.toString());
    
    // Update all typography scales
    const scales = [
      'hero-headline',
      'section-title', 
      'subsection',
      'body',
      'caption',
      'label'
    ];
    
    scales.forEach(scale => {
      const originalValue = getComputedStyle(document.documentElement)
        .getPropertyValue(`--font-size-${scale}-base`) || '1rem';
      
      // Apply scaling to clamp() functions
      if (originalValue.includes('clamp(')) {
        const scaledValue = this.scaleClampValue(originalValue, multiplier);
        document.documentElement.style.setProperty(`--font-size-${scale}`, scaledValue);
      } else {
        document.documentElement.style.setProperty(
          `--font-size-${scale}`, 
          `calc(${originalValue} * ${multiplier})`
        );
      }
    });
    
    // Apply line height scaling for readability
    const lineHeightScale = Math.max(1.0, multiplier * 0.8 + 0.4);
    document.documentElement.style.setProperty('--accessibility-line-height-scale', lineHeightScale.toString());
    
    // Apply letter spacing for larger text
    const letterSpacingScale = multiplier > 1.25 ? '0.02em' : '0em';
    document.documentElement.style.setProperty('--accessibility-letter-spacing', letterSpacingScale);
    
    // Update accessibility class
    document.documentElement.classList.remove('font-small', 'font-normal', 'font-large', 'font-extra-large');
    document.documentElement.classList.add(`font-${this.preferences.fontSize}`);
  }
  
  /**
   * Apply contrast mode
   */
  private applyContrastMode(): void {
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const scheme = COLOR_SCHEMES[this.preferences.contrast];
    const colors = isDarkMode ? scheme.dark : scheme.light;
    
    // Apply color scheme
    Object.entries(colors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--color-${key}`, value);
    });
    
    // Update contrast class
    document.documentElement.classList.remove('contrast-normal', 'contrast-high', 'contrast-maximum');
    document.documentElement.classList.add(`contrast-${this.preferences.contrast}`);
    
    // Apply additional contrast enhancements
    if (this.preferences.contrast === 'high' || this.preferences.contrast === 'maximum') {
      document.documentElement.style.setProperty('--shadow-strength', '0');
      document.documentElement.style.setProperty('--border-width', '2px');
      document.documentElement.style.setProperty('--focus-ring-width', '3px');
    }
  }
  
  /**
   * Apply dyslexia-friendly fonts
   */
  private applyDyslexiaFriendlyFonts(): void {
    if (this.preferences.dyslexia) {
      document.documentElement.style.setProperty('--font-family-primary', DYSLEXIA_FRIENDLY_FONTS.primary);
      document.documentElement.style.setProperty('--font-family-monospace', DYSLEXIA_FRIENDLY_FONTS.monospace);
      document.documentElement.classList.add('dyslexia-friendly');
      
      // Increase letter spacing for dyslexic readers
      document.documentElement.style.setProperty('--accessibility-letter-spacing', '0.12em');
      document.documentElement.style.setProperty('--accessibility-word-spacing', '0.16em');
    } else {
      document.documentElement.style.removeProperty('--font-family-primary');
      document.documentElement.style.removeProperty('--font-family-monospace');
      document.documentElement.classList.remove('dyslexia-friendly');
    }
  }
  
  /**
   * Apply motion settings
   */
  private applyMotionSettings(): void {
    const motionClass = `motion-${this.preferences.motion}`;
    document.documentElement.classList.remove('motion-normal', 'motion-reduced', 'motion-none');
    document.documentElement.classList.add(motionClass);
    
    if (this.preferences.motion === 'reduced' || this.preferences.motion === 'none') {
      document.documentElement.style.setProperty('--animation-duration', '0.01ms');
      document.documentElement.style.setProperty('--transition-duration', '0.01ms');
    } else {
      document.documentElement.style.removeProperty('--animation-duration');
      document.documentElement.style.removeProperty('--transition-duration');
    }
  }
  
  /**
   * Apply screen reader optimizations
   */
  private applyScreenReaderOptimizations(): void {
    if (this.preferences.screenReader) {
      document.documentElement.classList.add('screen-reader-optimized');
      
      // Enhance focus indicators
      document.documentElement.style.setProperty('--focus-ring-width', '4px');
      document.documentElement.style.setProperty('--focus-ring-offset', '2px');
      
      // Improve text spacing
      document.documentElement.style.setProperty('--accessibility-paragraph-spacing', '1.5em');
      document.documentElement.style.setProperty('--accessibility-line-height-scale', '1.7');
    } else {
      document.documentElement.classList.remove('screen-reader-optimized');
    }
  }
  
  /**
   * Apply color blindness accommodations
   */
  private applyColorBlindnessAccommodations(): void {
    if (this.preferences.colorBlindness !== 'none') {
      document.documentElement.classList.add(`colorblind-${this.preferences.colorBlindness}`);
      
      // Apply color blind-friendly palette
      const colorBlindPalette = this.getColorBlindFriendlyPalette(this.preferences.colorBlindness);
      Object.entries(colorBlindPalette).forEach(([key, value]) => {
        document.documentElement.style.setProperty(`--color-${key}`, value);
      });
    } else {
      document.documentElement.classList.remove('colorblind-protanopia', 'colorblind-deuteranopia', 'colorblind-tritanopia');
    }
  }
  
  /**
   * Scale clamp() values proportionally
   */
  private scaleClampValue(clampValue: string, multiplier: number): string {
    const clampRegex = /clamp\(([\d.]+(?:rem|px|em)), ([\d.]+(?:vw|vh|%)), ([\d.]+(?:rem|px|em))\)/;
    const match = clampValue.match(clampRegex);
    
    if (match) {
      const [, min, preferred, max] = match;
      const scaledMin = this.scaleUnit(min, multiplier);
      const scaledMax = this.scaleUnit(max, multiplier);
      return `clamp(${scaledMin}, ${preferred}, ${scaledMax})`;
    }
    
    return `calc(${clampValue} * ${multiplier})`;
  }
  
  /**
   * Scale CSS unit values
   */
  private scaleUnit(value: string, multiplier: number): string {
    const numericValue = parseFloat(value);
    const unit = value.replace(numericValue.toString(), '');
    return `${(numericValue * multiplier).toFixed(3)}${unit}`;
  }
  
  /**
   * Get color palette for specific color blindness type
   */
  private getColorBlindFriendlyPalette(type: string): Record<string, string> {
    const palettes = {
      protanopia: {
        primary: '#0066CC',    // Blue instead of red
        success: '#0088FF',    // Blue-green
        warning: '#FF8800',    // Orange
        error: '#FF4400',      // Orange-red
        accent: '#6600CC'      // Purple
      },
      deuteranopia: {
        primary: '#0066CC',
        success: '#0088FF',
        warning: '#FF8800',
        error: '#FF4400',
        accent: '#6600CC'
      },
      tritanopia: {
        primary: '#FF0066',    // Magenta
        success: '#00CC66',    // Green
        warning: '#FF8800',    // Orange
        error: '#CC0066',      // Dark magenta
        accent: '#0066FF'      // Blue
      }
    };
    
    return palettes[type as keyof typeof palettes] || {};
  }
  
  /**
   * Detect system accessibility preferences
   */
  private detectSystemPreferences(): void {
    // Detect prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.preferences.motion = 'reduced';
    }
    
    // Detect high contrast preference
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      this.preferences.contrast = 'high';
    }
    
    // Detect large text preference
    if (window.matchMedia('(prefers-text: large)').matches) {
      this.preferences.fontSize = 'large';
    }
    
    // Apply detected preferences
    this.applyAllSettings();
  }
  
  /**
   * Initialize media query listeners
   */
  private initializeMediaQueries(): void {
    // Listen for reduced motion changes
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      if (e.matches) {
        this.setMotionPreference('reduced');
      }
    });
    
    // Listen for contrast preference changes
    window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
      if (e.matches) {
        this.setContrast('high');
      }
    });
  }
  
  /**
   * Apply all current settings
   */
  private applyAllSettings(): void {
    this.applyFontScaling();
    this.applyContrastMode();
    this.applyDyslexiaFriendlyFonts();
    this.applyMotionSettings();
    this.applyScreenReaderOptimizations();
    this.applyColorBlindnessAccommodations();
  }
  
  /**
   * Save preferences to localStorage
   */
  private savePreferences(): void {
    localStorage.setItem('castmatch-accessibility-preferences', JSON.stringify(this.preferences));
  }
  
  /**
   * Load preferences from localStorage
   */
  private loadUserPreferences(): void {
    const saved = localStorage.getItem('castmatch-accessibility-preferences');
    if (saved) {
      try {
        this.preferences = { ...this.preferences, ...JSON.parse(saved) };
      } catch (error) {
        console.error('Failed to load accessibility preferences:', error);
      }
    }
  }
  
  /**
   * Subscribe to preference changes
   */
  subscribe(callback: (preferences: AccessibilityPreferences) => void): () => void {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }
  
  /**
   * Notify observers of preference changes
   */
  private notifyObservers(): void {
    this.observers.forEach(callback => callback(this.preferences));
  }
  
  /**
   * Get current preferences
   */
  getPreferences(): AccessibilityPreferences {
    return { ...this.preferences };
  }
  
  /**
   * Reset to default preferences
   */
  resetToDefaults(): void {
    this.preferences = {
      fontSize: 'normal',
      contrast: 'normal',
      motion: 'normal',
      dyslexia: false,
      screenReader: false,
      colorBlindness: 'none'
    };
    
    this.applyAllSettings();
    this.savePreferences();
    this.notifyObservers();
  }
  
  /**
   * Generate accessibility settings CSS
   */
  generateAccessibilityCSS(): string {
    return `
      /* Font Size Scaling */
      .font-small { --accessibility-font-scale: 0.875; }
      .font-normal { --accessibility-font-scale: 1.0; }
      .font-large { --accessibility-font-scale: 1.25; }
      .font-extra-large { --accessibility-font-scale: 1.5; }
      
      /* Contrast Modes */
      .contrast-high {
        --shadow-strength: 0;
        --border-width: 2px;
        filter: contrast(1.2);
      }
      
      .contrast-maximum {
        --shadow-strength: 0;
        --border-width: 3px;
        filter: contrast(2.0);
      }
      
      /* Motion Settings */
      .motion-reduced *,
      .motion-reduced *::before,
      .motion-reduced *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
      
      .motion-none * {
        animation: none !important;
        transition: none !important;
      }
      
      /* Dyslexia Friendly */
      .dyslexia-friendly {
        --font-family-primary: ${DYSLEXIA_FRIENDLY_FONTS.primary};
        --accessibility-letter-spacing: 0.12em;
        --accessibility-word-spacing: 0.16em;
      }
      
      /* Screen Reader Optimized */
      .screen-reader-optimized {
        --focus-ring-width: 4px;
        --focus-ring-offset: 2px;
        --accessibility-paragraph-spacing: 1.5em;
        --accessibility-line-height-scale: 1.7;
      }
      
      /* Focus Management */
      :focus-visible {
        outline: var(--focus-ring-width, 2px) solid var(--color-accent);
        outline-offset: var(--focus-ring-offset, 1px);
        border-radius: 4px;
      }
    `;
  }
}

// Initialize accessibility scaling manager
export const accessibilityManager = new AccessibilityScalingManager();

// Initialize accessibility features
export const initializeAccessibilityScaling = (): void => {
  accessibilityManager.detectSystemPreferences();
};