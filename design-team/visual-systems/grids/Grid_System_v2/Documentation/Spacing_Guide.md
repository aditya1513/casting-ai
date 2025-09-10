# CastMatch Grid System v2.0 - Spacing Guide
## Mathematical Precision for Visual Harmony

---

## Core Principles

### 8-Point Baseline Grid
All spacing in the CastMatch interface follows an 8-point baseline grid system. This creates visual consistency and ensures pixel-perfect alignment across all components.

**Base Unit: 8px**

### Mathematical Foundation
- **Golden Ratio (φ)**: 1.618 - Used for proportional relationships
- **Modular Scale**: 1.25 (Major Third) - Creates harmonic progression
- **Grid Mathematics**: All measurements are multiples or divisions of 8

---

## Spacing Scale

### Primary Scale (8-Point System)

| Token | Value | Multiplier | Usage |
|-------|-------|------------|--------|
| `--spacing-0` | 0px | 0x | No spacing |
| `--spacing-0_5` | 4px | 0.5x | Micro adjustments |
| `--spacing-1` | 8px | 1x | Base unit, minimal spacing |
| `--spacing-1_5` | 12px | 1.5x | Compact spacing |
| `--spacing-2` | 16px | 2x | Default spacing |
| `--spacing-3` | 24px | 3x | Medium spacing |
| `--spacing-4` | 32px | 4x | Large spacing |
| `--spacing-5` | 40px | 5x | Section spacing |
| `--spacing-6` | 48px | 6x | Extra large spacing |
| `--spacing-7` | 56px | 7x | Component separation |
| `--spacing-8` | 64px | 8x | Major sections |
| `--spacing-10` | 80px | 10x | Page sections |
| `--spacing-12` | 96px | 12x | Massive spacing |
| `--spacing-14` | 112px | 14x | Hero sections |
| `--spacing-16` | 128px | 16x | Giant spacing |

### Golden Ratio Scale (Fibonacci-Based)

| Token | Value | Calculation | Usage |
|-------|-------|-------------|--------|
| `--spacing-phi-1` | 13px | 8 × 1.618 | Harmonic micro |
| `--spacing-phi-2` | 21px | 13 × 1.618 | Harmonic small |
| `--spacing-phi-3` | 34px | 21 × 1.618 | Harmonic medium |
| `--spacing-phi-4` | 55px | 34 × 1.618 | Harmonic large |
| `--spacing-phi-5` | 89px | 55 × 1.618 | Harmonic extra |
| `--spacing-phi-6` | 144px | 89 × 1.618 | Harmonic massive |

---

## Component Spacing Guidelines

### Cards
```css
/* Talent Card */
.talent-card {
  padding: var(--spacing-3);        /* 24px internal padding */
  margin-bottom: var(--spacing-4);  /* 32px between cards */
  gap: var(--spacing-2);            /* 16px between elements */
}

/* Card Header */
.card-header {
  padding-bottom: var(--spacing-2); /* 16px below header */
  margin-bottom: var(--spacing-2);  /* 16px separation */
}
```

### Forms
```css
/* Form Groups */
.form-group {
  margin-bottom: var(--spacing-3);  /* 24px between groups */
}

/* Input Fields */
.form-input {
  padding: var(--spacing-1_5) var(--spacing-2); /* 12px 16px */
  margin-top: var(--spacing-1);     /* 8px from label */
}

/* Form Sections */
.form-section {
  padding: var(--spacing-4) 0;      /* 32px vertical padding */
  border-bottom: 1px solid #e5e7eb;
}
```

### Buttons
```css
/* Button Padding */
.btn-small {
  padding: var(--spacing-1) var(--spacing-2);   /* 8px 16px */
}

.btn-medium {
  padding: var(--spacing-1_5) var(--spacing-3); /* 12px 24px */
}

.btn-large {
  padding: var(--spacing-2) var(--spacing-4);   /* 16px 32px */
}

/* Button Groups */
.btn-group {
  gap: var(--spacing-2);             /* 16px between buttons */
}
```

### Navigation
```css
/* Nav Items */
.nav-item {
  padding: var(--spacing-2) var(--spacing-3);   /* 16px 24px */
  margin-bottom: var(--spacing-0_5);            /* 4px between items */
}

/* Nav Sections */
.nav-section {
  margin-bottom: var(--spacing-4);              /* 32px between sections */
}
```

---

## Responsive Spacing

### Gutters (Space Between Columns)

| Breakpoint | Gutter Value | Usage |
|------------|--------------|--------|
| Mobile (< 768px) | 16px | Tight spacing for small screens |
| Tablet (768px - 1023px) | 24px | Comfortable tablet spacing |
| Desktop (1024px - 1439px) | 32px | Standard desktop spacing |
| Wide (1440px - 1919px) | 32px | Consistent wide spacing |
| Ultra (1920px+) | 40px | Luxury spacing for large displays |

### Margins (Container Edge Spacing)

| Breakpoint | Margin Value | Usage |
|------------|--------------|--------|
| Mobile | 16px | Minimal edge spacing |
| Tablet | 24px | Comfortable edge buffer |
| Desktop | 40px | Professional margins |
| Wide | 48px | Generous side margins |
| Ultra | 64px | Centered content with luxury margins |

---

## Density Variations

### Comfortable (Default)
Standard spacing for optimal readability and interaction.
- Gutters: 100% of defined values
- Component spacing: 100% of defined values

### Compact Mode
Reduces spacing by 20% for information-dense interfaces.
```css
.density-compact {
  --gutter: calc(var(--gutter-desktop) * 0.8);
  --spacing: calc(var(--spacing-3) * 0.8);
}
```

### Spacious Mode
Increases spacing by 20% for luxury, relaxed interfaces.
```css
.density-spacious {
  --gutter: calc(var(--gutter-desktop) * 1.2);
  --spacing: calc(var(--spacing-3) * 1.2);
}
```

---

## Implementation Examples

### Hero Section
```css
.hero {
  padding-top: var(--spacing-12);    /* 96px top */
  padding-bottom: var(--spacing-10); /* 80px bottom */
  margin-bottom: var(--spacing-8);   /* 64px separation */
}
```

### Content Sections
```css
.content-section {
  padding: var(--spacing-8) 0;       /* 64px vertical */
  
  &:not(:last-child) {
    margin-bottom: var(--spacing-6); /* 48px between sections */
  }
}
```

### Modal Spacing
```css
.modal {
  padding: var(--spacing-4);          /* 32px internal */
  margin: var(--spacing-8) auto;      /* 64px vertical margins */
}

.modal-header {
  padding-bottom: var(--spacing-3);   /* 24px */
  margin-bottom: var(--spacing-3);    /* 24px */
}

.modal-footer {
  padding-top: var(--spacing-3);      /* 24px */
  margin-top: var(--spacing-4);       /* 32px */
}
```

---

## Best Practices

### DO's
- ✓ Always use spacing tokens from the scale
- ✓ Maintain consistent spacing within component families
- ✓ Use larger spacing for major section breaks
- ✓ Apply the 8-point grid to all measurements
- ✓ Consider touch targets (minimum 48px for mobile)

### DON'Ts
- ✗ Don't use arbitrary pixel values
- ✗ Don't mix spacing scales within a component
- ✗ Don't use margins for component internal spacing (use padding)
- ✗ Don't break the 8-point grid alignment
- ✗ Don't forget responsive spacing adjustments

---

## Quick Reference

### Common Patterns
```css
/* Inline elements */
.inline-spacing { gap: var(--spacing-1); }          /* 8px */

/* Related elements */
.related-spacing { gap: var(--spacing-2); }         /* 16px */

/* Distinct groups */
.group-spacing { gap: var(--spacing-4); }           /* 32px */

/* Major sections */
.section-spacing { gap: var(--spacing-8); }         /* 64px */
```

### Touch Targets
```css
/* Minimum touch target size */
.touch-target {
  min-height: 48px;                                 /* 6 × 8px */
  min-width: 48px;
  padding: var(--spacing-1_5);                      /* 12px */
}
```

---

## Performance Considerations

### CSS Custom Properties
All spacing values use CSS custom properties for:
- Runtime theming capabilities
- Reduced CSS file size
- Consistent updates across components
- Browser-optimized rendering

### Containment
Use CSS containment for performance:
```css
.grid-item {
  contain: layout style;  /* Isolate layout calculations */
}
```

---

*Last Updated: January 2025*
*Version: 2.0*
*Quality Target: 9.5/10*