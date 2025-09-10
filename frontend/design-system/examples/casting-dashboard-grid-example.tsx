/**
 * CastMatch Casting Dashboard Grid Example
 * Layout Grid Systems Engineer - Mathematical Precision Implementation
 * 
 * This example demonstrates the complete grid system integration
 * for a casting director dashboard with optimal workflows.
 */

'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { 
  Film, 
  Users, 
  Camera, 
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Plus,
  Eye,
  Edit,
  Star,
  MapPin
} from 'lucide-react'

// Import our mathematical grid system
import '@/design-system/styles/casting-grid-system.css'

interface CastingDashboardExampleProps {
  className?: string
}

export function CastingDashboardGridExample({ className }: CastingDashboardExampleProps) {
  return (
    <div className={`casting-container ${className || ''}`}>
      {/* Dashboard Layout Grid */}
      <div className="dashboard-layout">
        
        {/* Header */}
        <header className="dashboard-header">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Casting Dashboard</h1>
            <p className="mt-2 text-gray-600">Mathematical grid precision for optimal workflows</p>
          </div>
          <Button className="gap-grid-1">
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </header>

        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          <nav className="space-y-grid-2">
            <a href="#" className="block p-grid-2 rounded-lg bg-brand-500 text-white">Dashboard</a>
            <a href="#" className="block p-grid-2 rounded-lg hover:bg-neutral-100">Projects</a>
            <a href="#" className="block p-grid-2 rounded-lg hover:bg-neutral-100">Talent</a>
            <a href="#" className="block p-grid-2 rounded-lg hover:bg-neutral-100">Auditions</a>
            <a href="#" className="block p-grid-2 rounded-lg hover:bg-neutral-100">Applications</a>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="dashboard-content">
          
          {/* Stats Grid - Mathematical Distribution */}
          <section className="m-grid-8 0">
            <h2 className="text-xl font-semibold m-grid-4 0">Performance Overview</h2>
            <div className="stats-grid">
              
              <Card className="stats-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-grid-2">
                  <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                  <Film className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-xs text-muted-foreground">
                    +3 from last week
                  </p>
                </CardContent>
              </Card>

              <Card className="stats-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-grid-2">
                  <CardTitle className="text-sm font-medium">Total Auditions</CardTitle>
                  <Camera className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">47</div>
                  <p className="text-xs text-muted-foreground">
                    Scheduled this week
                  </p>
                </CardContent>
              </Card>

              <Card className="stats-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-grid-2">
                  <CardTitle className="text-sm font-medium">Applications</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">342</div>
                  <p className="text-xs text-muted-foreground">
                    Pending review
                  </p>
                </CardContent>
              </Card>

              <Card className="stats-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-grid-2">
                  <CardTitle className="text-sm font-medium">Shortlisted</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">68</div>
                  <p className="text-xs text-muted-foreground">
                    Ready for auditions
                  </p>
                </CardContent>
              </Card>

            </div>
          </section>

          {/* Project Grid with Mathematical Precision */}
          <section className="mb-grid-8">
            <h2 className="text-xl font-semibold mb-grid-4">Active Projects</h2>
            <div className="projects-grid">
              
              <Card className="project-card">
                <CardContent className="project-card p-grid-4">
                  <div className="flex items-start space-x-grid-3">
                    <div className="rounded-lg bg-gray-100 p-grid-2">
                      <Film className="h-6 w-6 text-gray-600" />
                    </div>
                    <div className="space-y-grid-1 flex-1">
                      <h4 className="font-semibold">Mumbai Dreams</h4>
                      <p className="text-sm text-gray-600">Feature Film</p>
                      <div className="flex items-center space-x-grid-4 text-sm text-gray-500">
                        <span>8 roles</span>
                        <span>156 applications</span>
                        <span>Deadline: Mar 15</span>
                      </div>
                      <div className="flex items-center space-x-grid-2 mt-grid-2">
                        <Progress value={75} className="w-32 h-2" />
                        <span className="text-xs text-gray-500">75%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-grid-2">
                    <Badge variant="default">Casting</Badge>
                    <Button size="sm" variant="outline">
                      <Eye className="mr-1 h-3 w-3" />
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="project-card">
                <CardContent className="project-card p-grid-4">
                  <div className="flex items-start space-x-grid-3">
                    <div className="rounded-lg bg-gray-100 p-grid-2">
                      <Camera className="h-6 w-6 text-gray-600" />
                    </div>
                    <div className="space-y-grid-1 flex-1">
                      <h4 className="font-semibold">The Coffee Chronicles</h4>
                      <p className="text-sm text-gray-600">Web Series</p>
                      <div className="flex items-center space-x-grid-4 text-sm text-gray-500">
                        <span>12 roles</span>
                        <span>203 applications</span>
                        <span>Deadline: Mar 28</span>
                      </div>
                      <div className="flex items-center space-x-grid-2 mt-grid-2">
                        <Progress value={45} className="w-32 h-2" />
                        <span className="text-xs text-gray-500">45%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-grid-2">
                    <Badge variant="secondary">Pre-production</Badge>
                    <Button size="sm" variant="outline">
                      <Eye className="mr-1 h-3 w-3" />
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>

            </div>
          </section>

          {/* Talent Grid - Golden Ratio Proportions */}
          <section className="mb-grid-8">
            <h2 className="text-xl font-semibold mb-grid-4">Recently Shortlisted Talent</h2>
            <div className="talent-grid">
              
              <article className="talent-card">
                <Card className="h-full overflow-hidden hover:shadow-lg transition-shadow duration-200">
                  <CardContent className="p-0">
                    <div className="relative aspect-golden-vertical bg-gradient-to-br from-purple-500 to-pink-500">
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-white text-4xl font-bold">AK</span>
                      </div>
                      
                      {/* Availability Indicator */}
                      <div className="absolute top-grid-2 left-grid-2">
                        <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-grid-2 py-grid-1">
                          <Clock className="w-3 h-3" />
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                        </div>
                      </div>

                      {/* Rating Badge */}
                      <div className="absolute bottom-grid-2 right-grid-2">
                        <div className="bg-blue-500 text-white rounded-full p-grid-1">
                          <Star className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    <div className="talent-card-content p-grid-3">
                      <div>
                        <h3 className="font-semibold text-lg">Arjun Kapoor</h3>
                        <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                          <MapPin className="w-3 h-3" />
                          <span>Mumbai, Maharashtra</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-grid-1">
                        <Badge variant="secondary" className="text-xs">Hindi</Badge>
                        <Badge variant="secondary" className="text-xs">English</Badge>
                        <Badge variant="secondary" className="text-xs">Marathi</Badge>
                      </div>

                      <div className="flex flex-wrap gap-grid-1">
                        <Badge variant="outline" className="text-xs">Drama</Badge>
                        <Badge variant="outline" className="text-xs">Action</Badge>
                        <Badge variant="outline" className="text-xs">Comedy</Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <Badge variant="default">Expert</Badge>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">4.8</span>
                          <span className="text-xs text-gray-500">(24)</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  
                  <div className="p-grid-3 pt-0 flex gap-grid-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="w-4 h-4 mr-1" />
                      Quick View
                    </Button>
                    <Button size="sm" className="flex-1">
                      View Profile
                    </Button>
                  </div>
                </Card>
              </article>

              <article className="talent-card">
                <Card className="h-full overflow-hidden hover:shadow-lg transition-shadow duration-200">
                  <CardContent className="p-0">
                    <div className="relative aspect-golden-vertical bg-gradient-to-br from-blue-500 to-cyan-500">
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-white text-4xl font-bold">PS</span>
                      </div>
                      
                      <div className="absolute top-grid-2 left-grid-2">
                        <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-grid-2 py-grid-1">
                          <Clock className="w-3 h-3" />
                          <div className="w-2 h-2 rounded-full bg-yellow-500" />
                        </div>
                      </div>

                      <div className="absolute bottom-grid-2 right-grid-2">
                        <div className="bg-blue-500 text-white rounded-full p-grid-1">
                          <Star className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    <div className="talent-card-content p-grid-3">
                      <div>
                        <h3 className="font-semibold text-lg">Priya Sharma</h3>
                        <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                          <MapPin className="w-3 h-3" />
                          <span>Delhi, India</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-grid-1">
                        <Badge variant="secondary" className="text-xs">Hindi</Badge>
                        <Badge variant="secondary" className="text-xs">English</Badge>
                        <Badge variant="secondary" className="text-xs">Punjabi</Badge>
                      </div>

                      <div className="flex flex-wrap gap-grid-1">
                        <Badge variant="outline" className="text-xs">Romance</Badge>
                        <Badge variant="outline" className="text-xs">Comedy</Badge>
                        <Badge variant="outline" className="text-xs">Theatre</Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">Intermediate</Badge>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">4.6</span>
                          <span className="text-xs text-gray-500">(18)</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  
                  <div className="p-grid-3 pt-0 flex gap-grid-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="w-4 h-4 mr-1" />
                      Quick View
                    </Button>
                    <Button size="sm" className="flex-1">
                      View Profile
                    </Button>
                  </div>
                </Card>
              </article>

              <article className="talent-card">
                <Card className="h-full overflow-hidden hover:shadow-lg transition-shadow duration-200">
                  <CardContent className="p-0">
                    <div className="relative aspect-golden-vertical bg-gradient-to-br from-green-500 to-teal-500">
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-white text-4xl font-bold">RK</span>
                      </div>
                      
                      <div className="absolute top-grid-2 left-grid-2">
                        <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-grid-2 py-grid-1">
                          <Clock className="w-3 h-3" />
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                        </div>
                      </div>

                      <div className="absolute bottom-grid-2 right-grid-2">
                        <div className="bg-blue-500 text-white rounded-full p-grid-1">
                          <Star className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    <div className="talent-card-content p-grid-3">
                      <div>
                        <h3 className="font-semibold text-lg">Rajesh Kumar</h3>
                        <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                          <MapPin className="w-3 h-3" />
                          <span>Chennai, Tamil Nadu</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-grid-1">
                        <Badge variant="secondary" className="text-xs">Tamil</Badge>
                        <Badge variant="secondary" className="text-xs">Hindi</Badge>
                        <Badge variant="secondary" className="text-xs">Telugu</Badge>
                      </div>

                      <div className="flex flex-wrap gap-grid-1">
                        <Badge variant="outline" className="text-xs">Action</Badge>
                        <Badge variant="outline" className="text-xs">Thriller</Badge>
                        <Badge variant="outline" className="text-xs">Drama</Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <Badge variant="default">Expert</Badge>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">4.9</span>
                          <span className="text-xs text-gray-500">(31)</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  
                  <div className="p-grid-3 pt-0 flex gap-grid-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="w-4 h-4 mr-1" />
                      Quick View
                    </Button>
                    <Button size="sm" className="flex-1">
                      View Profile
                    </Button>
                  </div>
                </Card>
              </article>

            </div>
          </section>

          {/* Applications Grid */}
          <section className="mb-grid-8">
            <h2 className="text-xl font-semibold mb-grid-4">Recent Applications</h2>
            <Card>
              <CardHeader>
                <CardTitle>Pending Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="applications-grid">
                  
                  <div className="application-item">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src="" />
                      <AvatarFallback>SJ</AvatarFallback>
                    </Avatar>
                    <div className="space-y-grid-1">
                      <h4 className="font-medium">Sarah Johnson</h4>
                      <p className="text-sm text-gray-600">Applied for "Leading Lady" in "Mumbai Dreams"</p>
                      <p className="text-xs text-gray-500">2 hours ago</p>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm mr-1">4.8</span>
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    </div>
                    <div className="flex gap-grid-2">
                      <Button size="sm" variant="outline">Review</Button>
                      <Button size="sm">Shortlist</Button>
                    </div>
                  </div>

                  <div className="application-item">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src="" />
                      <AvatarFallback>MK</AvatarFallback>
                    </Avatar>
                    <div className="space-y-grid-1">
                      <h4 className="font-medium">Michael Khan</h4>
                      <p className="text-sm text-gray-600">Applied for "Antagonist" in "The Coffee Chronicles"</p>
                      <p className="text-xs text-gray-500">4 hours ago</p>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm mr-1">4.6</span>
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    </div>
                    <div className="flex gap-grid-2">
                      <Button size="sm" variant="outline">Review</Button>
                      <Button size="sm">Shortlist</Button>
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>
          </section>

        </main>

      </div>
    </div>
  )
}