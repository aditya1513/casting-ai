# Hero Section Design Brief
## CastMatch Landing Page - Primary Viewport

### SECTION OVERVIEW
The hero section is the most critical 100vh of our landing page, setting the tone for the entire CastMatch experience. It must immediately convey professionalism, innovation, and Mumbai's entertainment industry excellence.

## LAYOUT STRUCTURE

### Desktop (1440px)
```
┌─────────────────────────────────────────────────────────┐
│  Navigation Bar (80px height, glassmorphic, fixed)      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────┬────────────────────────────┐  │
│  │                      │                            │  │
│  │   HEADLINE (60%)     │   VISUAL ELEMENT (40%)     │  │
│  │                      │                            │  │
│  │  "Cast Your Vision,  │   [Talent Card Carousel]   │  │
│  │   Find Your Star"    │                            │  │
│  │                      │   ┌──────────┐             │  │
│  │  Supporting text     │   │ Talent 1 │             │  │
│  │  explaining value    │   └──────────┘             │  │
│  │                      │   ┌──────────┐             │  │
│  │  [CTA Button 1]      │   │ Talent 2 │             │  │
│  │  [CTA Button 2]      │   └──────────┘             │  │
│  │                      │   ┌──────────┐             │  │
│  │  Trust badges below  │   │ Talent 3 │             │  │
│  │                      │   └──────────┘             │  │
│  └──────────────────────┴────────────────────────────┘  │
│                                                          │
│  ─────────────────────────────────────────────────────   │
│  "Trusted by 1000+ Productions | 50,000+ Talents"       │
└─────────────────────────────────────────────────────────┘
```

### Mobile (375px)
```
┌─────────────────────┐
│ Nav (60px)          │
├─────────────────────┤
│                     │
│  HEADLINE           │
│  "Cast Your Vision, │
│   Find Your Star"   │
│                     │
│  Supporting text    │
│                     │
│  [Talent Cards]     │
│  Horizontal scroll  │
│                     │
│  [CTA Button 1]     │
│  [CTA Button 2]     │
│                     │
│  Trust badges       │
│                     │
└─────────────────────┘
```

## CONTENT SPECIFICATIONS

### Headlines
**Primary**: "Cast Your Vision, Find Your Star"
- Font: Inter Display
- Desktop: 72px/80px
- Mobile: 40px/48px
- Weight: 700
- Gradient text effect

**Supporting**: "AI-powered casting that connects Mumbai's finest talent with visionary productions in minutes, not months."
- Font: Inter
- Desktop: 20px/32px
- Mobile: 16px/24px
- Weight: 400
- Color: text.secondary

### CTA Buttons
**Primary CTA**: "Start Casting Today"
- Background: Linear gradient (#FF6B35 to #F7931E)
- Padding: 20px 40px
- Font: 18px/24px, weight 600
- Shadow: 0 8px 32px rgba(255, 107, 53, 0.3)
- Hover: Scale(1.05) + glow effect

**Secondary CTA**: "Join as Talent"
- Background: Glassmorphic (rgba(255, 255, 255, 0.1))
- Border: 2px solid rgba(255, 255, 255, 0.2)
- Padding: 18px 38px
- Font: 18px/24px, weight 600

### Visual Element - Talent Carousel
**Card Design**:
- Size: 280px x 380px
- Background: Glassmorphic with image overlay
- Content: Talent photo, name, role, rating
- Animation: Gentle float (transform: translateY)
- Auto-rotate: Every 4 seconds
- Hover: Pause + scale(1.02)

**Card Layout**:
```
┌──────────────┐
│              │ <- Talent photo
│    [Photo]   │    (gradient overlay)
│              │
├──────────────┤
│ Name         │ <- Glassmorphic bar
│ Role | ★4.9  │
└──────────────┘
```

## VISUAL TREATMENT

### Background
- Base: Linear gradient (#0A0E27 to #1A1F3A)
- Overlay: Animated gradient mesh (subtle movement)
- Particles: Floating light orbs (canvas/WebGL)
- Blur spots: Strategic gaussian blur for depth

### Glassmorphism Effects
```css
.glass-element {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
```

### Mumbai Gradient System
- Sunrise: #FF6B35 → #F7931E (CTAs)
- Sunset: #4A154B → #7B2869 (Accents)
- Night: #0A0E27 → #1A1F3A (Backgrounds)
- Bollywood Gold: #FFD700 → #FFA500 (Premium)

## ANIMATION SPECIFICATIONS

### Entry Sequence (0-2s)
1. **0-0.3s**: Navigation fade in
2. **0.3-0.8s**: Headline word-by-word reveal
3. **0.8-1.2s**: Supporting text fade up
4. **1.2-1.6s**: CTAs slide in from bottom
5. **1.6-2.0s**: Talent cards staggered entry

### Continuous Animations
- Gradient mesh: Slow morph (60s loop)
- Talent cards: Gentle float (4s ease-in-out)
- Particles: Random drift paths
- CTAs: Subtle pulse on idle (8s interval)

### Interaction Animations
- CTA hover: Scale(1.05) + glow (200ms ease)
- Card hover: Scale(1.02) + shadow (300ms ease)
- Scroll indicator: Bounce (2s loop)
- Navigation hover: Background slide (150ms)

## RESPONSIVE BEHAVIORS

### Breakpoint Adjustments
- **1440px+**: Full layout with all animations
- **1024-1439px**: Reduced card size, maintained layout
- **768-1023px**: Stack layout, horizontal card scroll
- **375-767px**: Mobile optimized, reduced animations
- **<375px**: Minimum viable layout

### Performance Optimizations
- Lazy load talent images
- WebP with JPEG fallback
- Reduce animations on mobile
- Preload critical fonts
- CSS containment for cards

## ACCESSIBILITY REQUIREMENTS

### Keyboard Navigation
- Tab order: Logo → Nav → Headline → CTAs → Cards
- Focus indicators: 3px outline with offset
- Skip to main content link
- Escape key closes any overlays

### Screen Reader Support
- Semantic HTML structure
- ARIA labels for all interactive elements
- Alt text for talent images
- Role attributes for custom components

### Visual Accessibility
- Contrast ratio: Minimum 4.5:1 (AAA for body text)
- Font size: Minimum 16px
- Tap targets: Minimum 44x44px
- Reduced motion option available

## TRUST INDICATORS

### Bottom Bar Content
"Trusted by 1000+ Productions | 50,000+ Verified Talents | 500+ Daily Castings"
- Position: Absolute bottom, centered
- Style: Glassmorphic bar
- Icons: Custom film industry symbols
- Animation: Subtle fade in after 2s

### Client Logos (Optional)
- Dharma Productions
- Red Chillies Entertainment
- Excel Entertainment
- Yash Raj Films
- Display: Grayscale with hover color

## TECHNICAL SPECIFICATIONS

### Performance Targets
- First Paint: <500ms
- First Contentful Paint: <1s
- Largest Contentful Paint: <2s
- Time to Interactive: <2.5s
- Total blocking time: <200ms

### Code Structure
```jsx
<section className="hero" role="banner">
  <nav className="hero__nav" />
  <div className="hero__content">
    <div className="hero__text">
      <h1 className="hero__headline" />
      <p className="hero__support" />
      <div className="hero__ctas" />
    </div>
    <div className="hero__visual">
      <TalentCarousel />
    </div>
  </div>
  <div className="hero__trust" />
</section>
```

## DELIVERABLES CHECKLIST

- [ ] Desktop design (1440px)
- [ ] Laptop design (1024px)
- [ ] Tablet design (768px)
- [ ] Mobile design (375px)
- [ ] Animation prototypes
- [ ] Component specifications
- [ ] Asset export package
- [ ] Developer handoff notes

---

**Next Steps**: UX Wireframe Architect to begin implementation immediately. Visual Systems Architect to prepare token application. Review checkpoint at Hour 6.