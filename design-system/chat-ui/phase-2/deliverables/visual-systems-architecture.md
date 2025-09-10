# CastMatch Chat UI Visual Systems Architecture
**Visual Systems Architect Deliverable**
*Created: 2025-09-04*

## COMPONENT LIBRARY ARCHITECTURE

### Design Token System Foundation
Complete token system for chat interface components, organized hierarchically for maintainability and themed for Mumbai cinema aesthetic.

```css
/* === DESIGN TOKENS HIERARCHY === */

/* PRIMITIVE TOKENS (Atomic Values) */
:root {
  /* Color Primitives */
  --primitive-black-pure: #000000;
  --primitive-white-pure: #FFFFFF;
  --primitive-gold-pure: #FFD700;
  --primitive-gold-dark: #B8860B;
  --primitive-gold-light: #FFEF94;
  --primitive-red-bollywood: #DC143C;
  --primitive-blue-cinema: #1E3A8A;
  --primitive-green-success: #10B981;
  --primitive-amber-warning: #F59E0B;
  --primitive-red-error: #EF4444;
  
  /* Gray Scale (Mumbai Night Palette) */
  --primitive-gray-50: #FAFAFA;
  --primitive-gray-100: #F5F5F5;
  --primitive-gray-200: #E5E5E5;
  --primitive-gray-300: #D4D4D4;
  --primitive-gray-400: #A3A3A3;
  --primitive-gray-500: #737373;
  --primitive-gray-600: #525252;
  --primitive-gray-700: #404040;
  --primitive-gray-800: #262626;
  --primitive-gray-900: #171717;
  --primitive-gray-950: #0A0A0A;
  
  /* Spacing Primitives (8-Point System) */
  --space-1: 0.125rem; /* 2px */
  --space-2: 0.25rem;  /* 4px */
  --space-3: 0.5rem;   /* 8px */
  --space-4: 0.75rem;  /* 12px */
  --space-5: 1rem;     /* 16px */
  --space-6: 1.25rem;  /* 20px */
  --space-7: 1.5rem;   /* 24px */
  --space-8: 2rem;     /* 32px */
  --space-9: 2.5rem;   /* 40px */
  --space-10: 3rem;    /* 48px */
  --space-12: 4rem;    /* 64px */
  --space-16: 6rem;    /* 96px */
  
  /* Size Primitives */
  --size-xs: 0.75rem;   /* 12px */
  --size-sm: 0.875rem;  /* 14px */
  --size-md: 1rem;      /* 16px */
  --size-lg: 1.125rem;  /* 18px */
  --size-xl: 1.25rem;   /* 20px */
  --size-2xl: 1.5rem;   /* 24px */
  --size-3xl: 1.875rem; /* 30px */
  --size-4xl: 2.25rem;  /* 36px */
  --size-5xl: 3rem;     /* 48px */
  --size-6xl: 4rem;     /* 64px */
}

/* SEMANTIC TOKENS (Contextual Values) */
:root {
  /* Background Colors */
  --bg-primary: var(--primitive-black-pure);
  --bg-secondary: var(--primitive-gray-950);
  --bg-tertiary: var(--primitive-gray-900);
  --bg-surface: var(--primitive-gray-800);
  --bg-overlay: rgba(0, 0, 0, 0.8);
  --bg-glass: rgba(0, 0, 0, 0.6);
  
  /* Text Colors */
  --text-primary: var(--primitive-white-pure);
  --text-secondary: var(--primitive-gray-300);
  --text-tertiary: var(--primitive-gray-500);
  --text-inverse: var(--primitive-black-pure);
  --text-accent: var(--primitive-gold-pure);
  --text-link: var(--primitive-blue-cinema);
  --text-success: var(--primitive-green-success);
  --text-warning: var(--primitive-amber-warning);
  --text-error: var(--primitive-red-error);
  
  /* Border Colors */
  --border-primary: var(--primitive-gray-700);
  --border-secondary: var(--primitive-gray-800);
  --border-accent: var(--primitive-gold-pure);
  --border-success: var(--primitive-green-success);
  --border-warning: var(--primitive-amber-warning);
  --border-error: var(--primitive-red-error);
  --border-focus: var(--primitive-gold-pure);
  
  /* Interactive States */
  --interactive-primary: var(--primitive-gold-pure);
  --interactive-primary-hover: var(--primitive-gold-light);
  --interactive-primary-active: var(--primitive-gold-dark);
  --interactive-secondary: var(--primitive-gray-700);
  --interactive-secondary-hover: var(--primitive-gray-600);
  --interactive-secondary-active: var(--primitive-gray-800);
  
  /* Shadow Colors */
  --shadow-primary: rgba(0, 0, 0, 0.25);
  --shadow-secondary: rgba(0, 0, 0, 0.15);
  --shadow-accent: rgba(255, 215, 0, 0.25);
  --shadow-focus: rgba(255, 215, 0, 0.5);
}

/* COMPONENT TOKENS (Specific Values) */
:root {
  /* Message Bubble Tokens */
  --message-bg-user: var(--bg-surface);
  --message-bg-ai: var(--bg-secondary);
  --message-bg-system: var(--bg-tertiary);
  --message-text-user: var(--text-primary);
  --message-text-ai: var(--text-primary);
  --message-text-system: var(--text-secondary);
  --message-border-radius: var(--space-4);
  --message-padding-x: var(--space-5);
  --message-padding-y: var(--space-4);
  
  /* Talent Card Tokens */
  --card-bg-primary: var(--bg-glass);
  --card-bg-hover: rgba(255, 215, 0, 0.1);
  --card-border-default: rgba(255, 215, 0, 0.2);
  --card-border-hover: rgba(255, 215, 0, 0.4);
  --card-border-active: var(--border-accent);
  --card-shadow-default: var(--shadow-primary);
  --card-shadow-hover: var(--shadow-accent);
  --card-border-radius: var(--space-4);
  --card-padding: var(--space-5);
  
  /* Button Tokens */
  --btn-primary-bg: var(--interactive-primary);
  --btn-primary-text: var(--text-inverse);
  --btn-primary-border: var(--interactive-primary);
  --btn-secondary-bg: transparent;
  --btn-secondary-text: var(--text-primary);
  --btn-secondary-border: var(--border-primary);
  --btn-border-radius: var(--space-3);
  --btn-padding-x: var(--space-5);
  --btn-padding-y: var(--space-4);
  
  /* Input Tokens */
  --input-bg: var(--bg-surface);
  --input-text: var(--text-primary);
  --input-placeholder: var(--text-tertiary);
  --input-border: var(--border-secondary);
  --input-border-focus: var(--border-focus);
  --input-border-radius: var(--space-4);
  --input-padding-x: var(--space-5);
  --input-padding-y: var(--space-4);
}
```

### Component Architecture System
Modular component system with consistent API and Mumbai cinema theming:

```css
/* === CORE COMPONENT CLASSES === */

/* Base Component */
.cm-component {
  box-sizing: border-box;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-feature-settings: 'kern' 1, 'liga' 1, 'calt' 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Interactive Component Base */
.cm-interactive {
  @extend .cm-component;
  cursor: pointer;
  transition: all 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
  user-select: none;
  
  &:focus {
    outline: 3px solid var(--shadow-focus);
    outline-offset: 2px;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }
}

/* Glassmorphism Base */
.cm-glass {
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  background: var(--bg-glass);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
```

## CHAT COMPONENT SPECIFICATIONS

### 1. Message Components

#### Message Bubble System
```css
/* Base Message Bubble */
.cm-message {
  @extend .cm-component;
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  padding: var(--space-4) 0;
  animation: messageEntrance 0.3s cubic-bezier(0.19, 1, 0.22, 1);
  
  /* Message content */
  &__content {
    flex: 1;
    min-width: 0; /* Prevent flex overflow */
  }
  
  /* Message bubble */
  &__bubble {
    padding: var(--message-padding-y) var(--message-padding-x);
    border-radius: var(--message-border-radius);
    background: var(--message-bg-ai);
    color: var(--message-text-ai);
    box-shadow: var(--shadow-secondary);
    position: relative;
    
    /* Tail indicator */
    &::before {
      content: '';
      position: absolute;
      width: 0;
      height: 0;
      border-style: solid;
    }
  }
  
  /* Avatar */
  &__avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--interactive-primary), var(--primitive-gold-dark));
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(255, 215, 0, 0.3);
  }
  
  /* Timestamp */
  &__timestamp {
    font-size: var(--size-xs);
    color: var(--text-tertiary);
    margin-top: var(--space-2);
  }
}

/* Message Variants */
.cm-message--user {
  flex-direction: row-reverse;
  
  .cm-message__bubble {
    background: var(--message-bg-user);
    color: var(--message-text-user);
    
    &::before {
      right: -8px;
      top: 12px;
      border-width: 8px 0 8px 8px;
      border-color: transparent transparent transparent var(--message-bg-user);
    }
  }
}

.cm-message--ai {
  .cm-message__bubble {
    &::before {
      left: -8px;
      top: 12px;
      border-width: 8px 8px 8px 0;
      border-color: transparent var(--message-bg-ai) transparent transparent;
    }
  }
}

.cm-message--system {
  justify-content: center;
  
  .cm-message__bubble {
    background: var(--message-bg-system);
    color: var(--message-text-system);
    border-radius: 20px;
    padding: var(--space-3) var(--space-5);
    font-size: var(--size-sm);
    
    &::before {
      display: none;
    }
  }
  
  .cm-message__avatar {
    display: none;
  }
}

/* Animation Keyframes */
@keyframes messageEntrance {
  0% {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  60% {
    transform: translateY(-2px) scale(1.01);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

### 2. Talent Card Components

#### Talent Card System
```css
/* Base Talent Card */
.cm-talent-card {
  @extend .cm-component;
  @extend .cm-glass;
  @extend .cm-interactive;
  
  border-radius: var(--card-border-radius);
  border: 1px solid var(--card-border-default);
  padding: var(--card-padding);
  background: var(--card-bg-primary);
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  
  &:hover {
    background: var(--card-bg-hover);
    border-color: var(--card-border-hover);
    box-shadow: 
      0 12px 40px rgba(0, 0, 0, 0.4),
      0 0 0 1px rgba(255, 215, 0, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
    transform: translateY(-4px);
  }
  
  &:active {
    transform: translateY(-2px) scale(0.98);
  }
  
  /* Card Header */
  &__header {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    margin-bottom: var(--space-4);
  }
  
  /* Avatar */
  &__avatar {
    width: 80px;
    height: 80px;
    border-radius: 8px;
    object-fit: cover;
    background: linear-gradient(135deg, var(--primitive-gray-700), var(--primitive-gray-600));
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    flex-shrink: 0;
  }
  
  /* Info Section */
  &__info {
    flex: 1;
    min-width: 0;
  }
  
  &__name {
    font-size: var(--size-lg);
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 var(--space-2) 0;
    line-height: 1.2;
  }
  
  &__meta {
    font-size: var(--size-sm);
    color: var(--text-secondary);
    line-height: 1.4;
  }
  
  /* Credits Section */
  &__credits {
    margin: var(--space-4) 0;
    padding: var(--space-4);
    background: rgba(255, 255, 255, 0.05);
    border-radius: var(--space-2);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  &__credit-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2) 0;
    font-size: var(--size-sm);
    color: var(--text-secondary);
    
    &:not(:last-child) {
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
  }
  
  /* Actions Section */
  &__actions {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-4);
    padding-top: var(--space-4);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
}

/* Talent Card Variants */
.cm-talent-card--inline {
  max-width: 320px;
  
  .cm-talent-card__avatar {
    width: 60px;
    height: 60px;
  }
  
  .cm-talent-card__credits,
  .cm-talent-card__actions {
    display: none;
  }
}

.cm-talent-card--expanded {
  max-width: 400px;
  
  .cm-talent-card__credits {
    display: block;
  }
}

.cm-talent-card--comparison {
  border: 2px solid var(--border-accent);
  background: rgba(255, 215, 0, 0.05);
  
  &::before {
    content: '★';
    position: absolute;
    top: var(--space-3);
    right: var(--space-3);
    color: var(--text-accent);
    font-size: var(--size-xl);
  }
}
```

### 3. Interactive Components

#### Button System
```css
/* Base Button */
.cm-button {
  @extend .cm-interactive;
  
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--btn-padding-y) var(--btn-padding-x);
  border-radius: var(--btn-border-radius);
  font-size: var(--size-md);
  font-weight: 500;
  line-height: 1;
  border: 1px solid transparent;
  text-decoration: none;
  white-space: nowrap;
  min-height: 44px; /* Accessibility */
  
  /* Icon sizing */
  .cm-icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }
}

/* Button Variants */
.cm-button--primary {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
  border-color: var(--btn-primary-border);
  box-shadow: 
    0 2px 4px rgba(255, 215, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  
  &:hover {
    background: var(--interactive-primary-hover);
    box-shadow: 
      0 4px 12px rgba(255, 215, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
    transform: translateY(-1px);
  }
  
  &:active {
    background: var(--interactive-primary-active);
    transform: translateY(0);
    box-shadow: 
      0 1px 2px rgba(255, 215, 0, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }
}

.cm-button--secondary {
  background: var(--btn-secondary-bg);
  color: var(--btn-secondary-text);
  border-color: var(--btn-secondary-border);
  
  &:hover {
    background: var(--interactive-secondary-hover);
    border-color: var(--border-accent);
    box-shadow: 0 2px 8px rgba(255, 215, 0, 0.1);
  }
  
  &:active {
    background: var(--interactive-secondary-active);
  }
}

.cm-button--ghost {
  background: transparent;
  color: var(--text-secondary);
  border-color: transparent;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-primary);
  }
}

/* Button Sizes */
.cm-button--sm {
  padding: var(--space-3) var(--space-4);
  font-size: var(--size-sm);
  min-height: 36px;
  
  .cm-icon {
    width: 16px;
    height: 16px;
  }
}

.cm-button--lg {
  padding: var(--space-5) var(--space-8);
  font-size: var(--size-lg);
  min-height: 52px;
  
  .cm-icon {
    width: 20px;
    height: 20px;
  }
}
```

#### Input Components
```css
/* Base Input */
.cm-input {
  @extend .cm-component;
  
  display: block;
  width: 100%;
  padding: var(--input-padding-y) var(--input-padding-x);
  font-size: var(--size-md);
  line-height: 1.5;
  color: var(--input-text);
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: var(--input-border-radius);
  transition: all 0.2s ease;
  
  &::placeholder {
    color: var(--input-placeholder);
  }
  
  &:focus {
    outline: none;
    border-color: var(--input-border-focus);
    box-shadow: 
      0 0 0 3px rgba(255, 215, 0, 0.1),
      0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  &:disabled {
    background: var(--bg-tertiary);
    color: var(--text-tertiary);
    cursor: not-allowed;
  }
}

/* Chat Input Specific */
.cm-chat-input {
  @extend .cm-input;
  
  min-height: 56px;
  resize: vertical;
  padding-right: var(--space-16); /* Space for send button */
  
  /* Multi-line support */
  &[data-multiline="true"] {
    min-height: 56px;
    max-height: 200px;
    overflow-y: auto;
  }
}

/* Input Container */
.cm-input-container {
  position: relative;
  display: flex;
  align-items: flex-end;
  
  .cm-chat-input {
    flex: 1;
  }
  
  .cm-send-button {
    position: absolute;
    right: var(--space-3);
    bottom: var(--space-3);
    padding: var(--space-3);
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
```

## ADVANCED COMPONENT FEATURES

### Dark Theme Variations
```css
/* Dark Theme Support (Default) */
[data-theme="dark"] {
  /* Already implemented as default */
}

/* High Contrast Mode */
[data-theme="high-contrast"] {
  --bg-primary: #000000;
  --text-primary: #FFFFFF;
  --border-primary: #FFFFFF;
  --interactive-primary: #FFFF00;
  --interactive-primary-hover: #FFFF80;
}

/* Light Theme (Optional) */
[data-theme="light"] {
  --bg-primary: #FFFFFF;
  --bg-secondary: #F8F9FA;
  --bg-tertiary: #E9ECEF;
  --text-primary: #212529;
  --text-secondary: #6C757D;
  --text-tertiary: #ADB5BD;
}
```

### Animation System
```css
/* Component Animations */
@keyframes componentFadeIn {
  0% {
    opacity: 0;
    transform: translateY(10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes componentSlideIn {
  0% {
    opacity: 0;
    transform: translateX(-20px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes goldenGlow {
  0% {
    box-shadow: 0 0 5px rgba(255, 215, 0, 0.3);
  }
  50% {
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.6);
  }
  100% {
    box-shadow: 0 0 5px rgba(255, 215, 0, 0.3);
  }
}

/* Animation Utilities */
.animate-fade-in {
  animation: componentFadeIn 0.3s ease-out;
}

.animate-slide-in {
  animation: componentSlideIn 0.3s ease-out;
}

.animate-glow {
  animation: goldenGlow 2s ease-in-out infinite;
}

/* Reduced Motion Support */
@media (prefers-reduced-motion: reduce) {
  .animate-fade-in,
  .animate-slide-in,
  .animate-glow {
    animation: none;
  }
  
  * {
    transition-duration: 0.01ms !important;
  }
}
```

## COMPONENT USAGE DOCUMENTATION

### Implementation Examples
```html
<!-- Message Example -->
<div class="cm-message cm-message--ai">
  <div class="cm-message__avatar">
    <img src="ai-avatar.jpg" alt="AI Assistant" />
  </div>
  <div class="cm-message__content">
    <div class="cm-message__bubble">
      <p>I found 5 talented actresses for your lead role. Here are my top recommendations:</p>
    </div>
    <div class="cm-message__timestamp">2:34 PM</div>
  </div>
</div>

<!-- Talent Card Example -->
<div class="cm-talent-card cm-talent-card--expanded">
  <div class="cm-talent-card__header">
    <img class="cm-talent-card__avatar" src="priya-headshot.jpg" alt="Priya Sharma" />
    <div class="cm-talent-card__info">
      <h3 class="cm-talent-card__name">Priya Sharma</h3>
      <div class="cm-talent-card__meta">Age: 28 • Experience: 8 years</div>
    </div>
  </div>
  
  <div class="cm-talent-card__credits">
    <div class="cm-talent-card__credit-item">
      <span>Notable Work</span>
      <span>"Dangal", "Queen"</span>
    </div>
    <div class="cm-talent-card__credit-item">
      <span>Training</span>
      <span>NFDC, Prithvi Theatre</span>
    </div>
  </div>
  
  <div class="cm-talent-card__actions">
    <button class="cm-button cm-button--primary cm-button--sm">
      <span>View Profile</span>
    </button>
    <button class="cm-button cm-button--secondary cm-button--sm">
      <span>Schedule</span>
    </button>
  </div>
</div>

<!-- Chat Input Example -->
<div class="cm-input-container">
  <textarea 
    class="cm-chat-input" 
    placeholder="Describe the type of talent you're looking for..."
    data-multiline="true"
  ></textarea>
  <button class="cm-button cm-button--primary cm-send-button">
    <svg class="cm-icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
    </svg>
  </button>
</div>
```

### JavaScript Integration APIs
```javascript
// Component Event Handling
class CastMatchChatUI {
  constructor(container) {
    this.container = container;
    this.initializeComponents();
  }
  
  initializeComponents() {
    // Message components
    this.messageComponents = this.container.querySelectorAll('.cm-message');
    this.talentCards = this.container.querySelectorAll('.cm-talent-card');
    this.buttons = this.container.querySelectorAll('.cm-button');
    
    this.bindEvents();
  }
  
  bindEvents() {
    // Talent card interactions
    this.talentCards.forEach(card => {
      card.addEventListener('click', this.handleTalentCardClick.bind(this));
      card.addEventListener('mouseenter', this.handleTalentCardHover.bind(this));
    });
    
    // Button interactions
    this.buttons.forEach(button => {
      button.addEventListener('click', this.handleButtonClick.bind(this));
    });
  }
  
  handleTalentCardClick(event) {
    const card = event.currentTarget;
    const talentId = card.dataset.talentId;
    
    // Add selection animation
    card.classList.add('animate-glow');
    
    // Emit custom event
    this.container.dispatchEvent(new CustomEvent('talentSelected', {
      detail: { talentId, card }
    }));
  }
  
  addMessage(content, type = 'ai', options = {}) {
    const messageElement = this.createMessageElement(content, type, options);
    const messagesContainer = this.container.querySelector('.messages-container');
    
    messagesContainer.appendChild(messageElement);
    messageElement.classList.add('animate-fade-in');
    
    // Auto-scroll to new message
    messageElement.scrollIntoView({ behavior: 'smooth' });
  }
  
  createMessageElement(content, type, options) {
    const template = `
      <div class="cm-message cm-message--${type}">
        <div class="cm-message__avatar">
          <img src="${options.avatar || 'default-avatar.jpg'}" alt="${type} avatar" />
        </div>
        <div class="cm-message__content">
          <div class="cm-message__bubble">
            ${content}
          </div>
          <div class="cm-message__timestamp">
            ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    `;
    
    const wrapper = document.createElement('div');
    wrapper.innerHTML = template;
    return wrapper.firstElementChild;
  }
}
```

---

**Visual Systems Architecture Complete**: Comprehensive component library with design tokens, Mumbai cinema theming, and accessibility features.

**Next Phase Handoff**: Typography Designer and Color Lighting Artist ready to enhance and refine the visual system.