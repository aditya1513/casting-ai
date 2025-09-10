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
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  Clock,
  BarChart3,
  PieChart,
  Activity,
  Film,
  Tv,
  PlayCircle,
  FileText,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  Target,
  Briefcase,
  Star,
  ArrowUp,
  ArrowDown,
  Plus,
} from "lucide-react";

interface Project {
  id: string;
  title: string;
  type: "film" | "tv" | "web-series" | "documentary" | "short-film";
  status: "development" | "pre-production" | "production" | "post-production" | "completed";
  budget: number;
  spent: number;
  startDate: Date;
  endDate: Date;
  castingProgress: number;
  teamSize: number;
  roi?: number;
}

interface BudgetItem {
  category: string;
  allocated: number;
  spent: number;
  remaining: number;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  department: string;
  avatar?: string;
  status: "active" | "pending" | "inactive";
}

interface PerformanceMetric {
  label: string;
  value: number;
  change: number;
  trend: "up" | "down" | "stable";
}

interface ProducerDashboardProps {
  userName: string;
  userImage?: string;
  productionHouse?: string;
  projects?: Project[];
  teamMembers?: TeamMember[];
}

export const ProducerDashboard: React.FC<ProducerDashboardProps> = ({
  userName,
  userImage,
  productionHouse = "Production House",
  projects = [],
  teamMembers = [],
}) => {
  const [selectedTab, setSelectedTab] = useState("portfolio");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Calculate statistics
  const stats = {
    totalProjects: projects.length,
    activeProjects: projects.filter((p) => 
      ["development", "pre-production", "production"].includes(p.status)
    ).length,
    totalBudget: projects.reduce((sum, p) => sum + p.budget, 0),
    totalSpent: projects.reduce((sum, p) => sum + p.spent, 0),
    averageROI: projects
      .filter((p) => p.roi)
      .reduce((sum, p, _, arr) => sum + (p.roi || 0) / arr.length, 0),
    teamSize: teamMembers.length,
  };

  const budgetBreakdown: BudgetItem[] = [
    { category: "Cast & Crew", allocated: 2500000, spent: 1800000, remaining: 700000 },
    { category: "Production", allocated: 3500000, spent: 2100000, remaining: 1400000 },
    { category: "Post-Production", allocated: 1500000, spent: 500000, remaining: 1000000 },
    { category: "Marketing", allocated: 1000000, spent: 200000, remaining: 800000 },
    { category: "Distribution", allocated: 500000, spent: 0, remaining: 500000 },
  ];

  const performanceMetrics: PerformanceMetric[] = [
    { label: "Production Efficiency", value: 87, change: 5, trend: "up" },
    { label: "Budget Utilization", value: 72, change: -3, trend: "down" },
    { label: "Schedule Adherence", value: 94, change: 2, trend: "up" },
    { label: "Team Productivity", value: 91, change: 0, trend: "stable" },
  ];

  const getProjectStatusColor = (status: Project["status"]) => {
    switch (status) {
      case "development":
        return "bg-gray-500";
      case "pre-production":
        return "bg-yellow-500";
      case "production":
        return "bg-blue-500";
      case "post-production":
        return "bg-purple-500";
      case "completed":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getProjectTypeIcon = (type: Project["type"]) => {
    switch (type) {
      case "film":
        return <Film className="h-4 w-4" />;
      case "tv":
        return <Tv className="h-4 w-4" />;
      case "web-series":
        return <PlayCircle className="h-4 w-4" />;
      case "documentary":
        return <FileText className="h-4 w-4" />;
      case "short-film":
        return <Film className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
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
          <h1 className="text-3xl font-bold">Producer Dashboard</h1>
          <p className="text-muted-foreground">
            {productionHouse} • Managing {stats.activeProjects} active projects
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <BarChart3 className="mr-2 h-4 w-4" />
            Reports
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalBudget)}</div>
            <p className="text-xs text-muted-foreground">
              Across all projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Spent</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalSpent)}</div>
            <Progress value={(stats.totalSpent / stats.totalBudget) * 100} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProjects}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalProjects - stats.activeProjects} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average ROI</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageROI.toFixed(1)}%</div>
            <p className="text-xs text-green-600">
              <ArrowUp className="inline h-3 w-3" /> 12% from last year
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Portfolio</CardTitle>
              <CardDescription>Overview of all your productions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project) => (
                  <Card 
                    key={project.id} 
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => setSelectedProject(project)}
                  >
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
                            <span>Budget Utilization</span>
                            <span>{((project.spent / project.budget) * 100).toFixed(0)}%</span>
                          </div>
                          <Progress
                            value={(project.spent / project.budget) * 100}
                            className="h-2"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Budget</p>
                            <p className="font-medium">{formatCurrency(project.budget)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Team Size</p>
                            <p className="font-medium">{project.teamSize} members</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Duration</span>
                          <span>{formatDate(project.startDate)} - {formatDate(project.endDate)}</span>
                        </div>
                        {project.roi && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">ROI</span>
                            <span className={`font-medium ${project.roi > 0 ? "text-green-600" : "text-red-600"}`}>
                              {project.roi > 0 ? "+" : ""}{project.roi}%
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Key performance indicators across projects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {performanceMetrics.map((metric) => (
                  <div key={metric.label} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{metric.label}</span>
                      <span className={`text-sm flex items-center gap-1 ${
                        metric.trend === "up" ? "text-green-600" : 
                        metric.trend === "down" ? "text-red-600" : 
                        "text-gray-600"
                      }`}>
                        {metric.trend === "up" && <ArrowUp className="h-3 w-3" />}
                        {metric.trend === "down" && <ArrowDown className="h-3 w-3" />}
                        {metric.change > 0 ? "+" : ""}{metric.change}%
                      </span>
                    </div>
                    <Progress value={metric.value} className="h-2" />
                    <p className="text-xs text-muted-foreground">{metric.value}% efficiency</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Budget Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Budget Allocation</CardTitle>
                <CardDescription>Distribution across categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {budgetBreakdown.map((item) => (
                    <div key={item.category} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{item.category}</span>
                        <span className="text-muted-foreground">
                          {formatCurrency(item.spent)} / {formatCurrency(item.allocated)}
                        </span>
                      </div>
                      <Progress 
                        value={(item.spent / item.allocated) * 100} 
                        className="h-2"
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{((item.spent / item.allocated) * 100).toFixed(0)}% used</span>
                        <span>{formatCurrency(item.remaining)} remaining</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Budget Tracking */}
            <Card>
              <CardHeader>
                <CardTitle>Budget Tracking</CardTitle>
                <CardDescription>Monthly spending overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">On Track</p>
                        <p className="text-sm text-muted-foreground">Budget spending within limits</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-green-600">72%</span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>This Month</span>
                      <span className="font-medium">{formatCurrency(450000)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Last Month</span>
                      <span className="font-medium">{formatCurrency(520000)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Monthly Average</span>
                      <span className="font-medium">{formatCurrency(480000)}</span>
                    </div>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Post-production budget needs review. Current spending at 85% with 2 months remaining.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Casting Budget */}
          <Card>
            <CardHeader>
              <CardTitle>Casting Budget Overview</CardTitle>
              <CardDescription>Budget allocation for talent and casting</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Lead Actors</p>
                  <p className="text-2xl font-bold">{formatCurrency(800000)}</p>
                  <Progress value={65} className="h-2" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Supporting Cast</p>
                  <p className="text-2xl font-bold">{formatCurrency(400000)}</p>
                  <Progress value={45} className="h-2" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Extras & Junior Artists</p>
                  <p className="text-2xl font-bold">{formatCurrency(150000)}</p>
                  <Progress value={30} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Coordination</CardTitle>
              <CardDescription>Manage your production team members</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={member.avatar} alt={member.name} />
                          <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium">{member.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {member.role} • {member.department}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            member.status === "active"
                              ? "default"
                              : member.status === "pending"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {member.status}
                        </Badge>
                        <Button size="sm" variant="ghost">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Department Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Direction</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8</div>
                <p className="text-xs text-muted-foreground">Team members</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Production</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">15</div>
                <p className="text-xs text-muted-foreground">Team members</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Post-Production</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">Team members</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Marketing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">6</div>
                <p className="text-xs text-muted-foreground">Team members</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Project Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Project Timeline</CardTitle>
                <CardDescription>Schedule overview for active projects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {projects.slice(0, 4).map((project) => (
                    <div key={project.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{project.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {Math.ceil(
                            (project.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                          )} days left
                        </Badge>
                      </div>
                      <div className="relative">
                        <Progress value={project.castingProgress} className="h-6" />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                          {project.castingProgress}% complete
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Success Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Success Metrics</CardTitle>
                <CardDescription>Historical performance data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Projects Completed</span>
                    </div>
                    <span className="font-bold">24</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Awards Won</span>
                    </div>
                    <span className="font-bold">7</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Box Office Success Rate</span>
                    </div>
                    <span className="font-bold">68%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Talent Discovered</span>
                    </div>
                    <span className="font-bold">142</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Platform Analytics */}
          <Card>
            <CardHeader>
              <CardTitle>Platform Analytics</CardTitle>
              <CardDescription>CastMatch platform usage statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold">1,245</p>
                  <p className="text-sm text-muted-foreground">Profiles Viewed</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">342</p>
                  <p className="text-sm text-muted-foreground">Auditions Scheduled</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">89</p>
                  <p className="text-sm text-muted-foreground">Talents Hired</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">4.8</p>
                  <p className="text-sm text-muted-foreground">Platform Rating</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Add missing Alert import
import { Alert, AlertDescription } from "@/components/ui/alert";