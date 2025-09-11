/**
 * Talent Listing Page - Browse and search available talent
 * Connected to real backend talent APIs
 */

import type { LoaderFunctionArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useLoaderData, useSearchParams, Form } from '@remix-run/react';
import { getAuth } from '@clerk/remix/ssr.server';
import { UserButton } from '@clerk/remix';
import { createServerTRPCClient } from '~/lib/trpc';
import { useState } from 'react';
import { Search, Filter, MapPin, Star, Users, Film, ChevronRight } from 'lucide-react';

export async function loader({ request }: LoaderFunctionArgs) {
  // Check authentication with Clerk
  const { userId } = await getAuth({ request });
  
  if (!userId) {
    return redirect('/sign-in?redirect_url=' + encodeURIComponent('/talents'));
  }

  const url = new URL(request.url);
  const searchQuery = url.searchParams.get('search') || '';
  const location = url.searchParams.get('location') || '';
  const skills = url.searchParams.get('skills') || '';
  const limit = Number(url.searchParams.get('limit')) || 20;

  const trpc = createServerTRPCClient();
  
  try {
    // Fetch talents with search parameters
    const talents = await trpc.talents.list.query({
      limit,
      search: searchQuery,
      location,
      skills: skills ? skills.split(',') : undefined
    });

    // Get talent statistics
    const talentStats = await trpc.dashboard.getStats.query();

    return json({
      user: { 
        id: userId,
        name: 'Casting Director',
        role: 'casting_director' 
      },
      talents: talents.data || [],
      talentStats: talentStats.data || null,
      searchParams: {
        search: searchQuery,
        location,
        skills,
        limit
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Talents data fetch error:', error);
    // Return fallback data if backend is unavailable
    return json({
      user: { 
        id: userId,
        name: 'Casting Director', 
        role: 'casting_director' 
      },
      talents: [],
      talentStats: null,
      searchParams: {
        search: searchQuery,
        location,
        skills,
        limit
      },
      timestamp: new Date().toISOString(),
      error: 'Failed to load talent data'
    });
  }
}

export default function TalentsPage() {
  const { user, talents, talentStats, searchParams, error } = useLoaderData<typeof loader>();
  const [searchParamsState, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  const popularSkills = [
    'Method Acting', 'Voice Modulation', 'Dance - Bollywood', 
    'Dance - Classical', 'Hindi', 'English', 'Marathi', 'Gujarati'
  ];

  const cities = [
    'Mumbai', 'Bandra West', 'Andheri West', 'Juhu', 'Versova', 'Goregaon'
  ];

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Talent Directory</h1>
              <p className="text-slate-400 mt-1">
                {talents.length} talented actors available for casting
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-slate-300">
                <span className="text-green-400">{talentStats?.totalTalents || 0}</span> total talents
              </div>
              <UserButton 
                afterSignOutUrl="/sign-in"
                appearance={{
                  baseTheme: 'dark',
                  elements: {
                    avatarBox: 'w-10 h-10',
                    userButtonPopoverCard: 'bg-slate-800 border-slate-700'
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-900/50 border border-red-700 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="h-5 w-5 text-red-400">⚠️</div>
              <p className="text-red-100 text-sm">Unable to load talent data. Using cached results.</p>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-8">
          <Form method="get" className="space-y-4">
            {/* Main Search Bar */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  name="search"
                  defaultValue={searchParams.search}
                  placeholder="Search by name, skills, or experience..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white hover:bg-slate-600 flex items-center gap-2"
              >
                <Filter className="h-5 w-5" />
                Filters
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
              >
                Search
              </button>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Location Filter */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Location
                    </label>
                    <select
                      name="location"
                      defaultValue={searchParams.location}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">All Locations</option>
                      {cities.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>

                  {/* Skills Filter */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Skills (comma-separated)
                    </label>
                    <input
                      type="text"
                      name="skills"
                      defaultValue={searchParams.skills}
                      placeholder="e.g., Hindi, Dance - Bollywood"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Popular Skills Quick Select */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Popular Skills
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {popularSkills.map(skill => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => {
                          const skillsInput = document.querySelector('input[name="skills"]') as HTMLInputElement;
                          const currentSkills = skillsInput.value ? skillsInput.value.split(',').map(s => s.trim()) : [];
                          if (!currentSkills.includes(skill)) {
                            skillsInput.value = [...currentSkills, skill].join(', ');
                          }
                        }}
                        className="px-3 py-1 text-sm bg-slate-700 text-slate-300 rounded-full hover:bg-purple-600 hover:text-white transition-colors"
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Form>
        </div>

        {/* Talent Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {talents.map((talent: any) => (
            <div key={talent.id} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden hover:border-purple-500 transition-colors">
              {/* Talent Avatar/Header */}
              <div className="p-6 border-b border-slate-700">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {talent.stageName || talent.name}
                    </h3>
                    <p className="text-slate-400 text-sm flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {talent.city || talent.location || 'Mumbai'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-slate-300">
                      {talent.rating ? talent.rating.toFixed(1) : '4.5'}
                    </span>
                  </div>
                </div>

                {/* Bio */}
                {talent.bio && (
                  <p className="text-slate-300 text-sm mb-4 line-clamp-2">
                    {talent.bio}
                  </p>
                )}

                {/* Experience */}
                <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {talent.experience || 'Beginner'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Film className="h-4 w-4" />
                    {talent.reviewCount || 0} reviews
                  </span>
                </div>
              </div>

              {/* Skills & Languages */}
              <div className="p-6">
                {/* Languages */}
                {talent.languages && talent.languages.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-slate-300 mb-2">Languages</h4>
                    <div className="flex flex-wrap gap-1">
                      {talent.languages.slice(0, 3).map((language: string) => (
                        <span
                          key={language}
                          className="px-2 py-1 text-xs bg-blue-900/50 text-blue-300 rounded-full"
                        >
                          {language}
                        </span>
                      ))}
                      {talent.languages.length > 3 && (
                        <span className="px-2 py-1 text-xs bg-slate-700 text-slate-400 rounded-full">
                          +{talent.languages.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Skills */}
                {talent.skills && talent.skills.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-slate-300 mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-1">
                      {talent.skills.slice(0, 3).map((skill: string) => (
                        <span
                          key={skill}
                          className="px-2 py-1 text-xs bg-purple-900/50 text-purple-300 rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                      {talent.skills.length > 3 && (
                        <span className="px-2 py-1 text-xs bg-slate-700 text-slate-400 rounded-full">
                          +{talent.skills.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Budget Range */}
                {talent.minBudget && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-slate-300 mb-1">Budget Range</h4>
                    <p className="text-sm text-green-400">
                      ₹{talent.minBudget} - ₹{talent.maxBudget || '50,000'} per day
                    </p>
                  </div>
                )}

                {/* Action Button */}
                <button className="w-full mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2">
                  View Profile
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {talents.length === 0 && !error && (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-slate-300 mb-2">No talents found</h3>
            <p className="text-slate-400 mb-4">
              Try adjusting your search criteria or browse all available talent
            </p>
            <button
              onClick={() => {
                setSearchParams({});
                window.location.reload();
              }}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              View All Talent
            </button>
          </div>
        )}

        {/* Load More */}
        {talents.length >= searchParams.limit && (
          <div className="text-center mt-8">
            <Form method="get">
              <input type="hidden" name="search" value={searchParams.search} />
              <input type="hidden" name="location" value={searchParams.location} />
              <input type="hidden" name="skills" value={searchParams.skills} />
              <input type="hidden" name="limit" value={searchParams.limit + 20} />
              <button
                type="submit"
                className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 border border-slate-600"
              >
                Load More Talent
              </button>
            </Form>
          </div>
        )}
      </div>
    </div>
  );
}