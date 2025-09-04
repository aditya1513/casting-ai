# Talent Card Component Wireframe

## Component Overview
**Component**: TalentCard  
**Purpose**: Display talent profile summary for search results and discovery  
**Breakpoints**: Mobile-first responsive design  
**Grid**: 8-point spacing system

## Mobile Layout (375px - 768px)

```
┌─────────────────────────────────────────┐ ← 16px margin
│  ╔═════════════════════════════════════╗  │
│  ║  ┌──────────┐    ┌─────────────────┐║  │ ← 16px padding
│  ║  │   PHOTO  │    │  Name           │║  │
│  ║  │  80x80px │    │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │║  │ ← 8px spacing
│  ║  │  rounded │    │                 │║  │
│  ║  │  avatar  │    │  Age • Mumbai   │║  │
│  ║  └──────────┘    │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │║  │
│  ║                  └─────────────────┘║  │
│  ║                                     ║  │ ← 12px vertical spacing
│  ║  ┌─────────────────────────────────┐ ║  │
│  ║  │  Experience                     │ ║  │
│  ║  │  ▓▓▓ TV  ▓▓▓ Film  ▓▓▓ Theatre  │ ║  │ ← Tag chips
│  ║  └─────────────────────────────────┘ ║  │
│  ║                                     ║  │ ← 12px vertical spacing  
│  ║  ┌─────────────────────────────────┐ ║  │
│  ║  │  ★★★★☆ 4.2 • 23 reviews        │ ║  │ ← Rating row
│  ║  └─────────────────────────────────┘ ║  │
│  ║                                     ║  │
│  ║  ┌──────────┐       ┌──────────────┐║  │ ← 8px gap between
│  ║  │   VIEW   │       │   SHORTLIST  │║  │   buttons
│  ║  │  Profile │       │      +       │║  │
│  ║  └──────────┘       └──────────────┘║  │
│  ╚═════════════════════════════════════╝  │ ← Card border
└─────────────────────────────────────────┘
```

### Mobile Specifications
- **Card Width**: 100% container minus 32px margins (16px each side)
- **Card Height**: Auto, minimum 180px
- **Photo**: 80x80px circular with 4px border
- **Typography**: 
  - Name: 18px Bold (heading-md token)
  - Details: 14px Regular (body-sm token)
  - Tags: 12px Medium (caption-md token)
- **Touch Targets**: Minimum 44x44px for buttons
- **Spacing**: 8-point grid system throughout

## Desktop Layout (1024px+)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ╔═══════════════════════════════════════════════════════════════════════════╗│ ← 24px margin
│  ║  ┌──────────┐  ┌─────────────────┐  ┌─────────────────────────────────────┐║│
│  ║  │   PHOTO  │  │  Name           │  │  ★★★★☆ 4.2        VIEW PROFILE ▶│║│ ← Single row
│  ║  │ 120x120px│  │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  │  23 reviews                     │║│   layout
│  ║  │  rounded │  │                 │  │                                 │║│
│  ║  │  avatar  │  │  Age • Mumbai   │  │  ▓TV  ▓Film  ▓Theatre            │║│
│  ║  │          │  │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  │                                 │║│
│  ║  │          │  │                 │  │  [    SHORTLIST    ] [  BOOK  ] │║│
│  ║  └──────────┘  └─────────────────┘  └─────────────────────────────────────┘║│
│  ╚═══════════════════════════════════════════════════════════════════════════╝│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Desktop Specifications
- **Card Width**: 800px maximum, responsive with container
- **Card Height**: 140px fixed
- **Photo**: 120x120px circular with 6px border
- **Layout**: Horizontal flex with three sections (photo, info, actions)
- **Typography**:
  - Name: 24px Bold (heading-lg token)
  - Details: 16px Regular (body-md token)
  - Tags: 14px Medium (caption-lg token)

## Grid System Specifications

### 8-Point Grid Implementation
```
Base Unit: 8px

Spacing Scale:
- xs: 4px  (0.5 units)
- sm: 8px  (1 unit)
- md: 16px (2 units)  
- lg: 24px (3 units)
- xl: 32px (4 units)
- 2xl: 40px (5 units)

Component Spacing:
- Card padding: 16px (md)
- Element gap: 8px (sm) 
- Section gap: 24px (lg)
- Button height: 40px (5 units)
```

### Responsive Breakpoints
```
- xs: 0px - 575px    (Mobile)
- sm: 576px - 767px  (Mobile Large)  
- md: 768px - 991px  (Tablet)
- lg: 992px - 1199px (Desktop)
- xl: 1200px+        (Large Desktop)
```

## Component States

### Default State
- Background: Card background token (#1A1A1A dark mode)
- Border: 1px solid border-subtle token
- Shadow: Low elevation (0 2px 4px rgba(0,0,0,0.1))

### Hover State (Desktop)
- Transform: translateY(-2px)
- Shadow: Medium elevation (0 4px 8px rgba(0,0,0,0.15))
- Transition: all 0.2s ease-out
- Border: 1px solid accent-primary token

### Focus State
- Outline: 2px solid focus-ring token
- Outline-offset: 2px
- No other visual changes

### Loading State
```
┌─────────────────────────────────────────┐
│  ╔═════════════════════════════════════╗  │
│  ║  ┌──────────┐    ┌─────────────────┐║  │
│  ║  │ ░░░░░░░░ │    │ ░░░░░░░░░░░░░░░ │║  │ ← Skeleton
│  ║  │ ░LOADING░ │    │ ░░░░░░░░░░░░░░░ │║  │   animation
│  ║  │ ░░░░░░░░ │    │                 │║  │
│  ║  │ ░░░░░░░░ │    │ ░░░░░░░░░░░░░░░ │║  │
│  ║  └──────────┘    └─────────────────┘║  │
│  ╚═════════════════════════════════════╝  │
└─────────────────────────────────────────┘
```

## Accessibility Specifications

### WCAG AAA Compliance
- **Color Contrast**: 7:1 minimum for all text
- **Focus Management**: Clear focus indicators
- **Screen Reader**: Semantic HTML structure
- **Keyboard Navigation**: Tab order logical

### ARIA Implementation
```html
<article 
  role="button" 
  aria-label="Talent profile: [Name], [Age], [Location]"
  tabindex="0"
>
  <img 
    alt="Profile photo of [Name]" 
    role="img"
  />
  <div aria-label="Rating: [X] stars out of 5">
    <!-- Rating stars -->
  </div>
</article>
```

## Performance Requirements

### Loading Performance
- **Image Optimization**: WebP format, lazy loading
- **Critical CSS**: Inline styles for above-the-fold
- **Component Size**: <5KB gzipped
- **Render Time**: <16ms (60fps)

### Animation Performance
- **GPU Acceleration**: transform and opacity only  
- **Reduced Motion**: Respect prefers-reduced-motion
- **60fps Target**: All hover/focus transitions

## Development Specifications

### Design Tokens Usage
```css
.talent-card {
  padding: var(--space-md);
  background: var(--color-card-bg);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-low);
  font-family: var(--font-primary);
}

.talent-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-medium);
  border-color: var(--color-accent-primary);
}
```

### Component API
```typescript
interface TalentCardProps {
  talent: {
    id: string;
    name: string;
    age: number;
    location: string;
    photo: string;
    experience: string[];
    rating: number;
    reviewCount: number;
  };
  size: 'compact' | 'default' | 'expanded';
  onView: (id: string) => void;
  onShortlist: (id: string) => void;
  isShortlisted?: boolean;
  loading?: boolean;
}
```

---
**Wireframe Version**: 1.0  
**Last Updated**: Q1 2025  
**Owner**: UX Wireframe Architect  
**Review Status**: Approved by Layout Grid Engineer