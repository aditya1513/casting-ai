# Project Initiation Wireframe Requirements

## Screen 1: Conversation Landing
**Purpose:** Entry point for project creation

### Layout Structure
```
┌─────────────────────────────────┐
│  Status Bar                     │
├─────────────────────────────────┤
│  CastMatch AI                   │
│  Project Setup Assistant    ⓘ   │
├─────────────────────────────────┤
│                                 │
│  AI Avatar Animation            │
│     (Welcoming gesture)         │
│                                 │
│  "I'll help you set up your    │
│   new casting project"          │
│                                 │
│  ┌───────────────────────────┐ │
│  │  🎙️ Tap to speak          │ │
│  └───────────────────────────┘ │
│                                 │
│  OR                             │
│                                 │
│  [Type your response]           │
│                                 │
├─────────────────────────────────┤
│  Progress: ○○○○○○ (Step 1/6)    │
└─────────────────────────────────┘
```

### Component Specifications

#### Voice Input Button
- **Size:** 64x64px
- **States:** Default, Recording, Processing
- **Behavior:** Hold to record, release to send
- **Visual Feedback:** Pulse animation while recording
- **Audio Feedback:** Start/stop sounds

#### Text Input Field
- **Height:** 48px
- **Placeholder:** "Tell me about your project..."
- **Auto-expand:** Up to 3 lines
- **Keyboard:** Dismiss on send

#### Progress Indicator
- **Type:** Stepped dots
- **Current Step:** Highlighted
- **Clickable:** Yes (jump to previous steps)

## Screen 2: Quick Selection Interface
**Purpose:** Structured input when specific choices needed

### Layout Structure
```
┌─────────────────────────────────┐
│  < Back    Project Type     ··· │
├─────────────────────────────────┤
│                                 │
│  "What type of project is      │
│   this?"                        │
│                                 │
│  ┌───────────────────────────┐ │
│  │  📺 OTT Series            │ │
│  ├───────────────────────────┤ │
│  │  🎬 Feature Film          │ │
│  ├───────────────────────────┤ │
│  │  💻 Web Series            │ │
│  ├───────────────────────────┤ │
│  │  📢 Commercial            │ │
│  ├───────────────────────────┤ │
│  │  ➕ Other                 │ │
│  └───────────────────────────┘ │
│                                 │
│  ─────── or ──────              │
│                                 │
│  [Describe in your own words]   │
│                                 │
├─────────────────────────────────┤
│  Progress: ●○○○○○ (Step 1/6)    │
└─────────────────────────────────┘
```

### Component Specifications

#### Selection Cards
- **Height:** 56px each
- **Padding:** 16px
- **Icon Size:** 24x24px
- **Typography:** 16px medium
- **States:** Default, Hover, Selected
- **Animation:** Slide in from right

#### Alternative Input
- **Always visible:** Below options
- **Behavior:** Selecting dismisses cards

## Screen 3: Role Definition Interface
**Purpose:** Capture role requirements

### Layout Structure
```
┌─────────────────────────────────┐
│  < Back    Define Roles     ··· │
├─────────────────────────────────┤
│  "Let's define the key roles"  │
│                                 │
│  ┌───────────────────────────┐ │
│  │ Role 1: Male Lead          │ │
│  │ Age: 25-35                 │ │
│  │ Traits: Intense, urban     │ │
│  │ [Edit] [Duplicate] [Delete]│ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ Role 2: Female Lead        │ │
│  │ Age: 22-30                 │ │
│  │ Traits: Modern, confident  │ │
│  │ [Edit] [Duplicate] [Delete]│ │
│  └───────────────────────────┘ │
│                                 │
│  [+ Add Another Role]           │
│                                 │
│  [📎 Upload Character Breakdown]│
│                                 │
├─────────────────────────────────┤
│  [Continue] (2 roles defined)   │
├─────────────────────────────────┤
│  Progress: ●●●○○○ (Step 3/6)    │
└─────────────────────────────────┘
```

### Component Specifications

#### Role Cards
- **Expandable:** Tap to show full details
- **Draggable:** Reorder priority
- **Quick Actions:** Inline buttons
- **Visual Hierarchy:** Primary roles larger

#### Add Role Methods
- Voice description
- Manual form
- Upload document
- Copy from template

## Screen 4: Team Configuration
**Purpose:** Add team members and permissions

### Layout Structure
```
┌─────────────────────────────────┐
│  < Back    Team Setup       ··· │
├─────────────────────────────────┤
│  "Who's working on casting?"   │
│                                 │
│  ┌───────────────────────────┐ │
│  │ 👤 You                     │ │
│  │ Casting Director           │ │
│  │ ✓ All permissions          │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ ➕ Add Team Member         │ │
│  └───────────────────────────┘ │
│                                 │
│  Quick Add:                     │
│  [Director] [Producer] [AD]     │
│                                 │
│  Communication:                 │
│  ☑ WhatsApp Group              │
│  ☑ Email Updates               │
│  ☐ SMS for Urgent              │
│                                 │
├─────────────────────────────────┤
│  [Continue]                     │
├─────────────────────────────────┤
│  Progress: ●●●●○○ (Step 4/6)    │
└─────────────────────────────────┘
```

### Component Specifications

#### Team Member Cards
- **Photo:** 48x48px avatar
- **Info:** Name, role, permissions
- **Actions:** Edit, Remove
- **Status:** Pending/Active

#### Permission Matrix
- View content
- Edit content  
- Approve decisions
- Manage budget
- Schedule auditions

## Screen 5: Budget & Constraints
**Purpose:** Set financial and logistical parameters

### Layout Structure
```
┌─────────────────────────────────┐
│  < Back    Budget Setup     🔒  │
├─────────────────────────────────┤
│  "Budget helps me suggest       │
│   appropriate talent"           │
│                                 │
│  Total Budget Range:            │
│  ┌───────────────────────────┐ │
│  │ ₹ [Min] - ₹ [Max]         │ │
│  └───────────────────────────┘ │
│                                 │
│  [Set per role] [Flexible]      │
│  [Skip for now]                 │
│                                 │
│  Production Constraints:        │
│  Location: [Mumbai ▼]           │
│  Languages: [Hindi, English]    │
│  Union: [Any ▼]                 │
│                                 │
│  Shooting Window:               │
│  [📅 March - May 2025]          │
│                                 │
├─────────────────────────────────┤
│  [Continue]                     │
├─────────────────────────────────┤
│  Progress: ●●●●●○ (Step 5/6)    │
└─────────────────────────────────┘
```

### Component Specifications

#### Budget Input
- **Privacy:** Masked input option
- **Format:** Indian number system
- **Validation:** Logical ranges
- **Optional:** Can skip

#### Constraint Chips
- **Multi-select:** For languages
- **Single-select:** For location
- **Date picker:** For timeline
- **Smart defaults:** Based on project type

## Screen 6: Project Summary
**Purpose:** Review and confirm setup

### Layout Structure
```
┌─────────────────────────────────┐
│  < Back    Review & Start   ✓   │
├─────────────────────────────────┤
│  PROJECT READY TO LAUNCH        │
│                                 │
│  📽️ Mumbai Dreams              │
│  OTT Series | Netflix           │
│  Dharma Productions             │
│                                 │
│  👥 3 Primary, 5 Supporting     │
│  📅 Shooting: March 2025        │
│  📍 Mumbai                      │
│  💰 Within budget range         │
│                                 │
│  Team (4):                      │
│  You, Raj (Dir), Priya (AD),    │
│  Vikram (Prod)                  │
│                                 │
│  ┌───────────────────────────┐ │
│  │  ✅ Start Casting          │ │
│  └───────────────────────────┘ │
│                                 │
│  What would you like to do      │
│  first?                         │
│  • Find male lead               │
│  • Schedule auditions           │
│  • Review similar castings      │
│                                 │
├─────────────────────────────────┤
│  Progress: ●●●●●● Complete!     │
└─────────────────────────────────┘
```

### Component Specifications

#### Summary Sections
- **Collapsible:** For detailed view
- **Editable:** Quick edit icons
- **Visual:** Icons for quick scanning

#### Call-to-Action
- **Primary:** Start Casting (full width)
- **Secondary:** Suggested next steps
- **Save Options:** Draft, Template

## Responsive Breakpoints

### Mobile (320px - 768px)
- Single column layout
- Full-width components
- Bottom sheet for options
- Swipe gestures enabled

### Tablet (768px - 1024px)
- Two-column for role cards
- Side panel for team
- Floating action buttons

### Desktop (1024px+)
- Three-column dashboard
- Persistent navigation
- Keyboard shortcuts
- Multi-window support

## Interaction Patterns

### Voice Input
- **Trigger:** Tap or "Hey CastMatch"
- **Feedback:** Visual waveform
- **Processing:** Show transcription
- **Error:** Offer retry or type

### Progressive Disclosure
- Start with minimal fields
- Expand based on input
- Show advanced options on request
- Remember preferences

### Auto-Save
- Every 30 seconds
- On step completion
- Before navigation
- Visual confirmation

### Validation
- Inline as user types
- Friendly error messages
- Suggest corrections
- Allow "incomplete" progress

## Accessibility Requirements

### Screen Reader Support
- All elements labeled
- Navigation landmarks
- Status announcements
- Form validation alerts

### Keyboard Navigation
- Tab order logical
- Skip links available
- Shortcuts documented
- Focus indicators clear

### Visual Accessibility
- High contrast mode
- Text scalable to 200%
- Color not sole indicator
- Motion reduction option

## Performance Targets

### Load Times
- Initial render: <1s
- Step transition: <300ms
- Voice response: <200ms
- Auto-complete: <100ms

### Offline Capability
- Cache form progress
- Queue API calls
- Sync when connected
- Clear status indicators