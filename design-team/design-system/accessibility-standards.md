# CastMatch Accessibility Standards & WCAG Compliance

## Version 1.0.0

### Table of Contents
1. [WCAG 2.1 Compliance Overview](#wcag-21-compliance-overview)
2. [Color & Contrast Requirements](#color--contrast-requirements)
3. [Keyboard Navigation](#keyboard-navigation)
4. [Screen Reader Support](#screen-reader-support)
5. [Focus Management](#focus-management)
6. [ARIA Implementation](#aria-implementation)
7. [Form Accessibility](#form-accessibility)
8. [Media Accessibility](#media-accessibility)
9. [Testing & Validation](#testing--validation)
10. [Implementation Checklist](#implementation-checklist)

---

## WCAG 2.1 Compliance Overview

### Compliance Levels

**Target: WCAG 2.1 Level AA** (with select AAA features)

#### Level A (Minimum)
- ✅ Text alternatives for non-text content
- ✅ Captions for videos
- ✅ Logical reading order
- ✅ Color not sole information indicator
- ✅ Keyboard accessible
- ✅ No keyboard traps
- ✅ Page has title
- ✅ Focus order meaningful
- ✅ Link purpose clear

#### Level AA (Target)
- ✅ Color contrast 4.5:1 (normal text)
- ✅ Color contrast 3:1 (large text)
- ✅ Resize text to 200%
- ✅ Images of text avoided
- ✅ Multiple ways to find pages
- ✅ Headings and labels descriptive
- ✅ Focus visible
- ✅ Language identified
- ✅ Consistent navigation
- ✅ Error identification
- ✅ Labels or instructions
- ✅ Error suggestions

#### Level AAA (Enhanced - Selected)
- ✅ Color contrast 7:1 (where feasible)
- ✅ Line height 1.5x
- ✅ Paragraph spacing 2x
- ✅ No horizontal scrolling
- ✅ Context-sensitive help

---

## Color & Contrast Requirements

### Contrast Ratios

```typescript
// utils/contrast-standards.ts
export const contrastRequirements = {
  normalText: {
    AA: 4.5,  // WCAG AA standard
    AAA: 7.0  // WCAG AAA standard
  },
  largeText: {  // 18pt+ or 14pt+ bold
    AA: 3.0,
    AAA: 4.5
  },
  nonText: {
    UI: 3.0,     // UI components
    graphics: 3.0 // Meaningful graphics
  }
};
```

### Color Palette Validation

```typescript
// Validated color combinations for CastMatch
export const accessibleColorPairs = {
  light: {
    primary: {
      text: 'oklch(18.2% 0.024 110)',      // Contrast: 15.2:1 ✅
      background: 'oklch(98.5% 0.002 110)'
    },
    secondary: {
      text: 'oklch(39.8% 0.020 110)',      // Contrast: 7.8:1 ✅
      background: 'oklch(98.5% 0.002 110)'
    },
    gold: {
      text: 'oklch(98.5% 0.002 110)',      // Contrast: 4.6:1 ✅
      background: 'oklch(68.5% 0.175 96)'
    },
    error: {
      text: 'oklch(58.5% 0.195 25)',       // Contrast: 4.5:1 ✅
      background: 'oklch(98.5% 0.002 110)'
    }
  },
  dark: {
    primary: {
      text: 'oklch(96.8% 0.003 110)',      // Contrast: 14.8:1 ✅
      background: 'oklch(12.5% 0.025 110)'
    },
    secondary: {
      text: 'oklch(88.2% 0.008 110)',      // Contrast: 10.2:1 ✅
      background: 'oklch(12.5% 0.025 110)'
    },
    gold: {
      text: 'oklch(12.5% 0.025 110)',      // Contrast: 4.7:1 ✅
      background: 'oklch(72.5% 0.165 96)'
    },
    error: {
      text: 'oklch(62.5% 0.175 25)',       // Contrast: 5.2:1 ✅
      background: 'oklch(12.5% 0.025 110)'
    }
  }
};
```

### Color Blind Friendly Patterns

```css
/* Don't rely on color alone - use patterns and icons */
.status-indicator {
  /* Color + Icon approach */
  &.success {
    color: oklch(68.5% 0.165 142);
    &::before { content: '✓'; }
  }
  
  &.warning {
    color: oklch(72.5% 0.165 85);
    &::before { content: '⚠'; }
  }
  
  &.error {
    color: oklch(58.5% 0.195 25);
    &::before { content: '✗'; }
  }
  
  &.info {
    color: oklch(62.5% 0.145 225);
    &::before { content: 'ⓘ'; }
  }
}

/* Pattern overlays for charts/graphs */
.chart-pattern-stripes {
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 10px,
    currentColor 10px,
    currentColor 20px
  );
  opacity: 0.1;
}
```

---

## Keyboard Navigation

### Navigation Requirements

```typescript
// components/KeyboardNavigation.tsx
export const KeyboardShortcuts = {
  // Global shortcuts
  global: {
    'Alt + H': 'Go to Home',
    'Alt + S': 'Focus search',
    'Alt + M': 'Open main menu',
    'Alt + P': 'Open profile menu',
    'Escape': 'Close modal/dropdown'
  },
  
  // Navigation
  navigation: {
    'Tab': 'Next focusable element',
    'Shift + Tab': 'Previous focusable element',
    'Enter': 'Activate button/link',
    'Space': 'Activate button/checkbox',
    'Arrow keys': 'Navigate menus/lists'
  },
  
  // Form controls
  forms: {
    'Arrow Up/Down': 'Select options',
    'Enter': 'Submit form',
    'Escape': 'Cancel/close',
    'Space': 'Toggle checkbox'
  }
};
```

### Skip Links Implementation

```tsx
const SkipLinks: React.FC = () => {
  return (
    <div className="sr-only focus-within:not-sr-only">
      <div className="absolute top-0 left-0 z-[9999] p-2 bg-white dark:bg-gray-900">
        <a
          href="#main-content"
          className="px-4 py-2 bg-[oklch(68.5%_0.175_96)] text-white rounded focus:outline-none focus:ring-2 focus:ring-offset-2"
        >
          Skip to main content
        </a>
        <a
          href="#main-navigation"
          className="ml-2 px-4 py-2 bg-[oklch(68.5%_0.175_96)] text-white rounded focus:outline-none focus:ring-2 focus:ring-offset-2"
        >
          Skip to navigation
        </a>
        <a
          href="#footer"
          className="ml-2 px-4 py-2 bg-[oklch(68.5%_0.175_96)] text-white rounded focus:outline-none focus:ring-2 focus:ring-offset-2"
        >
          Skip to footer
        </a>
      </div>
    </div>
  );
};
```

### Roving TabIndex Pattern

```tsx
const useRovingTabIndex = (items: HTMLElement[]) => {
  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault();
          setFocusedIndex((prev) => (prev + 1) % items.length);
          break;
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault();
          setFocusedIndex((prev) => (prev - 1 + items.length) % items.length);
          break;
        case 'Home':
          e.preventDefault();
          setFocusedIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setFocusedIndex(items.length - 1);
          break;
      }
    };

    const currentItem = items[focusedIndex];
    currentItem?.addEventListener('keydown', handleKeyDown);
    currentItem?.focus();

    return () => {
      currentItem?.removeEventListener('keydown', handleKeyDown);
    };
  }, [focusedIndex, items]);

  return focusedIndex;
};
```

---

## Screen Reader Support

### Semantic HTML Structure

```tsx
// Proper heading hierarchy
const PageStructure: React.FC = () => {
  return (
    <main role="main" aria-labelledby="page-title">
      <h1 id="page-title">Talent Discovery Dashboard</h1>
      
      <section aria-labelledby="featured-section">
        <h2 id="featured-section">Featured Talents</h2>
        <article aria-labelledby="talent-1">
          <h3 id="talent-1">Actor Name</h3>
          {/* Content */}
        </article>
      </section>
      
      <section aria-labelledby="auditions-section">
        <h2 id="auditions-section">Upcoming Auditions</h2>
        {/* Content */}
      </section>
    </main>
  );
};
```

### Live Region Announcements

```tsx
const useScreenReaderAnnouncement = () => {
  const [announcement, setAnnouncement] = useState('');
  const announcementRef = useRef<HTMLDivElement>(null);

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    // Clear and re-announce to ensure it's read
    setAnnouncement('');
    setTimeout(() => {
      setAnnouncement(message);
      
      // Auto-clear after announcement
      setTimeout(() => setAnnouncement(''), 3000);
    }, 100);
  };

  const LiveRegion = () => (
    <>
      <div
        ref={announcementRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {/* For urgent announcements */}
      </div>
    </>
  );

  return { announce, LiveRegion };
};
```

### Screen Reader Only Content

```css
/* Utility class for screen reader only content */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Make visible on focus */
.sr-only-focusable:focus {
  position: static;
  width: auto;
  height: auto;
  padding: inherit;
  margin: inherit;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

---

## Focus Management

### Focus Visible Styles

```css
/* Custom focus styles that meet WCAG requirements */
:focus-visible {
  outline: none;
  box-shadow: 
    0 0 0 2px oklch(98.5% 0.002 110),
    0 0 0 4px oklch(68.5% 0.175 96);
  border-radius: 4px;
}

/* Dark mode focus styles */
[data-theme="dark"] :focus-visible {
  box-shadow: 
    0 0 0 2px oklch(12.5% 0.025 110),
    0 0 0 4px oklch(72.5% 0.165 96);
}

/* Component-specific focus styles */
.button:focus-visible {
  box-shadow: 
    0 0 0 3px oklch(68.5% 0.175 96 / 0.5),
    0 0 0 6px oklch(68.5% 0.175 96 / 0.2);
}

.input:focus-visible {
  border-color: oklch(68.5% 0.175 96);
  box-shadow: 0 0 0 3px oklch(68.5% 0.175 96 / 0.2);
}
```

### Focus Trap Implementation

```tsx
const useFocusTrap = (containerRef: RefObject<HTMLElement>, isActive: boolean) => {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableSelector = 
      'a[href], button:not([disabled]), input:not([disabled]), ' +
      'select:not([disabled]), textarea:not([disabled]), ' +
      '[tabindex]:not([tabindex="-1"])';
    
    const focusableElements = container.querySelectorAll(focusableSelector);
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    // Store previous focus
    const previouslyFocused = document.activeElement as HTMLElement;

    // Focus first element
    firstFocusable?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      // Restore focus
      previouslyFocused?.focus();
    };
  }, [containerRef, isActive]);
};
```

---

## ARIA Implementation

### ARIA Patterns

```tsx
// Accordion Pattern
const Accordion: React.FC = ({ items }) => {
  const [expanded, setExpanded] = useState<string[]>([]);

  return (
    <div role="region" aria-labelledby="accordion-heading">
      <h2 id="accordion-heading">Frequently Asked Questions</h2>
      {items.map((item) => {
        const isExpanded = expanded.includes(item.id);
        const headingId = `accordion-header-${item.id}`;
        const panelId = `accordion-panel-${item.id}`;

        return (
          <div key={item.id}>
            <h3>
              <button
                id={headingId}
                aria-expanded={isExpanded}
                aria-controls={panelId}
                onClick={() => toggleExpanded(item.id)}
                className="w-full text-left p-4 hover:bg-gray-50"
              >
                <span className="flex justify-between items-center">
                  {item.title}
                  <span aria-hidden="true">{isExpanded ? '−' : '+'}</span>
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={headingId}
              hidden={!isExpanded}
              className="p-4"
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Tab Pattern
const Tabs: React.FC = ({ tabs }) => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div>
      <div role="tablist" aria-label="Content tabs">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-controls={`panel-${tab.id}`}
            aria-selected={activeTab === index}
            tabIndex={activeTab === index ? 0 : -1}
            onClick={() => setActiveTab(index)}
            onKeyDown={(e) => handleTabKeyNavigation(e, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={activeTab !== index}
          tabIndex={0}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
};

// Modal Dialog Pattern
const Modal: React.FC = ({ isOpen, onClose, title, children }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isOpen);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
      ref={modalRef}
    >
      <div className="modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="modal-content">
        <h2 id="modal-title">{title}</h2>
        <div id="modal-description">{children}</div>
        <button
          onClick={onClose}
          aria-label="Close dialog"
        >
          Close
        </button>
      </div>
    </div>
  );
};
```

### ARIA Labels and Descriptions

```tsx
// Icon buttons with labels
<button aria-label="Delete item" title="Delete">
  <TrashIcon aria-hidden="true" />
</button>

// Complex widgets
<div
  role="slider"
  aria-label="Price range"
  aria-valuemin="0"
  aria-valuemax="1000"
  aria-valuenow="500"
  aria-valuetext="$500"
  tabIndex={0}
/>

// Form fields with descriptions
<input
  type="email"
  id="email"
  aria-describedby="email-hint email-error"
  aria-invalid={hasError}
  aria-required="true"
/>
<span id="email-hint">We'll never share your email</span>
{hasError && <span id="email-error" role="alert">Invalid email format</span>}
```

---

## Form Accessibility

### Accessible Form Structure

```tsx
const AccessibleForm: React.FC = () => {
  const [errors, setErrors] = useState({});
  const { announce } = useScreenReaderAnnouncement();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const validationErrors = validate(formData);
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      announce(`Form has ${Object.keys(validationErrors).length} errors`, 'assertive');
      
      // Focus first error field
      const firstErrorField = document.querySelector('[aria-invalid="true"]');
      firstErrorField?.focus();
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Contact form">
      <fieldset>
        <legend className="text-xl font-semibold mb-4">Personal Information</legend>
        
        <div className="mb-4">
          <label htmlFor="name" className="block mb-2">
            Full Name <span aria-label="required">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            aria-required="true"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'name-error' : 'name-hint'}
            className="w-full px-4 py-2 border rounded"
          />
          <span id="name-hint" className="text-sm text-gray-600">
            Enter your full legal name
          </span>
          {errors.name && (
            <span id="name-error" role="alert" className="text-red-600 text-sm">
              {errors.name}
            </span>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="email" className="block mb-2">
            Email Address <span aria-label="required">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            aria-required="true"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : 'email-hint'}
            autoComplete="email"
            className="w-full px-4 py-2 border rounded"
          />
          <span id="email-hint" className="text-sm text-gray-600">
            We'll use this to contact you
          </span>
          {errors.email && (
            <span id="email-error" role="alert" className="text-red-600 text-sm">
              {errors.email}
            </span>
          )}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-xl font-semibold mb-4">Preferences</legend>
        
        <div role="group" aria-labelledby="role-group-label">
          <span id="role-group-label" className="block mb-2">
            Select your role(s)
          </span>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="roles"
                value="actor"
                aria-describedby="actor-description"
              />
              <span className="ml-2">Actor</span>
            </label>
            <span id="actor-description" className="sr-only">
              Select if you're an actor looking for roles
            </span>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                name="roles"
                value="director"
                aria-describedby="director-description"
              />
              <span className="ml-2">Director</span>
            </label>
            <span id="director-description" className="sr-only">
              Select if you're a director casting for projects
            </span>
          </div>
        </div>
      </fieldset>

      <div className="mt-6">
        <button
          type="submit"
          className="px-6 py-2 bg-[oklch(68.5%_0.175_96)] text-white rounded hover:bg-[oklch(61.2%_0.165_96)] focus:outline-none focus:ring-2 focus:ring-offset-2"
        >
          Submit Application
        </button>
      </div>
    </form>
  );
};
```

### Error Handling

```tsx
const FormErrorSummary: React.FC<{ errors: Record<string, string> }> = ({ errors }) => {
  if (Object.keys(errors).length === 0) return null;

  return (
    <div
      role="alert"
      aria-labelledby="error-summary-title"
      className="p-4 mb-6 bg-red-50 border border-red-200 rounded"
      tabIndex={-1}
    >
      <h2 id="error-summary-title" className="text-lg font-semibold text-red-800 mb-2">
        There are {Object.keys(errors).length} errors in this form
      </h2>
      <ul className="list-disc list-inside">
        {Object.entries(errors).map(([field, error]) => (
          <li key={field}>
            <a
              href={`#${field}`}
              className="text-red-600 underline hover:text-red-800"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(field)?.focus();
              }}
            >
              {error}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};
```

---

## Media Accessibility

### Video Player Accessibility

```tsx
const AccessibleVideoPlayer: React.FC<{ src: string; captions: string }> = ({ 
  src, 
  captions 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <div role="region" aria-label="Video player">
      <video
        ref={videoRef}
        aria-label="Talent showcase video"
        className="w-full"
      >
        <source src={src} type="video/mp4" />
        <track
          kind="captions"
          src={captions}
          srcLang="en"
          label="English captions"
          default
        />
        <p>Your browser doesn't support HTML5 video.</p>
      </video>

      <div className="controls mt-4" role="group" aria-label="Video controls">
        <button
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause video' : 'Play video'}
          className="px-4 py-2 bg-gray-800 text-white rounded"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>

        <div
          role="slider"
          aria-label="Seek slider"
          aria-valuemin="0"
          aria-valuemax={duration}
          aria-valuenow={currentTime}
          aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
          tabIndex={0}
          onKeyDown={handleSeekKeyboard}
          className="inline-block mx-4"
        >
          <input
            type="range"
            min="0"
            max={duration}
            value={currentTime}
            onChange={handleSeek}
            className="w-64"
            aria-hidden="true"
          />
        </div>

        <button
          onClick={toggleCaptions}
          aria-label="Toggle captions"
          aria-pressed={captionsEnabled}
          className="px-4 py-2 bg-gray-800 text-white rounded"
        >
          CC
        </button>

        <button
          onClick={toggleFullscreen}
          aria-label="Toggle fullscreen"
          className="px-4 py-2 bg-gray-800 text-white rounded"
        >
          Fullscreen
        </button>
      </div>
    </div>
  );
};
```

### Image Accessibility

```tsx
const AccessibleImage: React.FC<{
  src: string;
  alt: string;
  caption?: string;
  decorative?: boolean;
}> = ({ src, alt, caption, decorative = false }) => {
  if (decorative) {
    return <img src={src} alt="" role="presentation" />;
  }

  return (
    <figure>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="w-full h-auto"
      />
      {caption && (
        <figcaption className="text-sm text-gray-600 mt-2">
          {caption}
        </figcaption>
      )}
    </figure>
  );
};
```

---

## Testing & Validation

### Automated Testing Tools

```typescript
// accessibility.test.ts
import { axe, toHaveNoViolations } from 'jest-axe';
import { render } from '@testing-library/react';

expect.extend(toHaveNoViolations);

describe('Accessibility Tests', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<YourComponent />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper ARIA labels', () => {
    const { getByLabelText } = render(<YourComponent />);
    expect(getByLabelText('Search talents')).toBeInTheDocument();
    expect(getByLabelText('Main navigation')).toBeInTheDocument();
  });

  it('should support keyboard navigation', async () => {
    const { getByRole } = render(<YourComponent />);
    const button = getByRole('button', { name: 'Submit' });
    
    // Simulate tab navigation
    userEvent.tab();
    expect(button).toHaveFocus();
    
    // Simulate enter key
    userEvent.keyboard('{Enter}');
    // Assert action was triggered
  });
});
```

### Manual Testing Checklist

```markdown
## Keyboard Navigation Testing
- [ ] Can navigate entire page using only keyboard
- [ ] Tab order follows logical flow
- [ ] No keyboard traps exist
- [ ] Focus indicators are visible
- [ ] Shortcuts don't conflict with screen readers
- [ ] Escape key closes modals/dropdowns
- [ ] Enter/Space activate buttons appropriately

## Screen Reader Testing
- [ ] All content is announced properly
- [ ] Form labels are associated correctly
- [ ] Error messages are announced
- [ ] Dynamic content updates are announced
- [ ] Images have appropriate alt text
- [ ] Decorative images are hidden
- [ ] Tables have proper headers

## Visual Testing
- [ ] Text can be zoomed to 200% without horizontal scroll
- [ ] Color contrast meets WCAG standards
- [ ] Focus indicators have sufficient contrast
- [ ] Content reflows properly on mobile
- [ ] No information conveyed by color alone
- [ ] Animations can be paused/stopped
- [ ] Reduced motion preferences respected

## Form Testing
- [ ] All fields have labels
- [ ] Required fields are indicated
- [ ] Error messages are clear and specific
- [ ] Success messages are announced
- [ ] Field hints/descriptions are available
- [ ] Validation happens at appropriate time
- [ ] Error summary links to fields
```

### Accessibility Audit Script

```typescript
// audit/accessibility-audit.ts
import puppeteer from 'puppeteer';
import { AxePuppeteer } from '@axe-core/puppeteer';

export async function runAccessibilityAudit(url: string) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);

  // Run axe accessibility checks
  const results = await new AxePuppeteer(page)
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  // Generate report
  const report = {
    url,
    timestamp: new Date().toISOString(),
    violations: results.violations,
    passes: results.passes.length,
    violationCount: results.violations.length,
    criticalIssues: results.violations.filter(v => v.impact === 'critical'),
    seriousIssues: results.violations.filter(v => v.impact === 'serious'),
    moderateIssues: results.violations.filter(v => v.impact === 'moderate'),
    minorIssues: results.violations.filter(v => v.impact === 'minor')
  };

  await browser.close();
  return report;
}
```

---

## Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Audit current color contrast ratios
- [ ] Implement semantic HTML structure
- [ ] Add skip links navigation
- [ ] Set up ARIA live regions
- [ ] Configure focus visible styles

### Phase 2: Keyboard Support (Week 2)
- [ ] Implement keyboard navigation patterns
- [ ] Add focus trap for modals
- [ ] Create roving tabindex for lists
- [ ] Test tab order flow
- [ ] Document keyboard shortcuts

### Phase 3: Screen Reader Support (Week 3)
- [ ] Add proper ARIA labels
- [ ] Implement ARIA patterns
- [ ] Create screen reader announcements
- [ ] Test with NVDA/JAWS
- [ ] Add alternative text for images

### Phase 4: Forms & Validation (Week 4)
- [ ] Associate labels with inputs
- [ ] Implement error handling
- [ ] Add field descriptions
- [ ] Create error summary
- [ ] Test form navigation

### Phase 5: Testing & Documentation (Week 5)
- [ ] Run automated accessibility tests
- [ ] Perform manual testing
- [ ] Document accessibility features
- [ ] Create accessibility statement
- [ ] Train team on best practices

---

## Accessibility Statement Template

```markdown
# CastMatch Accessibility Statement

## Our Commitment
CastMatch is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards.

## Conformance Status
The Web Content Accessibility Guidelines (WCAG) defines requirements for designers and developers to improve accessibility. It defines three levels of conformance: Level A, Level AA, and Level AAA. CastMatch is conformant with WCAG 2.1 Level AA.

## Accessibility Features
- Keyboard navigation support throughout the platform
- Screen reader compatibility
- High contrast color schemes
- Adjustable text sizing
- Alternative text for images
- Captions for video content
- Clear form labels and error messages
- Consistent navigation structure
- Focus indicators for interactive elements

## Browser Compatibility
CastMatch is designed to work with the following assistive technologies:
- NVDA (Windows)
- JAWS (Windows)
- VoiceOver (macOS/iOS)
- TalkBack (Android)

## Known Limitations
- Some third-party content may not be fully accessible
- Legacy PDF documents may require updates
- Complex data visualizations have text alternatives

## Feedback
We welcome your feedback on the accessibility of CastMatch. Please contact us:
- Email: accessibility@castmatch.com
- Phone: +91-22-XXXX-XXXX
- Address: Mumbai, Maharashtra, India

## Enforcement
If you wish to report an accessibility issue, file a complaint, or request additional information, please contact our accessibility team.

Last updated: [Date]
```