# CastMatch Grid System - Spacing Guide

## Mathematical Foundation
Base Unit: 4px - The foundation of all spatial relationships

## Spacing Scale (4px Base Unit Progression)

### Micro Spacing
- `spacing-0`: 0px - No space
- `spacing-0.5`: 2px - Ultra-micro adjustments
- `spacing-1`: 4px - Base unit (foundation)
- `spacing-2`: 8px - Minimal spacing

### Small Spacing
- `spacing-3`: 12px - Small gaps
- `spacing-4`: 16px - Default spacing
- `spacing-5`: 20px - Comfortable small
- `spacing-6`: 24px - Medium-small

### Medium Spacing
- `spacing-8`: 32px - Medium gaps
- `spacing-10`: 40px - Generous medium
- `spacing-12`: 48px - Large medium
- `spacing-15`: 60px - Extra medium

### Large Spacing
- `spacing-18`: 72px - Large gaps
- `spacing-20`: 80px - Extra large (input area height)
- `spacing-24`: 96px - Huge spacing
- `spacing-32`: 128px - Massive spacing
- `spacing-40`: 160px - Giant spacing (bottom clearance)

## Component-Specific Spacing

### Sidebar
- Width (Desktop): 280px (70 units)
- Width (Tablet): 240px (60 units)
- Width (Collapsed): 80px (20 units)
- Internal padding: 16px (4 units)
- Nav item spacing: 8px (2 units)

### Main Content
- Max width: 1200px (300 units)
- Padding horizontal: 24px (6 units)
- Padding vertical: 32px (8 units)
- Section spacing: 48px (12 units)

### Input Area
- Min height: 80px (20 units)
- Max height: 140px (35 units)
- Horizontal padding: 24px (6 units)
- Bottom clearance: 160px total (40 units)

### Messages
- Message spacing: 24px (6 units)
- Avatar size: 40px (10 units)
- Avatar gap: 12px (3 units)
- Internal padding: 16px (4 units)

## Responsive Adjustments

### Mobile (0-767px)
- Reduce large spacing by 25%
- Minimum touch target: 44px (11 units)
- Horizontal padding: 16px (4 units)

### Tablet (768-1023px)
- Standard spacing scale
- Sidebar: 240px (60 units)
- Content padding: 20px (5 units)

### Desktop (1024px+)
- Full spacing scale
- Sidebar: 280px (70 units)
- Generous whitespace application

## Golden Ratio Applications
- Primary/Secondary: 1.618:1
- Content/Sidebar: ~4.3:1 (1200px:280px)
- Message/Input: ~2:1 ratio

## Implementation in Code
```css
/* Use CSS custom properties */
padding: var(--spacing-4);
margin-bottom: var(--spacing-6);
gap: var(--spacing-2);

/* Or Tailwind utilities */
className="p-4 mb-6 gap-2"
```