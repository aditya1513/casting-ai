'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { usePerformanceOptimizer } from '@/lib/performance-optimizer'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Star, 
  MapPin, 
  Phone, 
  Mail,
  Eye,
  Calendar,
  MessageSquare,
  MoreHorizontal
} from 'lucide-react'

interface Talent {
  id: string
  firstName: string
  lastName: string
  age: number
  skills: string[]
  experience: string
  location: string
  phone?: string
  email?: string
  avatar?: string
  rating?: number
  availability: 'available' | 'busy' | 'unavailable'
  lastActive?: string
}

interface VirtualTalentGridProps {
  talents: Talent[]
  itemHeight?: number
  itemsPerRow?: number
  gap?: number
  onTalentClick?: (talent: Talent) => void
  onTalentAction?: (talent: Talent, action: string) => void
  className?: string
  searchQuery?: string
  filters?: {
    availability?: string[]
    skills?: string[]
    location?: string[]
    experience?: string[]
  }
}

interface VirtualizedItem {
  index: number
  talent: Talent
  style: React.CSSProperties
}

function OptimizedTalentCard({ talent, onAction, style }: {
  talent: Talent
  onAction?: (talent: Talent, action: string) => void
  style: React.CSSProperties
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const { preloadResource } = usePerformanceOptimizer()

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          // Preload avatar image
          if (talent.avatar) {
            preloadResource?.(talent.avatar, 'image')
          }
          observer.disconnect()
        }
      },
      { rootMargin: '100px' }
    )

    if (cardRef.current) {
      observer.observe(cardRef.current)
    }

    return () => observer.disconnect()
  }, [talent.avatar, preloadResource])

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available': return 'bg-green-500'
      case 'busy': return 'bg-yellow-500'
      case 'unavailable': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const handleAction = useCallback((action: string) => {
    onAction?.(talent, action)
  }, [talent, onAction])

  if (!isVisible) {
    return (
      <div ref={cardRef} style={style} className="bg-muted/20 rounded-lg animate-pulse">
        <div className="h-full w-full" />
      </div>
    )
  }

  return (
    <Card 
      ref={cardRef}
      className={cn(
        "group transition-all duration-200 hover:shadow-lg hover:scale-[1.02]",
        "cursor-pointer border border-border overflow-hidden"
      )}
      style={style}
      onClick={() => onAction?.(talent, 'view')}
    >
      <CardContent className="p-4 h-full flex flex-col">
        <div className="flex items-start gap-3 mb-3">
          <div className="relative flex-shrink-0">
            <Avatar className="h-12 w-12">
              {talent.avatar ? (
                <AvatarImage 
                  src={talent.avatar} 
                  alt={`${talent.firstName} ${talent.lastName}`}
                  loading="lazy"
                />
              ) : null}
              <AvatarFallback className="text-sm font-medium">
                {talent.firstName[0]}{talent.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div className={cn(
              "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background",
              getAvailabilityColor(talent.availability)
            )} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-semibold text-sm truncate">
                {talent.firstName} {talent.lastName}
              </h4>
              {talent.rating && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs text-muted-foreground">
                    {talent.rating.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
            
            <div className="text-xs text-muted-foreground mb-2">
              Age {talent.age} • {talent.experience}
            </div>

            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{talent.location}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-3 flex-1">
          {talent.skills.slice(0, 4).map((skill, index) => (
            <Badge 
              key={index}
              variant="secondary" 
              className="text-xs px-2 py-0.5"
            >
              {skill}
            </Badge>
          ))}
          {talent.skills.length > 4 && (
            <Badge variant="outline" className="text-xs px-2 py-0.5">
              +{talent.skills.length - 4}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-1">
            {talent.phone && (
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-7 w-7 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  handleAction('call')
                }}
              >
                <Phone className="h-3 w-3" />
              </Button>
            )}
            {talent.email && (
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-7 w-7 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  handleAction('email')
                }}
              >
                <Mail className="h-3 w-3" />
              </Button>
            )}
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 w-7 p-0"
              onClick={(e) => {
                e.stopPropagation()
                handleAction('message')
              }}
            >
              <MessageSquare className="h-3 w-3" />
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 w-7 p-0"
              onClick={(e) => {
                e.stopPropagation()
                handleAction('audition')
              }}
            >
              <Calendar className="h-3 w-3" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 w-7 p-0"
              onClick={(e) => {
                e.stopPropagation()
                handleAction('more')
              }}
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function VirtualTalentGrid({
  talents,
  itemHeight = 280,
  itemsPerRow = 4,
  gap = 16,
  onTalentClick,
  onTalentAction,
  className,
  searchQuery,
  filters
}: VirtualTalentGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [scrollTop, setScrollTop] = useState(0)
  const { virtualizeList, debounce } = usePerformanceOptimizer()

  // Filter and search talents
  const filteredTalents = useMemo(() => {
    let result = talents

    // Apply search query
    if (searchQuery?.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(talent => 
        talent.firstName.toLowerCase().includes(query) ||
        talent.lastName.toLowerCase().includes(query) ||
        talent.skills.some(skill => skill.toLowerCase().includes(query)) ||
        talent.location.toLowerCase().includes(query) ||
        talent.experience.toLowerCase().includes(query)
      )
    }

    // Apply filters
    if (filters) {
      if (filters.availability?.length) {
        result = result.filter(talent => filters.availability!.includes(talent.availability))
      }

      if (filters.skills?.length) {
        result = result.filter(talent => 
          filters.skills!.some(skill => talent.skills.includes(skill))
        )
      }

      if (filters.location?.length) {
        result = result.filter(talent => filters.location!.includes(talent.location))
      }

      if (filters.experience?.length) {
        result = result.filter(talent => filters.experience!.includes(talent.experience))
      }
    }

    return result
  }, [talents, searchQuery, filters])

  // Calculate grid layout
  const gridLayout = useMemo(() => {
    if (containerSize.width === 0) return { itemWidth: 0, actualItemsPerRow: itemsPerRow }

    const availableWidth = containerSize.width - gap
    const maxItemWidth = Math.floor((availableWidth - (itemsPerRow - 1) * gap) / itemsPerRow)
    const actualItemsPerRow = Math.floor((availableWidth + gap) / (maxItemWidth + gap))
    const itemWidth = Math.floor((availableWidth - (actualItemsPerRow - 1) * gap) / actualItemsPerRow)

    return { itemWidth, actualItemsPerRow }
  }, [containerSize.width, itemsPerRow, gap])

  // Create virtualized items
  const virtualizedData = useMemo(() => {
    const { itemWidth, actualItemsPerRow } = gridLayout
    const totalRows = Math.ceil(filteredTalents.length / actualItemsPerRow)
    const rowHeight = itemHeight + gap

    return virtualizeList(
      Array.from({ length: totalRows }, (_, rowIndex) => rowIndex),
      containerSize.height,
      rowHeight,
      scrollTop
    )
  }, [filteredTalents.length, gridLayout, itemHeight, gap, containerSize.height, scrollTop, virtualizeList])

  // Generate visible items with positioning
  const visibleItems = useMemo((): VirtualizedItem[] => {
    const { itemWidth, actualItemsPerRow } = gridLayout
    const items: VirtualizedItem[] = []

    virtualizedData.visibleItems.forEach((rowIndex) => {
      const startIndex = rowIndex * actualItemsPerRow
      const endIndex = Math.min(startIndex + actualItemsPerRow, filteredTalents.length)

      for (let i = startIndex; i < endIndex; i++) {
        const talent = filteredTalents[i]
        const colIndex = i % actualItemsPerRow
        const actualRowIndex = Math.floor(i / actualItemsPerRow)

        items.push({
          index: i,
          talent,
          style: {
            position: 'absolute',
            top: virtualizedData.spacerBefore + (actualRowIndex - virtualizedData.startIndex) * (itemHeight + gap),
            left: colIndex * (itemWidth + gap),
            width: itemWidth,
            height: itemHeight,
          }
        })
      }
    })

    return items
  }, [virtualizedData, gridLayout, filteredTalents, itemHeight, gap])

  // Handle container resize
  useEffect(() => {
    const handleResize = debounce?.(() => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current
        setContainerSize({ width: clientWidth, height: clientHeight })
      }
    }, 100)

    const resizeObserver = new ResizeObserver(handleResize || (() => {}))
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
      // Initial measurement
      const { clientWidth, clientHeight } = containerRef.current
      setContainerSize({ width: clientWidth, height: clientHeight })
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [debounce])

  // Handle scroll
  const handleScroll = useCallback(
    debounce?.((e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop)
    }, 10) || (() => {}),
    [debounce]
  )

  const totalHeight = Math.ceil(filteredTalents.length / gridLayout.actualItemsPerRow) * (itemHeight + gap)

  return (
    <div className={cn("relative w-full h-full", className)}>
      <div
        ref={containerRef}
        className="w-full h-full overflow-auto"
        onScroll={handleScroll}
      >
        {/* Virtual container */}
        <div
          className="relative"
          style={{ 
            height: totalHeight,
            minHeight: containerSize.height 
          }}
        >
          {/* Visible items */}
          {visibleItems.map((item) => (
            <OptimizedTalentCard
              key={item.talent.id}
              talent={item.talent}
              onAction={onTalentAction}
              style={item.style}
            />
          ))}

          {/* Loading indicator for empty state */}
          {filteredTalents.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-muted-foreground mb-2">No talents found</div>
                {(searchQuery || filters) && (
                  <div className="text-sm text-muted-foreground">
                    Try adjusting your search or filters
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Performance info */}
      <div className="absolute top-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
        {filteredTalents.length} talents • {visibleItems.length} visible
      </div>
    </div>
  )
}