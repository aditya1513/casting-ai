/**
 * Main Layout for CastMatch Application
 * Replicates the navigation structure from src/main.tsx but with Remix routing
 */

import { Outlet, Link, useLocation } from '@remix-run/react';
import { MessageCircle, LayoutDashboard, Film } from 'lucide-react';

export default function Layout() {
  const location = useLocation();

  const navigation = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
    { id: 'projects', label: 'Projects', icon: Film, to: '/projects' },
    { id: 'chat', label: 'AI Assistant', icon: MessageCircle, to: '/chat' },
  ];

  // Determine active route
  const getActiveRoute = () => {
    if (location.pathname.startsWith('/dashboard')) return 'dashboard';
    if (location.pathname.startsWith('/projects')) return 'projects';
    if (location.pathname.startsWith('/chat')) return 'chat';
    return 'dashboard'; // default
  };

  const activeRoute = getActiveRoute();

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Top Navigation - Exact replica from Vite version */}
      <nav className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link to="/" className="text-2xl font-bold text-blue-400">
                🎬 CastMatch
              </Link>
              <div className="flex space-x-4">
                {navigation.map(nav => {
                  const Icon = nav.icon;
                  const isActive = activeRoute === nav.id;
                  
                  return (
                    <Link
                      key={nav.id}
                      to={nav.to}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-slate-700 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{nav.label}</span>
                    </Link>
                  );
                })}
              </div>
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
      </nav>

      {/* Main Content - Rendered by nested routes */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}