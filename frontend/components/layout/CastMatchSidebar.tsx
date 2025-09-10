'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useLayoutContext } from './CastMatchLayoutProvider'
import { ChevronLeft, ChevronRight, Menu, X } from 'lucide-react'

/**
 * CastMatch Sidebar Component
 * Fixed sidebar with responsive behavior and smooth transitions
 * Implements 280px desktop, 240px tablet, 80px collapsed, hidden mobile
 */

interface SidebarProps {
  children?: React.ReactNode
  className?: string
}

export function CastMatchSidebar({ children, className = '' }: SidebarProps) {
  const {
    sidebarOpen,
    sidebarCollapsed,
    toggleSidebar,
    collapseSidebar,
    isMobile,
    isTablet,
    isDesktop,
    sidebarWidth,
    setScrollLocked
  } = useLayoutContext()
  
  const sidebarRef = useRef<HTMLElement>(null)
  const [isScrolling, setIsScrolling] = useState(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout>()
  
  // Handle scroll indicator for hidden scrollbar
  const handleScroll = () => {
    setIsScrolling(true)
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false)
    }, 1000)
  }
  
  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      setScrollLocked(true)
    } else {
      setScrollLocked(false)
    }
  }, [isMobile, sidebarOpen, setScrollLocked])
  
  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])
  
  // Calculate transform and styles
  const getSidebarStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      position: 'fixed',
      top: 0,
      left: 0,
      height: '100vh',
      zIndex: 1030,
      transition: 'all 300ms ease',
      backgroundColor: 'var(--white)',
      borderRight: '1px solid var(--gray-200)',
      willChange: 'transform, width'
    }
    
    if (isMobile) {
      return {
        ...baseStyles,
        width: '100vw',
        maxWidth: '320px',
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        boxShadow: sidebarOpen ? '0 0 20px rgba(0, 0, 0, 0.1)' : 'none'
      }
    }
    
    return {
      ...baseStyles,
      width: `${sidebarWidth}px`,
      transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'
    }
  }
  
  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[1029] md:hidden"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar */}
      <nav
        ref={sidebarRef}
        className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${className}`}
        style={getSidebarStyles()}
        aria-label="Main navigation"
        role="navigation"
      >
        {/* Sidebar Header */}
        <div className="sidebar-header flex items-center justify-between h-16 px-4 border-b border-gray-200">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-gray-900">CastMatch</h1>
            </div>
          )}
          
          {/* Toggle Controls */}
          <div className="flex items-center gap-2">
            {/* Mobile close button */}
            {isMobile && (
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors md:hidden"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            )}
            
            {/* Desktop collapse button */}
            {isDesktop && !isMobile && (
              <button
                onClick={collapseSidebar}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                )}
              </button>
            )}
          </div>
        </div>
        
        {/* Sidebar Content */}
        <div 
          className={`sidebar-content flex-1 overflow-y-auto overflow-x-hidden ${
            isScrolling ? 'scrolling' : ''
          }`}
          onScroll={handleScroll}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitScrollbar: { display: 'none' }
          }}
        >
          <div className="p-4">
            {children || <DefaultSidebarContent collapsed={sidebarCollapsed} />}
          </div>
        </div>
        
        {/* Scroll indicator (visible when scrolling) */}
        {isScrolling && (
          <div 
            className="absolute right-0 top-16 bottom-0 w-1 bg-gray-300/50 pointer-events-none"
            style={{
              opacity: isScrolling ? 0.5 : 0,
              transition: 'opacity 200ms ease'
            }}
          />
        )}
      </nav>
      
      {/* Mobile menu button (when sidebar is closed) */}
      {isMobile && !sidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-[1025] p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow md:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="w-6 h-6 text-gray-700" />
        </button>
      )}
    </>
  )
}

// Default sidebar content as fallback
function DefaultSidebarContent({ collapsed }: { collapsed: boolean }) {
  const projects = [
    { id: 1, name: 'Mumbai Dreams', status: 'active', count: 42 },
    { id: 2, name: 'Delhi Heights', status: 'review', count: 18 },
    { id: 3, name: 'Bangalore Days', status: 'casting', count: 67 },
    { id: 4, name: 'Chennai Express 2', status: 'complete', count: 0 }
  ]
  
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    review: 'bg-yellow-100 text-yellow-800',
    casting: 'bg-blue-100 text-blue-800',
    complete: 'bg-gray-100 text-gray-600'
  }
  
  return (
    <div className="space-y-6">
      {/* Search */}
      {!collapsed && (
        <div className="relative">
          <input
            type="search"
            placeholder="Search projects..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
          />
        </div>
      )}
      
      {/* Navigation */}
      <nav className="space-y-1" aria-label="Projects navigation">
        <h2 className={`text-xs font-semibold text-gray-500 uppercase tracking-wider ${
          collapsed ? 'text-center' : 'mb-2'
        }`}>
          {collapsed ? 'P' : 'Projects'}
        </h2>
        
        {projects.map(project => (
          <button
            key={project.id}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors group"
          >
            <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {project.name}
                  </div>
                  <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    statusColors[project.status as keyof typeof statusColors]
                  }`}>
                    {project.status}
                  </div>
                </div>
              )}
              
              {project.count > 0 && (
                <span className={`${
                  collapsed ? 'text-xs' : 'text-sm'
                } text-gray-500 ml-2`}>
                  {project.count}
                </span>
              )}
            </div>
          </button>
        ))}
      </nav>
      
      {/* Settings */}
      {!collapsed && (
        <div className="pt-6 mt-6 border-t border-gray-200">
          <button className="w-full text-left px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            Settings
          </button>
          <button className="w-full text-left px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            Help & Support
          </button>
        </div>
      )}
    </div>
  )
}