'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChatBubbleLeftIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  ChartBarIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import {
  ChatBubbleLeftIcon as ChatBubbleLeftIconSolid,
  MagnifyingGlassIcon as MagnifyingGlassIconSolid,
  CalendarIcon as CalendarIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
} from '@heroicons/react/24/solid';

const navigationItems = [
  {
    name: 'Chat',
    href: '/dashboard',
    icon: ChatBubbleLeftIcon,
    activeIcon: ChatBubbleLeftIconSolid,
    description: 'AI-powered casting conversations',
  },
  {
    name: 'Search Talent',
    href: '/dashboard/search',
    icon: MagnifyingGlassIcon,
    activeIcon: MagnifyingGlassIconSolid,
    description: 'Advanced talent discovery',
  },
  {
    name: 'Calendar',
    href: '/dashboard/calendar',
    icon: CalendarIcon,
    activeIcon: CalendarIconSolid,
    description: 'Audition scheduling',
  },
  {
    name: 'Analytics',
    href: '/dashboard/analytics',
    icon: ChartBarIcon,
    activeIcon: ChartBarIconSolid,
    description: 'Project insights',
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Cog6ToothIcon,
    activeIcon: Cog6ToothIconSolid,
    description: 'Account preferences',
  },
];

export default function Navigation() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="px-3 py-4" role="navigation" aria-label="Main navigation">
      <div className="space-y-1">
        {navigationItems.map(item => {
          const active = isActive(item.href);
          const Icon = active ? item.activeIcon : item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-150
                ${
                  active
                    ? 'bg-teal-50 text-teal-700 border-l-4 border-teal-500'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
              aria-current={active ? 'page' : undefined}
            >
              <Icon
                className={`mr-3 h-5 w-5 transition-colors duration-150 ${
                  active ? 'text-teal-500' : 'text-gray-400 group-hover:text-gray-500'
                }`}
                aria-hidden="true"
              />
              <div className="flex-1">
                <div className="font-medium">{item.name}</div>
                <div className={`text-xs ${active ? 'text-teal-600' : 'text-gray-500'}`}>
                  {item.description}
                </div>
              </div>

              {/* Active indicator */}
              {active && <div className="w-2 h-2 bg-teal-500 rounded-full" aria-hidden="true" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
