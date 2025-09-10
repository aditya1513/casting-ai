"use client"

import React from 'react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Star, MapPin, Calendar, Award, Video, FileText, Heart, Share2 } from 'lucide-react'

export interface TalentData {
  id: string
  name: string
  profileImage?: string
  initials?: string
  role: string
  location: string
  experience: string
  rating: number
  totalReviews: number
  languages: string[]
  skills: string[]
  availability: 'immediate' | 'week' | 'month' | 'unavailable'
  hourlyRate?: string
  recentProjects?: Array<{
    name: string
    role: string
    year: number
  }>
  matchScore?: number
  verified?: boolean
}

export interface TalentCardProps {
  talent: TalentData
  variant?: 'compact' | 'detailed' | 'inline'
  showActions?: boolean
  onSelect?: () => void
  onViewProfile?: () => void
  onScheduleAudition?: () => void
  onSave?: () => void
  onShare?: () => void
  selected?: boolean
  className?: string
}

/**
 * TalentCard component for displaying talent profiles
 * Used in search results and AI recommendations
 */
export const TalentCard: React.FC<TalentCardProps> = ({
  talent,
  variant = 'compact',
  showActions = true,
  onSelect,
  onViewProfile,
  onScheduleAudition,
  onSave,
  onShare,
  selected = false,
  className,
}) => {
  const availabilityColors = {
    immediate: 'success',
    week: 'warning',
    month: 'default',
    unavailable: 'error',
  } as const

  const availabilityText = {
    immediate: 'Available Now',
    week: 'Available This Week',
    month: 'Available This Month',
    unavailable: 'Not Available',
  }

  if (variant === 'inline') {
    // Inline variant for embedding in messages
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer",
          selected && "ring-2 ring-gray-900 dark:ring-white",
          className
        )}
        onClick={onSelect}
      >
        <Avatar size="md">
          <AvatarImage src={talent.profileImage} alt={talent.name} />
          <AvatarFallback>{talent.initials || talent.name.substring(0, 2)}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm truncate">{talent.name}</h4>
            {talent.verified && (
              <Award className="w-3.5 h-3.5 text-blue-500" />
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {talent.role} • {talent.location}
          </p>
        </div>

        {talent.matchScore && (
          <Badge variant="success" size="sm">
            {talent.matchScore}% Match
          </Badge>
        )}

        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation()
            onViewProfile?.()
          }}
        >
          View
        </Button>
      </div>
    )
  }

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-200 hover:shadow-lg",
        selected && "ring-2 ring-gray-900 dark:ring-white",
        className
      )}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Avatar size={variant === 'detailed' ? 'xl' : 'lg'}>
            <AvatarImage src={talent.profileImage} alt={talent.name} />
            <AvatarFallback>{talent.initials || talent.name.substring(0, 2)}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{talent.name}</h3>
                  {talent.verified && (
                    <Award className="w-4 h-4 text-blue-500" aria-label="Verified profile" />
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{talent.role}</p>
              </div>

              {talent.matchScore && (
                <Badge variant="success" className="ml-2">
                  {talent.matchScore}% Match
                </Badge>
              )}
            </div>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {talent.location}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {talent.experience}
              </span>
              {talent.hourlyRate && (
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {talent.hourlyRate}/hr
                </span>
              )}
            </div>

            {/* Rating */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "w-3.5 h-3.5",
                      i < Math.floor(talent.rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300 dark:text-gray-600"
                    )}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {talent.rating.toFixed(1)} ({talent.totalReviews} reviews)
              </span>
            </div>
          </div>
        </div>

        {/* Skills & Languages */}
        <div className="mt-4 space-y-2">
          {talent.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {talent.skills.slice(0, variant === 'detailed' ? undefined : 4).map((skill) => (
                <Badge key={skill} variant="secondary" size="xs">
                  {skill}
                </Badge>
              ))}
              {variant === 'compact' && talent.skills.length > 4 && (
                <Badge variant="secondary" size="xs">
                  +{talent.skills.length - 4} more
                </Badge>
              )}
            </div>
          )}

          {talent.languages.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <span className="font-medium">Languages:</span>
              <span>{talent.languages.join(', ')}</span>
            </div>
          )}
        </div>

        {/* Recent Projects (Detailed View) */}
        {variant === 'detailed' && talent.recentProjects && talent.recentProjects.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Recent Projects
            </h4>
            <div className="space-y-1">
              {talent.recentProjects.map((project, index) => (
                <div key={index} className="text-xs text-gray-600 dark:text-gray-400">
                  <span className="font-medium">{project.name}</span> • {project.role} ({project.year})
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Availability Badge */}
        <div className="mt-4">
          <Badge
            variant={availabilityColors[talent.availability]}
            size="sm"
            dot
            className="w-full justify-center"
          >
            {availabilityText[talent.availability]}
          </Badge>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              variant="primary"
              className="flex-1"
              onClick={onScheduleAudition}
            >
              <Video className="w-3.5 h-3.5 mr-1" />
              Audition
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={onViewProfile}
            >
              <FileText className="w-3.5 h-3.5 mr-1" />
              Profile
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={onSave}
              aria-label="Save talent"
            >
              <Heart className="w-4 h-4" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={onShare}
              aria-label="Share talent"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}

/**
 * TalentCardSkeleton component for loading states
 */
export const TalentCardSkeleton: React.FC<{
  variant?: 'compact' | 'detailed' | 'inline'
  className?: string
}> = ({ variant = 'compact', className }) => {
  if (variant === 'inline') {
    return (
      <div className={cn("flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800", className)}>
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-48" />
        </div>
      </div>
    )
  }

  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-start gap-4">
        <div className={cn(
          "rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse",
          variant === 'detailed' ? "w-14 h-14" : "w-12 h-12"
        )} />
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-48" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex gap-2">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse w-16" />
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse w-20" />
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse w-18" />
        </div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    </Card>
  )
}