# CastMatch Typography System v1.0
## Comprehensive Type Scale & Specifications

### 1. TYPE SCALE HIERARCHY

#### Desktop Type Scale (1440px viewport)
```css
/* Hero Headlines - Marketing Impact */
--type-hero: clamp(48px, 5vw, 72px);
--type-hero-line: 1.1;
--type-hero-spacing: -0.02em;
--type-hero-weight: 700;

/* Section Titles - Major Sections */
--type-section: clamp(36px, 3.5vw, 48px);
--type-section-line: 1.2;
--type-section-spacing: -0.015em;
--type-section-weight: 600;

/* Subsection Headers */
--type-subsection: clamp(24px, 2.5vw, 32px);
--type-subsection-line: 1.3;
--type-subsection-spacing: -0.01em;
--type-subsection-weight: 600;

/* Card Titles & Component Headers */
--type-title: clamp(18px, 1.5vw, 24px);
--type-title-line: 1.4;
--type-title-spacing: 0;
--type-title-weight: 500;

/* Subheadings & Labels */
--type-subtitle: clamp(16px, 1.25vw, 20px);
--type-subtitle-line: 1.4;
--type-subtitle-spacing: 0.01em;
--type-subtitle-weight: 500;

/* Body Text - Primary Content */
--type-body: 16px;
--type-body-line: 1.6;
--type-body-spacing: 0.02em;
--type-body-weight: 400;

/* Small Text - Secondary Content */
--type-small: 14px;
--type-small-line: 1.5;
--type-small-spacing: 0.025em;
--type-small-weight: 400;

/* Caption Text - Metadata */
--type-caption: 12px;
--type-caption-line: 1.4;
--type-caption-spacing: 0.03em;
--type-caption-weight: 400;

/* Label Text - UI Labels */
--type-label: 11px;
--type-label-line: 1.3;
--type-label-spacing: 0.05em;
--type-label-weight: 500;
--type-label-transform: uppercase;
```

### 2. FONT STACK SPECIFICATIONS

```css
/* Primary Font Stack - SF Pro Display for Headlines */
--font-display: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;

/* Body Font Stack - Inter Variable for Content */
--font-body: 'Inter var', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* Monospace Font Stack - For Code/Technical */
--font-mono: 'JetBrains Mono', 'SF Mono', Consolas, 'Courier New', monospace;

/* Creative Font Stack - For Branding Elements */
--font-creative: 'Playlist Script', 'Brush Script MT', cursive;

/* Fallback Hindi Support */
--font-hindi: 'Noto Sans Devanagari', 'Mangal', sans-serif;
```

### 3. CONTENT HIERARCHY PATTERNS

#### Landing Page Content Structure
```
Hero Headline (72px) → "Find Your Perfect Cast in Minutes"
↓ -48px gap
Hero Subheading (24px) → "AI-powered talent discovery for modern filmmakers"
↓ -32px gap
CTA Button Text (18px) → "Start Free Trial"
↓ -96px section gap
Section Title (48px) → "How It Works"
↓ -24px gap
Section Description (18px) → "Simple 4-step process to cast your next production"
```

#### Dashboard Data Hierarchy
```
Page Title (32px) → "Dashboard"
↓ -24px gap
Metric Value (48px) → "2,847"
↓ -8px gap
Metric Label (12px) → "PROFILE VIEWS"
↓ -16px gap
Change Indicator (14px) → "+12% from last month"
```

#### Form Field Hierarchy
```
Field Label (14px, 500 weight) → "Email Address"
↓ -8px gap
Input Text (16px) → user input
↓ -4px gap
Helper Text (12px) → "We'll never share your email"
↓ -4px gap
Error Message (12px, red) → "Please enter a valid email"
```

### 4. DARK MODE ADJUSTMENTS

```css
/* Light Mode Base */
.light-mode {
  --text-primary: #171717;     /* gray-900 */
  --text-secondary: #525252;   /* gray-600 */
  --text-tertiary: #737373;    /* gray-500 */
  --text-disabled: #A3A3A3;    /* gray-400 */
}

/* Dark Mode Adjustments */
.dark-mode {
  --text-primary: #FAFAFA;      /* gray-50 */
  --text-secondary: #D4D4D4;    /* gray-300 */
  --text-tertiary: #A3A3A3;     /* gray-400 */
  --text-disabled: #737373;     /* gray-500 */
  
  /* Typography Adjustments for Dark Mode */
  --dark-weight-reduction: -50;
  --dark-spacing-increase: 0.02em;
  --dark-line-increase: 0.1;
  
  /* Anti-aliasing for Dark Backgrounds */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Dark Mode Contrast Ratios */
--contrast-body: 13:1;      /* Body text to background */
--contrast-headline: 15:1;   /* Headlines to background */
--contrast-caption: 10:1;    /* Captions to background */
--contrast-disabled: 4.5:1;  /* Disabled text minimum */
--contrast-link: 8:1;        /* Links to background */
```

### 5. RESPONSIVE TYPE BEHAVIOR

#### Breakpoint-Based Scaling
```css
/* Mobile First Approach */
@media (min-width: 375px) {
  --type-scale-factor: 0.85;
}

@media (min-width: 768px) {
  --type-scale-factor: 0.9;
}

@media (min-width: 1024px) {
  --type-scale-factor: 0.95;
}

@media (min-width: 1440px) {
  --type-scale-factor: 1;
}

@media (min-width: 1920px) {
  --type-scale-factor: 1.1;
}
```

### 6. MICROCOPY STANDARDS

#### Button & CTA Text
```
Primary Actions (Verb-First):
✓ "Start Free Trial"
✓ "Upload Portfolio"
✓ "Schedule Audition"
✗ "Free Trial" (missing verb)
✗ "Click Here" (generic)

Secondary Actions:
✓ "Save for Later"
✓ "Skip This Step"
✓ "Learn More"
```

#### Error Messages (Solution-Focused)
```
✓ "Enter a valid email to continue (example@domain.com)"
✗ "Invalid email format"

✓ "Add at least one photo to complete your portfolio"
✗ "Portfolio incomplete"

✓ "Choose a password with 8+ characters for security"
✗ "Password too short"
```

#### Empty States (Encouraging)
```
Dashboard: "Welcome! Let's set up your first project"
Search: "No matches yet. Try adjusting your filters"
Messages: "Start a conversation with talent"
Portfolio: "Show the world your talent. Upload your first photo"
```

#### Loading States (Entertaining)
```
Quick (0-2s): "Loading..."
Medium (2-5s): "Getting things ready..."
Long (5s+): "Almost there! This is worth the wait..."
Upload: "Processing your amazing work..."
AI: "Our AI is thinking..."
```

#### Success Messages (Celebratory)
```
Profile: "Profile updated! You're looking great"
Application: "Application sent! Break a leg!"
Upload: "Portfolio updated! Your talent shines"
Booking: "Audition confirmed! See you there"
```

### 7. ACCESSIBILITY STANDARDS

#### Minimum Sizes
- Body text: 16px minimum
- Captions: 12px minimum (limited use)
- Touch targets: 44px minimum
- Line length: 45-75 characters
- Paragraph spacing: 1.5x line height

#### WCAG 2.1 AA Compliance
- Normal text: 4.5:1 contrast minimum
- Large text (18px+): 3:1 contrast minimum
- Focus indicators: 3:1 contrast minimum
- Error text: Must not rely on color alone
- Links: Underlined or 3:1 contrast + underline on hover

### 8. PERFORMANCE METRICS

#### Font Loading Strategy
```css
/* Critical Font Loading */
@font-face {
  font-family: 'Inter var';
  src: url('/fonts/Inter-var.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-display: swap; /* Show fallback immediately */
}

/* Performance Targets */
--font-load-time: <100ms;
--first-paint: <1s;
--layout-shift: <0.1;
```

#### Reading Speed Optimization
- Target: 250-300 words per minute
- Line height: 1.5-1.8 for body text
- Character width: 65-75 per line
- Contrast: High enough for effortless scanning

### 9. CULTURAL CONSIDERATIONS

#### Multilingual Support
```css
/* Hindi/Devanagari Adjustments */
.hindi-content {
  font-family: var(--font-hindi);
  line-height: 1.8; /* Increased for vowel marks */
  letter-spacing: 0.03em; /* Slightly wider */
}

/* Language Switching Indicator */
.lang-switch {
  font-size: var(--type-caption);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
```

### 10. IMPLEMENTATION PRIORITIES

#### Phase 1 - Critical Path (Week 1)
1. Landing page hero typography
2. Authentication form labels
3. Dashboard data presentation
4. Error message consistency

#### Phase 2 - Enhancement (Week 2)
1. AI conversation formatting
2. Profile card typography
3. Search result optimization
4. Notification text hierarchy

#### Phase 3 - Polish (Week 3)
1. Dark mode refinement
2. Animation timing with text
3. Loading state messages
4. Success celebration copy

### 11. QUALITY METRICS

#### Success Criteria
- Readability Score: >80 (Flesch-Kincaid)
- Load Time: <100ms for primary fonts
- Contrast Compliance: 100% AA standard
- Character Count: 45-75 per line achieved
- User Satisfaction: >90% clarity rating

#### Testing Protocol
1. Cross-browser font rendering check
2. Mobile readability assessment
3. Dark mode contrast validation
4. Screen reader compatibility
5. International character support