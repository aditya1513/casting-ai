# CastMatch Chat UI Wireframe Specifications
**UX Wireframe Architect Deliverable**
*Created: 2025-09-04*

## EXECUTIVE WIREFRAME SUMMARY

Complete wireframe system for CastMatch chat interface covering 12 distinct message types, responsive breakpoints, and workflow-specific conversation patterns optimized for casting professional workflows.

## MESSAGE TYPE WIREFRAMES

### 1. STANDARD TEXT MESSAGES

#### User Message Wireframe
```
┌─────────────────────────────────────────────────────────────────┐
│                                                       [Avatar]   │
│  "I need to find a lead actress for our upcoming               │
│   romantic drama. Someone with classical training              │
│   and commercial appeal."                                      │
│                                           [12:34 PM] [Seen ✓]  │
└─────────────────────────────────────────────────────────────────┘
```

#### AI Response Message Wireframe
```
┌─────────────────────────────────────────────────────────────────┐
│ [AI Avatar]                                                     │
│  Based on your requirements, I've identified 8 actresses       │
│  with classical theater backgrounds and proven commercial      │
│  success. Here are the top 3 recommendations:                  │
│                                                                 │
│  [Talent Card Grid - See Section 3]                           │
│                                                                 │
│  [Actions: "Show More" "Refine Search" "Schedule Reviews"]     │
│  [12:35 PM] [Processing indicators]                           │
└─────────────────────────────────────────────────────────────────┘
```

#### System/Notification Message Wireframe
```
┌─────────────────────────────────────────────────────────────────┐
│                    [System Icon]                               │
│       Sarah (Producer) joined the conversation                 │
│                   [12:36 PM]                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 2. RICH MEDIA MESSAGES

#### Talent Profile Card (Inline) Wireframe
```
┌─────────────────────────────────────────────────────────────────┐
│ [AI Avatar]                                                     │
│  Here's a detailed look at Priya Sharma:                       │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ [Headshot]  │  Priya Sharma                              │ │
│  │  200x280    │  Age: 28 | Experience: 8 years             │ │
│  │             │  Theater: NFDC, Prithvi                    │ │
│  │             │  Notable: "Dangal", "Queen"                │ │
│  │             │                                             │ │
│  │             │  [View Reel] [Schedule] [Add to List]       │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                           [12:37 PM]            │
└─────────────────────────────────────────────────────────────────┘
```

#### Video Reel Preview Wireframe
```
┌─────────────────────────────────────────────────────────────────┐
│ [User Avatar]                                         [Avatar]   │
│  "Let's review Priya's reel from her latest film"              │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                                                           │ │
│  │         [Video Player - 16:9 Aspect Ratio]                │ │
│  │              1920x1080 → Responsive                       │ │
│  │                                                           │ │
│  │  [Play ▶] [00:00 / 03:24] [Volume] [Fullscreen]          │ │
│  └───────────────────────────────────────────────────────────┘ │
│  "Priya Sharma - Scene from 'Mumbai Dreams' (2024)"           │
│                                           [12:38 PM] [Seen ✓]  │
└─────────────────────────────────────────────────────────────────┘
```

### 3. COLLABORATIVE WORKFLOW MESSAGES

#### Multi-User Discussion Thread Wireframe
```
┌─────────────────────────────────────────────────────────────────┐
│ [Director] Raj Kumar                                  [Avatar]   │
│  "Priya looks perfect for the lead role. Thoughts?"            │
│                                           [12:40 PM]            │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ [Producer] Sarah Wilson                    [Avatar]      │   │
│   │  "Agreed on talent, but need to discuss budget         │   │
│   │   implications. Her rate is ₹2.5Cr per film."         │   │
│   │                                     [12:41 PM]          │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ [Casting Dir] Meera Patel              [Avatar]         │   │
│   │  "I can negotiate. She's very interested in           │   │
│   │   this script. Might accept ₹2Cr + profit share."     │   │
│   │                                     [12:42 PM]          │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│ [Actions: "Reply to Thread" "Schedule Team Meeting"]           │
└─────────────────────────────────────────────────────────────────┘
```

#### Action-Oriented Message Wireframe
```
┌─────────────────────────────────────────────────────────────────┐
│ [AI Avatar]                                                     │
│  Based on your discussion, I recommend these next steps:       │
│                                                                 │
│  ✓ Schedule screen test with Priya Sharma                      │
│  ✓ Prepare contract terms (₹2Cr + 15% profit share)           │
│  ✓ Book Mumbai studio for March 15-17                         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [Schedule Screen Test]  [Prepare Contract]  [Book Studio] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                           [12:45 PM]            │
└─────────────────────────────────────────────────────────────────┘
```

## RESPONSIVE LAYOUT SPECIFICATIONS

### Mobile Layout (320px - 768px)
```
┌─────────────────────┐
│ [≡] CastMatch  [⚙] │ ← Header (60px height)
├─────────────────────┤
│                     │
│ Message 1           │ ← Messages (full width)
│ [Talent Card]       │   - 16px side padding
│                     │   - 12px vertical gap
│ Message 2           │
│ [Action Buttons]    │
│                     │
│ Message 3           │
│ [Thread Replies]    │
│                     │
├─────────────────────┤
│ [Input Field]  [⮆]  │ ← Input (56px height)
└─────────────────────┘
```

### Tablet Layout (768px - 1200px)
```
┌─────────────────────────────────────────────┐
│ [≡] CastMatch           [Project] [Team] [⚙] │ ← Header (72px)
├─────────────────────────────────────────────┤
│                                    │        │
│ Message 1                          │ Team   │ ← Main + Sidebar
│ [Talent Card - Expanded]           │ Panel  │   - 24px padding
│                                    │        │   - 16px gap
│ Message 2                          │ [Mem1] │
│ [Action Buttons Row]               │ [Mem2] │
│                                    │ [Mem3] │
│ Message 3                          │        │
│ [Thread - Expanded View]           │ Tools  │
│                                    │ Panel  │
├─────────────────────────────────────────────┤
│ [Input Field Expanded]           [Actions]   │ ← Input (64px)
└─────────────────────────────────────────────┘
```

### Desktop Layout (1200px+)
```
┌─────────────────────────────────────────────────────────────────┐
│ [☰] CastMatch    [Project Selector]    [Team]  [Settings]  [⚙]  │ ← Header (80px)
├─────────────────────────────────────────────────────────────────┤
│ Nav    │                                      │ Team     │ Tools  │
│ Panel  │ Message 1                            │ Panel    │ Panel  │ ← 4-Column Layout
│        │ [Talent Card - Full Details]         │          │        │   - Fluid widths
│ [Proj] │                                      │ [Member] │ [Cal]  │   - 32px gutters
│ [Proj] │ Message 2                            │ [Member] │ [Sched] │
│ [Proj] │ [Action Button Grid - 3 columns]     │ [Member] │ [Notes] │
│        │                                      │          │        │
│ [Hist] │ Message 3                            │ Activity │ Search │
│ [Fav]  │ [Thread - Side-by-side replies]      │ Feed     │ Talent │
│        │                                      │          │        │
├─────────────────────────────────────────────────────────────────┤
│         │ [Rich Input Field with Shortcuts]     [AI]  [Send]      │ ← Input (72px)
└─────────────────────────────────────────────────────────────────┘
```

## INFORMATION ARCHITECTURE

### Conversation Flow Structure
```
Conversation Thread
├── Message Sequence (Chronological)
│   ├── User Messages
│   ├── AI Responses 
│   ├── System Notifications
│   └── Collaborative Inputs
│
├── Thread Branches (Contextual)
│   ├── Talent Discussion Threads
│   ├── Scheduling Coordination
│   ├── Budget Negotiations
│   └── Creative Direction Notes
│
└── Contextual Actions (Dynamic)
    ├── Workflow-Specific Tools
    ├── Quick Reply Suggestions
    ├── Smart Action Recommendations
    └── Cross-Project References
```

### Talent Card Information Hierarchy
```
Talent Card (Progressive Disclosure)
│
├── Level 1: Inline Preview (280x120px)
│   ├── Headshot (80x80px)
│   ├── Name + Age
│   ├── Experience Summary
│   └── Primary Credits (2-3)
│
├── Level 2: Hover/Tap Expansion (280x240px)
│   ├── Extended Credits
│   ├── Availability Status
│   ├── Rate Range
│   ├── Video Reel Preview
│   └── Quick Actions
│
└── Level 3: Full Profile Modal (800x600px)
    ├── Complete Portfolio
    ├── Performance History
    ├── Team Notes & Reviews
    ├── Scheduling Integration
    └── Contact Information
```

## INTERACTION PATTERNS

### Conversation Navigation
```css
/* Scroll Behavior Patterns */
.conversation-scroll {
  /* Smooth scrolling with momentum */
  scroll-behavior: smooth;
  overscroll-behavior: contain;
  
  /* Auto-scroll to latest message */
  scroll-snap-type: y proximity;
}

.message-item {
  scroll-snap-align: start;
  scroll-margin-top: 1rem;
}

/* Jump to specific messages */
.message-jump {
  animation: highlightMessage 2s ease-out;
}

@keyframes highlightMessage {
  0% { background: rgba(255, 215, 0, 0.3); }
  100% { background: transparent; }
}
```

### Touch/Click Targets
```css
/* Minimum Touch Targets (44px) */
.touch-target {
  min-height: 44px;
  min-width: 44px;
  padding: 8px;
  margin: 4px;
}

/* Hover States for Desktop */
@media (hover: hover) {
  .interactive-element:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 215, 0, 0.2);
  }
}

/* Active States for Touch */
.interactive-element:active {
  transform: scale(0.98);
}
```

### Multi-Device Continuity
```javascript
// Conversation State Synchronization
const conversationState = {
  scrollPosition: { percentage: 0.75, messageId: 'msg_12345' },
  activeThread: 'thread_talent_discussion',
  expandedCards: ['talent_priya', 'talent_aisha'],
  draftMessage: "I think we should schedule...",
  selectedWorkflow: 'review_stage'
}
```

## ACCESSIBILITY WIREFRAME ANNOTATIONS

### Screen Reader Structure
```html
<!-- Message Structure for Screen Readers -->
<article aria-label="Message from AI Assistant" role="article">
  <header>
    <img src="ai-avatar.jpg" alt="AI Assistant" />
    <time datetime="2025-09-04T12:35:00">12:35 PM</time>
  </header>
  
  <div class="message-content">
    <p>Based on your requirements, I've identified 8 actresses...</p>
    
    <section aria-label="Talent Recommendations" role="region">
      <div class="talent-card" tabindex="0" role="button" 
           aria-label="Priya Sharma, 28 years old, theater background">
        <!-- Talent card content -->
      </div>
    </section>
    
    <div class="actions" role="group" aria-label="Available actions">
      <button>Show More</button>
      <button>Refine Search</button>
      <button>Schedule Reviews</button>
    </div>
  </div>
</article>
```

### Keyboard Navigation Flow
```
Tab Order: Header → Message Content → Talent Cards → Action Buttons
↓
Enter/Space: Expand cards, trigger actions
↓
Arrow Keys: Navigate between cards in grid layout
↓
Escape: Close expanded views, return to conversation
```

### High Contrast Considerations
```css
/* High Contrast Mode Wireframe Adjustments */
@media (prefers-contrast: high) {
  .message-border {
    border: 2px solid currentColor;
  }
  
  .talent-card-outline {
    outline: 3px solid #FFD700;
    outline-offset: 2px;
  }
  
  .action-button-contrast {
    background: #000000;
    color: #FFFFFF;
    border: 2px solid #FFD700;
  }
}
```

## WORKFLOW-SPECIFIC WIREFRAME VARIATIONS

### 1. TALENT DISCOVERY MODE
- Search input prominently placed
- AI suggestions appear immediately
- Talent cards in grid layout (3 columns desktop, 2 tablet, 1 mobile)
- Filter sidebar visible on larger screens

### 2. COLLABORATIVE REVIEW MODE
- Multi-user thread layout with clear attribution
- Side-by-side talent comparison tools
- Rating/voting mechanisms for team decisions
- Comments and notes overlay on talent cards

### 3. SCHEDULING COORDINATION MODE
- Calendar widget integrated into sidebar
- Time zone display for remote participants
- Availability matrix for multiple people
- Quick scheduling action buttons

### 4. DECISION FINALIZATION MODE
- Summary view of all considered talent
- Decision history and reasoning trails
- Contract preparation tools
- Announcement preparation templates

## TECHNICAL WIREFRAME SPECIFICATIONS

### Component Breakdown
```
ChatContainer
├── ConversationHeader
├── MessageThread
│   ├── MessageItem (User/AI/System)
│   ├── TalentCard (Inline/Expanded/Modal)
│   ├── ThreadBranch (Collaborative)
│   └── ActionButtons (Contextual)
├── ConversationInput
└── ContextSidebar (Responsive)
```

### State Management Wireframe
```javascript
// Wireframe State Structure
const wireframeState = {
  conversation: {
    messages: Array<Message>,
    activeThread: string | null,
    scrollPosition: number
  },
  
  ui: {
    expandedCards: Set<string>,
    activeWorkflow: WorkflowStage,
    sidebarVisible: boolean,
    mobileMenuOpen: boolean
  },
  
  talent: {
    displayedProfiles: Array<TalentProfile>,
    comparisonMode: boolean,
    selectedForComparison: Array<string>
  }
}
```

## HANDOFF SPECIFICATIONS FOR LAYOUT GRID ENGINEER

### Grid System Requirements
- 8-point base grid system (8px, 16px, 24px, 32px...)
- Message content max-width: 640px (80 characters optimal reading)
- Talent card dimensions: 280px width (flexible height)
- Responsive breakpoints: 320px, 768px, 1200px, 1920px
- Vertical rhythm: 24px base line height

### Mathematical Proportions
- Golden ratio (1.618:1) for talent card aspect ratios
- Mumbai cinema proportions for hero elements
- Consistent spacing intervals based on 8-point system
- Typography scale progression: 0.8, 1, 1.25, 1.563, 1.953, 2.441

---

**Next Phase Trigger**: Wireframes complete. Ready for Layout Grid Engineer deployment and subsequent Phase 2 visual design agents.

**Implementation Priority**: Focus on responsive message layouts and talent card progressive disclosure patterns.