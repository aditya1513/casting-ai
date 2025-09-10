# Onboarding Flow - Detailed Documentation

## Flow Metadata
- **Flow Name:** First-Time User Onboarding
- **Duration:** 10-15 minutes
- **Completion Rate Target:** >80%
- **Primary Channel:** Mobile (70%) / Desktop (30%)

## User Journey Map

### Pre-Onboarding State
- **Context:** User discovered CastMatch through industry referral/marketing
- **Emotional State:** Curious but skeptical (new tool fatigue)
- **Mental Model:** Expects complex setup like traditional casting tools
- **Success Criteria:** Understanding value within 5 minutes

### Journey Stages

```
DISCOVER → SIGN UP → SETUP → LEARN → ACTIVATE → CONFIRM
   ↓         ↓        ↓       ↓        ↓         ↓
Awareness  Account  Profile  Demo   First Use  Habit
```

## Detailed Step-by-Step Flow

### Entry Point Analysis

#### Path A: Direct Sign-up (40%)
```
Landing Page → "Start Free Trial" → Sign-up Modal
```

#### Path B: Invitation Link (35%)
```
Email Invite → Custom Landing → Pre-filled Sign-up
```

#### Path C: Team Addition (25%)
```
Team Dashboard → Add Member → Instant Access
```

### Step 1: Account Creation

#### 1.1 Initial Modal
```
┌─────────────────────────────────┐
│   Welcome to CastMatch AI       │
│                                  │
│   🎬 Start Your Free Trial       │
│                                  │
│   ┌─────────────────────────┐   │
│   │ Continue with Google    │   │
│   └─────────────────────────┘   │
│   ┌─────────────────────────┐   │
│   │ Continue with Phone     │   │
│   └─────────────────────────┘   │
│   ┌─────────────────────────┐   │
│   │ Email Sign-up          │   │
│   └─────────────────────────┘   │
│                                  │
│   Already have an account?      │
└─────────────────────────────────┘
```

**Interaction Logic:**
- Google OAuth: 1-click signup
- Phone: OTP verification (India-specific)
- Email: Magic link sent

**Error States:**
- Existing account: "Welcome back! Logging you in..."
- Network failure: "Having trouble? Try again or use offline mode"
- Invalid input: Inline validation with helpful messages

#### 1.2 Basic Information
```
AI: "Great! What should I call you?"
User: [Voice/Type name]

AI: "Nice to meet you, Priya! Which best describes your role?"
Options:
□ Casting Director
□ Casting Assistant  
□ Producer
□ Director
□ Talent Agency
```

**Branching Logic:**
- Casting Director → Full platform access
- Assistant → Collaborative features emphasized
- Producer → Executive dashboard priority
- Director → Review and approval flows
- Agency → Talent management tools

### Step 2: Personalization

#### 2.1 Experience Level
```
AI: "How long have you been in casting?"

○ Just starting (0-2 years)
○ Building experience (2-5 years)
○ Established professional (5-10 years)
○ Industry veteran (10+ years)
```

**Adaptive Responses:**
- Beginner: More guidance, tutorials enabled
- Experienced: Skip basics, advanced features
- Veteran: Minimal onboarding, power tools

#### 2.2 Work Context
```
AI: "What type of content do you primarily cast for?"

□ Web Series / OTT
□ Feature Films
□ Advertisements
□ Reality Shows
□ Music Videos
□ All of the above
```

**Feature Activation:**
- Web Series: Episode tracking, seasonal casting
- Films: Long-form project management
- Ads: Quick turnaround tools, rate cards
- Reality: Bulk processing, personality matching

### Step 3: Project Setup

#### 3.1 First Project Decision
```
AI: "Ready to set up your first project? This helps me understand your workflow."

[Upload Script]  [Describe Project]  [Use Sample]  [Skip]
```

#### 3.2A: Script Upload Path
```
┌─────────────────────────────────┐
│     Drop your script here       │
│         or browse files          │
│                                  │
│     [PDF] [DOC] [FDX] [TXT]     │
│                                  │
│    ┌──────────────────────┐     │
│    │   📄 Drop Zone        │     │
│    │                       │     │
│    └──────────────────────┘     │
└─────────────────────────────────┘
```

**Processing Flow:**
1. Upload begins → Progress indicator
2. AI analysis → "Reading script..." (15 seconds)
3. Extraction complete → "Found 12 characters!"
4. Confirmation → Review and edit

#### 3.2B: Voice Description Path
```
AI: "Tell me about your project. I'm listening..."

[Recording indicator: Pulsing mic icon]

User: "It's a thriller series about Mumbai police..."

AI: "Interesting! A crime thriller. How many episodes?"
```

**Voice Processing:**
- Real-time transcription shown
- Key information highlighted
- Clarifying questions asked
- Summary generated for confirmation

### Step 4: AI Demonstration

#### 4.1 Capability Showcase
```
AI: "Let me show you what I can do with your project..."

DEMO SEQUENCE:
1. "I've identified your lead character needs someone 35-40, intense"
2. "Here are 5 actors who match - swipe to review"
3. "I can schedule auditions with one command"
4. "I'll remember your preferences for future searches"
```

#### 4.2 Interactive Tutorial
```
AI: "Try asking me something. For example:"

Suggestion chips:
[Find actors like Pankaj Tripathi]
[Who's available tomorrow?]
[Show me fresh faces under 30]
[What's my budget remaining?]
```

**User tries a command:**
- Instant response demonstrates speed
- AI explains what it did
- Suggests follow-up actions

### Step 5: Team & Permissions

#### 5.1 Team Discovery
```
AI: "Who else works with you on casting decisions?"

Smart Suggestions (from contacts/industry database):
○ Raj Kumar (Director) - Worked on 3 projects
○ Meera Shah (Producer) - Netflix India
○ Arjun Rao (Assistant) - Your team

[Add Custom] [Import from Contacts] [Skip for Now]
```

#### 5.2 Permission Setting
```
For each team member:

Raj Kumar - Director
□ View shortlists
□ Comment on profiles
□ Approve final casting
□ Access budget info
[Invite] [Skip]
```

### Step 6: Preferences Configuration

#### 6.1 Communication Preferences
```
AI: "How should I keep you updated?"

Notifications:
□ Daily briefing (9 AM)
□ Urgent updates only
□ Real-time everything

Channels:
□ In-app notifications
□ WhatsApp messages
□ Email summaries
□ SMS for urgencies
```

#### 6.2 AI Behavior
```
AI: "How proactive should I be?"

○ Highly Proactive - Suggest talents daily, automate routine tasks
○ Balanced - Key suggestions and reminders
○ Responsive - Only act when asked
○ Custom - Let me configure each feature
```

### Step 7: Activation & Success

#### 7.1 First Success Moment
```
AI: "Perfect! You're all set. Let's find your first actor."

[Guided first search with guaranteed good results]

AI: "Here are 3 perfect matches! Want to shortlist any?"
```

#### 7.2 Confirmation & Next Steps
```
AI: "Excellent start, Priya! You've:
✓ Set up your profile
✓ Created your first project  
✓ Found potential actors
✓ Invited your team

Tomorrow I'll send your morning briefing at 9 AM.
Ready to explore more or shall we stop here?"

[Continue Exploring] [Complete Setup] [Take Tour]
```

## Mobile-Specific Optimizations

### Touch Interactions
- Large touch targets (minimum 44x44 points)
- Swipe navigation between steps
- Pull-to-refresh for updates
- Long-press for additional options
- Haptic feedback for confirmations

### Voice-First Design
```
┌─────────────────────────────────┐
│   Hold to speak to CastMatch    │
│                                  │
│      [🎤 Mic Button]             │
│                                  │
│   "Find actors for tomorrow"    │
│                                  │
│   Voice command detected...      │
└─────────────────────────────────┘
```

### Progressive Disclosure
1. Show only essential fields initially
2. Reveal advanced options on demand
3. Context-sensitive help appears when needed
4. Skip options always available
5. Return to any step possible

## Error Handling & Recovery

### Network Issues
```
State: Upload fails at 80%

AI: "Connection lost. Don't worry, I saved your progress."

Options:
[Retry Now] [Continue Offline] [Save & Exit]
```

### Validation Errors
```
State: Invalid phone number

Inline Message: "Please enter a 10-digit Indian mobile number"
Helper: "Example: 98765 43210"
```

### Abandonment Recovery
```
Return after incomplete signup:

AI: "Welcome back! You were setting up your Netflix project.
     Ready to continue from where you left off?"

[Continue Setup] [Start Fresh] [Quick Setup]
```

## Success Metrics & Analytics

### Funnel Metrics
```
Step 1: Account Creation - 100% (baseline)
Step 2: Personalization - 92% 
Step 3: Project Setup - 85%
Step 4: AI Demo - 78%
Step 5: Team Setup - 65%
Step 6: Preferences - 82%
Step 7: Activation - 80%
```

### Time Metrics
- Average completion: 12 minutes
- Optimal path: 8 minutes
- Maximum before fatigue: 20 minutes

### Engagement Metrics
- Voice command usage: 45%
- Script upload rate: 60%
- Team invitation sent: 40%
- Return within 24 hours: 85%

### Quality Metrics
- Error rate per step: <5%
- Support contact rate: <10%
- Satisfaction rating: 4.6/5
- Recommendation likelihood: 8/10

## Emotional Journey Mapping

```
Skeptical → Curious → Engaged → Impressed → Confident → Committed
    ↓          ↓         ↓          ↓           ↓          ↓
 Sign-up    Role     Project      Demo      Success    Daily Use
           Select    Upload     Complete    Moment
```

### Emotional Triggers
- **Delight:** AI understands script perfectly
- **Relief:** Complex task made simple
- **Confidence:** First successful search
- **Trust:** Accurate recommendations
- **Commitment:** Value realized quickly

## Post-Onboarding Activation

### Day 1 Follow-up
```
9:00 AM Notification:
"Good morning Priya! Ready for your first casting day?
I've prepared 10 new talent suggestions for your project."
```

### Week 1 Check-in
```
AI: "You've saved 8 hours this week! 
     Most used feature: Voice search
     Try next: Bulk scheduling"
```

### Success Celebration
```
After first casting completion:
"Congratulations! You've made your first casting decision 
60% faster than traditional methods!"
```

## Technical Implementation Notes

### Performance Requirements
- Step load time: <500ms
- Script processing: <15 seconds
- Voice recognition: <2 seconds
- Auto-save frequency: Every 30 seconds

### Data Collection
- User choices for personalization
- Feature usage for optimization
- Drop-off points for improvement
- Error frequency for debugging

### A/B Testing Variables
- Number of onboarding steps
- Voice vs text preference
- Tutorial depth
- Social proof placement
- Progress indicator style