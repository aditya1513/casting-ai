'use client';

import React from 'react';
import { Card } from '../molecules/Card';
import { Badge, SkillBadge, StatusBadge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { cn } from '@/lib/utils';

/**
 * TalentCard Component
 * Specialized card for displaying talent/actor information
 */

export interface TalentCardProps {
  talent: {
    id: string;
    name: string;
    avatar?: string;
    role: string;
    location: string;
    experience: string;
    rating?: number;
    skills: Array<{ name: string; level?: 'beginner' | 'intermediate' | 'advanced' | 'expert' }>;
    languages?: string[];
    availability?: 'available' | 'busy' | 'unavailable';
    verified?: boolean;
    premium?: boolean;
    recentWork?: Array<{ title: string; role: string; year: number }>;
    stats?: {
      projects: number;
      successRate: number;
      responseTime: string;
    };
    price?: {
      amount: string;
      period: 'per day' | 'per project' | 'negotiable';
    };
  };
  variant?: 'default' | 'compact' | 'detailed';
  onView?: () => void;
  onContact?: () => void;
  onSave?: () => void;
  saved?: boolean;
}

const TalentCard: React.FC<TalentCardProps> = ({
  talent,
  variant = 'default',
  onView,
  onContact,
  onSave,
  saved = false,
}) => {
  const renderRating = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={cn(
              'w-4 h-4',
              star <= rating
                ? 'text-warning-500 fill-current'
                : 'text-neutral-300 dark:text-neutral-700'
            )}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <span className="ml-1 text-sm text-neutral-600 dark:text-neutral-400">
          {rating.toFixed(1)}
        </span>
      </div>
    );
  };

  // Compact variant
  if (variant === 'compact') {
    return (
      <Card
        variant={talent.premium ? 'premium' : 'talent'}
        padding="sm"
        interactive
        onClick={onView}
        className="group"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={talent.avatar || '/placeholder-avatar.jpg'}
              alt={talent.name}
              className="w-12 h-12 rounded-full object-cover"
            />
            {talent.verified && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-50 truncate">
                {talent.name}
              </h3>
              {talent.premium && <Badge variant="premium" size="sm">Premium</Badge>}
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {talent.role} • {talent.location}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {talent.rating && renderRating(talent.rating)}
            <Button size="sm" variant="ghost" onClick={(e) => {
              e.stopPropagation();
              onContact?.();
            }}>
              Contact
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Default and Detailed variants
  return (
    <Card
      variant={talent.premium ? 'premium' : 'talent'}
      padding="none"
      className="group overflow-hidden"
    >
      {/* Header with avatar and basic info */}
      <div className="p-4">
        <div className="flex items-start gap-4">
          <div className="relative">
            <img
              src={talent.avatar || '/placeholder-avatar.jpg'}
              alt={talent.name}
              className="w-20 h-20 rounded-xl object-cover"
            />
            {talent.verified && (
              <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-brand-500 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                    {talent.name}
                  </h3>
                  {talent.premium && <Badge variant="premium" size="sm">Premium</Badge>}
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {talent.role}
                </p>
                <div className="flex items-center gap-3 mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {talent.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {talent.experience}
                  </span>
                </div>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSave?.();
                }}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  saved
                    ? 'text-brand-500 bg-brand-50 dark:bg-brand-500/10'
                    : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
                )}
              >
                <svg className="w-5 h-5" fill={saved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            </div>
            
            {talent.rating && (
              <div className="mt-2">
                {renderRating(talent.rating)}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Skills section */}
      <div className="px-4 pb-3">
        <div className="flex flex-wrap gap-1.5">
          {talent.skills.slice(0, 5).map((skill, index) => (
            <SkillBadge key={index} skill={skill.name} level={skill.level} size="sm" />
          ))}
          {talent.skills.length > 5 && (
            <Badge variant="outline" size="sm">
              +{talent.skills.length - 5} more
            </Badge>
          )}
        </div>
      </div>
      
      {/* Stats section */}
      {talent.stats && (
        <div className="px-4 pb-3 flex items-center gap-4 text-sm">
          <div>
            <span className="text-neutral-500 dark:text-neutral-400">Projects:</span>
            <span className="ml-1 font-medium text-neutral-900 dark:text-neutral-50">
              {talent.stats.projects}
            </span>
          </div>
          <div>
            <span className="text-neutral-500 dark:text-neutral-400">Success:</span>
            <span className="ml-1 font-medium text-success-600 dark:text-success-400">
              {talent.stats.successRate}%
            </span>
          </div>
          <div>
            <span className="text-neutral-500 dark:text-neutral-400">Response:</span>
            <span className="ml-1 font-medium text-neutral-900 dark:text-neutral-50">
              {talent.stats.responseTime}
            </span>
          </div>
        </div>
      )}
      
      {/* Recent work (for detailed variant) */}
      {variant === 'detailed' && talent.recentWork && talent.recentWork.length > 0 && (
        <div className="px-4 pb-3">
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Recent Work
          </p>
          <div className="space-y-1">
            {talent.recentWork.slice(0, 3).map((work, index) => (
              <div key={index} className="text-sm">
                <span className="font-medium text-neutral-900 dark:text-neutral-50">
                  {work.title}
                </span>
                <span className="text-neutral-500 dark:text-neutral-400">
                  {' '}as {work.role} ({work.year})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Price and availability */}
      <div className="px-4 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {talent.availability && (
            <StatusBadge 
              status={
                talent.availability === 'available' ? 'online' :
                talent.availability === 'busy' ? 'away' : 'offline'
              }
              size="sm"
            />
          )}
          {talent.price && (
            <div className="text-sm">
              <span className="font-semibold text-neutral-900 dark:text-neutral-50">
                {talent.price.amount}
              </span>
              <span className="text-neutral-500 dark:text-neutral-400">
                {' '}{talent.price.period}
              </span>
            </div>
          )}
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onView}>
            View Profile
          </Button>
          <Button size="sm" variant="primary" onClick={onContact}>
            Contact
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default TalentCard;