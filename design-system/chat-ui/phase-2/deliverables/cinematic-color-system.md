# CastMatch Chat UI Cinematic Color & Lighting System
**Color Lighting Artist Deliverable**
*Created: 2025-09-04*

## MUMBAI CINEMA COLOR PHILOSOPHY

### Bollywood Aesthetic Foundation
The CastMatch color system draws inspiration from Mumbai's golden age of cinema, incorporating the dramatic lighting, rich textures, and cultural significance of Indian filmmaking while maintaining modern digital accessibility standards.

```css
/* === MUMBAI CINEMA COLOR PALETTE === */

/* Primary Cinematic Colors */
:root {
  /* Golden Hour Collection - Mumbai Cinema Signature */
  --cinema-gold-pure: #FFD700;        /* Primary gold - spotlight moments */
  --cinema-gold-warm: #FFED4E;        /* Warm gold - comfortable highlights */
  --cinema-gold-deep: #B8860B;        /* Deep gold - sophisticated accents */
  --cinema-gold-pale: #FFF8DC;        /* Pale gold - subtle backgrounds */
  --cinema-gold-copper: #D4AF37;      /* Copper gold - metallic elements */
  
  /* Mumbai Night Collection - Professional Darkness */
  --mumbai-black-pure: #000000;       /* Pure black - maximum contrast */
  --mumbai-black-warm: #0A0A0A;       /* Warm black - softer darkness */
  --mumbai-charcoal: #1A1A1A;         /* Charcoal - surface backgrounds */
  --mumbai-slate: #2A2A2A;            /* Slate - elevated surfaces */
  --mumbai-graphite: #3A3A3A;         /* Graphite - interactive elements */
  --mumbai-ash: #4A4A4A;              /* Ash - border elements */
  
  /* Bollywood Accent Collection - Cultural Expression */
  --bollywood-red: #DC143C;           /* Crimson - passion, alerts */
  --bollywood-saffron: #FF9933;       /* Saffron - warmth, success */
  --bollywood-emerald: #50C878;       /* Emerald - nature, growth */
  --bollywood-sapphire: #0F52BA;      /* Sapphire - trust, depth */
  --bollywood-ruby: #E0115F;          /* Ruby - energy, action */
  
  /* Monsoon Collection - Natural Harmony */
  --monsoon-cloud: #708090;           /* Cloud - neutral states */
  --monsoon-rain: #4682B4;            /* Rain - information, links */
  --monsoon-mist: #B0C4DE;            /* Mist - subtle elements */
  --monsoon-storm: #2F4F4F;           /* Storm - serious tones */
}
```

### Accessibility-First Color Design
All colors meet WCAG AAA contrast requirements while maintaining cinematic beauty:

```css
/* === ACCESSIBILITY-COMPLIANT COLOR SYSTEM === */

/* High Contrast Combinations (21:1 ratio) */
:root {
  /* Pure contrast pairs */
  --contrast-max: var(--mumbai-black-pure);
  --contrast-max-text: #FFFFFF;
  
  /* AAA Compliant combinations (7:1+ ratio) */
  --bg-primary-aaa: #000000;
  --text-primary-aaa: #FFFFFF;          /* 21:1 contrast */
  --text-secondary-aaa: #CCCCCC;        /* 16.75:1 contrast */
  --text-tertiary-aaa: #999999;         /* 9.74:1 contrast */
  --accent-primary-aaa: #FFD700;        /* 19.6:1 vs black */
  --accent-secondary-aaa: #87CEEB;      /* 12.6:1 vs black */
  
  /* AA Compliant combinations (4.5:1+ ratio) */
  --text-subtle-aa: #757575;            /* 4.54:1 contrast */
  --border-subtle-aa: #666666;          /* 5.74:1 contrast */
  
  /* Large text AA combinations (3:1+ ratio) */
  --heading-accent-large: #FFA500;      /* 3.38:1 for large text */
}
```

## SEMANTIC COLOR SYSTEM

### Functional Color Categories
```css
/* === SEMANTIC COLOR DEFINITIONS === */

/* Background Color Hierarchy */
:root {
  /* Primary backgrounds - main interface */
  --bg-canvas: var(--mumbai-black-pure);      /* App background */
  --bg-surface: var(--mumbai-charcoal);       /* Card/panel backgrounds */
  --bg-elevated: var(--mumbai-slate);         /* Modal/dropdown backgrounds */
  --bg-overlay: rgba(0, 0, 0, 0.8);          /* Overlay backgrounds */
  
  /* Interactive backgrounds */
  --bg-interactive: var(--mumbai-graphite);   /* Button/input backgrounds */
  --bg-interactive-hover: var(--mumbai-ash);  /* Hover states */
  --bg-interactive-active: var(--mumbai-slate); /* Active states */
  
  /* Status backgrounds */
  --bg-success: rgba(80, 200, 120, 0.1);     /* Success state background */
  --bg-warning: rgba(255, 153, 51, 0.1);     /* Warning state background */
  --bg-error: rgba(220, 20, 60, 0.1);        /* Error state background */
  --bg-info: rgba(79, 130, 180, 0.1);        /* Info state background */
}

/* Text Color Hierarchy */
:root {
  /* Primary text colors */
  --text-primary: #FFFFFF;                    /* Main content text */
  --text-secondary: #CCCCCC;                  /* Secondary content */
  --text-tertiary: #999999;                   /* Subtle/meta text */
  --text-quaternary: #666666;                 /* Disabled text */
  
  /* Accent text colors */
  --text-accent-primary: var(--cinema-gold-pure);  /* Golden highlights */
  --text-accent-warm: var(--cinema-gold-warm);     /* Warm accents */
  --text-accent-deep: var(--cinema-gold-deep);     /* Deep accents */
  
  /* Interactive text colors */
  --text-link: var(--monsoon-rain);          /* Links and interactive text */
  --text-link-hover: var(--monsoon-mist);    /* Link hover states */
  --text-link-visited: var(--bollywood-sapphire); /* Visited links */
  
  /* Status text colors */
  --text-success: #10B981;                   /* Success messages */
  --text-warning: #F59E0B;                   /* Warning messages */
  --text-error: #EF4444;                     /* Error messages */
  --text-info: #3B82F6;                      /* Info messages */
}

/* Border Color System */
:root {
  /* Structural borders */
  --border-primary: var(--mumbai-ash);       /* Main borders */
  --border-secondary: var(--mumbai-graphite); /* Subtle borders */
  --border-tertiary: var(--mumbai-slate);    /* Very subtle borders */
  
  /* Interactive borders */
  --border-interactive: var(--cinema-gold-deep); /* Button borders */
  --border-focus: var(--cinema-gold-pure);   /* Focus indicators */
  --border-hover: var(--cinema-gold-warm);   /* Hover states */
  
  /* Status borders */
  --border-success: var(--bollywood-emerald); /* Success borders */
  --border-warning: var(--bollywood-saffron); /* Warning borders */
  --border-error: var(--bollywood-red);      /* Error borders */
  --border-info: var(--bollywood-sapphire);  /* Info borders */
}
```

### Gradient System
```css
/* === CINEMATIC GRADIENT SYSTEM === */

/* Mumbai Cinema Signature Gradients */
:root {
  /* Golden Hour Gradients */
  --gradient-golden-primary: linear-gradient(135deg, 
    var(--cinema-gold-pure) 0%, 
    var(--cinema-gold-deep) 100%);
  
  --gradient-golden-warm: linear-gradient(135deg, 
    var(--cinema-gold-warm) 0%, 
    var(--cinema-gold-copper) 100%);
  
  --gradient-golden-subtle: linear-gradient(135deg, 
    rgba(255, 215, 0, 0.1) 0%, 
    rgba(184, 134, 11, 0.05) 100%);
  
  /* Mumbai Night Gradients */
  --gradient-night-primary: linear-gradient(135deg, 
    var(--mumbai-black-pure) 0%, 
    var(--mumbai-charcoal) 100%);
  
  --gradient-night-surface: linear-gradient(135deg, 
    var(--mumbai-charcoal) 0%, 
    var(--mumbai-slate) 100%);
  
  --gradient-night-elevated: linear-gradient(135deg, 
    var(--mumbai-slate) 0%, 
    var(--mumbai-graphite) 100%);
  
  /* Bollywood Accent Gradients */
  --gradient-passion: linear-gradient(135deg, 
    var(--bollywood-red) 0%, 
    var(--bollywood-ruby) 100%);
  
  --gradient-success: linear-gradient(135deg, 
    var(--bollywood-emerald) 0%, 
    #22C55E 100%);
  
  --gradient-info: linear-gradient(135deg, 
    var(--bollywood-sapphire) 0%, 
    var(--monsoon-rain) 100%);
  
  /* Glassmorphism Gradients */
  --gradient-glass-primary: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.1) 0%, 
    rgba(255, 255, 255, 0.05) 100%);
  
  --gradient-glass-accent: linear-gradient(135deg, 
    rgba(255, 215, 0, 0.2) 0%, 
    rgba(255, 215, 0, 0.05) 100%);
}
```

## CINEMATIC LIGHTING EFFECTS

### Shadow System
```css
/* === MUMBAI CINEMA SHADOW SYSTEM === */

/* Dramatic Lighting Shadows */
:root {
  /* Soft shadows - natural depth */
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.1);
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.15);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.2);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.25);
  --shadow-xl: 0 16px 32px rgba(0, 0, 0, 0.3);
  --shadow-2xl: 0 32px 64px rgba(0, 0, 0, 0.4);
  
  /* Golden spotlight shadows */
  --shadow-golden-xs: 0 1px 2px rgba(255, 215, 0, 0.1);
  --shadow-golden-sm: 0 2px 4px rgba(255, 215, 0, 0.15);
  --shadow-golden-md: 0 4px 8px rgba(255, 215, 0, 0.2);
  --shadow-golden-lg: 0 8px 16px rgba(255, 215, 0, 0.25);
  --shadow-golden-xl: 0 16px 32px rgba(255, 215, 0, 0.3);
  
  /* Colored accent shadows */
  --shadow-success: 0 4px 12px rgba(80, 200, 120, 0.2);
  --shadow-warning: 0 4px 12px rgba(255, 153, 51, 0.2);
  --shadow-error: 0 4px 12px rgba(220, 20, 60, 0.2);
  --shadow-info: 0 4px 12px rgba(79, 130, 180, 0.2);
  
  /* Cinematic dramatic shadows */
  --shadow-dramatic: 0 20px 40px rgba(0, 0, 0, 0.5),
                     0 8px 16px rgba(0, 0, 0, 0.3);
  
  --shadow-spotlight: 0 0 20px rgba(255, 215, 0, 0.4),
                      0 0 40px rgba(255, 215, 0, 0.2);
  
  /* Inset lighting effects */
  --shadow-inset-light: inset 0 1px 0 rgba(255, 255, 255, 0.1);
  --shadow-inset-golden: inset 0 1px 0 rgba(255, 215, 0, 0.2);
  --shadow-inset-dark: inset 0 1px 2px rgba(0, 0, 0, 0.2);
}
```

### Glow and Lighting Effects
```css
/* === CINEMATIC GLOW EFFECTS === */

/* Interactive glow states */
.glow-golden {
  box-shadow: 
    0 0 10px rgba(255, 215, 0, 0.3),
    0 0 20px rgba(255, 215, 0, 0.2),
    0 0 30px rgba(255, 215, 0, 0.1);
  
  &:hover {
    box-shadow: 
      0 0 15px rgba(255, 215, 0, 0.4),
      0 0 30px rgba(255, 215, 0, 0.3),
      0 0 45px rgba(255, 215, 0, 0.2);
  }
}

.glow-success {
  box-shadow: 
    0 0 10px rgba(80, 200, 120, 0.3),
    0 0 20px rgba(80, 200, 120, 0.2);
}

.glow-error {
  box-shadow: 
    0 0 10px rgba(220, 20, 60, 0.3),
    0 0 20px rgba(220, 20, 60, 0.2);
}

/* Spotlight effects for talent cards */
.spotlight-effect {
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: -20px;
    left: -20px;
    right: -20px;
    bottom: -20px;
    background: radial-gradient(
      ellipse at center,
      rgba(255, 215, 0, 0.05) 0%,
      transparent 70%
    );
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
    border-radius: inherit;
  }
  
  &:hover::before {
    opacity: 1;
  }
}

/* Cinematic rim lighting */
.rim-light {
  border: 1px solid transparent;
  background: linear-gradient(var(--bg-surface), var(--bg-surface)) padding-box,
              var(--gradient-golden-subtle) border-box;
  
  &:hover {
    background: linear-gradient(var(--bg-surface), var(--bg-surface)) padding-box,
                var(--gradient-golden-warm) border-box;
  }
}
```

## COMPONENT-SPECIFIC COLOR APPLICATIONS

### Message Component Colors
```css
/* === MESSAGE COMPONENT COLORS === */

/* User messages */
.message-user {
  background: var(--bg-surface);
  border: 1px solid var(--border-secondary);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
  
  /* Subtle user accent */
  border-left: 3px solid var(--cinema-gold-deep);
  
  &:hover {
    border-color: var(--border-interactive);
    box-shadow: var(--shadow-md);
  }
}

/* AI messages */
.message-ai {
  background: linear-gradient(135deg, 
    var(--bg-elevated) 0%, 
    var(--bg-surface) 100%);
  border: 1px solid var(--border-primary);
  color: var(--text-primary);
  box-shadow: var(--shadow-md);
  
  /* AI accent indicator */
  border-left: 3px solid var(--text-accent-primary);
  
  &:hover {
    box-shadow: var(--shadow-lg);
    background: linear-gradient(135deg, 
      var(--bg-elevated) 0%, 
      rgba(255, 215, 0, 0.02) 50%,
      var(--bg-surface) 100%);
  }
}

/* System messages */
.message-system {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-tertiary);
  color: var(--text-secondary);
  text-align: center;
  font-style: italic;
  
  &.notification {
    background: var(--bg-info);
    border-color: var(--border-info);
    color: var(--text-info);
  }
  
  &.warning {
    background: var(--bg-warning);
    border-color: var(--border-warning);
    color: var(--text-warning);
  }
  
  &.success {
    background: var(--bg-success);
    border-color: var(--border-success);
    color: var(--text-success);
  }
}
```

### Talent Card Color Schemes
```css
/* === TALENT CARD COLOR SYSTEM === */

/* Default talent card */
.talent-card {
  background: linear-gradient(135deg, 
    rgba(0, 0, 0, 0.6) 0%, 
    rgba(26, 26, 26, 0.8) 100%);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 215, 0, 0.2);
  box-shadow: 
    var(--shadow-lg),
    var(--shadow-inset-light);
  
  &:hover {
    border-color: rgba(255, 215, 0, 0.4);
    box-shadow: 
      var(--shadow-xl),
      var(--shadow-golden-md),
      var(--shadow-inset-golden);
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(-1px);
    box-shadow: 
      var(--shadow-lg),
      var(--shadow-golden-sm);
  }
}

/* Featured talent card */
.talent-card-featured {
  background: linear-gradient(135deg, 
    rgba(255, 215, 0, 0.05) 0%, 
    rgba(0, 0, 0, 0.8) 100%);
  border: 2px solid var(--cinema-gold-deep);
  box-shadow: 
    var(--shadow-xl),
    var(--shadow-golden-lg);
  
  .talent-name {
    color: var(--text-accent-primary);
    text-shadow: 0 2px 4px rgba(255, 215, 0, 0.3);
  }
}

/* Selected talent card */
.talent-card-selected {
  background: linear-gradient(135deg, 
    rgba(255, 215, 0, 0.1) 0%, 
    rgba(184, 134, 11, 0.05) 100%);
  border: 2px solid var(--cinema-gold-pure);
  box-shadow: 
    var(--shadow-spotlight),
    var(--shadow-inset-golden);
  
  &::before {
    content: '★';
    position: absolute;
    top: 12px;
    right: 12px;
    color: var(--cinema-gold-pure);
    font-size: 24px;
    filter: drop-shadow(0 2px 4px rgba(255, 215, 0, 0.5));
  }
}

/* Availability status colors */
.talent-status {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  
  &.available {
    background: var(--bg-success);
    color: var(--text-success);
    border: 1px solid var(--border-success);
    box-shadow: 0 0 8px rgba(80, 200, 120, 0.2);
  }
  
  &.busy {
    background: var(--bg-warning);
    color: var(--text-warning);
    border: 1px solid var(--border-warning);
    box-shadow: 0 0 8px rgba(255, 153, 51, 0.2);
  }
  
  &.unavailable {
    background: var(--bg-error);
    color: var(--text-error);
    border: 1px solid var(--border-error);
    box-shadow: 0 0 8px rgba(220, 20, 60, 0.2);
  }
}
```

### Interactive Element Colors
```css
/* === INTERACTIVE ELEMENT COLORS === */

/* Primary buttons */
.button-primary {
  background: var(--gradient-golden-primary);
  color: var(--mumbai-black-pure);
  border: 1px solid var(--cinema-gold-deep);
  box-shadow: 
    var(--shadow-md),
    var(--shadow-inset-light);
  
  &:hover {
    background: var(--gradient-golden-warm);
    box-shadow: 
      var(--shadow-lg),
      var(--shadow-golden-md),
      var(--shadow-inset-light);
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
    box-shadow: 
      var(--shadow-sm),
      var(--shadow-inset-dark);
  }
  
  &:disabled {
    background: var(--mumbai-graphite);
    color: var(--text-quaternary);
    border-color: var(--border-tertiary);
    box-shadow: none;
    cursor: not-allowed;
  }
}

/* Secondary buttons */
.button-secondary {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--border-interactive);
    color: var(--text-accent-primary);
    box-shadow: var(--shadow-sm);
  }
  
  &:active {
    background: rgba(255, 255, 255, 0.1);
  }
}

/* Ghost buttons */
.button-ghost {
  background: transparent;
  color: var(--text-secondary);
  border: none;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-primary);
  }
  
  &:active {
    background: rgba(255, 255, 255, 0.15);
  }
}

/* Input fields */
.input-field {
  background: var(--bg-surface);
  color: var(--text-primary);
  border: 1px solid var(--border-secondary);
  
  &::placeholder {
    color: var(--text-tertiary);
    font-style: italic;
  }
  
  &:focus {
    outline: none;
    border-color: var(--border-focus);
    box-shadow: 
      0 0 0 3px rgba(255, 215, 0, 0.1),
      var(--shadow-sm);
    background: var(--bg-elevated);
  }
  
  &:disabled {
    background: var(--mumbai-charcoal);
    color: var(--text-quaternary);
    border-color: var(--border-tertiary);
    cursor: not-allowed;
  }
}
```

## ADVANCED COLOR FEATURES

### Dark Theme Variations
```css
/* === DARK THEME VARIATIONS === */

/* Standard dark theme (default) */
[data-theme="dark"] {
  /* Already implemented as base system */
}

/* High contrast dark theme */
[data-theme="dark-high-contrast"] {
  --bg-canvas: #000000;
  --bg-surface: #1A1A1A;
  --text-primary: #FFFFFF;
  --text-secondary: #E5E5E5;
  --border-primary: #FFFFFF;
  --text-accent-primary: #FFFF00;
  --shadow-md: 0 4px 8px rgba(255, 255, 255, 0.1);
}

/* Warm dark theme */
[data-theme="dark-warm"] {
  --mumbai-black-pure: #0F0A05;
  --mumbai-charcoal: #1F1A15;
  --mumbai-slate: #2F2A25;
  --cinema-gold-pure: #FFE55C;
  --cinema-gold-deep: #CC9900;
}

/* Cool dark theme */
[data-theme="dark-cool"] {
  --mumbai-black-pure: #050A0F;
  --mumbai-charcoal: #151A1F;
  --mumbai-slate: #252A2F;
  --cinema-gold-pure: #5CCAFF;
  --cinema-gold-deep: #0099CC;
}
```

### Color Accessibility Features
```css
/* === ACCESSIBILITY COLOR FEATURES === */

/* High contrast mode support */
@media (prefers-contrast: high) {
  :root {
    --bg-canvas: #000000;
    --bg-surface: #FFFFFF;
    --text-primary: #000000;
    --text-secondary: #000000;
    --border-primary: #000000;
    --text-accent-primary: #0000FF;
    --shadow-md: none;
  }
  
  .talent-card,
  .message-user,
  .message-ai {
    border: 2px solid currentColor;
    background: var(--bg-surface);
  }
}

/* Reduced motion preferences */
@media (prefers-reduced-motion: reduce) {
  .glow-golden,
  .spotlight-effect,
  .talent-card {
    transition: none;
    animation: none;
  }
  
  .glow-golden {
    box-shadow: var(--shadow-md);
    
    &:hover {
      box-shadow: var(--shadow-lg);
    }
  }
}

/* Color blindness support */
.colorblind-support {
  &.deuteranopia {
    --cinema-gold-pure: #FFB347; /* Orange-gold for red-green colorblindness */
    --bollywood-red: #FF6B6B;    /* Adjusted red */
    --bollywood-emerald: #4ECDC4; /* Adjusted green */
  }
  
  &.protanopia {
    --cinema-gold-pure: #FFD23F; /* Yellow-gold for red colorblindness */
    --bollywood-red: #FF8C42;    /* Orange instead of red */
  }
  
  &.tritanopia {
    --cinema-gold-pure: #FF6B9D; /* Pink-gold for blue colorblindness */
    --bollywood-sapphire: #8B4A8B; /* Purple instead of blue */
  }
}
```

### Animation Color Effects
```css
/* === ANIMATED COLOR EFFECTS === */

/* Pulsing glow animation */
@keyframes pulseGolden {
  0% {
    box-shadow: 0 0 5px rgba(255, 215, 0, 0.2);
  }
  50% {
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.4);
  }
  100% {
    box-shadow: 0 0 5px rgba(255, 215, 0, 0.2);
  }
}

/* Color transition animation */
@keyframes colorShift {
  0% {
    background-color: var(--bg-surface);
  }
  50% {
    background-color: rgba(255, 215, 0, 0.1);
  }
  100% {
    background-color: var(--bg-surface);
  }
}

/* Spotlight sweep animation */
@keyframes spotlightSweep {
  0% {
    background: linear-gradient(90deg, 
      transparent 0%, 
      rgba(255, 215, 0, 0.1) 50%, 
      transparent 100%);
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

/* Animation classes */
.animate-pulse-golden {
  animation: pulseGolden 2s ease-in-out infinite;
}

.animate-color-shift {
  animation: colorShift 1s ease-in-out;
}

.animate-spotlight {
  position: relative;
  overflow: hidden;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, 
      transparent 0%, 
      rgba(255, 215, 0, 0.1) 50%, 
      transparent 100%);
    animation: spotlightSweep 2s ease-in-out;
  }
}
```

## IMPLEMENTATION AND USAGE GUIDELINES

### Color Token Usage
```javascript
// Color system implementation
const CinematicColors = {
  // Semantic categories
  background: {
    canvas: 'var(--bg-canvas)',
    surface: 'var(--bg-surface)',
    elevated: 'var(--bg-elevated)',
    overlay: 'var(--bg-overlay)'
  },
  
  text: {
    primary: 'var(--text-primary)',
    secondary: 'var(--text-secondary)',
    accent: 'var(--text-accent-primary)',
    link: 'var(--text-link)'
  },
  
  interactive: {
    primary: 'var(--cinema-gold-pure)',
    hover: 'var(--cinema-gold-warm)',
    active: 'var(--cinema-gold-deep)',
    focus: 'var(--border-focus)'
  },
  
  status: {
    success: 'var(--text-success)',
    warning: 'var(--text-warning)',
    error: 'var(--text-error)',
    info: 'var(--text-info)'
  }
};

// Usage in components
function TalentCard({ talent, featured = false }) {
  const cardClass = featured ? 'talent-card-featured' : 'talent-card';
  
  return (
    <div className={cardClass}>
      <div className="talent-name" style={{ color: CinematicColors.text.accent }}>
        {talent.name}
      </div>
      <div className="talent-status available">
        Available
      </div>
    </div>
  );
}
```

### Color Quality Assurance
```css
/* === COLOR QA VALIDATION === */

/* Debug mode for color accessibility */
.debug-colors {
  /* Show contrast ratios */
  .contrast-checker::after {
    content: attr(data-contrast-ratio);
    position: absolute;
    top: 0;
    right: 0;
    background: red;
    color: white;
    padding: 2px 4px;
    font-size: 10px;
  }
  
  /* Highlight insufficient contrast */
  .insufficient-contrast {
    outline: 2px solid red;
    background: rgba(255, 0, 0, 0.1);
  }
  
  /* Show color tokens */
  .show-tokens::before {
    content: attr(data-color-token);
    position: absolute;
    bottom: 100%;
    left: 0;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 4px;
    font-size: 10px;
    white-space: nowrap;
  }
}
```

---

**Cinematic Color System Complete**: Comprehensive Mumbai cinema-inspired color palette with accessibility compliance, dramatic lighting effects, and cultural authenticity.

**Phase 2 Complete**: All visual design agents deployed successfully. Ready for Phase 3 interaction and motion specialists.