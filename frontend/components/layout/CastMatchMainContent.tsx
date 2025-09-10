'use client'

import React from 'react'
import { useLayoutContext } from './CastMatchLayoutProvider'

/**
 * CastMatch Main Content Wrapper
 * Responsive content area that adjusts to sidebar state
 * Implements calc-based width with max-width constraints
 */

interface MainContentProps {
  children: React.ReactNode
  className?: string
  maxWidth?: number | 'none'
  centered?: boolean
  noPadding?: boolean
}

export function CastMatchMainContent({
  children,
  className = '',
  maxWidth,
  centered = true,
  noPadding = false
}: MainContentProps) {
  const {
    sidebarWidth,
    contentWidth,
    contentMaxWidth,
    contentPadding,
    isMobile
  } = useLayoutContext()
  
  // Calculate main content styles
  const getMainContentStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      width: contentWidth,
      marginLeft: isMobile ? 0 : `${sidebarWidth}px`,
      minHeight: '100vh',
      transition: 'all 300ms ease-out',
      willChange: 'margin-left, width',
      position: 'relative'
    }
    
    return baseStyles
  }
  
  // Calculate inner container styles
  const getInnerContainerStyles = (): React.CSSProperties => {
    const effectiveMaxWidth = maxWidth === 'none' 
      ? 'none' 
      : maxWidth || contentMaxWidth
    
    return {
      maxWidth: effectiveMaxWidth === 'none' ? '100%' : `${effectiveMaxWidth}px`,
      margin: centered ? '0 auto' : '0',
      padding: noPadding ? 0 : `${contentPadding}px`,
      width: '100%',
      height: '100%'
    }
  }
  
  return (
    <main
      className={`main-content ${className}`}
      style={getMainContentStyles()}
      role="main"
      aria-label="Main content"
    >
      <div 
        className="main-content-inner"
        style={getInnerContainerStyles()}
      >
        {children}
      </div>
    </main>
  )
}

/**
 * Content Section Component
 * For organizing content within the main area
 */
interface ContentSectionProps {
  children: React.ReactNode
  className?: string
  title?: string
  spacing?: 'none' | 'small' | 'medium' | 'large'
}

export function ContentSection({
  children,
  className = '',
  title,
  spacing = 'medium'
}: ContentSectionProps) {
  const spacingClasses = {
    none: '',
    small: 'py-4',
    medium: 'py-8',
    large: 'py-12'
  }
  
  return (
    <section className={`content-section ${spacingClasses[spacing]} ${className}`}>
      {title && (
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">{title}</h2>
      )}
      {children}
    </section>
  )
}

/**
 * Content Grid Component
 * For creating responsive grid layouts within content
 */
interface ContentGridProps {
  children: React.ReactNode
  columns?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
  gap?: 'small' | 'medium' | 'large'
  className?: string
}

export function ContentGrid({
  children,
  columns = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 'medium',
  className = ''
}: ContentGridProps) {
  const gapClasses = {
    small: 'gap-4',
    medium: 'gap-6',
    large: 'gap-8'
  }
  
  return (
    <div 
      className={`
        grid 
        grid-cols-${columns.mobile || 1}
        md:grid-cols-${columns.tablet || 2}
        lg:grid-cols-${columns.desktop || 3}
        ${gapClasses[gap]}
        ${className}
      `}
    >
      {children}
    </div>
  )
}

/**
 * Content Header Component
 * Fixed header within the content area
 */
interface ContentHeaderProps {
  children: React.ReactNode
  className?: string
  sticky?: boolean
  borderBottom?: boolean
}

export function ContentHeader({
  children,
  className = '',
  sticky = false,
  borderBottom = true
}: ContentHeaderProps) {
  const { contentPadding } = useLayoutContext()
  
  return (
    <header
      className={`
        content-header
        ${sticky ? 'sticky top-0 z-10' : ''}
        ${borderBottom ? 'border-b border-gray-200' : ''}
        bg-white
        ${className}
      `}
      style={{
        padding: `${contentPadding / 2}px ${contentPadding}px`,
        marginLeft: `-${contentPadding}px`,
        marginRight: `-${contentPadding}px`,
        marginTop: `-${contentPadding}px`,
        width: `calc(100% + ${contentPadding * 2}px)`
      }}
    >
      {children}
    </header>
  )
}

/**
 * Content Footer Component
 * For content area footers (not the input area)
 */
interface ContentFooterProps {
  children: React.ReactNode
  className?: string
  borderTop?: boolean
}

export function ContentFooter({
  children,
  className = '',
  borderTop = true
}: ContentFooterProps) {
  const { contentPadding } = useLayoutContext()
  
  return (
    <footer
      className={`
        content-footer
        ${borderTop ? 'border-t border-gray-200' : ''}
        ${className}
      `}
      style={{
        padding: `${contentPadding}px`,
        marginLeft: `-${contentPadding}px`,
        marginRight: `-${contentPadding}px`,
        marginBottom: `-${contentPadding}px`,
        width: `calc(100% + ${contentPadding * 2}px)`
      }}
    >
      {children}
    </footer>
  )
}