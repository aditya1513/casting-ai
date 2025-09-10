# CastMatch Chat UI Interaction Design Patterns
**Interaction Design Specialist Deliverable**
*Created: 2025-09-04*

## INTERACTION DESIGN PHILOSOPHY

### Mumbai Cinema Interaction Aesthetic
Every interaction in CastMatch embodies the precision and elegance of professional filmmaking. Like a well-choreographed scene, each micro-interaction serves a purpose: guiding users through casting workflows with intuitive feedback that feels both sophisticated and responsive.

```css
/* === INTERACTION FOUNDATION === */

/* Global interaction timing constants */
:root {
  /* Micro-interaction timings (following 12 principles of animation) */
  --timing-instant: 100ms;      /* Immediate feedback */
  --timing-quick: 150ms;        /* Button presses, toggles */
  --timing-snappy: 200ms;       /* Hover states, focus changes */
  --timing-smooth: 300ms;       /* Card movements, reveals */
  --timing-graceful: 500ms;     /* Modal transitions, page changes */
  --timing-cinematic: 800ms;    /* Dramatic entrances, celebrations */
  
  /* Easing curves inspired by cinematic movement */
  --ease-natural: cubic-bezier(0.25, 0.46, 0.45, 0.94);      /* Gentle, natural */
  --ease-confident: cubic-bezier(0.19, 1, 0.22, 1);          /* Quick start, slow finish */
  --ease-playful: cubic-bezier(0.68, -0.55, 0.265, 1.55);    /* Bouncy, engaging */
  --ease-dramatic: cubic-bezier(0.175, 0.885, 0.32, 1.275);  /* Overshoot for emphasis */
  --ease-precision: cubic-bezier(0.645, 0.045, 0.355, 1);    /* Sharp, precise */
}
```

## MICRO-INTERACTION PATTERNS

### 1. Button Interaction Patterns

#### Primary Action Buttons
```css
/* === PRIMARY BUTTON INTERACTIONS === */

.btn-primary-interaction {
  position: relative;
  overflow: hidden;
  transform: translateY(0);
  transition: all var(--timing-snappy) var(--ease-confident);
  
  /* Initial state with subtle glow */
  box-shadow: 
    0 2px 4px rgba(255, 215, 0, 0.2),
    0 0 0 0 rgba(255, 215, 0, 0.4);
  
  /* Hover state - lift and glow enhancement */
  &:hover {
    transform: translateY(-2px);
    box-shadow: 
      0 4px 12px rgba(255, 215, 0, 0.3),
      0 0 20px rgba(255, 215, 0, 0.2);
    
    /* Subtle background shimmer */
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, 
        transparent 0%, 
        rgba(255, 255, 255, 0.2) 50%, 
        transparent 100%);
      animation: shimmer var(--timing-graceful) var(--ease-natural);
    }
  }
  
  /* Active state - satisfying press feedback */
  &:active {
    transform: translateY(0) scale(0.98);
    transition-duration: var(--timing-quick);
    box-shadow: 
      0 1px 2px rgba(255, 215, 0, 0.3),
      inset 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  
  /* Loading state */
  &.loading {
    pointer-events: none;
    
    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 20px;
      height: 20px;
      margin: -10px 0 0 -10px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    .btn-text {
      opacity: 0;
    }
  }
  
  /* Success state */
  &.success {
    background: var(--gradient-success);
    transform: scale(1.05);
    
    &::after {
      content: '✓';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 18px;
      color: white;
      animation: successPop var(--timing-smooth) var(--ease-playful);
    }
  }
}

@keyframes shimmer {
  0% { left: -100%; }
  100% { left: 100%; }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes successPop {
  0% { 
    opacity: 0; 
    transform: translate(-50%, -50%) scale(0); 
  }
  60% { 
    opacity: 1; 
    transform: translate(-50%, -50%) scale(1.2); 
  }
  100% { 
    opacity: 1; 
    transform: translate(-50%, -50%) scale(1); 
  }
}
```

#### Secondary and Ghost Buttons
```css
/* === SECONDARY BUTTON INTERACTIONS === */

.btn-secondary-interaction {
  border: 1px solid var(--border-primary);
  background: transparent;
  transition: all var(--timing-snappy) var(--ease-natural);
  
  &:hover {
    border-color: var(--border-focus);
    background: rgba(255, 215, 0, 0.05);
    color: var(--text-accent-primary);
    box-shadow: 0 0 12px rgba(255, 215, 0, 0.1);
  }
  
  &:active {
    background: rgba(255, 215, 0, 0.1);
    transform: scale(0.98);
  }
}

.btn-ghost-interaction {
  background: transparent;
  color: var(--text-secondary);
  transition: all var(--timing-quick) var(--ease-natural);
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-primary);
  }
  
  &:active {
    background: rgba(255, 255, 255, 0.15);
  }
}
```

### 2. Talent Card Interaction Patterns

#### Card Hover and Selection States
```css
/* === TALENT CARD INTERACTIONS === */

.talent-card-interactive {
  position: relative;
  cursor: pointer;
  transition: all var(--timing-smooth) var(--ease-confident);
  transform-origin: center bottom;
  
  /* Default state */
  transform: translateY(0) scale(1);
  box-shadow: var(--shadow-lg);
  
  /* Hover state - dramatic lift */
  &:hover {
    transform: translateY(-8px) scale(1.02);
    box-shadow: 
      var(--shadow-2xl),
      0 0 40px rgba(255, 215, 0, 0.2);
    z-index: 10;
    
    /* Avatar glow on hover */
    .talent-avatar {
      box-shadow: 0 0 20px rgba(255, 215, 0, 0.4);
      transform: scale(1.05);
    }
    
    /* Reveal additional info */
    .talent-details-hidden {
      opacity: 1;
      transform: translateY(0);
      transition-delay: 100ms;
    }
    
    /* Subtle background pattern */
    &::before {
      opacity: 1;
    }
  }
  
  /* Active state - press feedback */
  &:active {
    transform: translateY(-4px) scale(1.01);
    transition-duration: var(--timing-quick);
  }
  
  /* Selection state */
  &.selected {
    border: 2px solid var(--cinema-gold-pure);
    box-shadow: 
      var(--shadow-xl),
      0 0 30px rgba(255, 215, 0, 0.4);
    
    /* Selection indicator */
    &::after {
      content: '★';
      position: absolute;
      top: 12px;
      right: 12px;
      color: var(--cinema-gold-pure);
      font-size: 24px;
      animation: starPulse 2s ease-in-out infinite;
    }
  }
  
  /* Background pattern (hidden by default) */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(
      circle at 30% 30%,
      rgba(255, 215, 0, 0.05) 0%,
      transparent 50%
    );
    opacity: 0;
    transition: opacity var(--timing-smooth) var(--ease-natural);
    pointer-events: none;
    border-radius: inherit;
  }
  
  /* Hidden details that appear on hover */
  .talent-details-hidden {
    opacity: 0;
    transform: translateY(10px);
    transition: all var(--timing-smooth) var(--ease-confident);
  }
  
  /* Avatar interaction */
  .talent-avatar {
    transition: all var(--timing-smooth) var(--ease-confident);
    border-radius: 8px;
    overflow: hidden;
    
    /* Image zoom on hover */
    img {
      transition: transform var(--timing-graceful) var(--ease-natural);
    }
  }
  
  &:hover .talent-avatar img {
    transform: scale(1.1);
  }
}

@keyframes starPulse {
  0%, 100% { 
    opacity: 1; 
    transform: scale(1); 
  }
  50% { 
    opacity: 0.7; 
    transform: scale(1.1); 
  }
}
```

#### Card Action Buttons
```css
/* === CARD ACTION INTERACTIONS === */

.card-action-btn {
  opacity: 0;
  transform: translateY(4px);
  transition: all var(--timing-smooth) var(--ease-confident);
  
  .talent-card-interactive:hover & {
    opacity: 1;
    transform: translateY(0);
  }
  
  /* Staggered reveal animation */
  &:nth-child(1) { transition-delay: 0ms; }
  &:nth-child(2) { transition-delay: 50ms; }
  &:nth-child(3) { transition-delay: 100ms; }
  &:nth-child(4) { transition-delay: 150ms; }
  
  /* Individual button hover */
  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-golden-md);
  }
  
  &:active {
    transform: translateY(0);
  }
}
```

### 3. Message Interaction Patterns

#### Message Appearance Animation
```css
/* === MESSAGE INTERACTIONS === */

.message-interactive {
  animation: messageEntrance var(--timing-graceful) var(--ease-confident);
  transition: all var(--timing-snappy) var(--ease-natural);
  
  /* Hover for message options */
  &:hover {
    background: rgba(255, 255, 255, 0.02);
    
    .message-actions {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  /* Message actions (hidden by default) */
  .message-actions {
    position: absolute;
    right: 12px;
    top: 12px;
    opacity: 0;
    transform: translateX(8px);
    transition: all var(--timing-snappy) var(--ease-natural);
    display: flex;
    gap: 4px;
    
    .action-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--bg-surface);
      border: 1px solid var(--border-secondary);
      color: var(--text-secondary);
      transition: all var(--timing-quick) var(--ease-natural);
      
      &:hover {
        background: var(--bg-elevated);
        color: var(--text-accent-primary);
        border-color: var(--border-focus);
        transform: scale(1.1);
      }
    }
  }
}

@keyframes messageEntrance {
  0% {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  60% {
    opacity: 1;
    transform: translateY(-2px) scale(1.02);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

#### Typing Indicator Animation
```css
/* === TYPING INDICATOR === */

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
  background: var(--bg-surface);
  border-radius: 18px;
  border: 1px solid var(--border-secondary);
  
  .typing-text {
    color: var(--text-secondary);
    font-size: var(--size-sm);
    margin-right: 8px;
  }
  
  .typing-dots {
    display: flex;
    gap: 4px;
    
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--text-secondary);
      animation: typingPulse 1.4s ease-in-out infinite both;
      
      &:nth-child(1) { animation-delay: 0ms; }
      &:nth-child(2) { animation-delay: 160ms; }
      &:nth-child(3) { animation-delay: 320ms; }
    }
  }
}

@keyframes typingPulse {
  0%, 80%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  40% {
    opacity: 1;
    transform: scale(1.2);
  }
}
```

### 4. Input Interaction Patterns

#### Chat Input Enhancement
```css
/* === INPUT INTERACTIONS === */

.chat-input-interactive {
  position: relative;
  transition: all var(--timing-snappy) var(--ease-natural);
  
  /* Focus state enhancement */
  &:focus-within {
    .input-field {
      border-color: var(--border-focus);
      box-shadow: 
        0 0 0 3px rgba(255, 215, 0, 0.15),
        var(--shadow-md);
      background: var(--bg-elevated);
    }
    
    .input-label {
      color: var(--text-accent-primary);
      transform: translateY(-2px);
    }
    
    .send-button {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  /* Input field */
  .input-field {
    transition: all var(--timing-snappy) var(--ease-natural);
    padding-right: 60px; /* Space for send button */
  }
  
  /* Floating label animation */
  .input-label {
    position: absolute;
    top: 16px;
    left: 16px;
    color: var(--text-tertiary);
    font-size: var(--size-md);
    transition: all var(--timing-snappy) var(--ease-natural);
    pointer-events: none;
    
    &.floated {
      top: -8px;
      left: 12px;
      font-size: var(--size-xs);
      color: var(--text-accent-primary);
      background: var(--bg-canvas);
      padding: 0 4px;
    }
  }
  
  /* Send button */
  .send-button {
    position: absolute;
    right: 8px;
    bottom: 8px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--gradient-golden-primary);
    border: none;
    color: var(--mumbai-black-pure);
    opacity: 0;
    transform: scale(0.8);
    transition: all var(--timing-smooth) var(--ease-playful);
    cursor: pointer;
    
    &:hover {
      transform: scale(1.1);
      box-shadow: var(--shadow-golden-md);
    }
    
    &:active {
      transform: scale(0.95);
    }
    
    /* Send animation */
    &.sending {
      animation: sendPulse var(--timing-cinematic) var(--ease-natural);
    }
  }
}

@keyframes sendPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
```

### 5. Navigation Interaction Patterns

#### Menu and Navigation Items
```css
/* === NAVIGATION INTERACTIONS === */

.nav-item-interactive {
  position: relative;
  padding: 12px 16px;
  border-radius: 8px;
  transition: all var(--timing-snappy) var(--ease-natural);
  cursor: pointer;
  
  /* Inactive state */
  color: var(--text-secondary);
  background: transparent;
  
  /* Hover state */
  &:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.05);
    
    &::before {
      transform: scaleX(1);
    }
  }
  
  /* Active state */
  &.active {
    color: var(--text-accent-primary);
    background: rgba(255, 215, 0, 0.1);
    
    &::before {
      transform: scaleX(1);
      background: var(--cinema-gold-pure);
    }
  }
  
  /* Underline indicator */
  &::before {
    content: '';
    position: absolute;
    bottom: 0;
    left: 16px;
    right: 16px;
    height: 2px;
    background: var(--text-secondary);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform var(--timing-smooth) var(--ease-confident);
  }
  
  /* Icon animation */
  .nav-icon {
    transition: transform var(--timing-snappy) var(--ease-natural);
  }
  
  &:hover .nav-icon {
    transform: scale(1.1);
  }
}
```

### 6. Modal and Overlay Interactions

#### Modal Entrance/Exit
```css
/* === MODAL INTERACTIONS === */

.modal-interactive {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  
  /* Entrance animation */
  &.entering {
    animation: modalBackdropFade var(--timing-graceful) var(--ease-natural);
    
    .modal-content {
      animation: modalContentSlide var(--timing-graceful) var(--ease-dramatic);
    }
  }
  
  /* Exit animation */
  &.exiting {
    animation: modalBackdropFade var(--timing-graceful) var(--ease-natural) reverse;
    
    .modal-content {
      animation: modalContentSlide var(--timing-graceful) var(--ease-natural) reverse;
    }
  }
  
  .modal-content {
    background: var(--bg-surface);
    border-radius: 16px;
    border: 1px solid var(--border-primary);
    box-shadow: var(--shadow-2xl);
    max-width: 90vw;
    max-height: 90vh;
    overflow: hidden;
    position: relative;
  }
  
  .modal-close {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid var(--border-secondary);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all var(--timing-quick) var(--ease-natural);
    
    &:hover {
      background: var(--bg-elevated);
      color: var(--text-primary);
      transform: scale(1.1);
    }
  }
}

@keyframes modalBackdropFade {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

@keyframes modalContentSlide {
  0% {
    opacity: 0;
    transform: translateY(40px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

## ADVANCED INTERACTION PATTERNS

### Gesture Support
```css
/* === TOUCH AND GESTURE INTERACTIONS === */

.gesture-interactive {
  /* Improved touch targets */
  min-height: 44px;
  min-width: 44px;
  
  /* Touch feedback */
  &:active {
    transform: scale(0.98);
    transition-duration: var(--timing-instant);
  }
  
  /* Swipe gesture support */
  &.swipeable {
    touch-action: pan-x;
    
    &.swiping {
      transition: none;
    }
    
    &.swipe-left {
      transform: translateX(-100px);
      opacity: 0.5;
    }
    
    &.swipe-right {
      transform: translateX(100px);
      opacity: 0.5;
    }
  }
}
```

### Loading States
```css
/* === LOADING STATE INTERACTIONS === */

.loading-interactive {
  position: relative;
  pointer-events: none;
  
  /* Skeleton loading animation */
  &.skeleton {
    background: linear-gradient(
      90deg,
      var(--bg-surface) 25%,
      var(--bg-elevated) 37%,
      var(--bg-surface) 63%
    );
    background-size: 400% 100%;
    animation: skeletonShimmer 1.5s ease-in-out infinite;
  }
  
  /* Pulse loading */
  &.pulse {
    animation: loadingPulse 1.5s ease-in-out infinite;
  }
  
  /* Spinner overlay */
  &.spinner::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 24px;
    height: 24px;
    margin: -12px 0 0 -12px;
    border: 2px solid var(--border-secondary);
    border-top: 2px solid var(--cinema-gold-pure);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
}

@keyframes skeletonShimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes loadingPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

### Error State Interactions
```css
/* === ERROR STATE INTERACTIONS === */

.error-interactive {
  /* Error shake animation */
  &.error-shake {
    animation: errorShake var(--timing-graceful) var(--ease-natural);
  }
  
  /* Error highlight */
  &.error-highlight {
    border-color: var(--border-error);
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    
    /* Error recovery animation */
    &.recovering {
      animation: errorRecover var(--timing-smooth) var(--ease-confidence);
    }
  }
}

@keyframes errorShake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
}

@keyframes errorRecover {
  0% {
    border-color: var(--border-error);
    background: var(--bg-error);
  }
  100% {
    border-color: var(--border-primary);
    background: var(--bg-surface);
  }
}
```

## ACCESSIBILITY INTERACTION ENHANCEMENTS

### Keyboard Navigation
```css
/* === KEYBOARD ACCESSIBILITY === */

.keyboard-interactive {
  /* Focus indicators */
  &:focus {
    outline: 3px solid var(--border-focus);
    outline-offset: 2px;
    box-shadow: 0 0 0 6px rgba(255, 215, 0, 0.2);
  }
  
  /* Skip to content */
  &.skip-link {
    position: absolute;
    top: -40px;
    left: 6px;
    background: var(--bg-elevated);
    color: var(--text-accent-primary);
    padding: 8px 16px;
    border-radius: 4px;
    text-decoration: none;
    font-weight: 600;
    z-index: 10000;
    transition: top var(--timing-quick) var(--ease-natural);
    
    &:focus {
      top: 6px;
    }
  }
}
```

### Screen Reader Support
```css
/* === SCREEN READER INTERACTIONS === */

.sr-interactive {
  /* Live regions for dynamic content */
  &[aria-live="polite"] {
    /* Gentle updates */
  }
  
  &[aria-live="assertive"] {
    /* Urgent updates */
  }
  
  /* Focus management */
  &[aria-expanded="true"] {
    /* Expanded state styling */
  }
  
  &[aria-pressed="true"] {
    /* Pressed state styling */
    background: var(--bg-elevated);
    color: var(--text-accent-primary);
  }
}
```

## IMPLEMENTATION UTILITIES

### JavaScript Interaction Helpers
```javascript
// Interaction utility class
class InteractionManager {
  constructor() {
    this.initializeInteractions();
    this.setupEventListeners();
  }
  
  initializeInteractions() {
    // Add interaction classes to elements
    document.querySelectorAll('[data-interactive]').forEach(element => {
      const interactionType = element.dataset.interactive;
      element.classList.add(`${interactionType}-interactive`);
    });
  }
  
  setupEventListeners() {
    // Talent card interactions
    document.addEventListener('click', (e) => {
      const talentCard = e.target.closest('.talent-card-interactive');
      if (talentCard) {
        this.handleTalentCardClick(talentCard, e);
      }
    });
    
    // Button interactions
    document.addEventListener('click', (e) => {
      const button = e.target.closest('.btn-primary-interaction');
      if (button) {
        this.handleButtonClick(button, e);
      }
    });
  }
  
  handleTalentCardClick(card, event) {
    // Add ripple effect
    this.createRipple(card, event);
    
    // Handle selection
    if (!card.classList.contains('selected')) {
      this.selectTalentCard(card);
    }
  }
  
  handleButtonClick(button, event) {
    // Prevent multiple clicks during animation
    if (button.classList.contains('loading')) return;
    
    // Add loading state
    button.classList.add('loading');
    
    // Simulate async operation
    setTimeout(() => {
      button.classList.remove('loading');
      button.classList.add('success');
      
      setTimeout(() => {
        button.classList.remove('success');
      }, 2000);
    }, 1500);
  }
  
  createRipple(element, event) {
    const ripple = document.createElement('div');
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: ${size}px;
      height: ${size}px;
      background: rgba(255, 215, 0, 0.3);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple 0.6s ease-out;
      pointer-events: none;
    `;
    
    element.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }
  
  selectTalentCard(card) {
    // Remove previous selections
    document.querySelectorAll('.talent-card-interactive.selected')
      .forEach(selected => selected.classList.remove('selected'));
    
    // Add selection with animation delay
    setTimeout(() => {
      card.classList.add('selected');
    }, 100);
    
    // Emit selection event
    card.dispatchEvent(new CustomEvent('talentSelected', {
      detail: { talentId: card.dataset.talentId }
    }));
  }
}

// CSS for ripple animation
const rippleCSS = `
@keyframes ripple {
  to {
    transform: scale(4);
    opacity: 0;
  }
}
`;
```

---

**Interaction Design Patterns Complete**: Comprehensive micro-interaction system with Mumbai cinema elegance, accessibility compliance, and professional feedback patterns.

**Next Agent**: Motion UI Specialist ready for Hollywood-quality animation effects.