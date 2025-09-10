# Audition Management User Flow
## Complete Audition Lifecycle Management

### Flow Overview
The audition management flow orchestrates the entire audition process from scheduling through feedback collection, optimizing for Mumbai's fast-paced casting environment where efficiency and coordination are critical.

## User Journey Map

### Phase 1: Audition Planning (0-60 seconds)

#### Entry Points
- From shortlist: "Schedule auditions for these actors"
- From calendar: "Set up auditions for next week"
- AI suggestion: "Your shortlisted actors are available Tuesday"
- Quick action: "Bulk schedule auditions"

#### Step 1.1: Availability Coordination
**AI Prompt:**
```
"I'll coordinate auditions for your 5 shortlisted actors. 
Checking their availability for this week..."
```

**AI Analysis:**
```
"Here's what I found:
✓ Tuesday (3): Arjun, Rahul, Priya can come
✓ Wednesday (4): All except Vikram available  
⚠ Thursday: Ganesh Chaturthi - avoid scheduling
✓ Friday (5): All available

Suggested: Wednesday at Casting Bay, Andheri
10 AM - 2 PM (4 actors, 45 mins each)
```

#### Step 1.2: Smart Scheduling
**AI Considerations:**
- Mumbai traffic patterns
- Actor locations
- Studio availability
- Team calendars
- Meal breaks
- Festival calendar

**User Confirmation:**
"Book Wednesday at Casting Bay"

**AI Response:**
```
"Perfect! I'm booking:
- Casting Bay, Andheri for Wednesday
- 4 audition slots (45 mins each)
- Sending confirmations to actors
- Adding to team calendars
- Preparing audition materials
```

### Phase 2: Pre-Audition Preparation (Day Before)

#### Step 2.1: Automated Reminders
**AI Actions:**
```
"Tomorrow's auditions are set. I've:
✓ Sent WhatsApp reminders to all actors
✓ Shared scripts and sides
✓ Confirmed studio booking
✓ Reminded team members
✓ Prepared feedback forms

Anything specific you want actors to prepare?"
```

#### Step 2.2: Material Distribution
**AI Manages:**
- Script excerpts (watermarked)
- Character briefs
- Mood references
- Parking/location details
- Contact numbers

### Phase 3: Audition Day Management (Real-time)

#### Step 3.1: Day-of Coordination
**AI Morning Brief (8 AM):**
```
"Good morning! Auditions start at 10 AM.
📍 Casting Bay is ready
👥 Raj (Director) confirmed attendance
🎭 4 actors confirmed
📱 Arjun running 15 mins late (traffic)

Shall I adjust the schedule?"
```

#### Step 3.2: Live Schedule Management
**Real-time Updates:**
```
10:15 AM: "Arjun has arrived, starting his audition"
10:55 AM: "Arjun finished. Rahul up next"
11:00 AM: "Starting Rahul's audition"
11:40 AM: "Vikram just messaged - can he come today instead?"
```

**Dynamic Adjustments:**
- Swap time slots
- Add walk-ins
- Handle no-shows
- Extend promising auditions

#### Step 3.3: Capture & Documentation
**During Each Audition:**
```
AI creates:
- Time stamps
- Video markers for key moments
- Director's live comments
- Team reactions
- Technical notes
```

**AI Assistant Mode:**
```
"Recording Priya's emotional scene... marked at 00:03:45
Raj says 'excellent take' - saved as highlight"
```

### Phase 4: Immediate Feedback (Post-audition)

#### Step 4.1: Quick Capture
**Post Each Audition:**
```
"How did Arjun's audition go?"

Quick Rating: ⭐⭐⭐⭐⭐
Voice note: [30 second summary]
Key points:
✓ Great screen presence
✓ Excellent dialogue delivery  
⚠ Height might be issue with female lead
```

#### Step 4.2: Comparative Notes
**AI Prompts:**
```
"Arjun vs Rahul for the intensity required?"
"Who had better chemistry read?"
"Any concerns to note?"
```

### Phase 5: Review & Analysis (Same day)

#### Step 5.1: Compiled Review
**AI Summary (5 PM):**
```
"Today's auditions complete! Here's the summary:

ATTENDED: 4/4 actors
STRONG CONTENDERS: 2 (Arjun, Priya)
CALLBACKS NEEDED: 1 (Rahul - different scene)
NOT SUITABLE: 1 (Vikram - too mature)

Video highlights compiled (12 mins total)
All feedback collected
Team consensus needed on Arjun vs Rahul
```

#### Step 5.2: Team Discussion
**AI Facilitates:**
```
"I'll set up a quick review call:
- Sharing audition highlights
- Side-by-side comparisons ready
- Feedback forms compiled
- Decision framework prepared

When can the team connect?"
```

### Phase 6: Follow-up Actions (Next 24 hours)

#### Step 6.1: Communication
**AI Handles:**
```
SELECTED: "Congratulations! You've been selected for..."
CALLBACK: "We'd like to see you again for..."
WAITLIST: "We were impressed and will keep you in mind..."
REJECTED: "Thank you for auditioning. We'll consider you for future..."
```

#### Step 6.2: Next Steps
**For Selected:**
- Contract preparation
- Availability confirmation
- Costume trials scheduling
- Read-through planning

**For Callbacks:**
- New scene selection
- Schedule coordination
- Specific preparation notes

## Audition Formats Supported

### In-Person Auditions
- Studio bookings
- Travel coordination
- Equipment setup
- Safety protocols

### Virtual Auditions
```
AI Setup:
"I'll send Zoom links with:
- Self-tape guidelines
- Lighting tips
- Frame requirements
- Upload instructions"
```

### Self-Tape Reviews
```
AI Organization:
"12 self-tapes received. I've organized by:
- Role type
- Submission time
- Technical quality
- First impressions"
```

## Feedback Management System

### Structured Feedback
```json
{
  "audition": {
    "talent_id": "t001",
    "datetime": "2025-03-15T10:00:00",
    "duration": "45_minutes",
    "feedback": {
      "performance": {
        "dialogue": 4,
        "emotion": 5,
        "physicality": 3,
        "improvisation": 4
      },
      "suitability": {
        "look": "perfect_fit",
        "age_appearance": "appropriate",
        "chemistry_potential": "high",
        "character_understanding": "excellent"
      },
      "technical": {
        "punctuality": "on_time",
        "preparedness": "well_prepared",
        "professionalism": "high",
        "direction_taking": "excellent"
      },
      "decision": "shortlist_final",
      "notes": "Strong contender, check availability for full schedule"
    }
  }
}
```

### Feedback Aggregation
**AI Analysis:**
```
"Based on all feedback:
- Arjun: 4.5/5 average (Raj: 5, Priya: 4, You: 4.5)
- Rahul: 4.0/5 average (Raj: 4, Priya: 4, You: 4)
- Team prefers Arjun (3 votes vs 1)"
```

## Batch Operations

### Bulk Scheduling
```
"Schedule all 20 supporting actors:
- Batch by role type
- 15-minute slots
- Across 2 days
- Auto-send invites"
```

### Group Auditions
```
"Chemistry reads for ensemble:
- 5 actors together
- Improvisation scene
- Extended 90-min slot
- Multiple camera angles"
```

## Calendar Integration

### Multi-Calendar Sync
- Google Calendar
- Outlook
- Apple Calendar
- Production schedules
- Personal calendars

### Smart Scheduling
```
AI Checks:
- Team availability
- Actor conflicts
- Studio bookings
- Traffic patterns
- Meal timings
- Prayer timings
```

## Communication Workflows

### Actor Communications
```
Channels:
- WhatsApp (primary)
- Email (documentation)
- SMS (urgent)
- App notifications
```

### Team Updates
```
Real-time:
- Running late alerts
- Schedule changes
- Standout performances
- Issues requiring attention
```

## Mumbai-Specific Optimizations

### Location Intelligence
```
"Arjun lives in Malad, studio in Andheri.
Travel time: 45 mins in morning traffic.
Suggested slot: 11 AM (post-peak hours)"
```

### Cultural Sensitivities
```
"Tomorrow is Ekadashi - Priya mentioned she's fasting.
Shall I schedule her early morning slot?"
```

### Weather Awareness
```
"Heavy rain warning for afternoon.
Recommend moving outdoor auditions inside or
shifting to morning slots"
```

## Success Metrics

### Efficiency Metrics
- Setup time: <5 minutes for 10 auditions
- No-show rate: <5%
- Schedule adherence: >90%
- Feedback capture: 100%

### Quality Metrics
- Right talent selected: >80%
- Callback necessity: <20%
- Team satisfaction: >4.5/5
- Actor experience: >4.5/5

## Error Handling

### No-Shows
```
AI Response:
"Vikram hasn't arrived (30 mins late).
Options:
1. Call him now
2. Move to next actor
3. Offer virtual audition
4. Reschedule for tomorrow"
```

### Technical Issues
```
"Video recording failed for last audition.
I have audio and notes saved.
Should we do a quick retake of key scenes?"
```

### Double Bookings
```
"Conflict detected: Rahul already auditioning
for another production at same time.
I can negotiate alternative slots."
```

## Mobile Experience

### On-the-Go Management
- Voice notes for feedback
- Quick ratings
- Photo captures
- Schedule adjustments
- Team messaging

### Offline Capability
- Cache schedules
- Store feedback locally
- Sync when connected
- Continue recording