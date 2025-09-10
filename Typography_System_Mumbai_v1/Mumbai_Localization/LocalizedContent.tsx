// CastMatch Mumbai Localized Content Components
// Culturally optimized for Mumbai entertainment market

import React, { createContext, useContext, useState, useEffect } from 'react';

// Language Context
type Language = 'en' | 'hi' | 'mr' | 'ta' | 'te' | 'bn' | 'gu';

interface LocalizationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

// Mumbai-specific translations
const translations = {
  en: {
    // Welcome Messages
    'welcome.hero': 'Welcome to CastMatch',
    'welcome.subtitle': 'Where Bollywood Dreams Take Flight',
    'welcome.cta': 'Join Mumbai\'s Premier Casting Network',
    
    // Navigation
    'nav.home': 'Home',
    'nav.talents': 'Talents',
    'nav.auditions': 'Auditions',
    'nav.studios': 'Studios',
    'nav.profile': 'Profile',
    
    // Actions
    'action.search': 'Find Your Next Star',
    'action.book': 'Book Audition Now',
    'action.connect': 'Connect with Director',
    'action.share': 'Share Portfolio',
    'action.viewReel': 'View Show Reel',
    
    // Status Messages
    'status.loading': 'Setting the scene...',
    'status.error': 'Mumbai traffic in our servers! Try again',
    'status.success': 'Picture perfect! Action completed',
    'status.empty': 'No matches in this scene',
    
    // Industry Terms
    'industry.castingDirector': 'Casting Director',
    'industry.producer': 'Producer',
    'industry.actor': 'Actor',
    'industry.audition': 'Audition',
    'industry.screenTest': 'Screen Test',
    'industry.mahurat': 'Mahurat',
    
    // Festival Greetings
    'festival.ganesh': 'Ganpati Bappa Morya!',
    'festival.diwali': 'Shubh Deepavali!',
    'festival.holi': 'Happy Holi!',
    'festival.eid': 'Eid Mubarak!',
  },
  hi: {
    'welcome.hero': 'CastMatch में आपका स्वागत है',
    'welcome.subtitle': 'जहाँ बॉलीवुड के सपने उड़ान भरते हैं',
    'welcome.cta': 'मुंबई के प्रमुख कास्टिंग नेटवर्क से जुड़ें',
    
    'nav.home': 'होम',
    'nav.talents': 'कलाकार',
    'nav.auditions': 'ऑडिशन',
    'nav.studios': 'स्टूडियो',
    'nav.profile': 'प्रोफाइल',
    
    'action.search': 'अपना अगला सितारा खोजें',
    'action.book': 'अभी ऑडिशन बुक करें',
    'action.connect': 'निर्देशक से जुड़ें',
    'action.share': 'पोर्टफोलियो शेयर करें',
    'action.viewReel': 'शो रील देखें',
    
    'status.loading': 'सीन सेट हो रहा है...',
    'status.error': 'हमारे सर्वर में मुंबई ट्रैफिक! फिर कोशिश करें',
    'status.success': 'पिक्चर परफेक्ट! कार्य पूर्ण',
    'status.empty': 'इस सीन में कोई मैच नहीं',
    
    'industry.castingDirector': 'कास्टिंग डायरेक्टर',
    'industry.producer': 'निर्माता',
    'industry.actor': 'अभिनेता',
    'industry.audition': 'ऑडिशन',
    'industry.screenTest': 'स्क्रीन टेस्ट',
    'industry.mahurat': 'मुहूर्त',
    
    'festival.ganesh': 'गणपति बप्पा मोरया!',
    'festival.diwali': 'शुभ दीपावली!',
    'festival.holi': 'होली मुबारक!',
    'festival.eid': 'ईद मुबारक!',
  },
  mr: {
    'welcome.hero': 'CastMatch मध्ये आपले स्वागत',
    'welcome.subtitle': 'जिथे बॉलीवुड स्वप्ने साकार होतात',
    'welcome.cta': 'मुंबईच्या प्रमुख कास्टिंग नेटवर्कमध्ये सामील व्हा',
    
    'nav.home': 'मुख्यपृष्ठ',
    'nav.talents': 'कलाकार',
    'nav.auditions': 'ऑडिशन',
    'nav.studios': 'स्टुडिओ',
    'nav.profile': 'प्रोफाइल',
    
    'action.search': 'तुमचा पुढील स्टार शोधा',
    'action.book': 'आता ऑडिशन बुक करा',
    'action.connect': 'दिग्दर्शकाशी संपर्क साधा',
    'action.share': 'पोर्टफोलिओ शेअर करा',
    'action.viewReel': 'शो रील पहा',
    
    'status.loading': 'सीन सेट होत आहे...',
    'status.error': 'आमच्या सर्व्हरमध्ये मुंबई ट्रॅफिक! पुन्हा प्रयत्न करा',
    'status.success': 'पिक्चर परफेक्ट! कार्य पूर्ण',
    'status.empty': 'या सीनमध्ये कोणतीही जुळणी नाही',
    
    'industry.castingDirector': 'कास्टिंग डायरेक्टर',
    'industry.producer': 'निर्माता',
    'industry.actor': 'अभिनेता',
    'industry.audition': 'ऑडिशन',
    'industry.screenTest': 'स्क्रीन टेस्ट',
    'industry.mahurat': 'मुहूर्त',
    
    'festival.ganesh': 'गणपती बाप्पा मोरया!',
    'festival.diwali': 'शुभ दीपावली!',
    'festival.holi': 'होळी मुबारक!',
    'festival.eid': 'ईद मुबारक!',
  },
  // Add more languages as needed
  ta: {},
  te: {},
  bn: {},
  gu: {},
};

// Localization Provider Component
export const LocalizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');
  
  useEffect(() => {
    // Detect user's preferred language
    const browserLang = navigator.language.split('-')[0];
    const supportedLang = ['en', 'hi', 'mr', 'ta', 'te', 'bn', 'gu'].includes(browserLang) 
      ? browserLang as Language 
      : 'en';
    
    // Check localStorage for saved preference
    const savedLang = localStorage.getItem('preferred-language') as Language;
    setLanguage(savedLang || supportedLang);
  }, []);
  
  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('preferred-language', lang);
    document.documentElement.lang = lang;
    
    // Update font family based on language
    if (['hi', 'mr'].includes(lang)) {
      document.body.style.fontFamily = 'var(--font-devanagari)';
    } else {
      document.body.style.fontFamily = 'var(--font-body)';
    }
  };
  
  const t = (key: string): string => {
    return translations[language]?.[key] || translations.en[key] || key;
  };
  
  const isRTL = false; // None of the Indian languages are RTL
  
  return (
    <LocalizationContext.Provider value={{ language, setLanguage: handleSetLanguage, t, isRTL }}>
      {children}
    </LocalizationContext.Provider>
  );
};

// Custom hook for using localization
export const useLocalization = () => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within LocalizationProvider');
  }
  return context;
};

// Localized Text Component
interface LocalizedTextProps {
  id: string;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  fallback?: string;
}

export const LocalizedText: React.FC<LocalizedTextProps> = ({ 
  id, 
  className = '', 
  as: Component = 'span',
  fallback 
}) => {
  const { t, language } = useLocalization();
  const text = t(id) || fallback || id;
  
  return (
    <Component className={className} lang={language}>
      {text}
    </Component>
  );
};

// Mumbai-specific Welcome Component
export const MumbaiWelcome: React.FC = () => {
  const { language } = useLocalization();
  
  return (
    <div className="welcome-section">
      <h1 className="text-hero" lang={language}>
        <LocalizedText id="welcome.hero" />
      </h1>
      <p className="text-subsection" lang={language}>
        <LocalizedText id="welcome.subtitle" />
      </p>
      <button className="cta-button">
        <LocalizedText id="welcome.cta" />
      </button>
    </div>
  );
};

// Festival Greeting Component
export const FestivalGreeting: React.FC = () => {
  const { t, language } = useLocalization();
  const [currentFestival, setCurrentFestival] = useState<string | null>(null);
  
  useEffect(() => {
    const today = new Date();
    const month = today.getMonth();
    const day = today.getDate();
    
    // Simplified festival detection (would need proper calendar in production)
    if (month === 8 && day >= 10 && day <= 20) { // September
      setCurrentFestival('festival.ganesh');
    } else if (month === 10) { // November
      setCurrentFestival('festival.diwali');
    } else if (month === 2) { // March
      setCurrentFestival('festival.holi');
    }
  }, []);
  
  if (!currentFestival) return null;
  
  return (
    <div className="festival-greeting text-bollywood-gold">
      <span lang={language}>{t(currentFestival)}</span>
    </div>
  );
};

// Loading State Component with Mumbai Flair
export const MumbaiLoader: React.FC = () => {
  const { t, language } = useLocalization();
  const [loadingText, setLoadingText] = useState('status.loading');
  
  useEffect(() => {
    const messages = [
      'Setting the scene...',
      'Rolling camera...',
      'Adjusting lights...',
      'Getting the perfect take...',
      'Mumbai rush hour! Almost there...'
    ];
    
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setLoadingText(messages[index]);
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="loader-container">
      <div className="film-reel-spinner" />
      <p className="text-caption" lang={language}>
        {loadingText}
      </p>
    </div>
  );
};

// Language Switcher Component
export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLocalization();
  
  const languages = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
    { code: 'mr', name: 'Marathi', native: 'मराठी' },
    { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
    { code: 'te', name: 'Telugu', native: 'తెలుగు' },
    { code: 'bn', name: 'Bengali', native: 'বাংলা' },
    { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  ];
  
  return (
    <div className="language-switcher">
      <select 
        value={language} 
        onChange={(e) => setLanguage(e.target.value as Language)}
        className="text-body"
      >
        {languages.map(lang => (
          <option key={lang.code} value={lang.code}>
            {lang.native} ({lang.name})
          </option>
        ))}
      </select>
    </div>
  );
};

// Industry Term Component
interface IndustryTermProps {
  term: string;
  showTranslation?: boolean;
}

export const IndustryTerm: React.FC<IndustryTermProps> = ({ term, showTranslation = false }) => {
  const { t, language } = useLocalization();
  const key = `industry.${term}`;
  
  if (showTranslation && language !== 'en') {
    return (
      <span className="industry-term">
        <span lang={language}>{t(key)}</span>
        <span className="text-caption text-muted"> ({translations.en[key]})</span>
      </span>
    );
  }
  
  return <span lang={language}>{t(key)}</span>;
};

export default {
  LocalizationProvider,
  useLocalization,
  LocalizedText,
  MumbaiWelcome,
  FestivalGreeting,
  MumbaiLoader,
  LanguageSwitcher,
  IndustryTerm,
};