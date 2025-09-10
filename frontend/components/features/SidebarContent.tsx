"use client"

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { ProjectCard, ProjectData } from '@/components/castmatch/ProjectCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Plus, 
  Filter,
  LayoutGrid,
  List,
  SortAsc
} from 'lucide-react'

export interface SidebarContentProps {
  /** List of projects to display */
  projects: ProjectData[]
  /** Currently selected project ID */
  selectedProjectId?: string
  /** Callback when a project is selected */
  onProjectSelect?: (projectId: string) => void
  /** Callback to create a new project */
  onNewProject?: () => void
  /** Whether the sidebar is collapsed */
  isCollapsed?: boolean
  /** Toggle sidebar collapse state */
  onToggleCollapse?: () => void
  /** Custom class name */
  className?: string
}

/**
 * SidebarContent component for project navigation
 * Displays list of casting projects with search and filtering
 */
export const SidebarContent: React.FC<SidebarContentProps> = ({
  projects,
  selectedProjectId,
  onProjectSelect,
  onNewProject,
  isCollapsed = false,
  onToggleCollapse,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'status'>('recent')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  // Filter projects based on search and tab
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.director?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.location?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesTab = activeTab === 'all' ||
                      (activeTab === 'active' && (project.status === 'active' || project.status === 'pending')) ||
                      (activeTab === 'completed' && project.status === 'completed')

    return matchesSearch && matchesTab
  })

  // Sort projects
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.title.localeCompare(b.title)
      case 'status':
        return a.status.localeCompare(b.status)
      case 'recent':
      default:
        return (b.lastActivity?.getTime() || 0) - (a.lastActivity?.getTime() || 0)
    }
  })

  // Count projects by status
  const activeCount = projects.filter(p => p.status === 'active' || p.status === 'pending').length
  const completedCount = projects.filter(p => p.status === 'completed').length

  if (isCollapsed) {
    return (
      <aside className={cn(
        "w-20 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col",
        className
      )}>
        {/* Collapsed Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <Button
            size="icon"
            variant="ghost"
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Collapsed Project Icons */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {sortedProjects.slice(0, 10).map(project => (
              <Button
                key={project.id}
                size="icon"
                variant={selectedProjectId === project.id ? 'secondary' : 'ghost'}
                onClick={() => onProjectSelect?.(project.id)}
                title={project.title}
                className="w-full"
              >
                <div className="text-xs font-semibold">
                  {project.title.substring(0, 2).toUpperCase()}
                </div>
              </Button>
            ))}
          </div>
        </ScrollArea>

        {/* Collapsed Footer */}
        <div className="p-2 border-t border-gray-200 dark:border-gray-700">
          <Button
            size="icon"
            variant="ghost"
            onClick={onNewProject}
            aria-label="New project"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </aside>
    )
  }

  return (
    <aside className={cn(
      "w-80 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col",
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Projects</h2>
          <div className="flex items-center gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
              aria-label={`Switch to ${viewMode === 'list' ? 'grid' : 'list'} view`}
            >
              {viewMode === 'list' ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">
              All ({projects.length})
            </TabsTrigger>
            <TabsTrigger value="active" className="flex-1">
              Active ({activeCount})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex-1">
              Done ({completedCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Sorting Controls */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {sortedProjects.length} projects
        </span>
        <div className="flex items-center gap-2">
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              const options: Array<'recent' | 'name' | 'status'> = ['recent', 'name', 'status']
              const currentIndex = options.indexOf(sortBy)
              setSortBy(options[(currentIndex + 1) % options.length])
            }}
          >
            <SortAsc className="w-3 h-3 mr-1" />
            {sortBy === 'recent' ? 'Recent' : sortBy === 'name' ? 'Name' : 'Status'}
          </Button>
          <Button size="xs" variant="ghost">
            <Filter className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Project List */}
      <ScrollArea className="flex-1">
        <div className={cn(
          "p-3",
          viewMode === 'grid' ? "grid grid-cols-1 gap-3" : "space-y-2"
        )}>
          {sortedProjects.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {searchQuery ? 'No projects found matching your search.' : 'No projects yet.'}
              </p>
              {!searchQuery && (
                <Button size="sm" onClick={onNewProject}>
                  <Plus className="w-4 h-4 mr-1" />
                  Create First Project
                </Button>
              )}
            </div>
          ) : (
            sortedProjects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                variant={viewMode === 'grid' ? 'grid' : 'sidebar'}
                selected={selectedProjectId === project.id}
                onClick={() => onProjectSelect?.(project.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <Button
          className="w-full"
          size="sm"
          onClick={onNewProject}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>
    </aside>
  )
}

/**
 * SidebarSkeleton component for loading state
 */
export const SidebarSkeleton: React.FC<{
  isCollapsed?: boolean
  className?: string
}> = ({ isCollapsed = false, className }) => {
  if (isCollapsed) {
    return (
      <aside className={cn(
        "w-20 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700",
        className
      )}>
        <div className="p-4 space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      </aside>
    )
  }

  return (
    <aside className={cn(
      "w-80 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700",
      className
    )}>
      <div className="p-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
        <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
      <div className="p-3 space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        ))}
      </div>
    </aside>
  )
}