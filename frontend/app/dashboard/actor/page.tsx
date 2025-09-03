"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import { apiClient } from "@/lib/api-client"
import { 
  Calendar, 
  TrendingUp, 
  Film, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Camera,
  Star
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"

interface DashboardStats {
  totalAuditions: number
  pendingApplications: number
  completedAuditions: number
  profileCompleteness: number
}

interface UpcomingAudition {
  id: string
  projectTitle: string
  role: string
  date: string
  time: string
  location: string
  status: "scheduled" | "confirmed" | "cancelled"
}

interface RecentApplication {
  id: string
  projectTitle: string
  role: string
  appliedDate: string
  status: "pending" | "shortlisted" | "rejected" | "accepted"
}

export default function ActorDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalAuditions: 0,
    pendingApplications: 0,
    completedAuditions: 0,
    profileCompleteness: 0,
  })
  const [upcomingAuditions, setUpcomingAuditions] = useState<UpcomingAudition[]>([])
  const [recentApplications, setRecentApplications] = useState<RecentApplication[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch dashboard stats
      const statsResponse = await apiClient.get("/actor/dashboard/stats")
      if (statsResponse.ok) {
        setStats(statsResponse.data)
      }

      // Fetch upcoming auditions
      const auditionsResponse = await apiClient.get("/actor/auditions/upcoming")
      if (auditionsResponse.ok) {
        setUpcomingAuditions(auditionsResponse.data)
      }

      // Fetch recent applications
      const applicationsResponse = await apiClient.get("/actor/applications/recent")
      if (applicationsResponse.ok) {
        setRecentApplications(applicationsResponse.data)
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "confirmed":
      case "accepted":
      case "shortlisted":
        return "success"
      case "pending":
      case "scheduled":
        return "default"
      case "cancelled":
      case "rejected":
        return "destructive"
      default:
        return "secondary"
    }
  }

  // Mock user data - in real app, this would come from auth context
  const userName = "John Doe"
  const userAvatar = ""

  return (
    <DashboardLayout userRole="actor" userName={userName} userAvatar={userAvatar}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {userName}!</h1>
          <p className="mt-2 text-gray-600">Here's what's happening with your casting journey.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Auditions</CardTitle>
              <Camera className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAuditions}</div>
              <p className="text-xs text-muted-foreground">
                +20% from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingApplications}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting response
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Auditions</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedAuditions}</div>
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profile Completion</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.profileCompleteness}%</div>
              <Progress value={stats.profileCompleteness} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Profile Completion Alert */}
        {stats.profileCompleteness < 100 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <CardTitle className="text-lg">Complete Your Profile</CardTitle>
              </div>
              <CardDescription>
                A complete profile increases your chances of being selected by 40%
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/dashboard/actor/profile">Complete Profile</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="auditions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="auditions">Upcoming Auditions</TabsTrigger>
            <TabsTrigger value="applications">Recent Applications</TabsTrigger>
          </TabsList>

          <TabsContent value="auditions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Auditions</CardTitle>
                <CardDescription>
                  Your scheduled auditions for the next 30 days
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
                          <p className="text-sm text-gray-600">Role: {audition.role}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span className="flex items-center">
                              <Calendar className="mr-1 h-3 w-3" />
                              {audition.date}
                            </span>
                            <span className="flex items-center">
                              <Clock className="mr-1 h-3 w-3" />
                              {audition.time}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">{audition.location}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getStatusBadgeVariant(audition.status)}>
                            {audition.status}
                          </Badge>
                          <Button size="sm" variant="outline">View Details</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Camera className="mx-auto h-12 w-12 text-gray-300" />
                    <p className="mt-2 text-gray-500">No upcoming auditions</p>
                    <Button asChild className="mt-4">
                      <Link href="/dashboard/actor/auditions">Browse Auditions</Link>
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
                  Track the status of your recent applications
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
                        <div className="space-y-1">
                          <h4 className="font-semibold">{application.projectTitle}</h4>
                          <p className="text-sm text-gray-600">Role: {application.role}</p>
                          <p className="text-sm text-gray-500">
                            Applied on {application.appliedDate}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getStatusBadgeVariant(application.status)}>
                            {application.status}
                          </Badge>
                          <Button size="sm" variant="outline">View</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Film className="mx-auto h-12 w-12 text-gray-300" />
                    <p className="mt-2 text-gray-500">No recent applications</p>
                    <Button asChild className="mt-4">
                      <Link href="/dashboard/actor/auditions">Find Auditions</Link>
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
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Button asChild variant="outline" className="justify-start">
                <Link href="/dashboard/actor/portfolio">
                  <Star className="mr-2 h-4 w-4" />
                  Update Portfolio
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href="/dashboard/actor/auditions">
                  <Camera className="mr-2 h-4 w-4" />
                  Browse Auditions
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href="/dashboard/actor/profile">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  View Profile Stats
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href="/dashboard/actor/messages">
                  <Film className="mr-2 h-4 w-4" />
                  Check Messages
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}