# Talent Discovery - Interaction Patterns & UI Logic

## Discovery Interface Architecture

### Primary Discovery Modes

```
┌─────────────────────────────────────────────────┐
│              TALENT DISCOVERY HUB               │
├─────────────────────────────────────────────────┤
│                                                  │
│  🎤 Voice Search    📷 Image Match    ⌨️ Text   │
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │  "Find someone like Rajkummar Rao but     │  │
│  │   younger for the detective role"         │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│         🔍 Searching 50,000+ profiles...        │
│                                                  │
└─────────────────────────────────────────────────┘
```

## Conversational Search Patterns

### Pattern 1: Reference-Based Search
```
User Input Types:
1. "Someone like [Actor Name]"
2. "Similar to [Character] from [Movie]"  
3. "The type who played [Role] in [Show]"
4. "[Actor 1] meets [Actor 2] vibe"
```

**AI Processing Pipeline:**
```
Input → Parse Reference → Extract Attributes → Find Similar → Rank Results
         ↓                ↓                    ↓              ↓
    Actor/Character   Acting Style         Database      Relevance Score
                     Body Language          Search
                     Dialogue Style
```

### Pattern 2: Attribute-Based Search
```
User: "Young mother, strong but vulnerable, speaks Hindi and English"

Extraction:
- Age Range: 25-35 (young mother)
- Character Traits: [strong, vulnerable]
- Languages: [Hindi, English]
- Gender: Female
```

**Multi-Attribute Query Builder:**
```sql
SELECT * FROM talents WHERE
  age BETWEEN 25 AND 35
  AND gender = 'female'
  AND languages @> ARRAY['Hindi', 'English']
  AND acting_styles @> ARRAY['emotional_depth', 'versatile']
ORDER BY relevance_score DESC
```

### Pattern 3: Contextual Search
```
User: "Who would work well with Alia Bhatt in a romantic scene?"

Context Understanding:
1. Co-actor compatibility needed
2. Romantic genre requirements
3. Chemistry potential important
4. Age-appropriate pairing
5. Screen presence balance
```

## Visual Search Interface

### Image Upload & Analysis
```
┌─────────────────────────────────────┐
│     📷 Upload Reference Image        │
│                                      │
│   ┌────────────────────────────┐    │
│   │                            │    │
│   │    [Dropped Image]         │    │
│   │                            │    │
│   └────────────────────────────┘    │
│                                      │
│   Analyzing: Face structure ████    │
│            : Age range     ████     │
│            : Expressions  ████      │
│                                      │
└─────────────────────────────────────┘
```

**Visual Analysis Parameters:**
- Facial geometry mapping
- Age estimation (±3 years)
- Expression range detection
- Ethnic features identification
- Body type classification
- Style/look categorization

## Results Presentation Layouts

### Layout 1: Card Stack (Mobile)
```
┌─────────────────────────────────────┐
│         ARJUN KHANNA                │
│         95% Match                    │
│   ┌────────────────────────────┐    │
│   │                            │    │
│   │     [Actor Photo]          │    │
│   │                            │    │
│   └────────────────────────────┘    │
│                                      │
│   Age: 28 | Mumbai | ₹5L            │
│   Recent: Sacred Games, Mirzapur    │
│                                      │
│   Why matched:                       │
│   • Similar intensity to reference   │
│   • Age range perfect                │
│   • Budget friendly                  │
│                                      │
│   [❌ Pass]  [❤️ Shortlist]  [👁 View] │
└─────────────────────────────────────┘
```

### Layout 2: Grid View (Desktop)
```
┌─────────────────────────────────────────────────────┐
│  Showing 24 matches for "Young detective role"      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐              │
│  │      │ │      │ │      │ │      │              │
│  │  95% │ │  92% │ │  89% │ │  87% │              │
│  └──────┘ └──────┘ └──────┘ └──────┘              │
│   Arjun    Rahul    Vikram   Suresh               │
│   ₹5L      ₹8L      ₹4L      ₹6L                  │
│                                                      │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐              │
│  │      │ │      │ │      │ │      │              │
│  │  85% │ │  83% │ │  81% │ │  79% │              │
│  └──────┘ └──────┘ └──────┘ └──────┘              │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Layout 3: Comparison Mode
```
┌─────────────────────────────────────────────────────┐
│            COMPARISON VIEW (3 Selected)             │
├─────────────────────────────────────────────────────┤
│                                                      │
│           Arjun K.    Rahul M.    Vikram S.        │
│           ────────    ────────    ─────────        │
│ Match:      95%         92%         89%            │
│ Age:        28          30          26             │
│ Rate:       ₹5L         ₹8L         ₹4L            │
│ Avail:      ✓ Yes       ⚠ Maybe     ✓ Yes         │
│                                                      │
│ Acting:     ████████    ███████     ████████       │
│ Experience: ███████     ████████    ██████         │
│ Popularity: ██████      ████████    █████          │
│                                                      │
│ Recent:     Sacred      Scam        Mumbai         │
│            Games       1992        Diaries         │
│                                                      │
│ [Select Arjun] [Select Rahul] [Select Vikram]      │
└─────────────────────────────────────────────────────┘
```

## Interactive Elements & Gestures

### Mobile Gestures
```
Swipe Right → Shortlist
Swipe Left → Pass
Swipe Up → More details
Swipe Down → Back to results
Long Press → Compare mode
Double Tap → Quick preview
Pinch → Zoom photo
```

### Voice Commands During Discovery
```
"Next"              → Move to next profile
"Shortlist this"    → Add to shortlist
"Tell me more"      → Expand details
"Compare these two" → Enter comparison
"Filter by budget"  → Apply filter
"Show only Mumbai"  → Location filter
"Skip all these"    → Bulk reject
```

### Quick Actions Menu
```
┌──────────────────┐
│   QUICK ACTIONS  │
├──────────────────┤
│ 📋 Shortlist All │
│ 🔄 Refresh List  │
│ 🎯 Narrow Search │
│ 📊 Compare Mode  │
│ 📧 Share List    │
│ 💾 Save Search   │
└──────────────────┘
```

## AI Learning & Refinement

### Preference Learning Indicators
```
┌─────────────────────────────────────────┐
│   AI LEARNING YOUR PREFERENCES 🧠       │
│                                         │
│   You seem to prefer:                  │
│   • Theater background (3/5 selected)  │
│   • Age 25-30 (4/5 selected)          │
│   • Mumbai-based (5/5 selected)       │
│                                         │
│   Should I prioritize these?           │
│   [Yes, apply] [No, ignore] [Adjust]   │
└─────────────────────────────────────────┘
```

### Dynamic Filter Suggestions
```
Based on selections:
┌──────────────┬──────────────┬──────────────┐
│ Add Theater  │ Budget <₹7L  │ Free Next Week│
│ Background   │              │               │
└──────────────┴──────────────┴──────────────┘
```

## Discovery Flow States

### State 1: Initial Search
```
Status: "Understanding your requirements..."
Visual: AI thinking animation
Duration: 1-2 seconds
```

### State 2: Processing
```
Status: "Searching 50,000+ profiles..."
Visual: Progress bar
Duration: 2-3 seconds
```

### State 3: Results Ready
```
Status: "Found 48 perfect matches!"
Visual: Cards animate in
Action: Auto-play first profile video
```

### State 4: Refinement Mode
```
Status: "Narrowing based on your selections..."
Visual: Filters applying animation
Result: Updated list appears
```

### State 5: Shortlist Building
```
Status: "5 actors shortlisted"
Visual: Bottom bar shows selections
Action: Enable comparison/share
```

## Advanced Discovery Features

### Availability Calendar Integration
```
┌─────────────────────────────────────┐
│    AVAILABILITY NEXT 2 WEEKS        │
├─────────────────────────────────────┤
│ Mon Tue Wed Thu Fri Sat Sun         │
│  ✓   ✓   ✗   ✓   ✓   ✓   ✗         │
│  ✓   ?   ✓   ✓   ✗   ✗   ✗         │
│                                      │
│ ✓ Available  ? Tentative  ✗ Busy    │
└─────────────────────────────────────┘
```

### Budget Impact Visualization
```
If you cast these actors:
┌─────────────────────────────────────┐
│ Total: ₹45L / ₹50L Budget           │
│ ████████████████████░░░░ 90%        │
│                                      │
│ Lead: ₹20L                          │
│ Support: ₹15L                       │
│ Others: ₹10L                        │
│ Remaining: ₹5L                      │
└─────────────────────────────────────┘
```

### Compatibility Matrix
```
Chemistry Prediction with existing cast:
┌─────────────────────────────────────┐
│ Arjun × Alia:    ████████ Excellent │
│ Rahul × Alia:    ██████ Good        │
│ Vikram × Alia:   ████████ Excellent │
│                                      │
│ Based on: Previous work, style match│
└─────────────────────────────────────┘
```

## Mobile-Specific Optimizations

### Offline Mode
```
┌─────────────────────────────────────┐
│        OFFLINE MODE ACTIVE          │
│                                      │
│   Showing 500 cached profiles       │
│   Full search available online      │
│                                      │
│   [Go Online] [Continue Offline]    │
└─────────────────────────────────────┘
```

### Low Bandwidth Adaptation
```
Network: Slow (2G detected)
Adaptation:
- Load text first
- Thumbnails only
- Videos on demand
- Batch operations queued
```

### One-Handed Operation
```
Bottom Navigation Zone (Thumb reach):
┌─────────────────────────────────────┐
│                                      │
│         Content Area                 │
│                                      │
├─────────────────────────────────────┤
│   [Pass]  [Shortlist]  [Details]    │
└─────────────────────────────────────┘
```

## Performance Metrics

### Speed Targets
- Search execution: <2 seconds
- Result rendering: <500ms
- Image loading: <1 second
- Profile switch: <200ms
- Filter application: <300ms

### Accuracy Metrics
- Relevance score: >85%
- False positive rate: <10%
- User satisfaction: >4.5/5
- Shortlist conversion: >60%

### Engagement Tracking
- Profiles viewed per session: 15-20
- Shortlist rate: 15-20%
- Time to shortlist: <2 minutes
- Return search rate: 30%
- Filter usage: 60%

## Error States & Recovery

### No Results Found
```
┌─────────────────────────────────────┐
│     No exact matches found 😔        │
│                                      │
│   But here are similar options:     │
│                                      │
│   [Show Similar] [Modify Search]    │
│   [Expand Criteria] [Get Help]      │
└─────────────────────────────────────┘
```

### Network Error
```
┌─────────────────────────────────────┐
│   Connection lost during search      │
│                                      │
│   [Retry] [Work Offline] [Save]     │
└─────────────────────────────────────┘
```

### Rate Limit
```
AI: "You're searching very fast! Let me process
     these results first. Ready in 5 seconds..."
```

## Implementation Notes

### Technical Stack
- Vector search: Qdrant
- Image processing: Claude Vision API
- Voice: Web Speech API + Indian accents
- Real-time: WebSocket connections
- Caching: Redis for results

### Data Requirements
- Actor profiles: 50,000+
- Update frequency: Real-time
- Search index: <100ms rebuild
- Image storage: CDN distributed
- Video previews: Adaptive bitrate