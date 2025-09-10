/**
 * Casting Director Dashboard - Main Interface
 * Complete casting management, talent search, and project oversight
 */

import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { requireAuth } from "@clerk/remix/ssr.server";
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
  MapPin
} from "lucide-react";
import { trpc } from "~/lib/trpc";

export const meta: MetaFunction = () => {
  return [
    { title: "Casting Director Dashboard - CastMatch" },
    { name: "description", content: "Manage your casting projects, discover talent, and streamline your workflow" },
  ];
};

export async function loader(args: LoaderFunctionArgs) {
  return requireAuth(args, () => {
    return json({
      user: {
        role: 'casting_director', // This would come from Clerk user metadata
      }
    });
  });
}

export default function CastingDirectorDashboard() {
  const { user } = useLoaderData<typeof loader>();

  // tRPC hooks for REAL data
  const healthQuery = trpc.health.check.useQuery();
  const dashboardStatsQuery = trpc.dashboard.getStats.useQuery();
  const recentProjectsQuery = trpc.dashboard.getRecentProjects.useQuery({ limit: 3 });
  const recentActivityQuery = trpc.dashboard.getRecentActivity.useQuery({ limit: 5 });
  const talentsQuery = trpc.talents.list.useQuery({ page: 1, limit: 6 });

  // REAL Dashboard stats from backend
  const stats = dashboardStatsQuery.data ? [
    { 
      label: "Active Projects", 
      value: dashboardStatsQuery.data.data.activeProjects.toString(), 
      icon: Film, 
      trend: dashboardStatsQuery.data.data.thisWeekTrend.projects + " this week" 
    },
    { 
      label: "Total Talent", 
      value: dashboardStatsQuery.data.data.totalTalents.toString(), 
      icon: Users, 
      trend: dashboardStatsQuery.data.data.thisWeekTrend.talents + " this week" 
    },
    { 
      label: "Pending Applications", 
      value: dashboardStatsQuery.data.data.pendingApplications.toString(), 
      icon: Calendar, 
      trend: dashboardStatsQuery.data.data.thisWeekTrend.applications 
    },
    { 
      label: "Response Rate", 
      value: dashboardStatsQuery.data.data.responseRate + "%", 
      icon: TrendingUp, 
      trend: dashboardStatsQuery.data.data.thisWeekTrend.responseRate 
    },
  ] : [
    { label: "Active Projects", value: "...", icon: Film, trend: "Loading..." },
    { label: "Total Talent", value: "...", icon: Users, trend: "Loading..." },
    { label: "Pending Applications", value: "...", icon: Calendar, trend: "Loading..." },
    { label: "Response Rate", value: "...", icon: TrendingUp, trend: "Loading..." },
  ];

  // REAL Recent projects data from backend
  const recentProjects = recentProjectsQuery.data?.data || [];

  // Quick actions
  const quickActions = [
    { label: "Post New Role", icon: Plus, href: "/dashboard/roles/new", color: "bg-green-500" },
    { label: "Search Talent", icon: Search, href: "/dashboard/talent/search", color: "bg-blue-500" },
    { label: "Review Applications", icon: Eye, href: "/dashboard/applications", color: "bg-purple-500" },
    { label: "Schedule Auditions", icon: Calendar, href: "/dashboard/auditions", color: "bg-orange-500" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-2xl font-bold text-indigo-600">
                CastMatch
              </Link>
              <span className="text-gray-400">|</span>
              <h1 className="text-xl font-semibold text-gray-900">Casting Director</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-gray-400 hover:text-gray-500">
                <MessageCircle className="h-6 w-6" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">3</span>
              </button>
              <div className="h-8 w-8 bg-indigo-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-semibold">CD</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Good morning, Director!</h2>
          <p className="text-gray-600">Here's what's happening with your casting projects today.</p>
          
          {/* System Status */}
          <div className="mt-4 flex items-center space-x-2">
            <div className={`h-3 w-3 rounded-full ${healthQuery.data?.status === 'healthy' ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-sm text-gray-500">
              System {healthQuery.data?.status === 'healthy' ? 'Online' : 'Checking...'}
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  to={action.href}
                  className="flex items-center p-4 bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow"
                >
                  <div className={`p-2 rounded-lg ${action.color} text-white mr-3`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-medium text-gray-900">{action.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <Icon className="h-8 w-8 text-indigo-600" />
                  <span className="text-sm text-green-600 font-medium">{stat.trend}</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
                <p className="text-gray-600 text-sm">{stat.label}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Projects */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Recent Projects</h3>
                <Link 
                  to="/dashboard/projects" 
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                >
                  View All
                </Link>
              </div>
              
              <div className="space-y-4">
                {recentProjects.map((project) => (
                  <div key={project.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">{project.title}</h4>
                        <p className="text-sm text-gray-600">{project.type}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        project.status === 'Casting' ? 'bg-green-100 text-green-800' :
                        project.status === 'Review' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {project.status}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <div className="flex items-center space-x-4">
                        <span>{project.rolesOpen} roles open</span>
                        <span>{project.applicants} applicants</span>
                      </div>
                      <span>Due: {new Date(project.deadline).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Featured Talent */}
          <div>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Featured Talent</h3>
                <Link 
                  to="/dashboard/talent/search" 
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                >
                  Search More
                </Link>
              </div>

              <div className="space-y-4">
                {talentsQuery.isLoading ? (
                  <div className="text-center py-4 text-gray-500">
                    <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Loading talent profiles...</p>
                  </div>
                ) : talentsQuery.data?.data?.slice(0, 3).map((talent: any) => (
                  <div key={talent.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50">
                    <div className="h-12 w-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {talent.name?.charAt(0) || 'A'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {talent.name || 'Actor Name'}
                      </p>
                      <div className="flex items-center text-xs text-gray-500 mt-1">
                        <MapPin className="h-3 w-3 mr-1" />
                        <span>{talent.location || 'Mumbai'}</span>
                        {talent.rating && (
                          <>
                            <Star className="h-3 w-3 ml-2 mr-1" />
                            <span>{talent.rating}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button className="p-1 text-gray-400 hover:text-red-500">
                      <Heart className="h-4 w-4" />
                    </button>
                  </div>
                )) || (
                  <div className="text-center py-4 text-gray-500">
                    <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No talent profiles found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* REAL Recent Activity */}
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {recentActivityQuery.isLoading ? (
                <div className="text-center py-4 text-gray-500">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Loading recent activity...</p>
                </div>
              ) : recentActivityQuery.data?.data?.length ? (
                recentActivityQuery.data.data.map((activity: any) => (
                  <div key={activity.id} className="flex items-center space-x-3 py-2">
                    <div className={`h-2 w-2 rounded-full ${
                      activity.status === 'pending' ? 'bg-green-400' :
                      activity.status === 'shortlisted' ? 'bg-blue-400' :
                      'bg-purple-400'
                    }`} />
                    <span className="text-sm text-gray-600 flex-1">
                      {activity.message}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(activity.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}