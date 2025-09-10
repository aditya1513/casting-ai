/**
 * Talent Search Interface - Advanced Filtering & Discovery
 * AI-powered talent matching for casting directors
 */

import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams, Form } from "@remix-run/react";
import { requireAuth } from "@clerk/remix/ssr.server";
import { useState } from "react";
import { 
  Search, 
  Filter, 
  MapPin, 
  Star, 
  Heart, 
  Eye,
  Calendar,
  User,
  Camera,
  Award,
  Languages,
  Briefcase,
  Clock
} from "lucide-react";
import { trpc } from "~/lib/trpc";

export const meta: MetaFunction = () => {
  return [
    { title: "Talent Search - CastMatch" },
    { name: "description", content: "Discover and filter talent with advanced AI-powered search" },
  ];
};

export async function loader(args: LoaderFunctionArgs) {
  return requireAuth(args, () => {
    return json({
      user: { role: 'casting_director' }
    });
  });
}

export default function TalentSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedFilters, setSelectedFilters] = useState({
    location: [],
    experience: '',
    age: { min: 18, max: 65 },
    skills: [],
    availability: '',
    languages: []
  });
  
  const searchQuery = searchParams.get("q") || "";
  
  // tRPC queries
  const talentsQuery = trpc.talents.list.useQuery({
    page: 1,
    limit: 12,
    search: searchQuery
  });

  // Mock data - would be replaced by tRPC calls
  const talents = [
    {
      id: "1",
      name: "Priya Sharma",
      age: 28,
      location: "Mumbai, Maharashtra",
      profileImage: "/api/placeholder/200/250",
      experience: "5 years",
      skills: ["Method Acting", "Dance", "Singing"],
      languages: ["Hindi", "English", "Marathi"],
      rating: 4.8,
      hourlyRate: "₹5,000",
      availability: "Available",
      recentWork: ["Sacred Games", "Mumbai Diaries"],
      verified: true
    },
    {
      id: "2", 
      name: "Raj Patel",
      age: 32,
      location: "Mumbai, Maharashtra", 
      profileImage: "/api/placeholder/200/250",
      experience: "8 years",
      skills: ["Character Acting", "Action", "Comedy"],
      languages: ["Hindi", "English", "Gujarati"],
      rating: 4.9,
      hourlyRate: "₹8,000",
      availability: "Busy until Jan 25",
      recentWork: ["Scam 1992", "The Family Man"],
      verified: true
    },
    // More mock data...
  ];

  const filterOptions = {
    locations: ["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Kolkata"],
    experiences: ["Fresher", "1-3 years", "3-5 years", "5-10 years", "10+ years"],
    skills: ["Method Acting", "Dance", "Singing", "Action", "Comedy", "Drama", "Classical Dance", "Contemporary Dance"],
    languages: ["Hindi", "English", "Marathi", "Tamil", "Telugu", "Bengali", "Gujarati", "Punjabi"],
    availabilities: ["Available Now", "Available This Week", "Available This Month", "Busy"]
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Talent Search</h1>
              <span className="text-sm text-gray-500">
                {talentsQuery.data?.totalCount || 0} talents available
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <Form method="get" className="flex space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                name="q"
                type="text"
                placeholder="Search by name, skills, or experience..."
                defaultValue={searchQuery}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500"
            >
              Search
            </button>
            <button
              type="button"
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 flex items-center space-x-2"
            >
              <Filter className="h-5 w-5" />
              <span>Filters</span>
            </button>
          </Form>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Filters</h3>
              
              {/* Location Filter */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Location</h4>
                <div className="space-y-2">
                  {filterOptions.locations.map((location) => (
                    <label key={location} className="flex items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{location}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Experience Filter */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Experience</h4>
                <select className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500">
                  <option value="">Any Experience</option>
                  {filterOptions.experiences.map((exp) => (
                    <option key={exp} value={exp}>{exp}</option>
                  ))}
                </select>
              </div>

              {/* Age Range */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Age Range</h4>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    placeholder="Min"
                    className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                    min="18"
                    max="65"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                    min="18"
                    max="65"
                  />
                </div>
              </div>

              {/* Skills Filter */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Skills</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {filterOptions.skills.map((skill) => (
                    <label key={skill} className="flex items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{skill}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Languages Filter */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Languages</h4>
                <div className="space-y-2">
                  {filterOptions.languages.slice(0, 5).map((language) => (
                    <label key={language} className="flex items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{language}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Clear Filters */}
              <button className="w-full py-2 px-4 text-sm text-indigo-600 border border-indigo-600 rounded-md hover:bg-indigo-50">
                Clear All Filters
              </button>
            </div>
          </div>

          {/* Talent Grid */}
          <div className="lg:col-span-3">
            {talentsQuery.isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow-sm border p-6 animate-pulse">
                    <div className="h-48 bg-gray-200 rounded-lg mb-4" />
                    <div className="h-4 bg-gray-200 rounded mb-2" />
                    <div className="h-3 bg-gray-200 rounded mb-4 w-2/3" />
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-full" />
                      <div className="h-3 bg-gray-200 rounded w-4/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {talents.map((talent) => (
                  <div key={talent.id} className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-lg transition-shadow">
                    {/* Profile Image */}
                    <div className="relative">
                      <div className="h-48 bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                        <User className="h-16 w-16 text-white" />
                      </div>
                      
                      {/* Status Badge */}
                      <div className="absolute top-3 right-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          talent.availability === 'Available' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {talent.availability}
                        </span>
                      </div>

                      {/* Verified Badge */}
                      {talent.verified && (
                        <div className="absolute top-3 left-3">
                          <div className="bg-blue-500 text-white p-1 rounded-full">
                            <Award className="h-4 w-4" />
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="absolute bottom-3 right-3 flex space-x-2">
                        <button className="p-2 bg-white/90 rounded-full hover:bg-white">
                          <Heart className="h-4 w-4 text-gray-600" />
                        </button>
                        <button className="p-2 bg-white/90 rounded-full hover:bg-white">
                          <Eye className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>
                    </div>

                    {/* Profile Info */}
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{talent.name}</h3>
                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <MapPin className="h-4 w-4 mr-1" />
                            {talent.location}
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 mr-1" />
                          <span className="text-sm text-gray-600">{talent.rating}</span>
                        </div>
                      </div>

                      {/* Quick Stats */}
                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div className="flex items-center text-gray-600">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>{talent.experience}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Briefcase className="h-4 w-4 mr-1" />
                          <span>{talent.hourlyRate}</span>
                        </div>
                      </div>

                      {/* Skills */}
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-2">
                          {talent.skills.slice(0, 3).map((skill) => (
                            <span
                              key={skill}
                              className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-md text-xs font-medium"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Languages */}
                      <div className="mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <Languages className="h-4 w-4 mr-1" />
                          <span>{talent.languages.join(", ")}</span>
                        </div>
                      </div>

                      {/* Recent Work */}
                      <div className="mb-4">
                        <p className="text-xs text-gray-500 mb-1">Recent Work:</p>
                        <p className="text-sm text-gray-700">{talent.recentWork.join(", ")}</p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-2">
                        <button className="flex-1 py-2 px-4 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700">
                          View Profile
                        </button>
                        <button className="py-2 px-4 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50">
                          Shortlist
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            <div className="mt-8 flex justify-center">
              <div className="flex space-x-2">
                <button className="py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50">
                  Previous
                </button>
                <button className="py-2 px-4 bg-indigo-600 text-white rounded-md">1</button>
                <button className="py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">2</button>
                <button className="py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">3</button>
                <button className="py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}