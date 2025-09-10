"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Users,
  Activity,
  Database,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Server,
  Globe,
  Clock,
  MessageSquare,
  Flag,
  Eye,
  UserCheck,
  UserX,
  Search,
  Filter,
  Download,
  Settings,
  BarChart3,
  PieChart,
  Monitor,
  Smartphone,
  Tablet,
  Zap,
  HardDrive,
  Cpu,
  Wifi,
} from "lucide-react";

interface SystemMetric {
  label: string;
  value: string;
  status: "healthy" | "warning" | "critical";
  change?: string;
}

interface UserStat {
  total: number;
  active: number;
  actors: number;
  castingDirectors: number;
  producers: number;
  newThisMonth: number;
}

interface ContentModerationItem {
  id: string;
  type: "profile" | "message" | "media" | "review";
  content: string;
  reportedBy: string;
  reportedAt: Date;
  status: "pending" | "approved" | "rejected";
  severity: "low" | "medium" | "high";
}

interface PlatformAnalytic {
  metric: string;
  value: number;
  change: number;
  trend: "up" | "down" | "stable";
}

interface AdminDashboardProps {
  adminName: string;
  userStats?: UserStat;
  systemMetrics?: SystemMetric[];
  moderationQueue?: ContentModerationItem[];
  platformAnalytics?: PlatformAnalytic[];
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  adminName,
  userStats = {
    total: 0,
    active: 0,
    actors: 0,
    castingDirectors: 0,
    producers: 0,
    newThisMonth: 0,
  },
  systemMetrics = [],
  moderationQueue = [],
  platformAnalytics = [],
}) => {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [selectedTimeRange, setSelectedTimeRange] = useState("7d");

  // Mock data for demonstration
  const defaultSystemMetrics: SystemMetric[] = [
    { label: "API Response Time", value: "245ms", status: "healthy", change: "-12ms" },
    { label: "Database Load", value: "67%", status: "warning", change: "+5%" },
    { label: "Server Uptime", value: "99.94%", status: "healthy", change: "+0.02%" },
    { label: "Error Rate", value: "0.23%", status: "healthy", change: "-0.05%" },
    { label: "Active Sessions", value: "2,847", status: "healthy", change: "+156" },
    { label: "Storage Usage", value: "78%", status: "warning", change: "+3%" },
  ];

  const defaultAnalytics: PlatformAnalytic[] = [
    { metric: "Daily Active Users", value: 2847, change: 12.5, trend: "up" },
    { metric: "New Registrations", value: 94, change: -3.2, trend: "down" },
    { metric: "Profile Views", value: 15420, change: 8.7, trend: "up" },
    { metric: "Auditions Scheduled", value: 342, change: 15.3, trend: "up" },
    { metric: "Messages Sent", value: 1256, change: -1.8, trend: "down" },
    { metric: "Platform Rating", value: 4.8, change: 0.2, trend: "up" },
  ];

  const metrics = systemMetrics.length > 0 ? systemMetrics : defaultSystemMetrics;
  const analytics = platformAnalytics.length > 0 ? platformAnalytics : defaultAnalytics;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-600 bg-green-100 dark:bg-green-900";
      case "warning":
        return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900";
      case "critical":
        return "text-red-600 bg-red-100 dark:bg-red-900";
      case "pending":
        return "text-blue-600 bg-blue-100 dark:bg-blue-900";
      case "approved":
        return "text-green-600 bg-green-100 dark:bg-green-900";
      case "rejected":
        return "text-red-600 bg-red-100 dark:bg-red-900";
      default:
        return "text-gray-600 bg-gray-100 dark:bg-gray-900";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low":
        return "border-l-green-500";
      case "medium":
        return "border-l-yellow-500";
      case "high":
        return "border-l-red-500";
      default:
        return "border-l-gray-500";
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).format(date);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            System overview and platform management
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
          <Button size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
              <div className={`p-1 rounded-full ${getStatusColor(metric.status)}`}>
                {metric.status === "healthy" && <CheckCircle className="h-3 w-3" />}
                {metric.status === "warning" && <AlertTriangle className="h-3 w-3" />}
                {metric.status === "critical" && <XCircle className="h-3 w-3" />}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              {metric.change && (
                <p className="text-xs text-muted-foreground">
                  {metric.change} from last hour
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* User Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{userStats.newThisMonth}</span> this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.active.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actors</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.actors.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {((userStats.actors / userStats.total) * 100).toFixed(1)}% of users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Casting Directors</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.castingDirectors.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {((userStats.castingDirectors / userStats.total) * 100).toFixed(1)}% of users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Producers</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.producers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {((userStats.producers / userStats.total) * 100).toFixed(1)}% of users
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Platform Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Platform Analytics</CardTitle>
                <CardDescription>Key metrics for the last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.map((analytic) => (
                    <div key={analytic.metric} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{analytic.metric}</p>
                        <p className="text-2xl font-bold">{analytic.value.toLocaleString()}</p>
                      </div>
                      <div
                        className={`flex items-center gap-1 text-sm ${
                          analytic.trend === "up"
                            ? "text-green-600"
                            : analytic.trend === "down"
                            ? "text-red-600"
                            : "text-gray-600"
                        }`}
                      >
                        {analytic.trend === "up" && <TrendingUp className="h-4 w-4" />}
                        {analytic.trend === "down" && <TrendingDown className="h-4 w-4" />}
                        {analytic.change > 0 ? "+" : ""}{analytic.change}%
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>System events and user actions</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                        <UserCheck className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">New user registration</p>
                        <p className="text-xs text-muted-foreground">Actor from Mumbai • 2 minutes ago</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                        <MessageSquare className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Support ticket created</p>
                        <p className="text-xs text-muted-foreground">Payment issue • 5 minutes ago</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900">
                        <Flag className="h-4 w-4 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Content reported</p>
                        <p className="text-xs text-muted-foreground">Profile image flagged • 12 minutes ago</p>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Device & Browser Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Device Usage</CardTitle>
                <CardDescription>User device preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Mobile</span>
                    </div>
                    <span className="text-sm font-medium">67%</span>
                  </div>
                  <Progress value={67} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Desktop</span>
                    </div>
                    <span className="text-sm font-medium">28%</span>
                  </div>
                  <Progress value={28} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tablet className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Tablet</span>
                    </div>
                    <span className="text-sm font-medium">5%</span>
                  </div>
                  <Progress value={5} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Geographic Distribution</CardTitle>
                <CardDescription>Top user locations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Mumbai</span>
                    <span className="text-sm font-medium">42%</span>
                  </div>
                  <Progress value={42} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Delhi</span>
                    <span className="text-sm font-medium">18%</span>
                  </div>
                  <Progress value={18} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Bangalore</span>
                    <span className="text-sm font-medium">12%</span>
                  </div>
                  <Progress value={12} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Others</span>
                    <span className="text-sm font-medium">28%</span>
                  </div>
                  <Progress value={28} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Score</CardTitle>
                <CardDescription>Overall system health</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-2">
                  <div className="text-4xl font-bold text-green-600">94</div>
                  <p className="text-sm text-muted-foreground">Excellent Performance</p>
                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between text-xs">
                      <span>API Speed</span>
                      <span>98/100</span>
                    </div>
                    <Progress value={98} className="h-1" />
                    <div className="flex justify-between text-xs">
                      <span>Reliability</span>
                      <span>96/100</span>
                    </div>
                    <Progress value={96} className="h-1" />
                    <div className="flex justify-between text-xs">
                      <span>Security</span>
                      <span>89/100</span>
                    </div>
                    <Progress value={89} className="h-1" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage platform users and roles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  Filter Users
                </Button>
                <Button variant="outline" size="sm">
                  <Search className="mr-2 h-4 w-4" />
                  Search Users
                </Button>
                <Button size="sm">
                  <UserCheck className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </div>
              
              {/* User table would go here - simplified for demo */}
              <div className="text-center py-8 text-muted-foreground">
                User management table will be implemented here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Moderation</CardTitle>
              <CardDescription>
                Review flagged content and maintain platform quality
              </CardDescription>
            </CardHeader>
            <CardContent>
              {moderationQueue.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {moderationQueue.map((item) => (
                      <div
                        key={item.id}
                        className={`border-l-4 ${getSeverityColor(item.severity)} p-4 rounded-lg bg-accent/20`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{item.type}</Badge>
                              <Badge
                                variant="secondary"
                                className={getStatusColor(item.status)}
                              >
                                {item.status}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={
                                  item.severity === "high"
                                    ? "border-red-500 text-red-700"
                                    : item.severity === "medium"
                                    ? "border-yellow-500 text-yellow-700"
                                    : "border-green-500 text-green-700"
                                }
                              >
                                {item.severity}
                              </Badge>
                            </div>
                            <p className="text-sm font-medium">{item.content}</p>
                            <p className="text-xs text-muted-foreground">
                              Reported by {item.reportedBy} • {formatDate(item.reportedAt)}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Eye className="mr-2 h-4 w-4" />
                              Review
                            </Button>
                            {item.status === "pending" && (
                              <>
                                <Button size="sm" variant="destructive">
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Reject
                                </Button>
                                <Button size="sm">
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Approve
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="mx-auto h-8 w-8 mb-2" />
                  <p>No content requiring moderation</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* System Resources */}
            <Card>
              <CardHeader>
                <CardTitle>System Resources</CardTitle>
                <CardDescription>Real-time resource utilization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">CPU Usage</span>
                    </div>
                    <span className="text-sm font-medium">34%</span>
                  </div>
                  <Progress value={34} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Memory</span>
                    </div>
                    <span className="text-sm font-medium">67%</span>
                  </div>
                  <Progress value={67} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Storage</span>
                    </div>
                    <span className="text-sm font-medium">78%</span>
                  </div>
                  <Progress value={78} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wifi className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Network I/O</span>
                    </div>
                    <span className="text-sm font-medium">23%</span>
                  </div>
                  <Progress value={23} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Error Monitoring */}
            <Card>
              <CardHeader>
                <CardTitle>Error Monitoring</CardTitle>
                <CardDescription>System errors and warnings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Database Connection Pool</AlertTitle>
                    <AlertDescription>
                      High connection usage detected. Consider scaling.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Critical Errors</span>
                      <span className="font-medium">0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Warnings</span>
                      <span className="font-medium text-yellow-600">3</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Info Messages</span>
                      <span className="font-medium">127</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* API Monitoring */}
          <Card>
            <CardHeader>
              <CardTitle>API Performance</CardTitle>
              <CardDescription>API endpoint response times and usage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">245ms</p>
                  <p className="text-sm text-muted-foreground">Avg Response Time</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">15.2k</p>
                  <p className="text-sm text-muted-foreground">Requests/Hour</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">99.94%</p>
                  <p className="text-sm text-muted-foreground">Uptime</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">0.23%</p>
                  <p className="text-sm text-muted-foreground">Error Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};