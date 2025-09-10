# Talent Discovery User Flow
## Starting Point: "Find me a male lead, 25-35 years"

### Flow Overview
The talent discovery flow enables natural language search for talent, progressive filtering, comparison tools, and shortlisting - all through conversational AI with minimal traditional UI interaction.

## User Journey Map

### Phase 1: Search Initiation (0-5 seconds)
**Entry Points:**
- Voice command: "Find me a male lead, 25-35 years"
- Project dashboard: "Find talent for [Role]"
- Quick action: "Search talents"
- AI suggestion: "Shall I find actors for your lead role?"

**User Mental State:**
- Clear vision of requirements
- Time pressure to find options
- Need for quality matches

### Phase 2: Initial Results (5-15 seconds)

#### Step 2.1: AI Processing & Response
**AI Response:**
```
"I found 47 actors who match your requirements for a male lead aged 25-35. 
Here are the top matches based on your project needs:"
```

**Results Display:**
- Top 5-7 talents shown initially
- Smart ranking based on:
  - Project fit
  - Availability
  - Recent success
  - Budget alignment
  - Previous collaborations

#### Step 2.2: Quick Browse Interface
**Layout:**
- Swipeable talent cards
- Key info visible:
  - Photo
  - Name, Age
  - Recent work
  - Availability indicator
  - Rate range (if permitted)

### Phase 3: Refinement & Filtering (15-45 seconds)

#### Step 3.1: Natural Language Refinement
**AI Prompt:**
```
"Would you like to narrow this down? You can tell me specific requirements like:
- 'Must speak fluent Hindi'
- 'Someone with action experience'
- 'Available in March'
- 'Under 10 lakhs'"
```

**User Input Examples:**
- "Show me only those who've done OTT work"
- "I need someone who can do his own stunts"
- "Preferably from Mumbai"
- "Someone like Rajkummar Rao"

#### Step 3.2: Progressive Filtering
**AI Behavior:**
- Applies filters cumulatively
- Shows count changes
- Maintains context
- Suggests related filters

**AI Response:**
```
"Filtered to 12 actors with OTT experience. 
8 of them are based in Mumbai. Want to see those?"
```

### Phase 4: Detailed Exploration (45-120 seconds)

#### Step 4.1: Profile Deep Dive
**Trigger:** Tap on talent card or "Tell me more about [Name]"

**AI Provides:**
```
"Arjun Mehta is a strong candidate:
- Age: 28, based in Mumbai
- Fluent in Hindi, English, Marathi
- Recent: Lead in 'Urban Stories' (Netflix)
- Available: March-May
- Rate: ₹8-12 lakhs per project
- Director feedback: 'Very professional, great screen presence'

Want to see his audition reels?"
```

#### Step 4.2: Media Viewing
**Available Media:**
- Recent demo reels
- Previous auditions (if permitted)
- Photo gallery
- Social media links
- IMDb profile

**AI Context:**
```
"His intense scene from 'Urban Stories' shows the 
emotional range you're looking for. Should I add him to your shortlist?"
```

### Phase 5: Comparison & Shortlisting (120-180 seconds)

#### Step 5.1: Side-by-Side Comparison
**User Request:** "Compare Arjun with Vikram and Rahul"

**AI Comparison:**
```
"Here's how they compare for your male lead role:

ARJUN MEHTA
✓ Perfect age (28)
✓ OTT experience 
✓ Available dates match
⚠ Higher rate (₹10L avg)

VIKRAM SINGH  
✓ Strong action background
✓ Within budget (₹7L)
⚠ Limited availability
⚠ No recent OTT work

RAHUL VERMA
✓ Great chemistry in romantic roles
✓ Fully available
✓ Budget-friendly (₹6L)
⚠ Younger look (might need aging)
```

#### Step 5.2: Shortlist Building
**AI Actions:**
- Auto-saves promising talents
- Groups by role fit
- Tracks selection reasoning
- Maintains ranked order

**AI Confirmation:**
```
"I've added Arjun and Rahul to your shortlist for male lead.
You now have 5 actors shortlisted. Ready to schedule auditions?"
```

### Phase 6: Next Actions (180-240 seconds)

#### Step 6.1: Workflow Continuation
**AI Suggestions:**
```
"Great progress! For these 5 shortlisted actors, I can:
1. Check their exact availability for auditions
2. Send them the character brief
3. Schedule audition slots
4. Find similar actors as backup
What would you prefer?"
```

#### Step 6.2: Parallel Searches
**AI Proactive:**
```
"While you review the male leads, should I start 
searching for your female lead (22-30 years)?"
```

## Search Intelligence Features

### Semantic Understanding
**Input:** "Someone like young Amitabh"
**AI Interpretation:** 
- Tall, commanding presence
- Deep voice
- Intense acting style
- Age: 25-35

### Cultural Context
**Input:** "Marathi mulga with Mumbai swag"
**AI Understanding:**
- Native Marathi speaker
- Urban, contemporary style  
- Mumbai-based
- Cultural authenticity

### Availability Intelligence
**AI Checks:**
- Current commitments
- Upcoming projects
- Travel requirements
- Date conflicts

### Budget Optimization
**AI Suggests:**
```
"Rahul is ₹4L under budget. You could use 
savings for a stronger supporting cast."
```

## Conversation Flow States

### Success Path
1. Clear requirements → Relevant results → Quick shortlisting

### Exploration Path
1. Broad search → Browse options → Gradual refinement → Discovery

### Comparison Path
1. Multiple options → Detailed comparison → Informed decision

### Uncertainty Path
1. Vague requirements → AI clarification → Examples shown → Requirements clarified

## Error Recovery Patterns

### No Results Found
**AI Response:**
```
"No exact matches for those specific requirements. 
I can show you actors who match 4 out of 5 criteria, 
or we can adjust the requirements. What works better?"
```

### Too Many Results
**AI Response:**
```
"That's 200+ actors! Let's narrow it down. 
What's most important: experience, availability, or budget?"
```

### Conflicting Requirements
**AI Response:**
```
"I notice you want someone 25-30 with 20 years experience. 
Should I prioritize age or experience level?"
```

## Context Building

### Search Context Accumulation
```json
{
  "search_session": {
    "id": "search_001",
    "project_context": "Mumbai Dreams",
    "role_searching": "male_lead",
    "requirements_stated": [
      "age_25_35",
      "ott_experience",
      "hindi_fluent",
      "action_capable"
    ],
    "filters_applied": [
      "location_mumbai",
      "budget_under_10L",
      "available_march"
    ],
    "talents_viewed": [
      {"id": "t001", "time_spent": "45s", "action": "shortlisted"},
      {"id": "t002", "time_spent": "20s", "action": "skipped"},
      {"id": "t003", "time_spent": "60s", "action": "comparing"}
    ]
  }
}
```

### Learning Patterns
- User prefers experienced actors
- Budget flexibility for right talent
- Values director recommendations
- Likes to see recent work

## Wireframe Requirements

### Screen 1: Search Results Grid
- Card-based layout
- 2 columns on mobile
- Infinite scroll
- Quick actions overlay
- Sort/filter bar

### Screen 2: Talent Detail View
- Full-screen profile
- Tabbed content (Bio, Media, Work, Reviews)
- Floating action buttons
- Swipe between profiles
- Back to results navigation

### Screen 3: Comparison View
- Split screen on tablet/desktop  
- Stacked cards on mobile
- Highlighted differences
- Synchronized scrolling
- Decision buttons

### Screen 4: Shortlist Management
- Grouped by roles
- Drag to reorder
- Bulk actions
- Export options
- Share with team

## Performance Metrics

### Speed Targets
- Initial results: <2 seconds
- Filter application: <500ms
- Profile load: <1 second
- Media playback: Instant

### Success Metrics
- Find suitable talent: <5 minutes
- Shortlist creation: 3-5 candidates
- User satisfaction: >4.5/5
- Booking rate: >30%

## Mobile Optimization

### Gestures
- Swipe left/right: Browse talents
- Swipe up: More details
- Swipe down: Back to results
- Long press: Quick actions
- Pinch: Compare view

### Voice Commands
- "Next actor"
- "Show me more like this"
- "Add to shortlist"
- "Compare these two"
- "Schedule audition"

## AI Personality

### Knowledgeable
- Industry insights
- Talent background
- Market trends
- Availability patterns

### Proactive
- Suggests alternatives
- Identifies conflicts
- Recommends similar
- Warns about issues

### Efficient
- Remembers preferences
- Applies learned patterns
- Reduces repetition
- Streamlines process