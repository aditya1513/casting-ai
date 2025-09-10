'use client';

import React, { useMemo } from 'react';
import { VirtualList, useVirtualScrolling } from './VirtualList';
import LazyImage from './LazyImage';
import { cn } from '@/lib/utils';

interface TalentProfile {
  id: string;
  name: string;
  photo?: string;
  age?: number;
  location?: string;
  skills: string[];
  experience?: string;
  rating?: number;
  availability?: 'available' | 'busy' | 'booked';
}

interface VirtualTalentListProps {
  talents: TalentProfile[];
  searchTerm?: string;
  containerHeight: number;
  itemHeight?: number;
  onTalentClick?: (talent: TalentProfile) => void;
  className?: string;
}

const TalentCard: React.FC<{ 
  talent: TalentProfile; 
  onClick?: (talent: TalentProfile) => void;
}> = React.memo(({ talent, onClick }) => {
  return (
    <div 
      className={cn(
        'flex items-center space-x-4 p-4 border-b border-gray-100 dark:border-gray-800',
        'hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors',
        'group'
      )}
      onClick={() => onClick?.(talent)}
    >
      {/* Profile Image */}
      <div className="flex-shrink-0">
        <LazyImage
          src={talent.photo || '/defaults/profile-placeholder.jpg'}
          alt={talent.name}
          width={64}
          height={64}
          className="rounded-full"
          fallbackSrc="/defaults/profile-placeholder.jpg"
        />
      </div>

      {/* Talent Information */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {talent.name}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              {talent.age && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {talent.age} years
                </span>
              )}
              {talent.location && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  • {talent.location}
                </span>
              )}
            </div>
          </div>
          
          {/* Availability Status */}
          {talent.availability && (
            <div className={cn(
              'px-2 py-1 rounded-full text-xs font-medium',
              talent.availability === 'available' && 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
              talent.availability === 'busy' && 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
              talent.availability === 'booked' && 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            )}>
              {talent.availability}
            </div>
          )}
        </div>

        {/* Skills */}
        <div className="mt-2">
          <div className="flex flex-wrap gap-1">
            {talent.skills.slice(0, 3).map((skill, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
              >
                {skill}
              </span>
            ))}
            {talent.skills.length > 3 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                +{talent.skills.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Experience & Rating */}
        <div className="flex items-center justify-between mt-2">
          {talent.experience && (
            <span className="text-xs text-gray-600 dark:text-gray-300">
              {talent.experience}
            </span>
          )}
          
          {talent.rating && (
            <div className="flex items-center space-x-1">
              <span className="text-yellow-400">★</span>
              <span className="text-xs text-gray-600 dark:text-gray-300">
                {talent.rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

TalentCard.displayName = 'TalentCard';

export const VirtualTalentList: React.FC<VirtualTalentListProps> = ({
  talents,
  searchTerm = '',
  containerHeight,
  itemHeight = 120,
  onTalentClick,
  className
}) => {
  // Search and filter logic
  const searchFn = useMemo(() => (talent: TalentProfile, term: string) => {
    const searchLower = term.toLowerCase();
    return (
      talent.name.toLowerCase().includes(searchLower) ||
      talent.location?.toLowerCase().includes(searchLower) ||
      talent.skills.some(skill => skill.toLowerCase().includes(searchLower)) ||
      talent.experience?.toLowerCase().includes(searchLower)
    );
  }, []);

  const { filteredItems } = useVirtualScrolling(
    talents,
    searchTerm,
    undefined,
    searchFn
  );

  const renderTalentItem = useMemo(() => 
    (talent: TalentProfile, index: number) => (
      <TalentCard 
        key={talent.id}
        talent={talent} 
        onClick={onTalentClick}
      />
    ), [onTalentClick]
  );

  return (
    <div className={cn('bg-white dark:bg-gray-900 rounded-lg shadow', className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Talent ({filteredItems.length})
        </h2>
        {searchTerm && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Showing results for "{searchTerm}"
          </p>
        )}
      </div>

      {/* Virtual List */}
      <VirtualList
        items={filteredItems}
        itemHeight={itemHeight}
        containerHeight={containerHeight}
        renderItem={renderTalentItem}
        getItemId={(talent) => talent.id}
        className="overflow-hidden"
        overscan={3}
      />

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-gray-400 dark:text-gray-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">No talent found</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {searchTerm ? 'Try adjusting your search criteria' : 'No talent profiles available'}
          </p>
        </div>
      )}
    </div>
  );
};

export default VirtualTalentList;