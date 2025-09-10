"use client"

import React, { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect, useSearchParams } from "next/navigation"
import { ActorDashboard } from "@/components/dashboard/ActorDashboard"
import { CastingDirectorDashboard } from "@/components/dashboard/CastingDirectorDashboard"
import { ProducerDashboard } from "@/components/dashboard/ProducerDashboard"
import { AdminDashboard } from "@/components/dashboard/AdminDashboard"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Loader2, Settings, User } from "lucide-react"

type UserRole = "ACTOR" | "CASTING_DIRECTOR" | "PRODUCER" | "ADMIN"

interface UserData {
  id: string
  name: string
  email: string
  role: UserRole
  profileCompleteness: number
  verificationStatus: "Verified" | "Unverified" | "Under Review"
  joinDate: Date
  lastLogin: Date
}

interface DashboardData {
  user: UserData
  actorData?: {
    auditions: any[]
    applications: any[]
    profileViews: number
    savedRoles: number
    profileInsights: any[]
  }
  castingDirectorData?: {
    projects: any[]
    recentSearches: any[]
    notifications: any[]
    teamMembers: any[]
  }
  producerData?: {
    projects: any[]
    budgetBreakdown: any[]
    revenues: any[]
    teamMembers: any[]
    totalPortfolioValue: number
    activeProjectsCount: number
    completedProjectsCount: number
  }
  adminData?: {
    users: any[]
    systemMetrics: any[]
    securityAlerts: any[]
    platformMetrics: any[]
    totalUsers: number
    activeProjects: number
    monthlyGrowth: number
  }
}

const DashboardPage: React.FC = () => {
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Redirect if not authenticated
  if (status === "unauthenticated") {
    redirect("/auth/login")
  }

  // Load dashboard data based on user role
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500))

        // Get role from URL params or default based on user
        const roleParam = searchParams.get("role")?.toUpperCase() as UserRole
        const userRole: UserRole = roleParam || "ACTOR" // Default to ACTOR for demo

        // Mock user data
        const mockUser: UserData = {
          id: session?.user?.email || "user-123",
          name: session?.user?.name || "John Doe",
          email: session?.user?.email || "user@example.com",
          role: userRole,
          profileCompleteness: 75,
          verificationStatus: "Under Review",
          joinDate: new Date("2023-01-15"),
          lastLogin: new Date()
        }

        // Generate role-specific mock data
        const mockDashboardData: DashboardData = {
          user: mockUser,
          ...(userRole === "ACTOR" && {
            actorData: {
              auditions: [
                {
                  id: "aud-1",
                  projectTitle: "The Mumbai Chronicles",
                  role: "Lead Actor",
                  castingDirector: "Priya Sharma",
                  date: new Date("2024-01-20"),
                  time: "10:00 AM",
                  location: "Film City, Mumbai",
                  status: "Scheduled",
                  type: "In-Person"
                },
                {
                  id: "aud-2",
                  projectTitle: "Digital Dreams",
                  role: "Supporting Character",
                  castingDirector: "Rajesh Kumar",
                  date: new Date("2024-01-25"),
                  time: "2:00 PM",
                  location: "Virtual",
                  status: "Scheduled",
                  type: "Virtual"
                }
              ],
              applications: [
                {
                  id: "app-1",
                  projectTitle: "Bollywood Heights",
                  role: "Dancer",
                  submittedDate: new Date("2024-01-10"),
                  status: "Shortlisted",
                  lastUpdate: new Date("2024-01-15"),
                  projectType: "Film"
                },
                {
                  id: "app-2",
                  projectTitle: "Web Series Pilot",
                  role: "Main Character",
                  submittedDate: new Date("2024-01-08"),
                  status: "Pending",
                  lastUpdate: new Date("2024-01-08"),
                  projectType: "Web Series"
                }
              ],
              profileViews: 234,
              savedRoles: 12,
              profileInsights: [
                { metric: "Profile Views", value: 234, change: 15, trend: "up" },
                { metric: "Application Rate", value: 8, change: 2, trend: "up" },
                { metric: "Response Rate", value: 45, change: -5, trend: "down" }
              ]
            }
          }),
          ...(userRole === "CASTING_DIRECTOR" && {
            castingDirectorData: {
              projects: [
                {
                  id: "proj-1",
                  title: "Mumbai Love Story",
                  type: "Film",
                  status: "Casting",
                  progress: 65,
                  deadline: new Date("2024-02-15"),
                  rolesCount: 8,
                  applicationsCount: 156,
                  budget: "$2M"
                }
              ],
              recentSearches: [
                {
                  id: "search-1",
                  query: "Male actor, 25-35, Mumbai based",
                  timestamp: new Date("2024-01-18"),
                  resultsCount: 47
                }
              ],
              notifications: [
                {
                  id: "notif-1",
                  type: "application",
                  title: "New Application Received",
                  description: "Ravi Kumar applied for Lead Role in Mumbai Love Story",
                  timestamp: new Date("2024-01-18"),
                  read: false
                }
              ],
              teamMembers: [
                {
                  id: "team-1",
                  name: "Sarah Chen",
                  role: "Assistant Casting Director",
                  avatar: "",
                  status: "online"
                }
              ]
            }
          }),
          ...(userRole === "PRODUCER" && {
            producerData: {
              projects: [
                {
                  id: "prod-1",
                  title: "The Delhi Files",
                  type: "Film",
                  status: "Production",
                  budget: {
                    total: 5000000,
                    spent: 3200000,
                    remaining: 1800000,
                    currency: "USD"
                  },
                  progress: 64,
                  startDate: new Date("2023-10-01"),
                  estimatedCompletion: new Date("2024-03-15"),
                  teamSize: 45,
                  locations: ["Delhi", "Mumbai"],
                  genres: ["Drama", "Thriller"]
                }
              ],
              budgetBreakdown: [
                {
                  category: "Cast & Crew",
                  allocated: 2500000,
                  spent: 1800000,
                  remaining: 700000,
                  percentage: 50
                },
                {
                  category: "Equipment",
                  allocated: 800000,
                  spent: 650000,
                  remaining: 150000,
                  percentage: 16
                }
              ],
              revenues: [
                {
                  source: "Theatrical Rights",
                  amount: 8000000,
                  status: "Received",
                  date: new Date("2023-12-01")
                }
              ],
              teamMembers: [
                {
                  id: "team-prod-1",
                  name: "Michael Rodriguez",
                  role: "Director of Photography",
                  department: "Camera",
                  avatar: "",
                  contact: { email: "michael@example.com", phone: "+1234567890" },
                  projects: ["prod-1"]
                }
              ],
              totalPortfolioValue: 15000000,
              activeProjectsCount: 3,
              completedProjectsCount: 8
            }
          }),
          ...(userRole === "ADMIN" && {
            adminData: {
              users: [
                {
                  id: "user-1",
                  name: "John Actor",
                  email: "john@actor.com",
                  role: "ACTOR",
                  status: "Active",
                  joinDate: new Date("2023-06-15"),
                  lastLogin: new Date("2024-01-18"),
                  profileCompleteness: 85,
                  verificationStatus: "Verified",
                  projects: 3,
                  applications: 15
                }
              ],
              systemMetrics: [
                {
                  name: "CPU Usage",
                  value: 45,
                  change: 5,
                  trend: "up",
                  status: "healthy"
                },
                {
                  name: "Memory Usage",
                  value: 67,
                  change: -3,
                  trend: "down",
                  status: "healthy"
                }
              ],
              securityAlerts: [
                {
                  id: "alert-1",
                  type: "Login Attempt",
                  description: "Suspicious login attempts from unknown IP",
                  severity: "Medium",
                  timestamp: new Date("2024-01-18"),
                  resolved: false,
                  affectedUsers: 1
                }
              ],
              platformMetrics: [
                {
                  metric: "Daily Active Users",
                  current: 1247,
                  previous: 1198,
                  change: 4.1,
                  target: 1300
                }
              ],
              totalUsers: 2847,
              activeProjects: 23,
              monthlyGrowth: 8.5
            }
          })
        }

        setDashboardData(mockDashboardData)
      } catch (err) {
        setError("Failed to load dashboard data. Please try again.")
        console.error("Dashboard loading error:", err)
      } finally {
        setIsLoading(false)
      }
    }

    if (status === "authenticated") {
      loadDashboardData()
    }
  }, [status, searchParams, session])

  if (status === "loading" || isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !dashboardData) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Dashboard</AlertTitle>
          <AlertDescription className="mt-2">
            {error || "Unable to load dashboard data. Please try refreshing the page."}
          </AlertDescription>
          <div className="mt-4">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </div>
        </Alert>
      </div>
    )
  }

  const { user } = dashboardData

  // Role Selection Component for first-time users or role switching
  const RoleSelector = () => (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle>Welcome to CastMatch!</CardTitle>
          <CardDescription>
            Choose your role to get started with your personalized dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {([
              {
                role: "ACTOR" as const,
                title: "Actor",
                description: "Find auditions and manage your acting career",
                color: "blue"
              },
              {
                role: "CASTING_DIRECTOR" as const,
                title: "Casting Director",
                description: "Discover talent and manage casting projects",
                color: "purple"
              },
              {
                role: "PRODUCER" as const,
                title: "Producer",
                description: "Oversee productions and manage budgets",
                color: "green"
              }
            ] as const).map((roleOption) => (
              <Button
                key={roleOption.role}
                variant="outline"
                className="h-auto p-4 justify-start"
                onClick={() => {
                  // This would update the user's role and reload dashboard
                  window.location.href = `/dashboard?role=${roleOption.role.toLowerCase()}`
                }}
              >
                <div className="text-left">
                  <div className="font-medium">{roleOption.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {roleOption.description}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  // Render appropriate dashboard based on user role
  const renderDashboard = () => {
    switch (user.role) {
      case "ACTOR":
        return (
          <ActorDashboard
            userName={user.name}
            profileCompleteness={user.profileCompleteness}
            auditions={dashboardData.actorData?.auditions}
            applications={dashboardData.actorData?.applications}
            profileViews={dashboardData.actorData?.profileViews}
            savedRoles={dashboardData.actorData?.savedRoles}
            profileInsights={dashboardData.actorData?.profileInsights}
          />
        )

      case "CASTING_DIRECTOR":
        return (
          <CastingDirectorDashboard
            userName={user.name}
            projects={dashboardData.castingDirectorData?.projects}
            recentSearches={dashboardData.castingDirectorData?.recentSearches}
            notifications={dashboardData.castingDirectorData?.notifications}
            teamMembers={dashboardData.castingDirectorData?.teamMembers}
          />
        )

      case "PRODUCER":
        return (
          <ProducerDashboard
            userName={user.name}
            projects={dashboardData.producerData?.projects}
            budgetBreakdown={dashboardData.producerData?.budgetBreakdown}
            revenues={dashboardData.producerData?.revenues}
            teamMembers={dashboardData.producerData?.teamMembers}
            totalPortfolioValue={dashboardData.producerData?.totalPortfolioValue}
            activeProjectsCount={dashboardData.producerData?.activeProjectsCount}
            completedProjectsCount={dashboardData.producerData?.completedProjectsCount}
          />
        )

      case "ADMIN":
        return (
          <AdminDashboard
            userName={user.name}
            users={dashboardData.adminData?.users}
            systemMetrics={dashboardData.adminData?.systemMetrics}
            securityAlerts={dashboardData.adminData?.securityAlerts}
            platformMetrics={dashboardData.adminData?.platformMetrics}
            totalUsers={dashboardData.adminData?.totalUsers}
            activeProjects={dashboardData.adminData?.activeProjects}
            monthlyGrowth={dashboardData.adminData?.monthlyGrowth}
          />
        )

      default:
        return <RoleSelector />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Dashboard Header */}
      <div className="border-b bg-muted/10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span className="font-medium">{user.name}</span>
              </div>
              <Badge variant="outline">
                {user.role.replace("_", " ")}
              </Badge>
              <Badge
                variant={
                  user.verificationStatus === "Verified" ? "default" :
                  user.verificationStatus === "Under Review" ? "secondary" :
                  "outline"
                }
              >
                {user.verificationStatus}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" asChild>
                <a href="/profile">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="container mx-auto px-4 py-6">
        {renderDashboard()}
      </div>
    </div>
  )
}

export default DashboardPage