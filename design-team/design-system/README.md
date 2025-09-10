# CastMatch Design System

A comprehensive, scalable design token system for the CastMatch entertainment industry platform, featuring sophisticated cinematic aesthetics and enterprise-grade organization.

## Overview

The CastMatch Design System provides a complete token architecture that ensures visual consistency, development efficiency, and seamless dark mode support across all applications.

## Token Architecture

### Three-Tier System

1. **Primitive Tokens**: Base foundational values
2. **Semantic Tokens**: Purpose-driven abstractions
3. **Component Tokens**: Component-specific values

## Quick Start

### Installation

```bash
npm install @castmatch/design-system
```

### Usage in CSS

```css
@import '@castmatch/design-system/dist/tokens.css';

.my-component {
  background: var(--surface-primary);
  color: var(--text-primary);
  padding: var(--spacing-4);
  border-radius: var(--border-radius-lg);
}
```

### Usage in JavaScript/TypeScript

```typescript
import tokens from '@castmatch/design-system';

const styles = {
  backgroundColor: tokens.semantic.colors.background.primary,
  color: tokens.semantic.colors.text.primary,
  padding: tokens.primitives.spacing['4']
};
```

### Usage in React

```tsx
import { TokenProvider } from '@castmatch/design-system/react';

function App() {
  return (
    <TokenProvider theme="dark">
      <YourApp />
    </TokenProvider>
  );
}
```

## Token Categories

### Colors

- **Primitive Colors**: 11 color scales with 50-950 shades
  - Gray, Cyan, Purple, Pink, Amber, Emerald, Red, Blue
  - Gradient definitions for cinematic effects

- **Semantic Colors**: Purpose-driven color tokens
  - Background colors (primary, secondary, tertiary, inverse)
  - Surface colors for different elevation levels
  - Text colors with hierarchy
  - Border colors for various states
  - Action colors for interactive elements
  - Status colors for feedback

### Typography

- **Font Families**: Sans, Serif, Mono, Display
- **Font Sizes**: xs through 9xl (0.75rem - 8rem)
- **Font Weights**: 100-900
- **Line Heights**: Multiple options for different contexts
- **Letter Spacing**: Tighter to widest

### Spacing

- **Spacing Scale**: 0-96 (0 - 24rem)
- **8-Point Grid System**: Ensures consistent alignment
- **Border Radius**: sm to full (0.125rem - 9999px)
- **Border Widths**: Multiple thickness options

### Effects

- **Shadows**: 
  - Standard elevations (xs - 2xl)
  - Cinematic effects (glow, neon, depth)
  - Material Design elevations (0-5)

- **Blur**: Various blur intensities
- **Opacity**: 0-100 in increments

### Animation

- **Durations**: 75ms - 1000ms
- **Timing Functions**: Linear, ease variations, cinematic
- **Keyframe Animations**: Fade, slide, zoom, shimmer, glow
- **Transition Properties**: Optimized property groups

### Layout

- **Breakpoints**: xs (320px) to 4xl (2560px)
- **Container Sizes**: Responsive and fluid options
- **Z-Index Scale**: Semantic layering system
- **Aspect Ratios**: Common media proportions
- **Grid System**: 12-column grid

## Dark Mode

The design system includes a complete dark mode implementation with:

- Adjusted color palettes for optimal contrast
- Elevated surface strategy for depth perception
- Modified shadows for dark backgrounds
- Automatic theme detection via CSS media queries
- Manual theme switching via data attributes

### Enabling Dark Mode

```html
<!-- Automatic based on system preference -->
<html>

<!-- Manual control -->
<html data-theme="dark">

<!-- Force light mode -->
<html data-theme="light">
```

## Component Tokens

Pre-configured token sets for common components:

### Buttons
- 5 variants: Primary, Secondary, Ghost, Outline, Danger, Success
- 5 sizes: xs, sm, md, lg, xl
- Complete state coverage: Default, Hover, Active, Focus, Disabled

### Forms
- Input fields with multiple states
- Textarea with auto-resize support
- Select dropdowns with custom styling
- Checkboxes and radio buttons
- Switch toggles with smooth animations
- Labels and helper text

### Cards
- Multiple elevation levels
- Interactive and static variants
- Cinematic glassmorphism option
- Responsive padding scales

### Modals
- Overlay with backdrop blur
- Multiple size presets
- Header, body, footer sections
- Smooth entrance animations

### Navigation
- Navbar with sticky positioning
- Sidebar with collapse functionality
- Breadcrumbs with proper hierarchy
- Tabs with active indicators
- Pagination with disabled states

## Build System

### Generate Token Outputs

```bash
npm run build
```

This generates:
- `tokens.css` - CSS custom properties
- `tokens.js` - JavaScript module
- `tokens.d.ts` - TypeScript definitions
- `tokens.scss` - SCSS variables
- `tokens.json` - JSON for design tools

### Watch Mode

```bash
npm run watch
```

Automatically rebuilds when token files change.

### Validation

```bash
npm run validate
```

Checks for:
- Naming convention compliance
- Token reference validity
- Color contrast requirements
- Missing dependencies

## Token Naming Conventions

### Format
`[category]-[property]-[variant]-[state]`

### Examples
- `color-text-primary`
- `action-primary-hover`
- `surface-raised`
- `shadow-elevation-3`

## Migration Guide

### From Inline Styles

```css
/* Before */
.component {
  background-color: #00D9FF;
  padding: 16px;
}

/* After */
.component {
  background-color: var(--color-cyan-500);
  padding: var(--spacing-4);
}
```

### From Hardcoded Values

```javascript
// Before
const styles = {
  backgroundColor: '#00D9FF',
  padding: '16px'
};

// After
import tokens from '@castmatch/design-system';

const styles = {
  backgroundColor: tokens.primitives.colors.cyan['500'],
  padding: tokens.primitives.spacing['4']
};
```

## Figma Integration

1. Install the "Tokens Studio" plugin in Figma
2. Import `dist/tokens.json`
3. Map token categories to Figma styles
4. Enable auto-sync for updates

## Best Practices

1. **Always use semantic tokens** for component styling
2. **Reference primitive tokens** only in semantic token definitions
3. **Maintain token hierarchy** - don't skip levels
4. **Document custom tokens** when extending the system
5. **Test in both themes** when using color tokens
6. **Use spacing tokens** for all margins and paddings
7. **Apply transition tokens** for consistent animations

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- CSS Custom Properties required

## Performance Considerations

- Token CSS file: ~50KB minified
- Runtime overhead: < 5ms
- Build time: < 2 seconds
- Zero JavaScript required for CSS usage

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on:
- Adding new tokens
- Modifying existing tokens
- Deprecation process
- Testing requirements

## Version History

### v1.0.0
- Initial release with complete token system
- Dark mode support
- Component token presets
- Build system implementation

## License

MIT License - See [LICENSE](./LICENSE) for details

## Support

For questions or issues:
- GitHub Issues: [github.com/castmatch/design-system](https://github.com/castmatch/design-system)
- Documentation: [design.castmatch.com](https://design.castmatch.com)
- Email: design-system@castmatch.com