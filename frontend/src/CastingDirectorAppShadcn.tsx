import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import { 
  Users, Search, Calendar, Film, TrendingUp, Star, Clock, MessageCircle, 
  Filter, Plus, Eye, Heart, MapPin, Phone, Mail, Award, Briefcase,
  ChevronRight, AlertCircle, CheckCircle2, XCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
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
  email: 'rajesh@castmatch.com'
};

function Header() {
  return (
    <header className=\"border-b bg-card sticky top-0 z-50\">
      <div className=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8\">
        <div className=\"flex justify-between items-center h-16\">
          <div className=\"flex items-center space-x-4\">
            <div className=\"text-2xl font-bold text-primary\">🎬 CastMatch</div>
            <span className=\"text-muted-foreground\">|</span>
            <h1 className=\"text-xl font-semibold\">Casting Director</h1>
          </div>
          <div className=\"flex items-center space-x-4\">
            <Button variant=\"ghost\" size=\"icon\" className=\"relative\">
              <MessageCircle className=\"h-6 w-6\" />
              <span className=\"absolute -top-1 -right-1 h-4 w-4 bg-destructive rounded-full text-xs text-destructive-foreground flex items-center justify-center\">3</span>
            </Button>
            <div className=\"h-8 w-8 bg-primary rounded-full flex items-center justify-center\">
              <span className=\"text-primary-foreground text-sm font-semibold\">RK</span>
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
    { label: \"Post New Role\", icon: Plus, variant: \"default\" as const, action: \"post-role\" },
    { label: \"Search Talent\", icon: Search, variant: \"secondary\" as const, action: \"search-talent\" },
    { label: \"Review Applications\", icon: Eye, variant: \"outline\" as const, action: \"review-apps\" },
    { label: \"Schedule Auditions\", icon: Calendar, variant: \"default\" as const, action: \"schedule-auditions\" },
  ];

  const handleActionClick = (action: string) => {
    setActiveModal(action);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  return (
    <div className=\"mb-8\">
      <h3 className=\"text-lg font-semibold mb-4\">Quick Actions</h3>
      <div className=\"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4\">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.label}
              onClick={() => handleActionClick(action.action)}
              variant={action.variant}
              className=\"h-auto p-4 flex-col gap-2\"
            >
              <Icon className=\"h-5 w-5\" />
              <span className=\"text-sm font-medium\">{action.label}</span>
            </Button>
          );
        })}
      </div>
      
      {/* Quick Action Modals */}
      {activeModal && (
        <div className=\"fixed inset-0 bg-black/50 flex items-center justify-center z-50\">
          <Card className=\"max-w-md w-full mx-4\">
            <CardHeader>
              <div className=\"flex justify-between items-center\">
                <CardTitle>
                  {actions.find(a => a.action === activeModal)?.label}
                </CardTitle>
                <Button variant=\"ghost\" size=\"icon\" onClick={closeModal}>
                  <XCircle className=\"h-4 w-4\" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className=\"space-y-4\">
                {activeModal === 'post-role' && (
                  <div className=\"space-y-3\">
                    <Input placeholder=\"Role Title\" />
                    <textarea 
                      placeholder=\"Role Description\" 
                      className=\"w-full p-3 bg-background border border-input rounded-md h-24 resize-none\"
                    />
                    <Input placeholder=\"Budget Range\" />
                  </div>
                )}
                {activeModal === 'search-talent' && (
                  <div className=\"space-y-3\">
                    <Input placeholder=\"Search by name, skills, or location\" />
                    <select className=\"w-full p-3 bg-background border border-input rounded-md\">
                      <option value=\"\">Filter by Experience</option>
                      <option value=\"beginner\">Beginner</option>
                      <option value=\"intermediate\">Intermediate</option>
                      <option value=\"expert\">Expert</option>
                    </select>
                  </div>
                )}
                {activeModal === 'review-apps' && (
                  <div className=\"text-center py-4\">
                    <Users className=\"h-12 w-12 text-muted-foreground mx-auto mb-2\" />
                    <p className=\"text-muted-foreground\">35 applications pending review</p>
                  </div>
                )}
                {activeModal === 'schedule-auditions' && (
                  <div className=\"space-y-3\">
                    <Input type=\"datetime-local\" />
                    <Input placeholder=\"Location or Video Call Link\" />
                  </div>
                )}
              </div>
              <div className=\"flex space-x-3 mt-6\">
                <Button variant=\"outline\" onClick={closeModal} className=\"flex-1\">
                  Cancel
                </Button>
                <Button className=\"flex-1\">
                  {activeModal === 'post-role' ? 'Create Role' : 
                   activeModal === 'search-talent' ? 'Search' :
                   activeModal === 'review-apps' ? 'Start Review' : 'Schedule'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function DashboardStats() {
  const { data: healthData, isLoading, error } = trpc.health.check.useQuery();
  const { data: talentStatsData } = trpc.talents.list.useQuery({ page: 1, limit: 1 });
  
  const stats = [
    { label: \"Active Projects\", value: \"12\", icon: Film, trend: \"+3 this week\", color: \"text-blue-500\" },
    { label: \"Total Talent\", value: talentStatsData?.pagination?.total?.toString() || \"247\", icon: Users, trend: \"+24 this week\", color: \"text-green-500\" },
    { label: \"Pending Applications\", value: \"35\", icon: Calendar, trend: \"+15 this week\", color: \"text-yellow-500\" },
    { label: \"Response Rate\", value: \"94%\", icon: TrendingUp, trend: \"+8% this week\", color: \"text-purple-500\" },
  ];

  return (
    <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8\">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className=\"hover:shadow-lg transition-shadow\">
            <CardContent className=\"p-6\">
              <div className=\"flex items-center justify-between mb-4\">
                <Icon className={cn(\"h-8 w-8\", stat.color)} />
                <div className=\"flex items-center space-x-1\">
                  {healthData?.status === 'healthy' ? (
                    <>
                      <CheckCircle2 className=\"h-4 w-4 text-green-500\" />
                      <span className=\"text-sm text-green-500 font-medium\">Live</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className=\"h-4 w-4 text-yellow-500\" />
                      <span className=\"text-sm text-yellow-500 font-medium\">Syncing</span>
                    </>
                  )}
                </div>
              </div>
              <h3 className=\"text-2xl font-bold mb-1\">{stat.value}</h3>
              <p className=\"text-muted-foreground text-sm mb-2\">{stat.label}</p>
              <span className=\"text-xs text-green-500 font-medium\">{stat.trend}</span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function TalentCard({ talent }: { talent: any }) {
  return (
    <Card className=\"hover:shadow-lg transition-all duration-200 hover:scale-[1.02]\">
      <CardContent className=\"p-6\">
        <div className=\"flex items-start space-x-4\">
          <div className=\"h-16 w-16 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center flex-shrink-0\">
            <span className=\"text-primary-foreground font-bold text-xl\">
              {talent.name?.charAt(0) || 'A'}
            </span>
          </div>
          <div className=\"flex-1 min-w-0\">
            <div className=\"flex items-center justify-between mb-2\">
              <h4 className=\"text-lg font-semibold truncate\">{talent.name}</h4>
              <Button variant=\"ghost\" size=\"icon\">
                <Heart className=\"h-5 w-5\" />
              </Button>
            </div>
            
            <div className=\"flex items-center text-sm text-muted-foreground mb-2\">
              <MapPin className=\"h-4 w-4 mr-1\" />
              <span>{talent.location}</span>
              <span className=\"mx-2\">•</span>
              <Briefcase className=\"h-4 w-4 mr-1\" />
              <span className=\"capitalize\">{talent.experience}</span>
            </div>
            
            <div className=\"flex items-center text-sm text-muted-foreground mb-3\">
              <Star className=\"h-4 w-4 mr-1 text-yellow-400\" />
              <span>{talent.rating}/5</span>
              <span className=\"mx-2\">•</span>
              <span className=\"text-green-500\">{talent.languages?.length || 0} languages</span>
            </div>
            
            <div className=\"flex flex-wrap gap-2 mb-4\">
              {talent.skills?.slice(0, 3).map((skill: string, index: number) => (
                <span key={index} className=\"px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-full\">
                  {skill}
                </span>
              ))}
              {talent.skills?.length > 3 && (
                <span className=\"px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full\">
                  +{talent.skills.length - 3} more
                </span>
              )}
            </div>
            
            <div className=\"flex items-center justify-between\">
              <div className=\"text-xs text-muted-foreground\">
                Budget: ₹{talent.minBudget} - ₹{talent.maxBudget}
              </div>
              <div className=\"flex space-x-2\">
                <Button size=\"sm\" variant=\"outline\">
                  View Profile
                </Button>
                <Button size=\"sm\">
                  Contact
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FeaturedTalent() {
  const [currentPage, setCurrentPage] = useState(1);
  const [talentLimit] = useState(6);
  const [searchQuery, setSearchQuery] = useState('');
  const [experienceFilter, setExperienceFilter] = useState('');
  
  const { data: talentsData, isLoading, error } = trpc.talents.list.useQuery({
    page: currentPage,
    limit: talentLimit,
    ...(searchQuery && { search: searchQuery }),
    ...(experienceFilter && { experience: experienceFilter })
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
    <div className=\"mb-8\">
      <div className=\"flex justify-between items-center mb-6\">
        <h3 className=\"text-xl font-semibold\">🎭 Featured Talent</h3>
        <Button variant=\"ghost\" className=\"text-primary\">
          View All <ChevronRight className=\"h-4 w-4 ml-1\" />
        </Button>
      </div>
      
      {/* Search and Filter Panel */}
      <Card className=\"mb-6\">
        <CardContent className=\"p-4\">
          <div className=\"grid grid-cols-1 md:grid-cols-3 gap-4\">
            <div className=\"relative\">
              <Search className=\"absolute left-3 top-3 h-4 w-4 text-muted-foreground\" />
              <Input
                type=\"text\"
                placeholder=\"Search talent by name, skills, location...\"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className=\"pl-10\"
              />
            </div>
            <select
              value={experienceFilter}
              onChange={(e) => setExperienceFilter(e.target.value)}
              className=\"px-4 py-2 bg-background border border-input rounded-md\"
            >
              <option value=\"\">All Experience Levels</option>
              <option value=\"beginner\">Beginner</option>
              <option value=\"intermediate\">Intermediate</option>
              <option value=\"expert\">Expert</option>
            </select>
            <Button
              variant=\"outline\"
              onClick={() => {setSearchQuery(''); setExperienceFilter(''); setCurrentPage(1);}}
              className=\"flex items-center justify-center\"
            >
              <Filter className=\"h-4 w-4 mr-2\" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {isLoading && (
        <Card>
          <CardContent className=\"p-12 text-center\">
            <div className=\"animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4\"></div>
            <p className=\"text-muted-foreground\">Loading talent profiles...</p>
          </CardContent>
        </Card>
      )}
      
      {error && (
        <Card className=\"border-destructive\">
          <CardContent className=\"p-4\">
            <div className=\"flex items-center\">
              <XCircle className=\"h-5 w-5 text-destructive mr-2\" />
              <span className=\"text-destructive\">Error loading talent: {error.message}</span>
            </div>
          </CardContent>
        </Card>
      )}
      
      {talentsData?.data && (
        <>
          <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6\">
            {talentsData.data.map((talent: any) => (
              <TalentCard key={talent.id} talent={talent} />
            ))}
          </div>
          
          <Card>
            <CardContent className=\"p-4\">
              <div className=\"flex items-center justify-between text-sm\">
                <span className=\"text-muted-foreground\">
                  Showing {talentsData.data.length} of {talentsData.pagination.total} talents
                </span>
                <div className=\"flex items-center space-x-4\">
                  <span className=\"text-muted-foreground\">Page {talentsData.pagination.page} of {talentsData.pagination.pages}</span>
                  <div className=\"flex space-x-2\">
                    <Button 
                      variant=\"outline\"
                      size=\"sm\"
                      onClick={handlePreviousPage}
                      disabled={!talentsData.pagination.hasPrev}
                    >
                      Previous
                    </Button>
                    <Button 
                      size=\"sm\"
                      onClick={handleNextPage}
                      disabled={!talentsData.pagination.hasNext}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function SystemStatus() {
  const { data: healthData, isLoading } = trpc.health.check.useQuery();
  
  return (
    <Card className=\"mb-8\">
      <CardContent className=\"p-4\">
        <div className=\"flex items-center justify-between\">
          <div className=\"flex items-center space-x-2\">
            {healthData?.status === 'healthy' ? (
              <CheckCircle2 className=\"h-5 w-5 text-green-500\" />
            ) : (
              <AlertCircle className=\"h-5 w-5 text-yellow-500\" />
            )}
            <span className=\"font-medium\">System Status</span>
          </div>
          <div className=\"text-sm text-muted-foreground\">
            {healthData ? (
              <span>All systems operational • Uptime: {Math.floor(healthData.uptime)}s</span>
            ) : (
              <span>Checking system status...</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CastingDirectorAppShadcn() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 1000,
        refetchOnWindowFocus: false,
        retry: 3,
      },
    },
  }));

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <div className=\"min-h-screen bg-background\">
          <Header />
          
          <div className=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8\">
            {/* Welcome Section */}
            <div className=\"mb-8\">
              <h2 className=\"text-3xl font-bold mb-2\">
                Good evening, {mockUser.firstName}! 🌟
              </h2>
              <p className=\"text-muted-foreground\">Here's what's happening with your casting projects today.</p>
            </div>

            <SystemStatus />
            <QuickActions />
            <DashboardStats />
            <FeaturedTalent />
            
            {/* Footer */}
            <div className=\"text-center text-muted-foreground text-sm mt-12\">
              <p>CastMatch Casting Director Dashboard • Connected to live backend • {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export default CastingDirectorAppShadcn;