# Component Library Patterns - Premium UI Standards

## Executive Summary
This document catalogs reusable component patterns extracted from 20 premium UI inspiration images, providing comprehensive specifications for CastMatch AI's design system. Each component includes structure, variants, states, and implementation guidelines optimized for conversational casting workflows.

## Foundation Components

### 1. Button Components

#### Primary Button
**Structure & Specifications:**
```
Base Dimensions: 48px height × variable width
Padding: 16-24px horizontal, 12px vertical
Border Radius: 8-12px
Typography: 16px medium weight
Minimum Width: 120px
```

**Visual States:**
- **Default:** Brand color background, white text, 0px shadow
- **Hover:** 10% darker background, 2px shadow elevation
- **Active:** 0.98x scale, 1px shadow (pressed effect)
- **Disabled:** 40% opacity, no interactions
- **Loading:** Spinner replaces text, maintains dimensions

**Variants Observed:**
- **Solid:** Full background color (primary actions)
- **Outline:** 2px border, transparent background (secondary actions)
- **Ghost:** No background or border, colored text only (tertiary)
- **Icon + Text:** 8px gap between icon and label
- **Icon Only:** 48px square for compact spaces

#### Secondary Button Standards
**Hierarchy Differentiation:**
- **Height:** 40px (vs 48px primary)
- **Border:** 1-2px solid brand color
- **Background:** Transparent or subtle brand color (5% opacity)
- **Typography:** Same size as primary but regular weight
- **States:** More subtle hover effects than primary

### 2. Input Components

#### Text Input Fields
**Base Specifications:**
```
Height: 48px (thumb-friendly)
Padding: 12-16px horizontal, 12-14px vertical
Border: 1px solid #E5E7EB
Border Radius: 8px
Typography: 16px regular (prevents zoom on iOS)
```

**State Management:**
- **Default:** Light border, placeholder text in gray
- **Focus:** 2px brand color outline, border color change
- **Valid:** Green border with checkmark icon
- **Invalid:** Red border with error icon and message
- **Disabled:** Gray background, reduced opacity
- **Loading:** Spinner indicator inside field

**Input Variants:**
- **Text:** Standard single-line input
- **Email:** Email keyboard on mobile, validation styling
- **Password:** Eye icon toggle for visibility
- **Search:** Magnifying glass icon, clear button when active
- **Textarea:** Multi-line with resize handle

#### Label and Helper Text Patterns
**Label Structure:**
- **Position:** Above input with 8px gap
- **Typography:** 14px medium weight, dark gray color
- **Required Indicator:** Red asterisk (*) after label text
- **Optional Indicator:** "(optional)" in lighter gray

**Helper Text Integration:**
- **Description:** Below input, 4px gap, 12px light gray text
- **Error Message:** Below input, 4px gap, 12px red text with icon
- **Character Count:** Right-aligned, updates in real-time
- **Success Message:** Green text with checkmark icon

### 3. Navigation Components

#### Top Navigation Bar
**Structure Specifications:**
```
Height: 64-72px
Background: White (light theme) or #1F2937 (dark theme)
Border Bottom: 1px solid #E5E7EB
Padding: 0 16-24px
```

**Content Layout:**
- **Logo Area:** Left-aligned, 32px height maximum
- **Navigation Menu:** Center or left after logo
- **User Actions:** Right-aligned (profile, notifications, settings)
- **Search:** Expandable search bar or icon trigger
- **Mobile:** Hamburger menu for collapsed navigation

**Responsive Behavior:**
- **Desktop:** Full horizontal menu with hover states
- **Tablet:** Condensed menu with some items in dropdown
- **Mobile:** Hamburger menu with slide-out drawer

#### Sidebar Navigation
**Sidebar Specifications:**
```
Width: 240-280px (expanded), 56px (collapsed)
Background: #F8F9FA (light) or #111827 (dark)
Border Right: 1px solid #E5E7EB
Height: 100vh (full height)
```

**Navigation Item Structure:**
- **Icon:** 20px square, left-aligned with 12px left margin
- **Label:** 14px medium weight, 8px gap from icon
- **Badge:** Right-aligned notification count
- **Active State:** Left border accent, background highlight
- **Hover State:** Subtle background color change

**Hierarchical Organization:**
- **Section Headers:** 12px caps text, subtle gray color
- **Primary Items:** Full icon + text with hover/active states
- **Sub-items:** Indented 16px, smaller icons, lighter text
- **Dividers:** 1px line with 16px margins top/bottom

### 4. Card Components

#### Standard Card Structure
**Base Card Specifications:**
```
Border Radius: 12px
Background: White (light) or #1F2937 (dark)
Border: 1px solid #E5E7EB
Shadow: 0 2px 8px rgba(0,0,0,0.1)
Padding: 16-24px
```

**Card Anatomy:**
- **Header:** Icon + Title + Action button (optional)
- **Content:** Main information with proper spacing
- **Footer:** Metadata, timestamps, or secondary actions
- **Image Area:** Optional hero image with 12px radius

**Card Variants:**
- **Compact:** 16px padding, minimal content
- **Standard:** 20px padding, balanced content/spacing
- **Expanded:** 24px padding, rich content with images
- **Interactive:** Hover effects, click feedback, cursor pointer

#### Specialized Card Types

**Profile Card (for Actor Profiles):**
```
Dimensions: 280px width × 320px height
Image Area: Full width × 180px height
Content Area: 16px padding
Action Area: Bottom with buttons
```

**Project Card (for Casting Projects):**
```
Dimensions: 320px width × 240px height
Header: Project name + status indicator
Content: Key metrics, progress bars
Footer: Team members, last updated
```

**Notification Card:**
```
Dimensions: 400px width × variable height
Icon Area: Left-aligned with type indicator
Content: Title + description + timestamp
Actions: Dismiss button, primary action
```

### 5. Modal and Overlay Components

#### Modal Dialog Structure
**Modal Specifications:**
```
Max Width: 600px (desktop), 90vw (mobile)
Background: White with rounded corners (12px)
Shadow: 0 20px 60px rgba(0,0,0,0.3)
Backdrop: rgba(0,0,0,0.4) semi-transparent
```

**Modal Content Areas:**
- **Header:** Title + close button (X), 24px padding
- **Content:** Main modal content, 24px side padding
- **Footer:** Action buttons, right-aligned, 24px padding
- **Dividers:** 1px lines between sections

**Modal Behavior:**
- **Entrance:** 0.3s fade-in with scale from 0.9x to 1x
- **Exit:** 0.2s fade-out with scale to 0.9x
- **Focus Management:** Tab trap, return focus to trigger
- **Mobile:** Full-screen on small screens, slide up animation

#### Dropdown Menu Components
**Dropdown Specifications:**
```
Background: White with 12px border radius
Border: 1px solid #E5E7EB
Shadow: 0 8px 32px rgba(0,0,0,0.15)
Max Height: 300px with scrolling
Min Width: Match trigger width
```

**Menu Item Structure:**
- **Height:** 40px per item
- **Padding:** 12px horizontal, 8px vertical
- **Typography:** 14px regular weight
- **Hover State:** Light background highlight
- **Icon Support:** 16px icons with 8px right margin
- **Keyboard Navigation:** Arrow keys and Enter support

### 6. Form Components

#### Form Layout Patterns
**Form Structure:**
- **Field Groups:** Related fields grouped with 24px spacing
- **Field Spacing:** 16px between individual fields
- **Section Breaks:** 32px between major form sections
- **Submit Area:** Separated by 24px margin, right-aligned buttons

**Validation Patterns:**
- **Real-time:** Validate on blur or with debounced input
- **Inline Messages:** Below each field with 4px gap
- **Form-level:** Summary at top for multiple errors
- **Success States:** Green indicators for completed sections

#### Specialized Input Types

**File Upload Component:**
```
Structure: Drag & drop zone with browse button
Dimensions: 300px × 200px minimum
States: Default, drag-over, uploading, complete, error
Progress: Linear progress bar for upload status
```

**Date/Time Picker:**
```
Trigger: Input field with calendar icon
Overlay: Calendar widget with month/year navigation
Time Selection: Clock interface or time dropdowns
Format: Localized based on user preferences
```

**Multi-Select Component:**
```
Display: Tags for selected items with X close buttons
Dropdown: Searchable list with checkboxes
Keyboard: Type to filter, arrow keys to navigate
Bulk Actions: Select all, clear all options
```

### 7. Data Display Components

#### Table Components
**Table Structure:**
```
Header: Sticky header with sorting indicators
Row Height: 56px for comfortable touch targets
Padding: 16px cell padding horizontally
Borders: 1px bottom border on each row
```

**Table Features:**
- **Sorting:** Click headers with arrow indicators
- **Selection:** Checkbox column with select all
- **Pagination:** Bottom controls with page numbers
- **Responsive:** Horizontal scroll or card layout on mobile
- **Empty States:** Centered message with illustration

#### List Components
**List Item Specifications:**
```
Height: 56-72px depending on content density
Padding: 12-16px horizontal, 8-12px vertical
Layout: Avatar/Icon + Content + Action
Dividers: 1px lines between items (optional)
```

**List Variants:**
- **Simple:** Text only with minimal styling
- **Two-line:** Primary text + secondary metadata
- **Avatar:** Profile image + name + description
- **Action:** List item with right-aligned button/icon
- **Complex:** Rich content with multiple data points

### 8. Feedback Components

#### Toast Notifications
**Toast Specifications:**
```
Width: 400px maximum
Position: Fixed, top-right corner (desktop)
Background: White with colored left border
Shadow: 0 4px 16px rgba(0,0,0,0.15)
Duration: 5 seconds default, persistent for errors
```

**Toast Types:**
- **Success:** Green left border, checkmark icon
- **Error:** Red left border, warning icon
- **Warning:** Orange left border, caution icon
- **Info:** Blue left border, info icon
- **Loading:** No auto-dismiss, spinner icon

#### Progress Indicators
**Progress Bar Component:**
```
Height: 4-8px
Background: Light gray (#F3F4F6)
Fill: Brand color with smooth animation
Border Radius: Full (pill shape)
```

**Loading Spinner:**
```
Size: 24px (small), 32px (medium), 48px (large)
Animation: 1s rotation, infinite loop
Color: Brand color or contextual
Thickness: 2-3px stroke width
```

### 9. Media Components

#### Image Component Patterns
**Image Container:**
```
Border Radius: 8px for thumbnails, 12px for larger images
Aspect Ratios: 16:9 (landscape), 4:3 (standard), 1:1 (square)
Loading State: Skeleton placeholder matching dimensions
Error State: Gray placeholder with broken image icon
```

**Image Optimization:**
- **Lazy Loading:** Images load as they enter viewport
- **Responsive:** Multiple sizes based on screen density
- **Format Support:** WebP with fallback to JPG/PNG
- **Alt Text:** Descriptive text for accessibility

#### Avatar Components
**Avatar Specifications:**
```
Sizes: 24px (tiny), 32px (small), 48px (medium), 64px (large)
Shape: Circular (50% border radius)
Fallback: Initials on colored background
Border: Optional 2px white border for layering
```

**Avatar Groups:**
```
Stacking: Overlapping avatars with negative margin
Max Display: 3-4 avatars + count indicator
Hover: Individual avatar highlights on hover
```

## Advanced Component Patterns

### 10. Conversational Interface Components

#### Chat Message Bubbles
**Message Structure:**
```
Max Width: 70% of container width
Padding: 12-16px
Border Radius: 16px (rounded rectangle)
Tail: Optional pointer to indicate speaker
```

**Message Types:**
- **User Messages:** Right-aligned, brand color background
- **AI Messages:** Left-aligned, light gray background
- **System Messages:** Center-aligned, minimal styling
- **Typing Indicator:** Three-dot animation in AI bubble

#### Voice Input Component
**Microphone Button:**
```
Size: 56px diameter (large touch target)
Background: Brand color with white microphone icon
States: Idle, recording (pulsing animation), processing
Position: Prominent placement in chat interface
```

**Voice Feedback:**
```
Visual: Waveform animation during recording
Audio: Start/stop sound cues
Transcript: Real-time text display of speech recognition
Error: Clear messaging for permission or processing issues
```

### 11. Mobile-Specific Components

#### Bottom Sheet Component
**Sheet Structure:**
```
Background: White with top rounded corners (20px)
Handle: Gray pill indicator for drag interaction
Content: Scrollable area with proper padding
Backdrop: Semi-transparent overlay
```

**Sheet Behavior:**
- **Peek State:** Partially visible with key information
- **Expanded State:** Full height with complete content
- **Swipe Gesture:** Drag to expand/collapse/dismiss
- **Snap Points:** Defined positions for sheet to rest

#### Floating Action Button
**FAB Specifications:**
```
Size: 56px diameter (standard), 40px (mini)
Position: Bottom-right, 16px from edges
Background: Brand color with white icon
Shadow: 6px elevation for prominence
```

**FAB Behavior:**
- **Scroll Hide:** Hides on scroll down, shows on scroll up
- **Context Change:** Icon changes based on current view
- **Extended:** Can expand to show text label
- **Multiple Actions:** Speed dial pattern for sub-actions

## Component State Management

### Universal State Patterns
**Interactive States (All Components):**
- **Default:** Base appearance
- **Hover:** Subtle feedback (desktop only)
- **Focus:** Keyboard accessibility indicator
- **Active:** Pressed/engaged feedback
- **Disabled:** Reduced opacity, no interactions

**Loading States:**
- **Skeleton:** Placeholder showing content structure
- **Spinner:** Circular indicator for indeterminate loading
- **Progress:** Linear indicator for determinate loading
- **Shimmer:** Animated placeholder for premium feel

### Error State Patterns
**Error Display Hierarchy:**
- **Inline:** Field-level errors with icons and messages
- **Section:** Group-level errors with summary
- **Page:** Full-page errors with recovery actions
- **Toast:** System-level errors with notifications

## Responsive Component Behavior

### Breakpoint Adaptations
**Mobile First Approach:**
- **320-767px:** Base mobile styles, full-width components
- **768-1023px:** Tablet adaptations, sidebar reveals
- **1024px+:** Desktop enhancements, multi-column layouts

**Component Responsive Patterns:**
- **Stack to Row:** Mobile vertical, desktop horizontal
- **Hide/Show:** Non-essential elements hidden on mobile
- **Size Scaling:** Touch targets larger on mobile
- **Navigation:** Drawer on mobile, sidebar on desktop

## Performance Optimization

### Component Loading Strategies
**Critical Components:** Load immediately (buttons, inputs, navigation)
**Above Fold:** Priority loading for visible components
**Below Fold:** Lazy load as needed
**Heavy Components:** Code splitting and dynamic imports

### Animation Performance
**GPU Accelerated:** Use transform and opacity for smooth animations
**Frame Budget:** 16ms per frame for 60fps
**Reduced Motion:** Respect user preference for minimal animations
**Battery Awareness:** Reduce animations on low battery

---

**Component Library Status:** Complete ✅  
**Components Documented:** 50+ reusable patterns with specifications  
**State Coverage:** All interactive states and loading patterns defined  
**Responsive Design:** Mobile-first approach with breakpoint adaptations  
**Performance:** Optimization guidelines for smooth interactions