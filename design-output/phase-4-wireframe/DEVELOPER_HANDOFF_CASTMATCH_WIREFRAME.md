# CastMatch AI - Casting Director Wireframe Developer Handoff

## Project Overview
**Project**: CastMatch AI - Professional Casting Dashboard  
**Interface**: Casting Director Landing Page (Post-Login)  
**File**: `casting-director-landing-after-login.html`  
**Date**: September 9, 2025  
**Status**: UI Refinements Complete - Ready for Development

## Executive Summary
This document provides comprehensive technical specifications for implementing the CastMatch AI casting director interface. The wireframe has undergone extensive UI refinements focusing on professional aesthetics, accessibility compliance, and optimal user experience.

---

## 🎨 Design System Specifications

### Color Palette (Sophisticated Grayscale)
```css
:root {
    /* Professional Grayscale Palette */
    --white: #FFFFFF;
    --gray-50: #FAFAFA;
    --gray-100: #F5F5F5;
    --gray-200: #E5E5E5;
    --gray-300: #D4D4D4;
    --gray-400: #A3A3A3;
    --gray-500: #737373;
    --gray-600: #525252;
    --gray-700: #404040;
    --gray-800: #262626;
    --gray-900: #171717;
    --black: #000000;
}
```

### Typography System
- **Primary Font**: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif
- **Monospace**: 'SF Mono', 'Monaco', 'Consolas', monospace
- **Scale**: 12px - 48px with semantic sizing (xs, small, body, section, hero)
- **Line Heights**: tight (1.2), normal (1.5), relaxed (1.7)

### Spacing System
- **Base Unit**: 4px
- **Scale**: 2px, 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 60px, 72px, 80px
- **Usage**: Consistent mathematical progression for all layouts

---

## 🏗️ Layout Architecture

### Grid System
- **Sidebar Width**: 280px (desktop), 240px (tablet)
- **Collapsed Sidebar**: 80px
- **Main Content**: `calc(100vw - 280px)` with responsive adjustments
- **Max Content Width**: 1200px (conversation area)

### Fixed Elements
- **Sidebar**: Fixed left positioning with smooth collapse transition
- **Input Area**: Fixed bottom with 80px minimum height
- **Header**: Fixed top positioning

---

## 🔧 Component Specifications

### 1. Sidebar Navigation
**Structure**: Fixed sidebar with project navigation and toggle functionality

**Key Features**:
- Collapsible with smooth 0.3s ease transition
- Hidden scrollbars (dynamic show/hide on scroll)
- Project status badges with proper spacing
- Icon-free navigation items for clean aesthetics

**CSS Classes**:
```css
.sidebar { /* Fixed left, 280px width */ }
.sidebar.collapsed { /* 80px collapsed width */ }
.sidebar-content { /* Scrollable content area */ }
.nav-item { /* Navigation list items */ }
.status-badge { /* Project status indicators */ }
```

### 2. Conversation Area
**Structure**: Flex column layout with scrollable message container

**Key Features**:
- Center-aligned content (max-width: 1200px)
- Hidden scrollbars for clean appearance
- Bottom spacer for fixed input clearance
- Smooth scroll behavior

**Critical Implementation**:
```css
.conversation-area {
    flex: 1;
    overflow-y: auto;
    scrollbar-width: none;
    padding-bottom: var(--spacing-20);
    scroll-behavior: smooth;
}

.bottom-spacer {
    height: calc(var(--input-area-height) + var(--spacing-80));
    flex-shrink: 0;
}
```

### 3. Input Area
**Structure**: Fixed bottom positioning with 80px minimum height

**Key Features**:
- Transparent background (no background/border)
- Centered alignment with 700px max width
- Text area with 80px minimum height
- Voice and attachment controls
- Smooth transitions and hover states

**Implementation Notes**:
```css
.input-area {
    position: fixed;
    bottom: 0;
    min-height: var(--input-area-height); /* 80px */
    display: flex;
    justify-content: center;
    /* NO background or border */
}

.text-input {
    min-height: 80px;
    max-height: 140px;
    resize: none;
}
```

### 4. Message Components
**Structure**: Flex-based message bubbles with avatars and metadata

**Components**:
- User messages (right-aligned styling)
- AI responses with embedded talent cards
- Rich content support (metrics, actions)
- Proper semantic markup for accessibility

---

## ♿ Accessibility Implementation

### ARIA Labels & Roles
- All interactive elements have proper `aria-label` attributes
- Semantic HTML5 elements (`nav`, `main`, `article`)
- Screen reader friendly navigation
- Proper heading hierarchy (h1, h2, h3)

### Keyboard Navigation
- Full keyboard accessibility
- Proper tab order
- Focus indicators with visible outlines
- Keyboard shortcuts (Ctrl/Cmd + K for search focus)

### Color Contrast
- WCAG 2.1 AA compliance
- Minimum 4.5:1 contrast ratio for text
- 3:1 for UI components
- High contrast focus indicators

---

## 📱 Responsive Design

### Breakpoints
```css
/* Mobile: 0-767px */
@media (max-width: 767px) {
    .sidebar { transform: translateX(-100%); }
    .input-area { left: 0; }
}

/* Tablet: 768-1023px */
@media (min-width: 768px) and (max-width: 1023px) {
    .sidebar { width: 240px; }
}

/* Desktop: 1024px+ */
@media (min-width: 1024px) {
    /* Full desktop layout */
}
```

### Mobile Adaptations
- Sidebar transforms off-screen
- Input area spans full width
- Adjusted padding and spacing
- Touch-friendly button sizes (minimum 44px)

---

## ⚡ Performance Optimizations

### CSS Optimizations
- CSS Custom Properties for consistent theming
- Efficient selectors and minimal specificity
- Hardware-accelerated transforms
- Optimized animations (transform/opacity only)

### Scroll Performance
- Hidden scrollbars for clean UI
- Smooth scroll behavior
- Efficient overflow handling
- Minimal reflows/repaints

---

## 🔍 Recent UI Improvements (Completed)

### Input Area Enhancements
✅ **Centering Fix**: Removed width constraints, implemented proper flexbox centering  
✅ **Width Reduction**: Reduced from 860px to 700px for better proportion  
✅ **Height Increase**: Set minimum height to 80px for both container and textarea  
✅ **Background Removal**: Eliminated background color and border for clean appearance

### Scrolling & Visibility Fixes  
✅ **Bottom Content Visibility**: Added 160px bottom spacer to ensure full message visibility  
✅ **Scroll Behavior**: Implemented smooth scrolling with proper overflow handling  
✅ **Hidden Scrollbars**: Completely hidden all scrollbars for professional appearance

### Navigation Improvements
✅ **Toggle Button Position**: Fixed positioning to prevent overlap and movement during sidebar collapse  
✅ **Project Icons Removal**: Cleaned navigation by removing project icons  
✅ **Status Badge Spacing**: Added proper breathing room around status indicators

### Content Optimization
✅ **Header Simplification**: Reduced conversation header text to prevent overload  
✅ **Placeholder Shortening**: Concise placeholder text for better UX  
✅ **Animation Removal**: Removed microphone animation for professional static appearance

---

## 🚀 Implementation Guidelines

### Development Priorities
1. **Mobile-First Approach**: Start with mobile layout, enhance for desktop
2. **Accessibility First**: Implement ARIA labels and keyboard navigation from start
3. **Performance Focus**: Use CSS transforms for animations, minimize DOM manipulation
4. **Cross-Browser Testing**: Ensure scrollbar hiding works across all browsers

### Framework Integration
- **React/Next.js**: Components can be extracted from HTML structure
- **Tailwind CSS**: Design tokens can be converted to Tailwind config
- **TypeScript**: Proper typing for all component props and state

### Testing Requirements
- **Responsive Testing**: All major device sizes and orientations
- **Accessibility Audit**: Screen readers, keyboard navigation, color contrast
- **Performance Testing**: Smooth scrolling, animation performance
- **Cross-Browser**: Chrome, Firefox, Safari, Edge compatibility

---

## 📁 File Structure Recommendations

```
/components
  /layout
    - Sidebar.tsx
    - Navigation.tsx
    - ToggleButton.tsx
  /conversation
    - ConversationArea.tsx
    - MessageList.tsx
    - MessageBubble.tsx
  /input
    - InputArea.tsx
    - TextInput.tsx
    - VoiceControls.tsx
  /ui
    - Button.tsx
    - Badge.tsx
    - Avatar.tsx

/styles
  - globals.css (design tokens)
  - components.css
  - responsive.css
```

---

## ✅ Quality Assurance Checklist

### Visual Design
- [ ] All colors match design system specifications
- [ ] Typography scale implemented correctly
- [ ] Spacing follows mathematical progression
- [ ] Responsive breakpoints function properly

### Functionality  
- [ ] Sidebar collapse/expand works smoothly
- [ ] Input area maintains 80px minimum height
- [ ] Scrolling reveals all content above fixed input
- [ ] Toggle button remains positioned correctly

### Accessibility
- [ ] Screen reader navigation works properly
- [ ] All interactive elements have ARIA labels
- [ ] Keyboard navigation follows logical tab order  
- [ ] Color contrast meets WCAG 2.1 AA standards

### Performance
- [ ] Smooth 60fps animations
- [ ] Efficient scroll handling
- [ ] Minimal layout shifts
- [ ] Fast initial paint time

---

## 🎯 Next Development Phase

### Immediate Tasks
1. **Component Extraction**: Convert HTML to reusable components
2. **State Management**: Implement sidebar collapse state
3. **API Integration**: Connect to backend services
4. **Testing Setup**: Implement comprehensive test coverage

### Future Enhancements
- Real-time messaging functionality
- Voice transcription integration  
- Advanced search and filtering
- Performance monitoring integration

---

## 📞 Contact & Support

**Design Handoff Complete**: All specifications documented and wireframe ready for development implementation.

**Technical Questions**: Refer to the source HTML file for complete implementation details.

**Last Updated**: September 9, 2025