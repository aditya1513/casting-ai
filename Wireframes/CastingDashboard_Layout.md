# Casting Dashboard Layout - Comprehensive Wireframes

## Overview
Complete wireframe specifications for the casting director's dashboard, including project management, audition scheduling, talent pipeline, and analytics.

## Dashboard Information Architecture

```
Dashboard
├── Overview (Home)
│   ├── Active Projects
│   ├── Today's Schedule
│   ├── Recent Activity
│   └── Quick Actions
├── Projects
│   ├── Project List
│   ├── Project Details
│   ├── Role Management
│   └── Timeline View
├── Auditions
│   ├── Calendar View
│   ├── Schedule Manager
│   ├── Room Booking
│   └── Evaluation Forms
├── Talent Pipeline
│   ├── Application Review
│   ├── Shortlisted
│   ├── Callbacks
│   └── Final Selections
└── Analytics
    ├── Project Metrics
    ├── Talent Insights
    └── Performance Reports
```

---

## 1. Main Dashboard Overview

### Mobile (320px)
```
┌─────────────────────────┐
│ ☰ Dashboard      👤 ▼  │ <- Header with menu
├─────────────────────────┤
│ Welcome, Jennifer       │
│ Tuesday, March 5        │
├─────────────────────────┤
│ TODAY'S FOCUS          │
│ ┌─────────────────────┐ │
│ │ 3 Auditions         │ │
│ │ 9:00 AM - 5:00 PM   │ │
│ │ [View Schedule →]   │ │
│ └─────────────────────┘ │
├─────────────────────────┤
│ ACTIVE PROJECTS (4)     │
│ ┌─────────────────────┐ │
│ │ Summer Campaign     │ │
│ │ ████████░░ 80%     │ │ <- Progress bar
│ │ 12 roles • Due 3/15 │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ TV Pilot Episode    │ │
│ │ ██████░░░░ 60%     │ │
│ │ 8 roles • Due 3/20  │ │
│ └─────────────────────┘ │
│ [View All Projects →]   │
├─────────────────────────┤
│ QUICK ACTIONS           │
│ ┌───────┬───────┐      │
│ │  📝   │  🔍   │      │
│ │Create │Search │      │ <- Action buttons
│ │Project│Talent │      │
│ └───────┴───────┘      │
│ ┌───────┬───────┐      │
│ │  📅   │  📊   │      │
│ │Schedule│Reports│      │
│ │Audition│       │      │
│ └───────┴───────┘      │
├─────────────────────────┤
│ RECENT ACTIVITY         │
│ • Sarah J. applied      │
│   2 mins ago           │ <- Activity feed
│ • Meeting scheduled     │
│   15 mins ago          │
│ • Michael C. shortlisted│
│   1 hour ago           │
└─────────────────────────┘

Annotations:
- Swipe down: Refresh data
- Cards: Tap for detail view
- Progress: Real-time updates
- Priority: Today's focus (1), Projects (2), Actions (3)
```

### Desktop (1440px)
```
┌────────────────────────────────────────────────────────────────────────┐
│ CastMatch  Projects  Auditions  Talent  Analytics  Messages    👤 Jane │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│ Dashboard Overview                                Tuesday, March 5, 2024│
│                                                                        │
│ ┌──────────────────────┬───────────────────┬─────────────────────────┐│
│ │ TODAY'S SCHEDULE     │ PROJECT STATUS    │ NOTIFICATIONS          ││
│ │                      │                   │                        ││
│ │ 9:00  Sarah Johnson  │ Summer Campaign   │ 🔴 3 Urgent           ││
│ │       Role: Lead     │ ████████░░ 80%   │ • Contract pending     ││
│ │                      │ 12/15 roles cast  │ • Schedule conflict    ││
│ │ 10:30 Michael Chen   │                   │ • Budget approval      ││
│ │       Role: Support  │ TV Pilot          │                        ││
│ │                      │ ██████░░░░ 60%   │ 🟡 5 Actions needed   ││
│ │ 2:00  Group Audition │ 8/12 roles cast   │ • Review applications  ││
│ │       5 candidates   │                   │ • Send callbacks       ││
│ │                      │ Feature Film      │                        ││
│ │ [Full Calendar →]    │ ███░░░░░░░ 30%   │ [View All →]          ││
│ │                      │ 3/10 roles cast   │                        ││
│ └──────────────────────┴───────────────────┴─────────────────────────┘│
│                                                                        │
│ ┌────────────────────────────────────┬─────────────────────────────┐ │
│ │ TALENT PIPELINE                    │ ANALYTICS SNAPSHOT          │ │
│ │                                     │                             │ │
│ │ ┌─────────────────────────────────┐│     Applications This Week  │ │
│ │ │ New Applications         □ 47   ││     ┌─────────────────┐    │ │
│ │ │ ├─ Pending Review        24     ││     │ ▁▃▅▇▇▅▃ 📈+15% │    │ │ <- Chart
│ │ │ ├─ Under Consideration   15     ││     └─────────────────┘    │ │
│ │ │ └─ Action Required       8      ││                             │ │
│ │ │                                 ││     Response Rate          │ │
│ │ │ Shortlisted            □ 32    ││     ┌─────────────────┐    │ │
│ │ │ ├─ Callbacks Scheduled  18     ││     │ 78% ████████░░ │    │ │
│ │ │ └─ Awaiting Response    14     ││     └─────────────────┘    │ │
│ │ │                                 ││                             │ │
│ │ │ Final Selection        □ 12    ││     Time to Fill (days)    │ │
│ │ │ ├─ Contracts Sent       8      ││     Lead: 12 | Support: 7  │ │
│ │ │ └─ Confirmed            4      ││                             │ │
│ │ └─────────────────────────────────┘│ [Detailed Analytics →]      │ │
│ │                                     │                             │ │
│ │ [Manage Pipeline →]                │                             │ │
│ └────────────────────────────────────┴─────────────────────────────┘ │
│                                                                        │
│ QUICK ACTIONS                                                         │
│ ┌──────────┬──────────┬──────────┬──────────┬──────────────────────┐│
│ │ + Create │ 🔍 Search│ 📅 Schedule│ 📤 Export│ 📊 Generate Report  ││
│ │  Project │   Talent │  Audition │    Data  │                      ││
│ └──────────┴──────────┴──────────┴──────────┴──────────────────────┘│
└────────────────────────────────────────────────────────────────────────┘

Annotations:
- Layout: Responsive grid, 12-column system
- Widgets: Draggable & customizable
- Updates: Real-time via WebSocket
- Charts: Interactive, drill-down enabled
- Pipeline: Click numbers for filtered view
```

---

## 2. Project Management View

### Mobile (320px)
```
┌─────────────────────────┐
│ ← Projects        + New │
├─────────────────────────┤
│ [Active] [Completed]    │ <- Tab filter
├─────────────────────────┤
│ Search projects...  🔍  │
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │ SUMMER CAMPAIGN 2024│ │
│ │ Film • Commercial   │ │
│ │                     │ │
│ │ ████████░░ 80%     │ │
│ │                     │ │
│ │ 📅 Due: Mar 15     │ │
│ │ 👥 12/15 roles     │ │
│ │ 📋 47 applicants   │ │
│ │                     │ │
│ │ [Open] [⋮ More]    │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ TV PILOT - EPISODE 1│ │
│ │ Television • Drama  │ │
│ │                     │ │
│ │ ██████░░░░ 60%     │ │
│ │                     │ │
│ │ 📅 Due: Mar 20     │ │
│ │ 👥 8/12 roles      │ │
│ │ 📋 89 applicants   │ │
│ │                     │ │
│ │ [Open] [⋮ More]    │ │
│ └─────────────────────┘ │
│                         │
│ + Create New Project    │
└─────────────────────────┘

Annotations:
- Cards: Swipe for quick actions
- Progress: Tap for breakdown
- Sort: By date, progress, priority
- Search: Filter by name, type
```

### Desktop (1440px) - Project Detail View
```
┌────────────────────────────────────────────────────────────────────────┐
│ ← Back to Projects                     Summer Campaign 2024           │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│ Overview | Roles | Timeline | Team | Documents | Settings             │ <- Tabs
│ ────────                                                              │
│                                                                        │
│ ┌──────────────────────────┬─────────────────────────────────────────┐│
│ │ PROJECT INFORMATION      │ PROJECT STATUS                          ││
│ │                          │                                         ││
│ │ Type: Commercial Film    │ Overall Progress                        ││
│ │ Client: Brand X          │ ████████░░░░░░░░ 80% Complete         ││
│ │ Budget: $2.5M           │                                         ││
│ │ Duration: 3 days        │ Milestones                              ││
│ │ Location: NYC, LA       │ ✓ Project kickoff                      ││
│ │                         │ ✓ Role definitions                      ││
│ │ Director: John Smith    │ ✓ Audition schedule                     ││
│ │ Producer: Jane Doe      │ ⟳ Casting in progress                   ││
│ │ Casting: Jennifer Lee   │ ○ Final selections                      ││
│ │                         │ ○ Contract negotiations                  ││
│ │ [Edit Details]          │                                         ││
│ └──────────────────────────┴─────────────────────────────────────────┘│
│                                                                        │
│ ROLES & CASTING STATUS                                               │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ Role          │ Type     │ Status      │ Applications │ Action   │ │
│ ├──────────────────────────────────────────────────────────────────┤ │
│ │ Lead Actor    │ Principal│ ✓ Cast      │ Sarah J.     │ [View]   │ │
│ │ Lead Actress  │ Principal│ ⟳ Callbacks │ 12 candidates│ [Manage] │ │
│ │ Supporting 1  │ Featured │ ⟳ Reviewing │ 24 applicants│ [Review] │ │
│ │ Supporting 2  │ Featured │ ○ Open      │ 0 applicants │ [Promote]│ │
│ │ Background    │ Extra    │ ⟳ Casting   │ 89 applicants│ [Select] │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│ ┌─────────────────────────┬──────────────────────────────────────┐  │
│ │ UPCOMING ACTIVITIES     │ RECENT UPDATES                       │  │
│ │                         │                                      │  │
│ │ Today, 2:00 PM         │ 10:32 AM - Sarah Johnson confirmed  │  │
│ │ Group audition - Room A │ 9:45 AM - 5 new applications        │  │
│ │                         │ 9:12 AM - Schedule updated          │  │
│ │ Tomorrow, 10:00 AM     │ Yesterday - Budget approved         │  │
│ │ Callbacks - Lead role  │ Yesterday - Location confirmed      │  │
│ │                         │                                      │  │
│ │ [View Full Calendar]    │ [View All Updates]                  │  │
│ └─────────────────────────┴──────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘

Annotations:
- Tabs: Lazy loaded content
- Status indicators: Real-time updates
- Actions: Context-sensitive based on role status
- Timeline: Gantt chart view available
- Team: Shows all stakeholders with permissions
```

---

## 3. Audition Scheduler

### Mobile (320px) - Calendar View
```
┌─────────────────────────┐
│ ← Auditions       📅 ▼  │
├─────────────────────────┤
│ ◄ March 2024 ►         │ <- Month navigation
├─────────────────────────┤
│ S  M  T  W  T  F  S    │
│ 25 26 27 28 29 1  2    │
│ 3  4  [5] 6  7  8  9   │ <- Today highlighted
│ 10 11 12 13 14 15 16   │
│ 17 18 19 20 21 22 23   │
│ 24 25 26 27 28 29 30   │
├─────────────────────────┤
│ Today - March 5         │
│                         │
│ 9:00 AM                │
│ ┌─────────────────────┐ │
│ │ Sarah Johnson       │ │
│ │ Lead Role - Project A│ │ <- Appointment card
│ │ Room 201 • 30 min   │ │
│ └─────────────────────┘ │
│                         │
│ 10:30 AM               │
│ ┌─────────────────────┐ │
│ │ Michael Chen        │ │
│ │ Support - Project A │ │
│ │ Room 201 • 45 min   │ │
│ └─────────────────────┘ │
│                         │
│ 2:00 PM                │
│ ┌─────────────────────┐ │
│ │ Group Audition      │ │
│ │ 5 candidates        │ │
│ │ Studio A • 2 hours  │ │
│ └─────────────────────┘ │
│                         │
│ [+ Schedule Audition]   │
└─────────────────────────┘

Annotations:
- Calendar: Tap date to view
- Cards: Swipe for options
- Conflicts: Red highlight
- Available slots: Green dots
```

### Desktop (1440px) - Week View Scheduler
```
┌────────────────────────────────────────────────────────────────────────┐
│ Audition Schedule                    Week of March 4-10, 2024         │
├────────────────────────────────────────────────────────────────────────┤
│ [Month] [Week] [Day]  ◄ March 4-10 ►  [+ New Audition] [⚙ Settings]  │
├────────────────────────────────────────────────────────────────────────┤
│     │ Mon 4    │ Tue 5    │ Wed 6    │ Thu 7    │ Fri 8    │ Sat 9   │
├─────┼──────────┼──────────┼──────────┼──────────┼──────────┼─────────┤
│ 8AM │          │          │          │          │          │         │
│     │          │          │          │          │          │         │
│ 9AM │          │┌────────┐│┌────────┐│          │┌────────┐│         │
│     │          ││Sarah J.│││Team     ││          ││Workshop││         │
│     │          ││Room 201│││Meeting  ││          ││Studio A││         │
│10AM │┌────────┐│└────────┘││Room 101 ││┌────────┐│└────────┘│         │
│     ││Prep    ││┌────────┐│└────────┘││Emma D. ││          │         │
│     ││Meeting │││Michael │││          ││Room 201││┌────────┐│         │
│11AM │└────────┘││Room 201│││┌────────┐│└────────┘││Group   ││         │
│     │          │└────────┘│││Lisa P. ││          ││Audition││         │
│12PM │  LUNCH   │  LUNCH   ││Room 202│││  LUNCH   ││Studio B││         │
│     │          │          │└────────┘│          │└────────┘│         │
│ 1PM │          │          │          │          │          │         │
│     │┌────────┐│          │┌────────┐│┌────────┐│          │         │
│ 2PM ││Review  ││┌────────┐││Callbacks│││Final   ││          │         │
│     ││Session │││Group   │││Room 301│││Selection││          │         │
│ 3PM ││Room 105│││Studio A│││6 people │││Board Rm│││          │         │
│     │└────────┘│└────────┘│└────────┘│└────────┘│          │         │
│ 4PM │          │          │          │          │          │         │
│     │          │          │          │          │          │         │
│ 5PM │          │          │          │          │          │         │
├─────┴──────────┴──────────┴──────────┴──────────┴──────────┴─────────┤
│ Rooms: [201-Available] [202-Available] [Studio A-Booked] [Studio B]   │
│ Staff: [Jennifer-Busy] [Mark-Available] [Susan-Available]             │
└────────────────────────────────────────────────────────────────────────┘

Annotations:
- Drag & drop: Reschedule appointments
- Click slot: Quick add audition
- Conflicts: Red border, warning icon
- Hover: Shows participant details
- Color coding: By project or role type
```

---

## 4. Talent Pipeline Management

### Mobile (320px)
```
┌─────────────────────────┐
│ ← Pipeline      Filter ▼│
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │ NEW (47)            │ │
│ │ ▓▓▓▓▓▓▓▓▓          │ │ <- Visual indicator
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ REVIEWING (24)      │ │
│ │ ▓▓▓▓▓░░░░          │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ SHORTLISTED (18)    │ │
│ │ ▓▓▓▓░░░░░          │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ CALLBACKS (12)      │ │
│ │ ▓▓▓░░░░░░          │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ SELECTED (4)        │ │
│ │ ▓░░░░░░░░          │ │
│ └─────────────────────┘ │
├─────────────────────────┤
│ Recent Activity         │
│ • Moved Sarah to Selected│
│ • Added note to Michael │
│ • Scheduled callback    │
└─────────────────────────┘

Annotations:
- Tap stage: View candidates
- Progress bars: Real-time
- Swipe: Quick actions
- Filter: By project, role
```

### Desktop (1440px) - Kanban Board View
```
┌────────────────────────────────────────────────────────────────────────┐
│ Talent Pipeline - Summer Campaign 2024            [List] [Kanban] [⚙] │
├────────────────────────────────────────────────────────────────────────┤
│ Filter: [All Roles ▼] [All Locations ▼] [Date Range ▼]   🔍 Search   │
├───────────┬───────────┬───────────┬───────────┬────────────┬──────────┤
│ NEW (47)  │REVIEW (24)│SHORTLIST  │CALLBACKS  │SELECTED (4)│REJECTED  │
│           │           │(18)       │(12)       │            │(31)      │
├───────────┼───────────┼───────────┼───────────┼────────────┼──────────┤
│┌─────────┐│┌─────────┐│┌─────────┐│┌─────────┐│┌──────────┐│┌────────┐│
││ Sarah J.│││ Mike C. │││ Emma D. │││ Lisa P. │││ John W.  │││ Amy R. ││
││ Actor   │││ Actor   │││ Model   │││ Actor   │││ Actor    │││ Singer ││
││ NYC     │││ LA      │││ Miami   │││ NYC     │││ Chicago  │││ Boston ││
││         │││         │││         │││         │││          │││        ││
││[Review] │││[Advance]│││[Schedule│││[Select] │││[Contract]│││[Archive││
│└─────────┘│└─────────┘│└─────────┘│└─────────┘│└──────────┘│└────────┘│
│┌─────────┐│┌─────────┐│┌─────────┐│┌─────────┐│┌──────────┐│         │
││ Anna B. │││ Tom H.  │││ Kate M. │││ Dan S.  │││ Mary L.  ││          │
││ Dancer  │││ Model   │││ Actor   │││ Singer  │││ Model    ││          │
││ LA      │││ NYC     │││ Boston  │││ Miami   │││ NYC      ││          │
││         │││         │││         │││         │││          ││          │
││[Review] │││[Advance]│││[Schedule│││[Select] │││[Contract]││          │
│└─────────┘│└─────────┘│└─────────┘│└─────────┘│└──────────┘│          │
│           │           │           │           │            │          │
│[Load More]│[Load More]│[Load More]│[Load More]│            │          │
│           │           │           │           │            │          │
│ Drop here │ Drop here │ Drop here │ Drop here │ Drop here  │Drop here │
└───────────┴───────────┴───────────┴───────────┴────────────┴──────────┘

Annotations:
- Drag & drop: Move between stages
- Cards: Click for quick view
- Bulk actions: Select multiple
- Auto-save: Every change
- Keyboard shortcuts: Arrow keys navigate
```

---

## 5. Analytics Dashboard

### Mobile (320px)
```
┌─────────────────────────┐
│ ← Analytics    Export ↗ │
├─────────────────────────┤
│ [Overview] [Details]    │
├─────────────────────────┤
│ PROJECT METRICS         │
│ ┌─────────────────────┐ │
│ │ Time to Fill        │ │
│ │ ▁▃▅▇▅▃▁            │ │ <- Sparkline
│ │ Avg: 14 days ↓20%  │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ Application Rate    │ │
│ │ ▁▂▄▆▇▇▆            │ │
│ │ 47/role ↑15%       │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ Acceptance Rate     │ │
│ │ ████████░░ 78%     │ │
│ │ Industry avg: 65%   │ │
│ └─────────────────────┘ │
├─────────────────────────┤
│ TOP SOURCES             │
│ 1. Direct Apply (45%)  │
│ 2. Agent Referral (30%)│
│ 3. Social Media (15%)  │
│ 4. Job Boards (10%)    │
├─────────────────────────┤
│ [Generate Report]       │
└─────────────────────────┘

Annotations:
- Swipe: Navigate metrics
- Tap: Drill down details
- Export: PDF/CSV options
- Period: Adjustable range
```

### Desktop (1440px) - Full Analytics
```
┌────────────────────────────────────────────────────────────────────────┐
│ Analytics & Insights           Period: [Last 30 Days ▼] [Export] [⚙]  │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│ ┌──────────────────────────────┬─────────────────────────────────────┐│
│ │ CASTING FUNNEL               │ TIME METRICS                        ││
│ │                              │                                     ││
│ │ Applications    ████████ 523 │   ┌─────────────────────────┐      ││
│ │ ↓                            │   │ Days to Fill by Role    │      ││
│ │ Reviewed        ██████ 412   │   │ ▂▄▆█▆▄▂▁ ▁▂▄▆█▆▄▂     │      ││
│ │ ↓                            │   │ Lead: 18d | Support: 12d│      ││
│ │ Shortlisted     ████ 186     │   └─────────────────────────┘      ││
│ │ ↓                            │                                     ││
│ │ Callbacks       ██ 89        │   Response Time (Hours)            ││
│ │ ↓                            │   ┌─────────────────────────┐      ││
│ │ Selected        █ 47         │   │ ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁       │      ││
│ │                              │   │ Avg: 4.2h | Target: 6h │      ││
│ │ Conversion: 9%               │   └─────────────────────────┘      ││
│ └──────────────────────────────┴─────────────────────────────────────┘│
│                                                                        │
│ ┌────────────────────────┬───────────────────┬──────────────────────┐│
│ │ SOURCE ANALYSIS        │ ROLE PERFORMANCE  │ GEOGRAPHICAL DIST.   ││
│ │                        │                   │                      ││
│ │ ┌──────────────────┐  │ Role      | Apps  │  NYC     ████ 45%   ││
│ │ │   Pie Chart      │  │ ─────────────────  │  LA      ███ 30%    ││
│ │ │                  │  │ Lead      | 127   │  Chicago ██ 15%     ││
│ │ │ Direct: 45%     │  │ Support   | 89    │  Miami   █ 7%       ││
│ │ │ Agents: 30%     │  │ Extra     | 234   │  Other   █ 3%       ││
│ │ │ Social: 15%     │  │ Voice     | 45    │                      ││
│ │ │ Boards: 10%     │  │ Dancer    | 28    │  [View Map →]        ││
│ │ └──────────────────┘  │                   │                      ││
│ └────────────────────────┴───────────────────┴──────────────────────┘│
│                                                                        │
│ KEY INSIGHTS                                                          │
│ • Application rate increased 15% after social media campaign          │
│ • NYC talent pool most responsive (78% response rate)                 │
│ • Lead roles taking 50% longer to fill than last quarter             │
│ • Agent referrals have highest quality score (4.2/5)                 │
│                                                                        │
│ [Download Full Report] [Schedule Weekly Report] [Share Dashboard]     │
└────────────────────────────────────────────────────────────────────────┘

Annotations:
- Charts: Interactive, hover for details
- Filters: Real-time data updates
- Export: Multiple formats available
- Insights: AI-generated recommendations
- Comparison: Period-over-period analysis
```

---

## Navigation Structure

### Mobile Navigation (Bottom Tab Bar)
```
┌─────────────────────────┐
│                         │
│     Main Content        │
│                         │
├─────┬─────┬─────┬─────┤
│  🏠 │  📁 │  👥 │  📊 │ <- Fixed bottom nav
│ Home│ Proj│Talent│ More│
└─────┴─────┴─────┴─────┘

More Menu Expanded:
├── Analytics
├── Messages
├── Calendar
├── Settings
└── Help
```

### Desktop Navigation (Top + Sidebar)
```
┌────────────────────────────────────┐
│ Logo  Projects Auditions Analytics │ <- Top nav
├────┬────────────────────────────────┤
│    │                                │
│ 🏠 │     Main Content Area         │ <- Sidebar + content
│ 📁 │                                │
│ 👥 │                                │
│ 📊 │                                │
│ 💬 │                                │
│ ⚙  │                                │
└────┴────────────────────────────────┘
```

---

## Component States & Interactions

### Loading States
```
Initial:  [░░░░░░░░░░] <- Skeleton
Progress: [████░░░░░░] <- Progress bar
Complete: [Content shown]
Error:    [⚠ Retry]
```

### Form Elements
```
Input Default:  [_____________]
Input Active:   [Text here|___]
Input Error:    [Text_________] ⚠
Input Success:  [Text_________] ✓

Select Default: [Choose... ▼]
Select Open:    [Choose... ▲]
                ├─ Option 1
                ├─ Option 2
                └─ Option 3

Toggle Off:     [○----]
Toggle On:      [----●]
```

### Notification Types
```
Success: ✅ Action completed successfully
Warning: ⚠️ Please review this item
Error:   ❌ Unable to complete action
Info:    ℹ️ New features available
```

---

## Responsive Breakpoints

```
Mobile:     320px - 767px
Tablet:     768px - 1023px
Desktop:    1024px - 1439px
Wide:       1440px+
```

---

## Performance Requirements

- **Initial Load**: < 3 seconds
- **Interaction Response**: < 100ms
- **Data Updates**: < 500ms
- **Search Results**: < 1 second
- **Dashboard Refresh**: < 2 seconds

---

## Accessibility Standards

- **WCAG 2.1 Level AA Compliance**
- **Keyboard Navigation**: Full support
- **Screen Readers**: ARIA labels
- **Color Contrast**: 4.5:1 minimum
- **Focus Management**: Visible indicators
- **Error Handling**: Clear messaging

---

## Implementation Priority

1. **Phase 1**: Core Dashboard, Project List
2. **Phase 2**: Talent Pipeline, Basic Analytics
3. **Phase 3**: Advanced Scheduling, Detailed Analytics
4. **Phase 4**: Collaboration Features, Automation