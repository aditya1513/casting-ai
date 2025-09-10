# CastMatch Typography System - Mumbai Market Edition
## Complete Type Scale Specifications for Indian Entertainment Industry

### 1. FONT STACK HIERARCHY

#### Primary Fonts - Devanagari Support
```css
/* Headlines - SF Pro Display with Devanagari fallbacks */
--font-headline: 'SF Pro Display', 'Noto Sans Devanagari', 'Mukta', 'Poppins', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;

/* Body Text - Inter with Indian language support */
--font-body: 'Inter var', 'Noto Sans Devanagari', 'Hind', 'Open Sans', -apple-system, BlinkMacSystemFont, sans-serif;

/* Monospace - Code and Technical */
--font-mono: 'JetBrains Mono', 'Noto Sans Devanagari Mono', 'Courier New', monospace;

/* Creative/Script - Bollywood flair */
--font-creative: 'Playlist Script', 'Kalam', 'Dancing Script', cursive;

/* Hindi/Marathi Primary */
--font-devanagari: 'Noto Sans Devanagari', 'Mukta', 'Mangal', 'Lohit Devanagari', sans-serif;
```

### 2. RESPONSIVE TYPE SCALE

#### Hero Headlines (72px → 48px mobile)
```css
.hero-headline {
  font-size: clamp(3rem, 5vw + 1rem, 4.5rem);
  line-height: 1.1;
  letter-spacing: -0.03em;
  font-weight: 700;
  
  /* Devanagari adjustment */
  &[lang="hi"], &[lang="mr"] {
    font-size: clamp(2.75rem, 4.5vw + 1rem, 4.25rem);
    line-height: 1.3;
    letter-spacing: 0;
  }
}
```

#### Section Titles (48px → 32px mobile)
```css
.section-title {
  font-size: clamp(2rem, 3.5vw + 0.5rem, 3rem);
  line-height: 1.2;
  letter-spacing: -0.02em;
  font-weight: 600;
  
  /* Devanagari adjustment */
  &[lang="hi"], &[lang="mr"] {
    font-size: clamp(1.875rem, 3.25vw + 0.5rem, 2.75rem);
    line-height: 1.35;
  }
}
```

#### Subsections (32px → 24px mobile)
```css
.subsection {
  font-size: clamp(1.5rem, 2.5vw + 0.25rem, 2rem);
  line-height: 1.3;
  letter-spacing: -0.01em;
  font-weight: 500;
  
  /* Devanagari adjustment */
  &[lang="hi"], &[lang="mr"] {
    font-size: clamp(1.375rem, 2.25vw + 0.25rem, 1.875rem);
    line-height: 1.4;
  }
}
```

#### Body Text (16px standard)
```css
.body-text {
  font-size: 1rem;
  line-height: 1.6;
  letter-spacing: 0;
  font-weight: 400;
  
  /* Devanagari adjustment */
  &[lang="hi"], &[lang="mr"] {
    font-size: 1.0625rem; /* Slightly larger for readability */
    line-height: 1.7;
    letter-spacing: 0.01em;
  }
}
```

#### Captions (14px)
```css
.caption {
  font-size: 0.875rem;
  line-height: 1.5;
  letter-spacing: 0.01em;
  font-weight: 400;
  
  /* Devanagari adjustment */
  &[lang="hi"], &[lang="mr"] {
    font-size: 0.9375rem;
    line-height: 1.6;
  }
}
```

#### Labels (12px minimum)
```css
.label {
  font-size: 0.75rem;
  line-height: 1.4;
  letter-spacing: 0.02em;
  font-weight: 500;
  text-transform: uppercase;
  
  /* Devanagari - no uppercase */
  &[lang="hi"], &[lang="mr"] {
    font-size: 0.8125rem;
    text-transform: none;
    font-weight: 600;
  }
}
```

### 3. DARK MODE ADJUSTMENTS

```css
[data-theme="dark"] {
  /* Text color adjustments */
  --text-primary: #FAFAFA;
  --text-secondary: #B8B8B8;
  --text-muted: #878787;
  --text-disabled: #5A5A5A;
  
  /* Weight reduction for better readability */
  --weight-offset: -50;
  
  /* Increased spacing for dark backgrounds */
  --letter-spacing-offset: 0.02em;
  --line-height-offset: 0.1;
  
  /* Anti-aliasing optimization */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}
```

### 4. CONTRAST RATIOS

| Element | Light Mode | Dark Mode | WCAG Level |
|---------|------------|-----------|------------|
| Headlines | 17:1 | 15:1 | AAA |
| Body Text | 15:1 | 13:1 | AAA |
| Captions | 11:1 | 10:1 | AAA |
| Links | 9:1 | 8:1 | AAA |
| Disabled | 5:1 | 4.5:1 | AA |

### 5. LANGUAGE-SPECIFIC ADJUSTMENTS

#### Hindi (hi-IN)
```css
[lang="hi"] {
  font-family: var(--font-devanagari);
  font-size-adjust: 0.545; /* Normalize x-height */
  line-height: calc(1em * var(--line-height) * 1.15);
}
```

#### Marathi (mr-IN)
```css
[lang="mr"] {
  font-family: var(--font-devanagari);
  font-size-adjust: 0.545;
  line-height: calc(1em * var(--line-height) * 1.15);
}
```

#### Tamil (ta-IN)
```css
[lang="ta"] {
  font-family: 'Noto Sans Tamil', 'Latha', sans-serif;
  font-size-adjust: 0.52;
  line-height: calc(1em * var(--line-height) * 1.2);
}
```

#### Telugu (te-IN)
```css
[lang="te"] {
  font-family: 'Noto Sans Telugu', 'Gautami', sans-serif;
  font-size-adjust: 0.55;
  line-height: calc(1em * var(--line-height) * 1.18);
}
```

#### Bengali (bn-IN)
```css
[lang="bn"] {
  font-family: 'Noto Sans Bengali', 'Vrinda', sans-serif;
  font-size-adjust: 0.53;
  line-height: calc(1em * var(--line-height) * 1.2);
}
```

#### Gujarati (gu-IN)
```css
[lang="gu"] {
  font-family: 'Noto Sans Gujarati', 'Shruti', sans-serif;
  font-size-adjust: 0.54;
  line-height: calc(1em * var(--line-height) * 1.15);
}
```

### 6. PERFORMANCE METRICS

#### Font Loading Strategy
```css
/* Critical fonts - preload */
<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/noto-devanagari.woff2" as="font" type="font/woff2" crossorigin>

/* Font display strategy */
@font-face {
  font-family: 'Inter var';
  font-display: swap; /* Immediate text render */
  unicode-range: U+0000-00FF; /* Latin subset */
}

@font-face {
  font-family: 'Noto Sans Devanagari';
  font-display: swap;
  unicode-range: U+0900-097F, U+A8E0-A8FF; /* Devanagari range */
}
```

#### Target Metrics
- First Contentful Paint: <1.2s
- Font Load Time: <100ms
- Reading Speed: >250 characters/minute
- Readability Score: >80
- User Satisfaction: >90%

### 7. ACCESSIBILITY COMPLIANCE

- Minimum font size: 14px (0.875rem)
- Line length: 45-75 characters
- Paragraph spacing: 1.5x line height
- Link underlines in body text
- Focus indicators: 3px outline
- Color contrast: AAA compliant
- Screen reader optimized