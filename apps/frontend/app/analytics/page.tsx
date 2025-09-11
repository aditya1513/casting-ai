'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
  Target,
  Clock,
  Star,
  Award,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  Zap,
  Filter,
  Download,
  RefreshCw,
  Eye,
  ArrowUp,
  ArrowDown,
  Minus,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { FinancialMetrics, TalentAnalytics } from '../components/analytics';

interface MetricCard {
  title: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: React.ReactNode;
  description?: string;
}

interface ChartData {
  name: string;
  value: number;
  change?: number;
  color?: string;
}

interface PredictiveInsight {
  id: string;
  type: 'opportunity' | 'risk' | 'trend' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  timeframe: string;
  actionItems?: string[];
}

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'talent' | 'projects' | 'financial' | 'predictions'>('overview');

  // Mock analytics data
  const keyMetrics: MetricCard[] = [
    {
      title: 'Total Talent Pool',
      value: '2,847',
      change: '+12.5%',
      changeType: 'increase',
      icon: <Users className="h-6 w-6" />,
      description: 'Active talent profiles'
    },
    {
      title: 'Active Projects',
      value: '48',
      change: '+8.2%',
      changeType: 'increase',
      icon: <Calendar className="h-6 w-6" />,
      description: 'Projects in casting phase'
    },
    {
      title: 'Match Success Rate',
      value: '87.3%',
      change: '+2.1%',
      changeType: 'increase',
      icon: <Target className="h-6 w-6" />,
      description: 'Successful talent matches'
    },
    {
      title: 'Revenue This Month',
      value: '₹18.4L',
      change: '+15.7%',
      changeType: 'increase',
      icon: <DollarSign className="h-6 w-6" />,
      description: 'Gross platform revenue'
    },
    {
      title: 'Avg. Casting Time',
      value: '12.4 days',
      change: '-18.3%',
      changeType: 'increase',
      icon: <Clock className="h-6 w-6" />,
      description: 'Time to complete casting'
    },
    {
      title: 'Talent Satisfaction',
      value: '4.6/5',
      change: '+0.3',
      changeType: 'increase',
      icon: <Star className="h-6 w-6" />,
      description: 'Average talent rating'
    },
  ];

  const talentDistribution: ChartData[] = [
    { name: 'Lead Actors', value: 487, color: '#3B82F6' },
    { name: 'Supporting Actors', value: 892, color: '#10B981' },
    { name: 'Character Artists', value: 634, color: '#F59E0B' },
    { name: 'Dancers', value: 298, color: '#EF4444' },
    { name: 'Voice Artists', value: 156, color: '#8B5CF6' },
    { name: 'Extras', value: 380, color: '#6B7280' },
  ];

  const projectTypes: ChartData[] = [
    { name: 'Feature Films', value: 18, change: 12 },
    { name: 'Web Series', value: 15, change: 8 },
    { name: 'TV Shows', value: 8, change: -3 },
    { name: 'Commercials', value: 7, change: 5 },
  ];

  const monthlyTrends = [
    { month: 'Jan', projects: 42, revenue: 15.2, matches: 312 },
    { month: 'Feb', projects: 38, revenue: 14.8, matches: 285 },
    { month: 'Mar', projects: 45, revenue: 17.1, matches: 334 },
    { month: 'Apr', projects: 52, revenue: 19.3, matches: 387 },
    { month: 'May', projects: 48, revenue: 18.4, matches: 361 },
  ];

  const predictiveInsights: PredictiveInsight[] = [
    {
      id: '1',
      type: 'opportunity',
      title: 'Rising Demand for Regional Content',
      description: 'Analytics show 34% increase in regional language project requests. Consider expanding talent pool in Marathi and Gujarati markets.',
      confidence: 89,
      impact: 'high',
      timeframe: 'Next 3 months',
      actionItems: [
        'Launch targeted recruitment in regional markets',
        'Partner with regional casting directors',
        'Create specialized regional content categories'
      ]
    },
    {
      id: '2',
      type: 'trend',
      title: 'OTT Platform Growth Surge',
      description: 'Web series casting requests up 156% YoY. Platform algorithms predict continued growth in streaming content.',
      confidence: 92,
      impact: 'high',
      timeframe: 'Next 6 months',
      actionItems: [
        'Prioritize OTT-experienced talent',
        'Develop streaming-specific casting workflows',
        'Create OTT talent showcase features'
      ]
    },
    {
      id: '3',
      type: 'risk',
      title: 'Seasonal Casting Slowdown',
      description: 'Historical data indicates 23% reduction in casting activity during monsoon season (June-August).',
      confidence: 76,
      impact: 'medium',
      timeframe: 'Next 2 months',
      actionItems: [
        'Plan marketing campaigns for pre-monsoon bookings',
        'Offer monsoon-period discounts',
        'Focus on indoor shoot projects'
      ]
    },
    {
      id: '4',
      type: 'recommendation',
      title: 'AI-Powered Talent Matching Optimization',
      description: 'Machine learning models suggest 23% improvement in match accuracy with additional data points.',
      confidence: 85,
      impact: 'high',
      timeframe: 'Next 4 months',
      actionItems: [
        'Implement enhanced talent profiling',
        'Add behavioral assessment metrics',
        'Integrate social media sentiment analysis'
      ]
    }
  ];

  const getChangeIcon = (type: 'increase' | 'decrease' | 'neutral') => {
    switch (type) {
      case 'increase':
        return <ArrowUp className="h-4 w-4 text-green-500" />;
      case 'decrease':
        return <ArrowDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getInsightIcon = (type: PredictiveInsight['type']) => {
    switch (type) {
      case 'opportunity':
        return <Zap className="h-5 w-5 text-yellow-500" />;
      case 'risk':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'trend':
        return <TrendingUp className="h-5 w-5 text-blue-500" />;
      case 'recommendation':
        return <Target className="h-5 w-5 text-green-500" />;
    }
  };

  const refreshData = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
  };

  const exportData = () => {
    // Mock export functionality
    console.log('Exporting analytics data...');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Predictive insights and performance metrics for CastMatch platform
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>
            
            <Button variant="outline" size="sm" onClick={exportData}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-8 mt-6">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'talent', label: 'Talent Analytics', icon: Users },
            { id: 'projects', label: 'Project Insights', icon: Calendar },
            { id: 'financial', label: 'Financial', icon: DollarSign },
            { id: 'predictions', label: 'Predictions', icon: Activity },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center px-1 py-2 border-b-2 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {keyMetrics.map((metric, index) => (
                <motion.div
                  key={metric.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-blue-600">
                          {metric.icon}
                        </div>
                        <div className="flex items-center text-sm">
                          {getChangeIcon(metric.changeType)}
                          <span className={cn(
                            "ml-1 font-medium",
                            metric.changeType === 'increase' ? "text-green-600" : 
                            metric.changeType === 'decrease' ? "text-red-600" : "text-gray-600"
                          )}>
                            {metric.change}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <h3 className="text-2xl font-bold text-gray-900">{metric.value}</h3>
                        <p className="text-sm text-gray-600 mt-1">{metric.title}</p>
                        {metric.description && (
                          <p className="text-xs text-gray-500 mt-2">{metric.description}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Talent Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PieChart className="h-5 w-5 mr-2" />
                    Talent Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {talentDistribution.map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-3"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-sm text-gray-700">{item.name}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900 mr-4">
                            {item.value}
                          </span>
                          <div className="w-20">
                            <Progress 
                              value={(item.value / Math.max(...talentDistribution.map(t => t.value))) * 100}
                              className="h-2"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Project Types */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Active Projects by Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {projectTypes.map((project) => (
                      <div key={project.name} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{project.name}</span>
                        <div className="flex items-center">
                          <span className="text-lg font-semibold text-gray-900 mr-3">
                            {project.value}
                          </span>
                          <div className="flex items-center">
                            {project.change && project.change > 0 ? (
                              <ArrowUp className="h-4 w-4 text-green-500" />
                            ) : (
                              <ArrowDown className="h-4 w-4 text-red-500" />
                            )}
                            <span className={cn(
                              "text-sm ml-1",
                              project.change && project.change > 0 ? "text-green-600" : "text-red-600"
                            )}>
                              {Math.abs(project.change || 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <LineChart className="h-5 w-5 mr-2" />
                  Monthly Performance Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Month</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Projects</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Revenue (₹L)</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Successful Matches</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyTrends.map((month) => (
                        <tr key={month.month} className="border-b border-gray-100">
                          <td className="py-3 px-4 text-sm text-gray-900">{month.month}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{month.projects}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{month.revenue}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{month.matches}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'talent' && (
          <TalentAnalytics />
        )}

        {activeTab === 'financial' && (
          <FinancialMetrics />
        )}

        {activeTab === 'predictions' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Predictive Analytics</h2>
                <p className="text-gray-600 mt-1">
                  AI-powered insights and recommendations for strategic planning
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <Activity className="h-3 w-3 mr-1" />
                  Live Predictions
                </Badge>
              </div>
            </div>

            <div className="grid gap-6">
              {predictiveInsights.map((insight, index) => (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={cn(
                    "border-l-4",
                    insight.type === 'opportunity' && "border-l-yellow-500",
                    insight.type === 'risk' && "border-l-red-500",
                    insight.type === 'trend' && "border-l-blue-500",
                    insight.type === 'recommendation' && "border-l-green-500"
                  )}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          {getInsightIcon(insight.type)}
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {insight.title}
                              </h3>
                              <Badge
                                variant={insight.impact === 'high' ? 'default' : 'secondary'}
                                className={cn(
                                  insight.impact === 'high' && "bg-red-100 text-red-800",
                                  insight.impact === 'medium' && "bg-yellow-100 text-yellow-800",
                                  insight.impact === 'low' && "bg-green-100 text-green-800"
                                )}
                              >
                                {insight.impact} impact
                              </Badge>
                            </div>
                            
                            <p className="text-gray-700 mb-4">{insight.description}</p>
                            
                            <div className="flex items-center space-x-6 text-sm text-gray-600 mb-4">
                              <div className="flex items-center">
                                <span className="font-medium">Confidence:</span>
                                <div className="ml-2 flex items-center">
                                  <Progress value={insight.confidence} className="w-16 h-2" />
                                  <span className="ml-2">{insight.confidence}%</span>
                                </div>
                              </div>
                              <div>
                                <span className="font-medium">Timeline:</span>
                                <span className="ml-1">{insight.timeframe}</span>
                              </div>
                            </div>

                            {insight.actionItems && insight.actionItems.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-900 mb-2">
                                  Recommended Actions:
                                </h4>
                                <ul className="space-y-1">
                                  {insight.actionItems.map((action, actionIndex) => (
                                    <li key={actionIndex} className="text-sm text-gray-600 flex items-start">
                                      <span className="text-blue-500 mr-2">•</span>
                                      {action}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Projects Analytics Placeholder */}
        {activeTab === 'projects' && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Project Analytics
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Detailed project analytics including casting timelines, success rates, and project performance metrics will be displayed here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}