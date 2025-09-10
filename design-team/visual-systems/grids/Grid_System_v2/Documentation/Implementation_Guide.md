# CastMatch Grid System v2.0 - Implementation Guide
## Complete Developer Reference

---

## Quick Start

### 1. Include the Grid System CSS
```html
<link rel="stylesheet" href="/path/to/castmatch-grid-system.css">
```

### 2. Basic Grid Container
```html
<div class="grid-container">
  <div class="col-span-4 tablet:col-span-6 desktop:col-span-8">
    <!-- Content -->
  </div>
  <div class="col-span-4 tablet:col-span-2 desktop:col-span-4">
    <!-- Sidebar -->
  </div>
</div>
```

---

## Core Grid Patterns

### 12-Column Grid System

#### Basic Structure
```html
<div class="grid-container">
  <!-- Full width -->
  <div class="col-span-full">Header</div>
  
  <!-- Half/Half -->
  <div class="desktop:col-span-6">Left</div>
  <div class="desktop:col-span-6">Right</div>
  
  <!-- Thirds -->
  <div class="desktop:col-span-4">One Third</div>
  <div class="desktop:col-span-4">One Third</div>
  <div class="desktop:col-span-4">One Third</div>
  
  <!-- Asymmetric -->
  <div class="desktop:col-span-8">Main Content</div>
  <div class="desktop:col-span-4">Sidebar</div>
</div>
```

#### Responsive Columns
```html
<!-- Mobile: 1 col, Tablet: 2 cols, Desktop: 3 cols -->
<div class="grid-container">
  <div class="col-span-4 tablet:col-span-4 desktop:col-span-4">Item 1</div>
  <div class="col-span-4 tablet:col-span-4 desktop:col-span-4">Item 2</div>
  <div class="col-span-4 tablet:col-span-4 desktop:col-span-4">Item 3</div>
</div>
```

---

## Specialized Layouts

### 1. Talent Card Grid
Auto-responsive grid that adapts to content.

```html
<div class="talent-card-grid">
  <article class="talent-card">
    <img src="talent-photo.jpg" alt="Talent">
    <h3>Talent Name</h3>
    <p>Role</p>
  </article>
  <!-- More cards... -->
</div>
```

**CSS Configuration:**
```css
.talent-card-grid {
  /* Auto-fit with minimum 280px cards */
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--gutter-mobile); /* 16px on mobile */
}

@media (min-width: 768px) {
  .talent-card-grid {
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: var(--gutter-tablet); /* 24px on tablet */
  }
}
```

### 2. Dashboard Layout
Three-panel responsive dashboard.

```html
<div class="dashboard-grid">
  <aside class="dashboard-sidebar">
    <!-- Navigation -->
  </aside>
  <main class="dashboard-main">
    <!-- Main content -->
  </main>
  <aside class="dashboard-auxiliary">
    <!-- Widgets -->
  </aside>
</div>
```

**Responsive Behavior:**
- Mobile: Stacked vertically
- Tablet: Sidebar + Main
- Desktop: Sidebar + Main + Auxiliary

### 3. Bento Grid (Asymmetric)
Pinterest-style varied card sizes.

```html
<div class="bento-grid">
  <div class="bento-item-small">Small</div>
  <div class="bento-item-wide">Wide</div>
  <div class="bento-item-tall">Tall</div>
  <div class="bento-item-large">Large</div>
  <div class="bento-item-featured">Featured</div>
</div>
```

**Size Variations:**
- `bento-item-small`: 1×1
- `bento-item-wide`: 2×1
- `bento-item-tall`: 1×2
- `bento-item-large`: 2×2
- `bento-item-featured`: 3×2

### 4. Form Grid
Aligned form layouts with proper spacing.

```html
<form class="form-grid">
  <!-- Half width inputs -->
  <div class="form-group">
    <label>First Name</label>
    <input type="text">
  </div>
  <div class="form-group">
    <label>Last Name</label>
    <input type="text">
  </div>
  
  <!-- Full width input -->
  <div class="form-group form-grid-full">
    <label>Email</label>
    <input type="email">
  </div>
  
  <!-- Three columns -->
  <div class="form-group desktop:col-span-4">
    <label>City</label>
    <input type="text">
  </div>
  <div class="form-group desktop:col-span-4">
    <label>State</label>
    <select><!-- Options --></select>
  </div>
  <div class="form-group desktop:col-span-4">
    <label>ZIP</label>
    <input type="text">
  </div>
</form>
```

---

## Spacing System Implementation

### Using Spacing Tokens
```css
/* Component Example */
.card {
  padding: var(--spacing-3);           /* 24px */
  margin-bottom: var(--spacing-4);     /* 32px */
}

.card-header {
  padding-bottom: var(--spacing-2);    /* 16px */
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: var(--spacing-2);     /* 16px */
}

.card-content {
  display: flex;
  gap: var(--spacing-2);               /* 16px between items */
}
```

### Golden Ratio Spacing
For premium, harmonious layouts:
```css
.hero-section {
  padding-top: var(--spacing-phi-5);    /* 89px */
  padding-bottom: var(--spacing-phi-4); /* 55px */
}

.feature-grid {
  gap: var(--spacing-phi-2);            /* 21px */
}
```

---

## Responsive Patterns

### Mobile-First Approach
```css
/* Base (Mobile) */
.element {
  grid-column: span 4;  /* Full width on mobile */
  padding: var(--spacing-2);
}

/* Tablet */
@media (min-width: 768px) {
  .element {
    grid-column: span 4;  /* Half width on tablet */
    padding: var(--spacing-3);
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .element {
    grid-column: span 3;  /* Quarter width on desktop */
    padding: var(--spacing-4);
  }
}
```

### Container Queries (Component-Based)
```css
.card-container {
  container-type: inline-size;
}

/* Respond to container size, not viewport */
@container (min-width: 400px) {
  .card {
    grid-template-columns: 120px 1fr;
  }
}

@container (min-width: 600px) {
  .card {
    grid-template-columns: 180px 1fr auto;
  }
}
```

---

## Density Variations

### Implementation
```html
<!-- Default Comfortable Density -->
<div class="talent-card-grid">
  <!-- Cards with normal spacing -->
</div>

<!-- Compact Density (-20% spacing) -->
<div class="talent-card-grid density-compact">
  <!-- Cards with reduced spacing -->
</div>

<!-- Spacious Density (+20% spacing) -->
<div class="talent-card-grid density-spacious">
  <!-- Cards with increased spacing -->
</div>
```

### JavaScript Toggle
```javascript
function setDensity(density) {
  const grid = document.querySelector('.talent-card-grid');
  
  // Remove all density classes
  grid.classList.remove('density-compact', 'density-spacious');
  
  // Add selected density
  if (density !== 'comfortable') {
    grid.classList.add(`density-${density}`);
  }
  
  // Save preference
  localStorage.setItem('grid-density', density);
}

// Load saved preference
const savedDensity = localStorage.getItem('grid-density') || 'comfortable';
setDensity(savedDensity);
```

---

## Performance Optimization

### CSS Containment
```css
/* Isolate layout calculations */
.grid-item {
  contain: layout style paint;
}

/* For static content */
.grid-static {
  contain: strict;
  content-visibility: auto;
}
```

### GPU Acceleration
```css
.grid-container {
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
}
```

### Lazy Loading Grid Items
```html
<div class="talent-card-grid">
  <article class="talent-card" loading="lazy">
    <img src="talent.jpg" loading="lazy" alt="Talent">
    <!-- Content -->
  </article>
</div>
```

---

## Accessibility Best Practices

### Semantic HTML
```html
<main class="grid-container">
  <article class="col-span-8">
    <h1>Main Content</h1>
    <!-- Content -->
  </article>
  <aside class="col-span-4">
    <h2>Related Information</h2>
    <!-- Sidebar -->
  </aside>
</main>
```

### Focus Management
```css
.grid-item:focus-visible {
  outline: 2px solid var(--focus-color, #3B82F6);
  outline-offset: 2px;
}
```

### Skip Links
```html
<a href="#main-content" class="skip-link">Skip to main content</a>
<div class="grid-container">
  <main id="main-content">
    <!-- Content -->
  </main>
</div>
```

---

## React/Next.js Integration

### Grid Component
```jsx
import styles from './castmatch-grid-system.module.css';

function GridContainer({ children, className = '' }) {
  return (
    <div className={`${styles.gridContainer} ${className}`}>
      {children}
    </div>
  );
}

function GridItem({ span = 12, tablet = null, desktop = null, children }) {
  const classes = [
    styles[`colSpan${span}`],
    tablet && styles[`tablet:colSpan${tablet}`],
    desktop && styles[`desktop:colSpan${desktop}`]
  ].filter(Boolean).join(' ');
  
  return <div className={classes}>{children}</div>;
}

// Usage
<GridContainer>
  <GridItem span={4} tablet={6} desktop={8}>
    Main Content
  </GridItem>
  <GridItem span={4} tablet={2} desktop={4}>
    Sidebar
  </GridItem>
</GridContainer>
```

### Tailwind CSS Integration
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      spacing: {
        '0.5x': '4px',
        '1x': '8px',
        '1.5x': '12px',
        '2x': '16px',
        '3x': '24px',
        '4x': '32px',
        '6x': '48px',
        '8x': '64px',
        '12x': '96px',
        '16x': '128px',
      },
      gridTemplateColumns: {
        'castmatch': 'repeat(12, 1fr)',
        'castmatch-mobile': 'repeat(4, 1fr)',
        'castmatch-tablet': 'repeat(8, 1fr)',
      }
    }
  }
}
```

---

## Testing Checklist

### Grid Alignment
- [ ] All elements align to 8px baseline grid
- [ ] No sub-pixel rendering issues
- [ ] Consistent gaps between elements
- [ ] Proper margin collapse handling

### Responsive Behavior
- [ ] Test at all 5 breakpoints
- [ ] Verify column spanning changes
- [ ] Check gutter adjustments
- [ ] Validate container max-widths

### Performance
- [ ] Page paint time < 100ms
- [ ] No layout thrashing
- [ ] Smooth scroll performance
- [ ] Efficient reflows on resize

### Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader announces properly
- [ ] Focus indicators visible
- [ ] 400% zoom support

---

## Debugging

### Enable Grid Overlay
```javascript
// Add debug class to visualize grid
document.body.classList.add('grid-debug');
```

### Browser DevTools
1. Chrome: Elements > Layout > Grid overlays
2. Firefox: Inspector > Layout > Grid
3. Safari: Elements > Layout > Grid

### Common Issues

**Issue:** Elements not aligning
```css
/* Solution: Ensure box-sizing */
* {
  box-sizing: border-box;
}
```

**Issue:** Grid breaks on certain screens
```css
/* Solution: Use minmax() for flexibility */
.grid {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
}
```

**Issue:** Performance lag with many items
```css
/* Solution: Implement virtualization */
.grid-item {
  content-visibility: auto;
  contain-intrinsic-size: 0 400px;
}
```

---

## Migration from v1

### Key Changes
1. New 5-tier breakpoint system (was 4-tier)
2. Enhanced spacing scale with golden ratio
3. Improved performance optimizations
4. Added density variations
5. Container query support

### Update Path
```css
/* Old v1 */
.castmatch-grid { }

/* New v2 */
.grid-container { }

/* Old spacing */
--space-4: 16px;

/* New spacing */
--spacing-2: 16px;
```

---

*Last Updated: January 2025*
*Version: 2.0*
*Support: grid-support@castmatch.com*