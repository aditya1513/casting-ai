/**
 * Accessibility-Focused Interaction Patterns for CastMatch
 * Ensures all interactions are accessible via keyboard, screen reader, and assistive technologies
 */

export interface AccessibilityOptions {
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  screenReaderMode: boolean;
  keyboardOnlyMode: boolean;
  focusVisible: boolean;
  announcements: boolean;
}

export interface FocusManagementOptions {
  trapFocus?: boolean;
  restoreFocus?: boolean;
  initialFocus?: string;
  skipLinks?: string[];
}

class AccessibilityInteractionSystem {
  private options: AccessibilityOptions;
  private focusHistory: HTMLElement[] = [];
  private announcer: HTMLElement;
  private skipLinksContainer: HTMLElement;

  constructor() {
    this.options = this.detectAccessibilityPreferences();
    this.announcer = this.createScreenReaderAnnouncer();
    this.skipLinksContainer = this.createSkipLinksContainer();
    this.initializeAccessibilityFeatures();
    this.bindEventListeners();
  }

  private detectAccessibilityPreferences(): AccessibilityOptions {
    const stored = localStorage.getItem('castmatch-accessibility-preferences');
    const defaults: AccessibilityOptions = {
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      highContrast: window.matchMedia('(prefers-contrast: high)').matches,
      largeText: window.matchMedia('(prefers-font-size: large)').matches,
      screenReaderMode: this.detectScreenReader(),
      keyboardOnlyMode: false,
      focusVisible: true,
      announcements: true
    };

    return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
  }

  private detectScreenReader(): boolean {
    // Check for common screen reader APIs
    return !!(
      (window as any).speechSynthesis ||
      (window as any).navigator?.userAgent.includes('NVDA') ||
      (window as any).navigator?.userAgent.includes('JAWS') ||
      (window as any).navigator?.userAgent.includes('VoiceOver')
    );
  }

  private createScreenReaderAnnouncer(): HTMLElement {
    const announcer = document.createElement('div');
    announcer.id = 'accessibility-announcer';
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only absolute -left-10000px w-1 h-1 overflow-hidden';
    document.body.appendChild(announcer);
    return announcer;
  }

  private createSkipLinksContainer(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'skip-links';
    container.className = 'fixed top-0 left-0 z-50';
    document.body.insertBefore(container, document.body.firstChild);
    return container;
  }

  private initializeAccessibilityFeatures(): void {
    // Apply initial accessibility settings
    this.updateDocumentAttributes();
    this.createSkipLinks();
    this.enhanceFormAccessibility();
    this.addKeyboardNavigationIndicators();
    
    if (this.options.highContrast) {
      document.documentElement.classList.add('high-contrast');
    }
    
    if (this.options.largeText) {
      document.documentElement.classList.add('large-text');
    }
    
    if (this.options.reducedMotion) {
      document.documentElement.classList.add('reduced-motion');
    }
  }

  private updateDocumentAttributes(): void {
    document.documentElement.setAttribute('data-keyboard-mode', this.options.keyboardOnlyMode.toString());
    document.documentElement.setAttribute('data-screen-reader', this.options.screenReaderMode.toString());
    document.documentElement.setAttribute('data-reduced-motion', this.options.reducedMotion.toString());
  }

  private createSkipLinks(): void {
    const skipLinks = [
      { href: '#main-content', text: 'Skip to main content' },
      { href: '#navigation', text: 'Skip to navigation' },
      { href: '#search', text: 'Skip to search' },
      { href: '#footer', text: 'Skip to footer' }
    ];

    skipLinks.forEach(link => {
      const skipLink = document.createElement('a');
      skipLink.href = link.href;
      skipLink.textContent = link.text;
      skipLink.className = 'skip-link absolute -top-10 left-0 bg-blue-600 text-white px-4 py-2 rounded-b-lg font-medium focus:top-0 transition-all duration-200 z-50';
      skipLink.addEventListener('focus', () => {
        skipLink.classList.remove('-top-10');
        skipLink.classList.add('top-0');
      });
      skipLink.addEventListener('blur', () => {
        skipLink.classList.add('-top-10');
        skipLink.classList.remove('top-0');
      });
      this.skipLinksContainer.appendChild(skipLink);
    });
  }

  private enhanceFormAccessibility(): void {
    // Add proper labels and descriptions to form elements
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      const inputs = form.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        this.enhanceFormElement(input as HTMLFormElement);
      });
    });
  }

  private enhanceFormElement(element: HTMLFormElement): void {
    // Ensure proper labeling
    if (!element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby')) {
      const label = element.closest('label') || document.querySelector(`label[for="${element.id}"]`);
      if (label && !element.getAttribute('aria-labelledby')) {
        const labelId = label.id || `label-${element.id}`;
        label.id = labelId;
        element.setAttribute('aria-labelledby', labelId);
      }
    }

    // Add error message associations
    const errorElement = element.parentElement?.querySelector('.error-message');
    if (errorElement) {
      const errorId = errorElement.id || `error-${element.id}`;
      errorElement.id = errorId;
      element.setAttribute('aria-describedby', errorId);
      element.setAttribute('aria-invalid', 'true');
    }

    // Add required field indicators
    if (element.hasAttribute('required')) {
      element.setAttribute('aria-required', 'true');
    }
  }

  private addKeyboardNavigationIndicators(): void {
    const style = document.createElement('style');
    style.textContent = `
      .focus-visible:focus,
      [data-keyboard-mode="true"] :focus {
        outline: 2px solid #0ea5e9 !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.2) !important;
      }
      
      .focus-visible:focus:not(:focus-visible) {
        outline: none !important;
        box-shadow: none !important;
      }
      
      [data-reduced-motion="true"] * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
      
      .high-contrast {
        filter: contrast(150%);
      }
      
      .large-text {
        font-size: 120%;
      }
      
      .sr-only {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      }
    `;
    document.head.appendChild(style);
  }

  private bindEventListeners(): void {
    // Detect keyboard navigation
    document.addEventListener('keydown', this.handleKeyboardNavigation.bind(this));
    document.addEventListener('mousedown', this.handleMouseNavigation.bind(this));
    
    // Focus management
    document.addEventListener('focus', this.handleFocus.bind(this), true);
    document.addEventListener('blur', this.handleBlur.bind(this), true);
    
    // Media query listeners for system preferences
    this.watchSystemPreferences();
  }

  private handleKeyboardNavigation(event: KeyboardEvent): void {
    // Enable keyboard-only mode on first tab press
    if (event.key === 'Tab' && !this.options.keyboardOnlyMode) {
      this.options.keyboardOnlyMode = true;
      this.updateDocumentAttributes();
    }

    // Handle escape key for closing modals/menus
    if (event.key === 'Escape') {
      this.handleEscapeKey();
    }

    // Handle arrow keys for custom navigation
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      this.handleArrowKeyNavigation(event);
    }
  }

  private handleMouseNavigation(event: MouseEvent): void {
    // Disable keyboard-only mode on mouse use
    if (this.options.keyboardOnlyMode) {
      this.options.keyboardOnlyMode = false;
      this.updateDocumentAttributes();
    }
  }

  private handleFocus(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    
    // Store focus history for restoration
    if (target && target !== document.body) {
      this.focusHistory.push(target);
      if (this.focusHistory.length > 10) {
        this.focusHistory.shift();
      }
    }

    // Announce focus changes to screen readers
    if (this.options.screenReaderMode) {
      this.announceFocusChange(target);
    }

    // Scroll focused element into view
    if (this.options.keyboardOnlyMode) {
      target.scrollIntoView({ 
        behavior: this.options.reducedMotion ? 'auto' : 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }

  private handleBlur(event: FocusEvent): void {
    // Handle any cleanup needed when element loses focus
  }

  private handleEscapeKey(): void {
    // Close any open modals or menus
    const activeModal = document.querySelector('[role="dialog"][aria-hidden="false"]');
    if (activeModal) {
      this.closeModal(activeModal as HTMLElement);
      return;
    }

    const activeMenu = document.querySelector('[role="menu"][aria-expanded="true"]');
    if (activeMenu) {
      this.closeMenu(activeMenu as HTMLElement);
      return;
    }

    // Return focus to main content if nothing to close
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.focus();
    }
  }

  private handleArrowKeyNavigation(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    const role = target.getAttribute('role');

    switch (role) {
      case 'menubar':
      case 'menu':
        this.handleMenuNavigation(event, target);
        break;
      case 'tablist':
        this.handleTabListNavigation(event, target);
        break;
      case 'listbox':
        this.handleListboxNavigation(event, target);
        break;
      case 'grid':
        this.handleGridNavigation(event, target);
        break;
    }
  }

  private handleMenuNavigation(event: KeyboardEvent, menu: HTMLElement): void {
    const menuItems = Array.from(menu.querySelectorAll('[role="menuitem"]')) as HTMLElement[];
    const currentIndex = menuItems.findIndex(item => item === document.activeElement);
    
    let nextIndex = currentIndex;
    
    switch (event.key) {
      case 'ArrowDown':
        nextIndex = (currentIndex + 1) % menuItems.length;
        break;
      case 'ArrowUp':
        nextIndex = currentIndex <= 0 ? menuItems.length - 1 : currentIndex - 1;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = menuItems.length - 1;
        break;
    }

    if (nextIndex !== currentIndex) {
      event.preventDefault();
      menuItems[nextIndex].focus();
    }
  }

  private handleTabListNavigation(event: KeyboardEvent, tablist: HTMLElement): void {
    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]')) as HTMLElement[];
    const currentIndex = tabs.findIndex(tab => tab === document.activeElement);
    
    let nextIndex = currentIndex;
    
    switch (event.key) {
      case 'ArrowLeft':
        nextIndex = currentIndex <= 0 ? tabs.length - 1 : currentIndex - 1;
        break;
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % tabs.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = tabs.length - 1;
        break;
    }

    if (nextIndex !== currentIndex) {
      event.preventDefault();
      tabs[nextIndex].focus();
      tabs[nextIndex].click(); // Activate the tab
    }
  }

  private handleListboxNavigation(event: KeyboardEvent, listbox: HTMLElement): void {
    const options = Array.from(listbox.querySelectorAll('[role="option"]')) as HTMLElement[];
    const currentIndex = options.findIndex(option => option.getAttribute('aria-selected') === 'true');
    
    let nextIndex = currentIndex;
    
    switch (event.key) {
      case 'ArrowDown':
        nextIndex = (currentIndex + 1) % options.length;
        break;
      case 'ArrowUp':
        nextIndex = currentIndex <= 0 ? options.length - 1 : currentIndex - 1;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = options.length - 1;
        break;
    }

    if (nextIndex !== currentIndex) {
      event.preventDefault();
      // Update selection
      options[currentIndex]?.setAttribute('aria-selected', 'false');
      options[nextIndex].setAttribute('aria-selected', 'true');
      options[nextIndex].focus();
      
      // Announce selection change
      this.announce(`${options[nextIndex].textContent} selected`);
    }
  }

  private handleGridNavigation(event: KeyboardEvent, grid: HTMLElement): void {
    // Implementation for grid navigation (talent cards, etc.)
    const rows = Array.from(grid.querySelectorAll('[role="row"]'));
    const currentCell = document.activeElement as HTMLElement;
    const currentRow = currentCell.closest('[role="row"]');
    const currentRowIndex = rows.indexOf(currentRow!);
    const cells = Array.from(currentRow!.querySelectorAll('[role="gridcell"]')) as HTMLElement[];
    const currentCellIndex = cells.indexOf(currentCell);

    switch (event.key) {
      case 'ArrowRight':
        if (currentCellIndex < cells.length - 1) {
          cells[currentCellIndex + 1].focus();
        }
        event.preventDefault();
        break;
      case 'ArrowLeft':
        if (currentCellIndex > 0) {
          cells[currentCellIndex - 1].focus();
        }
        event.preventDefault();
        break;
      case 'ArrowDown':
        if (currentRowIndex < rows.length - 1) {
          const nextRow = rows[currentRowIndex + 1];
          const nextRowCells = Array.from(nextRow.querySelectorAll('[role="gridcell"]')) as HTMLElement[];
          const nextCell = nextRowCells[Math.min(currentCellIndex, nextRowCells.length - 1)];
          nextCell.focus();
        }
        event.preventDefault();
        break;
      case 'ArrowUp':
        if (currentRowIndex > 0) {
          const prevRow = rows[currentRowIndex - 1];
          const prevRowCells = Array.from(prevRow.querySelectorAll('[role="gridcell"]')) as HTMLElement[];
          const prevCell = prevRowCells[Math.min(currentCellIndex, prevRowCells.length - 1)];
          prevCell.focus();
        }
        event.preventDefault();
        break;
    }
  }

  private watchSystemPreferences(): void {
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionQuery.addEventListener('change', (e) => {
      this.options.reducedMotion = e.matches;
      this.updateDocumentAttributes();
    });

    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    highContrastQuery.addEventListener('change', (e) => {
      this.options.highContrast = e.matches;
      document.documentElement.classList.toggle('high-contrast', e.matches);
    });

    const largeTextQuery = window.matchMedia('(prefers-font-size: large)');
    largeTextQuery.addEventListener('change', (e) => {
      this.options.largeText = e.matches;
      document.documentElement.classList.toggle('large-text', e.matches);
    });
  }

  private announceFocusChange(element: HTMLElement): void {
    if (!this.options.announcements) return;

    let announcement = '';
    const role = element.getAttribute('role') || element.tagName.toLowerCase();
    const label = element.getAttribute('aria-label') ||
                  element.getAttribute('aria-labelledby') && 
                  document.getElementById(element.getAttribute('aria-labelledby')!)?.textContent ||
                  element.textContent?.trim();

    switch (role) {
      case 'button':
        announcement = `${label} button`;
        break;
      case 'link':
        announcement = `${label} link`;
        break;
      case 'menuitem':
        announcement = `${label} menu item`;
        break;
      case 'tab':
        const selected = element.getAttribute('aria-selected') === 'true';
        announcement = `${label} tab${selected ? ', selected' : ''}`;
        break;
      case 'option':
        const optionSelected = element.getAttribute('aria-selected') === 'true';
        announcement = `${label} option${optionSelected ? ', selected' : ''}`;
        break;
      default:
        if (label) {
          announcement = `${label} ${role}`;
        }
    }

    if (announcement) {
      this.announce(announcement, 'polite');
    }
  }

  private closeModal(modal: HTMLElement): void {
    modal.setAttribute('aria-hidden', 'true');
    const closeButton = modal.querySelector('[data-dismiss="modal"]') as HTMLElement;
    if (closeButton) {
      closeButton.click();
    }
    
    // Restore focus to element that opened the modal
    this.restoreFocus();
  }

  private closeMenu(menu: HTMLElement): void {
    menu.setAttribute('aria-expanded', 'false');
    const trigger = document.querySelector(`[aria-controls="${menu.id}"]`) as HTMLElement;
    if (trigger) {
      trigger.focus();
    }
  }

  // PUBLIC API METHODS
  public announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.options.announcements) return;
    
    this.announcer.setAttribute('aria-live', priority);
    this.announcer.textContent = message;
    
    // Clear after announcement to allow repeated messages
    setTimeout(() => {
      this.announcer.textContent = '';
    }, 1000);
  }

  public manageFocus(options: FocusManagementOptions): void {
    if (options.trapFocus) {
      this.trapFocus(options);
    }
    
    if (options.initialFocus) {
      const element = document.querySelector(options.initialFocus) as HTMLElement;
      if (element) {
        element.focus();
      }
    }
  }

  public restoreFocus(): void {
    if (this.focusHistory.length > 0) {
      const lastFocused = this.focusHistory.pop();
      if (lastFocused && document.body.contains(lastFocused)) {
        lastFocused.focus();
      }
    }
  }

  private trapFocus(options: FocusManagementOptions): void {
    // Implementation for focus trapping within modals/dialogs
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') {
        const modal = document.querySelector('[role="dialog"][aria-hidden="false"]');
        if (modal) {
          const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          const firstElement = focusableElements[0] as HTMLElement;
          const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
          
          if (event.shiftKey && document.activeElement === firstElement) {
            lastElement.focus();
            event.preventDefault();
          } else if (!event.shiftKey && document.activeElement === lastElement) {
            firstElement.focus();
            event.preventDefault();
          }
        }
      }
    });
  }

  public updatePreferences(preferences: Partial<AccessibilityOptions>): void {
    this.options = { ...this.options, ...preferences };
    localStorage.setItem('castmatch-accessibility-preferences', JSON.stringify(this.options));
    this.updateDocumentAttributes();
  }

  public getPreferences(): AccessibilityOptions {
    return { ...this.options };
  }

  public addLiveRegion(element: HTMLElement, type: 'polite' | 'assertive' = 'polite'): void {
    element.setAttribute('aria-live', type);
    element.setAttribute('aria-atomic', 'true');
  }

  public makeElementAccessible(element: HTMLElement, role: string, label: string): void {
    element.setAttribute('role', role);
    element.setAttribute('aria-label', label);
    
    if (!element.hasAttribute('tabindex') && ['button', 'link', 'menuitem'].includes(role)) {
      element.setAttribute('tabindex', '0');
    }
  }

  public addScreenReaderText(element: HTMLElement, text: string): void {
    const srText = document.createElement('span');
    srText.className = 'sr-only';
    srText.textContent = text;
    element.appendChild(srText);
  }

  public announcePageChange(pageName: string): void {
    this.announce(`Navigated to ${pageName}`, 'assertive');
  }

  public announceLoadingState(isLoading: boolean, context?: string): void {
    if (isLoading) {
      this.announce(`Loading${context ? ` ${context}` : ''}...`, 'assertive');
    } else {
      this.announce(`${context || 'Content'} loaded`, 'polite');
    }
  }

  public announceError(error: string): void {
    this.announce(`Error: ${error}`, 'assertive');
  }

  public announceSuccess(message: string): void {
    this.announce(`Success: ${message}`, 'polite');
  }
}

// UTILITY FUNCTIONS FOR ACCESSIBILITY
export const accessibilityUtils = {
  isReducedMotionPreferred: (): boolean => 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  
  isHighContrastPreferred: (): boolean =>
    window.matchMedia('(prefers-contrast: high)').matches,
  
  isTouchDevice: (): boolean =>
    'ontouchstart' in window || navigator.maxTouchPoints > 0,
  
  getFocusableElements: (container: HTMLElement): HTMLElement[] =>
    Array.from(container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )) as HTMLElement[],
  
  createSkipLink: (href: string, text: string): HTMLAnchorElement => {
    const link = document.createElement('a');
    link.href = href;
    link.textContent = text;
    link.className = 'skip-link';
    return link;
  },
  
  addAriaLabel: (element: HTMLElement, label: string): void => {
    element.setAttribute('aria-label', label);
  },
  
  addAriaDescription: (element: HTMLElement, description: string): void => {
    const descId = `desc-${Math.random().toString(36).substr(2, 9)}`;
    const descElement = document.createElement('div');
    descElement.id = descId;
    descElement.className = 'sr-only';
    descElement.textContent = description;
    element.parentNode?.insertBefore(descElement, element.nextSibling);
    element.setAttribute('aria-describedby', descId);
  }
};

// Export singleton instance
export const accessibilitySystem = new AccessibilityInteractionSystem();

// React hook for accessibility features
export function useAccessibility() {
  return {
    system: accessibilitySystem,
    announce: (message: string, priority?: 'polite' | 'assertive') => 
      accessibilitySystem.announce(message, priority),
    preferences: accessibilitySystem.getPreferences(),
    updatePreferences: (prefs: Partial<AccessibilityOptions>) => 
      accessibilitySystem.updatePreferences(prefs),
    manageFocus: (options: FocusManagementOptions) => 
      accessibilitySystem.manageFocus(options),
    restoreFocus: () => accessibilitySystem.restoreFocus(),
    utils: accessibilityUtils
  };
}