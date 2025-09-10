# CastMatch Breakpoint Specifications

## Responsive Breakpoint System

CastMatch implements a comprehensive 8-tier breakpoint system optimized for casting industry workflows.

### Breakpoint Definitions

```css
/* Mobile-First Breakpoints */
:root {
  --bp-mobile-s:  320px;  /* Small phones */
  --bp-mobile-m:  375px;  /* Standard phones */
  --bp-mobile-l:  425px;  /* Large phones */
  --bp-tablet:    768px;  /* Tablets, small laptops */
  --bp-desktop-s: 1024px; /* Small desktops */
  --bp-desktop-m: 1440px; /* Standard desktops */
  --bp-desktop-l: 1920px; /* Large displays */
  --bp-desktop-xl: 2560px; /* Ultra-wide displays */
}
```

### Media Query Mixins

```css
/* Custom media queries for container queries */
@custom-media --mobile-s (min-width: 320px);
@custom-media --mobile-m (min-width: 375px);
@custom-media --mobile-l (min-width: 425px);
@custom-media --tablet (min-width: 768px);
@custom-media --desktop-s (min-width: 1024px);
@custom-media --desktop-m (min-width: 1440px);
@custom-media --desktop-l (min-width: 1920px);
@custom-media --desktop-xl (min-width: 2560px);
```

### Grid Column Structure per Breakpoint

#### Mobile (320px - 767px)
- **Columns**: 4
- **Gutter**: 16px
- **Margins**: 16px
- **Max-width**: 100%

#### Tablet (768px - 1023px)
- **Columns**: 8
- **Gutter**: 24px
- **Margins**: 32px
- **Max-width**: 100%

#### Desktop Small (1024px - 1439px)
- **Columns**: 12
- **Gutter**: 24px
- **Margins**: 48px
- **Max-width**: 1200px

#### Desktop Medium+ (1440px+)
- **Columns**: 16
- **Gutter**: 32px
- **Margins**: 64px
- **Max-width**: 1440px

### Container Query Implementation

```css
/* Component-level responsiveness */
.talent-grid {
  container-type: inline-size;
  container-name: talent-grid;
}

@container talent-grid (min-width: 320px) {
  .talent-card {
    grid-template-columns: 1fr;
  }
}

@container talent-grid (min-width: 768px) {
  .talent-card {
    grid-template-columns: repeat(2, 1fr);
  }
}

@container talent-grid (min-width: 1024px) {
  .talent-card {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

### Fluid Typography Scale

```css
/* Responsive font sizes using clamp() */
:root {
  --font-xs: clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem);   /* 12px-14px */
  --font-sm: clamp(0.875rem, 0.8rem + 0.375vw, 1rem);     /* 14px-16px */
  --font-base: clamp(1rem, 0.9rem + 0.5vw, 1.125rem);     /* 16px-18px */
  --font-lg: clamp(1.125rem, 1rem + 0.625vw, 1.25rem);    /* 18px-20px */
  --font-xl: clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem);     /* 20px-24px */
  --font-2xl: clamp(1.5rem, 1.3rem + 1vw, 2rem);          /* 24px-32px */
  --font-3xl: clamp(2rem, 1.7rem + 1.5vw, 2.5rem);        /* 32px-40px */
}
```

### Aspect Ratio Adaptations

```css
/* Responsive aspect ratios for talent cards */
.talent-card-image {
  aspect-ratio: 3/4; /* Portrait default */
}

@media (max-width: 767px) {
  .talent-card-image {
    aspect-ratio: 4/3; /* Landscape on mobile */
  }
}

@media (min-width: 1440px) {
  .talent-card-image {
    aspect-ratio: 2/3; /* Taller on large screens */
  }
}
```

### Performance Optimizations

#### Critical Breakpoints
Load optimized assets at key breakpoints:
- **320px**: Essential mobile layout
- **768px**: Tablet enhancements
- **1024px**: Desktop features
- **1440px**: Enhanced visuals

#### GPU Acceleration
```css
.responsive-grid {
  will-change: transform;
  contain: layout style paint;
}
```

### Accessibility Considerations

```css
/* Respect user motion preferences */
@media (prefers-reduced-motion: reduce) {
  .grid-transition {
    transition: none;
  }
}

/* High contrast support */
@media (prefers-contrast: high) {
  .grid-container {
    border: 2px solid var(--border-high-contrast);
  }
}
```

### Testing Viewports

Primary test targets:
- **iPhone SE**: 375×667
- **iPhone 14 Pro**: 393×852
- **iPad Air**: 820×1180
- **MacBook Pro 13"**: 1440×900
- **MacBook Pro 16"**: 1728×1117
- **Desktop 24"**: 1920×1080
- **Desktop 27"**: 2560×1440

### Implementation Notes

- Use `em` units for media queries for zoom accessibility
- Implement container queries for component-level responsiveness
- Test across all breakpoints using browser dev tools
- Validate with real devices when possible
- Monitor Core Web Vitals across all breakpoints

Last updated: September 2025