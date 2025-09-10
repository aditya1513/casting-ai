/**
 * CastMatch Multilingual Typography Support
 * Optimized for Mumbai Entertainment Industry Languages
 */

export interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  fontFamily: string;
  fallbackFonts: string[];
  unicodeRange: string;
  scriptType: string;
  lineHeight: number;
  letterSpacing: string;
  wordSpacing: string;
}

export interface TypographyScale {
  heroHeadline: string;
  sectionTitle: string;
  subsection: string;
  body: string;
  caption: string;
  label: string;
}

// Supported Languages for CastMatch Mumbai Operations
export const SUPPORTED_LANGUAGES: Record<string, LanguageConfig> = {
  // English (Primary)
  'en': {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    fontFamily: 'Inter var, SF Pro Display',
    fallbackFonts: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
    unicodeRange: 'U+0020-007F, U+00A0-00FF, U+0100-017F',
    scriptType: 'latin',
    lineHeight: 1.5,
    letterSpacing: '0em',
    wordSpacing: '0em'
  },

  // Hindi (Primary Indian Language)
  'hi': {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    direction: 'ltr',
    fontFamily: 'Noto Sans Devanagari, Inter var',
    fallbackFonts: ['Arial Unicode MS', 'Mangal', 'Devanagari MT', 'sans-serif'],
    unicodeRange: 'U+0900-097F, U+1CD0-1CFF, U+200C-200D, U+20A8, U+20B9, U+25CC, U+A830-A839, U+A8E0-A8FF',
    scriptType: 'devanagari',
    lineHeight: 1.6,
    letterSpacing: '0.01em',
    wordSpacing: '0.1em'
  },

  // Marathi (Maharashtra State Language)
  'mr': {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    direction: 'ltr',
    fontFamily: 'Noto Sans Devanagari, Inter var',
    fallbackFonts: ['Arial Unicode MS', 'Mangal', 'Devanagari MT', 'sans-serif'],
    unicodeRange: 'U+0900-097F, U+1CD0-1CFF, U+200C-200D',
    scriptType: 'devanagari',
    lineHeight: 1.6,
    letterSpacing: '0.01em',
    wordSpacing: '0.1em'
  },

  // Tamil (South Indian Film Industry)
  'ta': {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    direction: 'ltr',
    fontFamily: 'Noto Sans Tamil, Inter var',
    fallbackFonts: ['Arial Unicode MS', 'Tamil MN', 'sans-serif'],
    unicodeRange: 'U+0B82-0BFA, U+200C-200D',
    scriptType: 'tamil',
    lineHeight: 1.65,
    letterSpacing: '0.02em',
    wordSpacing: '0.15em'
  },

  // Telugu (Tollywood Film Industry)
  'te': {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    direction: 'ltr',
    fontFamily: 'Noto Sans Telugu, Inter var',
    fallbackFonts: ['Arial Unicode MS', 'Telugu MN', 'sans-serif'],
    unicodeRange: 'U+0C00-0C7F, U+200C-200D',
    scriptType: 'telugu',
    lineHeight: 1.65,
    letterSpacing: '0.015em',
    wordSpacing: '0.12em'
  },

  // Gujarati (Entertainment Industry Presence)
  'gu': {
    code: 'gu',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    direction: 'ltr',
    fontFamily: 'Noto Sans Gujarati, Inter var',
    fallbackFonts: ['Arial Unicode MS', 'Gujarati MT', 'sans-serif'],
    unicodeRange: 'U+0A80-0AFF, U+200C-200D',
    scriptType: 'gujarati',
    lineHeight: 1.6,
    letterSpacing: '0.01em',
    wordSpacing: '0.1em'
  },

  // Punjabi (North Indian Entertainment)
  'pa': {
    code: 'pa',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    direction: 'ltr',
    fontFamily: 'Noto Sans Gurmukhi, Inter var',
    fallbackFonts: ['Arial Unicode MS', 'Gurmukhi MT', 'sans-serif'],
    unicodeRange: 'U+0A00-0A7F, U+200C-200D',
    scriptType: 'gurmukhi',
    lineHeight: 1.6,
    letterSpacing: '0.01em',
    wordSpacing: '0.1em'
  }
};

// Typography scales adjusted for each language's reading patterns
export const LANGUAGE_TYPOGRAPHY_SCALES: Record<string, TypographyScale> = {
  'en': {
    heroHeadline: 'clamp(3rem, 8vw, 4.5rem)', // 48-72px
    sectionTitle: 'clamp(2rem, 5vw, 3rem)',   // 32-48px
    subsection: 'clamp(1.5rem, 4vw, 2rem)',   // 24-32px
    body: 'clamp(1rem, 2.5vw, 1.125rem)',     // 16-18px
    caption: '0.875rem',                       // 14px
    label: '0.75rem'                          // 12px
  },

  'hi': {
    heroHeadline: 'clamp(3.2rem, 8vw, 4.8rem)', // Slightly larger for Devanagari
    sectionTitle: 'clamp(2.2rem, 5vw, 3.2rem)',
    subsection: 'clamp(1.6rem, 4vw, 2.2rem)',
    body: 'clamp(1.125rem, 2.5vw, 1.25rem)',    // Larger body text
    caption: '1rem',
    label: '0.875rem'
  },

  'mr': {
    heroHeadline: 'clamp(3.2rem, 8vw, 4.8rem)',
    sectionTitle: 'clamp(2.2rem, 5vw, 3.2rem)',
    subsection: 'clamp(1.6rem, 4vw, 2.2rem)',
    body: 'clamp(1.125rem, 2.5vw, 1.25rem)',
    caption: '1rem',
    label: '0.875rem'
  },

  'ta': {
    heroHeadline: 'clamp(3.4rem, 8vw, 5rem)',   // Tamil script needs more space
    sectionTitle: 'clamp(2.4rem, 5vw, 3.4rem)',
    subsection: 'clamp(1.7rem, 4vw, 2.4rem)',
    body: 'clamp(1.25rem, 2.5vw, 1.375rem)',
    caption: '1.125rem',
    label: '1rem'
  },

  'te': {
    heroHeadline: 'clamp(3.4rem, 8vw, 5rem)',
    sectionTitle: 'clamp(2.4rem, 5vw, 3.4rem)',
    subsection: 'clamp(1.7rem, 4vw, 2.4rem)',
    body: 'clamp(1.25rem, 2.5vw, 1.375rem)',
    caption: '1.125rem',
    label: '1rem'
  },

  'gu': {
    heroHeadline: 'clamp(3.2rem, 8vw, 4.8rem)',
    sectionTitle: 'clamp(2.2rem, 5vw, 3.2rem)',
    subsection: 'clamp(1.6rem, 4vw, 2.2rem)',
    body: 'clamp(1.125rem, 2.5vw, 1.25rem)',
    caption: '1rem',
    label: '0.875rem'
  },

  'pa': {
    heroHeadline: 'clamp(3.2rem, 8vw, 4.8rem)',
    sectionTitle: 'clamp(2.2rem, 5vw, 3.2rem)',
    subsection: 'clamp(1.6rem, 4vw, 2.2rem)',
    body: 'clamp(1.125rem, 2.5vw, 1.25rem)',
    caption: '1rem',
    label: '0.875rem'
  }
};

// Industry-specific terminology translations
export const CASTING_TERMINOLOGY: Record<string, Record<string, string>> = {
  'en': {
    'audition': 'Audition',
    'casting_call': 'Casting Call',
    'talent': 'Talent',
    'role': 'Role',
    'callback': 'Callback',
    'portfolio': 'Portfolio',
    'headshot': 'Headshot',
    'reel': 'Demo Reel',
    'character': 'Character',
    'scene': 'Scene',
    'script': 'Script',
    'director': 'Director',
    'producer': 'Producer',
    'agent': 'Agent',
    'casting_director': 'Casting Director'
  },

  'hi': {
    'audition': 'ऑडिशन',
    'casting_call': 'कास्टिंग कॉल',
    'talent': 'कलाकार',
    'role': 'भूमिका',
    'callback': 'कॉलबैक',
    'portfolio': 'पोर्टफोलियो',
    'headshot': 'हेडशॉट',
    'reel': 'डेमो रील',
    'character': 'किरदार',
    'scene': 'दृश्य',
    'script': 'स्क्रिप्ट',
    'director': 'निदेशक',
    'producer': 'निर्माता',
    'agent': 'एजेंट',
    'casting_director': 'कास्टिंग डायरेक्टर'
  },

  'mr': {
    'audition': 'ऑडिशन',
    'casting_call': 'कास्टिंग कॉल',
    'talent': 'कलाकार',
    'role': 'भूमिका',
    'callback': 'कॉलबॅक',
    'portfolio': 'पोर्टफोलिओ',
    'headshot': 'हेडशॉट',
    'reel': 'डेमो रील',
    'character': 'पात्र',
    'scene': 'दृश्य',
    'script': 'स्क्रिप्ट',
    'director': 'दिग्दर्शक',
    'producer': 'निर्माता',
    'agent': 'एजंट',
    'casting_director': 'कास्टिंग डायरेक्टर'
  },

  'ta': {
    'audition': 'ஆடிஷன்',
    'casting_call': 'காஸ்டிங் கால்',
    'talent': 'கலைஞர்',
    'role': 'பாத்திரம்',
    'callback': 'கால்பேக்',
    'portfolio': 'போர்ட்ஃபோலியோ',
    'headshot': 'ஹெட்ஷாட்',
    'reel': 'டெமோ ரீல்',
    'character': 'பாத்திரம்',
    'scene': 'காட்சி',
    'script': 'ஸ்கிரிப்ட்',
    'director': 'இயக்குநர்',
    'producer': 'தயாரிப்பாளர்',
    'agent': 'முகவர்',
    'casting_director': 'காஸ்டிங் டைரக்டர்'
  },

  'te': {
    'audition': 'ఆడిషన్',
    'casting_call': 'కాస్టింగ్ కాల్',
    'talent': 'కళాకారుడు',
    'role': 'పాత్ర',
    'callback': 'కాల్‌బ్యాక్',
    'portfolio': 'పోర్ట్‌ఫోలియో',
    'headshot': 'హెడ్‌షాట్',
    'reel': 'డెమో రీల్',
    'character': 'పాత్ర',
    'scene': 'దృశ్యం',
    'script': 'స్క్రిప్ట్',
    'director': 'దర్శకుడు',
    'producer': 'నిర్మాత',
    'agent': 'ఏజెంట్',
    'casting_director': 'కాస్టింగ్ డైరెక్టర్'
  }
};

export class MultilingualTypographyManager {
  private currentLanguage: string = 'en';
  private loadedFonts: Set<string> = new Set();
  
  /**
   * Set the active language for the application
   */
  async setLanguage(languageCode: string): Promise<void> {
    if (!SUPPORTED_LANGUAGES[languageCode]) {
      throw new Error(`Unsupported language: ${languageCode}`);
    }
    
    this.currentLanguage = languageCode;
    await this.loadLanguageFont(languageCode);
    this.applyLanguageStyles(languageCode);
    this.updateDocumentDirection(languageCode);
  }
  
  /**
   * Load font for specific language
   */
  private async loadLanguageFont(languageCode: string): Promise<void> {
    const config = SUPPORTED_LANGUAGES[languageCode];
    const fontKey = `${config.fontFamily}-${languageCode}`;
    
    if (!this.loadedFonts.has(fontKey)) {
      try {
        const fontFace = new FontFace(
          config.fontFamily.split(',')[0].trim(),
          `url("/fonts/${config.scriptType}/${config.code}.woff2")`,
          {
            display: 'swap',
            unicodeRange: config.unicodeRange
          }
        );
        
        await fontFace.load();
        document.fonts.add(fontFace);
        this.loadedFonts.add(fontKey);
        
        console.log(`Font loaded for ${config.name}: ${config.fontFamily}`);
      } catch (error) {
        console.error(`Failed to load font for ${config.name}:`, error);
      }
    }
  }
  
  /**
   * Apply language-specific typography styles
   */
  private applyLanguageStyles(languageCode: string): void {
    const config = SUPPORTED_LANGUAGES[languageCode];
    const scale = LANGUAGE_TYPOGRAPHY_SCALES[languageCode];
    
    // Update CSS custom properties
    document.documentElement.style.setProperty('--font-family-primary', config.fontFamily);
    document.documentElement.style.setProperty('--font-family-fallback', config.fallbackFonts.join(', '));
    document.documentElement.style.setProperty('--line-height-base', config.lineHeight.toString());
    document.documentElement.style.setProperty('--letter-spacing-base', config.letterSpacing);
    document.documentElement.style.setProperty('--word-spacing-base', config.wordSpacing);
    
    // Update typography scale
    Object.entries(scale).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--font-size-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value);
    });
    
    // Add language class to document
    document.documentElement.classList.remove(...Object.keys(SUPPORTED_LANGUAGES).map(lang => `lang-${lang}`));
    document.documentElement.classList.add(`lang-${languageCode}`);
    document.documentElement.lang = languageCode;
  }
  
  /**
   * Update document direction for RTL languages
   */
  private updateDocumentDirection(languageCode: string): void {
    const config = SUPPORTED_LANGUAGES[languageCode];
    document.documentElement.dir = config.direction;
  }
  
  /**
   * Get translated casting terminology
   */
  getTerm(key: string, languageCode?: string): string {
    const lang = languageCode || this.currentLanguage;
    return CASTING_TERMINOLOGY[lang]?.[key] || CASTING_TERMINOLOGY['en'][key] || key;
  }
  
  /**
   * Generate language-specific CSS
   */
  generateLanguageCSS(languageCode: string): string {
    const config = SUPPORTED_LANGUAGES[languageCode];
    const scale = LANGUAGE_TYPOGRAPHY_SCALES[languageCode];
    
    return `
      .lang-${languageCode} {
        --font-family-primary: ${config.fontFamily};
        --font-family-fallback: ${config.fallbackFonts.join(', ')};
        --line-height-base: ${config.lineHeight};
        --letter-spacing-base: ${config.letterSpacing};
        --word-spacing-base: ${config.wordSpacing};
        --text-direction: ${config.direction};
        
        /* Typography Scale */
        --font-size-hero-headline: ${scale.heroHeadline};
        --font-size-section-title: ${scale.sectionTitle};
        --font-size-subsection: ${scale.subsection};
        --font-size-body: ${scale.body};
        --font-size-caption: ${scale.caption};
        --font-size-label: ${scale.label};
      }
      
      .lang-${languageCode} .hero-headline {
        font-family: var(--font-family-primary);
        font-size: var(--font-size-hero-headline);
        line-height: var(--line-height-base);
        letter-spacing: var(--letter-spacing-base);
        word-spacing: var(--word-spacing-base);
      }
      
      .lang-${languageCode} .body-text {
        font-family: var(--font-family-primary);
        font-size: var(--font-size-body);
        line-height: var(--line-height-base);
        letter-spacing: var(--letter-spacing-base);
        word-spacing: var(--word-spacing-base);
      }
    `;
  }
  
  /**
   * Detect user's preferred language from browser settings
   */
  detectUserLanguage(): string {
    const browserLanguages = navigator.languages || [navigator.language];
    
    for (const lang of browserLanguages) {
      const shortLang = lang.split('-')[0];
      if (SUPPORTED_LANGUAGES[shortLang]) {
        return shortLang;
      }
    }
    
    return 'en'; // Default fallback
  }
  
  /**
   * Get all available languages
   */
  getAvailableLanguages(): Array<{ code: string; name: string; nativeName: string }> {
    return Object.entries(SUPPORTED_LANGUAGES).map(([code, config]) => ({
      code,
      name: config.name,
      nativeName: config.nativeName
    }));
  }
  
  /**
   * Format text for specific language requirements
   */
  formatText(text: string, languageCode?: string): string {
    const lang = languageCode || this.currentLanguage;
    const config = SUPPORTED_LANGUAGES[lang];
    
    // Apply language-specific text formatting rules
    switch (config.scriptType) {
      case 'devanagari':
        // Ensure proper word breaks for Hindi/Marathi
        return text.replace(/\s+/g, ' ').trim();
      
      case 'tamil':
      case 'telugu':
        // Handle Tamil/Telugu text formatting
        return text.replace(/\s+/g, ' ').trim();
      
      default:
        return text.trim();
    }
  }
}

// Initialize multilingual typography manager
export const multilingualTypography = new MultilingualTypographyManager();

// Auto-detect and set language on initialization
export const initializeMultilingualSupport = async (): Promise<void> => {
  const detectedLanguage = multilingualTypography.detectUserLanguage();
  await multilingualTypography.setLanguage(detectedLanguage);
};