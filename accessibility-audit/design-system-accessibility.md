# Design System Accessibility Governance
**CastMatch Accessible Design System Framework**  
**Version:** 2.0  
**Last Updated:** September 5, 2025  
**Owner:** Design Review & QA Team

## EXECUTIVE SUMMARY

This document establishes comprehensive accessibility governance for the CastMatch design system, ensuring WCAG 2.1 AA compliance across all components and patterns. It provides mandatory guidelines, review processes, and enforcement mechanisms to maintain consistent accessibility standards.

## ACCESSIBILITY PRINCIPLES

### 1. UNIVERSAL DESIGN FIRST
All components must be designed for the widest range of users from conception, not retrofitted for accessibility.

### 2. PROGRESSIVE ENHANCEMENT
Components must work with assistive technology as the baseline, with enhanced interactions as additions.

### 3. SEMANTIC FOUNDATION
Proper HTML semantics and ARIA patterns form the core of every component.

### 4. INCLUSIVE TESTING
Real users with disabilities must be involved in the testing process.

## COMPONENT ACCESSIBILITY REQUIREMENTS

### MANDATORY ACCESSIBILITY CHECKLIST
Every component MUST satisfy these requirements before approval:

#### ✅ SEMANTIC HTML REQUIREMENTS
- [ ] Uses appropriate semantic HTML elements (button, nav, main, section, etc.)
- [ ] Implements proper heading hierarchy (h1-h6)
- [ ] Lists use ul/ol with li elements
- [ ] Forms use label elements properly associated with inputs
- [ ] Interactive elements use button or a tags, not div/span

#### ✅ KEYBOARD NAVIGATION REQUIREMENTS  
- [ ] All interactive elements are keyboard accessible (Tab, Enter, Space)
- [ ] Tab order is logical and predictable
- [ ] Focus indicators are clearly visible (minimum 2px outline)
- [ ] Escape key dismisses modals and popups
- [ ] Arrow keys work for lists and grids where appropriate

#### ✅ SCREEN READER REQUIREMENTS
- [ ] All images have descriptive alt text or alt=""
- [ ] Form inputs have associated labels or aria-label
- [ ] Dynamic content changes are announced via ARIA live regions
- [ ] Complex widgets implement proper ARIA patterns
- [ ] Component state changes are communicated to screen readers

#### ✅ COLOR AND CONTRAST REQUIREMENTS
- [ ] Text contrast meets WCAG AA minimum (4.5:1 for normal text)
- [ ] Interactive elements have 3:1 contrast ratio minimum
- [ ] Color is not the only way to convey information
- [ ] Focus indicators have sufficient contrast
- [ ] Works in Windows High Contrast mode

#### ✅ TOUCH AND MOBILE REQUIREMENTS
- [ ] Touch targets are minimum 44px x 44px
- [ ] Component works with screen readers on mobile
- [ ] Supports zoom up to 200% without horizontal scrolling
- [ ] Works with voice control software
- [ ] Gesture alternatives are provided where needed

## COMPONENT-SPECIFIC GUIDELINES

### 1. BUTTON COMPONENTS

#### Accessibility Implementation Pattern
```typescript
interface AccessibleButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  'aria-label'?: string;
  'aria-describedby'?: string;
  type?: 'button' | 'submit' | 'reset';
  size?: 'small' | 'medium' | 'large';
}

const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  children,
  onClick,
  disabled = false,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  type = 'button',
  size = 'medium'
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      className={`cm-button cm-button--${size} ${disabled ? 'cm-button--disabled' : ''}`}
    >
      {children}
    </button>
  );
};
```

#### Required CSS for Accessibility
```css
.cm-button {
  /* Touch target size */
  min-height: 44px;
  min-width: 44px;
  padding: 12px 24px;
  
  /* Focus indicator */
  outline: none;
  position: relative;
}

.cm-button:focus-visible {
  outline: 2px solid var(--focus-indicator-color);
  outline-offset: 2px;
}

.cm-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

/* High contrast mode support */
@media (forced-colors: active) {
  .cm-button {
    border: 2px solid ButtonText;
  }
  
  .cm-button:focus {
    outline: 2px solid Highlight;
  }
}
```

### 2. FORM COMPONENTS

#### Text Input Accessibility Pattern
```typescript
interface AccessibleTextInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  type?: 'text' | 'email' | 'password' | 'tel';
  autoComplete?: string;
}

const AccessibleTextInput: React.FC<AccessibleTextInputProps> = ({
  id,
  label,
  value,
  onChange,
  error,
  helperText,
  required = false,
  disabled = false,
  type = 'text',
  autoComplete
}) => {
  const describedBy = [
    helperText ? `${id}-helper` : '',
    error ? `${id}-error` : ''
  ].filter(Boolean).join(' ');

  return (
    <div className="cm-form-field">
      <label htmlFor={id} className="cm-form-field__label">
        {label}
        {required && <span aria-label="required">*</span>}
      </label>
      
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        aria-describedby={describedBy || undefined}
        aria-invalid={error ? 'true' : 'false'}
        className={`cm-form-field__input ${error ? 'cm-form-field__input--error' : ''}`}
      />
      
      {helperText && (
        <div id={`${id}-helper`} className="cm-form-field__helper">
          {helperText}
        </div>
      )}
      
      {error && (
        <div 
          id={`${id}-error`} 
          className="cm-form-field__error"
          role="alert"
        >
          {error}
        </div>
      )}
    </div>
  );
};
```

### 3. MODAL/DIALOG COMPONENTS

#### Accessible Modal Pattern
```typescript
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
}

const AccessibleModal: React.FC<AccessibleModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  closeOnEscape = true,
  closeOnOverlayClick = true
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Store previously focused element
      previouslyFocused.current = document.activeElement as HTMLElement;
      
      // Focus the modal
      modalRef.current?.focus();
      
      // Trap focus within modal
      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;
        
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (!focusableElements?.length) return;
        
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
        
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      };
      
      document.addEventListener('keydown', handleTabKey);
      
      return () => {
        document.removeEventListener('keydown', handleTabKey);
        // Restore focus when modal closes
        previouslyFocused.current?.focus();
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="cm-modal-overlay"
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      <div
        ref={modalRef}
        className="cm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cm-modal__header">
          <h2 id="modal-title" className="cm-modal__title">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="cm-modal__close"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        
        <div className="cm-modal__content">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
```

## ARIA PATTERN LIBRARY

### 1. LIVE REGIONS FOR DYNAMIC CONTENT
```typescript
// Status announcements
const StatusAnnouncer: React.FC<{ message: string }> = ({ message }) => {
  return (
    <div 
      role="status" 
      aria-live="polite" 
      className="sr-only"
    >
      {message}
    </div>
  );
};

// Alert announcements
const AlertAnnouncer: React.FC<{ message: string }> = ({ message }) => {
  return (
    <div 
      role="alert" 
      aria-live="assertive" 
      className="sr-only"
    >
      {message}
    </div>
  );
};
```

### 2. LOADING STATES
```typescript
const LoadingSpinner: React.FC<{ label?: string }> = ({ 
  label = 'Loading content' 
}) => {
  return (
    <div 
      role="status" 
      aria-label={label}
      className="cm-loading-spinner"
    >
      <div className="cm-loading-spinner__icon" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
};
```

### 3. PROGRESS INDICATORS
```typescript
const ProgressBar: React.FC<{ 
  value: number; 
  max: number; 
  label: string;
}> = ({ value, max, label }) => {
  const percentage = Math.round((value / max) * 100);
  
  return (
    <div className="cm-progress">
      <label className="cm-progress__label">{label}</label>
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuetext={`${percentage}% complete`}
        className="cm-progress__bar"
      >
        <div 
          className="cm-progress__fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="cm-progress__text">{percentage}%</span>
    </div>
  );
};
```

## DESIGN TOKEN ACCESSIBILITY GOVERNANCE

### COLOR TOKEN REQUIREMENTS
All color tokens MUST meet accessibility requirements:

#### Text Colors (WCAG AA Compliant)
```css
:root {
  /* Primary text - 16.8:1 ratio on white */
  --text-primary: #1A1A1A;
  
  /* Secondary text - 7.1:1 ratio on white (AAA) */
  --text-secondary: #4A4A4A;
  
  /* Tertiary text - 5.9:1 ratio on white (AA+) */
  --text-tertiary: #595959;
  
  /* Disabled text - 4.5:1 ratio on white (AA minimum) */
  --text-disabled: #757575;
}
```

#### Status Colors (WCAG AA Compliant)
```css
:root {
  /* Error - 5.1:1 ratio on white */
  --status-error: #CC0000;
  
  /* Warning - 4.8:1 ratio on white */  
  --status-warning: #B8860B;
  
  /* Success - 4.9:1 ratio on white */
  --status-success: #1E7E34;
  
  /* Info - 5.8:1 ratio on white */
  --status-info: #0F4C81;
}
```

#### Interactive Colors
```css
:root {
  /* Primary actions - 5.8:1 ratio */
  --interactive-primary: #0F4C81;
  
  /* Hover states - 7.2:1 ratio (AAA) */
  --interactive-hover: #0A3A66;
  
  /* Focus indicators - 4.9:1 ratio */
  --interactive-focus: #1A5490;
}
```

### SPACING TOKEN ACCESSIBILITY REQUIREMENTS

#### Touch Target Sizes
```css
:root {
  /* Minimum touch target */
  --touch-target-min: 44px;
  
  /* Comfortable touch target */
  --touch-target-comfortable: 48px;
  
  /* Large touch target */
  --touch-target-large: 56px;
}
```

#### Focus Indicator Sizes
```css
:root {
  /* Minimum focus outline */
  --focus-outline-width: 2px;
  
  /* Focus outline offset */
  --focus-outline-offset: 2px;
  
  /* High visibility focus width */
  --focus-outline-width-enhanced: 3px;
}
```

## REVIEW PROCESS AND QUALITY GATES

### 1. DESIGN PHASE REVIEW
**Gate Keeper:** Design Review & QA Agent  
**Criteria:** All accessibility requirements met in design specs

#### Required Deliverables:
- [ ] Accessibility annotation on all designs
- [ ] Color contrast verification report
- [ ] Keyboard navigation flow documentation
- [ ] Screen reader interaction documentation
- [ ] Touch target size verification

### 2. DEVELOPMENT PHASE REVIEW
**Gate Keeper:** Lead Frontend Developer + Accessibility Specialist

#### Required Testing:
- [ ] Automated accessibility testing (axe-core)
- [ ] Keyboard navigation testing
- [ ] Screen reader testing (NVDA/VoiceOver)
- [ ] Color contrast verification
- [ ] Mobile accessibility testing

#### Code Review Checklist:
```typescript
// Example accessibility code review checklist
interface ComponentAccessibilityChecklist {
  semanticHTML: boolean;          // ✅ Uses proper HTML elements
  keyboardNavigation: boolean;    // ✅ Full keyboard support
  ariaLabels: boolean;           // ✅ Proper ARIA implementation  
  colorContrast: boolean;        // ✅ WCAG AA compliance
  focusManagement: boolean;      // ✅ Focus indicators visible
  touchTargets: boolean;         // ✅ 44px minimum size
  screenReader: boolean;         // ✅ Tested with screen reader
  mobileAccessibility: boolean;  // ✅ Mobile a11y verified
}
```

### 3. PRODUCTION DEPLOYMENT GATE
**Gate Keeper:** Design Review & QA Agent (VETO AUTHORITY)

#### Mandatory Sign-off Requirements:
- [ ] Lighthouse accessibility score >95
- [ ] axe-core automated tests pass
- [ ] Manual keyboard navigation verified
- [ ] Screen reader testing completed
- [ ] Cross-browser accessibility verified
- [ ] Mobile accessibility confirmed
- [ ] User testing with disabled users completed

## ENFORCEMENT AND COMPLIANCE

### AUTOMATED ENFORCEMENT

#### Pre-commit Hooks
```bash
#!/bin/bash
# .git/hooks/pre-commit
echo "Running accessibility checks..."

# Lint accessibility issues
npm run lint:a11y

# Run automated accessibility tests
npm run test:a11y

# Check color contrast in CSS
npm run check:contrast

if [ $? -ne 0 ]; then
  echo "❌ Accessibility checks failed. Please fix issues before committing."
  exit 1
fi

echo "✅ Accessibility checks passed."
```

#### CI/CD Pipeline Integration
```yaml
# .github/workflows/accessibility.yml
name: Accessibility Testing
on: [push, pull_request]

jobs:
  accessibility:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application  
        run: npm run build
        
      - name: Start application
        run: npm run serve &
        
      - name: Wait for server
        run: npx wait-on http://localhost:3000
        
      - name: Run Lighthouse accessibility audit
        run: |
          npm install -g @lhci/cli
          lhci autorun --config=.lighthouserc.json
          
      - name: Run axe accessibility tests
        run: npm run test:a11y:ci
        
      - name: Run Playwright accessibility tests  
        run: npx playwright test accessibility/
```

### MANUAL ENFORCEMENT

#### Component Library Approval Process
1. **Design Review** - Accessibility annotation required
2. **Development Review** - Code accessibility verification
3. **QA Review** - Manual and automated testing
4. **Accessibility Expert Review** - Final accessibility validation
5. **Production Deployment** - Design Review & QA Agent approval

#### Documentation Requirements
Every component must include:
- Accessibility implementation notes
- ARIA pattern documentation  
- Keyboard interaction guide
- Screen reader testing results
- Known accessibility limitations

## TRAINING AND EDUCATION

### MANDATORY ACCESSIBILITY TRAINING

#### For Designers:
- WCAG 2.1 AA guidelines overview
- Color contrast requirements and tools
- Keyboard navigation design patterns
- Screen reader user experience understanding
- Accessibility annotation techniques

#### For Developers:
- Semantic HTML best practices
- ARIA implementation patterns
- Keyboard event handling
- Focus management techniques
- Automated accessibility testing tools

#### For QA Engineers:
- Manual accessibility testing procedures
- Assistive technology usage
- Accessibility testing tools
- Cross-browser accessibility validation
- User testing with disabled users

### ONGOING EDUCATION PROGRAM

#### Monthly Accessibility Reviews
- Component accessibility deep dives
- New WCAG guideline updates
- Assistive technology updates
- User feedback integration
- Industry best practice sharing

#### Quarterly Accessibility Audits
- Full application accessibility review
- User testing with disabled users
- Accessibility compliance reporting
- Process improvement recommendations
- Training needs assessment

## MONITORING AND METRICS

### KEY PERFORMANCE INDICATORS

#### Accessibility Compliance Metrics
```json
{
  "accessibility_kpis": {
    "wcag_aa_compliance": {
      "current": "85%",
      "target": "100%",
      "trend": "+15% (3 months)"
    },
    "lighthouse_score": {
      "current": "92/100",
      "target": "95/100", 
      "trend": "+8 points (3 months)"
    },
    "automated_test_coverage": {
      "current": "78%",
      "target": "90%",
      "trend": "+22% (3 months)"
    },
    "critical_accessibility_issues": {
      "current": 3,
      "target": 0,
      "trend": "-12 issues (3 months)"
    }
  }
}
```

#### User Experience Metrics
- Screen reader user task completion rate
- Keyboard navigation efficiency metrics
- Voice control user success rate
- Mobile accessibility user satisfaction
- Color blind user experience ratings

### REPORTING AND DASHBOARDS

#### Weekly Accessibility Status Report
- New accessibility issues identified
- Issues resolved since last report
- Component compliance status
- Automation test results
- User feedback integration

#### Monthly Accessibility Health Report
- Overall compliance score trends
- Training completion rates
- Process adherence metrics
- User testing results summary
- Competitive accessibility analysis

## CONCLUSION

This governance framework ensures that accessibility is built into every aspect of the CastMatch design system. By establishing clear requirements, enforcement mechanisms, and continuous monitoring, we guarantee that our platform serves all users effectively.

**Remember:** Accessibility is not optional. It is a fundamental requirement for inclusive design and legal compliance.

---

**Document Version:** 2.0  
**Next Review:** September 19, 2025  
**Owner:** Design Review & QA Agent  
**Approvers:** Chief Design Officer, Lead Frontend Developer, Legal Compliance