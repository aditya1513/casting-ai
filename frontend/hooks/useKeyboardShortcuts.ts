'use client'

import { useEffect, useCallback, useRef } from 'react'

export interface KeyboardShortcut {
  key: string
  metaKey?: boolean
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  action: () => void
  description: string
  category: string
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
  preventDefault?: boolean
}

export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
  preventDefault = true
}: UseKeyboardShortcutsOptions) {
  const shortcutsRef = useRef<KeyboardShortcut[]>([])

  // Update shortcuts ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts
  }, [shortcuts])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    // Don't trigger shortcuts when user is typing in input fields
    const target = event.target as HTMLElement
    if (
      target.tagName === 'INPUT' || 
      target.tagName === 'TEXTAREA' || 
      target.contentEditable === 'true'
    ) {
      return
    }

    const matchingShortcut = shortcutsRef.current.find(shortcut => {
      const keyMatches = shortcut.key.toLowerCase() === event.key.toLowerCase()
      const metaMatches = !!shortcut.metaKey === event.metaKey
      const ctrlMatches = !!shortcut.ctrlKey === event.ctrlKey
      const shiftMatches = !!shortcut.shiftKey === event.shiftKey
      const altMatches = !!shortcut.altKey === event.altKey

      return keyMatches && metaMatches && ctrlMatches && shiftMatches && altMatches
    })

    if (matchingShortcut) {
      if (preventDefault) {
        event.preventDefault()
        event.stopPropagation()
      }
      matchingShortcut.action()
    }
  }, [enabled, preventDefault])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  return { shortcuts: shortcutsRef.current }
}

// Hook for displaying keyboard shortcuts help
export function useKeyboardShortcutsHelp(shortcuts: KeyboardShortcut[]) {
  const getShortcutDisplay = (shortcut: KeyboardShortcut) => {
    const keys: string[] = []
    
    if (shortcut.metaKey) keys.push('⌘')
    if (shortcut.ctrlKey) keys.push('Ctrl')
    if (shortcut.altKey) keys.push('Alt')
    if (shortcut.shiftKey) keys.push('⇧')
    keys.push(shortcut.key.toUpperCase())

    return keys.join(' + ')
  }

  const getShortcutsByCategory = () => {
    const grouped = shortcuts.reduce((acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = []
      }
      acc[shortcut.category].push(shortcut)
      return acc
    }, {} as Record<string, KeyboardShortcut[]>)

    return grouped
  }

  return {
    getShortcutDisplay,
    getShortcutsByCategory
  }
}

// Predefined shortcuts for common actions
export const createCastingShortcuts = (actions: {
  onSearch: () => void
  onNewProject: () => void
  onNewTalent: () => void
  onSaveProject: () => void
  onOpenUpload: () => void
  onToggleShortlist: () => void
  onOpenChat: () => void
  onOpenAnalytics: () => void
  onOpenSettings: () => void
  onRefresh: () => void
  onUndo: () => void
  onRedo: () => void
  onSelectAll: () => void
  onCopy: () => void
  onPaste: () => void
  onDelete: () => void
  onEscape: () => void
  onHelp: () => void
}): KeyboardShortcut[] => [
  // Navigation
  {
    key: 'f',
    ctrlKey: true,
    action: actions.onSearch,
    description: 'Focus search',
    category: 'Navigation'
  },
  {
    key: 'k',
    ctrlKey: true,
    action: actions.onSearch,
    description: 'Quick search',
    category: 'Navigation'
  },
  {
    key: '1',
    ctrlKey: true,
    action: () => window.location.hash = '#overview',
    description: 'Go to Overview',
    category: 'Navigation'
  },
  {
    key: '2',
    ctrlKey: true,
    action: () => window.location.hash = '#talents',
    description: 'Go to Talents',
    category: 'Navigation'
  },
  {
    key: '3',
    ctrlKey: true,
    action: () => window.location.hash = '#projects',
    description: 'Go to Projects',
    category: 'Navigation'
  },
  {
    key: '4',
    ctrlKey: true,
    action: actions.onOpenChat,
    description: 'Open AI Assistant',
    category: 'Navigation'
  },

  // Actions
  {
    key: 'n',
    ctrlKey: true,
    action: actions.onNewProject,
    description: 'New project',
    category: 'Actions'
  },
  {
    key: 'n',
    ctrlKey: true,
    shiftKey: true,
    action: actions.onNewTalent,
    description: 'New talent',
    category: 'Actions'
  },
  {
    key: 's',
    ctrlKey: true,
    action: actions.onSaveProject,
    description: 'Save project',
    category: 'Actions'
  },
  {
    key: 'u',
    ctrlKey: true,
    action: actions.onOpenUpload,
    description: 'Upload file',
    category: 'Actions'
  },
  {
    key: 'l',
    ctrlKey: true,
    action: actions.onToggleShortlist,
    description: 'Toggle shortlist',
    category: 'Actions'
  },

  // Editing
  {
    key: 'z',
    ctrlKey: true,
    action: actions.onUndo,
    description: 'Undo',
    category: 'Editing'
  },
  {
    key: 'y',
    ctrlKey: true,
    action: actions.onRedo,
    description: 'Redo',
    category: 'Editing'
  },
  {
    key: 'a',
    ctrlKey: true,
    action: actions.onSelectAll,
    description: 'Select all',
    category: 'Editing'
  },
  {
    key: 'c',
    ctrlKey: true,
    action: actions.onCopy,
    description: 'Copy',
    category: 'Editing'
  },
  {
    key: 'v',
    ctrlKey: true,
    action: actions.onPaste,
    description: 'Paste',
    category: 'Editing'
  },
  {
    key: 'Delete',
    action: actions.onDelete,
    description: 'Delete selected',
    category: 'Editing'
  },

  // System
  {
    key: 'F5',
    action: actions.onRefresh,
    description: 'Refresh data',
    category: 'System'
  },
  {
    key: 'r',
    ctrlKey: true,
    action: actions.onRefresh,
    description: 'Refresh data',
    category: 'System'
  },
  {
    key: 'Escape',
    action: actions.onEscape,
    description: 'Cancel/close',
    category: 'System'
  },
  {
    key: '/',
    ctrlKey: true,
    action: actions.onHelp,
    description: 'Show help',
    category: 'System'
  },
  {
    key: '?',
    shiftKey: true,
    action: actions.onHelp,
    description: 'Show shortcuts',
    category: 'System'
  },

  // Analytics
  {
    key: 'd',
    ctrlKey: true,
    shiftKey: true,
    action: actions.onOpenAnalytics,
    description: 'Open analytics dashboard',
    category: 'Analytics'
  },

  // Settings
  {
    key: ',',
    ctrlKey: true,
    action: actions.onOpenSettings,
    description: 'Open settings',
    category: 'Settings'
  }
]

// Global keyboard shortcut provider
export function useGlobalKeyboardShortcuts(enabled: boolean = true) {
  const actions = {
    onSearch: () => {
      const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
      if (searchInput) {
        searchInput.focus()
        searchInput.select()
      }
    },
    onNewProject: () => {
      const newProjectButton = document.querySelector('[data-action="new-project"]') as HTMLButtonElement
      if (newProjectButton) {
        newProjectButton.click()
      } else {
        console.log('New Project shortcut triggered')
      }
    },
    onNewTalent: () => {
      const newTalentButton = document.querySelector('[data-action="new-talent"]') as HTMLButtonElement
      if (newTalentButton) {
        newTalentButton.click()
      } else {
        console.log('New Talent shortcut triggered')
      }
    },
    onSaveProject: () => {
      const saveButton = document.querySelector('[data-action="save"]') as HTMLButtonElement
      if (saveButton) {
        saveButton.click()
      } else {
        console.log('Save shortcut triggered')
      }
    },
    onOpenUpload: () => {
      const uploadButton = document.querySelector('[data-action="upload"]') as HTMLButtonElement
      if (uploadButton) {
        uploadButton.click()
      } else {
        console.log('Upload shortcut triggered')
      }
    },
    onToggleShortlist: () => {
      console.log('Toggle shortlist shortcut triggered')
    },
    onOpenChat: () => {
      window.location.hash = '#chat'
    },
    onOpenAnalytics: () => {
      window.location.hash = '#analytics'
    },
    onOpenSettings: () => {
      window.location.hash = '#settings'
    },
    onRefresh: () => {
      window.location.reload()
    },
    onUndo: () => {
      console.log('Undo shortcut triggered')
    },
    onRedo: () => {
      console.log('Redo shortcut triggered')
    },
    onSelectAll: () => {
      const selectAllCheckbox = document.querySelector('[data-action="select-all"]') as HTMLInputElement
      if (selectAllCheckbox) {
        selectAllCheckbox.click()
      }
    },
    onCopy: () => {
      console.log('Copy shortcut triggered')
    },
    onPaste: () => {
      console.log('Paste shortcut triggered')
    },
    onDelete: () => {
      const deleteButton = document.querySelector('[data-action="delete"]') as HTMLButtonElement
      if (deleteButton) {
        deleteButton.click()
      }
    },
    onEscape: () => {
      // Close any open modals or dialogs
      const closeButtons = document.querySelectorAll('[data-action="close"], [aria-label="Close"]')
      if (closeButtons.length > 0) {
        (closeButtons[closeButtons.length - 1] as HTMLButtonElement).click()
      }
    },
    onHelp: () => {
      // Show keyboard shortcuts modal
      const helpButton = document.querySelector('[data-action="help"]') as HTMLButtonElement
      if (helpButton) {
        helpButton.click()
      } else {
        console.log('Help shortcut triggered - show keyboard shortcuts modal')
      }
    }
  }

  const shortcuts = createCastingShortcuts(actions)

  useKeyboardShortcuts({
    shortcuts,
    enabled,
    preventDefault: true
  })

  return { shortcuts, actions }
}