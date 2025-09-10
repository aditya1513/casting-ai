# CastMatch Grid System - Responsive Breakpoint Specifications

## Breakpoint Strategy
Mobile-first approach with mathematical precision for seamless transitions

## Core Breakpoints

### Mobile Small (320px - 374px)
- **Viewport**: 320px minimum
- **Grid**: Single column
- **Sidebar**: Hidden (transform: translateX(-100%))
- **Content**: Full width with 16px padding
- **Input Area**: Full width bottom fixed

### Mobile Medium (375px - 424px)
- **Viewport**: 375px (iPhone standard)
- **Grid**: Single column enhanced
- **Sidebar**: Slide-in overlay
- **Content**: Full width with 16px padding
- **Typography**: Slightly larger for readability

### Mobile Large (425px - 767px)
- **Viewport**: 425px - 767px
- **Grid**: Single column with breathing room
- **Sidebar**: Overlay with backdrop
- **Content**: Max-width 100% with 20px padding
- **Components**: Enhanced touch targets (min 44px)

### Tablet (768px - 1023px)
```css
@media (min-width: 768px) and (max-width: 1023px) {
  /* Sidebar visible but narrower */
  .sidebar { width: 240px; }
  .main-content { 
    width: calc(100vw - 240px);
    padding: 20px;
  }
}
```
- **Grid**: Two-column layout
- **Sidebar**: 240px fixed left
- **Content**: Flexible with 20px padding
- **Typography**: Desktop scale begins

### Desktop Small (1024px - 1439px)
```css
@media (min-width: 1024px) {
  .sidebar { width: 280px; }
  .main-content { 
    width: calc(100vw - 280px);
    max-width: 1200px;
    margin: 0 auto;
  }
}
```
- **Grid**: Full desktop layout
- **Sidebar**: 280px fixed left
- **Content**: Max 1200px centered
- **Components**: Full feature set

### Desktop Medium (1440px - 1919px)
- **Viewport**: Standard desktop
- **Grid**: Optimal viewing experience
- **Content**: 1200px with generous margins
- **Typography**: Comfortable reading

### Desktop Large (1920px - 2559px)
- **Viewport**: Full HD displays
- **Grid**: Maximum breathing room
- **Content**: 1200px with luxury spacing
- **Components**: Enhanced hover states

### Desktop XL (2560px+)
- **Viewport**: 4K and ultra-wide
- **Grid**: Scaled for large displays
- **Content**: Consider 1400px max-width option
- **Typography**: Potentially larger base size

## Layout Transitions

### Sidebar Behavior
```typescript
const sidebarWidths = {
  mobile: 0,         // Hidden
  tablet: 240,       // Narrower
  desktop: 280,      // Standard
  collapsed: 80      // Icon-only
}
```

### Content Area Calculations
```typescript
const contentWidth = {
  mobile: '100vw',
  tablet: 'calc(100vw - 240px)',
  desktop: 'calc(100vw - 280px)',
  collapsed: 'calc(100vw - 80px)'
}
```

### Transition Timings
- Sidebar toggle: 300ms ease
- Layout shift: 300ms ease-out
- Content reflow: GPU-accelerated transforms
- Mobile menu: 250ms ease-in-out

## Component Adaptations

### Navigation
- **Mobile**: Bottom tab bar or hamburger menu
- **Tablet**: Collapsible sidebar
- **Desktop**: Full sidebar with labels

### Input Area
- **Mobile**: Full width, 80px height
- **Tablet**: Centered, max 600px
- **Desktop**: Centered, max 700px

### Messages
- **Mobile**: Full width with 16px padding
- **Tablet**: Max 800px width
- **Desktop**: Max 1200px width

## Performance Considerations

### CSS Strategy
```css
/* Use min-width for mobile-first */
@media (min-width: 768px) { }
@media (min-width: 1024px) { }

/* Avoid max-width except for ranges */
@media (min-width: 768px) and (max-width: 1023px) { }
```

### JavaScript Breakpoint Detection
```typescript
const breakpoints = {
  mobile: window.matchMedia('(max-width: 767px)'),
  tablet: window.matchMedia('(min-width: 768px) and (max-width: 1023px)'),
  desktop: window.matchMedia('(min-width: 1024px)')
}
```

## Testing Matrix
- iPhone SE (375px)
- iPhone 14 Pro (393px)
- iPad Mini (768px)
- iPad Pro (1024px)
- MacBook Air (1440px)
- iMac (1920px)
- Pro Display XDR (2560px)