"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  Clock,
  TrendingUp,
  Star,
  Eye,
  Users,
  Briefcase,
  ChevronRight,
  Plus,
  Filter,
  Search,
  Bell,
  MessageSquare,
  BarChart3,
  Activity,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Zap,
} from "lucide-react";

interface MobileDashboardProps {
  userRole: "actor" | "casting-director" | "producer" | "admin";
  userName: string;
  userImage?: string;
  stats?: Record<string, number>;
  recentActivity?: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: Date;
    icon?: React.ComponentType<{ className?: string }>;
  }>;
  quickActions?: Array<{
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    href: string;
    badge?: number;
  }>;
}

export const MobileDashboard: React.FC<MobileDashboardProps> = ({
  userRole,
  userName,
  userImage,
  stats = {},
  recentActivity = [],
  quickActions = [],
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startY = useRef<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Pull-to-refresh functionality
  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollRef.current && scrollRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling) return;

    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, Math.min(120, currentY - startY.current));
    setPullDistance(distance);

    // Prevent default scroll if pulling down
    if (distance > 0) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 60 && !refreshing) {
      handleRefresh();
    }
    setIsPulling(false);
    setPullDistance(0);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1500));
    setRefreshing(false);
  };

  // Default stats based on role
  const getDefaultStats = () => {
    switch (userRole) {
      case "actor":
        return {
          "Profile Views": 1245,
          "Auditions": 8,
          "Applications": 23,
          "Callbacks": 3,
        };
      case "casting-director":
        return {
          "Active Projects": 5,
          "Open Roles": 18,
          "Auditions Today": 12,
          "Applications": 187,
        };
      case "producer":
        return {
          "Projects": 3,
          "Budget Used": 72,
          "Team Members": 28,
          "ROI": 15,
        };
      default:
        return {
          "Total Users": 15420,
          "Active Projects": 89,
          "System Health": 98,
          "Revenue": 24,
        };
    }
  };

  const defaultStats = { ...getDefaultStats(), ...stats };

  const getStatIcon = (label: string) => {
    switch (label.toLowerCase()) {
      case "profile views":
      case "views":
        return Eye;
      case "auditions":
      case "auditions today":
        return Calendar;
      case "applications":
        return Briefcase;
      case "callbacks":
        return Star;
      case "active projects":
      case "projects":
        return BarChart3;
      case "team members":
      case "total users":
        return Users;
      case "system health":
        return Activity;
      default:
        return TrendingUp;
    }
  };

  const formatStatValue = (label: string, value: number) => {
    if (label.toLowerCase().includes("budget") || label.toLowerCase().includes("revenue")) {
      return `${value}%`;
    }
    if (label.toLowerCase().includes("health") || label.toLowerCase().includes("roi")) {
      return `${value}%`;
    }
    return value.toLocaleString();
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  return (
    <div 
      className="min-h-screen bg-background overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {(isPulling || refreshing) && (
        <div 
          className="absolute top-0 left-0 right-0 z-20 flex items-center justify-center bg-background/90 backdrop-blur transition-all duration-200"
          style={{ 
            height: refreshing ? '60px' : `${pullDistance}px`,
            opacity: refreshing ? 1 : Math.min(1, pullDistance / 60)
          }}
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : pullDistance > 60 ? 'Release to refresh' : 'Pull to refresh'}
          </div>
        </div>
      )}

      <div 
        ref={scrollRef}
        className="h-screen overflow-y-auto overscroll-y-contain"
        style={{ 
          transform: isPulling ? `translateY(${pullDistance}px)` : 'translateY(0)',
          transition: isPulling ? 'none' : 'transform 0.2s ease-out'
        }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={userImage} alt={userName} />
                <AvatarFallback>{getInitials(userName)}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="font-semibold text-lg leading-none">Welcome back!</h1>
                <p className="text-sm text-muted-foreground capitalize">
                  {userRole.replace("-", " ")}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="p-2">
                <Search className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" className="p-2 relative">
                <Bell className="h-5 w-5" />
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
                >
                  3
                </Badge>
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6 pb-20">
          {/* Key Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(defaultStats).map(([label, value], index) => {
              const Icon = getStatIcon(label);
              const change = Math.floor(Math.random() * 20) - 10; // Mock change data
              
              return (
                <Card key={label} className="relative overflow-hidden">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div 
                        className={`flex items-center text-xs ${
                          change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-muted-foreground'
                        }`}
                      >
                        {change > 0 ? <ArrowUp className="h-3 w-3" /> : change < 0 ? <ArrowDown className="h-3 w-3" /> : null}
                        {change !== 0 && `${Math.abs(change)}%`}
                      </div>
                    </div>
                    <div className="text-2xl font-bold leading-none mb-1">
                      {formatStatValue(label, value)}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{label}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick Actions */}
          {quickActions.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-0 pb-4">
                <ScrollArea className="w-full whitespace-nowrap">
                  <div className="flex gap-3 px-4">
                    {quickActions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <Button
                          key={action.id}
                          variant="outline"
                          className="flex-shrink-0 h-auto flex-col w-20 p-3 gap-2 relative"
                          onClick={() => window.location.href = action.href}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="text-xs leading-tight">{action.label}</span>
                          {action.badge && action.badge > 0 && (
                            <Badge
                              variant="destructive"
                              className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
                            >
                              {action.badge}
                            </Badge>
                          )}
                        </Button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Today's Focus */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Today's Focus</CardTitle>
                <Badge variant="secondary">3 tasks</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                <div className="p-2 rounded-full bg-blue-500 text-white">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Audition at 2:00 PM</p>
                  <p className="text-xs text-muted-foreground">Lead role - Web Series</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                <div className="p-2 rounded-full bg-green-500 text-white">
                  <Star className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Follow up on callbacks</p>
                  <p className="text-xs text-muted-foreground">2 pending responses</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                <div className="p-2 rounded-full bg-purple-500 text-white">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Update portfolio</p>
                  <p className="text-xs text-muted-foreground">Add recent headshots</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Activity</CardTitle>
                <Button variant="ghost" size="sm" className="text-xs">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.slice(0, 5).map((activity) => {
                    const Icon = activity.icon || Clock;
                    return (
                      <div key={activity.id} className="flex items-start gap-3">
                        <div className="p-1.5 rounded-full bg-accent">
                          <Icon className="h-3 w-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm leading-tight">{activity.title}</p>
                          <p className="text-xs text-muted-foreground leading-tight">
                            {activity.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatTimeAgo(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Insight (for actors) */}
          {userRole === "actor" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">This Week's Performance</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Profile Views</span>
                    <span className="font-medium">+23%</span>
                  </div>
                  <Progress value={73} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Application Response Rate</span>
                    <span className="font-medium">68%</span>
                  </div>
                  <Progress value={68} className="h-2" />
                </div>
                
                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Your profile is performing 15% better than last week!
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};