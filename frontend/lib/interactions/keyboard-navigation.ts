/**
 * Advanced Keyboard Navigation System for CastMatch
 * Provides comprehensive keyboard shortcuts and vim-style navigation
 */

export interface KeyboardShortcut {
  key: string;
  modifiers?: ('ctrl' | 'cmd' | 'shift' | 'alt')[];
  action: string;
  description: string;
  category: 'global' | 'casting' | 'chat' | 'media' | 'navigation';
  context?: string[];
  preventDefault?: boolean;
}

export interface NavigationState {
  currentFocus: HTMLElement | null;
  focusHistory: HTMLElement[];
  mode: 'normal' | 'vim' | 'accessibility';
  shortcuts: Map<string, KeyboardShortcut>;
}

class KeyboardNavigationSystem {
  private state: NavigationState;
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private focusableElements: string = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
    '.keyboard-focusable'
  ].join(', ');

  constructor() {
    this.state = {
      currentFocus: null,
      focusHistory: [],
      mode: 'normal',
      shortcuts: new Map()
    };
    
    this.initializeShortcuts();
    this.bindEventListeners();
    this.loadUserPreferences();
  }

  private initializeShortcuts(): void {
    const shortcuts: KeyboardShortcut[] = [
      // GLOBAL NAVIGATION
      {
        key: '/',
        modifiers: ['ctrl'],
        action: 'showHelpOverlay',
        description: 'Show help overlay',
        category: 'global',
        preventDefault: true
      },
      {
        key: 'k',
        modifiers: ['ctrl'],
        action: 'globalSearch',
        description: 'Global search',
        category: 'global',
        preventDefault: true
      },
      {
        key: 'n',
        modifiers: ['ctrl'],
        action: 'newAudition',
        description: 'New audition/project',
        category: 'global',
        preventDefault: true
      },
      {
        key: 'Tab',
        action: 'navigateForward',
        description: 'Navigate forward',
        category: 'navigation'
      },
      {
        key: 'Tab',
        modifiers: ['shift'],
        action: 'navigateBackward',
        description: 'Navigate backward',
        category: 'navigation'
      },

      // CASTING WORKFLOW
      {
        key: 's',
        action: 'shortlistTalent',
        description: 'Shortlist current talent',
        category: 'casting',
        context: ['talent-card', 'talent-profile']
      },
      {
        key: 'p',
        action: 'passTalent',
        description: 'Pass on current talent',
        category: 'casting',
        context: ['talent-card', 'talent-profile']
      },
      {
        key: 'c',
        action: 'startConversation',
        description: 'Start conversation',
        category: 'casting',
        context: ['talent-card', 'talent-profile']
      },
      {
        key: 'v',
        action: 'viewFullProfile',
        description: 'View full profile',
        category: 'casting',
        context: ['talent-card']
      },
      {
        key: 'a',
        action: 'scheduleAudition',
        description: 'Schedule audition',
        category: 'casting',
        context: ['talent-profile']
      },

      // VIM-STYLE NAVIGATION
      {
        key: 'h',
        action: 'navigateLeft',
        description: 'Navigate left (vim)',
        category: 'navigation'
      },
      {
        key: 'j',
        action: 'navigateDown',
        description: 'Navigate down (vim)',
        category: 'navigation'
      },
      {
        key: 'k',
        action: 'navigateUp',
        description: 'Navigate up (vim)',
        category: 'navigation'
      },
      {
        key: 'l',
        action: 'navigateRight',
        description: 'Navigate right (vim)',
        category: 'navigation'
      },
      {
        key: 'g',
        action: 'goToTop',
        description: 'Go to top',
        category: 'navigation'
      },
      {
        key: 'G',
        modifiers: ['shift'],
        action: 'goToBottom',
        description: 'Go to bottom',
        category: 'navigation'
      },

      // CHAT INTERFACE
      {
        key: 'Enter',
        action: 'sendMessage',
        description: 'Send message',
        category: 'chat',
        context: ['chat-input']
      },
      {
        key: 'Enter',
        modifiers: ['shift'],
        action: 'newLine',
        description: 'New line in message',
        category: 'chat',
        context: ['chat-input']
      },
      {
        key: 'Escape',
        action: 'closeChat',
        description: 'Close chat',
        category: 'chat',
        context: ['chat-window']
      },
      {
        key: 'f',
        modifiers: ['ctrl'],
        action: 'searchConversation',
        description: 'Search conversation',
        category: 'chat',
        context: ['chat-window'],
        preventDefault: true
      },

      // MEDIA CONTROLS
      {
        key: 'Space',
        action: 'playPauseMedia',
        description: 'Play/pause media',
        category: 'media',
        context: ['video-player', 'audio-player'],
        preventDefault: true
      },
      {
        key: 'f',
        action: 'fullscreenToggle',
        description: 'Toggle fullscreen',
        category: 'media',
        context: ['video-player']
      },
      {
        key: 'ArrowLeft',
        action: 'previousMedia',
        description: 'Previous media item',
        category: 'media',
        context: ['media-gallery']
      },
      {
        key: 'ArrowRight',
        action: 'nextMedia',
        description: 'Next media item',
        category: 'media',
        context: ['media-gallery']
      }
    ];

    shortcuts.forEach(shortcut => {
      const key = this.generateShortcutKey(shortcut);
      this.shortcuts.set(key, shortcut);
    });
  }

  private generateShortcutKey(shortcut: KeyboardShortcut): string {
    const modifiers = shortcut.modifiers || [];
    return [...modifiers.sort(), shortcut.key].join('+').toLowerCase();
  }

  private bindEventListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
    document.addEventListener('focus', this.handleFocus.bind(this), true);
    document.addEventListener('blur', this.handleBlur.bind(this), true);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const modifiers: string[] = [];
    if (event.ctrlKey) modifiers.push('ctrl');
    if (event.metaKey) modifiers.push('cmd');
    if (event.shiftKey) modifiers.push('shift');
    if (event.altKey) modifiers.push('alt');

    const key = event.key;
    const shortcutKey = [...modifiers.sort(), key].join('+').toLowerCase();
    const shortcut = this.shortcuts.get(shortcutKey);

    if (shortcut) {
      if (this.shouldExecuteShortcut(shortcut, event.target as HTMLElement)) {
        if (shortcut.preventDefault) {
          event.preventDefault();
        }
        this.executeShortcut(shortcut, event);
      }
    }

    // Handle vim-style navigation in vim mode
    if (this.state.mode === 'vim' && !event.ctrlKey && !event.metaKey) {
      this.handleVimNavigation(event);
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    // Handle key up events if needed
  }

  private shouldExecuteShortcut(shortcut: KeyboardShortcut, target: HTMLElement): boolean {
    // Check if shortcut should be executed based on context
    if (shortcut.context && shortcut.context.length > 0) {
      const hasValidContext = shortcut.context.some(context => {
        return target.closest(`[data-context="${context}"]`) !== null ||
               target.classList.contains(context) ||
               target.getAttribute('data-keyboard-context') === context;
      });
      
      if (!hasValidContext) {
        return false;
      }
    }

    // Don't execute if typing in input fields (unless specifically allowed)
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return shortcut.context?.includes('chat-input') || 
             shortcut.context?.includes('search-input') ||
             shortcut.key === 'Escape';
    }

    return true;
  }

  private executeShortcut(shortcut: KeyboardShortcut, event: KeyboardEvent): void {
    const action = shortcut.action;
    const target = event.target as HTMLElement;

    switch (action) {
      case 'showHelpOverlay':
        this.showHelpOverlay();
        break;
      case 'globalSearch':
        this.focusGlobalSearch();
        break;
      case 'newAudition':
        this.triggerNewAudition();
        break;
      case 'navigateForward':
        this.navigateToNext();
        break;
      case 'navigateBackward':
        this.navigateToPrevious();
        break;
      case 'shortlistTalent':
        this.shortlistCurrentTalent();
        break;
      case 'passTalent':
        this.passCurrentTalent();
        break;
      case 'startConversation':
        this.startConversationWithTalent();
        break;
      case 'viewFullProfile':
        this.viewTalentProfile();
        break;
      case 'scheduleAudition':
        this.scheduleAudition();
        break;
      case 'sendMessage':
        this.sendChatMessage();
        break;
      case 'closeChat':
        this.closeChatWindow();
        break;
      case 'searchConversation':
        this.searchConversation();
        break;
      case 'playPauseMedia':
        this.toggleMediaPlayback();
        break;
      case 'fullscreenToggle':
        this.toggleFullscreen();
        break;
      case 'previousMedia':
        this.navigateToPreviousMedia();
        break;
      case 'nextMedia':
        this.navigateToNextMedia();
        break;
      default:
        console.warn(`Unknown keyboard action: ${action}`);
    }

    // Dispatch custom event for external handlers
    document.dispatchEvent(new CustomEvent('castmatch:keyboard-shortcut', {
      detail: { shortcut, event, target }
    }));
  }

  private handleVimNavigation(event: KeyboardEvent): void {
    switch (event.key.toLowerCase()) {
      case 'h':
        this.navigateInDirection('left');
        event.preventDefault();
        break;
      case 'j':
        this.navigateInDirection('down');
        event.preventDefault();
        break;
      case 'k':
        this.navigateInDirection('up');
        event.preventDefault();
        break;
      case 'l':
        this.navigateInDirection('right');
        event.preventDefault();
        break;
      case 'g':
        this.scrollToTop();
        event.preventDefault();
        break;
      case 'G':
        this.scrollToBottom();
        event.preventDefault();
        break;
    }
  }

  private handleFocus(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    if (target && target !== this.state.currentFocus) {
      if (this.state.currentFocus) {
        this.state.focusHistory.push(this.state.currentFocus);
        // Keep history to reasonable size
        if (this.state.focusHistory.length > 10) {
          this.state.focusHistory.shift();
        }
      }
      this.state.currentFocus = target;
      this.addFocusIndicator(target);
    }
  }

  private handleBlur(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    this.removeFocusIndicator(target);
  }

  private addFocusIndicator(element: HTMLElement): void {
    element.classList.add('keyboard-focused');
    
    // Add visual indicator for keyboard navigation
    if (!element.style.outline) {
      element.style.outline = '2px solid #0ea5e9';
      element.style.outlineOffset = '2px';
    }
  }

  private removeFocusIndicator(element: HTMLElement): void {
    element.classList.remove('keyboard-focused');
    
    // Remove outline if we added it
    if (element.style.outline === '2px solid #0ea5e9') {
      element.style.outline = '';
      element.style.outlineOffset = '';
    }
  }

  // NAVIGATION METHODS
  private navigateToNext(): void {
    const focusable = this.getFocusableElements();
    const currentIndex = Array.from(focusable).indexOf(this.state.currentFocus!);
    const nextIndex = (currentIndex + 1) % focusable.length;
    (focusable[nextIndex] as HTMLElement).focus();
  }

  private navigateToPrevious(): void {
    const focusable = this.getFocusableElements();
    const currentIndex = Array.from(focusable).indexOf(this.state.currentFocus!);
    const prevIndex = currentIndex === 0 ? focusable.length - 1 : currentIndex - 1;
    (focusable[prevIndex] as HTMLElement).focus();
  }

  private navigateInDirection(direction: 'left' | 'right' | 'up' | 'down'): void {
    const focusable = this.getFocusableElements();
    const current = this.state.currentFocus;
    
    if (!current) return;
    
    const currentRect = current.getBoundingClientRect();
    let bestCandidate: HTMLElement | null = null;
    let bestDistance = Infinity;
    
    Array.from(focusable).forEach(element => {
      if (element === current) return;
      
      const rect = (element as HTMLElement).getBoundingClientRect();
      const distance = this.calculateDistance(currentRect, rect, direction);
      
      if (distance < bestDistance && this.isInDirection(currentRect, rect, direction)) {
        bestDistance = distance;
        bestCandidate = element as HTMLElement;
      }
    });
    
    if (bestCandidate) {
      bestCandidate.focus();
    }
  }

  private calculateDistance(from: DOMRect, to: DOMRect, direction: string): number {
    const fromCenter = {
      x: from.left + from.width / 2,
      y: from.top + from.height / 2
    };
    const toCenter = {
      x: to.left + to.width / 2,
      y: to.top + to.height / 2
    };
    
    return Math.sqrt(
      Math.pow(fromCenter.x - toCenter.x, 2) + 
      Math.pow(fromCenter.y - toCenter.y, 2)
    );
  }

  private isInDirection(from: DOMRect, to: DOMRect, direction: string): boolean {
    const threshold = 10; // pixels
    
    switch (direction) {
      case 'left':
        return to.right <= from.left + threshold;
      case 'right':
        return to.left >= from.right - threshold;
      case 'up':
        return to.bottom <= from.top + threshold;
      case 'down':
        return to.top >= from.bottom - threshold;
      default:
        return false;
    }
  }

  private getFocusableElements(): NodeListOf<Element> {
    return document.querySelectorAll(this.focusableElements);
  }

  // ACTION METHODS
  private showHelpOverlay(): void {
    document.dispatchEvent(new CustomEvent('castmatch:show-help'));
  }

  private focusGlobalSearch(): void {
    const searchInput = document.querySelector('[data-keyboard-context="global-search"]') as HTMLElement;
    if (searchInput) {
      searchInput.focus();
    }
  }

  private triggerNewAudition(): void {
    document.dispatchEvent(new CustomEvent('castmatch:new-audition'));
  }

  private shortlistCurrentTalent(): void {
    document.dispatchEvent(new CustomEvent('castmatch:shortlist-talent'));
  }

  private passCurrentTalent(): void {
    document.dispatchEvent(new CustomEvent('castmatch:pass-talent'));
  }

  private startConversationWithTalent(): void {
    document.dispatchEvent(new CustomEvent('castmatch:start-conversation'));
  }

  private viewTalentProfile(): void {
    document.dispatchEvent(new CustomEvent('castmatch:view-profile'));
  }

  private scheduleAudition(): void {
    document.dispatchEvent(new CustomEvent('castmatch:schedule-audition'));
  }

  private sendChatMessage(): void {
    const chatForm = document.querySelector('[data-keyboard-context="chat-input"]')?.closest('form');
    if (chatForm) {
      chatForm.dispatchEvent(new Event('submit'));
    }
  }

  private closeChatWindow(): void {
    document.dispatchEvent(new CustomEvent('castmatch:close-chat'));
  }

  private searchConversation(): void {
    const searchInput = document.querySelector('[data-keyboard-context="chat-search"]') as HTMLElement;
    if (searchInput) {
      searchInput.focus();
    }
  }

  private toggleMediaPlayback(): void {
    const mediaElement = document.querySelector('video, audio') as HTMLMediaElement;
    if (mediaElement) {
      if (mediaElement.paused) {
        mediaElement.play();
      } else {
        mediaElement.pause();
      }
    }
  }

  private toggleFullscreen(): void {
    const videoElement = document.querySelector('[data-keyboard-context="video-player"]') as HTMLElement;
    if (videoElement) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoElement.requestFullscreen();
      }
    }
  }

  private navigateToPreviousMedia(): void {
    document.dispatchEvent(new CustomEvent('castmatch:previous-media'));
  }

  private navigateToNextMedia(): void {
    document.dispatchEvent(new CustomEvent('castmatch:next-media'));
  }

  private scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private scrollToBottom(): void {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  // PUBLIC API
  public setMode(mode: 'normal' | 'vim' | 'accessibility'): void {
    this.state.mode = mode;
    document.body.setAttribute('data-keyboard-mode', mode);
  }

  public addCustomShortcut(shortcut: KeyboardShortcut): void {
    const key = this.generateShortcutKey(shortcut);
    this.shortcuts.set(key, shortcut);
  }

  public removeShortcut(key: string): void {
    this.shortcuts.delete(key);
  }

  public getShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  public focusElement(selector: string): boolean {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      element.focus();
      return true;
    }
    return false;
  }

  public getCurrentFocus(): HTMLElement | null {
    return this.state.currentFocus;
  }

  private loadUserPreferences(): void {
    const preferences = localStorage.getItem('castmatch-keyboard-preferences');
    if (preferences) {
      const { mode } = JSON.parse(preferences);
      this.setMode(mode || 'normal');
    }
  }

  public saveUserPreferences(): void {
    localStorage.setItem('castmatch-keyboard-preferences', JSON.stringify({
      mode: this.state.mode
    }));
  }
}

// Export singleton instance
export const keyboardNavigation = new KeyboardNavigationSystem();

// Export React hook
export function useKeyboardNavigation() {
  return {
    navigation: keyboardNavigation,
    shortcuts: keyboardNavigation.getShortcuts(),
    currentFocus: keyboardNavigation.getCurrentFocus(),
    setMode: (mode: 'normal' | 'vim' | 'accessibility') => keyboardNavigation.setMode(mode),
    focusElement: (selector: string) => keyboardNavigation.focusElement(selector)
  };
}