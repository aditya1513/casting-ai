# Navigation Structure & Information Architecture

## Overview
Complete navigation hierarchy and information architecture for the CastMatch platform, optimized for different user roles and devices.

---

## Global Navigation Hierarchy

```
CastMatch Platform
│
├── Public Pages (Unauthenticated)
│   ├── Landing Page
│   ├── How It Works
│   ├── Pricing
│   ├── Success Stories
│   ├── Sign Up
│   ├── Login
│   └── Support
│       ├── Help Center
│       ├── FAQs
│       └── Contact
│
└── Authenticated Experience
    ├── Casting Director Portal
    ├── Talent Portal
    ├── Agent Portal
    └── Admin Dashboard
```

---

## 1. Casting Director Navigation Structure

### Primary Navigation
```
Dashboard
├── Overview (default landing)
│   ├── Today's Schedule
│   ├── Active Projects Summary
│   ├── Recent Activity Feed
│   └── Quick Actions Panel
│
├── Projects
│   ├── All Projects
│   │   ├── Active
│   │   ├── Upcoming
│   │   ├── Completed
│   │   └── Archived
│   ├── Create New Project
│   ├── Project Templates
│   └── Project Details (/:id)
│       ├── Overview
│       ├── Roles & Requirements
│       ├── Timeline
│       ├── Team Members
│       ├── Budget
│       └── Documents
│
├── Talent Discovery
│   ├── Search Talent
│   │   ├── Quick Search
│   │   ├── Advanced Search
│   │   └── Saved Searches
│   ├── Browse Categories
│   │   ├── Actors
│   │   ├── Models
│   │   ├── Musicians
│   │   ├── Dancers
│   │   └── Voice Artists
│   ├── Talent Pools
│   └── Recommendations
│
├── Auditions
│   ├── Calendar View
│   │   ├── Day
│   │   ├── Week
│   │   └── Month
│   ├── Schedule Audition
│   ├── Room Management
│   ├── Audition History
│   └── Evaluation Forms
│
├── Pipeline
│   ├── Applications
│   │   ├── New
│   │   ├── Under Review
│   │   └── Rejected
│   ├── Shortlisted
│   ├── Callbacks
│   ├── Final Selections
│   └── Contracts
│
├── Analytics
│   ├── Dashboard
│   ├── Project Reports
│   ├── Talent Insights
│   ├── Time Metrics
│   └── Export Data
│
└── Settings
    ├── Profile
    ├── Company Info
    ├── Team Management
    ├── Notifications
    ├── Billing
    └── API Access
```

### Mobile Navigation (Bottom Tab Bar)
```
┌─────────────────────────────────┐
│         Main Content            │
├─────┬─────┬─────┬─────┬────────┤
│ 🏠  │ 🔍  │ 📅  │ 📊  │ ⚙️    │
│Home │Find │Cal. │Stats│More    │
└─────┴─────┴─────┴─────┴────────┘

More Menu:
├── Projects
├── Pipeline
├── Messages
├── Settings
└── Logout
```

### Desktop Navigation (Horizontal + Sidebar)
```
┌──────────────────────────────────────────────────────┐
│ Logo  Dashboard  Projects  Talent  Auditions    👤▼ │ <- Top bar
├───────────┬──────────────────────────────────────────┤
│ PROJECTS  │                                          │
│ Active(3) │         Main Content Area                │
│ Upcoming  │                                          │
│ Templates │                                          │
│           │                                          │
│ PIPELINE  │                                          │
│ New (47)  │                                          │ <- Sidebar
│ Review    │                                          │
│ Shortlist │                                          │
│           │                                          │
│ QUICK     │                                          │
│ + Project │                                          │
│ 🔍 Search │                                          │
│ 📅 Book   │                                          │
└───────────┴──────────────────────────────────────────┘
```

---

## 2. Talent/Actor Navigation Structure

### Primary Navigation
```
Dashboard
├── My Profile
│   ├── Overview
│   ├── Edit Profile
│   ├── Media Gallery
│   │   ├── Headshots
│   │   ├── Demo Reels
│   │   └── Audio Samples
│   ├── Resume/CV
│   ├── Skills & Attributes
│   └── Availability Calendar
│
├── Opportunities
│   ├── Browse All
│   │   ├── Recommended
│   │   ├── New Listings
│   │   ├── Closing Soon
│   │   └── By Category
│   ├── Saved Opportunities
│   ├── Search & Filters
│   └── Alerts & Preferences
│
├── Applications
│   ├── Active Applications
│   │   ├── Submitted
│   │   ├── Under Review
│   │   └── Shortlisted
│   ├── Drafts
│   ├── Archived
│   └── Application History
│
├── Bookings
│   ├── Upcoming
│   ├── Current
│   ├── Completed
│   └── Contracts
│
├── Messages
│   ├── Inbox
│   ├── Sent
│   ├── Casting Directors
│   └── Agents
│
└── Resources
    ├── Industry Tips
    ├── Preparation Guides
    ├── Workshops
    └── Community Forum
```

### Mobile Navigation (Tab Bar)
```
┌─────────────────────────────────┐
│         Main Content            │
├─────┬─────┬─────┬─────┬────────┤
│ 🏠  │ 🎯  │ 📝  │ 💬  │ 👤    │
│Home │Jobs │Apps │Msgs │Profile │
└─────┴─────┴─────┴─────┴────────┘
```

---

## 3. Agent Navigation Structure

### Primary Navigation
```
Dashboard
├── Client Management
│   ├── Roster Overview
│   ├── Client Profiles
│   ├── Add New Client
│   └── Performance Metrics
│
├── Opportunity Matching
│   ├── AI Recommendations
│   ├── Manual Search
│   ├── Bulk Submissions
│   └── Match History
│
├── Submissions Tracker
│   ├── Active Submissions
│   ├── Response Pending
│   ├── Callbacks Scheduled
│   └── Bookings Confirmed
│
├── Calendar & Scheduling
│   ├── Master Calendar
│   ├── Client Availability
│   ├── Conflict Resolution
│   └── Sync Settings
│
├── Negotiations
│   ├── Active Deals
│   ├── Contract Templates
│   ├── Rate Calculator
│   └── Deal History
│
└── Reports
    ├── Client Performance
    ├── Booking Statistics
    ├── Revenue Analytics
    └── Commission Tracking
```

---

## 4. Navigation Patterns by Device

### Mobile Navigation Patterns

#### Bottom Tab Bar (Primary)
```
┌─────────────────────────────────┐
│                                 │
│         Content Area            │
│                                 │
├─────┬─────┬─────┬─────┬────────┤
│ Tab │ Tab │ Tab │ Tab │ Tab    │
│  1  │  2  │  3  │  4  │  5     │
└─────┴─────┴─────┴─────┴────────┘

Characteristics:
- Max 5 items
- Always visible
- Direct access
- Icon + label
```

#### Hamburger Menu (Secondary)
```
┌─────────────────────────────────┐
│ ☰  Page Title            🔍 👤 │
├─────────────────────────────────┤
│                                 │
│         Content                 │
│                                 │
└─────────────────────────────────┘

Drawer Menu:
├── Menu Item 1
├── Menu Item 2
├── Menu Item 3
└── Settings
```

#### Tab Strips (Content Navigation)
```
┌─────────────────────────────────┐
│ [Tab 1] [Tab 2] [Tab 3]        │ <- Scrollable
├─────────────────────────────────┤
│                                 │
│     Tab Content Area            │
│                                 │
└─────────────────────────────────┘
```

### Tablet Navigation Patterns

#### Split Navigation
```
┌──────────┬───────────────────────┐
│ Sidebar  │                       │
│          │    Content Area       │
│ Nav Item │                       │
│ Nav Item │                       │
│ Nav Item │                       │
└──────────┴───────────────────────┘

Characteristics:
- Collapsible sidebar
- 250px width
- Icon + text labels
```

### Desktop Navigation Patterns

#### Top Bar + Sidebar Combo
```
┌────────────────────────────────────┐
│ Logo  Nav1  Nav2  Nav3      User  │
├──────────┬─────────────────────────┤
│          │                         │
│ Sidebar  │     Content Area        │
│          │                         │
└──────────┴─────────────────────────┘
```

#### Mega Menu (For Complex Navigation)
```
┌────────────────────────────────────┐
│ Nav Item ▼                         │
├────────────────────────────────────┤
│ ┌──────┬──────┬──────┬──────────┐│
│ │ Col1 │ Col2 │ Col3 │ Featured  ││
│ │      │      │      │           ││
│ │ • Sub│ • Sub│ • Sub│ [Promo]   ││
│ │ • Sub│ • Sub│ • Sub│           ││
│ └──────┴──────┴──────┴──────────┘│
└────────────────────────────────────┘
```

---

## 5. Breadcrumb Navigation

### Structure
```
Home > Projects > Summer Campaign > Roles > Lead Actor

Implementation:
- Always show full path
- Last item not clickable
- Truncate on mobile with "..."
- Max depth: 5 levels
```

### Mobile Breadcrumb
```
← Back to Roles  (simplified)
or
Home > ... > Lead Actor
```

### Desktop Breadcrumb
```
🏠 Home > 📁 Projects > Summer Campaign 2024 > Roles > Lead Actor
```

---

## 6. Search Navigation

### Global Search Structure
```
Search Interface
├── Quick Search (Omnisearch)
│   ├── Talents
│   ├── Projects
│   ├── Messages
│   └── Documents
│
├── Advanced Search
│   ├── Filters Panel
│   ├── Saved Searches
│   └── Search History
│
└── Results Display
    ├── Grid View
    ├── List View
    └── Map View (location-based)
```

### Search Bar States
```
Default:     [🔍 Search anything...]
Focused:     [🔍 |                 ]
Typing:      [🔍 acto|             ]
Loading:     [⟳ Searching...       ]
Results:     [🔍 actor (247) ✕     ]
```

---

## 7. Contextual Navigation

### Wizard/Step Navigation
```
Step 1 ——●—— Step 2 ——○—— Step 3 ——○—— Complete

or

[1. Basics] → [2. Details] → [3. Review] → [✓]
    ✓            Active        Pending
```

### Tab Navigation Within Pages
```
┌──────────────────────────────────────┐
│ Overview │ Roles │ Timeline │ Team   │
├──────────────────────────────────────┤
│                                      │
│         Tab Content                  │
│                                      │
└──────────────────────────────────────┘
```

### Pagination
```
Desktop: [←] [1] [2] [3] ... [24] [25] [→]
Mobile:  [← Previous] Page 2 of 25 [Next →]
```

---

## 8. Navigation Accessibility

### Keyboard Navigation Map
```
Tab Order:
1. Skip to main content
2. Logo/Home
3. Main navigation items
4. Search
5. User menu
6. Main content area
7. Sidebar (if present)
8. Footer links

Shortcuts:
- / : Focus search
- G then H : Go home
- G then P : Go to projects
- ? : Show help
- Esc : Close modal/drawer
```

### ARIA Landmarks
```
<nav role="navigation" aria-label="Main">
<nav role="navigation" aria-label="Breadcrumb">
<main role="main">
<aside role="complementary">
<footer role="contentinfo">
```

---

## 9. Navigation States & Feedback

### Visual States
```
Default:    [Nav Item]
Hover:      [Nav Item] <- Highlighted
Active:     [Nav Item] <- Bold/Colored
Current:    [Nav Item] <- Underlined
Disabled:   [Nav Item] <- Grayed out
```

### Loading States
```
Instant:    < 100ms  - No indicator
Fast:       < 1s     - Cursor change
Normal:     < 3s     - Progress bar
Slow:       > 3s     - Skeleton screen
```

### Error States
```
404: Custom page with navigation back
Network: Offline message with retry
Permission: Access denied with options
```

---

## 10. Mobile Gestures & Navigation

### Supported Gestures
```
Swipe Right:    Back/Previous
Swipe Left:     Forward/Next
Swipe Down:     Refresh
Swipe Up:       Load more
Pinch:          Zoom (images)
Long Press:     Context menu
```

### Gesture Zones
```
┌─────────────────────────┐
│ ← Edge swipe (Back)     │
│                         │
│     Main tap area       │
│                         │
│ Bottom swipe (Nav) ↑    │
└─────────────────────────┘
```

---

## 11. Navigation Performance Metrics

### Target Metrics
```
Time to Interactive:     < 3s
First Navigation:        < 100ms
Route Change:           < 500ms
Search Results:         < 1s
Menu Open/Close:        < 200ms
```

### Navigation Analytics
```
Track:
- Most used paths
- Drop-off points
- Search terms
- Dead clicks
- Rage clicks
- Back button usage
```

---

## 12. Responsive Breakpoints

### Navigation Breakpoint Strategy
```
320px:  Mobile (Bottom tabs)
768px:  Tablet (Sidebar collapse)
1024px: Desktop (Full navigation)
1440px: Wide (Mega menus)
```

### Progressive Disclosure
```
Mobile:  Show 5 items + "More"
Tablet:  Show 8 items + "More"
Desktop: Show all items
```

---

## 13. Navigation Priority Matrix

### Primary Actions (Always Visible)
1. Dashboard/Home
2. Core Function (varies by role)
3. Messages/Notifications
4. Profile/Settings

### Secondary Actions (One Click Away)
1. Search
2. Help
3. Recent Items
4. Quick Actions

### Tertiary Actions (Discoverable)
1. Advanced Features
2. Admin Functions
3. Bulk Operations
4. Exports

---

## 14. Implementation Guidelines

### Navigation Best Practices
1. **Consistency**: Same navigation across all pages
2. **Clarity**: Clear labels, no jargon
3. **Efficiency**: Max 3 clicks to any page
4. **Flexibility**: Multiple paths to content
5. **Feedback**: Clear current location
6. **Recovery**: Easy to go back/undo

### Mobile-First Approach
1. Start with essential navigation
2. Progressive enhancement for larger screens
3. Touch-friendly targets (44x44px minimum)
4. Thumb-reachable zones
5. Gesture support where appropriate

### Performance Optimization
1. Lazy load menu content
2. Prefetch likely next pages
3. Cache navigation state
4. Minimize reflows
5. Use CSS transforms for animations

---

## 15. Future Navigation Enhancements

### Phase 1 (Current)
- Basic navigation structure
- Role-based menus
- Search functionality

### Phase 2 (3-6 months)
- Personalized shortcuts
- Recent items
- Smart suggestions

### Phase 3 (6-12 months)
- Voice navigation
- Gesture controls
- AI-powered routing

### Phase 4 (Future)
- AR navigation
- Predictive navigation
- Context-aware menus