# CastMatch Grid System - Responsive Breakpoint Specifications v1

## Breakpoint Architecture

### Primary Breakpoints
```css
/* Mobile First Approach */
--breakpoint-xs:  320px;   /* Mobile S */
--breakpoint-sm:  375px;   /* Mobile M */
--breakpoint-md:  425px;   /* Mobile L */
--breakpoint-lg:  768px;   /* Tablet */
--breakpoint-xl:  1024px;  /* Desktop S */
--breakpoint-2xl: 1440px;  /* Desktop M */
--breakpoint-3xl: 1920px;  /* Desktop L */
--breakpoint-4xl: 2560px;  /* Desktop XL */
```

## Grid Configuration Per Breakpoint

### Mobile S (320px - 374px)
```css
.grid-mobile-s {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 0 16px;
  max-width: 100%;
}
```
- Columns: 4
- Gutter: 16px
- Margins: 16px
- Column width: ~64px

### Mobile M (375px - 424px)
```css
.grid-mobile-m {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;
  padding: 0 16px;
  max-width: 100%;
}
```
- Columns: 6
- Gutter: 16px
- Margins: 16px
- Column width: ~47px

### Mobile L (425px - 767px)
```css
.grid-mobile-l {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 20px;
  padding: 0 20px;
  max-width: 100%;
}
```
- Columns: 6
- Gutter: 20px
- Margins: 20px
- Column width: ~55px

### Tablet (768px - 1023px)
```css
.grid-tablet {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 20px;
  padding: 0 24px;
  max-width: 100%;
}
```
- Columns: 8
- Gutter: 20px
- Margins: 24px
- Column width: ~82px

### Desktop S (1024px - 1439px)
```css
.grid-desktop-s {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;
  padding: 0 32px;
  max-width: 1280px;
  margin: 0 auto;
}
```
- Columns: 12
- Gutter: 24px
- Margins: 32px
- Column width: ~74px

### Desktop M (1440px - 1919px)
```css
.grid-desktop-m {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;
  padding: 0 48px;
  max-width: 1440px;
  margin: 0 auto;
}
```
- Columns: 12
- Gutter: 24px
- Margins: 48px
- Column width: ~88px

### Desktop L (1920px - 2559px)
```css
.grid-desktop-l {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 32px;
  padding: 0 64px;
  max-width: 1920px;
  margin: 0 auto;
}
```
- Columns: 12
- Gutter: 32px
- Margins: 64px
- Column width: ~116px

### Desktop XL (2560px+)
```css
.grid-desktop-xl {
  display: grid;
  grid-template-columns: repeat(16, 1fr);
  gap: 32px;
  padding: 0 96px;
  max-width: 2560px;
  margin: 0 auto;
}
```
- Columns: 16
- Gutter: 32px
- Margins: 96px
- Column width: ~128px

## Responsive Column Spans

### Component Responsive Behavior
```css
/* Talent Card Example */
.talent-card {
  grid-column: span 12;  /* Mobile: Full width */
}

@media (min-width: 768px) {
  .talent-card {
    grid-column: span 6;  /* Tablet: Half width */
  }
}

@media (min-width: 1024px) {
  .talent-card {
    grid-column: span 4;  /* Desktop: Third width */
  }
}

@media (min-width: 1920px) {
  .talent-card {
    grid-column: span 3;  /* Large Desktop: Quarter width */
  }
}
```

## Container Queries (Modern Approach)
```css
/* Component-level responsiveness */
@container (min-width: 400px) {
  .component {
    grid-template-columns: repeat(2, 1fr);
  }
}

@container (min-width: 600px) {
  .component {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

## Fluid Typography Scale
```css
/* Responsive font sizes using clamp() */
--font-size-h1: clamp(32px, 5vw, 64px);
--font-size-h2: clamp(24px, 4vw, 48px);
--font-size-h3: clamp(20px, 3vw, 32px);
--font-size-body: clamp(14px, 1.5vw, 16px);
```

## Breakpoint Testing Matrix

| Component | 320px | 375px | 425px | 768px | 1024px | 1440px | 1920px | 2560px |
|-----------|-------|-------|-------|-------|--------|--------|--------|--------|
| Navigation | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Hero | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Cards Grid | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Dashboard | - | - | - | ✓ | ✓ | ✓ | ✓ | ✓ |
| Forms | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

## Performance Optimizations

### CSS Grid Subgrid
```css
.parent-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
}

.child-component {
  display: grid;
  grid-template-columns: subgrid;
  grid-column: span 6;
}
```

### GPU Acceleration
```css
.grid-optimized {
  will-change: transform;
  transform: translateZ(0);
}
```

## Current Issues & Solutions

### Issue 1: Inconsistent Breakpoint Usage
- **Current**: Some components only styled for 1440px
- **Solution**: Implement full breakpoint coverage

### Issue 2: Fixed Widths
- **Current**: Hard-coded max-width values
- **Solution**: Use responsive container queries

### Issue 3: Non-Fluid Layouts
- **Current**: Abrupt layout shifts
- **Solution**: Implement smooth transitions with clamp()

## Implementation Priority

1. **Desktop First → Mobile First Migration**
2. **Standardize grid column usage**
3. **Implement container queries**
4. **Add fluid typography**
5. **Optimize for 4K displays**