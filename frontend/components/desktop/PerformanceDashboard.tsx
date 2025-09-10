'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Activity, 
  Zap, 
  Database, 
  Gauge, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Download,
  Settings,
  Monitor,
  Smartphone,
  Globe
} from 'lucide-react'
import { usePerformanceOptimizer, usePerformanceBudget } from '@/lib/performance-optimizer'
import { usePerformanceMonitor, getBrowserInfo } from '@/lib/desktop-performance'

interface PerformanceMetric {
  name: string
  value: number
  threshold: { good: number; poor: number }
  unit: string
  trend?: number
}

interface ResourceTiming {
  name: string
  type: string
  size: number
  loadTime: number
  cached: boolean
}

function MetricCard({ metric, className }: { 
  metric: PerformanceMetric
  className?: string 
}) {
  const getStatus = () => {
    if (metric.value <= metric.threshold.good) return 'good'
    if (metric.value <= metric.threshold.poor) return 'needs-improvement' 
    return 'poor'
  }

  const getColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600'
      case 'needs-improvement': return 'text-yellow-600'
      case 'poor': return 'text-red-600'
      default: return 'text-muted-foreground'
    }
  }

  const getIcon = (status: string) => {
    switch (status) {
      case 'good': return CheckCircle
      case 'needs-improvement': return AlertTriangle
      case 'poor': return AlertTriangle
      default: return Activity
    }
  }

  const status = getStatus()
  const color = getColor(status)
  const Icon = getIcon(status)

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className={cn("h-4 w-4", color)} />
            <span className="font-medium text-sm">{metric.name}</span>
          </div>
          {metric.trend !== undefined && (
            <div className={cn(
              "flex items-center gap-1 text-xs",
              metric.trend > 0 ? "text-red-500" : "text-green-500"
            )}>
              {metric.trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(metric.trend).toFixed(1)}%
            </div>
          )}
        </div>
        
        <div className="text-2xl font-bold mb-1">
          {metric.value.toFixed(metric.unit === 'ms' ? 0 : 2)}
          <span className="text-sm font-normal text-muted-foreground ml-1">
            {metric.unit}
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Good: &lt;{metric.threshold.good}{metric.unit}</span>
            <span>Poor: &gt;{metric.threshold.poor}{metric.unit}</span>
          </div>
          <Progress 
            value={Math.min((metric.value / metric.threshold.poor) * 100, 100)}
            className="h-2"
          />
          <Badge variant={status === 'good' ? 'default' : status === 'needs-improvement' ? 'secondary' : 'destructive'}>
            {status.replace('-', ' ')}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

function BrowserCompatibility() {
  const browserInfo = getBrowserInfo()
  
  const featureSupport = [
    { name: 'WebGL', supported: browserInfo.features.webGL, critical: false },
    { name: 'IndexedDB', supported: browserInfo.features.indexedDB, critical: true },
    { name: 'Service Worker', supported: browserInfo.features.serviceWorker, critical: false },
    { name: 'WebAssembly', supported: browserInfo.features.webAssembly, critical: false },
    { name: 'Web Components', supported: browserInfo.features.webComponents, critical: false },
    { name: 'Intersection Observer', supported: browserInfo.features.intersectionObserver, critical: true },
    { name: 'Resize Observer', supported: browserInfo.features.resizeObserver, critical: false },
  ]

  const supportedCount = featureSupport.filter(f => f.supported).length
  const supportPercentage = (supportedCount / featureSupport.length) * 100

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Browser Compatibility
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">{browserInfo.name} {browserInfo.version}</div>
            <div className="text-sm text-muted-foreground">{browserInfo.engine} on {browserInfo.platform}</div>
          </div>
          <Badge variant={supportPercentage > 80 ? 'default' : supportPercentage > 60 ? 'secondary' : 'destructive'}>
            {supportPercentage.toFixed(0)}% compatible
          </Badge>
        </div>

        <div className="space-y-2">
          {featureSupport.map((feature) => (
            <div key={feature.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">{feature.name}</span>
                {feature.critical && <Badge variant="outline" className="text-xs">Critical</Badge>}
              </div>
              {feature.supported ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ResourceBudget() {
  const budget = usePerformanceBudget()

  if (!budget) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <div className="text-muted-foreground">Loading performance budget...</div>
        </CardContent>
      </Card>
    )
  }

  const totalBudget = Object.values(budget.budget).reduce((sum, value) => sum + value, 0)
  const totalActual = Object.values(budget.actual).reduce((sum, value) => sum + value, 0)
  const budgetUsage = (totalActual / totalBudget) * 100

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Database className="h-5 w-5" />
          Performance Budget
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-2xl font-bold">
              {totalActual.toFixed(1)} / {totalBudget} KB
            </div>
            <div className="text-sm text-muted-foreground">Total resource usage</div>
          </div>
          <Badge variant={budgetUsage > 100 ? 'destructive' : budgetUsage > 80 ? 'secondary' : 'default'}>
            {budgetUsage.toFixed(0)}%
          </Badge>
        </div>

        <Progress value={Math.min(budgetUsage, 100)} className="mb-4" />

        <div className="space-y-3">
          {Object.entries(budget.budget).map(([type, budgetValue]) => {
            const actualValue = budget.actual[type] || 0
            const usage = (actualValue / budgetValue) * 100
            
            return (
              <div key={type} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize font-medium">{type}</span>
                  <span className={cn(
                    "font-mono",
                    usage > 100 ? "text-red-600" : usage > 80 ? "text-yellow-600" : "text-green-600"
                  )}>
                    {actualValue.toFixed(1)} / {budgetValue} KB
                  </span>
                </div>
                <Progress 
                  value={Math.min(usage, 100)} 
                  className="h-2"
                />
              </div>
            )
          })}
        </div>

        {budget.violations.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="font-medium text-red-800">Budget Violations</span>
            </div>
            <ul className="text-sm text-red-700 space-y-1">
              {budget.violations.map((violation, index) => (
                <li key={index}>• {violation}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DeviceOptimization() {
  const [deviceType, setDeviceType] = useState<'desktop' | 'mobile'>('desktop')
  
  useEffect(() => {
    const checkDevice = () => {
      const isMobile = window.innerWidth <= 768 || 'ontouchstart' in window
      setDeviceType(isMobile ? 'mobile' : 'desktop')
    }

    checkDevice()
    window.addEventListener('resize', checkDevice)
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  const optimizations = [
    {
      category: 'Images',
      desktop: 'WebP format with 2x density',
      mobile: 'Compressed JPEG with lazy loading',
      status: 'active'
    },
    {
      category: 'Fonts',
      desktop: 'Preloaded font-display: swap',
      mobile: 'System fonts fallback',
      status: 'active'
    },
    {
      category: 'JavaScript',
      desktop: 'Full bundle with all features',
      mobile: 'Code splitting and lazy loading',
      status: 'active'
    },
    {
      category: 'CSS',
      desktop: 'Full styles with animations',
      mobile: 'Critical CSS inlined',
      status: 'active'
    },
    {
      category: 'API Calls',
      desktop: 'Real-time WebSocket updates',
      mobile: 'Polling with longer intervals',
      status: 'active'
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          {deviceType === 'mobile' ? <Smartphone className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
          Device Optimization ({deviceType})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {optimizations.map((opt, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <div className="font-medium">{opt.category}</div>
                <div className="text-sm text-muted-foreground">
                  {deviceType === 'desktop' ? opt.desktop : opt.mobile}
                </div>
              </div>
              <Badge variant="default" className="bg-green-500">
                {opt.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function PerformanceDashboard({ className }: { className?: string }) {
  const { metrics } = usePerformanceOptimizer()
  const performanceData = usePerformanceMonitor()
  const [refreshing, setRefreshing] = useState(false)

  const coreWebVitals: PerformanceMetric[] = [
    {
      name: 'Largest Contentful Paint',
      value: metrics.LCP?.value || performanceData.metrics.loadTime,
      threshold: { good: 2500, poor: 4000 },
      unit: 'ms',
      trend: -2.1
    },
    {
      name: 'First Input Delay',
      value: metrics.FID?.value || performanceData.metrics.interactionDelay,
      threshold: { good: 100, poor: 300 },
      unit: 'ms',
      trend: 1.5
    },
    {
      name: 'Cumulative Layout Shift',
      value: metrics.CLS?.value || 0.05,
      threshold: { good: 0.1, poor: 0.25 },
      unit: '',
      trend: -0.8
    }
  ]

  const otherMetrics: PerformanceMetric[] = [
    {
      name: 'Memory Usage',
      value: performanceData.metrics.memoryUsage,
      threshold: { good: 50, poor: 100 },
      unit: 'MB'
    },
    {
      name: 'FPS',
      value: performanceData.metrics.fps,
      threshold: { good: 55, poor: 30 },
      unit: 'fps'
    },
    {
      name: 'Bundle Size',
      value: performanceData.metrics.bundleSize,
      threshold: { good: 250, poor: 500 },
      unit: 'KB'
    }
  ]

  const handleRefresh = async () => {
    setRefreshing(true)
    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    setRefreshing(false)
  }

  const handleExport = () => {
    const data = {
      timestamp: new Date().toISOString(),
      coreWebVitals,
      otherMetrics,
      browserInfo: performanceData.browserInfo,
      deviceType: window.innerWidth <= 768 ? 'mobile' : 'desktop'
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `performance-report-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Dashboard</h2>
          <p className="text-muted-foreground">Monitor and optimize application performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      <Tabs defaultValue="vitals" className="space-y-6">
        <TabsList>
          <TabsTrigger value="vitals">Core Web Vitals</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="compatibility">Compatibility</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
        </TabsList>

        <TabsContent value="vitals" className="space-y-6">
          {/* Core Web Vitals */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Core Web Vitals
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {coreWebVitals.map((metric, index) => (
                <MetricCard key={index} metric={metric} />
              ))}
            </div>
          </div>

          {/* Other Performance Metrics */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Other Metrics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {otherMetrics.map((metric, index) => (
                <MetricCard key={index} metric={metric} />
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="resources">
          <ResourceBudget />
        </TabsContent>

        <TabsContent value="compatibility">
          <BrowserCompatibility />
        </TabsContent>

        <TabsContent value="optimization">
          <DeviceOptimization />
        </TabsContent>
      </Tabs>
    </div>
  )
}