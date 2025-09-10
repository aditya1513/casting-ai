"use client"

import React from 'react'
import { cn } from '@/lib/utils'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Film, Users, Calendar, Clock, ChevronRight, MoreVertical } from 'lucide-react'

export interface ProjectData {
  id: string
  title: string
  type: 'film' | 'series' | 'commercial' | 'theater' | 'web'
  status: 'active' | 'pending' | 'completed' | 'paused' | 'cancelled'
  thumbnail?: string
  director?: string
  producer?: string
  startDate?: Date
  endDate?: Date
  rolesCount: number
  applicantsCount: number
  shortlistedCount: number
  budget?: string
  location?: string
  lastActivity?: Date
  progress?: number
}

export interface ProjectCardProps {
  project: ProjectData
  variant?: 'sidebar' | 'grid' | 'list'
  selected?: boolean
  onClick?: () => void
  onMenuClick?: () => void
  className?: string
}

/**
 * ProjectCard component for displaying casting projects
 * Used in sidebar navigation and project listings
 */
export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  variant = 'sidebar',
  selected = false,
  onClick,
  onMenuClick,
  className,
}) => {
  const typeIcons = {
    film: Film,
    series: Film,
    commercial: Film,
    theater: Users,
    web: Film,
  }

  const TypeIcon = typeIcons[project.type]

  // Sidebar variant - compact for navigation
  if (variant === 'sidebar') {
    return (
      <div
        className={cn(
          "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200",
          selected
            ? "bg-gray-100 dark:bg-gray-800"
            : "hover:bg-gray-50 dark:hover:bg-gray-800/50",
          className
        )}
        onClick={onClick}
        role="button"
        tabIndex={0}
        aria-selected={selected}
      >
        {/* Project Icon */}
        <div className={cn(
          "flex items-center justify-center w-8 h-8 rounded-md",
          selected
            ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
        )}>
          <TypeIcon className="w-4 h-4" />
        </div>

        {/* Project Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium truncate">{project.title}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {project.rolesCount} roles • {project.applicantsCount} applicants
          </p>
        </div>

        {/* Status Badge */}
        <StatusBadge status={project.status} />

        {/* Selection Indicator */}
        {selected && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-gray-900 dark:bg-white rounded-r" />
        )}
      </div>
    )
  }

  // Grid variant - card layout
  if (variant === 'grid') {
    return (
      <div
        className={cn(
          "group relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer",
          selected && "ring-2 ring-gray-900 dark:ring-white",
          className
        )}
        onClick={onClick}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <TypeIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm line-clamp-1">{project.title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{project.type}</p>
            </div>
          </div>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              onMenuClick?.()
            }}
            aria-label="Project options"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>

        {/* Project Details */}
        <div className="space-y-2 mb-3">
          {project.director && (
            <div className="text-xs text-gray-600 dark:text-gray-400">
              <span className="font-medium">Director:</span> {project.director}
            </div>
          )}
          {project.location && (
            <div className="text-xs text-gray-600 dark:text-gray-400">
              <span className="font-medium">Location:</span> {project.location}
            </div>
          )}
          {project.startDate && (
            <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
              <Calendar className="w-3 h-3" />
              {new Date(project.startDate).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center">
            <p className="text-lg font-semibold">{project.rolesCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Roles</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">{project.applicantsCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Applied</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">{project.shortlistedCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Shortlisted</p>
          </div>
        </div>

        {/* Progress Bar */}
        {project.progress !== undefined && (
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
              <span className="text-xs font-medium">{project.progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-900 dark:bg-white transition-all duration-300"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <StatusBadge status={project.status} />
          {project.lastActivity && (
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Clock className="w-3 h-3" />
              {formatLastActivity(project.lastActivity)}
            </div>
          )}
        </div>
      </div>
    )
  }

  // List variant - horizontal layout
  return (
    <div
      className={cn(
        "group flex items-center gap-4 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-all duration-200 cursor-pointer",
        selected && "ring-2 ring-gray-900 dark:ring-white",
        className
      )}
      onClick={onClick}
    >
      {/* Project Icon */}
      <div className="flex items-center justify-center w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex-shrink-0">
        <TypeIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
      </div>

      {/* Project Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold truncate">{project.title}</h3>
          <StatusBadge status={project.status} />
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span className="capitalize">{project.type}</span>
          {project.director && <span>Dir: {project.director}</span>}
          {project.location && <span>{project.location}</span>}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 text-sm">
        <div className="text-center">
          <p className="font-semibold">{project.rolesCount}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Roles</p>
        </div>
        <div className="text-center">
          <p className="font-semibold">{project.applicantsCount}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Applied</p>
        </div>
        <div className="text-center">
          <p className="font-semibold">{project.shortlistedCount}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Shortlisted</p>
        </div>
      </div>

      {/* Action */}
      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
    </div>
  )
}

/**
 * ProjectCardSkeleton component for loading states
 */
export const ProjectCardSkeleton: React.FC<{
  variant?: 'sidebar' | 'grid' | 'list'
  className?: string
}> = ({ variant = 'sidebar', className }) => {
  if (variant === 'sidebar') {
    return (
      <div className={cn("flex items-center gap-3 px-3 py-2.5", className)}>
        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
        <div className="flex-1 space-y-1">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32" />
        </div>
        <div className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
      </div>
    )
  }

  if (variant === 'grid') {
    return (
      <div className={cn("bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4", className)}>
        <div className="flex items-start gap-2 mb-3">
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="flex-1 space-y-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20" />
          </div>
        </div>
        <div className="space-y-2 mb-3">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-full" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-4 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg", className)}>
      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-48" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-64" />
      </div>
      <div className="flex gap-4">
        <div className="w-12 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="w-12 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="w-12 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    </div>
  )
}

// Helper function to format last activity
function formatLastActivity(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  
  return date.toLocaleDateString()
}