"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import { apiClient } from "@/lib/api-client"
import { 
  Film, 
  Users, 
  DollarSign, 
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  PieChart,
  Activity,
  Briefcase
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"

interface DashboardStats {
  activeProductions: number
  totalBudget: number
  teamMembers: number
  completionRate: number
}

interface Production {
  id: string
  title: string
  type: string
  status: "development" | "pre-production" | "production" | "post-production" | "completed"
  budget: number
  spentBudget: number
  startDate: string
  endDate: string
  progress: number
  castingProgress: number
  director: string
}

interface TeamMember {
  id: string
  name: string
  role: string
  department: string
  avatar?: string
  status: "active" | "on-leave" | "busy"
  currentProject?: string
}

interface BudgetOverview {
  category: string
  allocated: number
  spent: number
  percentage: number
}

export default function ProducerDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    activeProductions: 0,
    totalBudget: 0,
    teamMembers: 0,
    completionRate: 0,
  })
  const [productions, setProductions] = useState<Production[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [budgetOverview, setBudgetOverview] = useState<BudgetOverview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch dashboard stats
      const statsResponse = await apiClient.get("/producer/dashboard/stats")
      if (statsResponse.ok) {
        setStats(statsResponse.data)
      }

      // Fetch active productions
      const productionsResponse = await apiClient.get("/producer/productions/active")
      if (productionsResponse.ok) {
        setProductions(productionsResponse.data)
      }

      // Fetch team members
      const teamResponse = await apiClient.get("/producer/team/members")
      if (teamResponse.ok) {
        setTeamMembers(teamResponse.data)
      }

      // Fetch budget overview
      const budgetResponse = await apiClient.get("/producer/budget/overview")
      if (budgetResponse.ok) {
        setBudgetOverview(budgetResponse.data)
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "production":
      case "active":
        return "success"
      case "pre-production":
      case "development":
        return "default"
      case "post-production":
      case "busy":
        return "secondary"
      case "completed":
        return "outline"
      case "on-leave":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const formatBudget = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Mock user data - in real app, this would come from auth context
  const userName = "Michael Chen"
  const userAvatar = ""

  return (
    <DashboardLayout userRole="producer" userName={userName} userAvatar={userAvatar}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Producer Dashboard</h1>
            <p className="mt-2 text-gray-600">Oversee your productions and manage resources</p>
          </div>
          <Button asChild>
            <Link href="/dashboard/producer/productions/new">
              <Film className="mr-2 h-4 w-4" />
              New Production
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Productions</CardTitle>
              <Film className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeProductions}</div>
              <p className="text-xs text-muted-foreground">
                Currently in progress
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatBudget(stats.totalBudget)}</div>
              <p className="text-xs text-muted-foreground">
                Across all productions
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.teamMembers}</div>
              <p className="text-xs text-muted-foreground">
                Active collaborators
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completionRate}%</div>
              <Progress value={stats.completionRate} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="productions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="productions">Productions</TabsTrigger>
            <TabsTrigger value="budget">Budget Overview</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
          </TabsList>

          <TabsContent value="productions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Productions</CardTitle>
                <CardDescription>
                  Your current film and series productions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {productions.length > 0 ? (
                  <div className="space-y-4">
                    {productions.map((production) => (
                      <div
                        key={production.id}
                        className="rounded-lg border p-4"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="font-semibold text-lg">{production.title}</h4>
                            <p className="text-sm text-gray-600">{production.type}</p>
                            <p className="text-sm text-gray-500">Director: {production.director}</p>
                          </div>
                          <Badge variant={getStatusBadgeVariant(production.status)}>
                            {production.status.replace("-", " ")}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Overall Progress</p>
                            <div className="flex items-center space-x-2">
                              <Progress value={production.progress} className="flex-1" />
                              <span className="text-sm font-medium">{production.progress}%</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Casting Progress</p>
                            <div className="flex items-center space-x-2">
                              <Progress value={production.castingProgress} className="flex-1" />
                              <span className="text-sm font-medium">{production.castingProgress}%</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-4 text-gray-500">
                            <span className="flex items-center">
                              <Calendar className="mr-1 h-3 w-3" />
                              {production.startDate} - {production.endDate}
                            </span>
                            <span className="flex items-center">
                              <DollarSign className="mr-1 h-3 w-3" />
                              {formatBudget(production.spentBudget)} / {formatBudget(production.budget)}
                            </span>
                          </div>
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/dashboard/producer/productions/${production.id}`}>
                              View Details
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Film className="mx-auto h-12 w-12 text-gray-300" />
                    <p className="mt-2 text-gray-500">No active productions</p>
                    <Button asChild className="mt-4">
                      <Link href="/dashboard/producer/productions/new">
                        Start New Production
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="budget" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Budget Allocation</CardTitle>
                <CardDescription>
                  Budget distribution across categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                {budgetOverview.length > 0 ? (
                  <div className="space-y-4">
                    {budgetOverview.map((budget) => (
                      <div key={budget.category} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{budget.category}</span>
                          <span className="text-sm text-gray-500">
                            {formatBudget(budget.spent)} / {formatBudget(budget.allocated)}
                          </span>
                        </div>
                        <div className="relative">
                          <Progress value={budget.percentage} className="h-2" />
                          {budget.percentage > 90 && (
                            <AlertTriangle className="absolute -top-1 -right-1 h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                      </div>
                    ))}
                    
                    <div className="pt-4 mt-4 border-t">
                      <div className="flex justify-between items-center">
                        <Button variant="outline" asChild>
                          <Link href="/dashboard/producer/budget">
                            <PieChart className="mr-2 h-4 w-4" />
                            Detailed Budget View
                          </Link>
                        </Button>
                        <Button variant="outline" asChild>
                          <Link href="/dashboard/producer/analytics">
                            <BarChart3 className="mr-2 h-4 w-4" />
                            Analytics
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <DollarSign className="mx-auto h-12 w-12 text-gray-300" />
                    <p className="mt-2 text-gray-500">No budget data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  Your production team and collaborators
                </CardDescription>
              </CardHeader>
              <CardContent>
                {teamMembers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teamMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback>
                              {member.name.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-medium">{member.name}</h4>
                            <p className="text-sm text-gray-600">{member.role}</p>
                            <p className="text-xs text-gray-500">{member.department}</p>
                            {member.currentProject && (
                              <p className="text-xs text-gray-500 mt-1">
                                Working on: {member.currentProject}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge variant={getStatusBadgeVariant(member.status)}>
                          {member.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="mx-auto h-12 w-12 text-gray-300" />
                    <p className="mt-2 text-gray-500">No team members added</p>
                    <Button asChild className="mt-4">
                      <Link href="/dashboard/producer/team/invite">
                        Invite Team Members
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
              Manage your productions efficiently
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Button asChild variant="outline" className="justify-start">
                <Link href="/dashboard/producer/productions">
                  <Briefcase className="mr-2 h-4 w-4" />
                  All Productions
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href="/dashboard/producer/casting">
                  <Users className="mr-2 h-4 w-4" />
                  Casting Status
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href="/dashboard/producer/budget">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Budget Management
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href="/dashboard/producer/analytics">
                  <Activity className="mr-2 h-4 w-4" />
                  View Analytics
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}