# QA Quick Reference Checklist - CastMatch Wireframes
## Immediate Action Items for Each Wireframe

**Use this checklist for each wireframe file during remediation**

---

## Universal Fixes Required (Apply to ALL 27 Files)

### Accessibility Checklist
- [ ] Add `lang="en"` to html tag
- [ ] Include skip navigation link
- [ ] Add ARIA labels to all buttons
- [ ] Include role attributes for complex components
- [ ] Add alt text for all images/icons
- [ ] Ensure heading hierarchy (h1 → h2 → h3)
- [ ] Add focus indicators (outline styles)
- [ ] Include aria-live regions for dynamic content
- [ ] Label all form inputs properly
- [ ] Add aria-describedby for error messages

### Design Tokens Implementation
- [ ] Replace font-family with `var(--font-primary)`
- [ ] Replace font-sizes with token variables
- [ ] Replace color values with token variables
- [ ] Replace spacing values with token variables
- [ ] Replace border-radius with token variables
- [ ] Replace shadows with token variables

### Component Standardization
- [ ] Update button classes to standard system
- [ ] Update card components to standard system
- [ ] Standardize form input styles
- [ ] Unify modal/dialog patterns
- [ ] Standardize table layouts
- [ ] Unify navigation patterns

### Responsive Design
- [ ] Add viewport meta tag
- [ ] Include mobile breakpoint (max-width: 640px)
- [ ] Include tablet breakpoint (max-width: 768px)
- [ ] Include desktop breakpoint (min-width: 1024px)
- [ ] Test touch target sizes (min 44x44px)
- [ ] Ensure readable font sizes on mobile (min 16px)

### UI States
- [ ] Add hover states for interactive elements
- [ ] Include focus states for keyboard navigation
- [ ] Add active/pressed states for buttons
- [ ] Include disabled states where applicable
- [ ] Add loading states for async operations
- [ ] Include error states for forms
- [ ] Add empty states for lists/tables
- [ ] Include success states for confirmations

---

## File-Specific Critical Fixes

### Landing Pages (3 files)
**Files:** LANDING_PAGE_WIREFRAMES.html, CASTING_LANDING_WIREFRAMES.html, TALENT_LANDING_WIREFRAMES.html
- [x] CSS variables already implemented
- [ ] Add hero section accessibility
- [ ] Include CTA button states
- [ ] Add scroll animations annotations
- [ ] Include footer navigation

### Authentication (1 file)
**File:** AUTHENTICATION_COMPLETE_WIREFRAMES.html
- [x] CSS variables already implemented
- [ ] Add form validation errors
- [ ] Include password strength indicator
- [ ] Add social login error states
- [ ] Include 2FA flow
- [ ] Add session timeout handling

### Talent Dashboard (4 files)
**Files:** TALENT_DASHBOARD_WIREFRAMES.html, TALENT_PORTFOLIO_WIREFRAMES.html, TALENT_CALENDAR_WIREFRAMES.html, TALENT_APPLICATIONS_WIREFRAMES.html
- [ ] Standardize sidebar navigation
- [ ] Add notification badges
- [ ] Include data loading states
- [ ] Add profile completion indicator
- [ ] Include analytics visualizations

### Casting Dashboard (6 files)
**Files:** CASTING_DASHBOARD_WIREFRAMES.html, PROJECT_MANAGEMENT_WIREFRAMES.html, AUDITION_SCHEDULING_WIREFRAMES.html, CASTING_ANALYTICS_WIREFRAMES.html, SHORTLIST_MANAGEMENT_WIREFRAMES.html, TALENT_SEARCH_DISCOVERY_WIREFRAMES.html
- [ ] Unify top navigation bar
- [ ] Add project status indicators
- [ ] Include bulk action states
- [ ] Add filter/sort controls
- [ ] Include export functionality

### Onboarding (2 files)
**Files:** ONBOARDING_TALENT_WIREFRAMES.html, ONBOARDING_CASTING_WIREFRAMES.html
- [ ] Add progress indicators
- [ ] Include form validation
- [ ] Add save draft functionality
- [ ] Include skip options
- [ ] Add help tooltips

### Communication (2 files)
**Files:** MESSAGING_COMMUNICATION_WIREFRAMES.html, VOICE_CHAT_INTERFACE_WIREFRAMES.html
- [ ] Add typing indicators
- [ ] Include message status (sent/read)
- [ ] Add attachment previews
- [ ] Include notification sounds annotation
- [ ] Add connection status

### AI Features (2 files)
**Files:** AI_INTERACTION_PATTERNS_WIREFRAMES.html, INTERACTION_SPECIFICATIONS.html
- [ ] Add AI thinking states
- [ ] Include confidence indicators
- [ ] Add fallback options
- [ ] Include feedback mechanisms
- [ ] Add context awareness indicators

### Other Core Features (6 files)
**Files:** DISCOVER_BROWSE_WIREFRAMES.html, PAYMENT_SUBSCRIPTION_WIREFRAMES.html, SETTINGS_PREFERENCES_WIREFRAMES.html, SUPPORT_HELP_WIREFRAMES.html, VERIFICATION_PROCESS_WIREFRAMES.html
- [ ] Add search filters
- [ ] Include payment security badges
- [ ] Add settings save confirmation
- [ ] Include help search functionality
- [ ] Add verification progress steps

---

## Quality Gates (Must Pass Before Sign-off)

### Accessibility Gate
- [ ] Passes axe accessibility scan
- [ ] Keyboard navigation works fully
- [ ] Screen reader compatible
- [ ] Color contrast ratio ≥ 4.5:1 for normal text
- [ ] Color contrast ratio ≥ 3:1 for large text

### Consistency Gate
- [ ] All files use design tokens
- [ ] Navigation patterns unified
- [ ] Component usage standardized
- [ ] Typography scale consistent
- [ ] Spacing rhythm maintained

### Completeness Gate
- [ ] All user flows have start and end states
- [ ] Error states defined for all interactions
- [ ] Loading states present for async operations
- [ ] Empty states designed for all lists
- [ ] Success confirmations included

### Responsiveness Gate
- [ ] Mobile layout defined (320px-640px)
- [ ] Tablet layout defined (641px-1024px)
- [ ] Desktop layout defined (1025px+)
- [ ] Touch targets adequate
- [ ] Text remains readable

### Documentation Gate
- [ ] Annotations clear and complete
- [ ] Interaction behaviors documented
- [ ] Edge cases noted
- [ ] Technical constraints listed
- [ ] Handoff notes included

---

## Testing Protocol

### Manual Testing Checklist
1. [ ] Tab through entire interface
2. [ ] Test with screen reader (NVDA/JAWS)
3. [ ] Verify on mobile device
4. [ ] Check in high contrast mode
5. [ ] Test with keyboard only
6. [ ] Verify with slow connection
7. [ ] Check with ad blockers
8. [ ] Test in multiple browsers

### Automated Testing
```bash
# Run accessibility tests
npx axe wireframes/*.html

# Validate HTML
npx html-validate wireframes/*.html

# Check CSS consistency
npx stylelint wireframes/*.html
```

---

## Definition of Done

A wireframe is considered "Done" when:
1. ✅ All universal fixes applied
2. ✅ File-specific fixes completed
3. ✅ Quality gates passed
4. ✅ Testing protocol completed
5. ✅ Peer review approved
6. ✅ Stakeholder sign-off received

---

## Quick Wins (Can Do Immediately)

### 5-Minute Fixes
- Add viewport meta tag
- Add lang attribute
- Fix font-family declaration
- Add basic ARIA labels

### 30-Minute Fixes
- Implement design tokens
- Add navigation to missing pages
- Standardize button styles
- Add loading states

### 1-Hour Fixes
- Complete accessibility markup
- Add all UI states
- Implement responsive breakpoints
- Create error states

---

## Contact for Questions

**Design System:** design-system@castmatch.com  
**Accessibility:** a11y-team@castmatch.com  
**UX Architecture:** ux-team@castmatch.com  
**QA Team:** qa@castmatch.com

**Slack Channels:**
- #wireframe-qa-fixes
- #design-system
- #accessibility
- #ux-architecture

---

**Last Updated:** January 8, 2025  
**Version:** 1.0  
**Next Review:** After Week 1 fixes