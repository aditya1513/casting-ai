"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import { apiClient } from "@/lib/api-client"
import { 
  Film, 
  Users, 
  Camera, 
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"

interface DashboardStats {
  activeProjects: number
  totalAuditions: number
  applicationsReceived: number
  talentShortlisted: number
}

interface Project {
  id: string
  title: string
  type: string
  status: "pre-production" | "casting" | "production" | "post-production" | "completed"
  rolesCount: number
  applicationsCount: number
  deadline: string
  progress: number
}

interface RecentApplication {
  id: string
  actorName: string
  actorAvatar?: string
  projectTitle: string
  role: string
  appliedDate: string
  rating: number
  status: "new" | "reviewing" | "shortlisted" | "rejected"
}

interface UpcomingAudition {
  id: string
  projectTitle: string
  date: string
  time: string
  scheduledCount: number
  location: string
}

export default function CastingDirectorDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    activeProjects: 0,
    totalAuditions: 0,
    applicationsReceived: 0,
    talentShortlisted: 0,
  })
  const [projects, setProjects] = useState<Project[]>([])
  const [recentApplications, setRecentApplications] = useState<RecentApplication[]>([])
  const [upcomingAuditions, setUpcomingAuditions] = useState<UpcomingAudition[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch dashboard stats
      const statsResponse = await apiClient.get("/casting-director/dashboard/stats")
      if (statsResponse.ok) {
        setStats(statsResponse.data)
      }

      // Fetch active projects
      const projectsResponse = await apiClient.get("/casting-director/projects/active")
      if (projectsResponse.ok) {
        setProjects(projectsResponse.data)
      }

      // Fetch recent applications
      const applicationsResponse = await apiClient.get("/casting-director/applications/recent")
      if (applicationsResponse.ok) {
        setRecentApplications(applicationsResponse.data)
      }

      // Fetch upcoming auditions
      const auditionsResponse = await apiClient.get("/casting-director/auditions/upcoming")
      if (auditionsResponse.ok) {
        setUpcomingAuditions(auditionsResponse.data)
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "casting":
      case "shortlisted":
        return "success"
      case "pre-production":
      case "new":
      case "reviewing":
        return "default"
      case "production":
        return "secondary"
      case "rejected":
      case "post-production":
        return "destructive"
      case "completed":
        return "outline"
      default:
        return "secondary"
    }
  }

  const getProjectTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "film":
        return Film
      case "web series":
      case "tv":
        return Camera
      default:
        return Film
    }
  }

  // Mock user data - in real app, this would come from auth context
  const userName = "Sarah Johnson"
  const userAvatar = ""

  return (
    <DashboardLayout userRole="casting_director" userName={userName} userAvatar={userAvatar}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Casting Dashboard</h1>
            <p className="mt-2 text-gray-600">Manage your casting projects and talent pipeline</p>
          </div>
          <Button asChild>
            <Link href="/dashboard/casting-director/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <Film className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeProjects}</div>
              <p className="text-xs text-muted-foreground">
                Currently in casting phase
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Auditions</CardTitle>
              <Camera className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAuditions}</div>
              <p className="text-xs text-muted-foreground">
                Scheduled this week
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Applications</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.applicationsReceived}</div>
              <p className="text-xs text-muted-foreground">
                Pending review
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Shortlisted</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.talentShortlisted}</div>
              <p className="text-xs text-muted-foreground">
                Ready for auditions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="projects" className="space-y-4">
          <TabsList>
            <TabsTrigger value="projects">Active Projects</TabsTrigger>
            <TabsTrigger value="applications">Recent Applications</TabsTrigger>
            <TabsTrigger value="auditions">Upcoming Auditions</TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Casting Projects</CardTitle>
                <CardDescription>
                  Projects currently in the casting phase
                </CardDescription>
              </CardHeader>
              <CardContent>
                {projects.length > 0 ? (
                  <div className="space-y-4">
                    {projects.map((project) => {
                      const ProjectIcon = getProjectTypeIcon(project.type)
                      return (
                        <div
                          key={project.id}
                          className="flex items-center justify-between rounded-lg border p-4"
                        >
                          <div className="flex items-start space-x-4">
                            <div className="rounded-lg bg-gray-100 p-2">
                              <ProjectIcon className="h-6 w-6 text-gray-600" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="font-semibold">{project.title}</h4>
                              <p className="text-sm text-gray-600">{project.type}</p>
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <span>{project.rolesCount} roles</span>
                                <span>{project.applicationsCount} applications</span>
                                <span>Deadline: {project.deadline}</span>
                              </div>
                              <div className="flex items-center space-x-2 mt-2">
                                <Progress value={project.progress} className="w-32 h-2" />
                                <span className="text-xs text-gray-500">{project.progress}%</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={getStatusBadgeVariant(project.status)}>
                              {project.status}
                            </Badge>
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/dashboard/casting-director/projects/${project.id}`}>
                                <Eye className="mr-1 h-3 w-3" />
                                View
                              </Link>
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Film className="mx-auto h-12 w-12 text-gray-300" />
                    <p className="mt-2 text-gray-500">No active projects</p>
                    <Button asChild className="mt-4">
                      <Link href="/dashboard/casting-director/projects/new">
                        Create New Project
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="applications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Applications</CardTitle>
                <CardDescription>
                  Latest talent applications for your projects
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentApplications.length > 0 ? (
                  <div className="space-y-4">
                    {recentApplications.map((application) => (
                      <div
                        key={application.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex items-center space-x-4">
                          <Avatar>
                            <AvatarImage src={application.actorAvatar} />
                            <AvatarFallback>
                              {application.actorName.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-semibold">{application.actorName}</h4>
                            <p className="text-sm text-gray-600">
                              {application.projectTitle} - {application.role}
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <svg
                                    key={i}
                                    className={`h-3 w-3 ${
                                      i < application.rating ? "text-yellow-400" : "text-gray-300"
                                    }`}
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                ))}
                              </div>
                              <span className="text-xs text-gray-500">
                                Applied {application.appliedDate}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getStatusBadgeVariant(application.status)}>
                            {application.status}
                          </Badge>
                          <Button size="sm" variant="outline">
                            Review
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="mx-auto h-12 w-12 text-gray-300" />
                    <p className="mt-2 text-gray-500">No recent applications</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="auditions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Auditions</CardTitle>
                <CardDescription>
                  Your scheduled audition sessions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingAuditions.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingAuditions.map((audition) => (
                      <div
                        key={audition.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="space-y-1">
                          <h4 className="font-semibold">{audition.projectTitle}</h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span className="flex items-center">
                              <Calendar className="mr-1 h-3 w-3" />
                              {audition.date}
                            </span>
                            <span className="flex items-center">
                              <Clock className="mr-1 h-3 w-3" />
                              {audition.time}
                            </span>
                            <span className="flex items-center">
                              <Users className="mr-1 h-3 w-3" />
                              {audition.scheduledCount} scheduled
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">{audition.location}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="outline">
                            <Edit className="mr-1 h-3 w-3" />
                            Manage
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Camera className="mx-auto h-12 w-12 text-gray-300" />
                    <p className="mt-2 text-gray-500">No upcoming auditions</p>
                    <Button asChild className="mt-4">
                      <Link href="/dashboard/casting-director/auditions/schedule">
                        Schedule Audition
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Streamline your casting workflow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Button asChild variant="outline" className="justify-start">
                <Link href="/dashboard/casting-director/talent">
                  <Search className="mr-2 h-4 w-4" />
                  Search Talent
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href="/dashboard/casting-director/projects/new">
                  <Plus className="mr-2 h-4 w-4" />
                  New Project
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href="/dashboard/casting-director/auditions/schedule">
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule Audition
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href="/dashboard/casting-director/applications">
                  <Users className="mr-2 h-4 w-4" />
                  Review Applications
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}