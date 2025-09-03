"use client"

import React, { useState } from "react"
import { 
  Users, Shield, Activity, AlertTriangle, TrendingUp, Clock, CheckCircle, 
  XCircle, MoreHorizontal, Plus, Filter, Download, Bell, Settings,
  BarChart3, Target, Award, Briefcase, Star, ArrowUpRight, ArrowDownRight,
  Database, Server, Globe, UserCheck, UserX, Ban, Eye, Mail, MessageSquare
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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

interface User {
  id: string
  name: string
  email: string
  role: "ACTOR" | "CASTING_DIRECTOR" | "PRODUCER" | "ADMIN"
  status: "Active" | "Inactive" | "Suspended" | "Pending"
  joinDate: Date
  lastLogin: Date
  profileCompleteness: number
  avatar?: string
  verificationStatus: "Verified" | "Unverified" | "Under Review"
  projects: number
  applications: number
}

interface SystemMetric {
  name: string
  value: number | string
  change: number
  trend: "up" | "down" | "neutral"
  status: "healthy" | "warning" | "critical"
}

interface SecurityAlert {
  id: string
  type: "Login Attempt" | "Data Breach" | "Suspicious Activity" | "System Error"
  description: string
  severity: "Low" | "Medium" | "High" | "Critical"
  timestamp: Date
  resolved: boolean
  affectedUsers?: number
}

interface PlatformMetric {
  metric: string
  current: number
  previous: number
  change: number
  target?: number
}

interface AdminDashboardProps {
  userName?: string
  users?: User[]
  systemMetrics?: SystemMetric[]
  securityAlerts?: SecurityAlert[]
  platformMetrics?: PlatformMetric[]
  totalUsers?: number
  activeProjects?: number
  monthlyGrowth?: number
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  userName = "Administrator",
  users = [],
  systemMetrics = [],
  securityAlerts = [],
  platformMetrics = [],
  totalUsers = 0,
  activeProjects = 0,
  monthlyGrowth = 0
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState("week")
  const [userFilter, setUserFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [alertFilter, setAlertFilter] = useState("all")

  // Calculate platform statistics
  const platformStats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === "Active").length,
    newUsersThisMonth: users.filter(u => {
      const oneMonthAgo = new Date()
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
      return u.joinDate > oneMonthAgo
    }).length,
    verifiedUsers: users.filter(u => u.verificationStatus === "Verified").length,
    pendingVerifications: users.filter(u => u.verificationStatus === "Under Review").length,
    suspendedUsers: users.filter(u => u.status === "Suspended").length
  }

  const getStatusColor = (status: User["status"]) => {
    switch (status) {
      case "Active": return "text-green-600 bg-green-50"
      case "Inactive": return "text-gray-600 bg-gray-50"
      case "Suspended": return "text-red-600 bg-red-50"
      case "Pending": return "text-yellow-600 bg-yellow-50"
      default: return "text-gray-600 bg-gray-50"
    }
  }

  const getRoleColor = (role: User["role"]) => {
    switch (role) {
      case "ACTOR": return "text-blue-600 bg-blue-50"
      case "CASTING_DIRECTOR": return "text-purple-600 bg-purple-50"
      case "PRODUCER": return "text-green-600 bg-green-50"
      case "ADMIN": return "text-red-600 bg-red-50"
      default: return "text-gray-600 bg-gray-50"
    }
  }

  const getAlertSeverityColor = (severity: SecurityAlert["severity"]) => {
    switch (severity) {
      case "Low": return "text-green-600 bg-green-50"
      case "Medium": return "text-yellow-600 bg-yellow-50"
      case "High": return "text-orange-600 bg-orange-50"
      case "Critical": return "text-red-600 bg-red-50"
      default: return "text-gray-600 bg-gray-50"
    }
  }

  const filteredUsers = users.filter(user => {
    if (userFilter === "all") return true
    if (userFilter === "active") return user.status === "Active"
    if (userFilter === "pending") return user.verificationStatus === "Under Review"
    if (userFilter === "suspended") return user.status === "Suspended"
    return user.role === userFilter
  })

  const filteredAlerts = securityAlerts.filter(alert => {
    if (alertFilter === "all") return true
    if (alertFilter === "unresolved") return !alert.resolved
    return alert.severity === alertFilter
  })

  const handleUserAction = (userId: string, action: string) => {
    // This would integrate with backend APIs
    console.log(`Performing ${action} on user ${userId}`)
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {userName}</h1>
          <p className="text-muted-foreground mt-1">
            Monitor platform health, manage users, and maintain system security
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            System Report
          </Button>
          <Button size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* System Health Alerts */}
      {securityAlerts.filter(a => !a.resolved && a.severity === "Critical").length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Critical System Alert</AlertTitle>
          <AlertDescription>
            There are {securityAlerts.filter(a => !a.resolved && a.severity === "Critical").length} unresolved critical security alerts requiring immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Key Platform Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformStats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 inline-flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                {platformStats.newUsersThisMonth} new this month
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformStats.activeUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((platformStats.activeUsers / platformStats.totalUsers) * 100)}% of total users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Verifications</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformStats.pendingVerifications}</div>
            <p className="text-xs text-muted-foreground">
              {platformStats.verifiedUsers} verified users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Alerts</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {securityAlerts.filter(a => !a.resolved).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {securityAlerts.filter(a => !a.resolved && a.severity === "High").length} high priority
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-[250px]"
              />
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="ACTOR">Actors</SelectItem>
                  <SelectItem value="CASTING_DIRECTOR">Casting Directors</SelectItem>
                  <SelectItem value="PRODUCER">Producers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Monitor and manage all platform users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.slice(0, 10).map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs", getRoleColor(user.role))}>
                          {user.role.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs", getStatusColor(user.status))}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user.verificationStatus === "Verified" ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : user.verificationStatus === "Under Review" ? (
                            <Clock className="h-4 w-4 text-yellow-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-xs">{user.verificationStatus}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {user.lastLogin.toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-1">
                          <div>{user.projects} projects</div>
                          <div className="text-muted-foreground">{user.applications} applications</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>User Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleUserAction(user.id, "view")}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUserAction(user.id, "message")}>
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Send Message
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.status !== "Suspended" ? (
                              <DropdownMenuItem 
                                onClick={() => handleUserAction(user.id, "suspend")}
                                className="text-red-600"
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Suspend User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                onClick={() => handleUserAction(user.id, "reactivate")}
                                className="text-green-600"
                              >
                                <UserCheck className="h-4 w-4 mr-2" />
                                Reactivate User
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <Select value={alertFilter} onValueChange={setAlertFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter alerts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Alerts</SelectItem>
                <SelectItem value="unresolved">Unresolved</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
                <SelectItem value="High">High Priority</SelectItem>
                <SelectItem value="Medium">Medium Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Security Alerts</CardTitle>
                <CardDescription>
                  Recent security incidents and system alerts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {filteredAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={cn(
                          "p-3 border rounded-lg",
                          !alert.resolved && "bg-accent/50"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge className={cn("text-xs", getAlertSeverityColor(alert.severity))}>
                                {alert.severity}
                              </Badge>
                              <span className="text-sm font-medium">{alert.type}</span>
                              {alert.resolved && (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {alert.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>{alert.timestamp.toLocaleString()}</span>
                              {alert.affectedUsers && (
                                <span>{alert.affectedUsers} users affected</span>
                              )}
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            {alert.resolved ? "View" : "Resolve"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>
                  Current system performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {systemMetrics.map((metric, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{metric.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{metric.value}</span>
                          <div className={cn(
                            "flex items-center text-xs",
                            metric.trend === "up" ? "text-green-600" :
                            metric.trend === "down" ? "text-red-600" :
                            "text-muted-foreground"
                          )}>
                            {metric.trend === "up" ? (
                              <ArrowUpRight className="h-3 w-3 mr-1" />
                            ) : metric.trend === "down" ? (
                              <ArrowDownRight className="h-3 w-3 mr-1" />
                            ) : null}
                            {metric.change !== 0 && `${metric.change > 0 ? "+" : ""}${metric.change}%`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={typeof metric.value === "number" ? metric.value : 0} 
                          className="flex-1 h-2"
                        />
                        <div className={cn(
                          "h-2 w-2 rounded-full",
                          metric.status === "healthy" ? "bg-green-500" :
                          metric.status === "warning" ? "bg-yellow-500" :
                          "bg-red-500"
                        )} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Platform Growth</CardTitle>
                <CardDescription>
                  User acquisition and engagement metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">New User Signups</span>
                    <span className="text-sm text-muted-foreground">+{platformStats.newUsersThisMonth} this month</span>
                  </div>
                  <Progress value={75} />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">User Retention Rate</span>
                    <span className="text-sm text-muted-foreground">85%</span>
                  </div>
                  <Progress value={85} />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Daily Active Users</span>
                    <span className="text-sm text-muted-foreground">68% of total</span>
                  </div>
                  <Progress value={68} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feature Usage</CardTitle>
                <CardDescription>
                  Most popular platform features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Profile Management</span>
                    <span className="text-sm text-muted-foreground">92%</span>
                  </div>
                  <Progress value={92} />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Talent Search</span>
                    <span className="text-sm text-muted-foreground">78%</span>
                  </div>
                  <Progress value={78} />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Application Tracking</span>
                    <span className="text-sm text-muted-foreground">65%</span>
                  </div>
                  <Progress value={65} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Server Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">API Response Time</span>
                    <Badge variant="outline" className="text-green-600">120ms</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Uptime</span>
                    <Badge variant="outline" className="text-green-600">99.9%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Load Average</span>
                    <Badge variant="outline" className="text-yellow-600">0.75</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Connection Pool</span>
                    <Badge variant="outline" className="text-green-600">Healthy</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Query Performance</span>
                    <Badge variant="outline" className="text-green-600">Optimal</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Storage Usage</span>
                    <Badge variant="outline" className="text-yellow-600">78%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  CDN Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Global Availability</span>
                    <Badge variant="outline" className="text-green-600">100%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Cache Hit Rate</span>
                    <Badge variant="outline" className="text-green-600">94%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Bandwidth Usage</span>
                    <Badge variant="outline" className="text-blue-600">Normal</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Generate Reports</CardTitle>
                <CardDescription>
                  Create custom reports for analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="h-auto flex-col py-4">
                    <Users className="h-5 w-5 mb-2" />
                    <span className="text-xs">User Report</span>
                  </Button>
                  <Button variant="outline" className="h-auto flex-col py-4">
                    <Activity className="h-5 w-5 mb-2" />
                    <span className="text-xs">Activity Report</span>
                  </Button>
                  <Button variant="outline" className="h-auto flex-col py-4">
                    <Shield className="h-5 w-5 mb-2" />
                    <span className="text-xs">Security Report</span>
                  </Button>
                  <Button variant="outline" className="h-auto flex-col py-4">
                    <BarChart3 className="h-5 w-5 mb-2" />
                    <span className="text-xs">Analytics Report</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Reports</CardTitle>
                <CardDescription>
                  Previously generated reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="text-sm font-medium">Monthly User Report</p>
                      <p className="text-xs text-muted-foreground">Generated 2 days ago</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="text-sm font-medium">Security Audit Report</p>
                      <p className="text-xs text-muted-foreground">Generated 1 week ago</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="text-sm font-medium">Platform Analytics</p>
                      <p className="text-xs text-muted-foreground">Generated 2 weeks ago</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}