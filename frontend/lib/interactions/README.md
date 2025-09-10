# CastMatch Mobile Interaction System

A comprehensive, production-ready mobile interaction system designed for the CastMatch platform. This system provides haptic feedback, gesture recognition, keyboard navigation, contextual help, and full accessibility support.

## Overview

The CastMatch Mobile Interaction System consists of five core components:

1. **Haptic Feedback System** - Native iOS/Android haptic patterns
2. **Keyboard Navigation** - Advanced shortcuts with vim-style support
3. **Touch Gesture Recognition** - Comprehensive gesture handling
4. **Contextual Help System** - Intelligent, behavior-aware assistance
5. **Accessibility Framework** - WCAG AAA compliant interactions

## Quick Start

```typescript
import { interactionManager } from './lib/interactions';

// Initialize with default configuration
await interactionManager.initialize();

// Or with custom configuration
await interactionManager.initialize({
  haptics: {
    enabled: true,
    intensity: 'medium',
    customPatterns: true
  },
  touch: {
    gestures: true,
    sensitivity: 'high',
    preventScrolling: false
  },
  help: {
    contextual: true,
    smartSuggestions: true,
    onboarding: true
  }
});
```

## Core Features

### 🔄 Haptic Feedback

Native haptic patterns for iOS and Android devices with customizable intensity and user preferences.

**Key Features:**
- iOS Taptic Engine integration
- Android vibration API support
- Context-specific feedback patterns
- User preference controls
- Battery-efficient implementation

```typescript
import { hapticFeedback } from './lib/interactions';

// Success actions
hapticFeedback.profileSaved();        // Light impact (50ms)
hapticFeedback.auditionBooked();      // Medium impact (100ms)
hapticFeedback.matchFound();          // Success pattern (3 pulses)

// Navigation feedback
hapticFeedback.buttonTap();           // Light tap (10ms)
hapticFeedback.swipeAction();         // Selection feedback
hapticFeedback.longPress();           // Heavy impact (80ms)

// Casting workflow
hapticFeedback.talentShortlisted();   // Custom success pattern
hapticFeedback.searchComplete();      // Search feedback
```

### ⌨️ Keyboard Navigation

Advanced keyboard shortcuts with vim-style navigation and accessibility support.

**Global Shortcuts:**
- `Ctrl/Cmd + /` - Show help overlay
- `Ctrl/Cmd + K` - Global search
- `Ctrl/Cmd + N` - New audition/project
- `Tab` / `Shift + Tab` - Navigate forward/backward

**Casting Workflow:**
- `S` - Shortlist talent
- `P` - Pass on talent
- `C` - Start conversation
- `V` - View full profile
- `A` - Schedule audition

**Vim-Style Navigation:**
- `h/j/k/l` - Navigate left/down/up/right
- `g` - Go to top
- `G` - Go to bottom

```typescript
import { keyboardNavigation } from './lib/interactions';

// Add custom shortcuts
keyboardNavigation.addCustomShortcut({
  key: 'r',
  action: 'refreshTalentList',
  description: 'Refresh talent list',
  category: 'casting',
  context: ['talent-search']
});

// Enable vim mode
keyboardNavigation.setMode('vim');
```

### 👆 Touch Gestures

Comprehensive gesture recognition with context-aware handling.

**Supported Gestures:**
- **Swipe** - Navigation and actions
- **Pinch** - Zoom and scaling
- **Long Press** - Context menus
- **Double Tap** - Quick actions
- **Pan** - Drag operations
- **Pull to Refresh** - Content updates

```typescript
import { touchGestures } from './lib/interactions';

// Listen for gestures
touchGestures.on('swipe', (data) => {
  if (data.direction === 'right') {
    // Shortlist talent
  }
});

touchGestures.on('longPress', (data) => {
  // Show context menu
});

// Configure gesture sensitivity
touchGestures.updateConfig('pinch', {
  sensitivity: 0.1,
  threshold: 10
});
```

### 💡 Contextual Help

Intelligent help system that learns user behavior and provides contextual assistance.

**Features:**
- Behavior-based help suggestions
- Progressive onboarding tours
- Role-specific guidance (talent vs casting director)
- Adaptive complexity based on experience
- Accessibility-friendly help delivery

```typescript
import { helpSystem } from './lib/interactions';

// Get recommended help content
const recommendations = helpSystem.getRecommendedHelp();

// Search help content
const results = helpSystem.searchHelp('keyboard shortcuts');

// Track help usage
helpSystem.trackHelpRequest('talent-search');

// Start onboarding flow
helpSystem.startOnboarding('casting-director-onboarding');
```

### ♿ Accessibility

WCAG AAA compliant interaction patterns with comprehensive screen reader support.

**Features:**
- Automatic focus management
- Screen reader announcements
- Keyboard-only navigation
- High contrast mode support
- Reduced motion preferences
- Skip links and landmarks

```typescript
import { accessibilitySystem } from './lib/interactions';

// Announce to screen readers
accessibilitySystem.announce('Talent added to shortlist', 'polite');

// Manage focus
accessibilitySystem.manageFocus({
  trapFocus: true,
  initialFocus: '#modal-content',
  restoreFocus: true
});

// Update preferences
accessibilitySystem.updatePreferences({
  highContrast: true,
  reducedMotion: true,
  announcements: true
});
```

## React Components

### SwipeableTalentCard

Production-ready talent card with swipe gestures, haptic feedback, and accessibility support.

```tsx
import { SwipeableTalentCard } from './lib/interactions';

<SwipeableTalentCard
  talent={talent}
  onShortlist={(id) => handleShortlist(id)}
  onPass={(id) => handlePass(id)}
  onViewProfile={(id) => handleViewProfile(id)}
/>
```

**Features:**
- Swipe right to shortlist
- Swipe left to pass
- Double tap to view profile
- Long press for context menu
- Haptic feedback integration
- Keyboard accessible

### ZoomableImage

Pinch-to-zoom image viewer with accessibility support.

```tsx
import { ZoomableImage } from './lib/interactions';

<ZoomableImage
  src="/path/to/headshot.jpg"
  alt="Talent headshot"
  className="w-full h-64"
/>
```

**Features:**
- Pinch to zoom (1x to 3x)
- Double tap to toggle zoom
- Pan when zoomed
- Keyboard navigation support
- Screen reader compatible

### SwipeableMediaGallery

Touch-optimized media gallery with gesture navigation.

```tsx
import { SwipeableMediaGallery } from './lib/interactions';

<SwipeableMediaGallery
  media={mediaItems}
  onMediaChange={(index) => console.log('Changed to:', index)}
/>
```

**Features:**
- Swipe navigation
- Touch-friendly controls
- Video playback support
- Accessibility labels
- Keyboard navigation

### PullToRefreshContainer

Native-style pull-to-refresh implementation.

```tsx
import { PullToRefreshContainer } from './lib/interactions';

<PullToRefreshContainer
  onRefresh={async () => await loadData()}
  refreshThreshold={80}
>
  {/* Your content */}
</PullToRefreshContainer>
```

### SmartTooltip

Context-aware tooltips with intelligent positioning.

```tsx
import { SmartTooltip } from './lib/interactions';

<SmartTooltip
  content="Add talent to your shortlist"
  trigger="hover"
  position="auto"
  interactive={true}
>
  <button>Shortlist</button>
</SmartTooltip>
```

### HapticButton

Button with integrated haptic feedback.

```tsx
import { HapticButton } from './lib/interactions';

<HapticButton
  variant="primary"
  hapticType="medium"
  onClick={handleClick}
>
  Submit
</HapticButton>
```

## React Hooks

### useInteractionSystems

Main hook for managing all interaction systems.

```tsx
import { useInteractionSystems } from './lib/interactions';

const { manager, isInitialized, status, config } = useInteractionSystems();
```

### useHapticFeedback

Hook for haptic feedback control.

```tsx
import { useHapticFeedback } from './lib/interactions';

const { haptic, isSupported, preferences } = useHapticFeedback();
```

### useKeyboardNavigation

Hook for keyboard navigation features.

```tsx
import { useKeyboardNavigation } from './lib/interactions';

const { navigation, shortcuts, setMode } = useKeyboardNavigation();
```

### useTouchGestures

Hook for gesture recognition.

```tsx
import { useTouchGestures } from './lib/interactions';

const { gestures, isActive, on, off } = useTouchGestures();
```

### useContextualHelp

Hook for contextual help system.

```tsx
import { useContextualHelp } from './lib/interactions';

const { helpSystem, recommendations, searchHelp } = useContextualHelp();
```

### useAccessibility

Hook for accessibility features.

```tsx
import { useAccessibility } from './lib/interactions';

const { system, announce, preferences, utils } = useAccessibility();
```

## Configuration

### System Configuration

```typescript
interface InteractionSystemConfig {
  haptics: {
    enabled: boolean;
    intensity: 'light' | 'medium' | 'heavy';
    customPatterns: boolean;
  };
  keyboard: {
    shortcuts: boolean;
    vimMode: boolean;
    accessibility: boolean;
  };
  touch: {
    gestures: boolean;
    sensitivity: 'low' | 'medium' | 'high';
    preventScrolling: boolean;
  };
  help: {
    contextual: boolean;
    smartSuggestions: boolean;
    onboarding: boolean;
  };
  accessibility: {
    screenReader: 'auto' | 'enabled' | 'disabled';
    highContrast: 'auto' | 'enabled' | 'disabled';
    reducedMotion: 'auto' | 'enabled' | 'disabled';
  };
}
```

### User Preferences

All systems support user preferences stored in localStorage:
- `castmatch-haptic-preferences`
- `castmatch-keyboard-preferences`
- `castmatch-help-behavior`
- `castmatch-accessibility-preferences`
- `castmatch-onboarding`

## Performance Metrics

### Target Performance
- **Touch Response**: <100ms
- **Animation Frame Rate**: 60fps
- **Gesture Recognition**: >95% accuracy
- **Memory Usage**: <5MB
- **Battery Impact**: Minimal

### Optimization Features
- GPU-accelerated animations
- RequestAnimationFrame scheduling
- Efficient event delegation
- Lazy loading of help content
- Debounced user input handling

## Browser Support

- **iOS Safari**: 12+ (Full haptic support)
- **Android Chrome**: 70+ (Vibration API)
- **Desktop Chrome**: 80+ (Limited haptics)
- **Desktop Firefox**: 78+
- **Desktop Safari**: 13+
- **Desktop Edge**: 80+

## Accessibility Compliance

- **WCAG 2.1 AAA** compliant
- **Section 508** compliant
- Screen reader compatible (NVDA, JAWS, VoiceOver)
- Keyboard-only navigation support
- Focus management and restoration
- High contrast mode support
- Reduced motion preference respect

## Data Attributes

The system uses several data attributes for context and styling:

```html
<!-- Gesture contexts -->
<div data-gesture-context="talent-card">
<div data-gesture-context="media-gallery">
<div data-gesture-context="headshot-viewer">

<!-- Keyboard contexts -->
<input data-keyboard-context="global-search">
<div data-keyboard-context="chat-input">

<!-- Accessibility -->
<div data-component="talent-card">
<button data-user-role="casting_director">

<!-- Pull to refresh -->
<div data-pull-to-refresh="true">

<!-- Long press menu -->
<div data-long-press-menu>
```

## CSS Classes

Key CSS classes used by the system:

```css
/* Focus indicators */
.keyboard-focused { }
.focus-visible { }

/* Accessibility */
.sr-only { }
.high-contrast { }
.large-text { }
.reduced-motion { }

/* Skip links */
.skip-link { }

/* Interaction states */
.gesture-active { }
.haptic-enabled { }
```

## Event System

The system emits custom events for integration:

```javascript
// Gesture events
document.addEventListener('castmatch:gesture:swipe', handler);
document.addEventListener('castmatch:gesture:longPress', handler);
document.addEventListener('castmatch:gesture:pinch', handler);

// Keyboard events
document.addEventListener('castmatch:keyboard-shortcut', handler);

// Help events
document.addEventListener('castmatch:help-suggestion', handler);
document.addEventListener('castmatch:show-help', handler);

// Accessibility events
document.addEventListener('castmatch:focus-change', handler);
```

## Testing

### Unit Tests
```bash
npm test -- --testPathPattern=interactions
```

### E2E Tests
```bash
npm run test:e2e -- --spec="interactions/*"
```

### Accessibility Tests
```bash
npm run test:a11y
```

## Debugging

Enable interaction debugging:

```typescript
import { interactionManager } from './lib/interactions';

interactionManager.enableDebugging();
```

This will log all gestures, keyboard shortcuts, and help interactions to the console.

## Migration Guide

### From Basic Interactions

```typescript
// Before
<button onClick={handleClick}>Submit</button>

// After
import { HapticButton } from './lib/interactions';
<HapticButton onClick={handleClick}>Submit</HapticButton>
```

### Adding Gesture Support

```typescript
// Before
<div className="talent-card">

// After
<div 
  className="talent-card" 
  data-gesture-context="talent-card"
>
```

## Contributing

1. Follow the existing code patterns
2. Add comprehensive TypeScript types
3. Include accessibility considerations
4. Write unit tests for new features
5. Update documentation

## License

Part of the CastMatch platform - Proprietary License

## Support

For technical support or questions about the interaction system:
- Create an issue in the project repository
- Contact the development team
- Check the troubleshooting guide

---

**Note**: This interaction system is designed specifically for the CastMatch platform and optimized for Mumbai's casting industry workflows. All examples and patterns reflect real-world usage scenarios in casting and talent management.