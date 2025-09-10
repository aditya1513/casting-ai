'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Bell, 
  Users, 
  FileText, 
  Calendar,
  MessageSquare,
  TrendingUp,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  X,
  Wifi,
  WifiOff
} from 'lucide-react'
import { 
  useWebSocketDashboard, 
  useDashboardUpdates, 
  useNotifications,
  ConnectionState
} from '@/lib/websocket-dashboard'
import { toast } from '@/hooks/use-toast'

interface RealTimeStatsProps {
  className?: string
}

interface LiveMetric {
  id: string
  label: string
  value: number | string
  change?: number
  icon: React.ComponentType<{ className?: string }>
  color: string
}

function ConnectionIndicator({ state }: { state: ConnectionState }) {
  const getStatusColor = () => {
    if (state.isConnected) return 'text-green-500'
    if (state.isConnecting) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getStatusText = () => {
    if (state.isConnected) return 'Connected'
    if (state.isConnecting) return 'Connecting...'
    return 'Disconnected'
  }

  const StatusIcon = state.isConnected ? Wifi : WifiOff

  return (
    <div className="flex items-center gap-2 text-sm">
      <StatusIcon className={cn("h-4 w-4", getStatusColor())} />
      <span className={getStatusColor()}>{getStatusText()}</span>
      {state.error && (
        <span className="text-red-500 text-xs">({state.error})</span>
      )}
    </div>
  )
}

function LiveMetrics() {
  const { connectionState } = useWebSocketDashboard()
  const [metrics, setMetrics] = useState<LiveMetric[]>([
    { id: 'talents', label: 'Active Talents', value: 247, change: 12, icon: Users, color: 'blue' },
    { id: 'projects', label: 'Open Projects', value: 18, change: 2, icon: FileText, color: 'green' },
    { id: 'auditions', label: "Today's Auditions", value: 8, change: -1, icon: Calendar, color: 'purple' },
    { id: 'applications', label: 'New Applications', value: 34, change: 7, icon: MessageSquare, color: 'orange' },
  ])

  // Simulate real-time metric updates
  useEffect(() => {
    if (!connectionState.isConnected) return

    const interval = setInterval(() => {
      setMetrics(prev => prev.map(metric => ({
        ...metric,
        value: typeof metric.value === 'number' 
          ? Math.max(0, metric.value + Math.floor(Math.random() * 5) - 2)
          : metric.value,
        change: Math.floor(Math.random() * 10) - 5
      })))
    }, 5000)

    return () => clearInterval(interval)
  }, [connectionState.isConnected])

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {metrics.map((metric) => (
        <Card key={metric.id} className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {metric.label}
                </p>
                <p className="text-2xl font-bold">{metric.value}</p>
                {metric.change !== undefined && (
                  <div className={cn(
                    "flex items-center gap-1 text-sm",
                    metric.change > 0 ? "text-green-600" : "text-red-600"
                  )}>
                    <TrendingUp className={cn(
                      "h-3 w-3",
                      metric.change < 0 && "rotate-180"
                    )} />
                    <span>{Math.abs(metric.change)}</span>
                  </div>
                )}
              </div>
              <div className={cn(
                "p-2 rounded-lg",
                metric.color === 'blue' && "bg-blue-100 text-blue-600",
                metric.color === 'green' && "bg-green-100 text-green-600",
                metric.color === 'purple' && "bg-purple-100 text-purple-600",
                metric.color === 'orange' && "bg-orange-100 text-orange-600"
              )}>
                <metric.icon className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ActivityFeed() {
  const { updates } = useDashboardUpdates()

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'talent_update': return Users
      case 'project_update': return FileText
      case 'audition_scheduled': return Calendar
      case 'message_sent': return MessageSquare
      default: return Activity
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'talent_update': return 'text-blue-500'
      case 'project_update': return 'text-green-500'
      case 'audition_scheduled': return 'text-purple-500'
      case 'message_sent': return 'text-orange-500'
      default: return 'text-gray-500'
    }
  }

  const formatActivityText = (update: any) => {
    switch (update.type) {
      case 'talent_update':
        return `Talent "${update.data.name}" was updated`
      case 'project_update':
        return `Project "${update.data.title}" status changed`
      case 'audition_scheduled':
        return `Audition scheduled for ${update.data.date}`
      case 'message_sent':
        return `New message from ${update.data.sender}`
      default:
        return `${update.type} activity occurred`
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Live Activity Feed
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-3">
            {updates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recent activity
              </p>
            ) : (
              updates.map((update, index) => {
                const Icon = getActivityIcon(update.type)
                const color = getActivityColor(update.type)
                
                return (
                  <div key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <div className={cn("p-1 rounded-full bg-muted", color)}>
                      <Icon className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{formatActivityText(update)}</p>
                      <p className="text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {new Date(update.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

function NotificationsPanel() {
  const { notifications, markAsRead, clearAll, unreadCount } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'info': return Info
      case 'success': return CheckCircle
      case 'warning': return AlertCircle
      case 'error': return AlertCircle
      default: return Bell
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'info': return 'text-blue-500'
      case 'success': return 'text-green-500'
      case 'warning': return 'text-yellow-500'
      case 'error': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  // Show toast notifications for high-priority updates
  useEffect(() => {
    notifications.forEach(notification => {
      if (notification.priority === 'high' && !notification.toastShown) {
        toast({
          title: notification.title,
          description: notification.message,
          variant: notification.type === 'error' ? 'destructive' : 'default'
        })
        notification.toastShown = true
      }
    })
  }, [notifications])

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="p-2 relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-red-500">
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute right-0 top-full mt-2 w-80 max-h-96 z-50 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Notifications</CardTitle>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <Button size="sm" variant="ghost" onClick={clearAll}>
                    Clear All
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="p-1"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No notifications
                  </p>
                ) : (
                  notifications.map((notification, index) => {
                    const Icon = getNotificationIcon(notification.type)
                    const color = getNotificationColor(notification.type)
                    
                    return (
                      <div
                        key={index}
                        className={cn(
                          "flex items-start gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted/50",
                          !notification.read && "bg-muted/20"
                        )}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className={cn("p-1 rounded-full bg-muted", color)}>
                          <Icon className="h-3 w-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{notification.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(notification.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-1" />
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function RealTimeDashboard({ className }: RealTimeStatsProps) {
  const { connectionState } = useWebSocketDashboard()

  return (
    <div className={cn("space-y-6", className)}>
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Real-Time Dashboard</h2>
        <div className="flex items-center gap-4">
          <ConnectionIndicator state={connectionState} />
          <NotificationsPanel />
        </div>
      </div>

      {/* Live Metrics */}
      <LiveMetrics />

      {/* Activity Feed */}
      <ActivityFeed />
    </div>
  )
}