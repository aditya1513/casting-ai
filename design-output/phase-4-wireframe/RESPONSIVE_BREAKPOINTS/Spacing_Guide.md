# CastMatch Grid System - Spacing Guide v1

## Mathematical Foundation
Based on 8-point baseline grid with harmonic progression

### Core Spacing Scale (Base Unit: 4px)
```
Micro:    4px  (0.5x) - Ultra-fine adjustments
XS:       8px  (1x)   - Base unit foundation
SM:      12px  (1.5x) - Compact spacing
MD:      16px  (2x)   - Default spacing
LG:      24px  (3x)   - Standard gutters
XL:      32px  (4x)   - Section spacing
2XL:     48px  (6x)   - Major sections
3XL:     64px  (8x)   - Hero spacing
4XL:     96px  (12x)  - Massive spacing
5XL:    128px  (16x)  - Giant spacing
```

## Current Issues Identified

### Inconsistent Gap Values
- **Problem**: Multiple gap values found (5px, 6px, 10px, 15px, 20px, 30px, 40px)
- **Solution**: Standardize to 8px scale system

### Non-Standard Padding
- **Problem**: Arbitrary padding values (20px, 15px, 5px)
- **Solution**: Use mathematical scale (8px, 16px, 24px, 32px)

### Mixed Grid Approaches
- **Problem**: Some use 12-column, others use arbitrary divisions
- **Solution**: Consistent 12-column grid with proper spans

## Optimized Spacing System

### Component Padding
```css
/* Standardized padding values */
--padding-xs:  8px;
--padding-sm:  16px;
--padding-md:  24px;
--padding-lg:  32px;
--padding-xl:  48px;
```

### Grid Gutters
```css
/* Consistent gutter system */
--gutter-sm:   16px;  /* Mobile/Compact */
--gutter-md:   24px;  /* Desktop Standard */
--gutter-lg:   32px;  /* Wide screens */
```

### Margin System
```css
/* Section margins */
--margin-section-sm:  32px;
--margin-section-md:  48px;
--margin-section-lg:  64px;
--margin-section-xl:  96px;
```

## Implementation Rules

### 1. Component Spacing
- Internal padding: Use 16px or 24px
- Between elements: Use 8px, 16px, or 24px
- Section breaks: Use 48px or 64px

### 2. Grid Gutters
- Desktop: 24px standard
- Tablet: 20px (adjusted for viewport)
- Mobile: 16px (compact)

### 3. Vertical Rhythm
- Base line-height: 1.5 (24px for 16px text)
- Heading margins: Follow typographic scale
- Paragraph spacing: 16px bottom margin

### 4. Touch Targets
- Minimum: 44px × 44px
- Recommended: 48px × 48px
- Spacing between: Minimum 8px

## Golden Ratio Applications

### Proportional Spacing
```
Base:     24px
Golden:   39px (24 × 1.618)
Double:   63px (39 × 1.618)
```

### Modular Scale (1.25)
```
Base:     16px
Step 1:   20px (16 × 1.25)
Step 2:   25px (20 × 1.25)
Step 3:   31px (25 × 1.25)
Step 4:   39px (31 × 1.25)
```

## Responsive Adjustments

### Breakpoint-Specific Spacing
```css
/* Mobile (320-767px) */
@media (max-width: 767px) {
  --spacing-unit: 4px;
  --gutter: 16px;
}

/* Tablet (768-1023px) */
@media (min-width: 768px) and (max-width: 1023px) {
  --spacing-unit: 4px;
  --gutter: 20px;
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
  --spacing-unit: 4px;
  --gutter: 24px;
}
```

## Quality Metrics

### Consistency Score
- Target: 100% adherence to 8-point grid
- Current: ~60% (needs optimization)
- Goal: Achieve full compliance

### Visual Harmony
- Mathematical relationships maintained
- Consistent rhythm across components
- Balanced white space distribution

## Implementation Priority

1. **Critical**: Fix non-standard gap values
2. **High**: Standardize padding across components
3. **Medium**: Align margins to grid system
4. **Low**: Fine-tune micro-spacing