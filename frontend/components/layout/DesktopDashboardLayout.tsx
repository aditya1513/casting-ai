'use client'

import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { 
  Search, 
  Users, 
  FileText, 
  BarChart3, 
  Settings, 
  Bell, 
  Plus,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  MessageSquare,
  Upload,
  Calendar
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface DesktopDashboardLayoutProps {
  children: React.ReactNode
  activePanel: string
  onPanelChange: (panel: string) => void
  className?: string
}

interface ResizablePanelProps {
  children: React.ReactNode
  defaultWidth: number
  minWidth: number
  maxWidth: number
  className?: string
}

function ResizablePanel({ 
  children, 
  defaultWidth, 
  minWidth, 
  maxWidth, 
  className 
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth)
  const [isResizing, setIsResizing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      
      const newWidth = e.clientX
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, minWidth, maxWidth])

  return (
    <div 
      ref={panelRef}
      className={cn("relative flex-shrink-0 border-r border-border", className)}
      style={{ width: `${width}px` }}
    >
      <div className="h-full overflow-hidden">
        {children}
      </div>
      <div
        className={cn(
          "absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 transition-colors",
          isResizing && "bg-blue-500"
        )}
        onMouseDown={handleMouseDown}
      />
    </div>
  )
}

function Sidebar({ activePanel, onPanelChange }: { activePanel: string, onPanelChange: (panel: string) => void }) {
  const [collapsed, setCollapsed] = useState(false)

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: Grid3X3, badge: null },
    { id: 'talents', label: 'Talent Management', icon: Users, badge: '247' },
    { id: 'projects', label: 'Projects', icon: FileText, badge: '12' },
    { id: 'auditions', label: 'Auditions', icon: Calendar, badge: '8' },
    { id: 'chat', label: 'AI Assistant', icon: MessageSquare, badge: 'New' },
    { id: 'uploads', label: 'Files & Scripts', icon: Upload, badge: null },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, badge: null },
    { id: 'settings', label: 'Settings', icon: Settings, badge: null },
  ]

  return (
    <div className={cn(
      "h-full bg-card border-r border-border transition-all duration-200",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Sidebar Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        {!collapsed && (
          <h2 className="text-lg font-semibold text-foreground">CastMatch</h2>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="p-2"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="p-2">
        {menuItems.map((item) => (
          <Button
            key={item.id}
            variant={activePanel === item.id ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start mb-1 h-10",
              collapsed && "justify-center px-0"
            )}
            onClick={() => onPanelChange(item.id)}
          >
            <item.icon className={cn("h-4 w-4", !collapsed && "mr-3")} />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <Badge variant="secondary" className="ml-2 h-5 px-2 text-xs">
                    {item.badge}
                  </Badge>
                )}
              </>
            )}
          </Button>
        ))}
      </nav>

      {/* Quick Actions */}
      {!collapsed && (
        <div className="absolute bottom-4 left-2 right-2">
          <Button className="w-full" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>
      )}
    </div>
  )
}

function TopBar() {
  return (
    <div className="h-16 bg-background border-b border-border flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search talents, projects, scripts..."
            className="pl-10 w-full"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Upload Script
        </Button>
        
        <div className="relative">
          <Button variant="ghost" size="sm" className="p-2">
            <Bell className="h-4 w-4" />
          </Button>
          <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-red-500">
            3
          </Badge>
        </div>

        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
          CD
        </div>
      </div>
    </div>
  )
}

export default function DesktopDashboardLayout({
  children,
  activePanel,
  onPanelChange,
  className
}: DesktopDashboardLayoutProps) {
  return (
    <div className={cn("h-screen flex flex-col bg-background", className)}>
      {/* Top Navigation Bar */}
      <TopBar />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar activePanel={activePanel} onPanelChange={onPanelChange} />

        {/* Main Panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* Primary Content */}
          <ResizablePanel
            defaultWidth={800}
            minWidth={600}
            maxWidth={1200}
            className="bg-background"
          >
            <div className="h-full overflow-auto p-6">
              {children}
            </div>
          </ResizablePanel>

          {/* Secondary Panel (Inspector/Details) */}
          <ResizablePanel
            defaultWidth={320}
            minWidth={280}
            maxWidth={500}
            className="bg-card"
          >
            <div className="h-full overflow-auto p-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    QUICK ACTIONS
                  </h3>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Shortlist
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Audition
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    RECENT ACTIVITY
                  </h3>
                  <div className="space-y-3">
                    <div className="text-sm">
                      <div className="font-medium">New Application</div>
                      <div className="text-muted-foreground">Priya Sharma applied for Lead Role</div>
                      <div className="text-xs text-muted-foreground">2 minutes ago</div>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">Script Uploaded</div>
                      <div className="text-muted-foreground">Thriller script analyzed</div>
                      <div className="text-xs text-muted-foreground">15 minutes ago</div>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">Audition Scheduled</div>
                      <div className="text-muted-foreground">Tomorrow at 2:00 PM</div>
                      <div className="text-xs text-muted-foreground">1 hour ago</div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    INSIGHTS
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Active Projects</span>
                      <Badge variant="secondary">12</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Pending Applications</span>
                      <Badge variant="secondary">34</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>This Week's Auditions</span>
                      <Badge variant="secondary">8</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ResizablePanel>
        </div>
      </div>
    </div>
  )
}