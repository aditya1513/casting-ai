"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { 
  Menu, 
  X, 
  Home, 
  User, 
  Briefcase, 
  Calendar, 
  Search, 
  Settings, 
  LogOut,
  Bell,
  Film,
  Users,
  Camera,
  Star,
  MessageSquare,
  TrendingUp,
  FileText,
  DollarSign
} from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

interface DashboardLayoutProps {
  children: React.ReactNode
  userRole: "actor" | "casting_director" | "producer"
  userName?: string
  userAvatar?: string
}

const navigationItems = {
  actor: [
    { name: "Dashboard", href: "/dashboard/actor", icon: Home },
    { name: "My Profile", href: "/dashboard/actor/profile", icon: User },
    { name: "Auditions", href: "/dashboard/actor/auditions", icon: Camera },
    { name: "Applications", href: "/dashboard/actor/applications", icon: FileText },
    { name: "Portfolio", href: "/dashboard/actor/portfolio", icon: Star },
    { name: "Messages", href: "/dashboard/actor/messages", icon: MessageSquare },
    { name: "Settings", href: "/dashboard/actor/settings", icon: Settings },
  ],
  casting_director: [
    { name: "Dashboard", href: "/dashboard/casting-director", icon: Home },
    { name: "Projects", href: "/dashboard/casting-director/projects", icon: Film },
    { name: "Talent Search", href: "/dashboard/casting-director/talent", icon: Search },
    { name: "Auditions", href: "/dashboard/casting-director/auditions", icon: Camera },
    { name: "Applications", href: "/dashboard/casting-director/applications", icon: FileText },
    { name: "Schedule", href: "/dashboard/casting-director/schedule", icon: Calendar },
    { name: "Messages", href: "/dashboard/casting-director/messages", icon: MessageSquare },
    { name: "Settings", href: "/dashboard/casting-director/settings", icon: Settings },
  ],
  producer: [
    { name: "Dashboard", href: "/dashboard/producer", icon: Home },
    { name: "Productions", href: "/dashboard/producer/productions", icon: Film },
    { name: "Team", href: "/dashboard/producer/team", icon: Users },
    { name: "Casting Status", href: "/dashboard/producer/casting", icon: Users },
    { name: "Budget", href: "/dashboard/producer/budget", icon: DollarSign },
    { name: "Analytics", href: "/dashboard/producer/analytics", icon: TrendingUp },
    { name: "Schedule", href: "/dashboard/producer/schedule", icon: Calendar },
    { name: "Messages", href: "/dashboard/producer/messages", icon: MessageSquare },
    { name: "Settings", href: "/dashboard/producer/settings", icon: Settings },
  ],
}

export default function DashboardLayout({ 
  children, 
  userRole, 
  userName = "User",
  userAvatar 
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  
  const navigation = navigationItems[userRole]
  const userInitials = userName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout")
      apiClient.clearAuthToken()
      toast({
        title: "Logged out successfully",
        description: "See you again soon!",
      })
      router.push("/login")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-lg transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-4 border-b">
            <Link href="/" className="flex items-center space-x-2">
              <Film className="h-8 w-8 text-indigo-600" />
              <span className="text-xl font-bold text-gray-900">CastMatch</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            >
              <X className="h-6 w-6 text-gray-400" />
            </button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-indigo-50 text-indigo-600"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? "text-indigo-600" : "text-gray-400"}`} />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>
          </ScrollArea>

          {/* User Profile Section */}
          <div className="border-t p-4">
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarImage src={userAvatar} alt={userName} />
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
                <p className="text-xs text-gray-500 capitalize">
                  {userRole.replace("_", " ")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-white shadow-sm">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
            >
              <Menu className="h-6 w-6 text-gray-400" />
            </button>

            <div className="flex-1" />

            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <Badge 
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center"
                  variant="destructive"
                >
                  3
                </Badge>
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={userAvatar} alt={userName} />
                      <AvatarFallback>{userInitials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{userName}</p>
                      <p className="text-xs leading-none text-muted-foreground capitalize">
                        {userRole.replace("_", " ")}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/${userRole === "casting_director" ? "casting-director" : userRole}/profile`}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/${userRole === "casting_director" ? "casting-director" : userRole}/settings`}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}