'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { Calendar, CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, Users, Video, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

interface AuditionSlot {
  id: string
  projectTitle: string
  characterName?: string
  startTime: string
  endTime: string
  location: string
  locationType: 'physical' | 'virtual' | 'hybrid'
  bookedCount: number
  maxParticipants: number
  availableSpots: number
  meetingLink?: string
  status: 'available' | 'full' | 'waitlist'
}

interface AuditionCalendarProps {
  auditions?: AuditionSlot[]
  onSlotClick?: (slot: AuditionSlot) => void
  onDateChange?: (date: Date) => void
  view?: 'day' | 'week' | 'month'
  onViewChange?: (view: 'day' | 'week' | 'month') => void
  userRole?: 'talent' | 'casting_director' | 'producer'
  loading?: boolean
}

export default function AuditionCalendar({
  auditions = [],
  onSlotClick,
  onDateChange,
  view = 'week',
  onViewChange,
  userRole = 'talent',
  loading = false
}: AuditionCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Generate calendar days based on current view
  const calendarDays = useMemo(() => {
    const days = []
    const now = new Date()
    
    if (view === 'day') {
      days.push(new Date(currentDate))
    } else if (view === 'week') {
      const startOfWeek = new Date(currentDate)
      const dayOfWeek = startOfWeek.getDay()
      const diff = startOfWeek.getDate() - dayOfWeek
      startOfWeek.setDate(diff)
      
      for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek)
        day.setDate(startOfWeek.getDate() + i)
        days.push(day)
      }
    } else { // month
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      const startOfCalendar = new Date(startOfMonth)
      const dayOfWeek = startOfMonth.getDay()
      startOfCalendar.setDate(startOfCalendar.getDate() - dayOfWeek)
      
      for (let i = 0; i < 42; i++) { // 6 weeks
        const day = new Date(startOfCalendar)
        day.setDate(startOfCalendar.getDate() + i)
        days.push(day)
      }
    }
    
    return days
  }, [currentDate, view])

  // Get auditions for a specific date
  const getAuditionsForDate = useCallback((date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return auditions.filter(audition => {
      const auditionDate = new Date(audition.startTime).toISOString().split('T')[0]
      return auditionDate === dateStr
    })
  }, [auditions])

  // Navigation handlers
  const navigatePrevious = () => {
    const newDate = new Date(currentDate)
    if (view === 'day') {
      newDate.setDate(newDate.getDate() - 1)
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setMonth(newDate.getMonth() - 1)
    }
    setCurrentDate(newDate)
    onDateChange?.(newDate)
  }

  const navigateNext = () => {
    const newDate = new Date(currentDate)
    if (view === 'day') {
      newDate.setDate(newDate.getDate() + 1)
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + 7)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
    onDateChange?.(newDate)
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    onDateChange?.(today)
  }

  // Format display title
  const getDisplayTitle = () => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      ...(view === 'day' && { day: 'numeric' })
    })
    
    if (view === 'week') {
      const startOfWeek = new Date(currentDate)
      const dayOfWeek = startOfWeek.getDay()
      startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek)
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(endOfWeek.getDate() + 6)
      
      if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
        return `${startOfWeek.getDate()}-${endOfWeek.getDate()} ${formatter.format(startOfWeek).split(' ')[0]} ${startOfWeek.getFullYear()}`
      } else {
        return `${startOfWeek.getDate()} ${new Intl.DateTimeFormat('en-US', { month: 'short' }).format(startOfWeek)} - ${endOfWeek.getDate()} ${new Intl.DateTimeFormat('en-US', { month: 'short' }).format(endOfWeek)}`
      }
    }
    
    return formatter.format(currentDate)
  }

  const getLocationIcon = (locationType: string) => {
    switch (locationType) {
      case 'virtual':
        return <Video className="w-3 h-3" />
      case 'hybrid':
        return <Phone className="w-3 h-3" />
      default:
        return <MapPin className="w-3 h-3" />
    }
  }

  const getStatusBadge = (slot: AuditionSlot) => {
    if (slot.availableSpots === 0) {
      return <Badge variant="destructive" className="text-xs">Full</Badge>
    }
    if (slot.availableSpots <= 2) {
      return <Badge variant="secondary" className="text-xs">Few Spots</Badge>
    }
    return <Badge variant="default" className="text-xs">Available</Badge>
  }

  const renderDayView = () => {
    const dayAuditions = getAuditionsForDate(currentDate)
    const timeSlots = Array.from({ length: 14 }, (_, i) => 8 + i) // 8 AM to 9 PM

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-2">
          <div className="text-lg font-semibold text-center py-4 border-b">
            {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
        </div>
        
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {timeSlots.map(hour => {
            const slotAuditions = dayAuditions.filter(audition => {
              const auditionHour = new Date(audition.startTime).getHours()
              return auditionHour === hour
            })

            return (
              <div key={hour} className="grid grid-cols-12 gap-2 min-h-[60px] border-b border-gray-100">
                <div className="col-span-2 text-sm text-gray-500 py-2 text-right">
                  {hour}:00
                </div>
                <div className="col-span-10 space-y-1 py-1">
                  {slotAuditions.map(audition => (
                    <Card 
                      key={audition.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
                      onClick={() => onSlotClick?.(audition)}
                    >
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-sm line-clamp-1">
                            {audition.projectTitle}
                            {audition.characterName && ` - ${audition.characterName}`}
                          </h4>
                          {getStatusBadge(audition)}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(audition.startTime).toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit' 
                            })}
                            -
                            {new Date(audition.endTime).toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit' 
                            })}
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {getLocationIcon(audition.locationType)}
                            <span className="line-clamp-1">{audition.location}</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {audition.bookedCount}/{audition.maxParticipants}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderWeekView = () => {
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    
    return (
      <div className="space-y-4">
        {/* Week header */}
        <div className="grid grid-cols-8 gap-2">
          <div className="col-span-1"></div>
          {calendarDays.map((day, index) => (
            <div key={index} className="text-center p-2 border-b">
              <div className="text-sm text-gray-500">{weekDays[day.getDay()]}</div>
              <div className={cn(
                "text-lg font-semibold",
                day.toDateString() === new Date().toDateString() && "text-blue-600"
              )}>
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>
        
        {/* Time slots */}
        <div className="max-h-[600px] overflow-y-auto">
          {Array.from({ length: 14 }, (_, i) => 8 + i).map(hour => (
            <div key={hour} className="grid grid-cols-8 gap-2 min-h-[80px] border-b border-gray-50">
              <div className="col-span-1 text-sm text-gray-500 py-2 text-right pr-4">
                {hour}:00
              </div>
              {calendarDays.map((day, dayIndex) => {
                const dayAuditions = getAuditionsForDate(day).filter(audition => {
                  const auditionHour = new Date(audition.startTime).getHours()
                  return auditionHour === hour
                })

                return (
                  <div key={dayIndex} className="col-span-1 p-1">
                    {dayAuditions.map(audition => (
                      <Card 
                        key={audition.id} 
                        className="cursor-pointer hover:shadow-md transition-shadow mb-1 border-l-2 border-l-blue-500"
                        onClick={() => onSlotClick?.(audition)}
                      >
                        <CardContent className="p-2">
                          <div className="text-xs font-medium line-clamp-2 mb-1">
                            {audition.projectTitle}
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              {getLocationIcon(audition.locationType)}
                            </div>
                            <div className="text-xs text-gray-600">
                              {audition.bookedCount}/{audition.maxParticipants}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderMonthView = () => {
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const currentMonth = currentDate.getMonth()
    
    return (
      <div className="space-y-4">
        {/* Week headers */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 p-2">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.slice(0, 42).map((day, index) => {
            const dayAuditions = getAuditionsForDate(day)
            const isCurrentMonth = day.getMonth() === currentMonth
            const isToday = day.toDateString() === new Date().toDateString()
            const isSelected = selectedDate?.toDateString() === day.toDateString()
            
            return (
              <Card 
                key={index}
                className={cn(
                  "min-h-[120px] cursor-pointer hover:shadow-md transition-shadow",
                  !isCurrentMonth && "opacity-50",
                  isToday && "ring-2 ring-blue-500",
                  isSelected && "bg-blue-50 border-blue-200"
                )}
                onClick={() => {
                  setSelectedDate(day)
                  if (onDateChange) onDateChange(day)
                }}
              >
                <CardContent className="p-2">
                  <div className={cn(
                    "text-sm font-medium mb-1",
                    isToday && "text-blue-600",
                    !isCurrentMonth && "text-gray-400"
                  )}>
                    {day.getDate()}
                  </div>
                  
                  <div className="space-y-1">
                    {dayAuditions.slice(0, 3).map(audition => (
                      <div 
                        key={audition.id}
                        className="text-xs p-1 bg-blue-100 rounded text-blue-800 line-clamp-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSlotClick?.(audition)
                        }}
                      >
                        {audition.projectTitle}
                      </div>
                    ))}
                    
                    {dayAuditions.length > 3 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{dayAuditions.length - 3} more
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold">{getDisplayTitle()}</h2>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Tabs value={view} onValueChange={(value) => onViewChange?.(value as any)}>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="flex items-center space-x-1 border rounded">
            <Button variant="ghost" size="sm" onClick={navigatePrevious}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={navigateNext}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      <Card>
        <CardContent className="p-6">
          {view === 'day' && renderDayView()}
          {view === 'week' && renderWeekView()}
          {view === 'month' && renderMonthView()}
        </CardContent>
      </Card>
      
      {/* Legend */}
      {auditions.length > 0 && (
        <div className="flex items-center justify-center space-x-6 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <MapPin className="w-3 h-3" />
              <span>In-person</span>
            </div>
            <div className="flex items-center space-x-1">
              <Video className="w-3 h-3" />
              <span>Virtual</span>
            </div>
            <div className="flex items-center space-x-1">
              <Phone className="w-3 h-3" />
              <span>Hybrid</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="default" className="text-xs">Available</Badge>
            <Badge variant="secondary" className="text-xs">Few Spots</Badge>
            <Badge variant="destructive" className="text-xs">Full</Badge>
          </div>
        </div>
      )}
    </div>
  )
}