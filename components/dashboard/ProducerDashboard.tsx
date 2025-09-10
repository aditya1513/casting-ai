"use client"

import React, { useState } from "react"
import { 
  DollarSign, Users, Calendar, TrendingUp, Clock, CheckCircle, 
  AlertCircle, MoreHorizontal, Plus, Filter, Download, Bell, Film,
  BarChart3, Target, Award, Briefcase, Star, ArrowUpRight, ArrowDownRight,
  PieChart, Activity, Zap, Building, MapPin, Phone, Mail
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
  type: "Film" | "TV Series" | "Web Series" | "Commercial" | "Documentary"
  status: "Development" | "Pre-Production" | "Production" | "Post-Production" | "Completed" | "On Hold"
  budget: {
    total: number
    spent: number
    remaining: number
    currency: string
  }
  progress: number
  startDate: Date
  estimatedCompletion: Date
  teamSize: number
  locations: string[]
  genres: string[]
}

interface BudgetBreakdown {
  category: string
  allocated: number
  spent: number
  remaining: number
  percentage: number
}

interface Revenue {
  source: string
  amount: number
  status: "Received" | "Pending" | "Projected"
  date: Date
}

interface TeamMember {
  id: string
  name: string
  role: string
  department: string
  avatar?: string
  contact: {
    email: string
    phone?: string
  }
  projects: string[]
}

interface ProducerDashboardProps {
  userName?: string
  projects?: Project[]
  budgetBreakdown?: BudgetBreakdown[]
  revenues?: Revenue[]
  teamMembers?: TeamMember[]
  totalPortfolioValue?: number
  activeProjectsCount?: number
  completedProjectsCount?: number
}

export const ProducerDashboard: React.FC<ProducerDashboardProps> = ({
  userName = "Producer",
  projects = [],
  budgetBreakdown = [],
  revenues = [],
  teamMembers = [],
  totalPortfolioValue = 0,
  activeProjectsCount = 0,
  completedProjectsCount = 0
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState("quarter")
  const [selectedProject, setSelectedProject] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Calculate portfolio metrics
  const portfolioMetrics = {
    totalBudget: projects.reduce((sum, p) => sum + p.budget.total, 0),
    totalSpent: projects.reduce((sum, p) => sum + p.budget.spent, 0),
    averageROI: 15.8, // This would come from actual revenue data
    projectsOnTime: projects.filter(p => p.progress >= 90).length,
    projectsOverBudget: projects.filter(p => p.budget.spent > p.budget.total * 0.9).length
  }

  const getStatusColor = (status: Project["status"]) => {
    switch (status) {
      case "Development": return "text-purple-600 bg-purple-50"
      case "Pre-Production": return "text-blue-600 bg-blue-50"
      case "Production": return "text-green-600 bg-green-50"
      case "Post-Production": return "text-yellow-600 bg-yellow-50"
      case "Completed": return "text-gray-600 bg-gray-50"
      case "On Hold": return "text-red-600 bg-red-50"
      default: return "text-gray-600 bg-gray-50"
    }
  }

  const getRevenueStatusColor = (status: Revenue["status"]) => {
    switch (status) {
      case "Received": return "text-green-600 bg-green-50"
      case "Pending": return "text-yellow-600 bg-yellow-50"
      case "Projected": return "text-blue-600 bg-blue-50"
      default: return "text-gray-600 bg-gray-50"
    }
  }

  const formatCurrency = (amount: number, currency = "USD") => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const activeProjects = projects.filter(p => 
    ["Development", "Pre-Production", "Production", "Post-Production"].includes(p.status)
  )

  const upcomingDeadlines = projects
    .filter(p => p.status !== "Completed")
    .sort((a, b) => a.estimatedCompletion.getTime() - b.estimatedCompletion.getTime())
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {userName}</h1>
          <p className="text-muted-foreground mt-1">
            Manage your production portfolio and track financial performance
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Financial Report
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {/* Key Financial Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPortfolioValue)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 inline-flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                8.2% from last quarter
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Film className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProjectsCount}</div>
            <p className="text-xs text-muted-foreground">
              {completedProjectsCount} completed this year
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Efficiency</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">92%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 inline-flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                4% improvement
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average ROI</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolioMetrics.averageROI}%</div>
            <p className="text-xs text-muted-foreground">
              Above industry average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
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
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  <SelectItem value="Development">Development</SelectItem>
                  <SelectItem value="Pre-Production">Pre-Production</SelectItem>
                  <SelectItem value="Production">Production</SelectItem>
                  <SelectItem value="Post-Production">Post-Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Project Portfolio</CardTitle>
              <CardDescription>
                Track progress, budgets, and timelines across all productions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {activeProjects.map((project) => (
                    <div
                      key={project.id}
                      className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold">{project.title}</h4>
                          <Badge variant="outline" className={cn("text-xs", getStatusColor(project.status))}>
                            {project.status}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {project.type}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            <span className="font-medium">{formatCurrency(project.budget.total)}</span>
                            <span>({Math.round((project.budget.spent / project.budget.total) * 100)}% spent)</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {project.teamSize} team members
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {project.locations.slice(0, 2).join(", ")}
                            {project.locations.length > 2 && ` +${project.locations.length - 2}`}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Due {project.estimatedCompletion.toLocaleDateString()}
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>Progress</span>
                            <span>{project.progress}%</span>
                          </div>
                          <Progress value={project.progress} className="h-2" />
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-3 lg:mt-0 lg:ml-4">
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
                            <DropdownMenuItem>Budget Tracking</DropdownMenuItem>
                            <DropdownMenuItem>Team Management</DropdownMenuItem>
                            <DropdownMenuItem>Schedule Review</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>Export Report</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Budget Tab */}
        <TabsContent value="budget" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Budget Allocation</CardTitle>
                <CardDescription>
                  Breakdown of budget across categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {budgetBreakdown.map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{item.category}</span>
                        <span className="text-muted-foreground">
                          {formatCurrency(item.spent)} / {formatCurrency(item.allocated)}
                        </span>
                      </div>
                      <Progress 
                        value={(item.spent / item.allocated) * 100} 
                        className="h-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{item.percentage}% of total budget</span>
                        <span className={cn(
                          item.remaining < 0 ? "text-red-600" : "text-green-600"
                        )}>
                          {item.remaining < 0 ? "Over by " : "Remaining: "}
                          {formatCurrency(Math.abs(item.remaining))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Deadlines</CardTitle>
                <CardDescription>
                  Projects requiring attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingDeadlines.map((project) => {
                    const daysUntilDeadline = Math.ceil(
                      (project.estimatedCompletion.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                    )
                    return (
                      <div key={project.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                        <div className="flex-shrink-0 mt-1">
                          <div className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center",
                            daysUntilDeadline <= 7 ? "bg-red-100 text-red-600" :
                            daysUntilDeadline <= 30 ? "bg-yellow-100 text-yellow-600" :
                            "bg-green-100 text-green-600"
                          )}>
                            <Calendar className="h-5 w-5" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{project.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Due {project.estimatedCompletion.toLocaleDateString()}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Progress value={project.progress} className="h-1 flex-1" />
                            <span className="text-xs text-muted-foreground">
                              {project.progress}%
                            </span>
                          </div>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs",
                            daysUntilDeadline <= 7 ? "text-red-600 bg-red-50" :
                            daysUntilDeadline <= 30 ? "text-yellow-600 bg-yellow-50" :
                            "text-green-600 bg-green-50"
                          )}
                        >
                          {daysUntilDeadline}d
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Tracking</CardTitle>
              <CardDescription>
                Monitor income streams and financial performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenues.map((revenue, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{revenue.source}</TableCell>
                      <TableCell>{formatCurrency(revenue.amount)}</TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs", getRevenueStatusColor(revenue.status))}>
                          {revenue.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{revenue.date.toLocaleDateString()}</TableCell>
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

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Production Team</CardTitle>
              <CardDescription>
                Manage team members across all projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {teamMembers.map((member) => (
                  <div key={member.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback>{member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.role}</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {member.department}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{member.contact.email}</span>
                      </div>
                      {member.contact.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span>{member.contact.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        <span>{member.projects.length} active projects</span>
                      </div>
                    </div>
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
                <CardTitle>Portfolio Performance</CardTitle>
                <CardDescription>
                  Financial metrics over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Revenue</span>
                    <span className="text-sm text-muted-foreground">{formatCurrency(2400000)}</span>
                  </div>
                  <Progress value={85} />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Production Costs</span>
                    <span className="text-sm text-muted-foreground">{formatCurrency(1800000)}</span>
                  </div>
                  <Progress value={65} />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Net Profit</span>
                    <span className="text-sm text-green-600 font-medium">{formatCurrency(600000)}</span>
                  </div>
                  <Progress value={25} className="[&>div]:bg-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Project Success Metrics</CardTitle>
                <CardDescription>
                  Track delivery and quality KPIs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">On-Time Delivery</span>
                    <span className="text-sm text-muted-foreground">87%</span>
                  </div>
                  <Progress value={87} />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Budget Adherence</span>
                    <span className="text-sm text-muted-foreground">92%</span>
                  </div>
                  <Progress value={92} />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Client Satisfaction</span>
                    <span className="text-sm text-muted-foreground">94%</span>
                  </div>
                  <Progress value={94} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}