'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import AdvancedSearchFilters, { SearchFilters } from './AdvancedSearchFilters';
import SearchResults, { TalentProfile } from './SearchResults';
import { trpc } from '../../../../lib/trpc';

const defaultFilters: SearchFilters = {
  searchTerm: '',
  ageRange: [18, 65],
  gender: 'any',
  location: '',
  languages: [],
  skills: [],
  experienceLevel: 'any',
  availability: 'any',
  minRating: 0,
  verified: false,
  physicalAttributes: {
    height: [150, 200],
    eyeColor: 'Any',
    hairColor: 'Any',
    bodyType: 'Any',
    ethnicity: 'Any',
  },
  budget: [0, 1000000],
  sortBy: 'relevance',
  sortOrder: 'desc',
};

interface TalentSearchProps {
  onContactTalent?: (talent: TalentProfile) => void;
  onViewTalentProfile?: (talent: TalentProfile) => void;
}

export default function TalentSearch({ onContactTalent, onViewTalentProfile }: TalentSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchResults, setSearchResults] = useState<{
    talents: TalentProfile[];
    total: number;
    totalPages: number;
  }>({
    talents: [],
    total: 0,
    totalPages: 0,
  });

  // Mock data for development - replace with actual tRPC call
  const generateMockTalents = (count: number): TalentProfile[] => {
    const mockTalents: TalentProfile[] = [];
    const firstNames = [
      'Aarav',
      'Vivaan',
      'Aditya',
      'Vihaan',
      'Arjun',
      'Sai',
      'Reyansh',
      'Ayaan',
      'Krishna',
      'Ishaan',
      'Aadhya',
      'Aanya',
      'Ananya',
      'Diya',
      'Ira',
      'Kavya',
      'Kiara',
      'Myra',
      'Navya',
      'Saanvi',
    ];
    const lastNames = [
      'Sharma',
      'Verma',
      'Agarwal',
      'Gupta',
      'Singh',
      'Kumar',
      'Jain',
      'Bansal',
      'Agrawal',
      'Goyal',
      'Mittal',
      'Joshi',
      'Tiwari',
      'Mishra',
      'Yadav',
    ];
    const locations = [
      'Mumbai',
      'Delhi',
      'Bangalore',
      'Hyderabad',
      'Chennai',
      'Kolkata',
      'Pune',
      'Jaipur',
      'Lucknow',
      'Kanpur',
    ];
    const skills = [
      'Method Acting',
      'Classical Acting',
      'Improv',
      'Voice Acting',
      'Theatre',
      'Commercial Acting',
      'Comedy',
      'Drama',
      'Action',
      'Dance',
      'Singing',
      'Musical Theatre',
    ];
    const languages = [
      'Hindi',
      'English',
      'Marathi',
      'Bengali',
      'Telugu',
      'Tamil',
      'Gujarati',
      'Kannada',
    ];

    for (let i = 0; i < count; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const age = Math.floor(Math.random() * (50 - 18)) + 18;

      mockTalents.push({
        id: `talent-${i + 1}`,
        firstName,
        lastName,
        stageName: Math.random() > 0.6 ? `${firstName} ${lastName}` : undefined,
        profileImage: `https://api.dicebear.com/7.x/avataaars/svg?seed=${firstName}${lastName}`,
        gender: Math.random() > 0.5 ? 'Male' : 'Female',
        age,
        location: locations[Math.floor(Math.random() * locations.length)],
        languages: languages.slice(0, Math.floor(Math.random() * 4) + 2),
        skills: skills.slice(0, Math.floor(Math.random() * 5) + 2),
        experience: age < 25 ? 'Fresher' : age < 35 ? 'Intermediate' : 'Experienced',
        rating: Math.round((Math.random() * 2 + 3) * 10) / 10,
        reviewsCount: Math.floor(Math.random() * 100) + 5,
        isVerified: Math.random() > 0.3,
        isBookmarked: false,
        lastActive: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        viewsCount: Math.floor(Math.random() * 1000) + 10,
        availability: ['immediate', 'within_week', 'within_month', 'flexible'][
          Math.floor(Math.random() * 4)
        ],
        budget: {
          min: Math.floor(Math.random() * 50000) + 10000,
          max: Math.floor(Math.random() * 200000) + 100000,
        },
        physicalAttributes: {
          height: Math.floor(Math.random() * 50) + 150,
          eyeColor: ['Brown', 'Black', 'Hazel'][Math.floor(Math.random() * 3)],
          hairColor: ['Black', 'Brown', 'Blonde'][Math.floor(Math.random() * 3)],
          bodyType: ['Slim', 'Athletic', 'Average'][Math.floor(Math.random() * 3)],
          ethnicity: ['North Indian', 'South Indian', 'Punjabi'][Math.floor(Math.random() * 3)],
        },
        bio: `Passionate ${skills[Math.floor(Math.random() * skills.length)].toLowerCase()} artist with ${age - 18} years of experience in the entertainment industry. Looking for challenging roles that showcase versatility and talent.`,
      });
    }
    return mockTalents;
  };

  // Mock search function - replace with actual tRPC call
  const performSearch = useCallback(async () => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));

      // Generate mock results based on filters
      let allTalents = generateMockTalents(150);

      // Apply filters
      let filteredTalents = allTalents.filter(talent => {
        // Search term filter
        if (filters.searchTerm) {
          const searchLower = filters.searchTerm.toLowerCase();
          const nameMatch = `${talent.firstName} ${talent.lastName}`
            .toLowerCase()
            .includes(searchLower);
          const stageNameMatch = talent.stageName?.toLowerCase().includes(searchLower);
          const skillsMatch = talent.skills.some(skill =>
            skill.toLowerCase().includes(searchLower)
          );
          if (!nameMatch && !stageNameMatch && !skillsMatch) return false;
        }

        // Gender filter
        if (
          filters.gender !== 'any' &&
          talent.gender.toLowerCase() !== filters.gender.toLowerCase()
        )
          return false;

        // Location filter
        if (
          filters.location &&
          !talent.location.toLowerCase().includes(filters.location.toLowerCase())
        )
          return false;

        // Age range filter
        if (talent.age < filters.ageRange[0] || talent.age > filters.ageRange[1]) return false;

        // Languages filter
        if (filters.languages.length > 0) {
          const hasLanguage = filters.languages.some(lang => talent.languages.includes(lang));
          if (!hasLanguage) return false;
        }

        // Skills filter
        if (filters.skills.length > 0) {
          const hasSkill = filters.skills.some(skill => talent.skills.includes(skill));
          if (!hasSkill) return false;
        }

        // Experience level filter
        if (
          filters.experienceLevel !== 'any' &&
          talent.experience.toLowerCase() !== filters.experienceLevel.toLowerCase()
        )
          return false;

        // Rating filter
        if (talent.rating < filters.minRating) return false;

        // Verified filter
        if (filters.verified && !talent.isVerified) return false;

        return true;
      });

      // Apply sorting
      filteredTalents.sort((a, b) => {
        const order = filters.sortOrder === 'asc' ? 1 : -1;
        switch (filters.sortBy) {
          case 'rating':
            return (a.rating - b.rating) * order;
          case 'experience':
            const expOrder = { Fresher: 1, Intermediate: 2, Experienced: 3 };
            return (
              (expOrder[a.experience as keyof typeof expOrder] -
                expOrder[b.experience as keyof typeof expOrder]) *
              order
            );
          case 'recently_active':
            return (new Date(a.lastActive).getTime() - new Date(b.lastActive).getTime()) * order;
          case 'created_at':
            return (parseInt(a.id.split('-')[1]) - parseInt(b.id.split('-')[1])) * order;
          default:
            return 0;
        }
      });

      // Pagination
      const pageSize = 20;
      const total = filteredTalents.length;
      const totalPages = Math.ceil(total / pageSize);
      const startIndex = (currentPage - 1) * pageSize;
      const paginatedTalents = filteredTalents.slice(startIndex, startIndex + pageSize);

      setSearchResults({
        talents: paginatedTalents,
        total,
        totalPages,
      });
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search talents. Please try again.');
    }
  }, [filters, currentPage]);

  // Initial search
  useEffect(() => {
    performSearch();
  }, [performSearch]);

  const handleFiltersChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleClearFilters = () => {
    setFilters(defaultFilters);
    setCurrentPage(1);
  };

  const handleBookmark = async (talentId: string) => {
    try {
      // Mock bookmark toggle - replace with actual tRPC call
      toast.success('Bookmark updated successfully');
    } catch (error) {
      console.error('Bookmark error:', error);
      toast.error('Failed to update bookmark');
    }
  };

  const handleContactTalent = (talent: TalentProfile) => {
    if (onContactTalent) {
      onContactTalent(talent);
    } else {
      toast.info(
        `Contact functionality for ${talent.firstName} ${talent.lastName} - Integration pending`
      );
    }
  };

  const handleViewProfile = (talent: TalentProfile) => {
    if (onViewTalentProfile) {
      onViewTalentProfile(talent);
    } else {
      toast.info(`View profile for ${talent.firstName} ${talent.lastName} - Integration pending`);
    }
  };

  const handleShare = (talent: TalentProfile) => {
    if (navigator.share) {
      navigator.share({
        title: `${talent.firstName} ${talent.lastName} - CastMatch`,
        text: `Check out ${talent.firstName}'s profile on CastMatch`,
        url: `${window.location.origin}/talents/${talent.id}`,
      });
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/talents/${talent.id}`);
      toast.success('Profile link copied to clipboard');
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Filters */}
      <AdvancedSearchFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onSearch={performSearch}
        onClearFilters={handleClearFilters}
        isLoading={false}
      />

      {/* Search Results */}
      <SearchResults
        results={searchResults.talents}
        total={searchResults.total}
        currentPage={currentPage}
        totalPages={searchResults.totalPages}
        isLoading={false}
        onPageChange={setCurrentPage}
        onBookmark={handleBookmark}
        onContact={handleContactTalent}
        onViewProfile={handleViewProfile}
        onShare={handleShare}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
    </div>
  );
}
