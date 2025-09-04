# Mood Board: Mobile-First Experience

## Concept: "Casting in Your Pocket"
*A seamless mobile experience designed for casting directors on-the-go, optimized for one-handed use in Mumbai's busy environment.*

---

## Mobile Design Philosophy

### Context of Use
- **Location**: Film sets, cafes, cars, outdoor locations
- **Lighting**: Bright sunlight to dark screening rooms
- **Network**: Inconsistent 3G to 5G connectivity
- **Usage Pattern**: Quick 2-3 minute sessions throughout the day
- **Device Range**: ₹10,000 to ₹1,00,000 phones

---

## Layout Patterns

### Bottom Navigation Architecture
```css
.bottom-nav {
  position: fixed;
  bottom: 0;
  height: 56px;
  background: rgba(10, 10, 11, 0.95);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  z-index: 100;
}

/* Safe area for iPhone notch/home indicator */
.bottom-nav-inner {
  padding-bottom: env(safe-area-inset-bottom);
}
```

### Thumb Zone Optimization
```
[Unreachable Zone - Top 20%]
- Status information only
- Branding elements
- Non-critical notifications

[Stretch Zone - Top 40%] 
- Secondary navigation
- Search bars
- Filters (expandable)

[Natural Zone - Bottom 40%]
- Primary CTAs
- Navigation tabs
- Quick actions
- FAB placement
```

---

## Touch Interactions

### Gesture Library

#### Swipe Actions
```javascript
// Talent card swipe behaviors
const swipeActions = {
  rightSwipe: 'shortlist',    // Green trail effect
  leftSwipe: 'reject',         // Red trail effect  
  upSwipe: 'viewDetails',      // Expand animation
  downSwipe: 'minimize',       // Collapse animation
  longPress: 'quickActions',   // Haptic feedback
};
```

#### Pull Patterns
- **Pull to Refresh**: Elastic bounce with film reel animation
- **Pull to Load More**: Infinite scroll with skeleton screens
- **Pull to Search**: Quick access from any screen

#### Pinch & Zoom
- Profile photos and portfolios
- Document viewing (resumes, headshots)
- Video scrubbing in gallery view

---

## Mobile Components

### Talent Stack Cards
```css
.talent-stack {
  height: 70vh;
  position: relative;
  perspective: 1000px;
}

.talent-card {
  position: absolute;
  width: 92%;
  height: 100%;
  border-radius: 16px;
  background: linear-gradient(180deg, transparent, rgba(0,0,0,0.8));
  transform-origin: center bottom;
}

/* Stack preview effect */
.card-2 { transform: translateZ(-30px) translateY(10px); }
.card-3 { transform: translateZ(-60px) translateY(20px); }
```

### Bottom Sheets
```css
.bottom-sheet {
  position: fixed;
  bottom: 0;
  width: 100%;
  max-height: 90vh;
  border-radius: 24px 24px 0 0;
  background: var(--surface-elevated);
  transform: translateY(100%);
  transition: transform 0.3s var(--ease-out-expo);
}

.sheet-handle {
  width: 36px;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  margin: 12px auto;
}
```

### Floating Action Button
```css
.fab {
  position: fixed;
  bottom: 72px; /* Above bottom nav */
  right: 16px;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: var(--accent-primary);
  box-shadow: 
    0 6px 20px rgba(0, 212, 255, 0.4),
    0 2px 8px rgba(0, 0, 0, 0.3);
}

/* Extended FAB for context */
.fab-extended {
  width: auto;
  padding: 0 20px;
}
```

---

## Mobile-Specific Features

### Quick Actions Menu
```
[Long Press on Talent]
┌──────────────────┐
│ 📱 Call          │ 
│ 💬 WhatsApp      │
│ 📧 Email         │
│ 🔖 Shortlist     │
│ 📤 Share Profile │
│ 🚫 Block         │
└──────────────────┘
```

### Smart Filters
- Collapsible pill filters
- Recent searches as chips
- Voice input for search
- Location-based filtering
- Quick toggle presets

### Offline Mode UI
```css
.offline-indicator {
  background: var(--warning-amber);
  padding: 4px 12px;
  font-size: 12px;
  animation: pulse 2s infinite;
}

.cached-content {
  position: relative;
}

.cached-content::after {
  content: '📥 Cached';
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 10px;
  background: rgba(0,0,0,0.7);
  padding: 2px 6px;
  border-radius: 4px;
}
```

---

## Performance Optimizations

### Image Loading Strategy
```javascript
// Progressive image loading
const imageStrategy = {
  thumbnail: '50x50',    // Blur-up placeholder
  preview: '200x200',    // Quick preview
  full: '800x800',       // Full quality
  srcset: [              // Responsive images
    '400w',
    '800w', 
    '1200w'
  ]
};
```

### Lazy Loading Patterns
- Virtualized lists for large datasets
- Intersection Observer for images
- Skeleton screens during load
- Predictive prefetching
- Service worker caching

---

## Platform-Specific Adaptations

### iOS Design
- Respect safe areas (notch, dynamic island)
- SF Symbols for system icons
- iOS-style navigation transitions
- Native share sheet integration
- Haptic feedback patterns

### Android Design
- Material You theming support
- System-wide dark mode respect
- Back gesture handling
- Material motion specifications
- Adaptive icons

### PWA Features
```javascript
// PWA Capabilities
const pwaFeatures = {
  installPrompt: true,
  pushNotifications: true,
  offlineSync: true,
  homeScreen: true,
  shareTarget: true,
  fileHandling: true,
  contactPicker: true,
  camera: true
};
```

---

## Responsive Breakpoints

### Device Classes
```css
/* Small phones (iPhone SE, older Android) */
@media (max-width: 375px) {
  --font-scale: 0.9;
  --spacing-scale: 0.9;
  --min-touch-target: 44px;
}

/* Standard phones */
@media (min-width: 376px) and (max-width: 414px) {
  --font-scale: 1.0;
  --spacing-scale: 1.0;
  --min-touch-target: 48px;
}

/* Large phones (Pro Max, Plus) */
@media (min-width: 415px) and (max-width: 480px) {
  --font-scale: 1.1;
  --spacing-scale: 1.1;
  --min-touch-target: 48px;
}

/* Tablets (portrait) */
@media (min-width: 481px) and (max-width: 768px) {
  --columns: 2;
  --font-scale: 1.15;
}
```

---

## Motion Design

### Page Transitions
```css
/* Slide navigation */
@keyframes slideInRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

/* Modal presentation */
@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

/* Card stack animation */
@keyframes stackShuffle {
  0% { transform: translateZ(0); }
  50% { transform: translateZ(-100px) rotateY(5deg); }
  100% { transform: translateZ(0); }
}
```

### Micro-interactions
- Button press: Scale 0.95 with haptic
- Toggle switch: Smooth slide with color change
- Tab switch: Underline slide animation
- Loading: Pulsing skeleton screens
- Success: Brief confetti burst

---

## Native App Integration

### Deep Linking
```javascript
// URL Schemes
const deepLinks = {
  'castmatch://talent/:id': 'Talent profile',
  'castmatch://project/:id': 'Project details',
  'castmatch://search': 'Search with params',
  'castmatch://shortlist': 'My shortlists',
  'castmatch://messages/:thread': 'Chat thread'
};
```

### Platform Features
- Biometric authentication (Face ID, fingerprint)
- Native contacts integration
- Calendar sync for auditions
- Camera for headshot uploads
- Location services for nearby talent

---

## Accessibility Mobile

### Voice Control
```javascript
// Voice commands
const voiceCommands = {
  'Show shortlist': navigateToShortlist,
  'Search for [query]': performSearch,
  'Call [talent]': initiateCal,
  'Next profile': swipeNext,
  'Previous': swipeBack
};
```

### Screen Reader Optimization
- Proper heading hierarchy
- Descriptive button labels
- Image alt text for all media
- Form field instructions
- Status announcements

---

## Data Management

### Offline Storage
```javascript
// IndexedDB structure
const offlineDB = {
  profiles: 'Recent 100 viewed',
  shortlists: 'All user shortlists',
  messages: 'Last 7 days',
  searches: 'Recent 20 searches',
  media: 'Thumbnails only'
};
```

### Sync Strategy
- Background sync when online
- Conflict resolution UI
- Queue actions when offline
- Progressive enhancement
- Data usage warnings

---

## Testing Scenarios

### Real-world Conditions
1. **Bright sunlight**: Marina Drive afternoon
2. **Moving vehicle**: Auto-rickshaw browsing
3. **Crowded space**: Local train usage
4. **Poor network**: Film city basements
5. **Battery saving**: <20% battery mode

### Device Testing Matrix
- iPhone 12 mini to 15 Pro Max
- Samsung Galaxy A series to S series
- OnePlus Nord to Pro models
- Xiaomi/Redmi popular models
- Pixel phones for pure Android

---

## Cultural Considerations

### WhatsApp Integration
- Share profiles via WhatsApp
- WhatsApp Business API for notifications
- Status updates integration
- Group sharing capabilities

### Regional Adaptations
- Right-to-left support for Urdu
- Regional language keyboards
- Local payment methods (UPI, Paytm)
- Festival-themed animations
- Mumbai local train mode (extreme offline)

---

## Success Metrics

### Mobile KPIs
- App opens per day: >5
- Session duration: 2-5 minutes
- Crash rate: <0.1%
- ANR rate: <0.05%
- Install size: <30MB
- Time to interactive: <2s
- Offline usage: >30% of sessions

---

*Mood Board Version: 1.0*
*Created: Q1 2025*
*Focus: Mobile-First Experience*
*Platform: iOS, Android, PWA*