"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Users,
  Calendar,
  Clock,
  TrendingUp,
  Filter,
  Plus,
  ChevronRight,
  Star,
  MapPin,
  Briefcase,
  Video,
  FileText,
  MessageSquare,
  Bell,
  BarChart3,
  Eye,
  UserCheck,
  UserX,
  PlayCircle,
} from "lucide-react";

interface Project {
  id: string;
  title: string;
  type: "film" | "tv" | "web-series" | "commercial";
  status: "pre-production" | "casting" | "production" | "post-production";
  rolesOpen: number;
  rolesFilled: number;
  deadline: Date;
  budget: string;
}

interface RecentSearch {
  id: string;
  query: string;
  filters: string[];
  timestamp: Date;
  results: number;
}

interface UpcomingAudition {
  id: string;
  actorName: string;
  actorImage?: string;
  role: string;
  project: string;
  time: Date;
  location: string;
  type: "in-person" | "virtual" | "self-tape";
}

interface TeamNotification {
  id: string;
  type: "message" | "application" | "reminder" | "update";
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
}

interface CastingDirectorDashboardProps {
  userName: string;
  userImage?: string;
  projects?: Project[];
  recentSearches?: RecentSearch[];
  upcomingAuditions?: UpcomingAudition[];
  notifications?: TeamNotification[];
}

export const CastingDirectorDashboard: React.FC<CastingDirectorDashboardProps> = ({
  userName,
  userImage,
  projects = [],
  recentSearches = [],
  upcomingAuditions = [],
  notifications = [],
}) => {
  const [selectedTab, setSelectedTab] = useState("overview");

  const stats = {
    activeProjects: projects.filter((p) => p.status === "casting").length,
    totalRolesOpen: projects.reduce((sum, p) => sum + p.rolesOpen, 0),
    auditionsToday: upcomingAuditions.filter(
      (a) => new Date(a.time).toDateString() === new Date().toDateString()
    ).length,
    applicationsThisWeek: 127, // Mock data
  };

  const getProjectStatusColor = (status: Project["status"]) => {
    switch (status) {
      case "pre-production":
        return "bg-yellow-500";
      case "casting":
        return "bg-blue-500";
      case "production":
        return "bg-green-500";
      case "post-production":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const getProjectTypeIcon = (type: Project["type"]) => {
    switch (type) {
      case "film":
        return <Video className="h-4 w-4" />;
      case "tv":
        return <PlayCircle className="h-4 w-4" />;
      case "web-series":
        return <BarChart3 className="h-4 w-4" />;
      case "commercial":
        return <Briefcase className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }).format(date);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
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
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {userName}!</h1>
          <p className="text-muted-foreground">
            Here's what's happening with your casting projects
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProjects}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+2</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Roles</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRolesOpen}</div>
            <p className="text-xs text-muted-foreground">Across all projects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auditions Today</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.auditionsToday}</div>
            <p className="text-xs text-muted-foreground">Next at 2:00 PM</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.applicationsThisWeek}</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="auditions">Auditions</TabsTrigger>
          <TabsTrigger value="searches">Searches</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Active Projects */}
            <Card>
              <CardHeader>
                <CardTitle>Active Projects</CardTitle>
                <CardDescription>Projects currently in casting phase</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {projects
                      .filter((p) => p.status === "casting")
                      .slice(0, 5)
                      .map((project) => (
                        <div
                          key={project.id}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${getProjectStatusColor(project.status)} text-white`}>
                              {getProjectTypeIcon(project.type)}
                            </div>
                            <div>
                              <h4 className="font-medium">{project.title}</h4>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{project.rolesOpen} roles open</span>
                                <span>•</span>
                                <span>Deadline: {formatDate(project.deadline)}</span>
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Upcoming Auditions */}
            <Card>
              <CardHeader>
                <CardTitle>Today's Auditions</CardTitle>
                <CardDescription>Your audition schedule for today</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {upcomingAuditions.slice(0, 5).map((audition) => (
                      <div
                        key={audition.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={audition.actorImage} alt={audition.actorName} />
                            <AvatarFallback>{getInitials(audition.actorName)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-medium">{audition.actorName}</h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{audition.role}</span>
                              <span>•</span>
                              <span>{formatTime(audition.time)}</span>
                              {audition.type === "virtual" && (
                                <>
                                  <span>•</span>
                                  <Badge variant="secondary" className="text-xs">
                                    Virtual
                                  </Badge>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your team's latest updates and notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <div className="space-y-3">
                  {notifications.slice(0, 5).map((notification) => (
                    <div
                      key={notification.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        !notification.read ? "bg-accent/20" : ""
                      }`}
                    >
                      <div className="mt-1">
                        {notification.type === "message" && <MessageSquare className="h-4 w-4 text-blue-500" />}
                        {notification.type === "application" && <Users className="h-4 w-4 text-green-500" />}
                        {notification.type === "reminder" && <Clock className="h-4 w-4 text-yellow-500" />}
                        {notification.type === "update" && <Bell className="h-4 w-4 text-purple-500" />}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{notification.title}</h4>
                        <p className="text-sm text-muted-foreground">{notification.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTime(notification.timestamp)}
                        </p>
                      </div>
                      {!notification.read && (
                        <Badge variant="secondary" className="text-xs">
                          New
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Projects</CardTitle>
              <CardDescription>Manage your casting projects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project) => (
                  <Card key={project.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Badge className={getProjectStatusColor(project.status)}>
                          {project.status.replace("-", " ")}
                        </Badge>
                        {getProjectTypeIcon(project.type)}
                      </div>
                      <CardTitle className="text-lg">{project.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Casting Progress</span>
                            <span>{project.rolesFilled}/{project.rolesOpen + project.rolesFilled}</span>
                          </div>
                          <Progress
                            value={(project.rolesFilled / (project.rolesOpen + project.rolesFilled)) * 100}
                            className="h-2"
                          />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Budget</span>
                          <span className="font-medium">{project.budget}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Deadline</span>
                          <span className="font-medium">{formatDate(project.deadline)}</span>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                        <Button size="sm" className="flex-1">
                          <Users className="mr-2 h-4 w-4" />
                          Cast
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auditions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audition Schedule</CardTitle>
              <CardDescription>Manage your upcoming auditions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingAuditions.map((audition) => (
                  <div
                    key={audition.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={audition.actorImage} alt={audition.actorName} />
                        <AvatarFallback>{getInitials(audition.actorName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold">{audition.actorName}</h4>
                        <p className="text-sm text-muted-foreground">
                          Auditioning for: {audition.role} in {audition.project}
                        </p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(audition.time)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {audition.location}
                          </span>
                          <Badge variant={audition.type === "virtual" ? "secondary" : "outline"}>
                            {audition.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        Reschedule
                      </Button>
                      <Button size="sm">
                        View Profile
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="searches" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Searches</CardTitle>
              <CardDescription>Your talent search history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentSearches.map((search) => (
                  <div
                    key={search.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <h4 className="font-medium">{search.query}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          {search.filters.map((filter) => (
                            <Badge key={filter} variant="secondary" className="text-xs">
                              {filter}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{search.results} results</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(search.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <Button className="w-full mt-4" variant="outline">
                <Search className="mr-2 h-4 w-4" />
                New Talent Search
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};