'use client';

import TalentCard from '../Shared/TalentCard';

interface TalentGridProps {
  talents: Array<{
    id: string | number;
    name: string;
    experience: string;
    age?: number;
    location?: string;
    rating?: number;
    match?: number;
    image?: string;
    photo?: string;
    specialties?: string[];
    availability?: string;
    rate?: string;
    languages?: string[];
    training?: string;
    recentWork?: string;
    strengths?: string[];
    socialMedia?: string;
  }>;
  onViewPortfolio: (talentId: string) => void;
  onBookAudition: (talentId: string) => void;
}

export default function TalentGrid({ talents, onViewPortfolio, onBookAudition }: TalentGridProps) {
  if (!talents || talents.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900 text-lg">Recommended Talents</h3>
        <p className="text-gray-600 text-sm">
          {talents.length} {talents.length === 1 ? 'match' : 'matches'} found for your search
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {talents.map(talent => (
          <TalentCard
            key={talent.id}
            talent={talent}
            onViewPortfolio={onViewPortfolio}
            onBookAudition={onBookAudition}
          />
        ))}
      </div>
    </div>
  );
}
