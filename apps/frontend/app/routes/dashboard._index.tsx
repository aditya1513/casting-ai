import { useUser, UserButton } from "@clerk/remix";
import { getAuth } from "@clerk/remix/ssr.server";
import { redirect } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";

export async function loader(args: LoaderFunctionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) {
    return redirect("/sign-in");
  }
  
  return { userId };
}

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const data = useLoaderData<typeof loader>();
  
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Please sign in to access the dashboard.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-white">
                CastMatch
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-slate-300">
                Welcome, {user?.firstName || user?.emailAddresses?.[0]?.emailAddress}
              </span>
              <UserButton 
                appearance={{
                  elements: {
                    userButtonAvatarBox: "w-8 h-8",
                    userButtonPopoverCard: "bg-slate-800 border border-slate-700",
                    userButtonPopoverText: "text-slate-200",
                    userButtonPopoverActionButton: "text-slate-200 hover:bg-slate-700",
                  }
                }}
                afterSignOutUrl="/"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="text-white">
          <h1 className="text-3xl font-bold text-slate-100 mb-8">
            Dashboard
          </h1>
          
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-medium text-slate-100 mb-2">Search Talent</h3>
              <p className="text-slate-400 mb-4">Find actors for your next project</p>
              <Link 
                to="/talents" 
                className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Browse Talent
              </Link>
            </div>
            
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-medium text-slate-100 mb-2">AI Chat</h3>
              <p className="text-slate-400 mb-4">Get casting recommendations</p>
              <button 
                className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                disabled
              >
                Coming Soon
              </button>
            </div>
            
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-medium text-slate-100 mb-2">My Profile</h3>
              <p className="text-slate-400 mb-4">Manage your account and settings</p>
              <Link 
                to="/profile" 
                className="inline-block bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                View Profile
              </Link>
            </div>
          </div>

          {/* User Info */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-xl font-medium text-slate-100 mb-4">Account Information</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="text-slate-100">{user?.emailAddresses?.[0]?.emailAddress || 'Not provided'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Name:</span>
                <span className="text-slate-100">
                  {user?.firstName || user?.lastName 
                    ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
                    : 'Not provided'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Joined:</span>
                <span className="text-slate-100">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">User ID:</span>
                <span className="text-slate-100 text-sm font-mono">{data.userId}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}