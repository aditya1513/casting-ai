import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface UIState {
  // Sidebar state
  sidebarCollapsed: boolean
  sidebarWidth: number
  
  // Theme
  theme: 'light' | 'dark' | 'system'
  
  // Layout preferences
  viewMode: 'grid' | 'list'
  messageListLayout: 'comfortable' | 'compact'
  
  // UI toggles
  showScrollButton: boolean
  autoScrollMessages: boolean
  enableSoundEffects: boolean
  enableNotifications: boolean
  enableKeyboardShortcuts: boolean
  
  // Modal states
  activeModal: string | null
  modalData: any
  
  // Actions
  toggleSidebar: () => void
  setSidebarWidth: (width: number) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setViewMode: (mode: 'grid' | 'list') => void
  setMessageListLayout: (layout: 'comfortable' | 'compact') => void
  toggleScrollButton: () => void
  toggleAutoScroll: () => void
  toggleSoundEffects: () => void
  toggleNotifications: () => void
  toggleKeyboardShortcuts: () => void
  openModal: (modalId: string, data?: any) => void
  closeModal: () => void
  resetUIPreferences: () => void
}

const defaultState = {
  sidebarCollapsed: false,
  sidebarWidth: 280,
  theme: 'system' as const,
  viewMode: 'list' as const,
  messageListLayout: 'comfortable' as const,
  showScrollButton: true,
  autoScrollMessages: true,
  enableSoundEffects: true,
  enableNotifications: true,
  enableKeyboardShortcuts: true,
  activeModal: null,
  modalData: null,
}

/**
 * UI Store for managing interface preferences and state
 * Persists user preferences to localStorage
 */
export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      ...defaultState,

      // Actions
      toggleSidebar: () => set((state) => ({ 
        sidebarCollapsed: !state.sidebarCollapsed 
      })),

      setSidebarWidth: (width) => set({ sidebarWidth: width }),

      setTheme: (theme) => {
        set({ theme })
        // Apply theme to document
        if (typeof window !== 'undefined') {
          const root = window.document.documentElement
          root.classList.remove('light', 'dark')
          
          if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches 
              ? 'dark' 
              : 'light'
            root.classList.add(systemTheme)
          } else {
            root.classList.add(theme)
          }
        }
      },

      setViewMode: (mode) => set({ viewMode: mode }),

      setMessageListLayout: (layout) => set({ messageListLayout: layout }),

      toggleScrollButton: () => set((state) => ({ 
        showScrollButton: !state.showScrollButton 
      })),

      toggleAutoScroll: () => set((state) => ({ 
        autoScrollMessages: !state.autoScrollMessages 
      })),

      toggleSoundEffects: () => set((state) => ({ 
        enableSoundEffects: !state.enableSoundEffects 
      })),

      toggleNotifications: () => set((state) => ({ 
        enableNotifications: !state.enableNotifications 
      })),

      toggleKeyboardShortcuts: () => set((state) => ({ 
        enableKeyboardShortcuts: !state.enableKeyboardShortcuts 
      })),

      openModal: (modalId, data) => set({ 
        activeModal: modalId, 
        modalData: data 
      }),

      closeModal: () => set({ 
        activeModal: null, 
        modalData: null 
      }),

      resetUIPreferences: () => set(defaultState),
    }),
    {
      name: 'castmatch-ui-preferences',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        sidebarWidth: state.sidebarWidth,
        theme: state.theme,
        viewMode: state.viewMode,
        messageListLayout: state.messageListLayout,
        showScrollButton: state.showScrollButton,
        autoScrollMessages: state.autoScrollMessages,
        enableSoundEffects: state.enableSoundEffects,
        enableNotifications: state.enableNotifications,
        enableKeyboardShortcuts: state.enableKeyboardShortcuts,
      }),
    }
  )
)

// Helper hook for theme initialization
export const useThemeInitializer = () => {
  const theme = useUIStore((state) => state.theme)
  const setTheme = useUIStore((state) => state.setTheme)

  if (typeof window !== 'undefined') {
    // Initialize theme on mount
    setTheme(theme)

    // Listen for system theme changes
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => setTheme('system')
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }
}