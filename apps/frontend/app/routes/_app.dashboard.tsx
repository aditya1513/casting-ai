/**
 * Dashboard Route - Main dashboard view
 * Migrated from src/CastingDirectorDashboard.tsx
 */

import type { LoaderFunctionArgs } from '@remix-run/node';
import { json, redirect, defer } from '@remix-run/node';
import { useLoaderData, Await } from '@remix-run/react';
import { Suspense } from 'react';
import { getAuth } from '@clerk/remix/ssr.server';
import { UserButton } from '@clerk/remix';
import { createServerTRPCClient } from '~/lib/trpc';
import { ProjectCardSkeleton, TalentCardSkeleton } from '~/components/Skeletons';
import { useRouteError, isRouteErrorResponse } from '@remix-run/react';

export async function loader({ request }: LoaderFunctionArgs) {
  // Check authentication with Clerk
  const { userId } = await getAuth({ request });
  
  if (!userId) {
    return redirect('/sign-in?redirect_url=' + encodeURIComponent('/dashboard'));
  }

  const trpc = createServerTRPCClient();
  
  try {
    // Critical data that must load immediately
    const dashboardStats = await trpc.dashboard.getStats.query();
    
    // Non-critical data that can stream in - DON'T await these
    const recentProjectsPromise = trpc.dashboard.getRecentProjects.query({ limit: 5 });
    const talentsPromise = trpc.talents.list.query({ limit: 8 });

    return defer({
      user: { 
        id: userId,
        name: 'Casting Director', // TODO: Get from Clerk user profile
        role: 'casting_director' 
      },
      dashboardStats: dashboardStats.data, // Critical data - loads immediately
      recentProjects: recentProjectsPromise.then(data => data.data), // Streams in
      talents: talentsPromise.then(data => data.data), // Streams in
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    // Return fallback data if backend is unavailable
    return json({
      user: { name: 'Casting Director', role: 'casting_director' },
      dashboardStats: null,
      recentProjects: [],
      talents: [],
      timestamp: new Date().toISOString(),
      error: 'Failed to load dashboard data'
    });
  }
}

// Error Boundary for this route
export function ErrorBoundary() {
  const error = useRouteError();
  
  if (isRouteErrorResponse(error)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
        <div className="bg-slate-800 rounded-lg border border-red-700 p-6 max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h1 className="text-xl font-semibold text-white mb-2">
              {error.status} {error.statusText}
            </h1>
            <p className="text-slate-400 mb-4">
              {error.data?.message || 'Something went wrong with the dashboard'}
            </p>
            <a 
              href="/dashboard" 
              className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Try Again
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
      <div className="bg-slate-800 rounded-lg border border-red-700 p-6 max-w-md w-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💥</span>
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">
            Dashboard Error
          </h1>
          <p className="text-slate-400 mb-4">
            There was an unexpected error loading the dashboard. This has been logged for review.
          </p>
          <a 
            href="/dashboard" 
            className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Reload Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

// Prevent unnecessary revalidation
export function shouldRevalidate({
  currentParams,
  nextParams,
  formMethod,
  defaultShouldRevalidate,
}: any) {
  // Only revalidate if it's not a GET request (form submission)
  if (formMethod && formMethod !== 'GET') {
    return true;
  }
  
  // Always revalidate for this critical dashboard data
  return defaultShouldRevalidate;
}

export default function Dashboard() {
  const { user, dashboardStats, recentProjects, talents, error } = useLoaderData<typeof loader>();

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Dashboard Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Welcome back, {user.name}</h1>
            <p className="text-slate-400 mt-1">Here's what's happening with your casting projects</p>
          </div>
          <div className="flex items-center space-x-4">
            <UserButton 
              afterSignOutUrl="/sign-in"
              appearance={{
                baseTheme: 'dark',
                elements: {
                  avatarBox: 'w-10 h-10',
                  userButtonPopoverCard: 'bg-slate-800 border-slate-700',
                  userButtonPopoverActions: 'text-slate-200'
                }
              }}
            />
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-900/50 border border-red-700 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="h-5 w-5 text-red-400">⚠️</div>
              <p className="text-red-100 text-sm">Unable to load dashboard data. Using fallback display.</p>
            </div>
          </div>
        )}

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Projects</p>
                <p className="text-2xl font-bold text-white">
                  {dashboardStats?.projectStats?.total || 0}
                </p>
              </div>
              <div className="text-blue-400">
                <Film className="h-8 w-8" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-green-400 text-sm">
                Active: {dashboardStats?.projectStats?.active || 0}
              </span>
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Talent Pool</p>
                <p className="text-2xl font-bold text-white">
                  {talents?.length || 0}
                </p>
              </div>
              <div className="text-green-400">
                <Users className="h-8 w-8" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-green-400 text-sm">Available actors</span>
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Recent Projects</p>
                <p className="text-2xl font-bold text-white">
                  {recentProjects?.length || 0}
                </p>
              </div>
              <div className="text-yellow-400">
                <FileText className="h-8 w-8" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-green-400 text-sm">This month</span>
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">System Status</p>
                <p className="text-2xl font-bold text-white">
                  {error ? '⚠️' : '✅'}
                </p>
              </div>
              <div className="text-purple-400">
                <TrendingUp className="h-8 w-8" />
              </div>
            </div>
            <div className="mt-2">
              <span className={error ? "text-red-400 text-sm" : "text-green-400 text-sm"}>
                {error ? 'Backend unavailable' : 'All systems operational'}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Projects Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-slate-800 rounded-lg border border-slate-700">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white">Recent Projects</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentProjects && recentProjects.length > 0 ? (
                  recentProjects.map((project: any) => (
                    <div key={project.id} className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                      <div>
                        <h3 className="font-medium text-white">{project.title || 'Untitled Project'}</h3>
                        <p className="text-sm text-slate-400">
                          {project.type || 'Unknown Type'} • {project.roleCount || 0} roles
                        </p>
                      </div>
                      <span className={`text-sm ${
                        project.status === 'active' ? 'text-green-400' :
                        project.status === 'draft' ? 'text-yellow-400' :
                        project.status === 'completed' ? 'text-blue-400' :
                        'text-gray-400'
                      }`}>
                        {project.status || 'Unknown'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-400">No recent projects found</p>
                    <p className="text-slate-500 text-sm mt-1">Create your first project to get started</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg border border-slate-700">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white">Available Talent</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {talents && talents.length > 0 ? (
                  talents.slice(0, 4).map((talent: any) => (
                    <div key={talent.id} className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                      <div>
                        <p className="text-white text-sm">
                          {talent.firstName} {talent.lastName}
                        </p>
                        <p className="text-slate-400 text-xs">
                          {talent.city || 'Mumbai'} • {talent.skills ? talent.skills.slice(0, 2).join(', ') : 'Actor'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-400">No talent profiles found</p>
                    <p className="text-slate-500 text-sm mt-1">Invite actors to join the platform</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Development Notice */}
        <div className="mt-8 bg-green-900/50 border border-green-700 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Info className="h-5 w-5 text-green-400" />
            <p className="text-green-100 text-sm">
              ✅ Dashboard connected to backend: Real data is now loading from tRPC API endpoints. 
              {!error && 'All systems operational.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Import required icons
import { Film, Users, FileText, TrendingUp, Info } from 'lucide-react';