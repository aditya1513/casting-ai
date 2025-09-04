# Dark Theme Variants for CastMatch
## Mumbai Cinema-Inspired Dark Mode Collection

### Core Dark Theme Philosophy

CastMatch employs a **pure black foundation** optimized for OLED displays, reducing power consumption while creating infinite contrast ratios. The dark theme system draws inspiration from Mumbai's cinematic landscape - from the deep shadows of film noir to the neon-lit streets of contemporary Bollywood.

---

## Theme Variants

### 1. **Mumbai Midnight** (Default Dark Theme)
*The signature CastMatch dark experience*

#### Color Palette
```css
--background-primary: oklch(0% 0 0);           /* Pure black */
--background-secondary: oklch(0.12 0.008 240); /* Charcoal */  
--background-tertiary: oklch(0.18 0.012 240);  /* Midnight */
--text-primary: oklch(0.85 0.18 195);          /* Cyan bright */
--text-secondary: oklch(0.78 0.15 200);        /* Cyan primary */
--accent-primary: oklch(0.88 0.15 90);         /* Royal gold */
--accent-secondary: oklch(0.75 0.35 320);      /* Magenta bright */
```

#### Visual Characteristics
- **Background**: Pure black (#000000) for maximum OLED efficiency
- **Cards**: Subtle charcoal (#1A1A1B) with rim lighting
- **Typography**: Electric cyan for primary text, softer cyan for secondary
- **Accents**: Royal gold for premium elements, neon magenta for alerts
- **Atmosphere**: Subtle volumetric fog effects, breathing neon glows

#### Use Cases
- Primary user experience for evening/night usage
- Premium content viewing
- Battery-conscious mobile usage
- Cinematic content consumption

---

### 2. **Bollywood Noir** (High Contrast)
*Dramatic contrast inspired by classic film noir*

#### Color Palette
```css
--background-primary: oklch(0% 0 0);           /* Pure black */
--background-secondary: oklch(0.08 0.005 240); /* Deeper charcoal */
--background-tertiary: oklch(0.15 0.010 240);  /* Dark gray */
--text-primary: oklch(0.95 0.02 200);          /* Near white */
--text-secondary: oklch(0.85 0.18 195);        /* Bright cyan */
--accent-primary: oklch(0.92 0.08 95);         /* Champagne */
--accent-secondary: oklch(0.68 0.22 45);       /* Vermillion */
```

#### Visual Characteristics
- **Enhanced Contrast**: Stark black and near-white text
- **Dramatic Shadows**: Deep shadow layers with sharp edges
- **Bold Accents**: Champagne gold and vermillion red highlights
- **Minimal Glow**: Reduced atmospheric effects for clarity
- **Sharp Edges**: Clean, geometric designs without soft blur

#### Use Cases
- Accessibility requirements (vision impairments)
- Bright environment usage
- Professional casting director interface
- High-precision editing tasks

---

### 3. **Marine Drive** (Coastal Evening)
*Inspired by Mumbai's iconic seafront*

#### Color Palette  
```css
--background-primary: oklch(0.05 0.008 220);   /* Deep ocean */
--background-secondary: oklch(0.15 0.015 220); /* Coastal night */
--background-tertiary: oklch(0.22 0.012 210);  /* Moonlit water */
--text-primary: oklch(0.88 0.15 190);          /* Sea foam */
--text-secondary: oklch(0.75 0.12 200);        /* Ocean mist */
--accent-primary: oklch(0.82 0.12 85);         /* Golden hour */
--accent-secondary: oklch(0.55 0.12 210);      /* Deep teal */
```

#### Visual Characteristics
- **Base**: Deep ocean blues instead of pure black
- **Texture**: Subtle wave-like gradient animations
- **Lighting**: Warm golden accents mimicking street lights
- **Atmosphere**: Gentle sea mist effects
- **Motion**: Slow, rhythmic breathing animations

#### Use Cases
- Relaxed evening browsing
- Romantic genre content
- Meditation/wellness content
- Coastal region user preference

---

### 4. **Neon Streets** (Cyberpunk Mumbai)
*Futuristic interpretation of Mumbai's tech district*

#### Color Palette
```css
--background-primary: oklch(0.02 0.008 280);   /* Tech black */
--background-secondary: oklch(0.12 0.015 280); /* Digital purple */
--background-tertiary: oklch(0.18 0.020 260);  /* Cyber gray */
--text-primary: oklch(0.88 0.25 320);          /* Electric magenta */
--text-secondary: oklch(0.85 0.18 195);        /* Neon cyan */
--accent-primary: oklch(0.92 0.08 95);         /* Digital gold */
--accent-secondary: oklch(0.78 0.35 140);      /* Matrix green */
```

#### Visual Characteristics
- **Base**: Deep purple-tinted blacks
- **Glow**: Intense neon glow effects on all interactive elements
- **Animation**: Rapid pulse animations, digital glitch effects
- **Patterns**: Circuit-board inspired subtle patterns
- **Typography**: Sharp, tech-inspired font rendering

#### Use Cases
- Gaming content
- Sci-fi genre emphasis  
- Tech-savvy younger demographics
- Night mode for tech professionals

---

### 5. **Film Studio** (Professional Grade)
*Color-accurate theme for industry professionals*

#### Color Palette
```css
--background-primary: oklch(0.08 0.002 240);   /* Studio black */
--background-secondary: oklch(0.18 0.005 240); /* Equipment gray */
--background-tertiary: oklch(0.25 0.008 240);  /* Monitor bezel */
--text-primary: oklch(0.90 0.05 200);          /* Reference white */
--text-secondary: oklch(0.75 0.08 200);        /* Studio gray */
--accent-primary: oklch(0.85 0.15 90);         /* Warning amber */
--accent-secondary: oklch(0.65 0.20 25);       /* Record red */
```

#### Visual Characteristics
- **Color Accuracy**: Calibrated for professional color grading
- **Minimal Effects**: No atmospheric effects that could interfere
- **High Precision**: Exact color reproduction for industry work
- **Reference Grid**: Optional grid overlays for alignment
- **Status Indicators**: Clear recording/live status colors

#### Use Cases
- Professional casting directors
- Content creators and editors  
- Color grading sessions
- Industry screening rooms

---

### 6. **Monsoon Mood** (Seasonal Variant)
*Capturing Mumbai's dramatic monsoon atmosphere*

#### Color Palette
```css
--background-primary: oklch(0.06 0.012 240);   /* Storm cloud */
--background-secondary: oklch(0.16 0.015 230); /* Rain-soaked */  
--background-tertiary: oklch(0.24 0.018 220);  /* Wet pavement */
--text-primary: oklch(0.82 0.15 200);          /* Lightning cyan */
--text-secondary: oklch(0.68 0.12 210);        /* Rain drop */
--accent-primary: oklch(0.75 0.18 75);         /* Thunder gold */
--accent-secondary: oklch(0.45 0.15 240);      /* Deep monsoon */
```

#### Visual Characteristics
- **Weather Effects**: Animated rain drop particles
- **Lightning Flashes**: Subtle electrical glow animations
- **Wet Surfaces**: Glass morphism with water droplet effects
- **Storm Clouds**: Dynamic gradient backgrounds
- **Thunder**: Brief bright flashes for notifications

#### Use Cases
- Monsoon season (June-September)
- Drama and thriller content
- Atmospheric content consumption
- Regional weather-based adaptation

---

## Implementation Guidelines

### CSS Custom Property System

```css
/* Theme Switching System */
:root[data-theme="mumbai-midnight"] {
  /* Mumbai Midnight variables */
}

:root[data-theme="bollywood-noir"] {
  /* Bollywood Noir variables */
}

:root[data-theme="marine-drive"] {
  /* Marine Drive variables */
}

/* Theme transition animations */
* {
  transition: 
    background-color 300ms ease,
    color 300ms ease,
    border-color 300ms ease,
    box-shadow 300ms ease;
}
```

### Accessibility Considerations

#### Contrast Ratios (WCAG AAA Compliance)
- **Normal text**: Minimum 7:1 contrast ratio
- **Large text**: Minimum 4.5:1 contrast ratio  
- **Interactive elements**: Minimum 3:1 contrast ratio
- **Focus indicators**: Minimum 3:1 contrast with additional visual cues

#### Color Blind Support
- All themes tested with Protanopia, Deuteranopia, and Tritanopia filters
- Never rely solely on color for critical information
- Alternative visual patterns for color-coded elements

#### Motion Sensitivity
```css
@media (prefers-reduced-motion: reduce) {
  /* Disable all atmospheric animations */
  .neon-glow, .volumetric-fog, .particle-field {
    animation: none;
  }
}
```

### Performance Optimization

#### OLED Power Efficiency
- Pure black pixels consume zero power on OLED displays
- Minimize bright pixel areas to extend battery life
- Dark theme reduces power consumption by 30-60%

#### GPU Acceleration
```css
.theme-optimized {
  will-change: background-color, box-shadow;
  transform: translateZ(0); /* Force GPU layer */
}
```

#### Memory Management
- Lazy load atmospheric effects based on viewport
- Reduce particle count on lower-end devices
- Optimize gradient complexity for mobile GPUs

### User Customization Options

#### Brightness Levels
- **Dimmed** (20% opacity on all glows)
- **Standard** (Default opacity levels)  
- **Vivid** (120% opacity on all glows)

#### Animation Intensity
- **Minimal** (Static theme, no animations)
- **Subtle** (Gentle breathing effects only)
- **Dynamic** (Full atmospheric system)

#### Cultural Preferences
- **Traditional** (Emphasis on gold and saffron)
- **Contemporary** (Focus on neon cyan and magenta)
- **Balanced** (Equal traditional and modern elements)

### Theme Selection Logic

#### Automatic Selection
```javascript
// Time-based theme switching
const hour = new Date().getHours();
if (hour >= 22 || hour <= 6) {
  setTheme('mumbai-midnight');
} else if (hour >= 18) {
  setTheme('marine-drive');
}

// Weather-based adaptation
if (weather.condition === 'rain') {
  setTheme('monsoon-mood');
}
```

#### User Preference Persistence
```javascript
// Store theme preference
localStorage.setItem('castmatch-theme', selectedTheme);
localStorage.setItem('castmatch-brightness', brightnessLevel);
localStorage.setItem('castmatch-animations', animationLevel);
```

### Testing Framework

#### Cross-Device Validation
- **OLED Displays**: Samsung Galaxy, iPhone OLED models
- **LCD Displays**: Standard monitors, budget phones
- **E-Ink**: Kindle, E-reader compatibility
- **Projectors**: Large screen presentation mode

#### Accessibility Auditing
- Automated contrast ratio testing
- Screen reader compatibility validation  
- Keyboard navigation verification
- Color blind simulation testing

This comprehensive dark theme system ensures CastMatch provides an optimal viewing experience across Mumbai's diverse user base while maintaining cultural authenticity and technical excellence.