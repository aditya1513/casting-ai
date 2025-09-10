# Project Initiation User Flow
## Starting Point: "I need to cast a new show"

### Flow Overview
The project initiation flow guides users from initial project conception through complete casting setup, establishing all necessary context for the AI to provide intelligent assistance throughout the casting process.

## User Journey Map

### Phase 1: Project Discovery (0-30 seconds)
**Entry Points:**
- Voice command: "I need to cast a new show"
- Quick action button: "New Project"
- Homepage suggestion: "Start a new casting project"

**User Mental State:**
- Excited about new project
- Time pressure awareness
- Need for quick setup

### Phase 2: Project Definition (30-90 seconds)

#### Step 2.1: Basic Information Capture
**AI Prompt:**
```
"Great! I'll help you set up your new casting project. What's the name of your show?"
```

**User Input:** Project title

**AI Follow-up:**
```
"Perfect! Tell me a bit about [Project Name]. Is this for:
- OTT Series
- Feature Film
- Web Series
- Commercial
- Other"
```

**Interaction Pattern:** Conversational with quick-select options

#### Step 2.2: Production Context
**AI Prompt:**
```
"Which production house is behind this project?"
```

**System Behavior:**
- Auto-suggest from known production houses
- Allow new entry
- Link to production house profile

**AI Follow-up:**
```
"What's your target release timeline? This helps me prioritize urgent casting needs."
```

### Phase 3: Role Definition (90-180 seconds)

#### Step 3.1: Core Roles Identification
**AI Prompt:**
```
"Let's define the key roles. You can tell me about them naturally, like:
'I need a male lead, 25-35, intense character' or upload your script/breakdown."
```

**User Options:**
1. Voice/text description
2. Upload character breakdown
3. Use template
4. Import from similar project

#### Step 3.2: AI Role Processing
**System Actions:**
- Parse natural language descriptions
- Extract key requirements:
  - Age range
  - Gender
  - Language requirements
  - Character traits
  - Special skills

**AI Confirmation:**
```
"I've identified these roles from your description:
1. Male Lead - 25-35 years, intense, Hindi-speaking
2. Female Lead - 22-30 years, modern, urban
3. Supporting Actor - 40-50 years, father figure

Should I add more details to any of these?"
```

### Phase 4: Team & Permissions (180-240 seconds)

#### Step 4.1: Team Assembly
**AI Prompt:**
```
"Who else will be working on casting decisions? I'll set up their access."
```

**Quick Add Options:**
- Director (final approval)
- Creative Producer (input & approval)
- AD (manage auditions)
- Line Producer (budget approval)

#### Step 4.2: Communication Preferences
**AI Prompt:**
```
"How should I notify the team about casting updates?"
```

**Options:**
- WhatsApp group
- Email updates
- In-app only
- SMS for urgent

### Phase 5: Budget & Constraints (240-300 seconds)

#### Step 5.1: Budget Framework
**AI Prompt:**
```
"What's your casting budget range? This stays confidential and helps me suggest appropriate talent."
```

**Input Options:**
- Total budget
- Per-role budget
- Flexible/TBD
- Premium for right talent

#### Step 5.2: Production Constraints
**AI Prompt:**
```
"Any specific requirements I should know about?
- Shooting locations
- Date conflicts to avoid
- Union requirements
- Language preferences"
```

### Phase 6: AI Learning & Confirmation (300-360 seconds)

#### Step 6.1: Similar Project Learning
**AI Prompt:**
```
"I noticed you've cast similar projects. Should I reference:
- 'Mumbai Dreams' for tone and style?
- 'Sacred Games' for talent pool?
```

#### Step 6.2: Project Summary & Launch
**AI Presentation:**
```
"Your project is ready! Here's what I've set up:

PROJECT: [Name]
Type: OTT Series
Roles: 3 primary, 5 supporting
Team: 4 members with defined permissions
Timeline: Casting needed by [date]
Budget: Within range

Ready to start finding talent? I can:
1. Search for your male lead
2. Show similar successful castings
3. Set up this week's auditions
```

## Conversation Flow States

### Success Path
1. User provides clear information → AI confirms → Setup complete in <5 minutes

### Clarification Loops
1. Ambiguous input → AI asks specific questions → User clarifies → Continue flow

### Error Recovery
1. Missing information → AI provides examples → User understands → Provides input

## Context Propagation

### Created Context Objects
```json
{
  "project": {
    "id": "proj_123",
    "name": "Mumbai Dreams",
    "type": "ott_series",
    "status": "pre_production",
    "created": "timestamp"
  },
  "roles": [
    {
      "id": "role_001",
      "type": "male_lead",
      "requirements": {...}
    }
  ],
  "team": {
    "members": [...],
    "permissions": {...}
  },
  "preferences": {
    "communication": "whatsapp",
    "urgency": "high"
  }
}
```

### Context Persistence
- All context saved to project memory
- Available across all sessions
- Shared with team members
- Used for AI recommendations

## Wireframe Requirements

### Screen 1: Conversation Interface
- Full-screen chat interface
- Voice input button prominent
- Quick action chips for common responses
- Progress indicator (Steps 1-6)

### Screen 2: Role Definition Cards
- Visual cards for each role
- Inline editing capability
- Drag to reorder priority
- Quick duplicate option

### Screen 3: Team & Permissions Grid
- Team member tiles
- Permission toggles
- WhatsApp/Email integration status
- Invite pending indicators

### Screen 4: Project Dashboard
- Summary of all setup information
- Quick edit options
- Next actions prominently displayed
- Budget and timeline visibility

## Success Metrics
- Setup completion: <5 minutes
- All required fields captured: 100%
- User confidence score: >4.5/5
- Return to complete setup: <10%

## Error Handling Patterns

### Incomplete Information
- Save progress automatically
- Allow "Complete later" option
- Send reminder after 24 hours
- AI assists with missing pieces

### Integration Failures
- Graceful degradation
- Manual entry options
- Retry mechanisms
- Clear error messages

## Mobile Optimization
- Voice-first interaction
- Large touch targets
- Minimal typing required
- Smart keyboard dismissal
- Progressive disclosure