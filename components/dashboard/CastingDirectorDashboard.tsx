"use client"

import React, { useState } from "react"
import { 
  Film, Users, Calendar, Search, TrendingUp, Clock, CheckCircle, 
  AlertCircle, MoreHorizontal, Plus, Filter, Download, Bell,
  BarChart3, Target, Award, Briefcase, Star, ArrowUpRight, ArrowDownRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

interface Project {
  id: string
  title: string
  type: "Film" | "TV Series" | "Web Series" | "Commercial" | "Theatre"
  status: "Casting" | "In Production" | "Pre-Production" | "Post-Production" | "Completed"
  progress: number
  deadline: Date
  rolesCount: number
  applicationsCount: number
  budget?: string
}

interface RecentSearch {
  id: string
  query: string
  timestamp: Date
  resultsCount: number
}

interface Notification {
  id: string
  type: "application" | "message" | "deadline" | "system"
  title: string
  description: string
  timestamp: Date
  read: boolean
}

interface TeamMember {
  id: string
  name: string
  role: string
  avatar?: string
  status: "online" | "offline" | "busy"
}

interface CastingDirectorDashboardProps {
  userName?: string
  projects?: Project[]
  recentSearches?: RecentSearch[]
  notifications?: Notification[]
  teamMembers?: TeamMember[]
}

export const CastingDirectorDashboard: React.FC<CastingDirectorDashboardProps> = ({
  userName = "Casting Director",
  projects = [],
  recentSearches = [],
  notifications = [],
  teamMembers = []
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState("week")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProjectFilter, setSelectedProjectFilter] = useState("all")

  // Mock statistics
  const stats = {
    activeProjects: projects.filter(p => p.status === "Casting").length,
    totalApplications: projects.reduce((sum, p) => sum + p.applicationsCount, 0),
    rolesFilledThisWeek: 12,
    upcomingAuditions: 8,
    conversionRate: 24.5,
    averageTimeToFill: 14
  }

  const getStatusColor = (status: Project["status"]) => {
    switch (status) {
      case "Casting": return "text-green-600 bg-green-50"
      case "In Production": return "text-blue-600 bg-blue-50"
      case "Pre-Production": return "text-yellow-600 bg-yellow-50"
      case "Post-Production": return "text-purple-600 bg-purple-50"
      case "Completed": return "text-gray-600 bg-gray-50"
      default: return "text-gray-600 bg-gray-50"
    }
  }

  const filteredProjects = projects.filter(project => {
    if (selectedProjectFilter === "all") return true
    return project.status === selectedProjectFilter
  })

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {userName}</h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your casting projects today
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Film className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProjects}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 inline-flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                2 new this week
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalApplications}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 inline-flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                12% from last month
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Auditions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingAuditions}</div>
            <p className="text-xs text-muted-foreground">
              Next in 2 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-red-600 inline-flex items-center">
                <ArrowDownRight className="h-3 w-3 mr-1" />
                3% from last week
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="searches">Searches</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-[250px]"
              />
              <Select value={selectedProjectFilter} onValueChange={setSelectedProjectFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  <SelectItem value="Casting">Casting</SelectItem>
                  <SelectItem value="In Production">In Production</SelectItem>
                  <SelectItem value="Pre-Production">Pre-Production</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Active Projects</CardTitle>
              <CardDescription>
                Manage your ongoing casting projects and track progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {filteredProjects.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No projects found
                    </div>
                  ) : (
                    filteredProjects.map((project) => (
                      <div
                        key={project.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{project.title}</h4>
                            <Badge variant="outline" className={cn("text-xs", getStatusColor(project.status))}>
                              {project.status}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {project.type}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {project.rolesCount} roles
                            </span>
                            <span className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              {project.applicationsCount} applications
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Due {project.deadline.toLocaleDateString()}
                            </span>
                            {project.budget && (
                              <span className="flex items-center gap-1">
                                <Briefcase className="h-3 w-3" />
                                {project.budget}
                              </span>
                            )}
                          </div>
                          <Progress value={project.progress} className="h-2" />
                        </div>
                        <div className="flex gap-2 mt-3 sm:mt-0">
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>Edit Project</DropdownMenuItem>
                              <DropdownMenuItem>View Applications</DropdownMenuItem>
                              <DropdownMenuItem>Schedule Auditions</DropdownMenuItem>
                              <DropdownMenuItem>Export Data</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
                                Archive Project
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Searches Tab */}
        <TabsContent value="searches" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Searches</CardTitle>
              <CardDescription>
                Your recent talent searches and saved queries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Search Query</TableHead>
                    <TableHead>Results</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSearches.map((search) => (
                    <TableRow key={search.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Search className="h-4 w-4 text-muted-foreground" />
                          {search.query}
                        </div>
                      </TableCell>
                      <TableCell>{search.resultsCount} actors</TableCell>
                      <TableCell>{search.timestamp.toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          Run Again
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Collaborate with your casting team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <Avatar>
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback>{member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.role}</p>
                    </div>
                    <Badge
                      variant={member.status === "online" ? "default" : member.status === "busy" ? "secondary" : "outline"}
                      className="text-xs"
                    >
                      {member.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Casting Performance</CardTitle>
                <CardDescription>
                  Average time to fill roles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Lead Roles</span>
                    <span className="text-sm text-muted-foreground">21 days</span>
                  </div>
                  <Progress value={70} />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Supporting Roles</span>
                    <span className="text-sm text-muted-foreground">14 days</span>
                  </div>
                  <Progress value={85} />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Background Actors</span>
                    <span className="text-sm text-muted-foreground">7 days</span>
                  </div>
                  <Progress value={95} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Application Sources</CardTitle>
                <CardDescription>
                  Where your applicants come from
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Direct Applications</span>
                    <span className="text-sm text-muted-foreground">45%</span>
                  </div>
                  <Progress value={45} />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Agent Submissions</span>
                    <span className="text-sm text-muted-foreground">30%</span>
                  </div>
                  <Progress value={30} />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Talent Search</span>
                    <span className="text-sm text-muted-foreground">25%</span>
                  </div>
                  <Progress value={25} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Notifications Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Recent Notifications
            </span>
            <Button variant="ghost" size="sm">
              Mark all as read
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex items-start space-x-3 p-3 rounded-lg transition-colors",
                    !notification.read && "bg-accent"
                  )}
                >
                  <div className={cn(
                    "mt-1 h-2 w-2 rounded-full",
                    notification.type === "application" && "bg-blue-500",
                    notification.type === "message" && "bg-green-500",
                    notification.type === "deadline" && "bg-yellow-500",
                    notification.type === "system" && "bg-gray-500"
                  )} />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-xs text-muted-foreground">{notification.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {notification.timestamp.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}