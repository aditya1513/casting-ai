import type { MetaFunction } from "@remix-run/node";
import { Search, TrendingUp, Filter, MapPin, Star, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "@remix-run/react";
import { apiClient } from "~/lib/api-client";

export const meta: MetaFunction = () => {
  return [
    { title: "Discover Talented Artists - CastMatch" },
    { name: "description", content: "Find the perfect talent for your next OTT production in Mumbai" },
  ];
};

interface Talent {
  id: string;
  name: string;
  location?: string;
  currentCity?: string;
  currentState?: string;
  experienceLevel?: string;
  languages?: string[];
  actingSkills?: string[];
  specialSkills?: string[];
  profilePictureUrl?: string;
  bio?: string;
  availabilityStatus?: string;
  isVerified?: boolean;
  rating?: number;
  reviewCount?: number;
  age?: number;
  gender?: string;
}

interface TalentSearchResponse {
  success: boolean;
  data: {
    talents: Talent[];
    total: number;
    page: number;
    totalPages: number;
  };
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function TalentsIndex() {
  const [talents, setTalents] = useState<Talent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalTalents, setTotalTalents] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch talents data
  const fetchTalents = async (page = 1, query = "") => {
    try {
      setLoading(true);
      setError(null);

      const searchParams = new URLSearchParams();
      searchParams.append('page', page.toString());
      searchParams.append('limit', '12');
      
      if (query.trim()) {
        searchParams.append('searchQuery', query.trim());
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/talents?${searchParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: TalentSearchResponse = await response.json();

      if (data.success && data.data) {
        setTalents(data.data.talents || []);
        setTotalTalents(data.data.total || 0);
        setCurrentPage(page);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching talents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load talents');
      setTalents([]);
      setTotalTalents(0);
    } finally {
      setLoading(false);
    }
  };

  // Load initial data
  useEffect(() => {
    fetchTalents();
  }, []);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTalents(1, searchQuery);
  };

  return (
    <>
      <div className="min-h-screen bg-slate-900">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <div className="container mx-auto px-4 py-12">
            <h1 className="text-4xl font-bold mb-4">Discover Talented Artists</h1>
            <p className="text-lg opacity-90 mb-8">
              Find the perfect talent for your next OTT production in Mumbai
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative max-w-2xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, skills, or keywords..."
                  className="w-full pl-10 pr-24 py-4 text-lg bg-white text-gray-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button 
                  type="submit" 
                  disabled={loading}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </form>

            {/* Quick Stats */}
            <div className="flex flex-wrap gap-4 mt-8">
              <div className="bg-white/20 text-white border border-white/30 px-3 py-1 rounded-full flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                {totalTalents > 0 ? `${totalTalents}+ Verified Talents` : '5,000+ Verified Talents'}
              </div>
              <div className="bg-white/20 text-white border border-white/30 px-3 py-1 rounded-full">
                15+ Languages
              </div>
              <div className="bg-white/20 text-white border border-white/30 px-3 py-1 rounded-full">
                All Experience Levels
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          {/* Toolbar */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors border border-slate-700"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </button>
            </div>
            
            {/* Navigation */}
            <div className="flex items-center space-x-2">
              <Link 
                to="/dashboard" 
                className="text-slate-400 hover:text-white transition-colors"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                <p className="text-slate-300 ml-4">Loading talents...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
              <p className="text-red-200">Error loading talents: {error}</p>
              <button
                onClick={() => fetchTalents()}
                className="mt-2 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Results Header */}
          {!loading && !error && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6">
              <p className="text-slate-300">
                Showing {talents.length} of {totalTalents} results
                {searchQuery && <span className="text-indigo-400"> for "{searchQuery}"</span>}
              </p>
            </div>
          )}

          {/* No Results */}
          {!loading && !error && talents.length === 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-12 text-center">
              <Search className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-200 mb-2">No talents found</h3>
              <p className="text-slate-400 mb-4">
                {searchQuery ? 'Try adjusting your search terms' : 'No talents available at the moment'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    fetchTalents();
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                  Clear Search
                </button>
              )}
            </div>
          )}

          {/* Talent Grid */}
          {!loading && talents.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {talents.map((talent) => (
                <div key={talent.id} className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition-colors group">
                  {/* Profile Header */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-white group-hover:text-indigo-400 transition-colors">
                        {talent.name}
                      </h3>
                      {talent.isVerified && (
                        <div className="flex items-center text-green-400">
                          <Star className="w-4 h-4 fill-current" />
                        </div>
                      )}
                    </div>
                    
                    {(talent.currentCity || talent.location) && (
                      <div className="flex items-center text-slate-400 text-sm">
                        <MapPin className="w-3 h-3 mr-1" />
                        {talent.currentCity || talent.location}
                        {talent.currentState && `, ${talent.currentState}`}
                      </div>
                    )}
                  </div>
                  
                  {/* Profile Details */}
                  <div className="space-y-2 mb-4">
                    {talent.experienceLevel && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-400">Experience:</span>
                        <span className="text-sm text-slate-200 capitalize">{talent.experienceLevel}</span>
                      </div>
                    )}
                    
                    {talent.age && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-400">Age:</span>
                        <span className="text-sm text-slate-200">{talent.age}</span>
                      </div>
                    )}
                    
                    {talent.availabilityStatus && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-400">Status:</span>
                        <div className="flex items-center">
                          <Clock className="w-3 h-3 mr-1 text-green-400" />
                          <span className="text-sm text-green-400 capitalize">{talent.availabilityStatus}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Languages */}
                  {talent.languages && talent.languages.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-slate-400 mb-2">Languages:</p>
                      <div className="flex flex-wrap gap-1">
                        {talent.languages.slice(0, 3).map((language) => (
                          <span key={language} className="inline-block bg-slate-700 text-slate-200 text-xs px-2 py-1 rounded">
                            {language}
                          </span>
                        ))}
                        {talent.languages.length > 3 && (
                          <span className="text-xs text-slate-400">+{talent.languages.length - 3} more</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Skills */}
                  {talent.actingSkills && talent.actingSkills.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-slate-400 mb-2">Skills:</p>
                      <div className="flex flex-wrap gap-1">
                        {talent.actingSkills.slice(0, 3).map((skill) => (
                          <span key={skill} className="inline-block bg-indigo-900/50 text-indigo-200 text-xs px-2 py-1 rounded border border-indigo-700/50">
                            {skill}
                          </span>
                        ))}
                        {talent.actingSkills.length > 3 && (
                          <span className="text-xs text-slate-400">+{talent.actingSkills.length - 3} more</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Bio */}
                  {talent.bio && (
                    <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                      {talent.bio}
                    </p>
                  )}

                  {/* Action Button */}
                  <Link
                    to={`/talents/${talent.id}`}
                    className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg transition-colors text-center text-sm font-medium"
                  >
                    View Profile
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && talents.length > 0 && totalTalents > 12 && (
            <div className="mt-8 flex justify-center items-center space-x-4">
              <button
                onClick={() => fetchTalents(currentPage - 1, searchQuery)}
                disabled={currentPage <= 1}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700"
              >
                Previous
              </button>
              
              <span className="text-slate-400">
                Page {currentPage} of {Math.ceil(totalTalents / 12)}
              </span>
              
              <button
                onClick={() => fetchTalents(currentPage + 1, searchQuery)}
                disabled={currentPage >= Math.ceil(totalTalents / 12)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}