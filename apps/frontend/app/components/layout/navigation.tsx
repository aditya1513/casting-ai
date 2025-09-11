import { useState } from 'react';
import { Link, useLocation } from '@remix-run/react';
// Temporarily disabled Clerk to get frontend working
// import { SignedIn, SignedOut, UserButton } from "@clerk/remix";
import { cn } from '~/lib/utils';
import { Film, Users, Calendar, User, Home, Briefcase, MessageSquare, Menu, X } from 'lucide-react';
import NotificationBell from '~/components/notifications/NotificationBell';

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'AI Chat', href: '/chat', icon: MessageSquare },
  { name: 'Actors', href: '/actors', icon: Users },
  { name: 'Projects', href: '/projects', icon: Film },
  { name: 'Auditions', href: '/auditions', icon: Calendar },
  { name: 'Jobs', href: '/jobs', icon: Briefcase },
];

export function Navigation() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <nav className="bg-slate-800/50 backdrop-blur-xl shadow-sm border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link
                to="/"
                className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
                onClick={closeMobileMenu}
              >
                CastMatch
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden sm:ml-6 lg:ml-8 sm:flex sm:space-x-4 lg:space-x-8">
              {navigation.map(item => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'inline-flex items-center px-2 lg:px-3 pt-1 border-b-2 text-sm font-medium transition-colors',
                      location.pathname === item.href
                        ? 'border-purple-500 text-white'
                        : 'border-transparent text-slate-300 hover:text-white hover:border-slate-300'
                    )}
                  >
                    <Icon className="w-4 h-4 mr-1 lg:mr-2" />
                    <span className="hidden lg:inline">{item.name}</span>
                    <span className="lg:hidden">{item.name.split(' ')[0]}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Desktop User Menu & Mobile Menu Button */}
          <div className="flex items-center space-x-2">
            {/* Notifications */}
            <NotificationBell />

            {/* User Profile Button */}
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">D</span>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="sm:hidden text-slate-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-700/50"
              aria-label="Toggle mobile menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          'sm:hidden transition-all duration-300 ease-in-out overflow-hidden',
          isMobileMenuOpen
            ? 'max-h-screen opacity-100 border-t border-slate-700'
            : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-2 pt-2 pb-3 space-y-1 bg-slate-800/80 backdrop-blur-xl">
          {navigation.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={closeMobileMenu}
                className={cn(
                  'flex items-center px-3 py-3 text-base font-medium transition-all duration-200 rounded-lg mx-2',
                  isActive
                    ? 'bg-purple-900/60 border-l-4 border-purple-500 text-white shadow-lg'
                    : 'text-slate-300 hover:bg-slate-700/60 hover:text-white active:bg-slate-600/60'
                )}
                role="menuitem"
              >
                <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                <span>{item.name}</span>
                {isActive && <div className="ml-auto w-2 h-2 bg-purple-400 rounded-full" />}
              </Link>
            );
          })}

          {/* Mobile User Section */}
          <div className="border-t border-slate-600 mt-4 pt-4 px-2">
            <div className="flex items-center w-full px-3 py-3 text-base font-medium text-slate-300">
              <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center mr-3">
                <span className="text-white text-xs font-medium">D</span>
              </div>
              <span>Demo User</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
