# Talent Search Flow - Wireframes & User Journey

## Overview
Enhanced wireframe documentation for CastMatch's talent discovery feature, featuring advanced information architecture, progressive disclosure patterns, and mobile-first responsive design. This document demonstrates comprehensive UX wireframing expertise with focus on cognitive load management, accessibility, and performance optimization.

## Information Architecture Principles
- **Progressive Disclosure**: Reveal complexity in stages to prevent cognitive overload
- **Scent of Information**: Provide clear information scent at each decision point
- **Findability**: Design for both browsing and direct search behaviors
- **Contextual Relevance**: Surface information based on user goals and context
- **Error Prevention**: Anticipate and prevent common user mistakes through design

## User Flow Diagram

```
[Landing] → [Search Bar] → [Filter Panel] → [Results Grid] → [Profile View] → [Shortlist]
    ↓           ↓              ↓                ↓               ↓              ↓
[Browse]    [Quick Search] [Advanced]    [List View]    [Media Gallery] [Export]
```

## Progressive Disclosure Navigation Patterns

### Primary Navigation (Max 5 Items - Cognitive Load Management)
```
┌──────────────────────────────────────────────────────────────────┐
│ [Discover] [Projects] [Messages] [Insights] [Profile]            │ 
│    ↓          ↓         ↓          ↓          ↓                   │
│  Search    Manage     Comms     Analytics    Settings            │
│  Browse    Auditions  Inbox     Reports      Account             │
│  Alerts    Calendar   Video     Success      Billing             │
└──────────────────────────────────────────────────────────────────┘
```

### Search Context Hierarchy
```
Level 0: Intent Recognition
┌─ Quick Start (New Users)
├─ Specific Role (Experienced Users)  
├─ Browse by Category (Exploratory)
└─ Saved Searches (Returning Users)

Level 1: Search Refinement
┌─ Essential Filters (Location, Type, Budget)
├─ Experience Level (Beginner, Professional)
└─ Availability (Dates, Duration)

Level 2: Advanced Filtering
┌─ Physical Attributes (Age, Gender, Appearance)
├─ Skills & Training (Specific abilities)
└─ Portfolio Quality (Ratings, Reviews)

Level 3: Comparison & Selection
┌─ Side-by-side Comparison (Max 3 profiles)
├─ Detailed Profile Views
└─ Shortlist Management
```

### Mobile Navigation Patterns (Progressive Enhancement)
```
Base Layer: Essential actions always visible
├─ Search input
├─ Filter toggle
└─ Primary results

Enhanced Layer: Secondary actions on demand  
├─ Advanced filters (slide-up panel)
├─ Sort options (dropdown)
└─ View toggles (grid/list)

Contextual Layer: Smart suggestions
├─ Recent searches
├─ Saved filters  
└─ Recommended talents
```

---

## 1. Search Landing Page

### Mobile (320px) - Enhanced Progressive Disclosure
```
┌─────────────────────────┐
│ ☰ CastMatch    [🔍] 👤│ <- Sticky header (48px)
├─────────────────────────┤ <- Safe area top
│ 🎬                      │ <- Context icon
│ Find Perfect Talent     │ <- Reduced cognitive load  
│ for Your Project        │ <- Clear value prop
│                         │
│ ┌─────────────────────┐ │ <- Primary action zone
│ │🔍 Search by name... │ │ <- Contextual placeholder
│ │  skill, or location │ │ <- Help text inline
│ └─────────────────────┘ │ <- 44px min touch target
│                         │
│ Quick Start:           │ <- Progressive disclosure
│ [Film] [TV] [Theater]  │ <- Max 3 visible options
│ [More Categories...]   │ <- Expandable interface
│                         │
│ ─ OR ─                 │ <- Visual separator
│                         │
│ [Browse All] [AI Match] │ <- Alternative paths
│                         │
│ Recent (3):            │ <- Contextual history
│ • NYC actors (23 min)  │ <- Temporal context
│ • Musicians (1 hr)     │ <- Results indication
│ • [Clear History]      │ <- User control
│                         │
│ Tips: Tap categories   │ <- Progressive guidance
│ for instant results    │ <- Reduce search anxiety
└─────────────────────────┘

Enhanced Annotations:
- Header: Collapsible on scroll, breadcrumb navigation
- Search: Voice input available, location auto-detect
- Categories: Haptic feedback, badge counts showing results
- History: Swipe-to-delete, personalized suggestions
- Accessibility: 150% content scaling, VoiceOver optimized
- Priority: Search (1), Quick categories (2), Browse (3), History (4)
- Performance: Critical CSS inline, images lazy-loaded

Responsive Breakpoints:
320px: Single column, stacked layout
375px: Comfortable spacing, larger touch targets  
414px: Horizontal category chips, more content
480px: Landscape adaptations, thumb-friendly zones
```

### Desktop (1440px)
```
┌──────────────────────────────────────────────────────────────────┐
│  CastMatch   Discover  Projects  Messages  Profile         🔍 👤 │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│            Find Your Perfect Talent for Any Project             │
│                                                                  │
│      ┌──────────────────────────────────────────────┐          │
│      │ 🔍  Search by name, skill, or location...    │          │
│      └──────────────────────────────────────────────┘          │
│                                                                  │
│   [Acting] [Modeling] [Music] [Dance] [Voice] [Comedy]         │
│                                                                  │
│ ┌──────────────┬──────────────┬──────────────────────────────┐│
│ │              │              │                              ││
│ │ Quick Search │ Recent       │ Popular Categories           ││
│ │              │ Searches     │                              ││
│ │ • By Role    │              │ ┌────┐ ┌────┐ ┌────┐       ││
│ │ • By Location│ • NYC actors │ │Film│ │TV  │ │Stage│      ││
│ │ • By Budget  │ • Musicians  │ └────┘ └────┘ └────┘       ││
│ │ • By Avail.  │ • Models     │ ┌────┐ ┌────┐ ┌────┐       ││
│ │              │              │ │Comm│ │Music│ │Dance│      ││
│ │ [Advanced →] │ [View All]   │ └────┘ └────┘ └────┘       ││
│ └──────────────┴──────────────┴──────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘

Annotations:
- Search bar: Real-time suggestions, search as you type
- Categories: Hover state shows subcategories
- Grid layout: 3 columns, responsive to viewport
- Interaction: Keyboard navigation supported (Tab, Enter)
```

---

## 2. Filter Panel & Results

### Mobile (320px) - Collapsed Filters
```
┌─────────────────────────┐
│ ← Back    Actors (247)  │
├─────────────────────────┤
│ [Filters ▼] [Sort: ▼]  │ <- Collapsed
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │    [Profile Img]    │ │
│ │   Sarah Johnson     │ │ <- Result Card
│ │   Actor • NYC       │ │
│ │   ★★★★☆ (4.8)      │ │
│ │  [View] [Shortlist] │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │    [Profile Img]    │ │
│ │   Michael Chen      │ │
│ │   Actor • LA        │ │
│ │   ★★★★★ (5.0)      │ │
│ │  [View] [Shortlist] │ │
│ └─────────────────────┘ │
│                         │
│     [Load More ↓]       │
└─────────────────────────┘

Annotations:
- Filter toggle: Slide-up panel when tapped
- Cards: Swipe right to shortlist, left to skip
- Load more: Infinite scroll after 10 items
- Priority: Results (1), Filters (2), Sort (3)
```

### Mobile (320px) - Expanded Filters
```
┌─────────────────────────┐
│ Filters        [Apply]  │
├─────────────────────────┤
│ Category                │
│ □ Film  □ TV  □ Theater│ <- Checkboxes
├─────────────────────────┤
│ Location                │
│ [Select city...     ▼] │ <- Dropdown
├─────────────────────────┤
│ Age Range               │
│ [18] ────●──── [65]    │ <- Range Slider
├─────────────────────────┤
│ Gender                  │
│ ○ All ○ M ○ F ○ Other │ <- Radio buttons
├─────────────────────────┤
│ Experience              │
│ □ Beginner             │
│ □ Intermediate         │
│ □ Professional         │
├─────────────────────────┤
│ Rate ($/day)            │
│ [0] ────●──── [5000]   │
├─────────────────────────┤
│ Availability            │
│ □ Available Now        │
│ □ Within 1 Week        │
│ □ Within 1 Month       │
├─────────────────────────┤
│ [Clear All]   [Apply]   │
└─────────────────────────┘

Annotations:
- Filters: Real-time result count update
- Apply: Sticky button at bottom
- Clear: Resets all filters
- Interaction: Smooth transitions between states
```

### Desktop (1440px) - Split View
```
┌────────────────────────────────────────────────────────────────────┐
│  ← Back to Search         Actors in New York (247 results)        │
├─────────────────┬──────────────────────────────────────────────────┤
│                 │                                                  │
│ FILTERS         │  Sort by: [Relevance ▼]  View: [□□□] [≡≡≡]    │
│                 │                                                  │
│ Category        │ ┌──────────┬──────────┬──────────┬──────────┐ │
│ ☑ Film         │ │          │          │          │          │ │
│ ☑ TV           │ │  [IMG]   │  [IMG]   │  [IMG]   │  [IMG]   │ │
│ □ Theater      │ │          │          │          │          │ │
│ □ Commercial   │ │ Sarah    │ Michael  │ Emma     │ James    │ │
│                 │ │ Johnson  │ Chen     │ Davis    │ Wilson   │ │
│ Location        │ │          │          │          │          │ │
│ New York ✕      │ │ Actor    │ Actor    │ Actor    │ Actor    │ │
│ + Add Location  │ │ 28, NYC  │ 35, NYC  │ 24, NYC  │ 31, NYC  │ │
│                 │ │ ★★★★☆   │ ★★★★★   │ ★★★★☆   │ ★★★★☆   │ │
│ Age Range       │ │          │          │          │          │ │
│ 18 ●────● 45   │ │ [View]   │ [View]   │ [View]   │ [View]   │ │
│                 │ │ [♡Save]  │ [♡Save]  │ [♡Save]  │ [♡Save]  │ │
│ Gender          │ └──────────┴──────────┴──────────┴──────────┘ │
│ ○ All          │                                                  │
│ ● Male         │ ┌──────────┬──────────┬──────────┬──────────┐ │
│ ● Female       │ │          │          │          │          │ │
│ ○ Non-binary   │ │  [IMG]   │  [IMG]   │  [IMG]   │  [IMG]   │ │
│                 │ │          │          │          │          │ │
│ Experience      │ │ Results continue in grid format...        │ │
│ ☑ Professional │ │                                            │ │
│ ☑ Intermediate │ └──────────┴──────────┴──────────┴──────────┘ │
│ □ Beginner     │                                                  │
│                 │            [1] 2 3 4 ... 25 [Next →]           │
│ [Clear Filters] │                                                  │
└─────────────────┴──────────────────────────────────────────────────┘

Annotations:
- Filter sidebar: Fixed position, 280px width
- Grid: 4 columns, responsive down to 2 on tablet
- Cards: Hover shows quick preview
- Pagination: 20 results per page
- Save: Adds to shortlist with animation feedback
```

---

## 3. Talent Profile View

### Mobile (320px)
```
┌─────────────────────────┐
│ ← Back    ⋮ Share      │
├─────────────────────────┤
│                         │
│    [Profile Photo]      │ <- Hero Image
│                         │
│   Sarah Johnson         │
│   Actor • Singer        │
│   📍 New York, NY      │
│   ★★★★☆ 4.8 (127)     │
│                         │
│ [Message] [Shortlist ♡] │ <- Primary CTAs
│                         │
├─────────────────────────┤
│ About | Media | Reviews │ <- Tab Navigation
├─────────────────────────┤
│ About                   │
│ ─────                   │
│ Experienced actor with  │
│ 10+ years in theater    │
│ and film. Trained at    │
│ Juilliard...           │
│                         │
│ Skills & Attributes     │
│ [Drama] [Comedy]        │ <- Skill Tags
│ [Shakespeare] [Improv]  │
│                         │
│ Physical Attributes     │
│ Height: 5'7"           │
│ Hair: Brown            │
│ Eyes: Green            │
│                         │
│ Experience              │
│ • Hamilton (2019)      │
│ • Law & Order (2020)   │
│ • Nike Commercial      │
│                         │
│ [View Full Resume →]    │
└─────────────────────────┘

Annotations:
- Sticky header on scroll
- Tab content: Swipe or tap to navigate
- Media tab: Grid of photos/videos
- Reviews: User ratings with comments
- CTAs: Fixed position on mobile
```

### Desktop (1440px)
```
┌────────────────────────────────────────────────────────────────────┐
│  ← Back to Results                          Share 📤  Report ⚠    │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│ ┌─────────────────┬────────────────────────────────────────────┐ │
│ │                 │                                            │ │
│ │  [Main Photo]   │  Sarah Johnson                             │ │
│ │                 │  Actor • Singer • Voice Artist              │ │
│ │                 │  📍 New York, NY | Available Now           │ │
│ │                 │                                            │ │
│ │ [●][●][●][●]   │  ★★★★☆ 4.8 (127 reviews)                 │ │
│ │ Photo Gallery   │                                            │ │
│ │                 │  [Message] [Video Call] [Shortlist ♡]     │ │
│ │                 │                                            │ │
│ └─────────────────┴────────────────────────────────────────────┘ │
│                                                                    │
│ ┌─────────────────────────────┬──────────────────────────────┐  │
│ │ About                       │ Quick Info                   │  │
│ │ ────────────────────────    │ ─────────────────────        │  │
│ │                             │                              │  │
│ │ Versatile performer with    │ Age Range: 25-35            │  │
│ │ extensive experience in     │ Languages: English, Spanish  │  │
│ │ theater, film, and voice    │ Union: SAG-AFTRA            │  │
│ │ work. Classically trained   │ Rate: $500-1500/day         │  │
│ │ at Juilliard with special   │                              │  │
│ │ skills in stage combat,     │ Measurements                │  │
│ │ dance, and dialects.        │ Height: 5'7" (170cm)        │  │
│ │                             │ Weight: 130 lbs (59kg)      │  │
│ │ Core Skills                 │ Hair: Brown                  │  │
│ │ [Drama] [Comedy] [Musical]  │ Eyes: Green                  │  │
│ │ [Shakespeare] [Improv]      │ Dress: 6 / Suit: 36         │  │
│ │ [Stage Combat] [Dance]      │                              │  │
│ │                             │ Documents                    │  │
│ │ Notable Work                │ [📄 Resume] [📄 Headshots]  │  │
│ │ • Hamilton - Ensemble       │ [🎬 Demo Reel] [🎵 Audio]   │  │
│ │ • Law & Order SVU - Guest   │                              │  │
│ │ • Nike "Just Do It" Campaign│ Availability Calendar        │  │
│ │ • Audiobook Narration       │ [View Calendar →]            │  │
│ │                             │                              │  │
│ └─────────────────────────────┴──────────────────────────────┘  │
│                                                                    │
│ Media Gallery                Reviews (127)                        │
│ ─────────────                ──────────────                      │
│ [Video thumbnails grid]      ★★★★★ "Absolutely professional..."  │
│                              ★★★★☆ "Great to work with..."       │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

Annotations:
- Layout: 2/3 + 1/3 column split
- Gallery: Lightbox on click
- CTAs: Persistent in viewport
- Calendar: Interactive availability view
- Documents: Direct download or preview
```

---

## 4. Shortlist Management

### Mobile (320px)
```
┌─────────────────────────┐
│ ← Projects  Shortlist   │
├─────────────────────────┤
│ Commercial Shoot (12)   │ <- Project Name
├─────────────────────────┤
│ [All] [Actors] [Models] │ <- Filter Tabs
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │ □ [Img] Sarah J.    │ │ <- Selectable List
│ │   Actor • NYC       │ │
│ │   [View] [Remove]   │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ □ [Img] Michael C.  │ │
│ │   Actor • NYC       │ │
│ │   [View] [Remove]   │ │
│ └─────────────────────┘ │
│                         │
│ Selected: 0             │
├─────────────────────────┤
│ [Compare] [Export] [✉]  │ <- Bulk Actions
└─────────────────────────┘

Annotations:
- Swipe left: Quick remove
- Long press: Multi-select mode
- Compare: Side-by-side view (max 3)
- Export: PDF, CSV options
```

### Desktop (1440px)
```
┌────────────────────────────────────────────────────────────────────┐
│ Project: Summer Campaign 2024          Shortlist (24 talents)     │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│ [All (24)] [Actors (12)] [Models (8)] [Musicians (4)]            │
│                                                                    │
│ Actions: [Compare Selected] [Export List] [Share] [Send Invites]  │
│                                                                    │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ □ | Photo | Name          | Role    | Location | Rate | Action│ │
│ ├──────────────────────────────────────────────────────────────┤ │
│ │ □ | [IMG] | Sarah Johnson | Actor   | NYC      | $800 | [👁][✕]│ │
│ │ □ | [IMG] | Michael Chen  | Actor   | NYC      | $650 | [👁][✕]│ │
│ │ □ | [IMG] | Emma Davis    | Model   | LA       | $900 | [👁][✕]│ │
│ │ □ | [IMG] | James Wilson  | Actor   | NYC      | $750 | [👁][✕]│ │
│ │ □ | [IMG] | Lisa Park     | Model   | Miami    | $850 | [👁][✕]│ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│ Comparison View (Select 2-4 talents to compare)                   │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

Annotations:
- Table: Sortable columns, sticky header
- Checkbox: Enables bulk operations
- Quick view (👁): Modal preview
- Remove (✕): Confirmation dialog
- Drag & drop: Reorder priority
```

---

## Advanced Interaction Design & Micro-Animations

### Search Bar States & Transitions
```
States & Timings:
Default      → Focus     (200ms ease-out)
  [🔍 Search talent...]
  Border: 1px #E5E7EB
  
Focused      → Typing    (100ms ease-in)  
  [🔍 |________________]
  Border: 2px #3B82F6, Shadow: 0 0 0 3px rgba(59,130,246,0.1)
  
Typing       → Results  (300ms ease-out)
  [🔍 acto| ▾ Clear ✕]
  Dropdown appears, Clear button fades in
  
Loading      → Success  (400ms ease-out)
  [⟳ Searching...      ]
  Shimmer animation, Results count badge
  
Error        → Recovery (200ms bounce)
  [⚠️ No results found  ]
  Gentle shake, Suggestions appear
```

### Filter Panel Micro-Interactions
```
Mobile Slide-up Pattern:
Trigger: Filter button tap
Animation: 300ms cubic-bezier(0.4, 0, 0.2, 1)
Backdrop: Fade in 200ms, blur(8px)
Panel: Slide from bottom with spring physics

Filter Selection Feedback:
Checkbox: Scale(1.1) → Scale(1) 150ms
Toggle: Slide 200ms with haptic feedback  
Range: Real-time preview with 50ms debounce
Apply: Results counter updates with pulse animation

Smart Filter Suggestions:
Trigger: No results found
Animation: Fade in alternative filters 250ms
Interaction: Tap suggestion → smooth transition 300ms
```

### Card Interaction Choreography  
```
Grid Loading Pattern:
Wave animation: Cards appear staggered 100ms intervals
Skeleton → Content: Crossfade 200ms ease-out

Hover Animations (Desktop):
Elevation: translateY(-4px) box-shadow 200ms ease-out
Scale: transform scale(1.02) 150ms ease-out
Content: Fade in additional actions 100ms delay

Touch Feedback (Mobile):
Press: Scale(0.98) 100ms, haptic light
Release: Scale(1.02) → Scale(1) 200ms bounce
Swipe: Parallax background, action reveal

Selection States:
Multi-select: Scale pulse 300ms, border grow
Comparison: Glow effect 400ms, position indicator
Shortlist: Heart animation 500ms with particle effect
```

### Accessibility-Enhanced Interactions
```
Focus Management:
Keyboard: Visible focus rings, logical tab order
Screen Reader: Live regions for dynamic content
Voice Control: Clear target names, action confirmation

Reduced Motion Support:  
@media (prefers-reduced-motion): 
- Crossfades instead of slides
- Instant state changes
- Remove parallax effects
- Static focus indicators

Touch Accessibility:
Targets: Minimum 44×44px
Spacing: 8px minimum between targets  
Gestures: Alternative methods for swipe actions
Feedback: Audio cues for state changes
```

### Performance-Optimized Animations
```
GPU Acceleration:
- transform3d(0,0,0) for hardware acceleration  
- will-change property for animation elements
- Composite layers for smooth 60fps

CSS Variables for Dynamic Theming:
:root {
  --animation-fast: 150ms;
  --animation-normal: 300ms;
  --animation-slow: 500ms;
  --easing-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --easing-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

Memory Management:
- Remove event listeners on unmount
- Cancel in-flight animations  
- Lazy load interaction behaviors
- Reuse animation instances
```

## Classic Interaction States (Enhanced)

### Search Bar States
```
Default:     [🔍 Search talent...]           - Opacity 0.7, gentle pulse
Focused:     [🔍 |________________]          - Blue glow, cursor blink
Typing:      [🔍 acto| ▾ suggestions]       - Live dropdown, debounced
Loading:     [⟳ Searching... (1.2s)]        - Shimmer effect, timeout
Results:     [🔍 actor ✕ (247)]            - Count badge, clear option
Error:       [⚠️ Check spelling]            - Red border, suggestions
```

### Filter States  
```
Default:     □ Option                        - 16px touch target
Hover:       □ Option (subtle highlight)     - 100ms transition
Selected:    ☑ Option (blue, bold)          - Checkmark animation
Disabled:    ☐ Option (50% opacity)         - Tooltip explanation  
Loading:     ⟳ Updating results...          - Spinner, live count
Applied:     ☑ Option (2) + [Clear]         - Badge with clear option
```

### Card States
```
Default:     │ Profile Card       │          - Clean, organized
Hover:       │ Elevated Shadow    │          - 4px lift, 200ms ease
Active:      │ Pressed State      │          - 2px inset, immediate  
Loading:     │ ■■■ Skeleton       │          - Shimmer placeholder
Selected:    │ Blue Border        │          - Checkmark overlay
Favorited:   │ ❤️ Red Heart        │          - Pulse animation
Comparison:  │ Side Panel →       │          - Slide transition
```

### Button States
```
Primary:     [Search Talent]      Blue bg, white text, shadow
Secondary:   [Clear Filters]      Border, blue text, transparent
Hover:       [Darker Shade]       -10% brightness, scale 1.02
Active:      [Pressed Effect]     Scale 0.98, darker, immediate
Disabled:    [Grayed Out]         50% opacity, no interaction
Loading:     [⟳ Searching...]     Spinner, disabled pointer
Success:     [✓ Applied]          Green flash, auto-revert 2s  
Error:       [⚠️ Try Again]       Red shake, haptic feedback
```

---

## Comprehensive Accessibility Specifications

### WCAG 2.1 AA Compliance Framework
```
Visual Design Requirements:
- Color contrast: 4.5:1 for normal text, 3:1 for large text
- Focus indicators: 2px solid, high contrast borders  
- Text scaling: Support up to 200% zoom without horizontal scroll
- Motion control: Respect prefers-reduced-motion settings

Keyboard Navigation:
Tab Order: Logical, skip links available
- Header navigation → Search → Filters → Results → Actions
- Arrow keys: Grid navigation in results
- Escape: Close modals, clear focus
- Enter/Space: Activate buttons, select items

Screen Reader Support:  
- Semantic HTML: headers, nav, main, aside, article
- ARIA labels: All interactive elements described
- Live regions: Search results, filter changes, errors
- Alternative text: All images, icons have descriptions
```

### Component Accessibility Specifications

#### SearchBar Component
```typescript
interface SearchBarA11y {
  role: "searchbox"
  ariaLabel: "Search for talent by name, skill, or location"  
  ariaDescribedBy: "search-help search-results-count"
  ariaExpanded: boolean // for dropdown state
  ariaAutocomplete: "list"
  ariaControls: "search-results"
  
  // Keyboard behavior
  onEnter: () => void // Submit search
  onEscape: () => void // Clear and collapse  
  onArrowDown: () => void // Navigate suggestions
  onArrowUp: () => void // Navigate suggestions
}

States:
- Default: "Search input, type to begin"
- Loading: "Searching, please wait" 
- Results: "Search completed, 247 results found"
- Error: "Search failed, please try again"
- NoResults: "No results found, try different keywords"
```

#### FilterPanel Component
```typescript
interface FilterPanelA11y {
  role: "region"
  ariaLabel: "Search filters"
  ariaExpanded: boolean // mobile collapsed state
  
  fieldset: {
    legend: string // "Category", "Location", etc.
    required?: boolean
    invalid?: boolean
  }
  
  // For range inputs
  ariaValueMin: number
  ariaValueMax: number  
  ariaValueNow: number
  ariaValueText: string // "$500 per day"
}

Filter Types:
- Checkbox: role="checkbox", aria-checked
- Radio: role="radio", aria-checked  
- Range: role="slider", aria-valuenow
- Combobox: role="combobox", aria-expanded
```

#### TalentCard Component
```typescript
interface TalentCardA11y {
  role: "article"
  ariaLabel: "Sarah Johnson, Actor from New York, 4.8 star rating"
  ariaDescribedBy: "profile-summary actions"
  
  headingLevel: 3 // H3 for card titles
  
  actions: {
    view: "View Sarah Johnson's full profile"
    shortlist: "Add Sarah Johnson to shortlist"  
    message: "Send message to Sarah Johnson"
    compare: "Add to comparison, currently 0 of 3 selected"
  }
  
  // Interactive states
  selected: boolean
  inShortlist: boolean
  inComparison: boolean
}
```

### Touch Target & Responsive Specifications
```
Minimum Sizes (WCAG 2.5.5):
- Touch targets: 44×44px minimum
- Spacing: 8px minimum between targets
- Thumb zones: Primary actions within 240px reach
- Safe areas: Respect iPhone notch, Android navigation

Responsive Breakpoints with A11y:
320px - 480px (Mobile Portrait):
  - Single column layout
  - Stacked navigation
  - Large touch targets (48×48px)
  - Simplified interactions

481px - 768px (Mobile Landscape/Small Tablet):  
  - Two column layout
  - Horizontal navigation
  - Standard touch targets (44×44px)
  - Enhanced gestures

769px - 1024px (Tablet):
  - Three column layout
  - Sidebar navigation  
  - Hover interactions appear
  - Keyboard shortcuts enabled

1025px+ (Desktop):
  - Full multi-column layout
  - Persistent navigation
  - Mouse interactions
  - Advanced keyboard shortcuts
```

## Enhanced Performance Metrics

### Core Web Vitals Targets
```
Loading Performance:
- Largest Contentful Paint (LCP): < 2.5s
- First Contentful Paint (FCP): < 1.8s  
- Time to Interactive (TTI): < 3.8s
- Cumulative Layout Shift (CLS): < 0.1

Interactivity Metrics:
- First Input Delay (FID): < 100ms
- Search initiation → Results: < 2s (< 1s target)
- Filter application: < 500ms (< 300ms target)
- Profile load: < 1s (< 800ms target)
- Shortlist operations: < 300ms (< 150ms target)

Accessibility Performance:
- Screen reader navigation: < 200ms delays
- Keyboard focus timing: < 100ms visual feedback
- Voice commands: < 500ms recognition/response
```

### Progressive Enhancement Strategy
```
Level 1 - Base Experience (No JS):
- Server-rendered HTML forms
- Standard form submissions  
- Essential functionality works
- Graceful degradation

Level 2 - Enhanced Experience (Basic JS):
- Client-side form validation
- AJAX form submissions
- Basic animations
- Progressive disclosure

Level 3 - Full Experience (Modern JS):
- Real-time search suggestions
- Advanced filtering
- Drag & drop interactions
- Rich animations & transitions

Level 4 - Premium Experience (PWA):
- Offline functionality
- Background sync
- Push notifications
- App-like interactions
```

### Mobile Optimizations & Performance
```
Network Adaptations:
- Slow 3G: Reduce image quality, minimal animations
- 4G: Standard quality, smooth animations
- WiFi: High quality, advanced features enabled
- Offline: Cached results, limited functionality

Battery Considerations:
- Reduce animation frame rates on low battery
- Throttle real-time updates
- Minimize location/GPS usage
- Optimize for dark mode power savings

Storage Management:
- Recent searches: 50 items max, 30 days retention
- Image cache: 100MB limit, LRU eviction  
- Profile cache: 500 profiles, 7 days retention
- Filter preferences: Persistent, cloud synced
```

---

## Implementation Notes

### Frontend Components Needed
1. `SearchBar` - Autocomplete with debouncing
2. `FilterPanel` - Collapsible with state management
3. `TalentCard` - Reusable across views
4. `ProfileView` - Tabbed content container
5. `ShortlistManager` - Drag & drop support

### API Endpoints Required
- `GET /api/talents/search` - Main search endpoint
- `GET /api/talents/:id` - Individual profile
- `POST /api/shortlists` - Create/update shortlist
- `GET /api/suggestions` - Search suggestions

### State Management
- Search filters in URL params for shareable searches
- Shortlist in local storage with cloud sync
- Recent searches in browser storage
- User preferences in profile settings

### Progressive Enhancement
1. **Basic**: Server-rendered HTML, form submissions
2. **Enhanced**: Client-side filtering, instant search
3. **Full**: Real-time updates, offline support