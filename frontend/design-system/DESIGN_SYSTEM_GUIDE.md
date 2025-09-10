# CastMatch Design System Documentation

## Overview

The CastMatch Design System is a comprehensive visual design framework built specifically for the Mumbai film industry casting platform. It combines modern web design principles with cultural aesthetics to create a unique and engaging user experience.

## Design Philosophy

### Core Principles

1. **Cultural Authenticity**: Incorporating Mumbai film industry aesthetics
2. **Accessibility First**: WCAG 2.1 AA compliance minimum
3. **Performance Oriented**: Sub-3s load times, 60fps animations
4. **Scalable Architecture**: Token-based system for consistency
5. **Developer Experience**: Clear documentation and reusable components

## Token System

### Color Palette

#### Brand Colors
- **Primary (Amber)**: Warm, inviting tone inspired by Mumbai's golden hour
- **Accent (Magenta)**: Vibrant Bollywood energy
- **Neutrals**: Cinema black to screen white scale

```tsx
// Usage in components
import { baseTokens } from '@/design-system/tokens/base-tokens';

const primaryColor = baseTokens.colors.brand[500];
```

#### Semantic Colors
- Success: Green tones for positive actions
- Warning: Amber for attention states
- Error: Red for critical alerts
- Info: Blue for informational content

### Typography

#### Font Families
- **Sans**: Inter - Primary UI font
- **Serif**: Playfair Display - Editorial content
- **Mono**: JetBrains Mono - Code and data
- **Display**: Bebas Neue - Cinematic headers

#### Type Scale
Fluid typography using clamp() for responsive sizing:
- 2xs to 6xl scale
- Automatically adjusts based on viewport

### Spacing System

4px base unit system:
- Consistent spacing using multipliers
- Responsive spacing per breakpoint
- Density settings (compact/comfortable/spacious)

### Animation Tokens

```tsx
// Duration presets
duration: {
  instant: '0ms',
  fast: '150ms',
  base: '250ms',
  moderate: '350ms',
  slow: '500ms',
}

// Easing functions
easing: {
  spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  cinematic: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
}
```

## Component Library

### Atomic Components

#### Button
```tsx
import { Button } from '@/design-system/components/atoms/Button';

// Primary button
<Button variant="primary" size="md">
  Get Started
</Button>

// Premium gradient button
<Button variant="premium" leftIcon={<StarIcon />}>
  Upgrade to Premium
</Button>

// Loading state
<Button loading disabled>
  Processing...
</Button>
```

**Variants**: primary, secondary, ghost, danger, premium
**Sizes**: xs, sm, md, lg, xl
**Features**: Ripple effect, loading state, icon support

#### Input
```tsx
import { Input } from '@/design-system/components/atoms/Input';

// Basic input
<Input
  label="Email"
  type="email"
  placeholder="actor@example.com"
/>

// With validation
<Input
  label="Phone"
  error="Please enter a valid phone number"
  leftIcon={<PhoneIcon />}
/>

// Password with toggle
<Input
  type="password"
  showPasswordToggle
/>
```

#### Badge
```tsx
import { Badge, SkillBadge } from '@/design-system/components/atoms/Badge';

// Status badge
<Badge variant="success" dot pulse>
  Available
</Badge>

// Skill badge with level
<SkillBadge skill="Acting" level="expert" />

// Removable badge
<Badge removable onRemove={handleRemove}>
  Hindi
</Badge>
```

### Molecular Components

#### Card
```tsx
import { Card } from '@/design-system/components/molecules/Card';

// Basic card
<Card variant="default" padding="lg">
  <CardHeader>
    <CardTitle>Audition Details</CardTitle>
    <CardDescription>Review the requirements</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>

// Premium gradient card
<Card variant="premium" interactive>
  {/* Premium content */}
</Card>

// Glassmorphic card
<Card variant="glassmorphic">
  {/* Overlay content */}
</Card>
```

**Variants**: default, elevated, outlined, gradient, premium, talent, glassmorphic

### Organism Components

#### TalentCard
```tsx
import TalentCard from '@/design-system/components/organisms/TalentCard';

<TalentCard
  talent={{
    name: "Priya Sharma",
    role: "Lead Actor",
    location: "Mumbai",
    experience: "5 years",
    rating: 4.8,
    skills: [
      { name: "Method Acting", level: "expert" },
      { name: "Dance", level: "advanced" }
    ],
    availability: "available",
    verified: true,
    premium: true
  }}
  variant="default"
  onView={() => {}}
  onContact={() => {}}
  onSave={() => {}}
/>
```

**Variants**: default, compact, detailed

## Dark Mode Implementation

### Elevation Strategy
Progressive lightening for dark surfaces:
- Level 0: Pure black/near-black base
- Level 1-3: Progressively lighter surfaces
- Overlay surfaces with transparency

### Color Adjustments
- Reduced saturation for dark backgrounds
- Increased contrast ratios (minimum 4.5:1)
- Optimized accent colors for dark contexts

### Usage
```tsx
// Automatic dark mode with system preference
<html className="dark">
  {/* Components automatically adapt */}
</html>

// Toggle programmatically
document.documentElement.classList.toggle('dark');
```

## Mumbai Market Styling

### Cultural Themes

#### Festival Themes
```css
/* Diwali Theme */
[data-theme="diwali"] {
  --brand-500: oklch(0.72 0.25 45);   /* Golden */
  --accent-500: oklch(0.55 0.30 350); /* Deep pink */
}

/* Holi Theme */
[data-theme="holi"] {
  --brand-500: oklch(0.65 0.25 350);  /* Magenta */
  --accent-500: oklch(0.60 0.25 145); /* Green */
}
```

### Bollywood Effects
```css
/* Cinematic text */
.text-cinematic {
  font-family: var(--font-display);
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

/* Bollywood glow */
.bollywood-glow {
  box-shadow: 
    0 0 20px var(--brand-500),
    0 0 40px var(--accent-500);
}
```

## Responsive System

### Breakpoints
```tsx
const breakpoints = {
  xs: 375,    // Mobile S
  sm: 640,    // Mobile L
  md: 768,    // Tablet
  lg: 1024,   // Desktop
  xl: 1280,   // Desktop L
  '2xl': 1536, // Desktop XL
}
```

### Responsive Hooks
```tsx
import { useBreakpoint, useDevice } from '@/design-system/utils/responsive';

function Component() {
  const breakpoint = useBreakpoint();
  const { isMobile, isTablet, isDesktop } = useDevice();
  
  return (
    <div>
      {isMobile && <MobileView />}
      {isDesktop && <DesktopView />}
    </div>
  );
}
```

### Responsive Values
```tsx
// Different values per breakpoint
<Card padding={{ xs: 'sm', md: 'md', lg: 'lg' }}>
  {/* Content adapts to screen size */}
</Card>
```

## Performance Considerations

### Bundle Size
- Component library: <50kb gzipped
- CSS framework: <20kb gzipped
- Total impact: <100kb

### Animation Performance
- All animations use transform/opacity
- 60fps target with will-change hints
- Reduced motion support

### Loading Strategy
```tsx
// Lazy load heavy components
const TalentCard = lazy(() => import('@/design-system/components/organisms/TalentCard'));

// Critical CSS inline
<style dangerouslySetInnerHTML={{ __html: criticalCSS }} />
```

## Accessibility

### WCAG 2.1 Compliance
- Minimum AA rating for all components
- Color contrast ratios validated
- Keyboard navigation support
- Screen reader compatibility

### Focus Management
```css
:focus-visible {
  outline: 2px solid var(--brand-500);
  outline-offset: 2px;
}
```

### ARIA Support
All interactive components include proper ARIA attributes:
- Roles and labels
- Live regions for dynamic content
- State announcements

## Implementation Guide

### Setup

1. **Install dependencies**:
```bash
npm install class-variance-authority
```

2. **Import theme CSS**:
```tsx
// app/layout.tsx
import '@/design-system/styles/theme.css';
```

3. **Configure TypeScript paths**:
```json
{
  "compilerOptions": {
    "paths": {
      "@/design-system/*": ["./design-system/*"]
    }
  }
}
```

### Usage Examples

#### Creating a talent listing page:
```tsx
import { Card } from '@/design-system/components/molecules/Card';
import TalentCard from '@/design-system/components/organisms/TalentCard';
import { Button } from '@/design-system/components/atoms/Button';

export default function TalentListing() {
  return (
    <div className="container">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {talents.map(talent => (
          <TalentCard
            key={talent.id}
            talent={talent}
            variant="default"
            onView={() => router.push(`/talent/${talent.id}`)}
            onContact={() => openContactModal(talent)}
          />
        ))}
      </div>
    </div>
  );
}
```

## Migration Guide

### From existing styles to design system:

1. **Replace color values**:
```tsx
// Before
<div style={{ color: '#333' }}>

// After
<div style={{ color: 'var(--neutral-700)' }}>
```

2. **Use token-based spacing**:
```tsx
// Before
<div className="p-16">

// After
<div className="p-4"> // Uses var(--space-4)
```

3. **Migrate to component library**:
```tsx
// Before
<button className="custom-button">

// After
<Button variant="primary">
```

## Best Practices

### Do's
- Use semantic color tokens
- Maintain consistent spacing with the 4px grid
- Leverage component variants instead of custom styles
- Test in both light and dark modes
- Consider mobile-first design

### Don'ts
- Don't hardcode color values
- Avoid custom animations without performance testing
- Don't skip accessibility testing
- Avoid breaking the spacing grid
- Don't override component tokens directly

## Support & Resources

- **Figma Library**: [Link to design files]
- **Storybook**: [Link to component playground]
- **GitHub**: [Link to repository]
- **Support**: design-system@castmatch.com

## Version History

### v1.0.0 (Current)
- Initial release
- Complete token system
- Core component library
- Dark mode support
- Mumbai market themes
- Responsive utilities

### Roadmap
- v1.1: Extended icon library
- v1.2: Advanced data visualization components
- v1.3: Animation library expansion
- v2.0: Design system CLI tools