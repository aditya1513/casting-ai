'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  Heart, 
  Share2, 
  Phone, 
  MessageSquare, 
  Calendar,
  MapPin,
  Star,
  Eye,
  Clock,
  Users,
  Film,
  Award,
  ChevronRight,
  Bookmark,
  BookmarkCheck
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface TalentProfile {
  id: string;
  name: string;
  stageName?: string;
  avatar: string;
  age: number;
  location: string;
  experience: string;
  skills: string[];
  languages: string[];
  category: 'actor' | 'actress' | 'dancer' | 'singer' | 'model';
  rating: number;
  profileViews: number;
  projects: number;
  availability: 'available' | 'busy' | 'booked';
  lastActive: string;
  portfolio?: {
    photos: string[];
    videos: string[];
    reels: string[];
  };
  featured?: boolean;
  verified?: boolean;
}

interface MobileTalentCardProps {
  talent: TalentProfile;
  onViewProfile?: (id: string) => void;
  onContact?: (id: string) => void;
  onScheduleAudition?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onShare?: (id: string) => void;
  isFavorited?: boolean;
  className?: string;
  variant?: 'compact' | 'detailed' | 'swipeable';
}

export const MobileTalentCard: React.FC<MobileTalentCardProps> = ({
  talent,
  onViewProfile,
  onContact,
  onScheduleAudition,
  onToggleFavorite,
  onShare,
  isFavorited = false,
  className,
  variant = 'detailed',
}) => {
  const [isSwipeRevealed, setIsSwipeRevealed] = useState(false);
  const [localFavorited, setLocalFavorited] = useState(isFavorited);
  const cardRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [touchEnd, setTouchEnd] = useState({ x: 0, y: 0 });

  const handlePanEnd = (event: any, info: PanInfo) => {
    const swipeThreshold = 100;
    const swipeVelocityThreshold = 500;
    
    if (Math.abs(info.offset.x) > swipeThreshold || Math.abs(info.velocity.x) > swipeVelocityThreshold) {
      if (info.offset.x > 0) {
        // Swiped right - favorite
        handleToggleFavorite();
      } else {
        // Swiped left - quick actions
        setIsSwipeRevealed(!isSwipeRevealed);
      }
    }
  };

  const handleToggleFavorite = () => {
    setLocalFavorited(!localFavorited);
    onToggleFavorite?.(talent.id);
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available':
        return 'bg-green-500';
      case 'busy':
        return 'bg-yellow-500';
      case 'booked':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'actor':
      case 'actress':
        return Film;
      case 'dancer':
        return Users;
      case 'singer':
        return Award;
      case 'model':
        return Star;
      default:
        return Film;
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Compact variant for list views
  if (variant === 'compact') {
    return (
      <motion.div
        className={cn('w-full', className)}
        whileTap={{ scale: 0.98 }}
        onClick={() => onViewProfile?.(talent.id)}
      >
        <Card className="mobile-card border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={talent.avatar} alt={talent.name} />
                  <AvatarFallback>{talent.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div 
                  className={cn(
                    'absolute -bottom-1 -right-1 w-4 h-4 border-2 border-background rounded-full',
                    getAvailabilityColor(talent.availability)
                  )}
                />
                {talent.verified && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <Award className="h-2 w-2 text-white" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm truncate">{talent.stageName || talent.name}</h3>
                  {talent.featured && (
                    <Badge variant="secondary" className="text-xs">Featured</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{talent.location}</span>
                  <span>•</span>
                  <span>{talent.experience}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs font-medium">{talent.rating}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{formatNumber(talent.profileViews)} views</span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite();
                  }}
                >
                  {localFavorited ? (
                    <BookmarkCheck className="h-4 w-4 text-red-500" />
                  ) : (
                    <Bookmark className="h-4 w-4" />
                  )}
                </Button>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Swipeable variant for discovery feeds
  if (variant === 'swipeable') {
    return (
      <motion.div
        ref={cardRef}
        className={cn('relative w-full', className)}
        drag="x"
        dragConstraints={{ left: -300, right: 300 }}
        dragElastic={0.1}
        onPanEnd={handlePanEnd}
        whileDrag={{ rotate: 5, scale: 1.02 }}
      >
        {/* Swipe indicators */}
        <div className="absolute inset-0 flex items-center justify-between px-8 pointer-events-none z-10">
          <motion.div
            className="bg-green-500 text-white p-3 rounded-full"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0, scale: 0 }}
          >
            <Heart className="h-6 w-6" />
          </motion.div>
          <motion.div
            className="bg-blue-500 text-white p-3 rounded-full"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0, scale: 0 }}
          >
            <MessageSquare className="h-6 w-6" />
          </motion.div>
        </div>

        <Card className="mobile-card overflow-hidden">
          <div 
            className="relative h-64 bg-cover bg-center"
            style={{ backgroundImage: `url(${talent.avatar})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            
            {/* Overlay badges */}
            <div className="absolute top-3 left-3 flex gap-2">
              {talent.featured && (
                <Badge className="bg-yellow-500 text-black">Featured</Badge>
              )}
              {talent.verified && (
                <Badge className="bg-blue-500">Verified</Badge>
              )}
            </div>

            <div className="absolute top-3 right-3">
              <div className={cn(
                'w-3 h-3 rounded-full border-2 border-white',
                getAvailabilityColor(talent.availability)
              )} />
            </div>

            {/* Bottom overlay info */}
            <div className="absolute bottom-3 left-3 right-3 text-white">
              <h3 className="font-bold text-lg">{talent.stageName || talent.name}</h3>
              <div className="flex items-center gap-2 text-sm opacity-90">
                <MapPin className="h-4 w-4" />
                <span>{talent.location}</span>
                <span>•</span>
                <span>{talent.age} years</span>
              </div>
            </div>
          </div>

          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{talent.rating}</span>
                <span className="text-sm text-muted-foreground">({talent.projects} projects)</span>
              </div>
              <Badge variant="outline" className="capitalize">
                {talent.category}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-1 mb-3">
              {talent.skills.slice(0, 3).map((skill) => (
                <Badge key={skill} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {talent.skills.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{talent.skills.length - 3}
                </Badge>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onViewProfile?.(talent.id)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={() => onContact?.(talent.id)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Contact
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Detailed variant (default)
  return (
    <motion.div
      className={cn('w-full', className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card className="mobile-card overflow-hidden">
        <div className="relative">
          {/* Header with avatar and basic info */}
          <div className="p-4 pb-0">
            <div className="flex items-start gap-3">
              <div className="relative">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={talent.avatar} alt={talent.name} />
                  <AvatarFallback>{talent.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div 
                  className={cn(
                    'absolute -bottom-1 -right-1 w-5 h-5 border-2 border-background rounded-full',
                    getAvailabilityColor(talent.availability)
                  )}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg truncate">{talent.stageName || talent.name}</h3>
                  {talent.verified && (
                    <Award className="h-4 w-4 text-blue-500" />
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <MapPin className="h-4 w-4" />
                  <span>{talent.location}</span>
                  <span>•</span>
                  <span>{talent.age} years</span>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{talent.rating}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    <span>{formatNumber(talent.profileViews)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Film className="h-4 w-4" />
                    <span>{talent.projects}</span>
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleToggleFavorite}
              >
                {localFavorited ? (
                  <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                ) : (
                  <Heart className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Status and badges */}
          <div className="px-4 py-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="capitalize">
                {talent.category}
              </Badge>
              <Badge variant="secondary" className="capitalize">
                {talent.availability}
              </Badge>
              {talent.featured && (
                <Badge className="bg-yellow-500 text-black">Featured</Badge>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                <Clock className="h-3 w-3" />
                <span>Active {talent.lastActive}</span>
              </div>
            </div>
          </div>

          {/* Skills and languages */}
          <div className="px-4 pb-2">
            <div className="space-y-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Skills</p>
                <div className="flex flex-wrap gap-1">
                  {talent.skills.slice(0, 4).map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {talent.skills.length > 4 && (
                    <Badge variant="secondary" className="text-xs">
                      +{talent.skills.length - 4} more
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Languages</p>
                <div className="flex flex-wrap gap-1">
                  {talent.languages.map((language) => (
                    <Badge key={language} variant="outline" className="text-xs">
                      {language}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="p-4 pt-2 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewProfile?.(talent.id)}
                className="justify-center"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Profile
              </Button>
              <Button
                size="sm"
                onClick={() => onContact?.(talent.id)}
                className="justify-center"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Contact
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onScheduleAudition?.(talent.id)}
                className="justify-center"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Schedule
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onShare?.(talent.id)}
                className="justify-center"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

// Loading skeleton for mobile talent cards
export const MobileTalentCardSkeleton: React.FC<{ variant?: 'compact' | 'detailed' | 'swipeable' }> = ({
  variant = 'detailed'
}) => {
  if (variant === 'compact') {
    return (
      <Card className="mobile-card">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="mobile-skeleton w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="mobile-skeleton h-4 w-32" />
              <div className="mobile-skeleton h-3 w-24" />
            </div>
            <div className="mobile-skeleton w-8 h-8 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mobile-card">
      <div className="p-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="mobile-skeleton w-16 h-16 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="mobile-skeleton h-5 w-32" />
            <div className="mobile-skeleton h-4 w-24" />
            <div className="mobile-skeleton h-4 w-40" />
          </div>
          <div className="mobile-skeleton w-8 h-8 rounded" />
        </div>
        
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="mobile-skeleton h-6 w-16 rounded-full" />
            <div className="mobile-skeleton h-6 w-20 rounded-full" />
            <div className="mobile-skeleton h-6 w-18 rounded-full" />
          </div>
          <div className="flex gap-2">
            <div className="mobile-skeleton h-6 w-14 rounded-full" />
            <div className="mobile-skeleton h-6 w-16 rounded-full" />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="mobile-skeleton h-9 rounded" />
          <div className="mobile-skeleton h-9 rounded" />
        </div>
      </div>
    </Card>
  );
};