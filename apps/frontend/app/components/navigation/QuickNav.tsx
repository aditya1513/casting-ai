'use client';

import React from 'react';
import Link from 'next/link';
import { 
  BarChart3, 
  Upload, 
  Users, 
  Calendar, 
  MessageSquare,
  Settings,
  Home
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface QuickNavItem {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  color: string;
}

export const QuickNav: React.FC = () => {
  const navItems: QuickNavItem[] = [
    {
      title: 'Dashboard',
      description: 'Main casting dashboard',
      href: '/',
      icon: <Home className="h-6 w-6" />,
      color: 'text-blue-600'
    },
    {
      title: 'Analytics',
      description: 'Performance insights & predictions',
      href: '/analytics',
      icon: <BarChart3 className="h-6 w-6" />,
      badge: 'Live',
      color: 'text-green-600'
    },
    {
      title: 'Script Upload',
      description: 'Upload & analyze scripts',
      href: '/script-upload',
      icon: <Upload className="h-6 w-6" />,
      badge: 'New',
      color: 'text-purple-600'
    },
    {
      title: 'Talent Pool',
      description: 'Browse talent profiles',
      href: '/talents',
      icon: <Users className="h-6 w-6" />,
      color: 'text-orange-600'
    },
    {
      title: 'Projects',
      description: 'Casting projects & campaigns',
      href: '/projects',
      icon: <Calendar className="h-6 w-6" />,
      color: 'text-teal-600'
    },
    {
      title: 'Chat',
      description: 'AI-powered casting assistant',
      href: '/chat',
      icon: <MessageSquare className="h-6 w-6" />,
      color: 'text-pink-600'
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Quick Navigation</h2>
        <p className="text-gray-600 mt-1">Access key features of the CastMatch platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 hover:border-gray-300">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className={`flex items-center ${item.color}`}>
                    {item.icon}
                  </div>
                  {item.badge && (
                    <Badge variant="secondary" className="bg-green-50 text-green-700 text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </div>
                
                <div className="mt-4">
                  <h3 className="text-lg font-medium text-gray-900">{item.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};