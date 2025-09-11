'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Star,
  TrendingUp,
  MapPin,
  Clock,
  Award,
  Target,
  Eye,
  Heart,
  Briefcase,
  Calendar,
  Filter,
  Search,
  Download,
  MoreVertical,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface TalentMetrics {
  totalTalent: number;
  activeProfiles: number;
  newSignups: number;
  averageRating: number;
  topPerformers: number;
  bookingRate: number;
}

interface TalentDistribution {
  category: string;
  count: number;
  percentage: number;
  growth: number;
  avgRating: number;
  avgBookings: number;
  color: string;
}

interface LocationData {
  city: string;
  talentCount: number;
  activeProjects: number;
  averageRate: number;
  growth: number;
}

interface TopTalent {
  id: string;
  name: string;
  avatar: string;
  category: string;
  rating: number;
  bookings: number;
  earnings: number;
  location: string;
  joinDate: string;
  lastActive: string;
  skills: string[];
  verified: boolean;
}

interface PerformanceMetric {
  label: string;
  value: number;
  unit: string;
  change: number;
  target: number;
}

export const TalentAnalytics: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('month');

  const talentMetrics: TalentMetrics = {
    totalTalent: 2847,
    activeProfiles: 2156,
    newSignups: 124,
    averageRating: 4.6,
    topPerformers: 285,
    bookingRate: 23.8,
  };

  const talentDistribution: TalentDistribution[] = [
    {
      category: 'Lead Actors',
      count: 487,
      percentage: 17.1,
      growth: 12.5,
      avgRating: 4.7,
      avgBookings: 3.2,
      color: '#3B82F6'
    },
    {
      category: 'Supporting Actors',
      count: 892,
      percentage: 31.3,
      growth: 8.3,
      avgRating: 4.5,
      avgBookings: 2.8,
      color: '#10B981'
    },
    {
      category: 'Character Artists',
      count: 634,
      percentage: 22.3,
      growth: 15.7,
      avgRating: 4.4,
      avgBookings: 4.1,
      color: '#F59E0B'
    },
    {
      category: 'Dancers',
      count: 298,
      percentage: 10.5,
      growth: 22.1,
      avgRating: 4.8,
      avgBookings: 5.3,
      color: '#EF4444'
    },
    {
      category: 'Voice Artists',
      count: 156,
      percentage: 5.5,
      growth: 18.9,
      avgRating: 4.6,
      avgBookings: 3.7,
      color: '#8B5CF6'
    },
    {
      category: 'Extras/Background',
      count: 380,
      percentage: 13.3,
      growth: 6.2,
      avgRating: 4.2,
      avgBookings: 6.8,
      color: '#6B7280'
    },
  ];

  const locationData: LocationData[] = [
    {
      city: 'Mumbai',
      talentCount: 1567,
      activeProjects: 34,
      averageRate: 85000,
      growth: 12.3
    },
    {
      city: 'Delhi',
      talentCount: 423,
      activeProjects: 8,
      averageRate: 72000,
      growth: 8.7
    },
    {
      city: 'Bangalore',
      talentCount: 298,
      activeProjects: 6,
      averageRate: 78000,
      growth: 15.2
    },
    {
      city: 'Chennai',
      talentCount: 245,
      activeProjects: 4,
      averageRate: 65000,
      growth: 9.8
    },
    {
      city: 'Hyderabad',
      talentCount: 178,
      activeProjects: 3,
      averageRate: 68000,
      growth: 18.5
    },
    {
      city: 'Pune',
      talentCount: 136,
      activeProjects: 2,
      averageRate: 71000,
      growth: 11.4
    },
  ];

  const topTalent: TopTalent[] = [
    {
      id: 'T001',
      name: 'Arjun Kapoor',
      avatar: '/api/placeholder/40/40',
      category: 'Lead Actor',
      rating: 4.9,
      bookings: 12,
      earnings: 1250000,
      location: 'Mumbai',
      joinDate: '2023-03-15',
      lastActive: '2 hours ago',
      skills: ['Method Acting', 'Action', 'Drama'],
      verified: true
    },
    {
      id: 'T002',
      name: 'Priya Sharma',
      avatar: '/api/placeholder/40/40',
      category: 'Lead Actress',
      rating: 4.8,
      bookings: 15,
      earnings: 1180000,
      location: 'Mumbai',
      joinDate: '2023-01-20',
      lastActive: '1 hour ago',
      skills: ['Drama', 'Romance', 'Dance'],
      verified: true
    },
    {
      id: 'T003',
      name: 'Vikram Singh',
      avatar: '/api/placeholder/40/40',
      category: 'Character Artist',
      rating: 4.7,
      bookings: 18,
      earnings: 890000,
      location: 'Delhi',
      joinDate: '2022-11-08',
      lastActive: '5 hours ago',
      skills: ['Comedy', 'Villain', 'Character'],
      verified: true
    },
    {
      id: 'T004',
      name: 'Meera Reddy',
      avatar: '/api/placeholder/40/40',
      category: 'Dancer',
      rating: 4.9,
      bookings: 22,
      earnings: 675000,
      location: 'Chennai',
      joinDate: '2023-02-12',
      lastActive: '3 hours ago',
      skills: ['Classical', 'Bollywood', 'Contemporary'],
      verified: true
    },
    {
      id: 'T005',
      name: 'Rohit Kumar',
      avatar: '/api/placeholder/40/40',
      category: 'Voice Artist',
      rating: 4.8,
      bookings: 28,
      earnings: 520000,
      location: 'Bangalore',
      joinDate: '2022-09-30',
      lastActive: '1 day ago',
      skills: ['Dubbing', 'Narration', 'Commercial'],
      verified: false
    },
  ];

  const performanceMetrics: PerformanceMetric[] = [
    {
      label: 'Profile Completion Rate',
      value: 87.3,
      unit: '%',
      change: 5.2,
      target: 90
    },
    {
      label: 'Response Time',
      value: 2.4,
      unit: 'hours',
      change: -12.3,
      target: 2
    },
    {
      label: 'Booking Acceptance',
      value: 78.9,
      unit: '%',
      change: 8.7,
      target: 80
    },
    {
      label: 'No-Show Rate',
      value: 3.2,
      unit: '%',
      change: -15.4,
      target: 5
    },
  ];

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    }
    return `₹${(amount / 1000).toFixed(0)}K`;
  };

  const getActivityStatus = (lastActive: string) => {
    if (lastActive.includes('hour')) {
      return { color: 'bg-green-500', label: 'Online' };
    } else if (lastActive.includes('day')) {
      return { color: 'bg-yellow-500', label: 'Recently Active' };
    } else {
      return { color: 'bg-gray-500', label: 'Offline' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Talent Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-blue-600">
                  <Users className="h-6 w-6" />
                </div>
                <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                  +{talentMetrics.newSignups} new
                </Badge>
              </div>
              
              <div className="mt-4">
                <h3 className="text-2xl font-bold text-gray-900">
                  {talentMetrics.totalTalent.toLocaleString()}
                </h3>
                <p className="text-sm text-gray-600 mt-1">Total Talent</p>
                <p className="text-xs text-gray-500 mt-2">
                  {talentMetrics.activeProfiles} active profiles
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-yellow-600">
                  <Star className="h-6 w-6" />
                </div>
                <div className="flex items-center text-sm">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="ml-1 font-medium text-green-600">+0.3</span>
                </div>
              </div>
              
              <div className="mt-4">
                <h3 className="text-2xl font-bold text-gray-900">
                  {talentMetrics.averageRating}/5
                </h3>
                <p className="text-sm text-gray-600 mt-1">Average Rating</p>
                <p className="text-xs text-gray-500 mt-2">
                  Based on {(talentMetrics.totalTalent * 0.7).toFixed(0)} reviews
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-green-600">
                  <Target className="h-6 w-6" />
                </div>
                <div className="flex items-center text-sm">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="ml-1 font-medium text-green-600">+2.1%</span>
                </div>
              </div>
              
              <div className="mt-4">
                <h3 className="text-2xl font-bold text-gray-900">
                  {talentMetrics.bookingRate}%
                </h3>
                <p className="text-sm text-gray-600 mt-1">Booking Rate</p>
                <p className="text-xs text-gray-500 mt-2">
                  Profile views to bookings
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-purple-600">
                  <Award className="h-6 w-6" />
                </div>
                <Badge variant="secondary" className="bg-purple-50 text-purple-700">
                  Top 10%
                </Badge>
              </div>
              
              <div className="mt-4">
                <h3 className="text-2xl font-bold text-gray-900">
                  {talentMetrics.topPerformers}
                </h3>
                <p className="text-sm text-gray-600 mt-1">Top Performers</p>
                <p className="text-xs text-gray-500 mt-2">
                  Rating 4.5+ & 5+ bookings
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Talent Distribution and Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Talent Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Talent Distribution by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {talentDistribution.map((category) => (
                <div key={category.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-3"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm text-gray-700">{category.category}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium text-gray-900">
                        {category.count}
                      </span>
                      <span className="text-xs text-green-600">
                        +{category.growth}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-4">
                      <span>Avg Rating: {category.avgRating}</span>
                      <span>Avg Bookings: {category.avgBookings}/month</span>
                    </div>
                    <span>{category.percentage}%</span>
                  </div>
                  <Progress value={category.percentage} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Geographic Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Geographic Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {locationData.map((location) => (
                <div key={location.city} className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-900">
                      {location.city}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {location.activeProjects} projects
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">
                        {location.talentCount}
                      </span>
                      <span className="text-xs text-green-600">
                        +{location.growth}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Avg Rate: {formatCurrency(location.averageRate)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Key Performance Indicators
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {performanceMetrics.map((metric) => (
              <div key={metric.label} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-700">{metric.label}</h4>
                  <div className="flex items-center text-xs">
                    {metric.change > 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                    ) : (
                      <TrendingUp className="h-3 w-3 text-red-500 mr-1 rotate-180" />
                    )}
                    <span className={cn(
                      "font-medium",
                      metric.change > 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {Math.abs(metric.change)}%
                    </span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-end space-x-1">
                    <span className="text-xl font-bold text-gray-900">
                      {metric.value}
                    </span>
                    <span className="text-sm text-gray-500">{metric.unit}</span>
                  </div>
                  <Progress 
                    value={(metric.value / metric.target) * 100} 
                    className="h-2" 
                  />
                  <p className="text-xs text-gray-500">
                    Target: {metric.target}{metric.unit}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Talent */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Award className="h-5 w-5 mr-2" />
              Top Performing Talent
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topTalent.map((talent, index) => (
              <motion.div
                key={talent.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={talent.avatar} alt={talent.name} />
                      <AvatarFallback>{talent.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white",
                      getActivityStatus(talent.lastActive).color
                    )} />
                    {talent.verified && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-medium text-gray-900">{talent.name}</h3>
                      <Badge variant="outline" className="text-xs">{talent.category}</Badge>
                    </div>
                    <div className="flex items-center space-x-4 mt-1">
                      <div className="flex items-center">
                        <Star className="h-3 w-3 text-yellow-400 mr-1" />
                        <span className="text-xs text-gray-600">{talent.rating}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 text-gray-400 mr-1" />
                        <span className="text-xs text-gray-600">{talent.bookings} bookings</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-3 w-3 text-gray-400 mr-1" />
                        <span className="text-xs text-gray-600">{talent.location}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 mt-2">
                      {talent.skills.slice(0, 3).map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {talent.skills.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{talent.skills.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(talent.earnings)}
                  </p>
                  <p className="text-xs text-gray-500">Total earnings</p>
                  <p className="text-xs text-gray-500">{talent.lastActive}</p>
                </div>

                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};