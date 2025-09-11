import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useUser,
} from '@clerk/react';
import type { AppRouter } from './types/trpc';

// Create tRPC React hooks
const trpc = createTRPCReact<AppRouter>();

// tRPC client with auth header
const createTRPCClientWithAuth = (getToken?: () => Promise<string | null>) => {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: 'http://localhost:3001/api/trpc',
        headers: async () => {
          const token = getToken ? await getToken() : null;
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
};

function DashboardContent() {
  const { user } = useUser();

  // Test the dashboard stats endpoint (protected)
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    error: dashboardError,
  } = trpc.dashboard.getStats.useQuery();

  // Test the talents endpoint (public)
  const {
    data: talentsData,
    isLoading: talentsLoading,
    error: talentsError,
  } = trpc.talents.list.useQuery({
    page: 1,
    limit: 3,
  });

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">🎬 CastMatch Dashboard</h1>
          <UserButton />
        </div>

        <div className="bg-slate-800 p-6 rounded-lg mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Welcome, {user?.firstName}!</h2>
          <p className="text-gray-300">Email: {user?.primaryEmailAddress?.emailAddress}</p>
          <p className="text-gray-300">User ID: {user?.id}</p>
        </div>

        {/* Dashboard Stats (Protected) */}
        <div className="bg-slate-800 p-6 rounded-lg mb-6">
          <h3 className="text-xl font-bold text-white mb-4">
            📊 Dashboard Stats (Protected Route)
          </h3>
          {dashboardLoading && <p className="text-gray-400">Loading dashboard stats...</p>}
          {dashboardError && <p className="text-red-400">❌ Error: {dashboardError.message}</p>}
          {dashboardData?.data && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {dashboardData.data.totalTalents}
                </div>
                <div className="text-sm text-gray-400">Total Talents</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {dashboardData.data.activeProjects}
                </div>
                <div className="text-sm text-gray-400">Active Projects</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {dashboardData.data.pendingApplications}
                </div>
                <div className="text-sm text-gray-400">Pending Applications</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {dashboardData.data.responseRate}%
                </div>
                <div className="text-sm text-gray-400">Response Rate</div>
              </div>
            </div>
          )}
        </div>

        {/* Talents List (Public) */}
        <div className="bg-slate-800 p-6 rounded-lg">
          <h3 className="text-xl font-bold text-white mb-4">🎭 Latest Talent (Public Route)</h3>
          {talentsLoading && <p className="text-gray-400">Loading talents...</p>}
          {talentsError && <p className="text-red-400">❌ Error: {talentsError.message}</p>}
          {talentsData?.data?.map((talent: any) => (
            <div key={talent.id} className="bg-slate-700 p-4 mb-3 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-lg font-semibold text-blue-400">{talent.name}</h4>
                  <p className="text-gray-300">📍 {talent.location}</p>
                  <p className="text-gray-300">
                    ⭐ {talent.rating}/5 | 🎯 {talent.experience}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Languages: {talent.languages?.join(', ')}</p>
                  <p className="text-sm text-gray-400">Skills: {talent.skills?.join(', ')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AuthApp() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [trpcClient] = useState(() => createTRPCClientWithAuth());

  const clerkPublishableKey =
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
    'pk_test_Y29oZXJlbnQtc3RhbGxpb24tNjYuY2xlcmsuYWNjb3VudHMuZGV2JA';

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <SignedOut>
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-white mb-8">🎬 CastMatch</h1>
                <p className="text-gray-400 mb-8">Mumbai's Premier Casting Platform</p>
                <SignInButton mode="modal">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors">
                    Sign In to Continue
                  </button>
                </SignInButton>
              </div>
            </div>
          </SignedOut>
          <SignedIn>
            <DashboardContent />
          </SignedIn>
        </QueryClientProvider>
      </trpc.Provider>
    </ClerkProvider>
  );
}

export default AuthApp;
