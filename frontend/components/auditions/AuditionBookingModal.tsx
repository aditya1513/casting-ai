'use client'

import React, { useState, useCallback } from 'react'
import { Calendar, Clock, MapPin, Users, Video, Phone, AlertCircle, CheckCircle, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
  venueAddress?: string
  notes?: string
  requirements?: string[]
  project?: {
    description?: string
    platform?: string
    director?: string
  }
  character?: {
    description?: string
    ageRange?: string
    importance?: string
  }
}

interface TalentProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  profileImageUrl?: string
}

interface BookingFormData {
  priority: 'normal' | 'high'
  talentNotes: string
  specialRequests: string
  acceptTerms: boolean
  notificationPreference: 'email' | 'sms' | 'both'
  alternativeSlots?: string[]
}

interface AuditionBookingModalProps {
  isOpen: boolean
  onClose: () => void
  slot: AuditionSlot | null
  talent?: TalentProfile
  onBooking?: (slotId: string, bookingData: BookingFormData) => Promise<void>
  onWaitlist?: (slotId: string, bookingData: BookingFormData) => Promise<void>
  loading?: boolean
  alternativeSlots?: AuditionSlot[]
}

export default function AuditionBookingModal({
  isOpen,
  onClose,
  slot,
  talent,
  onBooking,
  onWaitlist,
  loading = false,
  alternativeSlots = []
}: AuditionBookingModalProps) {
  const [formData, setFormData] = useState<BookingFormData>({
    priority: 'normal',
    talentNotes: '',
    specialRequests: '',
    acceptTerms: false,
    notificationPreference: 'email',
    alternativeSlots: []
  })
  
  const [step, setStep] = useState<'details' | 'booking' | 'confirmation'>('details')
  const [bookingType, setBookingType] = useState<'book' | 'waitlist'>('book')
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')

  const resetModal = useCallback(() => {
    setStep('details')
    setBookingType('book')
    setError('')
    setSuccess('')
    setFormData({
      priority: 'normal',
      talentNotes: '',
      specialRequests: '',
      acceptTerms: false,
      notificationPreference: 'email',
      alternativeSlots: []
    })
  }, [])

  const handleClose = useCallback(() => {
    resetModal()
    onClose()
  }, [resetModal, onClose])

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
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit'
      })
    }
  }

  const getAvailabilityStatus = () => {
    if (!slot) return null
    
    if (slot.availableSpots > 0) {
      return {
        type: 'available' as const,
        message: `${slot.availableSpots} spot${slot.availableSpots !== 1 ? 's' : ''} remaining`,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      }
    } else {
      return {
        type: 'waitlist' as const,
        message: 'This slot is full. You can join the waitlist.',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200'
      }
    }
  }

  const handleBookingSubmit = async () => {
    if (!slot || !talent) return
    
    setError('')
    
    // Validation
    if (!formData.acceptTerms) {
      setError('Please accept the terms and conditions to proceed.')
      return
    }

    try {
      if (bookingType === 'book' && onBooking) {
        await onBooking(slot.id, formData)
        setSuccess('Audition booked successfully!')
      } else if (bookingType === 'waitlist' && onWaitlist) {
        await onWaitlist(slot.id, formData)
        setSuccess('Successfully added to waitlist!')
      }
      
      setStep('confirmation')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed. Please try again.')
    }
  }

  const renderDetailsStep = () => {
    if (!slot) return null
    
    const availability = getAvailabilityStatus()
    const startDateTime = formatDateTime(slot.startTime)
    const endDateTime = formatDateTime(slot.endTime)

    return (
      <div className="space-y-6">
        {/* Audition Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{slot.projectTitle}</span>
              <Badge variant={availability?.type === 'available' ? 'default' : 'secondary'}>
                {availability?.type === 'available' ? 'Available' : 'Waitlist Only'}
              </Badge>
            </CardTitle>
            {slot.characterName && (
              <p className="text-sm text-gray-600">Character: {slot.characterName}</p>
            )}
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Date & Time */}
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <div className="font-medium">{startDateTime.date}</div>
                <div className="text-sm text-gray-600">
                  {startDateTime.time} - {endDateTime.time}
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center space-x-3">
              {getLocationIcon(slot.locationType)}
              <div>
                <div className="font-medium capitalize">{slot.locationType} Audition</div>
                <div className="text-sm text-gray-600">{slot.location}</div>
                {slot.venueAddress && (
                  <div className="text-sm text-gray-500">{slot.venueAddress}</div>
                )}
              </div>
            </div>

            {/* Participants */}
            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-purple-600" />
              <div>
                <div className="font-medium">
                  {slot.bookedCount}/{slot.maxParticipants} Booked
                </div>
                <div className={cn("text-sm", availability?.color)}>
                  {availability?.message}
                </div>
              </div>
            </div>

            {/* Meeting Link */}
            {slot.meetingLink && slot.locationType !== 'physical' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2 text-blue-700">
                  <Video className="w-4 h-4" />
                  <span className="text-sm font-medium">Virtual Meeting</span>
                </div>
                <div className="text-sm text-blue-600 mt-1">
                  Meeting link will be provided after booking confirmation
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Project & Character Details */}
        {(slot.project?.description || slot.character?.description) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {slot.project?.description && (
                <div>
                  <h4 className="font-medium text-sm">About the Project</h4>
                  <p className="text-sm text-gray-600">{slot.project.description}</p>
                </div>
              )}
              
              {slot.character?.description && (
                <div>
                  <h4 className="font-medium text-sm">Character Description</h4>
                  <p className="text-sm text-gray-600">{slot.character.description}</p>
                </div>
              )}
              
              {slot.character?.ageRange && (
                <div>
                  <h4 className="font-medium text-sm">Age Range</h4>
                  <p className="text-sm text-gray-600">{slot.character.ageRange}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Requirements */}
        {slot.requirements && slot.requirements.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-2">Requirements:</div>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {slot.requirements.map((req, index) => (
                  <li key={index}>{req}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Notes */}
        {slot.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">{slot.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Availability Alert */}
        {availability && (
          <Alert className={cn(availability.bgColor, availability.borderColor)}>
            <AlertCircle className={cn("h-4 w-4", availability.color)} />
            <AlertDescription className={availability.color}>
              {availability.message}
              {availability.type === 'waitlist' && (
                <span className="block mt-1 text-sm">
                  You'll be notified if a spot becomes available.
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}
      </div>
    )
  }

  const renderBookingStep = () => {
    const availability = getAvailabilityStatus()
    
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">
            {availability?.type === 'available' ? 'Book Your Audition' : 'Join Waitlist'}
          </h3>
          <p className="text-sm text-gray-600">
            {availability?.type === 'available' 
              ? 'Please provide additional information for your booking'
              : 'We\'ll notify you if a spot becomes available'
            }
          </p>
        </div>

        <div className="space-y-4">
          {/* Priority */}
          <div>
            <Label htmlFor="priority">Priority Level</Label>
            <Select 
              value={formData.priority} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal Priority</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Your Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any information you'd like the casting director to know..."
              value={formData.talentNotes}
              onChange={(e) => setFormData(prev => ({ ...prev, talentNotes: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Special Requests */}
          <div>
            <Label htmlFor="requests">Special Requests (Optional)</Label>
            <Textarea
              id="requests"
              placeholder="Accessibility needs, preferred time adjustments, etc."
              value={formData.specialRequests}
              onChange={(e) => setFormData(prev => ({ ...prev, specialRequests: e.target.value }))}
              rows={2}
            />
          </div>

          {/* Notification Preference */}
          <div>
            <Label>Notification Preferences</Label>
            <RadioGroup 
              value={formData.notificationPreference} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, notificationPreference: value as any }))}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="email" id="email" />
                <Label htmlFor="email">Email notifications only</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sms" id="sms" />
                <Label htmlFor="sms">SMS notifications only</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="both" id="both" />
                <Label htmlFor="both">Both email and SMS</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Alternative Slots */}
          {alternativeSlots.length > 0 && (
            <div>
              <Label>Alternative Time Slots (Optional)</Label>
              <p className="text-sm text-gray-600 mb-2">
                Select backup options in case this slot becomes unavailable:
              </p>
              <div className="space-y-2">
                {alternativeSlots.slice(0, 3).map((altSlot) => {
                  const altDateTime = formatDateTime(altSlot.startTime)
                  return (
                    <div key={altSlot.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`alt-${altSlot.id}`}
                        checked={formData.alternativeSlots?.includes(altSlot.id)}
                        onCheckedChange={(checked) => {
                          setFormData(prev => ({
                            ...prev,
                            alternativeSlots: checked
                              ? [...(prev.alternativeSlots || []), altSlot.id]
                              : prev.alternativeSlots?.filter(id => id !== altSlot.id)
                          }))
                        }}
                      />
                      <Label htmlFor={`alt-${altSlot.id}`} className="text-sm">
                        {altDateTime.date} at {altDateTime.time}
                      </Label>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Terms */}
          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={formData.acceptTerms}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, acceptTerms: !!checked }))}
            />
            <Label htmlFor="terms" className="text-sm leading-relaxed">
              I agree to the audition terms and conditions. I understand that I must arrive on time
              and prepared for the audition. Cancellations must be made at least 24 hours in advance.
            </Label>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    )
  }

  const renderConfirmationStep = () => {
    if (!slot) return null
    
    return (
      <div className="text-center space-y-6">
        <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-6 h-6 text-green-600" />
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-green-600">{success}</h3>
          <p className="text-sm text-gray-600 mt-1">
            {bookingType === 'book' 
              ? 'You will receive a confirmation email with all the details shortly.'
              : 'We\'ll notify you immediately if a spot becomes available.'
            }
          </p>
        </div>

        <Card>
          <CardContent className="p-4 text-left">
            <div className="space-y-2 text-sm">
              <div><strong>Project:</strong> {slot.projectTitle}</div>
              {slot.characterName && (
                <div><strong>Character:</strong> {slot.characterName}</div>
              )}
              <div><strong>Date:</strong> {formatDateTime(slot.startTime).date}</div>
              <div><strong>Time:</strong> {formatDateTime(slot.startTime).time} - {formatDateTime(slot.endTime).time}</div>
              <div><strong>Location:</strong> {slot.location}</div>
            </div>
          </CardContent>
        </Card>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Next Steps:</strong> Check your email for confirmation and calendar invite. 
            Contact support if you need to make any changes.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!slot) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>
              {step === 'details' && 'Audition Details'}
              {step === 'booking' && (getAvailabilityStatus()?.type === 'available' ? 'Book Audition' : 'Join Waitlist')}
              {step === 'confirmation' && 'Booking Confirmed'}
            </span>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {step === 'details' && renderDetailsStep()}
        {step === 'booking' && renderBookingStep()}
        {step === 'confirmation' && renderConfirmationStep()}

        <DialogFooter>
          {step === 'details' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  const availability = getAvailabilityStatus()
                  setBookingType(availability?.type === 'available' ? 'book' : 'waitlist')
                  setStep('booking')
                }}
              >
                {getAvailabilityStatus()?.type === 'available' ? 'Book Audition' : 'Join Waitlist'}
              </Button>
            </>
          )}
          
          {step === 'booking' && (
            <>
              <Button variant="outline" onClick={() => setStep('details')}>
                Back
              </Button>
              <Button onClick={handleBookingSubmit} disabled={loading}>
                {loading ? 'Processing...' : (bookingType === 'book' ? 'Confirm Booking' : 'Join Waitlist')}
              </Button>
            </>
          )}
          
          {step === 'confirmation' && (
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}