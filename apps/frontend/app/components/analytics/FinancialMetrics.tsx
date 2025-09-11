'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Wallet,
  PieChart,
  BarChart3,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Clock,
  Users,
  Award,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FinancialData {
  totalRevenue: number;
  monthlyGrowth: number;
  averageProjectValue: number;
  commissionEarnings: number;
  outstandingPayments: number;
  conversionRate: number;
}

interface RevenueStream {
  name: string;
  amount: number;
  percentage: number;
  change: number;
  color: string;
}

interface ProjectFinancials {
  id: string;
  name: string;
  budget: number;
  commission: number;
  status: 'pending' | 'in_progress' | 'completed' | 'paid';
  dueDate: string;
  castingDirector: string;
}

export const FinancialMetrics: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  const financialData: FinancialData = {
    totalRevenue: 2847000, // ₹28.47L
    monthlyGrowth: 15.7,
    averageProjectValue: 185000, // ₹1.85L
    commissionEarnings: 427500, // ₹4.275L
    outstandingPayments: 156000, // ₹1.56L
    conversionRate: 23.8,
  };

  const revenueStreams: RevenueStream[] = [
    {
      name: 'Casting Commissions',
      amount: 1820000,
      percentage: 63.9,
      change: 12.5,
      color: '#3B82F6'
    },
    {
      name: 'Premium Subscriptions',
      amount: 567000,
      percentage: 19.9,
      change: 18.3,
      color: '#10B981'
    },
    {
      name: 'Featured Listings',
      amount: 298000,
      percentage: 10.5,
      change: 8.7,
      color: '#F59E0B'
    },
    {
      name: 'Training Programs',
      amount: 162000,
      percentage: 5.7,
      change: 24.1,
      color: '#8B5CF6'
    }
  ];

  const recentProjects: ProjectFinancials[] = [
    {
      id: 'P001',
      name: 'Mumbai Nights - Feature Film',
      budget: 2500000,
      commission: 375000,
      status: 'completed',
      dueDate: '2024-01-15',
      castingDirector: 'Priya Sharma'
    },
    {
      id: 'P002',
      name: 'Tech Tales - Web Series',
      budget: 1200000,
      commission: 180000,
      status: 'in_progress',
      dueDate: '2024-01-20',
      castingDirector: 'Rajesh Kumar'
    },
    {
      id: 'P003',
      name: 'Brand Campaign - Automobile',
      budget: 800000,
      commission: 120000,
      status: 'pending',
      dueDate: '2024-01-25',
      castingDirector: 'Anita Desai'
    },
    {
      id: 'P004',
      name: 'Fashion Week Commercial',
      budget: 600000,
      commission: 90000,
      status: 'paid',
      dueDate: '2024-01-10',
      castingDirector: 'Vikram Singh'
    }
  ];

  const monthlyFinancials = [
    { month: 'Aug', revenue: 2.1, commission: 0.42, projects: 12 },
    { month: 'Sep', revenue: 2.3, commission: 0.46, projects: 14 },
    { month: 'Oct', revenue: 2.6, commission: 0.52, projects: 16 },
    { month: 'Nov', revenue: 2.4, commission: 0.48, projects: 15 },
    { month: 'Dec', revenue: 2.8, commission: 0.56, projects: 18 },
  ];

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    }
    return `₹${(amount / 1000).toFixed(0)}K`;
  };

  const getStatusColor = (status: ProjectFinancials['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'paid':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-green-600">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div className="flex items-center text-sm">
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                  <span className="ml-1 font-medium text-green-600">
                    +{financialData.monthlyGrowth}%
                  </span>
                </div>
              </div>
              
              <div className="mt-4">
                <h3 className="text-2xl font-bold text-gray-900">
                  {formatCurrency(financialData.totalRevenue)}
                </h3>
                <p className="text-sm text-gray-600 mt-1">Total Revenue</p>
                <p className="text-xs text-gray-500 mt-2">This month</p>
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
                <div className="flex items-center text-blue-600">
                  <Target className="h-6 w-6" />
                </div>
                <div className="flex items-center text-sm">
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                  <span className="ml-1 font-medium text-green-600">+8.2%</span>
                </div>
              </div>
              
              <div className="mt-4">
                <h3 className="text-2xl font-bold text-gray-900">
                  {formatCurrency(financialData.averageProjectValue)}
                </h3>
                <p className="text-sm text-gray-600 mt-1">Avg Project Value</p>
                <p className="text-xs text-gray-500 mt-2">Per casting project</p>
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
                <div className="flex items-center text-purple-600">
                  <Wallet className="h-6 w-6" />
                </div>
                <div className="flex items-center text-sm">
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                  <span className="ml-1 font-medium text-green-600">+12.3%</span>
                </div>
              </div>
              
              <div className="mt-4">
                <h3 className="text-2xl font-bold text-gray-900">
                  {formatCurrency(financialData.commissionEarnings)}
                </h3>
                <p className="text-sm text-gray-600 mt-1">Commission Earnings</p>
                <p className="text-xs text-gray-500 mt-2">15% average rate</p>
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
                <div className="flex items-center text-orange-600">
                  <Clock className="h-6 w-6" />
                </div>
                <div className="flex items-center text-sm">
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                  <span className="ml-1 font-medium text-red-600">-5.2%</span>
                </div>
              </div>
              
              <div className="mt-4">
                <h3 className="text-2xl font-bold text-gray-900">
                  {formatCurrency(financialData.outstandingPayments)}
                </h3>
                <p className="text-sm text-gray-600 mt-1">Outstanding Payments</p>
                <p className="text-xs text-gray-500 mt-2">Avg 12 days overdue</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Revenue Streams and Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Revenue Streams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {revenueStreams.map((stream, index) => (
                <div key={stream.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-3"
                        style={{ backgroundColor: stream.color }}
                      />
                      <span className="text-sm text-gray-700">{stream.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(stream.amount)}
                      </span>
                      <span className="text-xs text-green-600">
                        +{stream.change}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Progress value={stream.percentage} className="flex-1 mr-3 h-2" />
                    <span className="text-xs text-gray-500 w-12 text-right">
                      {stream.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Monthly Financial Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyFinancials.map((month) => (
                <div key={month.month} className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-gray-700 w-8">
                      {month.month}
                    </span>
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
                        <span className="text-xs text-gray-600">
                          Revenue: ₹{month.revenue}Cr
                        </span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                        <span className="text-xs text-gray-600">
                          Commission: ₹{month.commission}Cr
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-900">
                      {month.projects}
                    </span>
                    <p className="text-xs text-gray-500">projects</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects Financial Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Recent Project Financials
            </CardTitle>
            <Button variant="outline" size="sm">
              View All Projects
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Project</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Budget</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Commission</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Due Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Casting Director</th>
                </tr>
              </thead>
              <tbody>
                {recentProjects.map((project) => (
                  <tr key={project.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{project.name}</p>
                        <p className="text-xs text-gray-500">ID: {project.id}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {formatCurrency(project.budget)}
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(project.commission)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {((project.commission / project.budget) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={cn("text-xs", getStatusColor(project.status))}>
                        {project.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {new Date(project.dueDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {project.castingDirector}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-700">Conversion Rate</h3>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <div className="space-y-2">
              <div className="flex items-end space-x-2">
                <span className="text-2xl font-bold text-gray-900">
                  {financialData.conversionRate}%
                </span>
                <span className="text-sm text-green-600 mb-1">+2.3%</span>
              </div>
              <Progress value={financialData.conversionRate} className="h-2" />
              <p className="text-xs text-gray-500">
                Leads to paid projects conversion
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-700">Payment Collection</h3>
              <Clock className="h-4 w-4 text-orange-500" />
            </div>
            <div className="space-y-2">
              <div className="flex items-end space-x-2">
                <span className="text-2xl font-bold text-gray-900">94.2%</span>
                <span className="text-sm text-green-600 mb-1">+1.8%</span>
              </div>
              <Progress value={94.2} className="h-2" />
              <p className="text-xs text-gray-500">
                On-time payment collection rate
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-700">Client Retention</h3>
              <Award className="h-4 w-4 text-purple-500" />
            </div>
            <div className="space-y-2">
              <div className="flex items-end space-x-2">
                <span className="text-2xl font-bold text-gray-900">89.7%</span>
                <span className="text-sm text-green-600 mb-1">+4.1%</span>
              </div>
              <Progress value={89.7} className="h-2" />
              <p className="text-xs text-gray-500">
                Repeat client engagement rate
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};