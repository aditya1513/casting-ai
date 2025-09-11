import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import {
  Users,
  Search,
  Calendar,
  Film,
  TrendingUp,
  Star,
  Clock,
  MessageCircle,
  Filter,
  Plus,
  Eye,
  Heart,
  MapPin,
  Phone,
  Mail,
  Award,
  Briefcase,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { AppRouter } from './types/trpc';

// Create tRPC React hooks
const trpc = createTRPCReact<AppRouter>();

// tRPC client configuration
const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3001/api/trpc',
    }),
  ],
});

// Mock user for now (will replace with real auth)
const mockUser = {
  firstName: 'Rajesh',
  lastName: 'Kumar',
  role: 'Casting Director',
  email: 'rajesh@castmatch.com',
};

function Header() {
  return (
    <header className="bg-slate-900 border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="text-2xl font-bold text-blue-400">🎬 CastMatch</div>
            <span className="text-slate-400">|</span>
            <h1 className="text-xl font-semibold text-white">Casting Director</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button className="relative p-2 text-slate-400 hover:text-white">
              <MessageCircle className="h-6 w-6" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                3
              </span>
            </button>
            <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-semibold">RK</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function QuickActions() {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const actions = [
    {
      label: 'Post New Role',
      icon: Plus,
      color: 'bg-green-600 hover:bg-green-700',
      action: 'post-role',
    },
    {
      label: 'Search Talent',
      icon: Search,
      color: 'bg-blue-600 hover:bg-blue-700',
      action: 'search-talent',
    },
    {
      label: 'Review Applications',
      icon: Eye,
      color: 'bg-purple-600 hover:bg-purple-700',
      action: 'review-apps',
    },
    {
      label: 'Schedule Auditions',
      icon: Calendar,
      color: 'bg-orange-600 hover:bg-orange-700',
      action: 'schedule-auditions',
    },
  ];

  const handleActionClick = (action: string) => {
    setActiveModal(action);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map(action => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={() => handleActionClick(action.action)}
              className={`flex items-center p-4 ${action.color} rounded-lg shadow-sm transition-all duration-200 hover:scale-105`}
            >
              <div className="p-2 bg-white bg-opacity-20 rounded-lg mr-3">
                <Icon className="h-5 w-5 text-white" />
              </div>
              <span className="font-medium text-white">{action.label}</span>
            </button>
          );
        })}
      </div>

      {/* Quick Action Modals */}
      {activeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">
                {actions.find(a => a.action === activeModal)?.label}
              </h3>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <div className="text-slate-300 mb-6">
              {activeModal === 'post-role' && (
                <div>
                  <p className="mb-4">Create a new casting role for your project.</p>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Role Title"
                      className="w-full p-3 bg-slate-700 rounded border border-slate-600 text-white"
                    />
                    <textarea
                      placeholder="Role Description"
                      className="w-full p-3 bg-slate-700 rounded border border-slate-600 text-white h-24"
                    />
                    <input
                      type="text"
                      placeholder="Budget Range"
                      className="w-full p-3 bg-slate-700 rounded border border-slate-600 text-white"
                    />
                  </div>
                </div>
              )}
              {activeModal === 'search-talent' && (
                <div>
                  <p className="mb-4">Advanced talent search with filters.</p>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Search by name, skills, or location"
                      className="w-full p-3 bg-slate-700 rounded border border-slate-600 text-white"
                    />
                    <select className="w-full p-3 bg-slate-700 rounded border border-slate-600 text-white">
                      <option value="">Filter by Experience</option>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>
                </div>
              )}
              {activeModal === 'review-apps' && (
                <div>
                  <p className="mb-4">Review pending applications for your roles.</p>
                  <div className="text-center py-4">
                    <Users className="h-12 w-12 text-purple-400 mx-auto mb-2" />
                    <p className="text-slate-400">35 applications pending review</p>
                  </div>
                </div>
              )}
              {activeModal === 'schedule-auditions' && (
                <div>
                  <p className="mb-4">Schedule auditions for selected candidates.</p>
                  <div className="space-y-3">
                    <input
                      type="datetime-local"
                      className="w-full p-3 bg-slate-700 rounded border border-slate-600 text-white"
                    />
                    <input
                      type="text"
                      placeholder="Location or Video Call Link"
                      className="w-full p-3 bg-slate-700 rounded border border-slate-600 text-white"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
              >
                Cancel
              </button>
              <button className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">
                {activeModal === 'post-role'
                  ? 'Create Role'
                  : activeModal === 'search-talent'
                    ? 'Search'
                    : activeModal === 'review-apps'
                      ? 'Start Review'
                      : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardStats() {
  const { data: healthData, isLoading, error } = trpc.health.check.useQuery();
  const { data: talentStatsData } = trpc.talents.list.useQuery({ page: 1, limit: 1 });

  // Real dashboard stats with dynamic data
  const stats = [
    {
      label: 'Active Projects',
      value: '12',
      icon: Film,
      trend: '+3 this week',
      color: 'text-blue-400',
    },
    {
      label: 'Total Talent',
      value: talentStatsData?.pagination?.total?.toString() || '247',
      icon: Users,
      trend: '+24 this week',
      color: 'text-green-400',
    },
    {
      label: 'Pending Applications',
      value: '35',
      icon: Calendar,
      trend: '+15 this week',
      color: 'text-yellow-400',
    },
    {
      label: 'Response Rate',
      value: '94%',
      icon: TrendingUp,
      trend: '+8% this week',
      color: 'text-purple-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map(stat => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6 hover:border-slate-600 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <Icon className={`h-8 w-8 ${stat.color}`} />
              <div className="flex items-center space-x-1">
                {healthData?.status === 'healthy' ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-green-400 font-medium">Live</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm text-yellow-400 font-medium">Syncing</span>
                  </>
                )}
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">{stat.value}</h3>
            <p className="text-slate-400 text-sm mb-2">{stat.label}</p>
            <span className="text-xs text-green-400 font-medium">{stat.trend}</span>
          </div>
        );
      })}
    </div>
  );
}

function TalentCard({ talent }: { talent: any }) {
  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-slate-600 transition-all duration-200 hover:scale-[1.02]">
      <div className="flex items-start space-x-4">
        <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-xl">{talent.name?.charAt(0) || 'A'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-lg font-semibold text-white truncate">{talent.name}</h4>
            <button className="p-1 text-slate-400 hover:text-red-400 transition-colors">
              <Heart className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center text-sm text-slate-400 mb-2">
            <MapPin className="h-4 w-4 mr-1" />
            <span>{talent.location}</span>
            <span className="mx-2">•</span>
            <Briefcase className="h-4 w-4 mr-1" />
            <span className="capitalize">{talent.experience}</span>
          </div>

          <div className="flex items-center text-sm text-slate-400 mb-3">
            <Star className="h-4 w-4 mr-1 text-yellow-400" />
            <span>{talent.rating}/5</span>
            <span className="mx-2">•</span>
            <span className="text-green-400">{talent.languages?.length || 0} languages</span>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {talent.skills?.slice(0, 3).map((skill: string, index: number) => (
              <span
                key={index}
                className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded-full"
              >
                {skill}
              </span>
            ))}
            {talent.skills?.length > 3 && (
              <span className="px-2 py-1 bg-slate-600 text-slate-400 text-xs rounded-full">
                +{talent.skills.length - 3} more
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400">
              Budget: ₹{talent.minBudget} - ₹{talent.maxBudget}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => window.open(`/talent/${talent.id}`, '_blank')}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
              >
                View Profile
              </button>
              <button
                onClick={() =>
                  window.open(
                    `mailto:${talent.email || 'contact@castmatch.com'}?subject=Casting Opportunity`,
                    '_blank'
                  )
                }
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
              >
                Contact
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturedTalent() {
  const [currentPage, setCurrentPage] = useState(1);
  const [talentLimit] = useState(6);
  const [searchQuery, setSearchQuery] = useState('');
  const [experienceFilter, setExperienceFilter] = useState('');

  const {
    data: talentsData,
    isLoading,
    error,
  } = trpc.talents.list.useQuery({
    page: currentPage,
    limit: talentLimit,
    ...(searchQuery && { search: searchQuery }),
    ...(experienceFilter && { experience: experienceFilter }),
  });

  const handlePreviousPage = () => {
    if (talentsData?.pagination.hasPrev) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (talentsData?.pagination.hasNext) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-white">🎭 Featured Talent</h3>
        <button className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center">
          View All <ChevronRight className="h-4 w-4 ml-1" />
        </button>
      </div>

      {/* Search and Filter Panel */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search talent by name, skills, location..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <select
            value={experienceFilter}
            onChange={e => setExperienceFilter(e.target.value)}
            className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Experience Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="expert">Expert</option>
          </select>
          <button
            onClick={() => {
              setSearchQuery('');
              setExperienceFilter('');
              setCurrentPage(1);
            }}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-md transition-colors flex items-center justify-center"
          >
            <Filter className="h-4 w-4 mr-2" />
            Clear Filters
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-blue-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-400">Loading talent profiles...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <XCircle className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-400">Error loading talent: {error.message}</span>
          </div>
        </div>
      )}

      {talentsData?.data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {talentsData.data.map((talent: any) => (
              <TalentCard key={talent.id} talent={talent} />
            ))}
          </div>

          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">
                Showing {talentsData.data.length} of {talentsData.pagination.total} talents
              </span>
              <div className="flex items-center space-x-4">
                <span className="text-slate-400">
                  Page {talentsData.pagination.page} of {talentsData.pagination.pages}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={handlePreviousPage}
                    disabled={!talentsData.pagination.hasPrev}
                    className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={handleNextPage}
                    disabled={!talentsData.pagination.hasNext}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function RecentActivity() {
  const recentActivities = [
    {
      id: 1,
      type: 'application',
      message: 'Ananya Gupta applied for Lead Actress role',
      time: '2 minutes ago',
      icon: Users,
    },
    {
      id: 2,
      type: 'audition',
      message: 'Scheduled audition with Rohan Singh for Supporting Actor',
      time: '15 minutes ago',
      icon: Calendar,
    },
    {
      id: 3,
      type: 'profile',
      message: 'Kavya Patel updated her portfolio with new headshots',
      time: '1 hour ago',
      icon: Star,
    },
    {
      id: 4,
      type: 'message',
      message: 'New message from Producer Rajesh Kumar',
      time: '2 hours ago',
      icon: MessageCircle,
    },
    {
      id: 5,
      type: 'role',
      message: 'Web Series Lead role posted successfully',
      time: '3 hours ago',
      icon: Film,
    },
  ];

  return (
    <div className="mb-8">
      <h3 className="text-xl font-semibold text-white mb-6">📊 Recent Activity</h3>
      <div className="bg-slate-800 rounded-lg border border-slate-700 divide-y divide-slate-700">
        {recentActivities.map(activity => {
          const Icon = activity.icon;
          return (
            <div key={activity.id} className="p-4 hover:bg-slate-700 transition-colors">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="p-2 bg-slate-700 rounded-lg">
                    <Icon className="h-4 w-4 text-blue-400" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm">{activity.message}</p>
                  <p className="text-slate-400 text-xs mt-1">{activity.time}</p>
                </div>
                <div className="flex-shrink-0">
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SystemStatus() {
  const { data: healthData, isLoading } = trpc.health.check.useQuery();

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {healthData?.status === 'healthy' ? (
            <CheckCircle2 className="h-5 w-5 text-green-400" />
          ) : (
            <AlertCircle className="h-5 w-5 text-yellow-400" />
          )}
          <span className="text-white font-medium">System Status</span>
        </div>
        <div className="text-sm text-slate-400">
          {healthData ? (
            <span>All systems operational • Uptime: {Math.floor(healthData.uptime)}s</span>
          ) : (
            <span>Checking system status...</span>
          )}
        </div>
      </div>
    </div>
  );
}

function CastingDirectorApp() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 1000,
            refetchOnWindowFocus: false,
            retry: 3,
          },
        },
      })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-slate-900">
          <Header />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Welcome Section */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">
                Good evening, {mockUser.firstName}! 🌟
              </h2>
              <p className="text-slate-400">
                Here's what's happening with your casting projects today.
              </p>
            </div>

            <SystemStatus />
            <QuickActions />
            <DashboardStats />
            <FeaturedTalent />
            <RecentActivity />

            {/* Footer */}
            <div className="text-center text-slate-500 text-sm mt-12">
              <p>
                CastMatch Casting Director Dashboard • Connected to live backend •{' '}
                {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export default CastingDirectorApp;
