# CastMatch Grid System Implementation Guide

## Overview
The CastMatch Grid System provides a mathematically precise, responsive layout architecture built on an 8-point baseline grid with golden ratio proportions.

## Quick Start

### 1. Basic Implementation
```tsx
import { CastMatchLayout } from '@/components/layout'

function App() {
  return (
    <CastMatchLayout
      onSendMessage={(msg) => console.log(msg)}
      conversationContent={<YourMessages />}
    />
  )
}
```

### 2. Custom Layout Assembly
```tsx
import { 
  CastMatchLayoutProvider,
  CastMatchSidebar,
  CastMatchMainContent,
  CastMatchInputArea,
  CastMatchConversationArea
} from '@/components/layout'

function CustomApp() {
  return (
    <CastMatchLayoutProvider>
      <CastMatchSidebar>
        {/* Your sidebar content */}
      </CastMatchSidebar>
      
      <CastMatchMainContent>
        <CastMatchConversationArea>
          {/* Your conversation */}
        </CastMatchConversationArea>
      </CastMatchMainContent>
      
      <CastMatchInputArea />
    </CastMatchLayoutProvider>
  )
}
```

## Core Components

### Layout Provider
Manages global layout state and responsive behavior:
```tsx
<CastMatchLayoutProvider 
  defaultSidebarOpen={true}
  defaultSidebarCollapsed={false}
>
  {children}
</CastMatchLayoutProvider>
```

### Sidebar Component
Fixed sidebar with responsive behavior:
- **Desktop**: 280px width
- **Tablet**: 240px width  
- **Collapsed**: 80px width
- **Mobile**: Full-screen overlay

```tsx
<CastMatchSidebar className="custom-sidebar">
  <ProjectList />
  <Navigation />
</CastMatchSidebar>
```

### Main Content Area
Responsive content wrapper with automatic width calculations:
```tsx
<CastMatchMainContent 
  maxWidth={1200}
  centered={true}
  noPadding={false}
>
  {content}
</CastMatchMainContent>
```

### Input Area
Fixed bottom input with dynamic height:
```tsx
<CastMatchInputArea
  placeholder="Type your message..."
  onSendMessage={handleSend}
  onAttachment={handleAttachment}
  onVoiceRecord={handleVoice}
/>
```

### Conversation Area
Scrollable message container with auto-scroll:
```tsx
<CastMatchConversationArea 
  autoScrollToBottom={true}
  showScrollIndicator={true}
>
  <Message sender="user" content="Hello" />
  <Message sender="ai" content="Hi there!" />
</CastMatchConversationArea>
```

## Responsive Hooks

### useLayoutContext
Access layout state from any component:
```tsx
function MyComponent() {
  const {
    sidebarOpen,
    toggleSidebar,
    isMobile,
    sidebarWidth,
    contentWidth
  } = useLayoutContext()
  
  return (
    <div style={{ width: contentWidth }}>
      {/* Your content */}
    </div>
  )
}
```

### useDeviceType
Detect current device type:
```tsx
const { 
  deviceType, 
  isMobile, 
  isTablet, 
  isDesktop 
} = useDeviceType()
```

### useResponsiveValue
Get responsive values based on breakpoint:
```tsx
const columns = useResponsiveValue({
  xs: 1,
  sm: 2,
  tablet: 3,
  lg: 4
})
```

## Grid Mathematics

### Spacing Scale (4px base)
```css
--spacing-1: 4px;   /* Base unit */
--spacing-2: 8px;
--spacing-3: 12px;
--spacing-4: 16px;
--spacing-5: 20px;
--spacing-6: 24px;
--spacing-8: 32px;
--spacing-10: 40px;
--spacing-12: 48px;
```

### Column System
- **Mobile**: 4 columns
- **Tablet**: 8 columns
- **Desktop**: 12 columns

### Breakpoints
```typescript
const BREAKPOINTS = {
  xs: 320,      // Mobile Small
  sm: 375,      // Mobile Medium
  md: 425,      // Mobile Large
  tablet: 768,  // Tablet
  lg: 1024,     // Desktop Small
  xl: 1440,     // Desktop Medium
  '2xl': 1920,  // Desktop Large
  '3xl': 2560   // Desktop XL
}
```

## Layout Calculations

### Content Width Formula
```typescript
// Desktop
width = calc(100vw - 280px)  // Full sidebar
width = calc(100vw - 80px)   // Collapsed sidebar

// Tablet
width = calc(100vw - 240px)

// Mobile
width = 100vw
```

### Maximum Content Width
```typescript
maxWidth = min(1200px, calc(100vw - sidebarWidth - 64px))
```

### Input Area Positioning
```typescript
position: fixed
bottom: 0
left: sidebarWidth
width: calc(100% - sidebarWidth)
maxWidth: 700px (centered)
minHeight: 80px
```

## Performance Optimizations

### GPU Acceleration
```css
.sidebar {
  transform: translateZ(0);
  will-change: transform, width;
}
```

### Smooth Transitions
```css
transition: all 300ms ease;
```

### Reduced Motion Support
```css
@media (prefers-reduced-motion: reduce) {
  * {
    transition-duration: 0.01ms !important;
  }
}
```

## Common Patterns

### Full Dashboard Layout
```tsx
<CastingDirectorLayout
  messages={conversationMessages}
  onSendMessage={handleSend}
  projects={userProjects}
/>
```

### Content Grid
```tsx
<ContentGrid 
  columns={{ mobile: 1, tablet: 2, desktop: 3 }}
  gap="medium"
>
  {items.map(item => (
    <Card key={item.id} {...item} />
  ))}
</ContentGrid>
```

### Message Display
```tsx
<MessageGroup date={new Date()}>
  <Message 
    sender="user" 
    content="Looking for talent"
    timestamp={new Date()}
  />
  <TypingIndicator />
  <SystemMessage 
    type="info" 
    content="AI is thinking..."
  />
</MessageGroup>
```

## Testing Checklist

### Responsive Behavior
- [ ] Sidebar toggles correctly on mobile
- [ ] Content reflows when sidebar collapses
- [ ] Input area maintains position
- [ ] Scrolling works smoothly

### Breakpoints
- [ ] 320px - Mobile Small
- [ ] 375px - Mobile Medium
- [ ] 768px - Tablet
- [ ] 1024px - Desktop
- [ ] 1440px - Desktop Large

### Accessibility
- [ ] Keyboard navigation works
- [ ] ARIA labels present
- [ ] Focus indicators visible
- [ ] Screen reader compatible

### Performance
- [ ] Smooth 60fps animations
- [ ] No layout thrashing
- [ ] GPU acceleration active
- [ ] Minimal reflows

## Integration Steps

1. **Install Dependencies**
   ```bash
   npm install lucide-react
   ```

2. **Import Layout System**
   ```tsx
   import { CastMatchLayout } from '@/components/layout'
   ```

3. **Wrap Your App**
   ```tsx
   <CastMatchLayout>
     <YourApp />
   </CastMatchLayout>
   ```

4. **Add Global Styles**
   ```css
   @import '/Grid_System_v1/Implementation.css';
   ```

5. **Configure Tailwind**
   - Spacing scale configured
   - Breakpoints defined
   - Custom utilities added

## Support & Documentation

- Spacing Guide: `/Grid_System_v1/Spacing_Guide.md`
- Breakpoint Specs: `/Grid_System_v1/Breakpoint_Specs.md`
- Usage Examples: `/Grid_System_v1/Usage_Examples/`
- CSS Implementation: `/Grid_System_v1/Implementation.css`

## Version
**v1.0.0** - September 9, 2025
- Initial grid system implementation
- Mathematical precision with 8-point baseline
- Full responsive support
- Accessibility compliant