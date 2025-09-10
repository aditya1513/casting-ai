'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

/**
 * Responsive Layout Hooks for CastMatch
 * Provides breakpoint detection and responsive utilities
 * Based on 8-point grid system and mathematical precision
 */

// Breakpoint configuration
export const BREAKPOINTS = {
  xs: 320,      // Mobile Small
  sm: 375,      // Mobile Medium
  md: 425,      // Mobile Large
  tablet: 768,  // Tablet
  lg: 1024,     // Desktop Small
  xl: 1440,     // Desktop Medium
  '2xl': 1920,  // Desktop Large
  '3xl': 2560   // Desktop XL
} as const

export type Breakpoint = keyof typeof BREAKPOINTS

/**
 * Hook to detect current breakpoint
 */
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('xl')
  
  useEffect(() => {
    const getBreakpoint = (): Breakpoint => {
      const width = window.innerWidth
      
      if (width < BREAKPOINTS.xs) return 'xs'
      if (width < BREAKPOINTS.sm) return 'sm'
      if (width < BREAKPOINTS.md) return 'md'
      if (width < BREAKPOINTS.tablet) return 'tablet'
      if (width < BREAKPOINTS.lg) return 'lg'
      if (width < BREAKPOINTS.xl) return 'xl'
      if (width < BREAKPOINTS['2xl']) return '2xl'
      return '3xl'
    }
    
    const handleResize = () => {
      setBreakpoint(getBreakpoint())
    }
    
    // Set initial breakpoint
    handleResize()
    
    // Debounce resize events
    let timeoutId: NodeJS.Timeout
    const debouncedResize = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(handleResize, 150)
    }
    
    window.addEventListener('resize', debouncedResize)
    
    return () => {
      window.removeEventListener('resize', debouncedResize)
      clearTimeout(timeoutId)
    }
  }, [])
  
  return breakpoint
}

/**
 * Hook to check if current viewport matches a media query
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)
  
  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    
    // Set initial value
    setMatches(mediaQuery.matches)
    
    // Create event listener
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }
    
    // Add listener (using addEventListener for better compatibility)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler)
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handler)
    }
    
    // Cleanup
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler)
      } else {
        // Fallback for older browsers
        mediaQuery.removeListener(handler)
      }
    }
  }, [query])
  
  return matches
}

/**
 * Hook to get responsive values based on breakpoint
 */
export function useResponsiveValue<T>(values: Partial<Record<Breakpoint, T>>): T | undefined {
  const breakpoint = useBreakpoint()
  
  const getValue = useCallback(() => {
    // Priority order (from current breakpoint down to smallest)
    const breakpointOrder: Breakpoint[] = ['3xl', '2xl', 'xl', 'lg', 'tablet', 'md', 'sm', 'xs']
    const currentIndex = breakpointOrder.indexOf(breakpoint)
    
    // Look for value starting from current breakpoint and falling back to smaller ones
    for (let i = currentIndex; i < breakpointOrder.length; i++) {
      const bp = breakpointOrder[i]
      if (values[bp] !== undefined) {
        return values[bp]
      }
    }
    
    // If no value found, try larger breakpoints
    for (let i = currentIndex - 1; i >= 0; i--) {
      const bp = breakpointOrder[i]
      if (values[bp] !== undefined) {
        return values[bp]
      }
    }
    
    return undefined
  }, [breakpoint, values])
  
  return getValue()
}

/**
 * Hook to detect device type
 */
export function useDeviceType() {
  const breakpoint = useBreakpoint()
  
  const deviceType = useMemo(() => {
    if (['xs', 'sm', 'md'].includes(breakpoint)) {
      return 'mobile'
    }
    if (breakpoint === 'tablet') {
      return 'tablet'
    }
    return 'desktop'
  }, [breakpoint])
  
  const isMobile = deviceType === 'mobile'
  const isTablet = deviceType === 'tablet'
  const isDesktop = deviceType === 'desktop'
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  
  return {
    deviceType,
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice,
    breakpoint
  }
}

/**
 * Hook for responsive grid calculations
 */
export function useGridLayout() {
  const { deviceType } = useDeviceType()
  
  const gridConfig = useMemo(() => {
    const configs = {
      mobile: {
        columns: 4,
        gutter: 16,
        margin: 16,
        columnWidth: 'calc((100vw - 48px) / 4)'
      },
      tablet: {
        columns: 8,
        gutter: 24,
        margin: 24,
        columnWidth: 'calc((100vw - 240px - 168px) / 8)' // Accounting for sidebar
      },
      desktop: {
        columns: 12,
        gutter: 32,
        margin: 32,
        columnWidth: 'calc((min(1200px, 100vw - 280px) - 96px) / 12)'
      }
    }
    
    return configs[deviceType]
  }, [deviceType])
  
  return gridConfig
}

/**
 * Hook for sidebar responsive behavior
 */
export function useSidebarResponsive() {
  const { isMobile, isTablet, isDesktop } = useDeviceType()
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  // Auto-close sidebar on mobile when viewport changes
  useEffect(() => {
    if (isMobile && isOpen) {
      setIsOpen(false)
    } else if (isDesktop && !isOpen) {
      setIsOpen(true)
    }
  }, [isMobile, isDesktop])
  
  const sidebarWidth = useMemo(() => {
    if (!isOpen || isMobile) return 0
    if (isCollapsed) return 80
    if (isTablet) return 240
    return 280
  }, [isOpen, isMobile, isTablet, isCollapsed])
  
  const toggleSidebar = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])
  
  const toggleCollapse = useCallback(() => {
    if (!isMobile) {
      setIsCollapsed(prev => !prev)
    }
  }, [isMobile])
  
  return {
    isOpen,
    isCollapsed,
    sidebarWidth,
    toggleSidebar,
    toggleCollapse,
    showMobileToggle: isMobile,
    showCollapseToggle: !isMobile
  }
}

/**
 * Hook for viewport dimensions
 */
export function useViewportDimensions() {
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1440,
    height: typeof window !== 'undefined' ? window.innerHeight : 900,
    vw: typeof window !== 'undefined' ? window.innerWidth / 100 : 14.4,
    vh: typeof window !== 'undefined' ? window.innerHeight / 100 : 9
  })
  
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
        vw: window.innerWidth / 100,
        vh: window.innerHeight / 100
      })
    }
    
    handleResize()
    
    let timeoutId: NodeJS.Timeout
    const debouncedResize = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(handleResize, 150)
    }
    
    window.addEventListener('resize', debouncedResize)
    
    return () => {
      window.removeEventListener('resize', debouncedResize)
      clearTimeout(timeoutId)
    }
  }, [])
  
  return dimensions
}

/**
 * Hook for calculating responsive spacing
 */
export function useResponsiveSpacing() {
  const { deviceType } = useDeviceType()
  
  const spacing = useMemo(() => {
    const baseUnit = 4 // 4px base unit
    
    const scale = {
      mobile: {
        xs: baseUnit * 0.5,  // 2px
        sm: baseUnit * 1,    // 4px
        md: baseUnit * 2,    // 8px
        lg: baseUnit * 3,    // 12px
        xl: baseUnit * 4,    // 16px
        '2xl': baseUnit * 6, // 24px
        '3xl': baseUnit * 8  // 32px
      },
      tablet: {
        xs: baseUnit * 0.5,  // 2px
        sm: baseUnit * 1,    // 4px
        md: baseUnit * 2,    // 8px
        lg: baseUnit * 4,    // 16px
        xl: baseUnit * 5,    // 20px
        '2xl': baseUnit * 6, // 24px
        '3xl': baseUnit * 10 // 40px
      },
      desktop: {
        xs: baseUnit * 0.5,  // 2px
        sm: baseUnit * 1,    // 4px
        md: baseUnit * 2,    // 8px
        lg: baseUnit * 4,    // 16px
        xl: baseUnit * 6,    // 24px
        '2xl': baseUnit * 8, // 32px
        '3xl': baseUnit * 12 // 48px
      }
    }
    
    return scale[deviceType]
  }, [deviceType])
  
  return spacing
}