"use client"

import React, { useState } from "react"
import { 
  Star, Calendar, TrendingUp, Award, Camera, FileText, 
  Clock, CheckCircle, XCircle, AlertCircle, Target, Briefcase,
  MapPin, DollarSign, Users, Heart, Share2, Eye, ArrowUpRight,
  ArrowDownRight, BarChart3, PieChart, Activity
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

interface Audition {
  id: string
  projectTitle: string
  role: string
  castingDirector: string
  date: Date
  time: string
  location: string
  status: "Scheduled" | "Completed" | "Cancelled" | "Rescheduled"
  type: "In-Person" | "Virtual" | "Self-Tape"
}

interface Application {
  id: string
  projectTitle: string
  role: string
  submittedDate: Date
  status: "Pending" | "Shortlisted" | "Rejected" | "Callback" | "Selected"
  lastUpdate: Date
  projectType: "Film" | "TV Series" | "Web Series" | "Commercial" | "Theatre"
}

interface ProfileInsight {
  metric: string
  value: number
  change: number
  trend: "up" | "down" | "neutral"
}

interface ActorDashboardProps {
  userName?: string
  profileCompleteness?: number
  auditions?: Audition[]
  applications?: Application[]
  profileViews?: number
  savedRoles?: number
  profileInsights?: ProfileInsight[]
}

export const ActorDashboard: React.FC<ActorDashboardProps> = ({
  userName = "Actor",
  profileCompleteness = 75,
  auditions = [],
  applications = [],
  profileViews = 0,
  savedRoles = 0,
  profileInsights = []
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState("month")

  // Calculate statistics
  const stats = {
    upcomingAuditions: auditions.filter(a => a.status === "Scheduled").length,
    activeApplications: applications.filter(a => ["Pending", "Shortlisted", "Callback"].includes(a.status)).length,
    successRate: applications.length > 0 
      ? Math.round((applications.filter(a => a.status === "Selected").length / applications.length) * 100)
      : 0,
    callbackRate: applications.length > 0
      ? Math.round((applications.filter(a => ["Callback", "Selected"].includes(a.status)).length / applications.length) * 100)
      : 0
  }

  const getStatusColor = (status: Application["status"]) => {
    switch (status) {
      case "Pending": return "text-yellow-600 bg-yellow-50"
      case "Shortlisted": return "text-blue-600 bg-blue-50"
      case "Callback": return "text-purple-600 bg-purple-50"
      case "Selected": return "text-green-600 bg-green-50"
      case "Rejected": return "text-red-600 bg-red-50"
      default: return "text-gray-600 bg-gray-50"
    }
  }

  const getAuditionStatusColor = (status: Audition["status"]) => {
    switch (status) {
      case "Scheduled": return "text-blue-600 bg-blue-50"
      case "Completed": return "text-green-600 bg-green-50"
      case "Cancelled": return "text-red-600 bg-red-50"
      case "Rescheduled": return "text-yellow-600 bg-yellow-50"
      default: return "text-gray-600 bg-gray-50"
    }
  }

  const upcomingAuditions = auditions
    .filter(a => a.status === "Scheduled")
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 3)

  const recentApplications = applications
    .sort((a, b) => b.lastUpdate.getTime() - a.lastUpdate.getTime())
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Welcome Header with Profile Completion */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {userName}</h1>
            <p className="text-muted-foreground mt-1">
              Track your auditions, applications, and career progress
            </p>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0">
            <Button variant="outline" size="sm">
              <Camera className="h-4 w-4 mr-2" />
              Update Portfolio
            </Button>
            <Button size="sm">
              <FileText className="h-4 w-4 mr-2" />
              View Resume
            </Button>
          </div>
        </div>

        {/* Profile Completion Alert */}
        {profileCompleteness < 100 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Complete Your Profile</AlertTitle>
            <AlertDescription>
              Your profile is {profileCompleteness}% complete. A complete profile increases your chances of being discovered by casting directors.
            </AlertDescription>
            <Progress value={profileCompleteness} className="mt-2 h-2" />
          </Alert>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Auditions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingAuditions}</div>
            <p className="text-xs text-muted-foreground">
              Next: {upcomingAuditions[0] ? upcomingAuditions[0].date.toLocaleDateString() : "None scheduled"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Applications</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeApplications}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 inline-flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                3 new this week
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profileViews}</div>
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
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate}%</div>
            <p className="text-xs text-muted-foreground">
              Callback rate: {stats.callbackRate}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="auditions">Auditions</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Upcoming Auditions Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Upcoming Auditions</span>
                  <Button variant="ghost" size="sm">View All</Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingAuditions.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p>No upcoming auditions</p>
                    <Button variant="link" size="sm" className="mt-2">
                      Browse Casting Calls
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingAuditions.map((audition) => (
                      <div key={audition.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                        <div className="flex-shrink-0 mt-1">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-primary" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{audition.projectTitle}</p>
                          <p className="text-xs text-muted-foreground">Role: {audition.role}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {audition.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {audition.date.toLocaleDateString()} at {audition.time}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Applications Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Recent Applications</span>
                  <Button variant="ghost" size="sm">View All</Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentApplications.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Briefcase className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p>No applications yet</p>
                    <Button variant="link" size="sm" className="mt-2">
                      Find Roles
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentApplications.map((application) => (
                      <div key={application.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{application.projectTitle}</p>
                          <p className="text-xs text-muted-foreground">Role: {application.role}</p>
                        </div>
                        <Badge className={cn("text-xs", getStatusColor(application.status))}>
                          {application.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Career Progress Card */}
          <Card>
            <CardHeader>
              <CardTitle>Career Progress</CardTitle>
              <CardDescription>
                Your performance over the last {selectedTimeframe}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Applications Submitted</span>
                    <span className="text-sm text-muted-foreground">24</span>
                  </div>
                  <Progress value={80} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Callbacks Received</span>
                    <span className="text-sm text-muted-foreground">8</span>
                  </div>
                  <Progress value={33} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Roles Booked</span>
                    <span className="text-sm text-muted-foreground">3</span>
                  </div>
                  <Progress value={12.5} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Auditions Attended</span>
                    <span className="text-sm text-muted-foreground">15</span>
                  </div>
                  <Progress value={62.5} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Auditions Tab */}
        <TabsContent value="auditions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audition Schedule</CardTitle>
              <CardDescription>
                Manage your upcoming and past auditions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditions.map((audition) => (
                    <TableRow key={audition.id}>
                      <TableCell className="font-medium">{audition.projectTitle}</TableCell>
                      <TableCell>{audition.role}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{audition.date.toLocaleDateString()}</p>
                          <p className="text-xs text-muted-foreground">{audition.time}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {audition.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{audition.location}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs", getAuditionStatusColor(audition.status))}>
                          {audition.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Applications Tab */}
        <TabsContent value="applications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Application History</CardTitle>
              <CardDescription>
                Track the status of all your role applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Last Update</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell className="font-medium">{application.projectTitle}</TableCell>
                      <TableCell>{application.role}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {application.projectType}
                        </Badge>
                      </TableCell>
                      <TableCell>{application.submittedDate.toLocaleDateString()}</TableCell>
                      <TableCell>{application.lastUpdate.toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs", getStatusColor(application.status))}>
                          {application.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Profile Performance</CardTitle>
                <CardDescription>
                  How your profile is performing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {profileInsights.map((insight, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{insight.metric}</span>
                        {insight.trend === "up" ? (
                          <ArrowUpRight className="h-3 w-3 text-green-600" />
                        ) : insight.trend === "down" ? (
                          <ArrowDownRight className="h-3 w-3 text-red-600" />
                        ) : null}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{insight.value}</p>
                        <p className={cn(
                          "text-xs",
                          insight.change > 0 ? "text-green-600" : insight.change < 0 ? "text-red-600" : "text-muted-foreground"
                        )}>
                          {insight.change > 0 ? "+" : ""}{insight.change}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
                <CardDescription>
                  Tips to improve your profile
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Alert>
                    <Target className="h-4 w-4" />
                    <AlertTitle className="text-sm">Add more portfolio pieces</AlertTitle>
                    <AlertDescription className="text-xs">
                      Profiles with 5+ portfolio items get 40% more views
                    </AlertDescription>
                  </Alert>
                  <Alert>
                    <Star className="h-4 w-4" />
                    <AlertTitle className="text-sm">Update your headshots</AlertTitle>
                    <AlertDescription className="text-xs">
                      Recent headshots increase callback rates by 25%
                    </AlertDescription>
                  </Alert>
                  <Alert>
                    <Activity className="h-4 w-4" />
                    <AlertTitle className="text-sm">Stay active</AlertTitle>
                    <AlertDescription className="text-xs">
                      Login weekly to appear in "Recently Active" searches
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto flex-col py-4">
              <Camera className="h-5 w-5 mb-2" />
              <span className="text-xs">Upload Headshot</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4">
              <FileText className="h-5 w-5 mb-2" />
              <span className="text-xs">Update Resume</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4">
              <Heart className="h-5 w-5 mb-2" />
              <span className="text-xs">Saved Roles</span>
              <Badge variant="secondary" className="mt-1">{savedRoles}</Badge>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4">
              <Share2 className="h-5 w-5 mb-2" />
              <span className="text-xs">Share Profile</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}