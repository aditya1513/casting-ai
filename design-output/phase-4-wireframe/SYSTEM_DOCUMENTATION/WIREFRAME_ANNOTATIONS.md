# Wireframe Annotations - Behavioral Specifications

## Executive Summary
This document provides comprehensive behavioral specifications for all wireframe components in the CastMatch AI system. Each annotation explains interaction patterns, state changes, content requirements, and Mumbai-specific adaptations.

## Navigation Behaviors

### Top Navigation Bar
**Desktop Behavior:**
- Logo click: Return to main dashboard
- Project context dropdown: Show recent projects with search
- Notifications: Slide-out panel with real-time updates
- Profile menu: Dropdown with settings, logout, account options
- Search: Expandable search bar with voice input option

**Mobile Behavior:**
- Back button: Slide transition to previous screen
- Title area: Long press for project switching
- Action buttons: 44px touch targets with haptic feedback
- Search: Full-screen overlay with voice-first input

### Bottom Navigation (Mobile Only)
**Interaction Patterns:**
- Tab switching: Immediate content load with slide animation
- Active state: Color change + haptic feedback
- Badge indicators: Red dot for notifications, number for counts
- Long press: Quick actions menu for each tab
- Double tap: Return to top of current section

## Chat Interface Behaviors

### Message Input Area
**Text Input:**
- Auto-resize: Expands from 1 to 4 lines maximum
- Placeholder text: Context-aware suggestions
- Send button: Only enabled when text present
- Character limit: 1000 characters with visual countdown
- Typing indicators: Shows when user is typing

**Voice Input:**
- Single tap: Start/stop recording
- Long press: Push-to-talk mode
- Visual feedback: Pulsing animation during recording
- Audio waveform: Real-time visualization during recording
- Language detection: Automatic Hindi/English recognition
- Error handling: Clear retry options for failed recognition

**AI Response Patterns:**
- Typing indicator: 3-dot animation before response
- Message streaming: Text appears word-by-word
- Action buttons: Context-aware quick replies
- Rich responses: Cards, images, links embedded in messages
- Conversation memory: Reference to previous messages

### Chat Message Behaviors
**User Messages:**
- Send animation: Slide in from right
- Edit capability: Long press to edit recent messages
- Delete option: Swipe left to delete (mobile)
- Copy text: Long press to copy message content
- Voice playback: Play original voice input if used

**AI Messages:**
- Receive animation: Slide in from left
- Read aloud: Text-to-speech with natural Hindi-English mixing
- Action parsing: Buttons and links automatically generated
- Feedback options: Thumbs up/down for response quality
- Save responses: Bookmark important AI suggestions

## Card Component Behaviors

### Talent Profile Cards
**Hover States (Desktop):**
- Card elevation: 4px shadow increase
- Preview overlay: Quick stats and actions
- Image zoom: Subtle scale effect on profile photo
- Action buttons: Fade in on hover
- Quick actions: Shortlist, contact, compare buttons

**Touch States (Mobile):**
- Tap: Navigate to full profile view
- Long press: Quick actions menu (shortlist, contact, share)
- Swipe right: Add to shortlist with animation
- Swipe left: Remove/dismiss with animation
- Double tap: Zoom into profile photo
- Pinch: Zoom profile photo (iOS/Android standard)

**Content Loading:**
- Skeleton screens: Show structure while loading
- Progressive images: Blur to sharp transition
- Error states: Fallback avatar with retry option
- Lazy loading: Load cards as they enter viewport
- Infinite scroll: Load more cards at bottom

### Project Cards
**Status Indicators:**
- Progress bars: Animated progress based on casting completion
- Color coding: Green (complete), yellow (in progress), red (urgent)
- Live updates: Real-time progress changes
- Timeline visualization: Gantt-style timeline for milestones
- Team avatars: Overlapping circles showing active team members

**Interaction Patterns:**
- Click/tap: Navigate to project dashboard
- Right-click: Context menu (desktop only)
- Archive action: Slide to archive gesture (mobile)
- Share project: Quick share via WhatsApp/email
- Duplicate project: One-click project templating

## Form Input Behaviors

### Text Input Fields
**Focus States:**
- Border color change: Gray to accent color
- Label animation: Float to top with scale down
- Helper text: Fade in with relevant guidance
- Character counter: Live count for limited fields
- Clear button: X appears when content present

**Validation Patterns:**
- Real-time validation: Check as user types (debounced)
- Error states: Red border, icon, and message
- Success states: Green border and checkmark
- Warning states: Yellow border for potential issues
- Recovery: Clear error state when user starts typing

**Mumbai-Specific Adaptations:**
- Language switching: Toggle Hindi-English input
- Regional name suggestions: Auto-complete for common names
- Phone number formatting: Indian mobile number patterns
- Address formatting: Mumbai area and landmark recognition
- Cultural name parsing: Handle compound Indian names correctly

### Voice Input Integration
**Activation Methods:**
- Button press: Standard start/stop recording
- Keyboard shortcut: Space bar (desktop push-to-talk)
- Voice command: "Hey CastMatch" wake word
- Gesture: Double-tap screen (mobile)
- Auto-activation: In conversation mode

**Processing Feedback:**
- Recording indicator: Red dot with timer
- Processing state: "Understanding..." with spinner
- Confidence display: Visual confidence percentage
- Language detected: Hindi/English indicator
- Retry options: "Try again" or "Type instead"

## Search and Discovery Behaviors

### Search Interface
**Search Input:**
- Auto-complete: Live suggestions as user types
- Recent searches: History dropdown
- Voice search: Prominent microphone button
- Search filters: Expandable filter panel
- Clear search: X button to reset search
- Search history: Previous searches saved locally

**Result Display:**
- Instant results: No search button needed
- Faceted search: Dynamic filters based on results
- Sort options: Relevance, recent, alphabetical
- View modes: Grid, list, detailed view
- Pagination: Load more vs. infinite scroll
- No results: Helpful suggestions and alternatives

**Mumbai Industry Search:**
- Location filters: Area-wise talent filtering (Andheri, Bandra)
- Language filters: Hindi, English, Marathi, Tamil combinations
- Industry connections: "Worked with" relationship searches
- Agency filters: Talent agency and management filtering
- Experience filters: Theater, film, TV, digital experience

### Talent Filtering
**Filter Panel:**
- Collapsible sections: Age, experience, location, language
- Multi-select: Multiple options per filter category
- Range sliders: Age, rate, experience years
- Clear filters: Reset to default state
- Save filters: Bookmark common filter combinations
- Smart filters: AI-suggested relevant filters

## Scheduling Interface Behaviors

### Calendar Component
**Month View:**
- Date selection: Click/tap to select date
- Multi-date: Drag to select date range
- Availability indicators: Green (available), red (busy), yellow (partial)
- Event preview: Hover to see event details
- Quick add: Double-click to add event

**Day View:**
- Time slot selection: Click time to schedule
- Drag to resize: Adjust event duration
- Conflict detection: Visual warnings for overlaps
- Buffer time: Automatic travel time calculation
- Multiple calendars: Team member schedule overlay

**Mumbai Traffic Integration:**
- Travel time calculation: Real-time traffic data
- Route suggestions: Multiple route options
- Traffic alerts: Notifications for delays
- Alternate venues: Suggestions for traffic-free locations
- Monsoon scheduling: Weather-aware scheduling

### Audition Scheduling
**Bulk Scheduling:**
- Select multiple talents: Checkbox selection
- Batch actions: Schedule all selected at once
- Time distribution: Auto-distribute across time slots
- Conflict resolution: Smart rescheduling suggestions
- Confirmation flow: Bulk confirmation with individual review

**Real-time Coordination:**
- Live updates: Real-time schedule changes
- Notification system: WhatsApp/SMS integration
- Availability sync: Calendar integration
- Team notifications: Auto-notify relevant stakeholders
- Emergency rescheduling: One-click emergency reschedule

## Decision Making Interface Behaviors

### Stakeholder Voting
**Voting Interface:**
- Star ratings: 1-5 star system for each criterion
- Thumbs up/down: Simple approve/reject voting
- Comment threads: Discussion for each candidate
- Anonymous voting: Option to hide voter identity
- Weighted voting: Different stakeholder vote weights

**Consensus Building:**
- Agreement visualization: Color-coded agreement levels
- Discussion facilitation: AI-moderated discussions
- Compromise suggestions: AI-suggested middle-ground options
- Decision timeline: Time-limited decision processes
- Final approval: Clear final decision confirmation

### Comparison Tools
**Side-by-side View:**
- Talent comparison: Up to 4 talents simultaneously
- Criteria comparison: Side-by-side scoring
- Video comparison: Sync audition video playback
- Cost comparison: Budget impact analysis
- Team feedback: Consolidated team opinions

**Decision Documentation:**
- Decision rationale: Required explanation for choices
- Alternative considerations: Record rejected options
- Future reference: Searchable decision history
- Audit trail: Complete decision process documentation
- Learning integration: Improve future recommendations

## Emergency Recovery Behaviors

### Crisis Detection
**Automatic Alerts:**
- Schedule conflicts: Auto-detect and alert
- Talent cancellations: Immediate notification
- Budget overruns: Real-time budget tracking
- Deadline warnings: Proactive timeline alerts
- Team unavailability: Calendar integration alerts

**Manual Triggers:**
- Panic button: Triple-tap or voice "Emergency"
- Help command: "I need help" voice activation
- Escalation: Manual escalation to human support
- Crisis categories: Type of emergency selection
- Severity levels: Low, medium, high urgency

### Recovery Actions
**Automated Solutions:**
- Alternative suggestions: Backup talent options
- Reschedule automation: Auto-reschedule affected auditions
- Team notifications: Bulk emergency notifications
- Vendor contacts: Auto-contact relevant vendors
- Documentation: Auto-generate incident reports

**Manual Interventions:**
- Human handoff: Escalate to human support
- Custom solutions: Manual problem resolution
- Team coordination: Emergency team calls
- External contacts: Industry contact activation
- Recovery tracking: Track resolution progress

## Performance and Loading Behaviors

### Loading States
**Progressive Loading:**
- Skeleton screens: Structure-first loading
- Critical path: Load essential content first
- Background loading: Non-critical content loads later
- Error recovery: Graceful failure with retry options
- Offline capability: Cache-first for offline use

**Performance Optimization:**
- Lazy loading: Load content as needed
- Image optimization: WebP with fallbacks
- CDN integration: Fast content delivery
- Caching strategy: Smart caching for repeat visits
- Background sync: Sync data in background

### Error Handling
**Network Errors:**
- Retry mechanisms: Auto-retry with exponential backoff
- Offline mode: Limited functionality when offline
- Sync when online: Auto-sync when connection restored
- Error messaging: Clear, actionable error messages
- Alternative paths: Provide alternative actions

**User Errors:**
- Input validation: Prevent invalid inputs
- Confirmation dialogs: Confirm destructive actions
- Undo capability: Undo recent actions
- Data recovery: Auto-save and recovery options
- Help integration: Context-sensitive help

## Accessibility Behaviors

### Screen Reader Support
**Navigation Announcements:**
- Screen changes: Announce new screen context
- Modal dialogs: Proper focus management
- Form completion: Progress announcements
- Error states: Clear error descriptions
- Success confirmations: Positive feedback

**Content Structure:**
- Heading hierarchy: Proper H1-H6 structure
- Landmarks: Main, navigation, complementary regions
- Lists: Proper list markup for repeated items
- Tables: Header associations for data tables
- Images: Descriptive alt text for all images

### Keyboard Navigation
**Tab Order:**
- Logical sequence: Left-to-right, top-to-bottom
- Skip links: Jump to main content
- Focus indicators: Clear visual focus
- Shortcut keys: Common shortcuts available
- Escape key: Exit modals and overlays

**Voice Navigation:**
- Voice commands: All actions available via voice
- Command discovery: "What can I say?" help
- Context awareness: Context-specific commands
- Confirmation: Voice confirmation for actions
- Error correction: Easy error correction flow

---

**Annotation Status:** Complete ✅  
**Behaviors Documented:** 200+ specific interaction patterns  
**Cultural Integration:** Mumbai industry workflows embedded  
**Accessibility:** Full WCAG 2.1 AA compliance patterns  
**Performance:** Optimized loading and error handling specified