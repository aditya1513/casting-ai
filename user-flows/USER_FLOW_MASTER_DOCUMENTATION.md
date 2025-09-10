# CastMatch AI - User Flow Master Documentation
## Conversational Casting Platform for Mumbai OTT Industry

**Version:** 1.0  
**Date:** January 2025  
**Platform Philosophy:** "Talk, Don't Click"  
**Primary Innovation:** Natural language driven casting workflows  

---

## Table of Contents

1. [User Personas](#user-personas)
2. [Onboarding Flow](#1-onboarding-flow)
3. [Daily Workflow](#2-daily-workflow)
4. [Project Creation Flow](#3-project-creation-flow)
5. [Talent Discovery Flow](#4-talent-discovery-flow)
6. [Audition Scheduling Flow](#5-audition-scheduling-flow)
7. [Collaborative Decision Flow](#6-collaborative-decision-flow)
8. [Success Metrics](#success-metrics)

---

## User Personas

### Primary: Priya Sharma - Senior Casting Director
- **Age:** 35-45 years
- **Tech Comfort:** Moderate (prefers voice over typing)
- **Experience:** 15+ years in Mumbai film industry
- **Daily Tasks:** 10-15 casting decisions, 5-8 stakeholder calls
- **Pain Points:** Time pressure, managing multiple projects, stakeholder alignment
- **Success Metrics:** Reducing casting time from 30 to 10 days
- **Preferred Interaction:** Voice commands with visual confirmations

### Secondary: Arjun Mehta - Emerging Casting Assistant
- **Age:** 24-30 years
- **Tech Comfort:** High (digital native)
- **Experience:** 2-5 years in OTT casting
- **Daily Tasks:** Research, scheduling, talent database management
- **Pain Points:** Manual coordination, lack of industry connections
- **Success Metrics:** Automating 70% of administrative tasks
- **Preferred Interaction:** Quick text commands with keyboard shortcuts

### Tertiary: Meera Kapoor - Producer
- **Age:** 40-50 years
- **Tech Comfort:** Low (needs simplicity)
- **Experience:** 20+ years in production
- **Daily Tasks:** Budget approvals, final casting decisions
- **Pain Points:** Lack of visibility, delayed decisions
- **Success Metrics:** Budget efficiency, faster approvals
- **Preferred Interaction:** Executive summaries via voice briefings

---

## 1. Onboarding Flow

### Journey Overview
First-time setup transforming new users into power users within 15 minutes through conversational guidance.

### Entry Points
- Marketing website signup
- Production house invitation
- Team member invitation
- Industry referral link

### Conversational Flow Sequence

#### Step 1: Welcome & Context Gathering
**AI Assistant:** "Welcome to CastMatch! I'm your AI casting assistant. Let's get you set up in just a few minutes. First, tell me about yourself - are you a casting director, producer, or part of a casting team?"

**User Response Types:**
- Voice: "I'm a senior casting director"
- Text: "Casting director working on web series"
- Selection: Tap predefined role card

**Emotional State:** Curious but skeptical (new platform anxiety)

#### Step 2: Personalization Setup
**AI Assistant:** "Great! I'll customize CastMatch for casting directors. What type of projects do you typically work on?"

**Branching Logic:**
- Web Series → Enable episodic features
- Films → Focus on lead role workflows  
- Advertisements → Quick turnaround tools
- Multiple → Full feature access

**Emotional State:** Engaged (seeing relevance)

#### Step 3: Project Import
**AI Assistant:** "Do you have a current project we can start with? I can import your script or brief."

**Options Presented:**
1. Upload script (PDF/Word)
2. Paste character brief
3. Voice describe project
4. Start with demo project
5. Skip for now

**Error Handling:**
- Invalid file: "I couldn't read that file. Can you try a PDF or describe the project to me?"
- Network error: Auto-retry with offline mode option

**Emotional State:** Building confidence

#### Step 4: AI Capabilities Demo
**AI Assistant:** "Let me show you what I can do. From your script, I've identified 8 characters. Should I create casting briefs for each?"

**Interactive Demo:**
- AI extracts characters
- Shows understanding of requirements
- Demonstrates memory: "I'll remember your preferences"

**Emotional State:** Impressed (seeing value)

#### Step 5: Team Setup
**AI Assistant:** "Who else works with you on casting decisions? I can invite them."

**Smart Suggestions:**
- Auto-suggest from email contacts
- Production house directory
- Skip with "I'll add them later"

**Emotional State:** Completing setup satisfaction

### Mobile-Specific Adaptations
- Voice-first interaction
- Swipe gestures for navigation
- Bottom sheet for options
- Progressive disclosure of features
- Offline capability for script upload

### Success Criteria
- Completion rate: >80% within first session
- Time to first value: <5 minutes
- Feature activation: 3+ features used in first week
- Return rate: Daily active use within 3 days

---

## 2. Daily Workflow

### Journey Overview
Morning routine establishing CastMatch as the command center for all casting activities.

### Daily Entry Sequence

#### 9:00 AM - Proactive Morning Briefing
**AI Assistant:** "Good morning Priya! Here's your casting day: You have 3 auditions scheduled, 2 pending approvals, and I found 5 new talents matching your Netflix project requirements. Should I brief you?"

**User States:**
- Rushed: "Just the urgent items"
- Detailed: "Give me everything"
- Focused: "Start with the Netflix project"

**Emotional State:** Morning stress/anticipation

#### 9:15 AM - Priority Triage
**AI Assistant:** "The Netflix director wants to see more options for the lead role by noon. I've shortlisted 8 actors based on your previous selections. Want to review?"

**Decision Points:**
1. Review now (immediate action)
2. Schedule for later (time blocking)
3. Delegate to assistant (task distribution)
4. Quick approve (trust AI selection)

**Emotional State:** Focused productivity

#### 10:00 AM - Active Casting Session
**Natural Language Commands:**
- "Show me actors similar to Rajkummar Rao"
- "Find someone who can speak Tamil and Hindi"
- "I need a 25-30 year old for a negative role"
- "Who's available next Tuesday for auditions?"

**AI Responses:**
- Instant results with reasoning
- Proactive suggestions: "Also consider..."
- Memory callbacks: "Like the actor you loved last week..."

**Emotional State:** Creative flow state

#### 2:00 PM - Collaboration Checkpoint
**AI Assistant:** "Your team has provided feedback on this morning's shortlist. 3 actors have unanimous approval. Should I schedule their auditions?"

**Collaborative Features:**
- Real-time team notifications
- Async feedback collection
- Conflict resolution suggestions
- Stakeholder preference learning

**Emotional State:** Team coordination satisfaction

#### 6:00 PM - Daily Wrap-up
**AI Assistant:** "Today you reviewed 45 profiles, shortlisted 12 actors, and scheduled 8 auditions. Tomorrow's priority is the Amazon project callbacks. Want me to prepare tonight?"

**End-of-day Options:**
- Email summary to team
- Prepare tomorrow's materials
- Set morning reminders
- Log off completely

**Emotional State:** Accomplishment and closure

### Mobile Workflow Optimizations
- One-thumb operation for common tasks
- Voice commands while commuting
- Notification-driven actions
- Quick swipe decisions
- Offline sync for review mode

### Success Metrics
- Daily active usage: >85%
- Task completion rate: >90%
- Time saved: 3+ hours daily
- Decision velocity: 2x faster
- Team satisfaction: >4.5/5

---

## 3. Project Creation Flow

### Journey Overview
Transform script to casting-ready project in under 10 minutes through intelligent extraction and setup.

### Initiation Methods
1. **Script Upload:** Drag-drop or browse
2. **Voice Brief:** Describe project naturally
3. **Template Selection:** Previous similar projects
4. **Manual Entry:** Step-by-step guided form
5. **Import:** From production house systems

### Conversational Project Setup

#### Step 1: Project Context
**AI Assistant:** "I see you've uploaded 'Mumbai Monsoon Murders.' This looks like a crime thriller series. Let me analyze the script for you."

**AI Processing:**
- Character extraction (15 seconds)
- Relationship mapping
- Scene analysis
- Budget inference
- Timeline detection

**User Feedback Loop:**
- Confirm AI understanding
- Correct misinterpretations
- Add missing context

**Emotional State:** Anticipation during processing

#### Step 2: Character Definition
**AI Assistant:** "I found 12 characters with speaking roles. Here's what I understood:"

**Character Cards Display:**
```
Lead Detective Asha Verma
- Age: 35-40
- Key traits: Sharp, troubled past
- Screen time: 60%
- Similar to: Kate Winslet in Mare of Easttown
```

**User Actions:**
- Confirm/Edit each character
- Set priority levels
- Add specific requirements
- Mark for later review

**Emotional State:** Engaged in creative process

#### Step 3: Casting Parameters
**AI Assistant:** "What's your casting approach for this project?"

**Smart Options:**
- **Budget Range:** ₹50L-1Cr (auto-suggested)
- **Timeline:** 3 weeks (based on production date)
- **Talent Pool:** Fresh faces / Established / Mixed
- **Location:** Mumbai-based / Open to relocation
- **Languages:** Hindi, English, Marathi

**Emotional State:** Strategic planning mode

#### Step 4: Team Assignment
**AI Assistant:** "Who should have access to this project?"

**Intelligent Suggestions:**
- Previous collaborators
- Production house defaults
- Department heads
- External stakeholders

**Permission Levels:**
- View only
- Comment and suggest
- Approve selections
- Full admin access

**Emotional State:** Organizational satisfaction

#### Step 5: AI Strategy Setup
**AI Assistant:** "How can I best help with this project?"

**AI Behavior Options:**
- **Proactive:** Daily suggestions and updates
- **Responsive:** Only when asked
- **Collaborative:** Real-time during sessions
- **Autonomous:** Handle routine tasks

**Emotional State:** Empowerment and control

### Error Recovery Paths

#### Script Processing Failure
**AI Assistant:** "I'm having trouble reading page 45-50. Can you help me understand what happens in these scenes?"

**Recovery Options:**
- Re-upload specific pages
- Voice describe the scenes
- Skip and continue
- Manual character entry

#### Network Interruption
- Auto-save every 30 seconds
- Offline mode activation
- Resume from last point
- Email draft backup

### Mobile-Specific Features
- Camera scan for physical scripts
- Voice-only project creation
- Simplified character cards
- Gesture-based priority setting
- Quick share to WhatsApp

### Success Criteria
- Setup completion: <10 minutes
- Character accuracy: >95%
- Zero data loss rate
- Team invitation acceptance: >80%
- Project activation: Same day casting start

---

## 4. Talent Discovery Flow

### Journey Overview
Natural language search to shortlist in under 2 minutes with AI understanding context and preferences.

### Search Initiation Methods

#### Method 1: Conversational Search
**User:** "I need someone like Nawazuddin but younger and less expensive"

**AI Processing:**
- Understand reference (acting style)
- Parse constraints (age, budget)
- Apply project context
- Search similar profiles

**AI Response:** "I found 12 actors with similar intensity and method acting background, age 25-35, within ₹5-10L budget. Here are the top 3..."

**Emotional State:** Exploratory curiosity

#### Method 2: Image-Based Search
**User:** *Uploads reference photo*

**AI Assistant:** "I see you're looking for someone with sharp features and intense eyes. Is this for the antagonist role?"

**Visual Analysis:**
- Facial structure matching
- Expression analysis
- Style inference
- Age estimation

**Emotional State:** Visual creativity

#### Method 3: Voice Description
**User:** *Voice note* "Find me a bubbly girl, early twenties, can dance, speaks English fluently"

**AI Understanding:**
- Personality traits
- Skill requirements
- Language proficiency
- Age range

**Emotional State:** Conversational ease

### Discovery Interaction Flow

#### Stage 1: Initial Results
**AI Presentation:**
"Here are 8 perfect matches for your requirements:"

**Result Cards:**
- Hero image with video preview
- Match percentage with reasoning
- Availability indicator
- Quick stats (age, location, rate)
- Similar projects done

**User Actions:**
- Swipe right: Shortlist
- Swipe left: Pass
- Tap: Detailed view
- Long press: Compare mode

**Emotional State:** Evaluative focus

#### Stage 2: Refinement
**AI Assistant:** "I notice you're selecting actors with theater background. Should I prioritize stage experience?"

**Dynamic Filtering:**
- AI learns preferences
- Suggests new criteria
- Adjusts results real-time
- Remembers for future

**Emotional State:** Collaborative discovery

#### Stage 3: Deep Dive
**User:** "Tell me more about Arjun Khanna"

**AI Comprehensive Brief:**
- Recent work analysis
- Director feedback quotes
- Social media presence
- Availability calendar
- Rate negotiation history
- Compatibility assessment

**Emotional State:** Detailed evaluation

#### Stage 4: Comparison Mode
**AI Assistant:** "You're comparing 3 actors for the lead. Let me show you side-by-side."

**Comparison Matrix:**
- Acting range videos
- Previous role clips
- Schedule compatibility
- Budget implications
- Team preferences
- Risk assessment

**Emotional State:** Decision confidence

#### Stage 5: Shortlist Creation
**AI Assistant:** "You've shortlisted 5 actors. Should I create a presentation for the director?"

**Auto-Generated Assets:**
- PDF presentation
- Video montage
- Comparison sheet
- Budget breakdown
- Scheduling options

**Emotional State:** Accomplishment

### Advanced Discovery Features

#### Predictive Suggestions
**AI Assistant:** "Based on your Netflix project's tone, you might also like these actors you haven't considered..."

#### Availability Matching
**AI Assistant:** "3 of your shortlisted actors are free next week. Should I block their dates?"

#### Budget Optimization
**AI Assistant:** "If you cast Actor A as lead, you can afford Actors B and C for supporting roles within budget."

### Mobile Discovery Optimizations
- Tinder-style swiping
- Voice search while walking
- Offline profile caching
- Quick video previews
- Instagram-style stories for portfolios

### Success Metrics
- Search to shortlist: <2 minutes
- Relevance score: >90%
- Discovery satisfaction: >4.5/5
- New talent discovery: 30% unknown actors
- Conversion to audition: >60%

---

## 5. Audition Scheduling Flow

### Journey Overview
Coordinate complex multi-stakeholder auditions with zero conflicts through conversational scheduling.

### Scheduling Initiation

#### Natural Language Scheduling
**User:** "Schedule auditions for the shortlisted actors next Tuesday afternoon"

**AI Processing:**
- Check actor availability
- Find venue options
- Coordinate team calendars
- Generate time slots
- Send invitations

**AI Response:** "I can schedule 5 actors between 2-6 PM at Casting Bay Studio. The director is free 3-5 PM. Should I confirm?"

**Emotional State:** Relief from complexity

### Detailed Scheduling Flow

#### Step 1: Availability Analysis
**AI Assistant:** "Checking availability for 8 shortlisted actors..."

**Real-time Status:**
```
✓ Arjun Khanna - Available all day
✓ Priya Mehta - Free after 3 PM
⚠ Raj Singh - Tentative (other audition)
✗ Sara Ali - Out of town
✓ 4 others available
```

**Conflict Resolution:**
- Suggest alternative dates
- Offer video audition option
- Prioritize must-see talent
- Create waiting list

**Emotional State:** Problem-solving mode

#### Step 2: Venue Coordination
**AI Assistant:** "Casting Bay Studio is available and within budget. They have 2 rooms. Want parallel auditions?"

**Venue Considerations:**
- Location accessibility
- Equipment availability
- Budget constraints
- Parking facilities
- COVID protocols

**Emotional State:** Logistical planning

#### Step 3: Team Coordination
**AI Assistant:** "The director can only attend 3-5 PM. Should I schedule priority actors in that window?"

**Stakeholder Management:**
- Director availability
- Producer drop-ins
- Casting team shifts
- Video call-ins
- Feedback windows

**Emotional State:** Coordination complexity

#### Step 4: Smart Scheduling
**AI Generated Schedule:**
```
2:00 PM - Arjun Khanna (Lead) - Room A
2:30 PM - Priya Mehta (Lead) - Room A  
3:00 PM - Raj Singh (Support) - Room B
3:30 PM - [Director Joins]
3:30 PM - Top 2 callbacks - Room A
4:30 PM - Final discussions
```

**Optimization Logic:**
- Similar roles grouped
- Travel time considered
- Energy levels managed
- Decision maker presence
- Buffer time included

**Emotional State:** Organized satisfaction

#### Step 5: Communication Dispatch
**AI Assistant:** "I'll send personalized invitations to everyone. Want to add a personal note?"

**Automated Communications:**
- Actor confirmations (SMS + Email)
- Team calendar invites
- Venue booking confirmation
- Script sides distribution
- Parking instructions

**Template Personalization:**
- Actor name usage
- Role-specific information
- Previous interaction reference
- Special instructions
- Warm messaging tone

**Emotional State:** Communication efficiency

### Rescheduling & Adjustments

#### Actor Cancellation
**AI Assistant:** "Raj Singh just cancelled. I can move Sara Ali from waitlist or extend Arjun's audition. What works?"

**Quick Options:**
- Auto-fill from waitlist
- Extend other auditions
- Offer video submission
- Reschedule next day

#### Director Running Late
**AI Assistant:** "The director is delayed by 30 minutes. Should I notify actors and adjust the schedule?"

**Auto-Adjustments:**
- Shift all appointments
- Reorder auditions
- Start without director
- Record for later review

### Day-of Coordination

#### Morning Reminder
**AI Assistant:** "Today's auditions start at 2 PM. All 5 actors confirmed. Scripts sent. Studio is ready. Need anything else?"

#### Real-time Updates
**AI Assistant:** "Arjun just arrived. Should I send him in or wait for full team?"

#### Session Management
- Track actual vs planned times
- Note no-shows
- Log feedback real-time
- Queue management
- Break reminders

### Mobile Scheduling Features
- Tap to confirm slots
- Drag to reschedule  
- Voice commands for changes
- Location-based check-ins
- Quick feedback capture

### Success Metrics
- Scheduling time: <5 minutes
- Conflict rate: <5%
- Attendance rate: >95%
- On-time performance: >85%
- Stakeholder satisfaction: >4.5/5

---

## 6. Collaborative Decision Flow

### Journey Overview
Multi-stakeholder casting decisions made efficiently through structured collaboration and AI-mediated consensus.

### Collaboration Initiation

#### Sharing Shortlist
**User:** "Share the shortlist with the director and producer for feedback"

**AI Assistant:** "I'll create a review package with audition videos, profiles, and my compatibility analysis. Any specific notes to include?"

**Sharing Package:**
- Interactive shortlist
- Audition recordings
- AI assessments
- Budget implications
- Your recommendations

**Emotional State:** Preparation completeness

### Stakeholder Review Process

#### Step 1: Personalized Stakeholder Packages
**AI Customization per Recipient:**

**For Director (Creative Focus):**
- Acting range videos
- Character interpretation
- Chemistry test potential
- Previous work clips
- Method alignment

**For Producer (Business Focus):**
- Budget breakdown
- Availability matrix
- Market value analysis
- Insurance considerations
- PR potential

**For Creative Producer (Hybrid View):**
- Talent-budget optimization
- Creative risk assessment
- Alternative options
- Schedule implications

**Emotional State:** Stakeholder consideration

#### Step 2: Feedback Collection
**AI Assistant:** "The director loved 3 actors, producer approved 2. There's overlap on Arjun Khanna. Should I prioritize him?"

**Feedback Formats:**
- Quick thumbs up/down
- Detailed comments
- Voice notes
- Ranking preferences
- Veto powers

**Feedback Synthesis:**
```
Consensus Actors (All approve):
- Arjun Khanna (Lead)
- Priya Mehta (Support)

Director Only:
- Raj Singh (prefers intensity)

Producer Only:  
- Sara Ali (budget-friendly)

Need Discussion:
- Vikram Sharma (split opinion)
```

**Emotional State:** Consensus building

#### Step 3: Conflict Resolution
**AI Assistant:** "There's disagreement on the female lead. The director wants experience, producer wants fresh face. Here are 2 actors that satisfy both..."

**AI Mediation:**
- Find middle ground options
- Present compromise candidates
- Highlight shared priorities
- Suggest A/B testing
- Facilitate discussion points

**Emotional State:** Diplomatic navigation

#### Step 4: Decision Facilitation
**AI Assistant:** "Based on everyone's feedback, here's the optimal casting that balances creative and business needs:"

**Decision Framework:**
```
RECOMMENDED CASTING:
Lead Role: Arjun Khanna
- Director rating: 9/10
- Producer approval: Yes
- Budget impact: Within range
- Availability: Confirmed

Supporting Role: [2 options]
Option A: Experienced (Director's choice)
Option B: Fresh (Producer's choice)
Suggestion: Audition both
```

**Emotional State:** Decision clarity

#### Step 5: Approval Workflow
**AI Assistant:** "Ready to get final approvals? I'll create an approval form with all decisions documented."

**Approval Chain:**
1. Casting Director sign-off
2. Director creative approval
3. Producer budget approval
4. Legal clearance
5. Actor confirmation

**Smart Tracking:**
- Pending approvals highlighted
- Auto-reminders sent
- Escalation paths defined
- Deadline management
- Audit trail maintained

**Emotional State:** Process completion

### Asynchronous Collaboration

#### Time-Zone Management
**AI Assistant:** "The LA producer is asleep. I'll get their feedback when they wake up and update you."

#### Staged Decisions
**AI Assistant:** "Let's lock the leads now and decide supporting roles after tomorrow's auditions."

#### Iterative Refinement
**AI Assistant:** "Based on Day 1 auditions, the director wants to see 3 more options. Should I schedule them?"

### Collaboration Analytics

#### Decision Patterns
**AI Insight:** "The director consistently prefers theater actors. Should I prioritize stage experience in future searches?"

#### Team Dynamics
**AI Observation:** "Quick decisions happen when you present 3 options max. Want me to limit choices?"

#### Success Tracking
**AI Report:** "Projects with full team consensus have 40% better audience ratings. This casting has 85% consensus."

### Mobile Collaboration Features
- Quick swipe voting
- Voice note feedback
- Real-time notifications
- Offline review mode
- WhatsApp integration

### Success Metrics
- Decision time: <24 hours
- Consensus rate: >80%
- Stakeholder participation: 100%
- Revision cycles: <2
- Satisfaction score: >4.5/5

---

## Success Metrics

### Platform-Wide KPIs

#### Efficiency Metrics
- **Casting Cycle Time:** 30 days → 10 days (67% reduction)
- **Decisions per Day:** 5 → 15 (3x increase)
- **Administrative Time:** 4 hours → 1 hour daily (75% reduction)
- **Audition Scheduling:** 2 hours → 10 minutes (92% reduction)

#### Quality Metrics
- **Talent Match Accuracy:** >85% director satisfaction
- **Discovery Breadth:** 30% new talent per project
- **Budget Adherence:** 95% within allocated budget
- **Stakeholder Alignment:** 80% first-choice consensus

#### User Satisfaction
- **NPS Score:** >70
- **Daily Active Usage:** >85%
- **Feature Adoption:** 5+ features per user
- **Retention Rate:** 95% monthly

#### Business Impact
- **Cost Savings:** 15-20% per project
- **Revenue per User:** ₹50K monthly
- **Market Share:** 30% in 2 years
- **User Growth:** 50% QoQ

### Flow-Specific Success Criteria

#### Onboarding Success
- Completion rate: >80%
- Time to value: <5 minutes
- Return rate: 90% next day

#### Daily Workflow Success
- Task completion: >90%
- Time saved: 3+ hours
- Decision velocity: 2x baseline

#### Project Creation Success
- Setup time: <10 minutes
- Accuracy: >95%
- Same-day activation: 100%

#### Talent Discovery Success
- Search to shortlist: <2 minutes
- Relevance: >90%
- Conversion: >60%

#### Scheduling Success
- Conflict rate: <5%
- Attendance: >95%
- On-time: >85%

#### Collaboration Success
- Decision time: <24 hours
- Consensus: >80%
- Participation: 100%

---

## Implementation Notes

### Technical Requirements
- Natural language processing for all interactions
- Voice recognition with Indian accent support
- Real-time collaboration infrastructure
- Offline-first mobile architecture
- Sub-second response times

### Design Principles
1. **Conversation Over Interface:** Every action through natural dialogue
2. **Anticipatory Intelligence:** AI suggests before user asks
3. **Mobile-First:** Optimized for one-handed use
4. **Inclusive Design:** Accessible to all tech comfort levels
5. **Cultural Sensitivity:** Mumbai film industry conventions

### Next Steps
1. Create detailed wireframes for each flow
2. Build interactive prototypes
3. Conduct user testing with target personas
4. Iterate based on feedback
5. Develop implementation specifications

---

**Document Version:** 1.0
**Last Updated:** January 2025
**Status:** Ready for wireframe design
**Owner:** CastMatch AI Design Team