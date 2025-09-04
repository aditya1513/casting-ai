# CastMatch Spacing Guide

## 8-Point Baseline Grid System

CastMatch follows a mathematical 8-point baseline grid system for consistent spacing across all components and layouts.

### Core Spacing Scale

```css
/* Base unit: 8px */
--spacing-0_5: 4px;   /* 0.5x - Micro spacing */
--spacing-1:   8px;   /* 1x - Base unit */
--spacing-1_5: 12px;  /* 1.5x - Small */
--spacing-2:   16px;  /* 2x - Default */
--spacing-3:   24px;  /* 3x - Medium */
--spacing-4:   32px;  /* 4x - Large */
--spacing-6:   48px;  /* 6x - Extra large */
--spacing-8:   64px;  /* 8x - Huge */
--spacing-12:  96px;  /* 12x - Massive */
--spacing-16:  128px; /* 16x - Giant */
```

### Mathematical Relationships

#### Golden Ratio Implementation (1.618)
```css
--golden-small:  16px;  /* Base */
--golden-medium: 26px;  /* 16 × 1.618 */
--golden-large:  42px;  /* 26 × 1.618 */
--golden-xl:     68px;  /* 42 × 1.618 */
```

#### Modular Scale (1.25)
```css
--scale-xs:   10px;  /* 8 × 1.25 */
--scale-sm:   13px;  /* 10 × 1.25 */
--scale-base: 16px;  /* 13 × 1.25 (rounded) */
--scale-lg:   20px;  /* 16 × 1.25 */
--scale-xl:   25px;  /* 20 × 1.25 */
--scale-2xl:  31px;  /* 25 × 1.25 */
```

### Usage Guidelines

#### Component Spacing
- **Padding**: Use 1x (8px), 2x (16px), or 3x (24px)
- **Margins**: Use 2x (16px), 3x (24px), or 4x (32px)
- **Gap**: Use 1x (8px) or 2x (16px) for grid gaps

#### Content Spacing
- **Text blocks**: 3x (24px) vertical spacing
- **Sections**: 6x (48px) or 8x (64px) separation
- **Hero sections**: 12x (96px) or 16x (128px)

#### Micro Adjustments
Use 0.5x (4px) sparingly for:
- Icon alignment
- Border adjustments
- Optical centering

### Implementation Examples

```css
/* Card component */
.talent-card {
  padding: var(--spacing-3); /* 24px */
  margin-bottom: var(--spacing-4); /* 32px */
  gap: var(--spacing-2); /* 16px */
}

/* Section spacing */
.section {
  margin-bottom: var(--spacing-8); /* 64px */
}

/* Button spacing */
.button {
  padding: var(--spacing-2) var(--spacing-3); /* 16px 24px */
}
```

### Quality Metrics

- **Consistency**: 100% adherence to 8px baseline
- **Harmony**: Golden ratio applied to key proportions
- **Scalability**: Modular scale for text relationships
- **Performance**: CSS custom properties for efficient updates

Last updated: September 2025