'use client';

import { useState } from 'react';
import {
  Card,
  CardBody,
  Button,
  Chip,
  Avatar,
  Pagination,
  Spinner,
  Tooltip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from '@heroui/react';
import {
  HeartIcon,
  StarIcon,
  MapPinIcon,
  ClockIcon,
  EyeIcon,
  ShareIcon,
  EllipsisVerticalIcon,
  BookmarkIcon as BookmarkIconSolid,
} from '@heroicons/react/24/solid';
import {
  HeartIcon as HeartIconOutline,
  BookmarkIcon,
  ChatBubbleLeftIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';

export interface TalentProfile {
  id: string;
  firstName: string;
  lastName: string;
  stageName?: string;
  profileImage?: string;
  gender: string;
  age: number;
  location: string;
  languages: string[];
  skills: string[];
  experience: string;
  rating: number;
  reviewsCount: number;
  isVerified: boolean;
  isBookmarked: boolean;
  lastActive: string;
  viewsCount: number;
  availability: string;
  budget?: {
    min: number;
    max: number;
  };
  physicalAttributes?: {
    height: number;
    eyeColor: string;
    hairColor: string;
    bodyType: string;
    ethnicity: string;
  };
  portfolio?: {
    headshots: string[];
    reels: string[];
  };
  bio?: string;
}

interface SearchResultsProps {
  results: TalentProfile[];
  total: number;
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onBookmark: (talentId: string) => void;
  onContact: (talent: TalentProfile) => void;
  onViewProfile: (talent: TalentProfile) => void;
  onShare: (talent: TalentProfile) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export default function SearchResults({
  results,
  total,
  currentPage,
  totalPages,
  isLoading,
  onPageChange,
  onBookmark,
  onContact,
  onViewProfile,
  onShare,
  viewMode,
  onViewModeChange,
}: SearchResultsProps) {
  const [bookmarkedItems, setBookmarkedItems] = useState<Set<string>>(new Set());

  const handleBookmark = (talentId: string) => {
    setBookmarkedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(talentId)) {
        newSet.delete(talentId);
      } else {
        newSet.add(talentId);
      }
      return newSet;
    });
    onBookmark(talentId);
  };

  const formatLastActive = (lastActive: string) => {
    const date = new Date(lastActive);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Active now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return `${Math.floor(diffInHours / 168)}w ago`;
  };

  const getDisplayName = (talent: TalentProfile) => {
    return talent.stageName || `${talent.firstName} ${talent.lastName}`;
  };

  const TalentCard = ({ talent }: { talent: TalentProfile }) => (
    <Card key={talent.id} className="group hover:shadow-lg transition-shadow duration-200">
      <CardBody className="p-0">
        {/* Header with Image and Basic Info */}
        <div className="relative">
          <div className="flex items-start p-4 gap-4">
            <div className="relative">
              <Avatar
                src={talent.profileImage}
                name={getDisplayName(talent)}
                size="lg"
                className="ring-2 ring-teal-100"
              />
              {talent.isVerified && (
                <div className="absolute -bottom-1 -right-1 bg-teal-500 rounded-full p-1">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-gray-900 truncate">{getDisplayName(talent)}</h3>
                <Dropdown>
                  <DropdownTrigger>
                    <Button
                      isIconOnly
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <EllipsisVerticalIcon className="h-4 w-4" />
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu>
                    <DropdownItem onPress={() => onViewProfile(talent)}>
                      View Full Profile
                    </DropdownItem>
                    <DropdownItem onPress={() => onShare(talent)}>Share Profile</DropdownItem>
                    <DropdownItem onPress={() => handleBookmark(talent.id)}>
                      {bookmarkedItems.has(talent.id) ? 'Remove Bookmark' : 'Bookmark'}
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center">
                  <StarIcon className="h-4 w-4 text-yellow-400 mr-1" />
                  <span className="text-sm font-medium">{talent.rating.toFixed(1)}</span>
                  <span className="text-xs text-gray-500 ml-1">({talent.reviewsCount})</span>
                </div>
                <span className="text-gray-300">•</span>
                <div className="flex items-center text-sm text-gray-600">
                  <MapPinIcon className="h-4 w-4 mr-1" />
                  {talent.location}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                <span>
                  {talent.gender} • {talent.age} years
                </span>
                <span>•</span>
                <span>{talent.experience}</span>
                <span>•</span>
                <div className="flex items-center">
                  <ClockIcon className="h-3 w-3 mr-1" />
                  {formatLastActive(talent.lastActive)}
                </div>
              </div>

              {/* Skills and Languages */}
              <div className="flex flex-wrap gap-1 mb-3">
                {talent.skills.slice(0, 3).map(skill => (
                  <Chip key={skill} size="sm" variant="flat" color="primary">
                    {skill}
                  </Chip>
                ))}
                {talent.skills.length > 3 && (
                  <Chip size="sm" variant="flat">
                    +{talent.skills.length - 3} more
                  </Chip>
                )}
              </div>

              <div className="flex flex-wrap gap-1 mb-4">
                {talent.languages.slice(0, 4).map(language => (
                  <Chip key={language} size="sm" variant="bordered">
                    {language}
                  </Chip>
                ))}
                {talent.languages.length > 4 && (
                  <Chip size="sm" variant="bordered">
                    +{talent.languages.length - 4}
                  </Chip>
                )}
              </div>

              {/* Bio preview */}
              {talent.bio && (
                <p className="text-sm text-gray-600 line-clamp-2 mb-4">{talent.bio}</p>
              )}

              {/* Budget */}
              {talent.budget && (
                <div className="mb-4">
                  <span className="text-sm text-gray-600">Budget: </span>
                  <span className="text-sm font-medium text-green-600">
                    ₹{talent.budget.min.toLocaleString()} - ₹{talent.budget.max.toLocaleString()}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    color="primary"
                    onPress={() => onContact(talent)}
                    startContent={<ChatBubbleLeftIcon className="h-4 w-4" />}
                  >
                    Contact
                  </Button>
                  <Button
                    size="sm"
                    variant="bordered"
                    onPress={() => onViewProfile(talent)}
                    startContent={<EyeIcon className="h-4 w-4" />}
                  >
                    View Profile
                  </Button>
                </div>

                <div className="flex items-center gap-1">
                  <Tooltip content="Bookmark">
                    <Button
                      isIconOnly
                      variant="ghost"
                      size="sm"
                      onPress={() => handleBookmark(talent.id)}
                    >
                      {bookmarkedItems.has(talent.id) ? (
                        <BookmarkIconSolid className="h-4 w-4 text-teal-500" />
                      ) : (
                        <BookmarkIcon className="h-4 w-4" />
                      )}
                    </Button>
                  </Tooltip>
                  <Tooltip content="Share">
                    <Button isIconOnly variant="ghost" size="sm" onPress={() => onShare(talent)}>
                      <ShareIcon className="h-4 w-4" />
                    </Button>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>

          {/* Availability Status */}
          <div className="absolute top-2 right-2">
            <Chip
              size="sm"
              color={talent.availability === 'immediate' ? 'success' : 'warning'}
              variant="flat"
            >
              {talent.availability}
            </Chip>
          </div>
        </div>
      </CardBody>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="lg" color="primary" />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <Card>
        <CardBody className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No talents found</h3>
          <p className="text-gray-600">Try adjusting your search criteria or filters.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {total.toLocaleString()} talent{total !== 1 ? 's' : ''} found
          </h3>
          <p className="text-sm text-gray-600">
            Showing {(currentPage - 1) * 20 + 1} - {Math.min(currentPage * 20, total)} of{' '}
            {total.toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={viewMode === 'list' ? 'flat' : 'ghost'}
            onPress={() => onViewModeChange('list')}
          >
            List
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'grid' ? 'flat' : 'ghost'}
            onPress={() => onViewModeChange('grid')}
          >
            Grid
          </Button>
        </div>
      </div>

      {/* Results Grid/List */}
      <div
        className={
          viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' : 'space-y-4'
        }
      >
        {results.map(talent => (
          <TalentCard key={talent.id} talent={talent} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            total={totalPages}
            page={currentPage}
            onChange={onPageChange}
            showControls
            showShadow
            color="primary"
          />
        </div>
      )}
    </div>
  );
}
