# CastMatch Grid System v2.0 - Breakpoint Specifications
## 5-Tier Responsive System for Mumbai Market

---

## Overview

The CastMatch breakpoint system is designed with mobile-first principles, optimized for the Mumbai entertainment market where 75% of users access via mobile devices. Our 5-tier system ensures seamless experiences across all device categories.

---

## Breakpoint Tiers

### Tier 1: Mobile
**Range:** 320px - 767px  
**Target Devices:** Smartphones (iPhone SE to iPhone 14 Pro Max, Android devices)  
**Grid Columns:** 4  
**Container:** Fluid (100% - margins)  
**Primary Usage:** 75% of Mumbai market users

#### Key Characteristics:
- Single column layouts predominant
- Stacked navigation
- Full-width CTAs
- Simplified information architecture
- Touch-optimized interactions (48px minimum targets)

#### Common Devices:
- iPhone SE (375px)
- iPhone 14 (390px)
- iPhone 14 Pro Max (430px)
- Samsung Galaxy S series (360px - 412px)
- OnePlus devices (412px)

---

### Tier 2: Tablet
**Range:** 768px - 1023px  
**Target Devices:** iPads, Android tablets  
**Grid Columns:** 8  
**Container:** 728px (768px - 40px margins)  
**Primary Usage:** 15% of market

#### Key Characteristics:
- Two-column layouts emerge
- Side-by-side comparisons possible
- Persistent navigation sidebar
- Enhanced data tables
- Modal dialogs at 60% width

#### Common Devices:
- iPad Mini (768px)
- iPad Air (820px)
- iPad Pro 11" (834px)
- Samsung Galaxy Tab (800px)
- Microsoft Surface Go (800px)

---

### Tier 3: Desktop
**Range:** 1024px - 1439px  
**Target Devices:** Laptops, small desktop monitors  
**Grid Columns:** 12  
**Container:** 984px (1024px - 40px margins)  
**Primary Usage:** 8% of market

#### Key Characteristics:
- Full 12-column flexibility
- Three-column layouts standard
- Advanced filtering panels
- Multi-panel dashboards
- Hover interactions enabled
- Keyboard navigation optimized

#### Common Resolutions:
- MacBook Air (1280px)
- 13" laptops (1366px)
- Small desktop monitors (1280px)
- Standard HD displays (1366px)

---

### Tier 4: Wide
**Range:** 1440px - 1919px  
**Target Devices:** Large monitors, high-end laptops  
**Grid Columns:** 12  
**Container:** 1360px (1440px - 80px margins)  
**Primary Usage:** 1.5% of market

#### Key Characteristics:
- Generous white space
- Side panels for auxiliary content
- Enhanced data visualization
- Multiple columns for content
- Advanced workspace layouts

#### Common Resolutions:
- MacBook Pro 14"/16" (1440px+)
- QHD monitors (1440px)
- Large desktop displays (1680px)
- Professional workstations

---

### Tier 5: Ultra-Wide
**Range:** 1920px+  
**Target Devices:** 4K monitors, ultra-wide displays  
**Grid Columns:** 12 (centered)  
**Container:** 1840px (max 1920px)  
**Primary Usage:** 0.5% of market

#### Key Characteristics:
- Centered content with luxury margins
- Maximum content width enforced
- Cinema-style presentations
- Professional dashboard layouts
- Multi-panel workspace configurations

#### Common Resolutions:
- Full HD (1920px)
- 4K displays (2560px scaled)
- Ultra-wide monitors (3440px)
- Professional displays (2560px+)

---

## Implementation Guide

### CSS Media Queries

```css
/* Mobile First Approach */

/* Base styles (Mobile) */
.element {
  /* Mobile styles 320px - 767px */
}

/* Tablet */
@media screen and (min-width: 768px) {
  .element {
    /* Tablet overrides */
  }
}

/* Desktop */
@media screen and (min-width: 1024px) {
  .element {
    /* Desktop overrides */
  }
}

/* Wide */
@media screen and (min-width: 1440px) {
  .element {
    /* Wide screen overrides */
  }
}

/* Ultra-Wide */
@media screen and (min-width: 1920px) {
  .element {
    /* Ultra-wide overrides */
  }
}
```

### Container Queries (Modern Approach)

```css
/* Component-level responsiveness */
.card-container {
  container-type: inline-size;
}

@container (min-width: 400px) {
  .card { /* 2-column layout */ }
}

@container (min-width: 600px) {
  .card { /* 3-column layout */ }
}
```

---

## Grid Column Distribution

| Breakpoint | Columns | Gutter | Margin | Container Width |
|------------|---------|--------|---------|-----------------|
| Mobile | 4 | 16px | 16px | 100% - 32px |
| Tablet | 8 | 24px | 24px | 728px |
| Desktop | 12 | 32px | 40px | 984px |
| Wide | 12 | 32px | 48px | 1360px |
| Ultra | 12 | 40px | 64px | 1840px |

---

## Component Behavior Across Breakpoints

### Navigation

| Breakpoint | Behavior |
|------------|----------|
| Mobile | Hamburger menu, full-screen overlay |
| Tablet | Collapsible sidebar, icon + text |
| Desktop | Persistent sidebar, expanded |
| Wide | Fixed sidebar with sub-menus |
| Ultra | Mega-menu with previews |

### Talent Cards

| Breakpoint | Columns | Card Width |
|------------|---------|------------|
| Mobile | 1 | 100% |
| Tablet | 2 | ~350px |
| Desktop | 3 | ~308px |
| Wide | 4 | ~325px |
| Ultra | 4-5 | ~360px |

### Forms

| Breakpoint | Layout |
|------------|--------|
| Mobile | Single column, stacked |
| Tablet | 2 columns for related fields |
| Desktop | Multi-column with inline labels |
| Wide | Advanced layout with help text |
| Ultra | Spacious with inline validation |

### Data Tables

| Breakpoint | Display |
|------------|---------|
| Mobile | Card view or simplified table |
| Tablet | Scrollable table with priority columns |
| Desktop | Full table with sorting/filtering |
| Wide | Enhanced with inline actions |
| Ultra | Advanced with column customization |

---

## Mumbai Market Optimization

### Device Distribution (2025 Data)
```
Mobile Devices: 75%
├── Android: 65%
│   ├── Samsung: 25%
│   ├── OnePlus: 15%
│   ├── Xiaomi: 12%
│   └── Others: 13%
└── iOS: 10%
    ├── iPhone 14 series: 4%
    ├── iPhone 13 series: 3%
    └── Older models: 3%

Tablets: 15%
├── iPad: 8%
└── Android tablets: 7%

Desktop/Laptop: 10%
├── Windows: 6%
├── macOS: 3%
└── ChromeOS: 1%
```

### Performance Targets

| Breakpoint | Target Load Time | Critical Resources |
|------------|-----------------|-------------------|
| Mobile | < 2s on 4G | Inline critical CSS |
| Tablet | < 1.5s on WiFi | Lazy load images |
| Desktop | < 1s on broadband | Full features |
| Wide | < 1s | Enhanced graphics |
| Ultra | < 1s | All features loaded |

---

## Testing Checklist

### Mobile (320px - 767px)
- [ ] Test on iPhone SE (375px)
- [ ] Test on iPhone 14 Pro (393px)
- [ ] Test on Samsung Galaxy (360px)
- [ ] Verify touch targets (48px minimum)
- [ ] Check text readability (16px minimum)
- [ ] Validate single column layouts
- [ ] Test offline functionality

### Tablet (768px - 1023px)
- [ ] Test on iPad (768px)
- [ ] Test on iPad Pro (834px)
- [ ] Verify two-column layouts
- [ ] Check sidebar navigation
- [ ] Validate modal sizes

### Desktop (1024px - 1439px)
- [ ] Test at 1024px exact
- [ ] Test at 1366px (common)
- [ ] Verify 12-column grid
- [ ] Check hover states
- [ ] Validate keyboard navigation

### Wide (1440px - 1919px)
- [ ] Test at 1440px exact
- [ ] Test at 1680px
- [ ] Check content maximum widths
- [ ] Verify auxiliary panels

### Ultra (1920px+)
- [ ] Test at 1920px
- [ ] Test at 2560px
- [ ] Verify centered layout
- [ ] Check maximum container width
- [ ] Validate luxury spacing

---

## Accessibility Considerations

### Responsive Text Sizing
```css
/* Fluid typography */
:root {
  --font-size-base: clamp(16px, 2vw, 18px);
  --font-size-heading: clamp(24px, 4vw, 48px);
}
```

### Focus Management
- Ensure focus indicators scale appropriately
- Maintain 2px minimum outline width
- Provide adequate contrast at all sizes

### Reflow Support
- Support 400% zoom without horizontal scrolling
- Ensure content reflows properly
- Maintain readability at all zoom levels

---

## Future Considerations

### Emerging Devices
- Foldable phones (varied aspect ratios)
- Smart TVs (landscape orientation)
- AR/VR displays (spatial interfaces)
- Wearables (micro-interfaces)

### Progressive Enhancement
1. Start with mobile base experience
2. Enhance for larger screens
3. Add advanced features progressively
4. Maintain core functionality everywhere

---

*Last Updated: January 2025*
*Version: 2.0*
*Market Focus: Mumbai Entertainment Industry*