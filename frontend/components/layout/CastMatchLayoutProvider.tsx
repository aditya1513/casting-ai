'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

/**
 * CastMatch Layout Provider
 * Manages global layout state and responsive behavior
 * Mathematical precision for sidebar, content, and input area calculations
 */

// Layout configuration constants based on design specifications
const LAYOUT_CONFIG = {
  sidebar: {
    desktop: 280,    // 70 units (4px base)
    tablet: 240,     // 60 units
    collapsed: 80,   // 20 units
    mobile: 0        // Hidden
  },
  content: {
    maxWidth: 1200,  // Maximum content width
    padding: {
      desktop: 32,   // 8 units
      tablet: 24,    // 6 units
      mobile: 16     // 4 units
    }
  },
  input: {
    minHeight: 80,   // 20 units
    maxHeight: 140,  // 35 units
    maxWidth: 700,   // Input area max width
    bottomClearance: 160 // Total bottom spacing (40 units)
  },
  transitions: {
    sidebar: '300ms ease',
    content: '300ms ease-out',
    input: '200ms ease'
  },
  breakpoints: {
    mobile: 768,
    tablet: 1024,
    desktop: 1440
  }
} as const

// Layout context type definitions
interface LayoutContextType {
  // Sidebar state
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  collapseSidebar: () => void
  
  // Responsive state
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  
  // Layout calculations
  sidebarWidth: number
  contentWidth: string
  contentMaxWidth: number
  contentPadding: number
  
  // Input area
  inputAreaHeight: number
  setInputAreaHeight: (height: number) => void
  
  // Scroll state
  scrollLocked: boolean
  setScrollLocked: (locked: boolean) => void
}

// Create context with undefined default
const LayoutContext = createContext<LayoutContextType | undefined>(undefined)

// Custom hook for using layout context
export function useLayoutContext() {
  const context = useContext(LayoutContext)
  if (!context) {
    throw new Error('useLayoutContext must be used within CastMatchLayoutProvider')
  }
  return context
}

// Responsive breakpoint detection hook
function useResponsive() {
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1440,
    height: typeof window !== 'undefined' ? window.innerHeight : 900
  })
  
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }
    
    // Debounced resize handler for performance
    let timeoutId: NodeJS.Timeout
    const debouncedResize = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(handleResize, 150)
    }
    
    window.addEventListener('resize', debouncedResize)
    handleResize() // Initial call
    
    return () => {
      window.removeEventListener('resize', debouncedResize)
      clearTimeout(timeoutId)
    }
  }, [])
  
  const isMobile = dimensions.width < LAYOUT_CONFIG.breakpoints.mobile
  const isTablet = dimensions.width >= LAYOUT_CONFIG.breakpoints.mobile && 
                   dimensions.width < LAYOUT_CONFIG.breakpoints.tablet
  const isDesktop = dimensions.width >= LAYOUT_CONFIG.breakpoints.tablet
  
  return { isMobile, isTablet, isDesktop, dimensions }
}

interface LayoutProviderProps {
  children: React.ReactNode
  defaultSidebarOpen?: boolean
  defaultSidebarCollapsed?: boolean
}

export function CastMatchLayoutProvider({ 
  children, 
  defaultSidebarOpen = true,
  defaultSidebarCollapsed = false 
}: LayoutProviderProps) {
  // Responsive state
  const { isMobile, isTablet, isDesktop, dimensions } = useResponsive()
  
  // Sidebar state management
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      // Restore from localStorage if available
      const stored = localStorage.getItem('castmatch-sidebar-open')
      return stored !== null ? stored === 'true' : defaultSidebarOpen
    }
    return defaultSidebarOpen
  })
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('castmatch-sidebar-collapsed')
      return stored !== null ? stored === 'true' : defaultSidebarCollapsed
    }
    return defaultSidebarCollapsed
  })
  
  // Input area height management
  const [inputAreaHeight, setInputAreaHeight] = useState(LAYOUT_CONFIG.input.minHeight)
  
  // Scroll lock state for modals/overlays
  const [scrollLocked, setScrollLocked] = useState(false)
  
  // Calculate sidebar width based on state and breakpoint
  const getSidebarWidth = useCallback(() => {
    if (isMobile) {
      return sidebarOpen ? dimensions.width : 0
    }
    if (!sidebarOpen) {
      return 0
    }
    if (sidebarCollapsed) {
      return LAYOUT_CONFIG.sidebar.collapsed
    }
    if (isTablet) {
      return LAYOUT_CONFIG.sidebar.tablet
    }
    return LAYOUT_CONFIG.sidebar.desktop
  }, [isMobile, isTablet, sidebarOpen, sidebarCollapsed, dimensions.width])
  
  // Calculate content width with mathematical precision
  const getContentWidth = useCallback(() => {
    const sidebarW = getSidebarWidth()
    if (isMobile) {
      return '100vw'
    }
    return `calc(100vw - ${sidebarW}px)`
  }, [getSidebarWidth, isMobile])
  
  // Get content padding based on breakpoint
  const getContentPadding = useCallback(() => {
    if (isMobile) return LAYOUT_CONFIG.content.padding.mobile
    if (isTablet) return LAYOUT_CONFIG.content.padding.tablet
    return LAYOUT_CONFIG.content.padding.desktop
  }, [isMobile, isTablet])
  
  // Toggle sidebar open/closed
  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => {
      const newState = !prev
      if (typeof window !== 'undefined') {
        localStorage.setItem('castmatch-sidebar-open', String(newState))
      }
      return newState
    })
  }, [])
  
  // Toggle sidebar collapsed state (desktop only)
  const collapseSidebar = useCallback(() => {
    if (!isMobile) {
      setSidebarCollapsed(prev => {
        const newState = !prev
        if (typeof window !== 'undefined') {
          localStorage.setItem('castmatch-sidebar-collapsed', String(newState))
        }
        return newState
      })
    }
  }, [isMobile])
  
  // Auto-close sidebar on mobile when route changes
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      // Optional: Add route change detection here
      // For now, just ensure mobile sidebar behavior
    }
  }, [isMobile, sidebarOpen])
  
  // Handle scroll lock for body
  useEffect(() => {
    if (scrollLocked) {
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
    } else {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
    
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
  }, [scrollLocked])
  
  const contextValue: LayoutContextType = {
    // Sidebar state
    sidebarOpen,
    sidebarCollapsed,
    toggleSidebar,
    collapseSidebar,
    
    // Responsive state
    isMobile,
    isTablet,
    isDesktop,
    
    // Layout calculations
    sidebarWidth: getSidebarWidth(),
    contentWidth: getContentWidth(),
    contentMaxWidth: LAYOUT_CONFIG.content.maxWidth,
    contentPadding: getContentPadding(),
    
    // Input area
    inputAreaHeight,
    setInputAreaHeight,
    
    // Scroll state
    scrollLocked,
    setScrollLocked
  }
  
  return (
    <LayoutContext.Provider value={contextValue}>
      {children}
    </LayoutContext.Provider>
  )
}