import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { getAuth } from "@clerk/remix/ssr.server";
import { redirect } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { useUser, UserProfile } from "@clerk/remix";
import { ArrowLeft, User, Mail, Calendar, Shield, Star, Settings } from "lucide-react";

export async function loader(args: LoaderFunctionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) {
    return redirect("/sign-in");
  }
  
  return { userId };
}

export const meta: MetaFunction = () => {
  return [
    { title: "Profile - CastMatch" },
    { name: "description", content: "Manage your CastMatch profile and account settings" },
  ];
};

export default function Profile() {
  const { user, isLoaded } = useUser();
  const data = useLoaderData<typeof loader>();
  
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-slate-200 mb-4">Access Denied</h1>
          <p className="text-slate-400 mb-4">Please sign in to access your profile.</p>
          <Link 
            to="/sign-in" 
            className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link 
                to="/dashboard" 
                className="flex items-center text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </div>
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-white">
                CastMatch
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
          <div className="flex items-center space-x-6">
            {/* Avatar */}
            <div className="relative">
              {user.imageUrl ? (
                <img 
                  src={user.imageUrl} 
                  alt={user.firstName || user.emailAddresses?.[0]?.emailAddress || 'User'}
                  className="w-20 h-20 rounded-full border-2 border-slate-600"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center">
                  <User className="w-8 h-8 text-slate-400" />
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 bg-green-500 w-6 h-6 rounded-full border-2 border-slate-800 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white mb-1">
                {user?.firstName && user?.lastName 
                  ? `${user.firstName} ${user.lastName}`
                  : user?.firstName || user?.emailAddresses?.[0]?.emailAddress || 'User'}
              </h1>
              <div className="flex items-center space-x-4 text-slate-400">
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-1" />
                  {user?.emailAddresses?.[0]?.emailAddress}
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Joined {new Date(user?.createdAt || '').toLocaleDateString()}
                </div>
                {user?.emailAddresses?.[0]?.verification?.status === 'verified' && (
                  <div className="flex items-center text-green-400">
                    <Shield className="w-4 h-4 mr-1" />
                    Verified
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center space-x-2">
              <button className="flex items-center px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors border border-slate-600">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </button>
            </div>
          </div>
        </div>

        {/* Profile Tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Profile Content */}
          <div className="lg:col-span-2">
            {/* Account Information */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Account Information
              </h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      First Name
                    </label>
                    <div className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-200">
                      {user?.firstName || 'Not provided'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Last Name
                    </label>
                    <div className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-200">
                      {user?.lastName || 'Not provided'}
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email Address
                  </label>
                  <div className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 flex items-center justify-between">
                    <span>{user?.emailAddresses?.[0]?.emailAddress}</span>
                    {user?.emailAddresses?.[0]?.verification?.status === 'verified' && (
                      <Shield className="w-4 h-4 text-green-400" />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    User ID
                  </label>
                  <div className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 font-mono text-sm">
                    {data.userId}
                  </div>
                </div>
              </div>
            </div>

            {/* Clerk UserProfile Component */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Profile Management
              </h2>
              <div className="clerk-profile-container">
                <UserProfile 
                  appearance={{
                    elements: {
                      rootBox: "w-full",
                      card: "bg-slate-900 border border-slate-700",
                      headerTitle: "text-slate-100",
                      headerSubtitle: "text-slate-400",
                      socialButtonsBlockButton: "bg-slate-700 border border-slate-600 hover:bg-slate-600",
                      formFieldInput: "bg-slate-700 border border-slate-600 text-slate-100",
                      formFieldLabel: "text-slate-300",
                      formButtonPrimary: "bg-indigo-600 hover:bg-indigo-700",
                      profileSectionTitle: "text-slate-200",
                      profileSectionContent: "text-slate-300",
                      navbar: "bg-slate-800 border-slate-700",
                      navbarButton: "text-slate-300 hover:text-slate-100",
                      navbarButtonIcon: "text-slate-400",
                      pageScrollBox: "bg-slate-900",
                      profilePage: "bg-slate-900",
                      profileSection: "bg-slate-800 border border-slate-700",
                      modalContent: "bg-slate-800 border border-slate-700",
                      modalCloseButton: "text-slate-400 hover:text-slate-200",
                      alertText: "text-slate-200",
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Stats */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Profile Stats</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Account Status</span>
                  <span className="text-green-400 flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    Active
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Profile Views</span>
                  <span className="text-slate-200">0</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Projects Applied</span>
                  <span className="text-slate-200">0</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Profile Rating</span>
                  <div className="flex items-center text-slate-200">
                    <Star className="w-4 h-4 text-yellow-400 mr-1" />
                    New
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              
              <div className="space-y-3">
                <Link 
                  to="/talents"
                  className="block w-full text-left px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors border border-slate-600"
                >
                  Browse Talents
                </Link>
                
                <button className="block w-full text-left px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors border border-slate-600">
                  Create Project
                </button>
                
                <button className="block w-full text-left px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors border border-slate-600">
                  View Applications
                </button>
                
                <Link 
                  to="/dashboard"
                  className="block w-full text-left px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}