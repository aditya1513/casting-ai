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
  email: 'rajesh@castmatch.com',
};

function Header() {
  return (
    <header className="border-b bg-card sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="text-2xl font-bold text-primary">🎬 CastMatch</div>
            <span className="text-muted-foreground">|</span>
            <h1 className="text-xl font-semibold">Casting Director</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="relative">
              <MessageCircle className="h-6 w-6" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive rounded-full text-xs text-destructive-foreground flex items-center justify-center">
                3
              </span>
            </Button>
            <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-semibold">RK</span>
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
    { label: 'Post New Role', icon: Plus, variant: 'default' as const, action: 'post-role' },
    {
      label: 'Search Talent',
      icon: Search,
      variant: 'secondary' as const,
      action: 'search-talent',
    },
    { label: 'Review Applications', icon: Eye, variant: 'outline' as const, action: 'review-apps' },
    {
      label: 'Schedule Auditions',
      icon: Calendar,
      variant: 'default' as const,
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
      <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map(action => {
          const Icon = action.icon;
          return (
            <Button
              key={action.label}
              onClick={() => handleActionClick(action.action)}
              variant={action.variant}
              className="h-auto p-4 flex-col gap-2"
            >
              <Icon className="h-5 w-5" />
              <span className="text-sm font-medium">{action.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function StatsCards() {
  const stats = [
    { title: 'Active Projects', value: '12', change: '+2 this week', icon: Film, trend: 'up' },
    {
      title: 'Total Applications',
      value: '847',
      change: '+15% from last month',
      icon: Users,
      trend: 'up',
    },
    {
      title: 'Scheduled Auditions',
      value: '23',
      change: 'Next 7 days',
      icon: Calendar,
      trend: 'neutral',
    },
    {
      title: 'Success Rate',
      value: '94%',
      change: '+5% improvement',
      icon: TrendingUp,
      trend: 'up',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map(stat => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p
                className={cn(
                  'text-xs',
                  stat.trend === 'up'
                    ? 'text-green-600'
                    : stat.trend === 'down'
                      ? 'text-red-600'
                      : 'text-muted-foreground'
                )}
              >
                {stat.change}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function CastingDirectorDashboard() {
  // Fetch real talent data using tRPC
  const talentsQuery = trpc.talents.list.useQuery({ limit: 5 });
  const healthQuery = trpc.health.check.useQuery();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight">Welcome back, {mockUser.firstName}!</h2>
          <p className="text-muted-foreground">
            Here's what's happening with your casting projects today.
          </p>
          {healthQuery.data && (
            <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              ✅ Connected to CastMatch API • {healthQuery.data.environment}
            </div>
          )}
        </div>

        <QuickActions />
        <StatsCards />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Latest Talent Profiles</CardTitle>
              <CardDescription>
                {talentsQuery.data
                  ? `${talentsQuery.data.pagination.total} total talents in database`
                  : 'Loading talent profiles...'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {talentsQuery.isLoading
                  ? [1, 2, 3].map(i => (
                      <div
                        key={i}
                        className="flex items-center space-x-4 p-3 rounded-lg border animate-pulse"
                      >
                        <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))
                  : talentsQuery.data?.data.slice(0, 3).map(talent => (
                      <div
                        key={talent.id}
                        className="flex items-center space-x-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Star className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{talent.stageName || talent.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {talent.city}, {talent.state} • {talent.experience}
                          </p>
                          <div className="text-xs text-muted-foreground mt-1">
                            ⭐ {talent.rating}/5 • {talent.skills.slice(0, 2).join(', ')}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Auditions</CardTitle>
              <CardDescription>Scheduled auditions for this week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center space-x-4 p-3 rounded-lg border">
                    <div className="h-10 w-10 bg-blue-500/10 rounded-full flex items-center justify-center">
                      <Clock className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Audition Session {i}</p>
                      <p className="text-sm text-muted-foreground">Tomorrow, 2:00 PM</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Calendar className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

// Main app with tRPC provider
export default function CastingDirectorApp() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <CastingDirectorDashboard />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
