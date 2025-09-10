/**
 * CastMatch Layout System - Responsive Grid Example
 * Demonstrates the mathematical grid system with responsive behavior
 */

import React from 'react'
import { 
  CastMatchLayoutProvider,
  CastMatchMainContent,
  ContentSection,
  ContentGrid,
  ContentHeader
} from '../../components/layout'
import { useResponsiveValue, useDeviceType } from '../../hooks/useResponsiveLayout'

export function ResponsiveGridExample() {
  const { deviceType, isMobile, isTablet, isDesktop } = useDeviceType()
  
  // Talent cards data
  const talents = [
    { id: 1, name: 'Priya Sharma', age: 28, experience: '8 years', image: '/talent1.jpg' },
    { id: 2, name: 'Arjun Mehta', age: 32, experience: '12 years', image: '/talent2.jpg' },
    { id: 3, name: 'Neha Kapoor', age: 26, experience: '6 years', image: '/talent3.jpg' },
    { id: 4, name: 'Rahul Singh', age: 35, experience: '15 years', image: '/talent4.jpg' },
    { id: 5, name: 'Ananya Patel', age: 24, experience: '4 years', image: '/talent5.jpg' },
    { id: 6, name: 'Vikram Roy', age: 30, experience: '10 years', image: '/talent6.jpg' }
  ]
  
  // Responsive column configuration
  const columns = useResponsiveValue({
    xs: 1,
    sm: 1,
    md: 2,
    tablet: 2,
    lg: 3,
    xl: 4
  })
  
  return (
    <CastMatchLayoutProvider>
      <CastMatchMainContent noPadding>
        <ContentHeader sticky borderBottom>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Talent Search Results
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Showing {talents.length} matches • Device: {deviceType}
              </p>
            </div>
            
            <div className="flex gap-2">
              <button className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                Filter
              </button>
              <button className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800">
                Sort
              </button>
            </div>
          </div>
        </ContentHeader>
        
        <ContentSection spacing="large">
          {/* Grid System Demonstration */}
          <div className="mb-8 p-6 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Grid System Active</h2>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Columns:</span>
                <span className="ml-2 font-mono">{columns}</span>
              </div>
              <div>
                <span className="text-gray-500">Gutter:</span>
                <span className="ml-2 font-mono">
                  {isMobile ? '16px' : isTablet ? '24px' : '32px'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Max Width:</span>
                <span className="ml-2 font-mono">1200px</span>
              </div>
            </div>
          </div>
          
          {/* Responsive Grid */}
          <div className={`
            grid gap-4 md:gap-6 lg:gap-8
            grid-cols-1
            md:grid-cols-2
            lg:grid-cols-3
            xl:grid-cols-4
          `}>
            {talents.map(talent => (
              <TalentCard key={talent.id} {...talent} />
            ))}
          </div>
        </ContentSection>
        
        {/* Mathematical Grid Overlay (Debug Mode) */}
        <GridOverlay show={false} />
      </CastMatchMainContent>
    </CastMatchLayoutProvider>
  )
}

// Talent Card Component
function TalentCard({ 
  name, 
  age, 
  experience, 
  image 
}: { 
  name: string
  age: number
  experience: string
  image: string 
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-w-3 aspect-h-4 bg-gray-100">
        <div className="flex items-center justify-center text-gray-400">
          <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-gray-900">{name}</h3>
        <div className="mt-2 space-y-1 text-sm text-gray-500">
          <p>Age: {age}</p>
          <p>Experience: {experience}</p>
        </div>
        
        <div className="mt-4 flex gap-2">
          <button className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50">
            View Profile
          </button>
          <button className="flex-1 px-3 py-1.5 text-sm bg-gray-900 text-white rounded hover:bg-gray-800">
            Shortlist
          </button>
        </div>
      </div>
    </div>
  )
}

// Grid Overlay Component (for debugging)
function GridOverlay({ show }: { show: boolean }) {
  if (!show) return null
  
  const { isDesktop, isTablet } = useDeviceType()
  const columns = isDesktop ? 12 : isTablet ? 8 : 4
  
  return (
    <div className="fixed inset-0 pointer-events-none z-[2000]">
      <div className="max-w-[1200px] mx-auto h-full px-8">
        <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '32px' }}>
          {Array.from({ length: columns }).map((_, i) => (
            <div 
              key={i} 
              className="bg-red-500 opacity-10"
              style={{ 
                marginTop: '0',
                marginBottom: '0'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}