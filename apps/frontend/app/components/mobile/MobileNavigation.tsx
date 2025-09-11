'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Home, 
  Search, 
  Users, 
  MessageSquare, 
  Calendar, 
  Briefcase, 
  User, 
  Settings,
  Film,
  Star,
  TrendingUp,
  Bell,
  Plus,
  Compass
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
  color?: string;
  roles?: string[];
}

interface MobileNavigationProps {
  userRole?: 'actor' | 'casting-director' | 'producer' | 'admin';
  notifications?: Record<string, number>;
  className?: string;
  variant?: 'bottom' | 'side' | 'floating';
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  userRole = 'actor',
  notifications = {},
  className,
  variant = 'bottom',
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Navigation items based on user role
  const getNavigationItems = (): NavigationItem[] => {
    const baseItems: NavigationItem[] = [
      {
        id: 'home',
        label: 'Home',
        icon: Home,
        href: '/dashboard',
        color: 'text-blue-500',
      },
      {
        id: 'discover',
        label: 'Discover',
        icon: Compass,
        href: '/discover',
        color: 'text-purple-500',
      },
      {
        id: 'chat',
        label: 'Chat',
        icon: MessageSquare,
        href: '/chat-v2',
        badge: notifications.messages || 0,
        color: 'text-green-500',
      },
      {
        id: 'profile',
        label: 'Profile',
        icon: User,
        href: '/profile',
        color: 'text-orange-500',
      },
    ];

    const roleSpecificItems: Record<string, NavigationItem[]> = {
      'actor': [
        {
          id: 'auditions',
          label: 'Auditions',
          icon: Calendar,
          href: '/auditions',
          badge: notifications.auditions || 0,
          color: 'text-red-500',
        },
        {
          id: 'opportunities',
          label: 'Jobs',
          icon: Briefcase,
          href: '/opportunities',
          badge: notifications.opportunities || 0,
          color: 'text-indigo-500',
        },
      ],
      'casting-director': [
        {
          id: 'talents',
          label: 'Talents',
          icon: Users,
          href: '/talents',
          color: 'text-yellow-500',
        },
        {
          id: 'projects',
          label: 'Projects',
          icon: Film,
          href: '/projects',
          badge: notifications.projects || 0,
          color: 'text-pink-500',
        },
      ],
      'producer': [
        {
          id: 'analytics',
          label: 'Analytics',
          icon: TrendingUp,
          href: '/analytics',
          color: 'text-emerald-500',
        },
        {
          id: 'projects',
          label: 'Projects',
          icon: Film,
          href: '/projects',
          badge: notifications.projects || 0,
          color: 'text-pink-500',
        },
      ],
      'admin': [
        {
          id: 'users',
          label: 'Users',
          icon: Users,
          href: '/admin/users',
          color: 'text-gray-500',
        },
        {
          id: 'settings',
          label: 'Settings',
          icon: Settings,
          href: '/admin/settings',
          color: 'text-slate-500',
        },
      ],
    };

    // Merge base items with role-specific items
    const allItems = [...baseItems];
    const roleItems = roleSpecificItems[userRole] || [];
    
    // Insert role-specific items before profile
    allItems.splice(-1, 0, ...roleItems);

    return allItems.slice(0, 5); // Limit to 5 items for mobile
  };

  const navigationItems = getNavigationItems();

  // Auto-hide navigation on scroll (for bottom variant)
  useEffect(() => {
    if (variant !== 'bottom') return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const isScrollingDown = currentScrollY > lastScrollY;
      const isScrolledFar = currentScrollY > 100;

      setIsVisible(!isScrollingDown || !isScrolledFar);
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, variant]);

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/' || pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  const getTotalNotifications = () => {
    return Object.values(notifications).reduce((sum, count) => sum + count, 0);
  };

  // Bottom navigation variant
  if (variant === 'bottom') {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.nav
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              'mobile-nav backdrop-blur-xl bg-background/90 border-t border-border/50',
              className
            )}
          >
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <motion.button
                  key={item.id}
                  onClick={() => handleNavigation(item.href)}
                  className={cn(
                    'mobile-nav-item relative group',
                    active && 'active'
                  )}
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="relative">
                    <Icon 
                      className={cn(
                        'h-5 w-5 transition-colors',
                        active ? item.color || 'text-primary' : 'text-muted-foreground'
                      )} 
                    />
                    
                    {/* Badge */}
                    {item.badge && item.badge > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="mobile-badge"
                      >
                        {item.badge > 99 ? '99+' : item.badge}
                      </motion.div>
                    )}

                    {/* Active indicator */}
                    {active && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full"
                      />
                    )}
                  </div>
                  
                  <span className={cn(
                    'mobile-nav-text transition-colors',
                    active ? 'text-primary font-medium' : 'text-muted-foreground'
                  )}>
                    {item.label}
                  </span>

                  {/* Ripple effect */}
                  <motion.div
                    className="absolute inset-0 rounded-lg bg-primary/10"
                    initial={{ scale: 0, opacity: 0 }}
                    whileTap={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                </motion.button>
              );
            })}
          </motion.nav>
        )}
      </AnimatePresence>
    );
  }

  // Floating FAB variant
  if (variant === 'floating') {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
      <div className="fixed bottom-20 right-4 z-50">
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="absolute bottom-16 right-0 bg-background border border-border rounded-2xl p-2 shadow-xl space-y-2 min-w-[200px]"
            >
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => {
                      handleNavigation(item.href);
                      setIsExpanded(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
                      active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                    )}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <Badge variant="secondary" className="ml-auto">
                        {item.badge}
                      </Badge>
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'mobile-fab relative',
            isExpanded && 'bg-accent text-accent-foreground'
          )}
          whileTap={{ scale: 0.9 }}
          animate={{ rotate: isExpanded ? 45 : 0 }}
        >
          <Plus className="h-6 w-6" />
          
          {getTotalNotifications() > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {getTotalNotifications() > 99 ? '99+' : getTotalNotifications()}
            </div>
          )}
        </motion.button>
      </div>
    );
  }

  // Side navigation variant (drawer style)
  if (variant === 'side') {
    return (
      <motion.nav
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        className={cn(
          'fixed left-0 top-0 h-full w-80 bg-background border-r border-border z-40 overflow-y-auto',
          className
        )}
      >
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-6">Navigation</h2>
          <div className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <motion.button
                  key={item.id}
                  onClick={() => handleNavigation(item.href)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
                    active 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                  )}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <Badge variant={active ? "secondary" : "default"} className="ml-auto">
                      {item.badge > 99 ? '99+' : item.badge}
                    </Badge>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.nav>
    );
  }

  return null;
};

// Navigation skeleton
export const MobileNavigationSkeleton: React.FC<{ variant?: 'bottom' | 'side' | 'floating' }> = ({
  variant = 'bottom'
}) => {
  if (variant === 'bottom') {
    return (
      <div className="mobile-nav">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="mobile-nav-item">
            <div className="mobile-skeleton w-5 h-5 rounded" />
            <div className="mobile-skeleton w-8 h-3 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'floating') {
    return (
      <div className="fixed bottom-20 right-4">
        <div className="mobile-skeleton w-14 h-14 rounded-full" />
      </div>
    );
  }

  return (
    <div className="fixed left-0 top-0 h-full w-80 bg-background border-r p-6">
      <div className="mobile-skeleton w-32 h-6 rounded mb-6" />
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <div className="mobile-skeleton w-5 h-5 rounded" />
            <div className="mobile-skeleton w-24 h-4 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
};