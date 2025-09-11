import React, { useState } from 'react';
import {
  Film,
  Plus,
  Calendar,
  DollarSign,
  Users,
  Edit,
  Eye,
  Trash2,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  MapPin,
  Clock,
  Star,
  Award,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../types/trpc';

// Create tRPC React hooks
const trpc = createTRPCReact<AppRouter>();

interface Project {
  id: number;
  title: string;
  description: string;
  genre: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  budget: number;
  start_date: string | null;
  end_date: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  draftProjects: number;
  completedProjects: number;
}

export default function ProjectManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Fetch projects using tRPC
  const {
    data: projectsData,
    isLoading: projectsLoading,
    error: projectsError,
  } = trpc.projects.list.useQuery({
    page: currentPage,
    limit: 10,
    search: searchQuery || undefined,
    status: selectedStatus !== 'all' ? selectedStatus : undefined,
  });

  const { data: stats, isLoading: statsLoading } = trpc.projects.getStats.useQuery();

  const projects = projectsData?.data || [];
  const filteredProjects = projects;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Project Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage your casting projects and track production progress
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mr-4">
              <Film className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Projects</p>
              <p className="text-2xl font-bold">
                {statsLoading ? '...' : stats?.totalProjects || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mr-4">
              <Star className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
              <p className="text-2xl font-bold">
                {statsLoading ? '...' : stats?.activeProjects || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-lg mr-4">
              <Edit className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Draft Projects</p>
              <p className="text-2xl font-bold">
                {statsLoading ? '...' : stats?.draftProjects || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mr-4">
              <Award className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold">
                {statsLoading ? '...' : stats?.completedProjects || 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search projects by title, genre, or description..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                More Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects List */}
      <Card>
        <CardHeader>
          <CardTitle>All Projects ({filteredProjects.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {projectsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading projects...</p>
            </div>
          ) : projectsError ? (
            <div className="text-center py-8">
              <div className="text-red-500 mb-4">⚠️</div>
              <p className="text-red-500">Error loading projects: {projectsError.message}</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-8">
              <Film className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No projects found. Create your first project to get started!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProjects.map(project => (
                <div
                  key={project.id}
                  className="border rounded-lg p-6 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{project.title}</h3>
                        <Badge className={getStatusColor(project.status)}>
                          {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mb-3">{project.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Film className="h-4 w-4" />
                          <span>{project.genre}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          <span>{formatCurrency(project.budget)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {formatDate(project.start_date)} - {formatDate(project.end_date)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>Updated {formatDate(project.updated_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {projectsData && projectsData.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * 10 + 1} to{' '}
                {Math.min(currentPage * 10, projectsData.total)} of {projectsData.total} projects
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {currentPage} of {projectsData.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === projectsData.totalPages}
                  onClick={() => setCurrentPage(Math.min(projectsData.totalPages, currentPage + 1))}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
