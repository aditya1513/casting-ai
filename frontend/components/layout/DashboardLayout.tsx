'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface DashboardLayoutProps {
  children: React.ReactNode
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

export default function DashboardLayout({
  children,
  title,
  description,
  actions,
  className
}: DashboardLayoutProps) {
  return (
    <div className={cn("min-h-screen bg-background", className)}>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
              {description && (
                <p className="text-muted-foreground mt-2">{description}</p>
              )}
            </div>
            {actions && <div>{actions}</div>}
          </div>
        </div>
        <div>{children}</div>
      </div>
    </div>
  )
}