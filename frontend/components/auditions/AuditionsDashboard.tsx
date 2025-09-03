'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, Users, Video, Phone, Filter, Search, Plus, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Alert, AlertDescription } from '@/components/ui/alert'
import AuditionCalendar from './AuditionCalendar'
import AuditionBookingModal from './AuditionBookingModal'
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
  priority?: 'normal' | 'high'
  confirmationCode?: string
  notes?: string
  requirements?: string[]
  project?: {
    id: string
    description?: string
    platform?: string
    director?: string
  }
  character?: {
    id: string
    description?: string
    ageRange?: string
    importance?: string
  }
}

interface MyAudition extends AuditionSlot {
  bookingId: string
  bookingStatus: 'confirmed' | 'tentative' | 'cancelled' | 'waitlist'
  bookedAt: string
  isWaitlisted: boolean
  waitlistPosition?: number
  remindersSent?: any
  checkInCode?: string
  specialRequests?: string
}

interface TalentProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  profileImageUrl?: string
}

interface AuditionsDashboardProps {
  userRole: 'talent' | 'casting_director' | 'producer'
  talent?: TalentProfile
  onCreateSlot?: () => void
}

export default function AuditionsDashboard({ 
  userRole, 
  talent, 
  onCreateSlot 
}: AuditionsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'calendar' | 'available' | 'my-auditions' | 'manage'>('calendar')
  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'month'>('week')
  const [selectedSlot, setSelectedSlot] = useState<AuditionSlot | null>(null)
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [selectedLocationType, setSelectedLocationType] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  
  // Sample data - in real app, this would come from API
  const [allAuditions, setAllAuditions] = useState<AuditionSlot[]>([])
  const [myAuditions, setMyAuditions] = useState<MyAudition[]>([])
  const [loading, setLoading] = useState(false)

  // Sample data for demo
  useEffect(() => {
    // This would be replaced with actual API calls
    const sampleAuditions: AuditionSlot[] = [
      {
        id: '1',
        projectTitle: 'Mumbai Diaries 2',
        characterName: 'Dr. Sarah',
        startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        endTime: new Date(Date.now() + 86400000 + 3600000).toISOString(),
        location: 'Yash Raj Studios, Andheri',
        locationType: 'physical',
        bookedCount: 8,
        maxParticipants: 12,
        availableSpots: 4,
        status: 'available',
        project: {
          id: 'proj1',
          description: 'Medical drama series for Amazon Prime',
          platform: 'Amazon Prime Video',
          director: 'Nikkhil Advani'
        },
        character: {
          id: 'char1',
          description: 'Senior doctor, strong and compassionate',
          ageRange: '35-45',
          importance: 'Supporting'
        },
        requirements: ['Medical terminology knowledge preferred', 'Previous TV experience']
      },
      {
        id: '2',
        projectTitle: 'Scam 2023',
        characterName: 'Journalist',
        startTime: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
        endTime: new Date(Date.now() + 172800000 + 3600000).toISOString(),
        location: 'Virtual Audition',
        locationType: 'virtual',
        bookedCount: 15,
        maxParticipants: 15,
        availableSpots: 0,
        status: 'full',
        meetingLink: 'https://meet.google.com/xyz',
        project: {
          id: 'proj2',
          description: 'Financial thriller web series',
          platform: 'SonyLIV',
          director: 'Hansal Mehta'
        }
      }
    ]

    const sampleMyAuditions: MyAudition[] = [
      {
        ...sampleAuditions[0],
        bookingId: 'book1',
        bookingStatus: 'confirmed',
        bookedAt: new Date(Date.now() - 86400000).toISOString(),
        isWaitlisted: false,
        confirmationCode: 'CM123456',
        checkInCode: 'CHK789'
      }
    ]

    setAllAuditions(sampleAuditions)
    setMyAuditions(sampleMyAuditions)
  }, [])

  // Filter auditions based on search and filters
  const filteredAuditions = allAuditions.filter(audition => {
    const matchesSearch = !searchTerm || 
      audition.projectTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      audition.characterName?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesProject = !selectedProject || audition.project?.id === selectedProject
    const matchesLocationType = !selectedLocationType || audition.locationType === selectedLocationType

    return matchesSearch && matchesProject && matchesLocationType
  })

  const upcomingAuditions = myAuditions
    .filter(audition => new Date(audition.startTime) > new Date())
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  const pastAuditions = myAuditions
    .filter(audition => new Date(audition.startTime) < new Date())
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())

  const handleSlotClick = (slot: AuditionSlot) => {
    setSelectedSlot(slot)
    setIsBookingModalOpen(true)
  }

  const handleBooking = async (slotId: string, bookingData: any) => {
    setLoading(true)
    try {
      // API call to book audition
      console.log('Booking audition:', { slotId, bookingData })
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Update local state (in real app, refetch from API)
      const slot = allAuditions.find(s => s.id === slotId)
      if (slot && talent) {
        const newBooking: MyAudition = {
          ...slot,
          bookingId: `book_${Date.now()}`,
          bookingStatus: 'confirmed',
          bookedAt: new Date().toISOString(),
          isWaitlisted: false,
          confirmationCode: `CM${Math.random().toString(36).substr(2, 6).toUpperCase()}`
        }
        setMyAuditions(prev => [...prev, newBooking])
        
        // Update available spots
        setAllAuditions(prev => prev.map(a => 
          a.id === slotId 
            ? { ...a, bookedCount: a.bookedCount + 1, availableSpots: a.availableSpots - 1 }
            : a
        ))
      }
    } catch (error) {
      throw new Error('Failed to book audition. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleWaitlist = async (slotId: string, bookingData: any) => {
    setLoading(true)
    try {
      // API call to join waitlist
      console.log('Joining waitlist:', { slotId, bookingData })
      
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const slot = allAuditions.find(s => s.id === slotId)
      if (slot && talent) {
        const newBooking: MyAudition = {
          ...slot,
          bookingId: `wait_${Date.now()}`,
          bookingStatus: 'waitlist',
          bookedAt: new Date().toISOString(),
          isWaitlisted: true,
          waitlistPosition: 3 // Sample position
        }
        setMyAuditions(prev => [...prev, newBooking])
      }
    } catch (error) {
      throw new Error('Failed to join waitlist. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getLocationIcon = (locationType: string) => {
    switch (locationType) {
      case 'virtual':
        return <Video className="w-4 h-4 text-green-600" />
      case 'hybrid':
        return <Phone className="w-4 h-4 text-blue-600" />
      default:
        return <MapPin className="w-4 h-4 text-gray-600" />
    }
  }

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime)
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit'
      })
    }
  }

  const renderAvailableAuditions = () => (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search projects or characters..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={selectedLocationType} onValueChange={setSelectedLocationType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Location Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Types</SelectItem>
            <SelectItem value="physical">In-Person</SelectItem>
            <SelectItem value="virtual">Virtual</SelectItem>
            <SelectItem value="hybrid">Hybrid</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon">
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      {/* Auditions List */}
      {filteredAuditions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No auditions found matching your criteria.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredAuditions.map((audition) => {
            const dateTime = formatDateTime(audition.startTime)
            const endTime = formatDateTime(audition.endTime)
            
            return (
              <Card key={audition.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleSlotClick(audition)}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{audition.projectTitle}</h3>
                      {audition.characterName && (
                        <p className="text-sm text-gray-600">Character: {audition.characterName}</p>
                      )}
                    </div>
                    <Badge variant={audition.status === 'available' ? 'default' : audition.status === 'full' ? 'destructive' : 'secondary'}>
                      {audition.status === 'available' ? `${audition.availableSpots} spots left` : 
                       audition.status === 'full' ? 'Full' : 'Waitlist'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <div>
                        <div className="font-medium">{dateTime.date}</div>
                        <div className="text-gray-600">{dateTime.time} - {endTime.time}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {getLocationIcon(audition.locationType)}
                      <div>
                        <div className="font-medium capitalize">{audition.locationType}</div>
                        <div className="text-gray-600 line-clamp-1">{audition.location}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-purple-600" />
                      <div>
                        <div className="font-medium">{audition.bookedCount}/{audition.maxParticipants}</div>
                        <div className="text-gray-600">Booked</div>
                      </div>
                    </div>
                  </div>

                  {audition.project?.platform && (
                    <div className="mt-3 flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {audition.project.platform}
                      </Badge>
                      {audition.project.director && (
                        <span className="text-xs text-gray-500">Dir: {audition.project.director}</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )

  const renderMyAuditions = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{upcomingAuditions.length}</div>
            <div className="text-sm text-gray-600">Upcoming</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {myAuditions.filter(a => a.bookingStatus === 'confirmed').length}
            </div>
            <div className="text-sm text-gray-600">Confirmed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {myAuditions.filter(a => a.isWaitlisted).length}
            </div>
            <div className="text-sm text-gray-600">Waitlisted</div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Auditions */}
      {upcomingAuditions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Upcoming Auditions</h3>
          <div className="space-y-4">
            {upcomingAuditions.map((audition) => {
              const dateTime = formatDateTime(audition.startTime)
              const timeUntil = Math.ceil((new Date(audition.startTime).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              
              return (
                <Card key={audition.bookingId} className="border-l-4 border-l-green-500">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-semibold">{audition.projectTitle}</h4>
                        {audition.characterName && (
                          <p className="text-sm text-gray-600">Character: {audition.characterName}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={audition.isWaitlisted ? 'secondary' : 'default'}>
                          {audition.isWaitlisted ? `Waitlist #${audition.waitlistPosition}` : audition.bookingStatus}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                            <DropdownMenuItem>Reschedule</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">Cancel</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <div>
                          <div className="font-medium">{dateTime.date}</div>
                          <div className="text-gray-600">{dateTime.time}</div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {getLocationIcon(audition.locationType)}
                        <div>
                          <div className="font-medium capitalize">{audition.locationType}</div>
                          <div className="text-gray-600 line-clamp-1">{audition.location}</div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-orange-600" />
                        <div>
                          <div className="font-medium">{timeUntil} day{timeUntil !== 1 ? 's' : ''}</div>
                          <div className="text-gray-600">until audition</div>
                        </div>
                      </div>

                      {audition.confirmationCode && (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 text-green-600 font-mono text-xs">#</div>
                          <div>
                            <div className="font-medium font-mono">{audition.confirmationCode}</div>
                            <div className="text-gray-600">Confirmation</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {timeUntil <= 1 && (
                      <Alert className="mt-4">
                        <AlertDescription>
                          <strong>Reminder:</strong> Your audition is {timeUntil === 0 ? 'today' : 'tomorrow'}! 
                          Make sure you're prepared and arrive 15 minutes early.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Past Auditions */}
      {pastAuditions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Past Auditions</h3>
          <div className="space-y-4">
            {pastAuditions.slice(0, 5).map((audition) => {
              const dateTime = formatDateTime(audition.startTime)
              
              return (
                <Card key={audition.bookingId} className="opacity-75">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{audition.projectTitle}</h4>
                        {audition.characterName && (
                          <p className="text-sm text-gray-600">Character: {audition.characterName}</p>
                        )}
                      </div>
                      <Badge variant="outline">{audition.bookingStatus}</Badge>
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                      <span>{dateTime.date}</span>
                      <span>{dateTime.time}</span>
                      <span className="capitalize">{audition.locationType}</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {myAuditions.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="mx-auto w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No Auditions Yet</h3>
            <p className="text-sm text-gray-500 mb-4">
              Browse available auditions to book your first one!
            </p>
            <Button onClick={() => setActiveTab('available')}>
              Browse Auditions
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Auditions</h1>
          <p className="text-gray-600 mt-1">
            {userRole === 'talent' ? 'Find and book your next audition' : 'Manage audition schedules'}
          </p>
        </div>
        
        {userRole !== 'talent' && onCreateSlot && (
          <Button onClick={onCreateSlot}>
            <Plus className="w-4 h-4 mr-2" />
            Create Slot
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab as any}>
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-4">
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="available">Available</TabsTrigger>
          <TabsTrigger value="my-auditions">My Auditions</TabsTrigger>
          {userRole !== 'talent' && (
            <TabsTrigger value="manage">Manage</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="calendar" className="space-y-6">
          <AuditionCalendar
            auditions={allAuditions}
            onSlotClick={handleSlotClick}
            onDateChange={setSelectedDate}
            view={calendarView}
            onViewChange={setCalendarView}
            userRole={userRole}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="available">
          {renderAvailableAuditions()}
        </TabsContent>

        <TabsContent value="my-auditions">
          {renderMyAuditions()}
        </TabsContent>

        {userRole !== 'talent' && (
          <TabsContent value="manage">
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-gray-500">Audition management features coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Booking Modal */}
      <AuditionBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false)
          setSelectedSlot(null)
        }}
        slot={selectedSlot}
        talent={talent}
        onBooking={handleBooking}
        onWaitlist={handleWaitlist}
        loading={loading}
        alternativeSlots={allAuditions.filter(a => 
          a.id !== selectedSlot?.id && 
          a.availableSpots > 0 &&
          new Date(a.startTime) > new Date()
        ).slice(0, 3)}
      />
    </div>
  )
}