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
  User,
  Calendar,
  Clock,
  TrendingUp,
  Star,
  Award,
  Briefcase,
  Video,
  Camera,
  FileText,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Heart,
  Share2,
  Download,
  Upload,
  MapPin,
  Film,
  Sparkles,
  Target,
  BarChart3,
  ArrowUp,
  ArrowDown,
  BookOpen,
} from "lucide-react";

interface Audition {
  id: string;
  project: string;
  role: string;
  productionHouse: string;
  date: Date;
  time: string;
  location: string;
  type: "in-person" | "virtual" | "self-tape";
  status: "scheduled" | "completed" | "callback" | "rejected" | "selected";
}

interface Application {
  id: string;
  project: string;
  role: string;
  appliedDate: Date;
  status: "submitted" | "under-review" | "shortlisted" | "rejected" | "selected";
  productionHouse: string;
  projectType: "film" | "tv" | "web-series" | "commercial";
}

interface ProfileStat {
  views: number;
  favorites: number;
  shares: number;
  completeness: number;
}

interface CareerInsight {
  label: string;
  value: number | string;
  change?: number;
  trend?: "up" | "down" | "stable";
}

interface ActorDashboardProps {
  userName: string;
  userImage?: string;
  profileStats?: ProfileStat;
  auditions?: Audition[];
  applications?: Application[];
}

export const ActorDashboard: React.FC<ActorDashboardProps> = ({
  userName,
  userImage,
  profileStats = { views: 0, favorites: 0, shares: 0, completeness: 0 },
  auditions = [],
  applications = [],
}) => {
  const [selectedTab, setSelectedTab] = useState("overview");

  // Calculate statistics
  const stats = {
    profileCompleteness: profileStats.completeness,
    upcomingAuditions: auditions.filter((a) => a.status === "scheduled").length,
    totalApplications: applications.length,
    shortlisted: applications.filter((a) => a.status === "shortlisted").length,
    callbacks: auditions.filter((a) => a.status === "callback").length,
  };

  const careerInsights: CareerInsight[] = [
    { label: "Industry Rank", value: "#1,245", change: 120, trend: "up" },
    { label: "Skill Match", value: "87%", change: 5, trend: "up" },
    { label: "Response Rate", value: "72%", change: -3, trend: "down" },
    { label: "Booking Rate", value: "18%", change: 2, trend: "up" },
  ];

  const recommendedActions = [
    { icon: Camera, label: "Update Headshots", description: "Last updated 3 months ago" },
    { icon: Video, label: "Add Demo Reel", description: "Showcase your best work" },
    { icon: Award, label: "Add Certifications", description: "Display your training" },
    { icon: BookOpen, label: "Complete Acting Styles", description: "Help casting directors find you" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
      case "submitted":
        return "bg-blue-500";
      case "completed":
      case "under-review":
        return "bg-yellow-500";
      case "callback":
      case "shortlisted":
        return "bg-purple-500";
      case "selected":
        return "bg-green-500";
      case "rejected":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "selected":
        return <CheckCircle className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      case "callback":
      case "shortlisted":
        return <Star className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
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
      {/* Welcome Header with Profile Completion */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {userName}!</h1>
            <p className="text-muted-foreground">
              Track your auditions and grow your acting career
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export Resume
            </Button>
            <Button size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Upload Media
            </Button>
          </div>
        </div>

        {/* Profile Completion Alert */}
        {profileStats.completeness < 100 && (
          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertTitle>Complete Your Profile</AlertTitle>
            <AlertDescription>
              Your profile is {profileStats.completeness}% complete. A complete profile gets 3x more views from casting directors.
              <Button variant="link" className="px-1 h-auto">
                Complete now →
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profileStats.views}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12%</span> this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingAuditions}</div>
            <p className="text-xs text-muted-foreground">Auditions scheduled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalApplications}</div>
            <p className="text-xs text-muted-foreground">Active applications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shortlisted</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.shortlisted}</div>
            <p className="text-xs text-muted-foreground">For roles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Callbacks</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.callbacks}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="auditions">Auditions</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Upcoming Auditions */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Auditions</CardTitle>
                <CardDescription>Your scheduled auditions</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {auditions
                      .filter((a) => a.status === "scheduled")
                      .slice(0, 5)
                      .map((audition) => (
                        <div
                          key={audition.id}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                        >
                          <div className="space-y-1">
                            <h4 className="font-medium">{audition.role}</h4>
                            <p className="text-sm text-muted-foreground">{audition.project}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(audition.date)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {audition.time}
                              </span>
                              {audition.type === "virtual" && (
                                <Badge variant="secondary" className="text-xs">
                                  Virtual
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button size="sm" variant="outline">
                            Details
                          </Button>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Recent Applications */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Applications</CardTitle>
                <CardDescription>Track your application status</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {applications.slice(0, 5).map((application) => (
                      <div
                        key={application.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                      >
                        <div className="space-y-1">
                          <h4 className="font-medium">{application.role}</h4>
                          <p className="text-sm text-muted-foreground">
                            {application.project} • {application.productionHouse}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className={`${getStatusColor(application.status)} text-white`}
                            >
                              {getStatusIcon(application.status)}
                              <span className="ml-1">{application.status.replace("-", " ")}</span>
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Applied {formatDate(application.appliedDate)}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Profile Optimization Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Optimization</CardTitle>
              <CardDescription>Recommended actions to improve your visibility</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {recommendedActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <div
                      key={action.label}
                      className="flex flex-col items-center text-center space-y-2 p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                    >
                      <div className="p-3 rounded-full bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <h4 className="font-medium text-sm">{action.label}</h4>
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auditions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audition Schedule</CardTitle>
              <CardDescription>All your auditions in one place</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditions.map((audition) => (
                  <div
                    key={audition.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full ${getStatusColor(audition.status)} text-white`}>
                        <Film className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-semibold">{audition.project}</h4>
                        <p className="text-sm text-muted-foreground">
                          Role: {audition.role} • {audition.productionHouse}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(audition.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {audition.time}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {audition.location}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge
                        variant="secondary"
                        className={`${getStatusColor(audition.status)} text-white`}
                      >
                        {audition.status.replace("-", " ")}
                      </Badge>
                      <div className="flex gap-2">
                        {audition.status === "scheduled" && (
                          <>
                            <Button size="sm" variant="outline">
                              Reschedule
                            </Button>
                            <Button size="sm">
                              Prepare
                            </Button>
                          </>
                        )}
                        {audition.status === "callback" && (
                          <Button size="sm">
                            View Feedback
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Application History</CardTitle>
              <CardDescription>Track all your role applications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {applications.map((application) => (
                  <div
                    key={application.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full ${getStatusColor(application.status)} text-white`}>
                        {getStatusIcon(application.status)}
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-semibold">{application.project}</h4>
                        <p className="text-sm text-muted-foreground">
                          Role: {application.role} • {application.productionHouse}
                        </p>
                        <div className="flex items-center gap-3 text-sm">
                          <Badge variant="outline">
                            {application.projectType}
                          </Badge>
                          <span className="text-muted-foreground">
                            Applied {formatDate(application.appliedDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge
                        variant="secondary"
                        className={`${getStatusColor(application.status)} text-white`}
                      >
                        {application.status.replace("-", " ")}
                      </Badge>
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Career Insights */}
            <Card>
              <CardHeader>
                <CardTitle>Career Insights</CardTitle>
                <CardDescription>Your performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {careerInsights.map((insight) => (
                    <div key={insight.label} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{insight.label}</p>
                        <p className="text-2xl font-bold">{insight.value}</p>
                      </div>
                      {insight.trend && (
                        <div
                          className={`flex items-center gap-1 text-sm ${
                            insight.trend === "up"
                              ? "text-green-600"
                              : insight.trend === "down"
                              ? "text-red-600"
                              : "text-gray-600"
                          }`}
                        >
                          {insight.trend === "up" && <ArrowUp className="h-4 w-4" />}
                          {insight.trend === "down" && <ArrowDown className="h-4 w-4" />}
                          {insight.change && `${insight.change > 0 ? "+" : ""}${insight.change}%`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Profile Strength */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Strength</CardTitle>
                <CardDescription>Areas to improve your profile</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Profile Completeness</span>
                      <span>{profileStats.completeness}%</span>
                    </div>
                    <Progress value={profileStats.completeness} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Media Quality</span>
                      <span>75%</span>
                    </div>
                    <Progress value={75} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Skills & Training</span>
                      <span>60%</span>
                    </div>
                    <Progress value={60} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Portfolio Diversity</span>
                      <span>85%</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Personalized Recommendations</CardTitle>
              <CardDescription>Suggestions to advance your career</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                  <Target className="h-5 w-5 text-blue-600 mb-2" />
                  <h4 className="font-medium mb-1">Expand Your Range</h4>
                  <p className="text-sm text-muted-foreground">
                    Consider auditioning for comedy roles to diversify your portfolio
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                  <TrendingUp className="h-5 w-5 text-green-600 mb-2" />
                  <h4 className="font-medium mb-1">Trending Skills</h4>
                  <p className="text-sm text-muted-foreground">
                    Motion capture experience is in high demand for OTT productions
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800">
                  <Sparkles className="h-5 w-5 text-purple-600 mb-2" />
                  <h4 className="font-medium mb-1">Network Building</h4>
                  <p className="text-sm text-muted-foreground">
                    Connect with 5 more casting directors to increase opportunities
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};