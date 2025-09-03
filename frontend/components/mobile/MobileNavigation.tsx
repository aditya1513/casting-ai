"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import {
  Home,
  User,
  Search,
  Calendar,
  MessageSquare,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Briefcase,
  Star,
  TrendingUp,
  Users,
  Film,
  Camera,
  Upload
} from "lucide-react";

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
  isActive?: boolean;
}

interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  role: "actor" | "casting-director" | "producer" | "admin";
}

interface MobileNavigationProps {
  user: UserProfile;
  currentPath?: string;
  notifications?: number;
  messages?: number;
  onNavigate?: (href: string) => void;
  onLogout?: () => void;
}

const getNavigationItems = (role: string, notifications: number, messages: number): NavigationItem[] => {
  const commonItems: NavigationItem[] = [
    { id: "home", label: "Dashboard", icon: Home, href: "/dashboard" },
    { id: "profile", label: "Profile", icon: User, href: "/profile" },
    { id: "messages", label: "Messages", icon: MessageSquare, href: "/messages", badge: messages },
    { id: "notifications", label: "Notifications", icon: Bell, href: "/notifications", badge: notifications },
  ];

  const roleSpecificItems: Record<string, NavigationItem[]> = {
    actor: [
      { id: "auditions", label: "Auditions", icon: Calendar, href: "/auditions" },
      { id: "applications", label: "Applications", icon: Briefcase, href: "/applications" },
      { id: "portfolio", label: "Portfolio", icon: Camera, href: "/portfolio" },
      { id: "insights", label: "Career Insights", icon: TrendingUp, href: "/insights" },
    ],
    "casting-director": [
      { id: "projects", label: "Projects", icon: Film, href: "/projects" },
      { id: "search", label: "Talent Search", icon: Search, href: "/search" },
      { id: "auditions", label: "Auditions", icon: Calendar, href: "/auditions" },
      { id: "team", label: "Team", icon: Users, href: "/team" },
    ],
    producer: [
      { id: "projects", label: "Projects", icon: Film, href: "/projects" },
      { id: "budget", label: "Budget", icon: TrendingUp, href: "/budget" },
      { id: "team", label: "Team", icon: Users, href: "/team" },
      { id: "analytics", label: "Analytics", icon: TrendingUp, href: "/analytics" },
    ],
    admin: [
      { id: "users", label: "Users", icon: Users, href: "/admin/users" },
      { id: "content", label: "Content", icon: Film, href: "/admin/content" },
      { id: "monitoring", label: "Monitoring", icon: TrendingUp, href: "/admin/monitoring" },
    ],
  };

  return [...commonItems, ...roleSpecificItems[role] || []];
};

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  user,
  currentPath = "/dashboard",
  notifications = 0,
  messages = 0,
  onNavigate,
  onLogout,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navigationItems = getNavigationItems(user.role, notifications, messages);

  const handleNavigation = (href: string) => {
    setIsOpen(false);
    if (onNavigate) {
      onNavigate(href);
    } else {
      window.location.href = href;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "actor":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "casting-director":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      case "producer":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
      case "admin":
        return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return (
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          <div className="space-y-1">
            <div className="h-3 w-16 bg-muted rounded animate-pulse" />
            <div className="h-2 w-12 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="h-9 w-9 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <>
      {/* Mobile Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {user.role.replace("-", " ")}
            </p>
          </div>
        </div>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="p-2">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open navigation menu</span>
            </Button>
          </SheetTrigger>
          
          <SheetContent side="right" className="w-80 p-0">
            <div className="flex flex-col h-full">
              {/* Header */}
              <SheetHeader className="p-6 pb-4 border-b">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <SheetTitle className="text-left">{user.name}</SheetTitle>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${getRoleColor(user.role)}`}
                    >
                      {user.role.replace("-", " ")}
                    </Badge>
                  </div>
                </div>
              </SheetHeader>

              {/* Navigation */}
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-2">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPath === item.href;

                    return (
                      <Button
                        key={item.id}
                        variant={isActive ? "secondary" : "ghost"}
                        className="w-full justify-start h-12 px-3"
                        onClick={() => handleNavigation(item.href)}
                      >
                        <Icon className="h-5 w-5 mr-3" />
                        <span className="flex-1 text-left">{item.label}</span>
                        <div className="flex items-center gap-2">
                          {item.badge && item.badge > 0 && (
                            <Badge variant="destructive" className="text-xs min-w-[20px] h-5 px-1">
                              {item.badge > 99 ? "99+" : item.badge}
                            </Badge>
                          )}
                          <ChevronRight className="h-4 w-4 opacity-50" />
                        </div>
                      </Button>
                    );
                  })}
                </div>

                <Separator className="my-4" />

                {/* Quick Actions */}
                <div className="p-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Quick Actions
                  </p>
                  
                  {user.role === "actor" && (
                    <>
                      <Button
                        variant="ghost"
                        className="w-full justify-start h-10 px-3"
                        onClick={() => handleNavigation("/portfolio/upload")}
                      >
                        <Upload className="h-4 w-4 mr-3" />
                        Upload Media
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start h-10 px-3"
                        onClick={() => handleNavigation("/search")}
                      >
                        <Search className="h-4 w-4 mr-3" />
                        Find Auditions
                      </Button>
                    </>
                  )}

                  {user.role === "casting-director" && (
                    <>
                      <Button
                        variant="ghost"
                        className="w-full justify-start h-10 px-3"
                        onClick={() => handleNavigation("/projects/new")}
                      >
                        <Film className="h-4 w-4 mr-3" />
                        New Project
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start h-10 px-3"
                        onClick={() => handleNavigation("/search/talent")}
                      >
                        <Users className="h-4 w-4 mr-3" />
                        Search Talent
                      </Button>
                    </>
                  )}

                  {user.role === "producer" && (
                    <>
                      <Button
                        variant="ghost"
                        className="w-full justify-start h-10 px-3"
                        onClick={() => handleNavigation("/projects/new")}
                      >
                        <Film className="h-4 w-4 mr-3" />
                        New Project
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start h-10 px-3"
                        onClick={() => handleNavigation("/reports")}
                      >
                        <TrendingUp className="h-4 w-4 mr-3" />
                        View Reports
                      </Button>
                    </>
                  )}
                </div>

                <Separator className="my-4" />

                {/* Settings */}
                <div className="p-4 space-y-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-10 px-3"
                    onClick={() => handleNavigation("/settings")}
                  >
                    <Settings className="h-4 w-4 mr-3" />
                    Settings
                    <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
                  </Button>
                </div>
              </ScrollArea>

              {/* Footer */}
              <div className="p-4 border-t">
                <Button
                  variant="ghost"
                  className="w-full justify-start h-10 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                  onClick={() => {
                    setIsOpen(false);
                    onLogout?.();
                  }}
                >
                  <LogOut className="h-4 w-4 mr-3" />
                  Sign Out
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Bottom Tab Bar for very small screens */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-2 flex justify-around items-center sm:hidden z-50">
        {navigationItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.href;

          return (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              className={`flex-col h-12 w-12 p-1 relative ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
              onClick={() => handleNavigation(item.href)}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs truncate max-w-full">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 text-xs min-w-[16px] h-4 px-1 text-[10px]"
                >
                  {item.badge > 9 ? "9+" : item.badge}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      {/* Spacer for bottom tab bar */}
      <div className="h-16 sm:hidden" />
    </>
  );
};