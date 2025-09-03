'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Heart, MapPin, Star, Award, Eye, Clock, Languages, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Talent } from '@/lib/api-client'
import { useBookmarkTalent } from '@/hooks/use-talents'
import { cn } from '@/lib/utils'

interface TalentCardProps {
  talent: Talent
  className?: string
  onQuickView?: (talent: Talent) => void
}

export function TalentCard({ talent, className, onQuickView }: TalentCardProps) {
  const [isBookmarked, setIsBookmarked] = useState(false)
  const bookmarkMutation = useBookmarkTalent()

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    try {
      await bookmarkMutation.mutateAsync({
        id: talent.id,
        bookmark: !isBookmarked,
      })
      setIsBookmarked(!isBookmarked)
    } catch (error) {
      console.error('Failed to bookmark talent:', error)
    }
  }

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onQuickView?.(talent)
  }

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available':
        return 'bg-green-500'
      case 'busy':
        return 'bg-yellow-500'
      case 'not_available':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getExperienceBadgeVariant = (experience: string) => {
    switch (experience) {
      case 'expert':
        return 'default'
      case 'intermediate':
        return 'secondary'
      case 'beginner':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className={cn('h-full', className)}
    >
      <Card className="h-full overflow-hidden hover:shadow-lg transition-shadow duration-200">
        <Link href={`/talents/${talent.id}`} className="block">
          <CardContent className="p-0">
            {/* Image Section */}
            <div className="relative aspect-[3/4] bg-gray-100">
              {talent.profileImage ? (
                <Image
                  src={talent.profileImage}
                  alt={talent.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                  <span className="text-white text-4xl font-bold">
                    {getInitials(talent.name)}
                  </span>
                </div>
              )}

              {/* Availability Indicator */}
              <div className="absolute top-2 left-2">
                <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1">
                  <Clock className="w-3 h-3" />
                  <div className={cn('w-2 h-2 rounded-full', getAvailabilityColor(talent.availability))} />
                </div>
              </div>

              {/* Bookmark Button */}
              <button
                onClick={handleBookmark}
                className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors"
                aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
              >
                <Heart
                  className={cn(
                    'w-5 h-5 transition-colors',
                    isBookmarked ? 'fill-red-500 text-red-500' : 'text-gray-600'
                  )}
                />
              </button>

              {/* Verified Badge */}
              {talent.verified && (
                <div className="absolute bottom-2 right-2">
                  <div className="bg-blue-500 text-white rounded-full p-1">
                    <Award className="w-4 h-4" />
                  </div>
                </div>
              )}
            </div>

            {/* Content Section */}
            <div className="p-4 space-y-3">
              {/* Name and Location */}
              <div>
                <h3 className="font-semibold text-lg line-clamp-1 flex items-center gap-2">
                  {talent.name}
                  {talent.verified && (
                    <Award className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  )}
                </h3>
                <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                  <MapPin className="w-3 h-3" />
                  <span>{talent.location}</span>
                </div>
              </div>

              {/* Languages */}
              {talent.languages.length > 0 && (
                <div className="flex items-center gap-2">
                  <Languages className="w-4 h-4 text-gray-500" />
                  <div className="flex flex-wrap gap-1">
                    {talent.languages.slice(0, 3).map((lang) => (
                      <Badge key={lang} variant="secondary" className="text-xs">
                        {lang}
                      </Badge>
                    ))}
                    {talent.languages.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{talent.languages.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Skills */}
              {talent.skills.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {talent.skills.slice(0, 3).map((skill) => (
                    <Badge key={skill} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {talent.skills.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{talent.skills.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              {/* Experience and Rating */}
              <div className="flex items-center justify-between">
                <Badge variant={getExperienceBadgeVariant(talent.experience)}>
                  <Briefcase className="w-3 h-3 mr-1" />
                  {talent.experience}
                </Badge>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{talent.rating.toFixed(1)}</span>
                  <span className="text-xs text-gray-500">({talent.reviewCount})</span>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="p-4 pt-0 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleQuickView}
            >
              <Eye className="w-4 h-4 mr-1" />
              Quick View
            </Button>
            <Button size="sm" className="flex-1" asChild>
              <Link href={`/talents/${talent.id}`}>
                View Profile
              </Link>
            </Button>
          </CardFooter>
        </Link>
      </Card>
    </motion.div>
  )
}