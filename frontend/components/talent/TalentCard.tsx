'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Star, MapPin, Heart } from 'lucide-react'
import { Talent } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { TalentCardMotion, AvatarMotion, ButtonMotion, RatingStarsMotion } from '@/lib/animations/talent-card-motion'

interface TalentCardProps {
  talent: {
    id: string
    name: string
    nameHindi?: string
    age?: number
    location: string
    profileImage?: string
    experience: string[]
    rating: number
    reviewCount: number
    featured?: boolean
    premium?: boolean
    availability?: 'available' | 'busy' | 'not_available'
    verified?: boolean
  }
  size?: 'compact' | 'default' | 'expanded'
  layout?: 'mobile' | 'desktop'
  onView: (id: string) => void
  onShortlist: (id: string) => void
  isShortlisted?: boolean
  loading?: boolean
  className?: string
}

export function TalentCard({
  talent,
  size = 'default',
  layout = 'mobile',
  onView,
  onShortlist,
  isShortlisted = false,
  loading = false,
  className = '',
}: TalentCardProps) {
  const [localShortlisted, setLocalShortlisted] = useState(isShortlisted)
  
  const handleView = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onView(talent.id)
  }
  
  const handleShortlist = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setLocalShortlisted(!localShortlisted)
    onShortlist(talent.id)
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  
  const displayAge = talent.age ? `${talent.age} • ` : ''
  const cardClasses = cn(
    'talent-card',
    {
      'talent-card--mobile': layout === 'mobile',
      'talent-card--desktop': layout === 'desktop',
      'talent-card--compact': size === 'compact',
      'talent-card--expanded': size === 'expanded',
      'talent-card--featured': talent.featured,
      'talent-card--premium': talent.premium,
      'talent-card--loading': loading,
    },
    className
  )

  // Skeleton/loading state
  if (loading) {
    return (
      <TalentCardMotion id={talent.id} loading={true}>
        <article className={cn(cardClasses, 'animate-pulse')}>
          <div className="talent-card__header">
            <div className="w-20 h-20 rounded-full bg-gray-700" />
            <div className="talent-card__info flex-1">
              <div className="h-5 bg-gray-700 rounded mb-2" />
              <div className="h-4 bg-gray-600 rounded w-2/3" />
            </div>
          </div>
          <div className="talent-card__experience">
            <div className="h-6 bg-gray-600 rounded w-12" />
            <div className="h-6 bg-gray-600 rounded w-16" />
            <div className="h-6 bg-gray-600 rounded w-20" />
          </div>
          <div className="talent-card__actions">
            <div className="h-10 bg-gray-600 rounded flex-1" />
            <div className="h-10 bg-gray-600 rounded flex-1" />
          </div>
        </article>
      </TalentCardMotion>
    )
  }

  // Mobile layout (default)
  if (layout === 'mobile') {
    return (
      <TalentCardMotion
        id={talent.id}
        isShortlisted={localShortlisted}
        featured={talent.featured}
        className={cardClasses}
      >
        <article className="talent-card" role="article" aria-labelledby={`talent-name-${talent.id}`}>
          {/* Header Section */}
          <div className="talent-card__header">
            <AvatarMotion
              src={talent.profileImage || ''}
              alt={talent.name}
              size="medium"
              loading={!talent.profileImage}
            />
            <div className="talent-card__info">
              <h3 id={`talent-name-${talent.id}`} className="talent-card__name talent-name">
                {talent.nameHindi && (
                  <span className="text-hindi block text-sm text-saffron mb-1">
                    {talent.nameHindi}
                  </span>
                )}
                {talent.name}
              </h3>
              <p className="talent-card__details talent-details">
                <MapPin className="w-3 h-3 inline mr-1" aria-hidden="true" />
                {displayAge}{talent.location}
              </p>
            </div>
            {/* Shortlist Button */}
            <button
              onClick={handleShortlist}
              className={cn(
                'p-2 rounded-full transition-colors',
                'hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                localShortlisted ? 'text-red-500' : 'text-gray-400'
              )}
              aria-label={localShortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
            >
              <Heart
                className={cn(
                  'w-5 h-5 transition-colors',
                  localShortlisted ? 'fill-current' : ''
                )}
              />
            </button>
          </div>

          {/* Experience Tags */}
          <div className="talent-card__experience">
            {talent.experience.slice(0, 3).map((exp) => (
              <span key={exp} className="talent-card__tag talent-tags">
                {exp}
              </span>
            ))}
            {talent.experience.length > 3 && (
              <span className="talent-card__tag talent-tags">
                +{talent.experience.length - 3}
              </span>
            )}
          </div>

          {/* Rating Section */}
          <div className="talent-card__rating">
            <RatingStarsMotion rating={talent.rating} animated={!loading} />
            <span className="rating-text text-body-sm">
              {talent.rating.toFixed(1)} • {talent.reviewCount} reviews
            </span>
          </div>

          {/* Action Buttons */}
          <div className="talent-card__actions">
            <ButtonMotion
              variant="secondary"
              onClick={handleView}
              className="button--secondary"
            >
              View Profile
            </ButtonMotion>
            <ButtonMotion
              variant="primary"
              onClick={handleShortlist}
              className={cn(
                'button--primary',
                localShortlisted && 'button--primary-active'
              )}
            >
              {localShortlisted ? 'Shortlisted' : 'Shortlist'}
            </ButtonMotion>
          </div>

          {/* Screen Reader Information */}
          <div className="sr-only">
            <span>Talent: {talent.name}</span>
            <span>Location: {talent.location}</span>
            <span>Rating: {talent.rating} out of 5 stars</span>
            <span>Experience areas: {talent.experience.join(', ')}</span>
            {talent.verified && <span>Verified talent</span>}
          </div>
        </article>
      </TalentCardMotion>
    )
  }

  // Desktop layout
  return (
    <TalentCardMotion
      id={talent.id}
      isShortlisted={localShortlisted}
      featured={talent.featured}
      className={cn(cardClasses, 'talent-card--desktop')}
    >
      <article className="talent-card talent-card--desktop" role="article" aria-labelledby={`talent-name-${talent.id}`}>
        <AvatarMotion
          src={talent.profileImage || ''}
          alt={talent.name}
          size="large"
          loading={!talent.profileImage}
        />
        
        <div className="talent-card__content">
          <div className="talent-card__info">
            <h3 id={`talent-name-${talent.id}`} className="talent-card__name text-heading-sm">
              {talent.nameHindi && (
                <span className="text-hindi block text-sm text-saffron mb-1">
                  {talent.nameHindi}
                </span>
              )}
              {talent.name}
            </h3>
            <p className="talent-card__details talent-details">
              <MapPin className="w-3 h-3 inline mr-1" aria-hidden="true" />
              {displayAge}{talent.location}
            </p>
          </div>
          
          <div className="talent-card__experience">
            {talent.experience.slice(0, 4).map((exp) => (
              <span key={exp} className="talent-card__tag talent-tags">
                {exp}
              </span>
            ))}
            {talent.experience.length > 4 && (
              <span className="talent-card__tag talent-tags">
                +{talent.experience.length - 4}
              </span>
            )}
          </div>
        </div>
        
        <div className="talent-card__meta">
          <div className="talent-card__rating">
            <RatingStarsMotion rating={talent.rating} animated={!loading} />
            <span className="rating-text text-body-sm">
              {talent.rating.toFixed(1)} • {talent.reviewCount} reviews
            </span>
          </div>
          
          <div className="talent-card__actions">
            <ButtonMotion
              variant="secondary"
              onClick={handleView}
              className="button--secondary"
            >
              View Profile
            </ButtonMotion>
            <ButtonMotion
              variant="primary"
              onClick={handleShortlist}
              className={cn(
                'button--primary',
                localShortlisted && 'button--primary-active'
              )}
            >
              {localShortlisted ? 'Shortlisted' : 'Shortlist'}
            </ButtonMotion>
          </div>
        </div>

        {/* Screen Reader Information */}
        <div className="sr-only">
          <span>Talent: {talent.name}</span>
          <span>Location: {talent.location}</span>
          <span>Rating: {talent.rating} out of 5 stars</span>
          <span>Experience areas: {talent.experience.join(', ')}</span>
          {talent.verified && <span>Verified talent</span>}
        </div>
      </article>
    </TalentCardMotion>
  )
}