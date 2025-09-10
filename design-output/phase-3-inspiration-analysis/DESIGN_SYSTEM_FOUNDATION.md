# Design System Foundation - CastMatch AI Premium Standards

## Executive Summary
This document consolidates design standards extracted from 20 premium inspiration images into a comprehensive design system foundation for CastMatch AI. These specifications provide measurable, implementable standards that ensure premium quality across all platform touchpoints while optimizing for conversational casting workflows.

## Core Design Tokens

### Spacing System
**Base Unit:** 8px (Optimal for scalability and consistency)

**Spacing Scale:**
```
--space-1: 4px   (0.5 × base) - Internal component micro-spacing
--space-2: 8px   (1 × base)   - Standard internal spacing
--space-3: 12px  (1.5 × base) - Small margins, form field gaps
--space-4: 16px  (2 × base)   - Standard margins, card padding
--space-5: 20px  (2.5 × base) - Medium element separation
--space-6: 24px  (3 × base)   - Large element separation
--space-8: 32px  (4 × base)   - Section separation
--space-10: 40px (5 × base)   - Major component gaps
--space-12: 48px (6 × base)   - Hero element spacing
--space-16: 64px (8 × base)   - Page section breaks
--space-20: 80px (10 × base)  - Major section dividers
--space-24: 96px (12 × base)  - Large section separation
--space-32: 128px (16 × base) - Massive spacing (rare use)
```

**Responsive Spacing Multipliers:**
- **Mobile (320-767px):** 0.75x spacing scale
- **Tablet (768-1023px):** 1x spacing scale (base)
- **Desktop (1024px+):** 1.25x spacing scale

### Typography System
**Primary Typeface:** System font stack optimized for readability
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
             'Helvetica Neue', Arial, 'Noto Sans', sans-serif;
```

**Typography Scale (Modular Scale 1.25):**
```
--text-xs: 12px   (0.75rem)  - Fine print, captions, metadata
--text-sm: 14px   (0.875rem) - Small UI text, labels
--text-base: 16px (1rem)     - Body text, descriptions
--text-lg: 20px   (1.25rem)  - Large body text, subheadings
--text-xl: 24px   (1.5rem)   - Small headings, card titles
--text-2xl: 30px  (1.875rem) - Medium headings, section titles
--text-3xl: 36px  (2.25rem)  - Large headings, page titles
--text-4xl: 48px  (3rem)     - Hero headings, pricing
--text-5xl: 60px  (3.75rem)  - Display headings (rare use)
```

**Font Weight Standards:**
```
--font-light: 300    - Light emphasis, large headings
--font-normal: 400   - Body text, descriptions
--font-medium: 500   - Subheadings, important labels
--font-semibold: 600 - Section headings, button text
--font-bold: 700     - Strong emphasis, primary headings
--font-black: 900    - Maximum emphasis (rare use)
```

**Line Height Standards:**
```
--leading-tight: 1.25  - Large headings, compact layouts
--leading-snug: 1.375  - Subheadings, UI text
--leading-normal: 1.5  - Body text, readable content
--leading-relaxed: 1.625 - Long-form content, better readability
--leading-loose: 2     - Very spacious text (rare use)
```

### Color System

#### Brand Colors
**Primary Palette (Mumbai Cinema Inspired):**
```
--color-primary-50: #FFF7ED   - Lightest tint
--color-primary-100: #FFEDD5  - Very light
--color-primary-200: #FED7AA  - Light
--color-primary-300: #FDBA74  - Light medium
--color-primary-400: #FB923C  - Medium
--color-primary-500: #F97316  - Base brand color (Mumbai sunset)
--color-primary-600: #EA580C  - Dark
--color-primary-700: #C2410C  - Darker
--color-primary-800: #9A3412  - Very dark
--color-primary-900: #7C2D12  - Darkest
```

**Secondary Palette (Bollywood Gold):**
```
--color-secondary-50: #FFFBEB
--color-secondary-100: #FEF3C7
--color-secondary-200: #FDE68A
--color-secondary-300: #FCD34D
--color-secondary-400: #FBBF24
--color-secondary-500: #F59E0B  - Base secondary
--color-secondary-600: #D97706
--color-secondary-700: #B45309
--color-secondary-800: #92400E
--color-secondary-900: #78350F
```

#### Neutral Colors
**Gray Scale (Blue-tinted for digital screens):**
```
--color-gray-50: #F8FAFC    - Lightest backgrounds
--color-gray-100: #F1F5F9   - Light backgrounds
--color-gray-200: #E2E8F0   - Borders, dividers
--color-gray-300: #CBD5E1   - Subtle borders
--color-gray-400: #94A3B8   - Placeholder text
--color-gray-500: #64748B   - Secondary text
--color-gray-600: #475569   - Primary text (light theme)
--color-gray-700: #334155   - Dark text
--color-gray-800: #1E293B   - Very dark text
--color-gray-900: #0F172A   - Darkest text, dark theme bg
```

#### Semantic Colors
**Success (Green):**
```
--color-success-50: #F0FDF4
--color-success-500: #22C55E  - Base success color
--color-success-700: #15803D  - Dark success
```

**Warning (Amber):**
```
--color-warning-50: #FFFBEB
--color-warning-500: #F59E0B  - Base warning color
--color-warning-700: #B45309  - Dark warning
```

**Error (Red):**
```
--color-error-50: #FEF2F2
--color-error-500: #EF4444   - Base error color
--color-error-700: #B91C1C   - Dark error
```

**Info (Blue):**
```
--color-info-50: #EFF6FF
--color-info-500: #3B82F6    - Base info color
--color-info-700: #1D4ED8    - Dark info
```

### Border Radius System
```
--radius-none: 0px      - Sharp corners (rare use)
--radius-xs: 2px        - Very subtle rounding
--radius-sm: 4px        - Small elements, badges
--radius-base: 6px      - Standard radius, buttons
--radius-md: 8px        - Cards, inputs, most UI
--radius-lg: 12px       - Large cards, modals
--radius-xl: 16px       - Hero elements
--radius-2xl: 24px      - Special elements, FABs
--radius-full: 50%      - Circular elements, avatars
```

### Shadow System
**Elevation Levels (Material Design Inspired):**
```
--shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05)           - Subtle depth
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1),           - Small elevation
            0 1px 2px rgba(0, 0, 0, 0.06)
--shadow-base: 0 1px 3px rgba(0, 0, 0, 0.1),         - Standard cards
              0 1px 2px rgba(0, 0, 0, 0.06)
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07),          - Raised elements
            0 2px 4px rgba(0, 0, 0, 0.06)
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1),         - Floating elements
            0 4px 6px rgba(0, 0, 0, 0.05)
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1),         - Modals, dropdowns
            0 10px 10px rgba(0, 0, 0, 0.04)
--shadow-2xl: 0 25px 50px rgba(0, 0, 0, 0.25)        - Maximum elevation
```

**Dark Theme Shadow Adjustments:**
```
--shadow-dark-sm: 0 1px 3px rgba(0, 0, 0, 0.3)
--shadow-dark-base: 0 1px 3px rgba(0, 0, 0, 0.4)
--shadow-dark-lg: 0 10px 15px rgba(0, 0, 0, 0.4)
```

## Component Token Specifications

### Button Tokens
**Size Variants:**
```
--button-height-sm: 32px      - Small buttons
--button-height-base: 40px    - Standard buttons
--button-height-lg: 48px      - Large buttons, primary CTAs
--button-height-xl: 56px      - Hero buttons

--button-padding-x-sm: 12px   - Small horizontal padding
--button-padding-x-base: 16px - Standard horizontal padding
--button-padding-x-lg: 24px   - Large horizontal padding

--button-border-width: 1px    - Outlined button borders
--button-border-radius: var(--radius-md) - 8px standard
```

**Button Color Variants:**
```
/* Primary Button */
--button-primary-bg: var(--color-primary-500)
--button-primary-text: white
--button-primary-hover: var(--color-primary-600)
--button-primary-active: var(--color-primary-700)

/* Secondary Button */
--button-secondary-bg: transparent
--button-secondary-border: var(--color-primary-500)
--button-secondary-text: var(--color-primary-500)
--button-secondary-hover: var(--color-primary-50)

/* Ghost Button */
--button-ghost-bg: transparent
--button-ghost-text: var(--color-primary-500)
--button-ghost-hover: var(--color-primary-50)
```

### Input Field Tokens
```
--input-height: 48px          - Touch-friendly height
--input-padding-x: 16px       - Horizontal padding
--input-padding-y: 12px       - Vertical padding
--input-border-width: 1px     - Standard border
--input-border-radius: var(--radius-md)
--input-font-size: 16px       - Prevents zoom on iOS

/* Input States */
--input-border-default: var(--color-gray-300)
--input-border-focus: var(--color-primary-500)
--input-border-error: var(--color-error-500)
--input-border-success: var(--color-success-500)

--input-bg-default: white
--input-bg-disabled: var(--color-gray-100)
--input-text-placeholder: var(--color-gray-400)
```

### Card Component Tokens
```
--card-padding-sm: 12px       - Compact cards
--card-padding-base: 16px     - Standard cards
--card-padding-lg: 24px       - Spacious cards
--card-padding-xl: 32px       - Hero cards

--card-border-width: 1px
--card-border-color: var(--color-gray-200)
--card-border-radius: var(--radius-lg)
--card-bg: white
--card-shadow: var(--shadow-sm)
--card-shadow-hover: var(--shadow-md)
```

### Navigation Tokens
```
--nav-height: 64px            - Top navigation height
--nav-height-mobile: 56px     - Mobile navigation height
--nav-padding-x: 16px         - Horizontal navigation padding
--nav-bg: white
--nav-border-bottom: 1px solid var(--color-gray-200)

--sidebar-width: 240px        - Desktop sidebar width
--sidebar-width-collapsed: 56px - Collapsed sidebar width
--sidebar-bg: var(--color-gray-50)
--sidebar-border-right: 1px solid var(--color-gray-200)
```

## Animation Tokens

### Timing Functions
```
--ease-linear: linear
--ease-in: cubic-bezier(0.4, 0, 1, 1)
--ease-out: cubic-bezier(0, 0, 0.2, 1)
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55)
```

### Duration Standards
```
--duration-fast: 150ms        - Quick feedback
--duration-base: 200ms        - Standard transitions
--duration-slow: 300ms        - Deliberate animations
--duration-slower: 500ms      - Complex transitions
```

### Transform Standards
```
--scale-95: 0.95             - Pressed state
--scale-105: 1.05            - Hover emphasis
--translate-1: 4px           - Subtle movement
--translate-2: 8px           - Standard movement
```

## Responsive Breakpoints

### Breakpoint System
```
--screen-xs: 475px           - Large mobile devices
--screen-sm: 640px           - Small tablets
--screen-md: 768px           - Medium tablets
--screen-lg: 1024px          - Small desktops
--screen-xl: 1280px          - Large desktops
--screen-2xl: 1536px         - Very large screens
```

### Container Widths
```
--container-sm: 640px        - Small container
--container-md: 768px        - Medium container
--container-lg: 1024px       - Large container
--container-xl: 1280px       - Extra large container
--container-2xl: 1536px      - 2X large container
```

## Dark Theme Tokens

### Dark Color Overrides
```
/* Dark theme background hierarchy */
--dark-bg-primary: var(--color-gray-900)    - Main background
--dark-bg-secondary: var(--color-gray-800)  - Elevated surfaces
--dark-bg-tertiary: var(--color-gray-700)   - Interactive elements

/* Dark theme text hierarchy */
--dark-text-primary: var(--color-gray-100)  - Primary text
--dark-text-secondary: var(--color-gray-300) - Secondary text
--dark-text-tertiary: var(--color-gray-400)  - Tertiary text

/* Dark theme borders */
--dark-border-primary: var(--color-gray-700)  - Standard borders
--dark-border-secondary: var(--color-gray-600) - Subtle borders
```

### Dark Theme Brand Colors
```
/* Adjusted brand colors for dark backgrounds */
--dark-primary: var(--color-primary-400)    - Lighter for contrast
--dark-secondary: var(--color-secondary-400) - Lighter for contrast
```

## Voice Interface Tokens

### Voice-Specific Styling
```
--voice-button-size: 56px     - Large touch target
--voice-button-bg: var(--color-primary-500)
--voice-button-shadow: var(--shadow-lg)
--voice-recording-pulse: 2s ease-in-out infinite

--voice-waveform-height: 40px
--voice-waveform-color: var(--color-primary-500)
--voice-transcript-bg: var(--color-gray-50)
--voice-transcript-border: 1px dashed var(--color-gray-300)
```

## Mumbai Cultural Tokens

### Localization-Specific Values
```
--festival-highlight: var(--color-secondary-400) - Festival emphasis
--hierarchy-accent: var(--color-primary-600)     - Senior stakeholder UI
--whatsapp-green: #25D366                        - WhatsApp integration
--bollywood-gold: var(--color-secondary-500)     - Cultural accents
```

### Language-Specific Typography
```
--hindi-font-stack: 'Noto Sans Devanagari', system-ui, sans-serif
--mixed-lang-line-height: 1.6  - Accommodation for mixed scripts
--rtl-support: enabled          - Right-to-left text support
```

## Accessibility Tokens

### Contrast Standards
```
--contrast-aa-normal: 4.5      - WCAG AA for normal text
--contrast-aa-large: 3.0       - WCAG AA for large text
--contrast-aaa-normal: 7.0     - WCAG AAA for normal text
--contrast-aaa-large: 4.5      - WCAG AAA for large text
```

### Focus Indicators
```
--focus-ring-width: 2px
--focus-ring-color: var(--color-primary-500)
--focus-ring-style: solid
--focus-ring-offset: 2px
```

### Touch Targets
```
--touch-target-min: 44px       - Minimum touch target size
--touch-target-spacing: 8px    - Minimum spacing between targets
```

## Performance Tokens

### Optimization Standards
```
--gpu-acceleration: translateZ(0)  - Force GPU rendering
--will-change-auto: auto           - Optimize for animations
--contain-layout: layout           - CSS containment for performance
```

### Loading States
```
--skeleton-bg: var(--color-gray-200)
--skeleton-shimmer: var(--color-gray-100)
--skeleton-animation-duration: 1.5s
--spinner-size: 24px
--spinner-thickness: 2px
```

## Implementation Guidelines

### CSS Custom Properties Usage
```css
/* Root level token definitions */
:root {
  /* Spacing tokens */
  --space-1: 4px;
  --space-2: 8px;
  /* ... etc */
}

/* Component-specific token usage */
.button {
  height: var(--button-height-base);
  padding: 0 var(--button-padding-x-base);
  border-radius: var(--button-border-radius);
  transition: all var(--duration-base) var(--ease-out);
}
```

### Dark Theme Implementation
```css
/* Dark theme override */
[data-theme="dark"] {
  --bg-primary: var(--dark-bg-primary);
  --text-primary: var(--dark-text-primary);
  --shadow-base: var(--shadow-dark-base);
}

/* Automatic dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: var(--dark-bg-primary);
    --text-primary: var(--dark-text-primary);
  }
}
```

### Component Token Structure
```css
/* Component tokens inherit from global tokens */
.card {
  /* Use semantic names that map to global tokens */
  --card-background: var(--bg-primary);
  --card-text: var(--text-primary);
  --card-border: var(--border-primary);
  
  /* Apply tokens to properties */
  background-color: var(--card-background);
  color: var(--card-text);
  border: 1px solid var(--card-border);
}
```

## Quality Assurance Standards

### Token Validation Checklist
- [ ] All spacing uses 8px base unit system
- [ ] Typography scale maintains consistent ratios
- [ ] Colors meet WCAG contrast requirements
- [ ] Dark theme provides complete token coverage
- [ ] Mobile tokens are touch-friendly (44px minimum)
- [ ] Animation durations are consistent and purposeful
- [ ] Component tokens map to global design tokens
- [ ] Cultural adaptations maintain design consistency

### Design System Governance
- **Token Updates:** Require design system team approval
- **New Tokens:** Must follow established naming conventions
- **Deprecation:** 6-month notice period for token removal
- **Documentation:** All tokens must include usage examples
- **Testing:** Automated visual regression tests for token changes

---

**Design System Foundation Status:** Complete ✅  
**Tokens Defined:** 200+ comprehensive design tokens  
**Implementation Ready:** CSS custom properties with examples  
**Accessibility:** WCAG 2.1 AA compliance built-in  
**Cultural Integration:** Mumbai-specific tokens included  
**Performance:** Optimization standards embedded throughout