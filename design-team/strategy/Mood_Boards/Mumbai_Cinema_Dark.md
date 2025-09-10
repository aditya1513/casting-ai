# Mood Board: Mumbai Cinema Dark Theme

## Concept: "Where Dreams Meet Digital"
*A sophisticated dark interface that captures the magic of Mumbai's film industry while maintaining modern usability standards.*

---

## Color Palette

### Primary Colors
```css
/* Mumbai Nights */
--midnight-black: #000000;        /* True black for OLED optimization */
--charcoal-elevated: #0A0A0B;     /* Slightly elevated surfaces */
--smoke-glass: #1A1A1D;           /* Card backgrounds */

/* Neon Accents - The City Lights */
--electric-blue: #00D4FF;         /* Primary CTA, links */
--magenta-glow: #FF006E;          /* Alerts, notifications */
--amber-spotlight: #FFB800;       /* Warnings, highlights */
--mint-success: #00FF88;          /* Success states */
```

### Gradient Overlays
```css
/* Cinematic Gradients */
.bollywood-sunset {
  background: linear-gradient(135deg, #FF006E 0%, #FFB800 100%);
}

.mumbai-twilight {
  background: linear-gradient(180deg, #0A0A0B 0%, #1A1A1D 50%, #0A0A0B 100%);
}

.neon-glow {
  background: radial-gradient(circle, #00D4FF33 0%, transparent 70%);
}
```

---

## Visual References

### 1. Film Noir Meets Neon
- **Inspiration**: Blade Runner 2049 + Mumbai street lights
- **Application**: Main dashboard and navigation
- **Elements**:
  - Deep blacks with subtle blue undertones
  - Neon accents on hover states
  - Reflective glass surfaces (backdrop-filter)
  - Subtle film grain texture overlay

### 2. Mumbai Skyline at Night
- **Inspiration**: Marine Drive's Queen's Necklace
- **Application**: Background patterns and hero sections
- **Elements**:
  - String of lights pattern for loading states
  - City silhouette for empty states
  - Animated light trails for transitions
  - Building window grid for data tables

### 3. Cinema Hall Aesthetics
- **Inspiration**: Classic single-screen theaters of Mumbai
- **Application**: Media viewers and galleries
- **Elements**:
  - Red velvet curtain animations
  - Gold accent borders
  - Spotlight effects on focus
  - Theater seat pattern for lists

### 4. Film Set Lighting
- **Inspiration**: Behind-the-scenes production
- **Application**: Content creation interfaces
- **Elements**:
  - Softbox lighting effects
  - Key light and fill light shadows
  - Rim lighting on portraits
  - Color temperature adjustments

---

## Typography Mood

### Headlines: Cinematic Impact
```css
.headline-hero {
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(48px, 8vw, 96px);
  letter-spacing: 0.02em;
  text-transform: uppercase;
  background: linear-gradient(180deg, #FFFFFF 0%, #808080 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

### Body Text: Clean & Readable
```css
.body-text {
  font-family: 'Inter', 'Noto Sans Devanagari', sans-serif;
  font-size: 16px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.87);
  letter-spacing: 0.01em;
}
```

### Script Support: Devanagari
```css
.hindi-text {
  font-family: 'Noto Sans Devanagari', sans-serif;
  font-weight: 400;
  line-height: 1.8;
}
```

---

## Material & Texture

### Glass Morphism
```css
.glass-card {
  background: rgba(26, 26, 29, 0.7);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 
    0 8px 32px rgba(0, 212, 255, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
```

### Neon Glow Effects
```css
.neon-button {
  box-shadow: 
    0 0 20px rgba(0, 212, 255, 0.5),
    0 0 40px rgba(0, 212, 255, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  border: 1px solid #00D4FF;
}
```

### Film Grain Overlay
```css
.film-grain {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.03;
  z-index: 1;
  pointer-events: none;
  background-image: url('data:image/svg+xml;base64,...');
  animation: grain 8s steps(10) infinite;
}
```

---

## Icon System

### Style Direction
- **Line Weight**: 1.5px for regular, 2px for bold
- **Corner Radius**: 2px for sharp tech feel
- **Color Treatment**: Monochrome with neon accent on interaction

### Custom Icons
1. **Clapperboard**: Main logo element
2. **Spotlight**: Search and discovery
3. **Film Reel**: Media management
4. **Director's Chair**: Authority actions
5. **Camera**: Content creation
6. **Ticket**: Booking and scheduling

---

## Motion & Animation

### Transition Timing
```css
:root {
  --ease-out-expo: cubic-bezier(0.19, 1, 0.22, 1);
  --ease-in-out-quart: cubic-bezier(0.77, 0, 0.175, 1);
  --duration-quick: 200ms;
  --duration-normal: 400ms;
  --duration-slow: 600ms;
}
```

### Signature Animations
1. **Curtain Reveal**: Page transitions
2. **Spotlight Focus**: Element emphasis
3. **Neon Flicker**: Loading states
4. **Film Roll**: Horizontal scrolling
5. **Fade to Black**: Modal transitions

---

## Component Styling

### Talent Cards
- Black base with subtle gradient border
- Profile image with rim lighting effect
- Neon accent for "Available" status
- Glass overlay for quick actions
- Film strip decoration for portfolios

### Navigation Bar
- Floating glass morphism bar
- Neon underglow on active items
- Spotlight effect follows cursor
- Mumbai skyline silhouette background
- Hindi/English language toggle

### Data Tables
- Alternating row opacity (0.03 difference)
- Neon highlight on row hover
- Column headers with glass effect
- Sticky elements with blur backdrop
- Zebra striping with film reference

---

## Empty States

### Concepts
1. **"Intermission"**: No data available
2. **"The End"**: End of content
3. **"Coming Soon"**: Upcoming features
4. **"Technical Difficulties"**: Error states
5. **"House Full"**: Capacity reached

### Visual Treatment
- Vintage cinema announcements style
- Art deco borders and typography
- Subtle animation loops
- Mumbai landmark silhouettes
- Film countdown numbers

---

## Responsive Behavior

### Mobile Adaptations
- Increased contrast for outdoor visibility
- Larger touch targets with neon halos
- Bottom sheet with glass effect
- Swipe gestures with light trails
- Haptic feedback on interactions

### Desktop Enhancements
- Cursor spotlight effect
- Parallax scrolling backgrounds
- Extended hover states
- Multi-column layouts
- Picture-in-picture video mode

---

## Cultural Elements

### Festival Themes
1. **Diwali**: Golden accents, firework particles
2. **Holi**: Color splash transitions
3. **Ganesh Chaturthi**: Decorative patterns
4. **Eid**: Crescent moon motifs
5. **Christmas**: Star light overlays

### Bollywood References
- Red carpet treatment for VIP profiles
- Award badge designs
- Film poster layouts for projects
- Credits roll for team pages
- Star rating with actual stars

---

## Accessibility Considerations

### High Contrast Mode
- Pure white (#FFFFFF) on black (#000000)
- Thicker borders (2px minimum)
- Larger focus indicators
- Reduced transparency effects
- Simplified gradients

### Reduced Motion
- Instant transitions
- Static backgrounds
- No parallax effects
- Simple fade animations only
- Respect prefers-reduced-motion

---

## Implementation Notes

### Performance Optimizations
- Use CSS custom properties for theming
- Lazy load gradient backgrounds
- GPU-accelerated animations only
- Optimize blur effects for mobile
- Progressive enhancement approach

### Browser Support
- Modern browsers: Full experience
- Safari: Adjust backdrop-filter values
- Firefox: Alternative glass effects
- Mobile browsers: Reduced blur radius
- PWA: Offline theme caching

---

*Mood Board Version: 1.0*
*Created: Q1 2025*
*Designer: Chief Design Officer*
*Purpose: Primary dark theme for CastMatch platform*