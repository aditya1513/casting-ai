'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle,
  Smartphone,
  Monitor,
  Tablet,
  BarChart3,
  Activity
} from 'lucide-react';
import { tourProgressManager, TourAnalytics } from '@/lib/onboarding/tour-progress';
import { UserRole, getTourByRole } from '@/lib/onboarding/tour-config';

interface TourMetrics {
  tourId: string;
  tourName: string;
  role: UserRole;
  analytics: TourAnalytics;
}

export const TourAnalyticsDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<TourMetrics[]>([]);
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all');
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');

  useEffect(() => {
    loadMetrics();
  }, [selectedRole, timeRange]);

  const loadMetrics = () => {
    const roles: UserRole[] = ['talent', 'casting_director', 'producer', 'agent'];
    const allMetrics: TourMetrics[] = [];

    roles.forEach(role => {
      if (selectedRole === 'all' || selectedRole === role) {
        const tour = getTourByRole(role);
        const analytics = tourProgressManager.getTourAnalytics(tour.id);
        
        allMetrics.push({
          tourId: tour.id,
          tourName: tour.name,
          role,
          analytics
        });
      }
    });

    setMetrics(allMetrics);
  };

  const calculateOverallMetrics = () => {
    const total = metrics.reduce((acc, m) => {
      return {
        completionRate: acc.completionRate + m.analytics.completionRate,
        avgTime: acc.avgTime + m.analytics.averageCompletionTime,
        totalUsers: acc.totalUsers + 100 // Mock data
      };
    }, { completionRate: 0, avgTime: 0, totalUsers: 0 });

    const count = metrics.length || 1;
    
    return {
      avgCompletionRate: total.completionRate / count,
      avgCompletionTime: total.avgTime / count,
      totalUsers: total.totalUsers
    };
  };

  const overall = calculateOverallMetrics();

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        type: 'spring',
        stiffness: 400,
        damping: 25
      }
    })
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Onboarding Tour Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track user engagement and optimize onboarding experiences
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as UserRole | 'all')}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg"
          >
            <option value="all">All Roles</option>
            <option value="talent">Talent</option>
            <option value="casting_director">Casting Director</option>
            <option value="producer">Producer</option>
            <option value="agent">Agent</option>
          </select>

          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg"
          >
            <option value="day">Last 24 Hours</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
            custom={0}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-300" />
              </div>
              <span className="text-sm text-gray-500">+12%</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {overall.totalUsers.toLocaleString()}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
              Total Users
            </p>
          </motion.div>

          <motion.div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
            custom={1}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-300" />
              </div>
              <span className="text-sm text-green-500">+5%</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {overall.avgCompletionRate.toFixed(1)}%
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
              Avg Completion Rate
            </p>
          </motion.div>

          <motion.div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
            custom={2}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Clock className="w-6 h-6 text-purple-600 dark:text-purple-300" />
              </div>
              <span className="text-sm text-gray-500">-18s</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {Math.floor(overall.avgCompletionTime / 60)}:{(overall.avgCompletionTime % 60).toString().padStart(2, '0')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
              Avg Completion Time
            </p>
          </motion.div>
        </div>

        {/* Tour Performance Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.tourId}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
              custom={index + 3}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {metric.tourName}
                  </h3>
                  <p className="text-sm text-gray-500 capitalize">
                    {metric.role.replace('_', ' ')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`
                    px-3 py-1 rounded-full text-xs font-medium
                    ${metric.analytics.completionRate > 70 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                      : metric.analytics.completionRate > 40
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                      : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'}
                  `}>
                    {metric.analytics.completionRate.toFixed(0)}% Complete
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-500 mb-2">
                  <span>Completion Progress</span>
                  <span>{metric.analytics.completionRate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${metric.analytics.completionRate}%` }}
                    transition={{ duration: 1, delay: index * 0.1 }}
                  />
                </div>
              </div>

              {/* Device Breakdown */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="flex justify-center mb-2">
                    <Smartphone className="w-5 h-5 text-gray-500" />
                  </div>
                  <p className="text-xs text-gray-500">Mobile</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {metric.analytics.deviceBreakdown.mobile || 0}%
                  </p>
                </div>
                <div className="text-center">
                  <div className="flex justify-center mb-2">
                    <Tablet className="w-5 h-5 text-gray-500" />
                  </div>
                  <p className="text-xs text-gray-500">Tablet</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {metric.analytics.deviceBreakdown.tablet || 0}%
                  </p>
                </div>
                <div className="text-center">
                  <div className="flex justify-center mb-2">
                    <Monitor className="w-5 h-5 text-gray-500" />
                  </div>
                  <p className="text-xs text-gray-500">Desktop</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {metric.analytics.deviceBreakdown.desktop || 0}%
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Engagement Insights */}
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Engagement Insights
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Most Completed Step
                </span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                Profile Setup
              </p>
              <p className="text-xs text-gray-500 mt-1">95% completion</p>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Highest Drop-off
                </span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                AI Features
              </p>
              <p className="text-xs text-gray-500 mt-1">32% drop rate</p>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Peak Engagement
                </span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                10:00 AM
              </p>
              <p className="text-xs text-gray-500 mt-1">Most tours started</p>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-5 h-5 text-purple-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Avg Interactions
                </span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                12.4
              </p>
              <p className="text-xs text-gray-500 mt-1">Per completed tour</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};