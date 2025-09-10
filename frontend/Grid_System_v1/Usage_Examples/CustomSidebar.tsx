/**
 * CastMatch Layout System - Custom Sidebar Example
 * Shows how to implement custom sidebar content with the layout system
 */

import React from 'react'
import { 
  CastMatchLayoutProvider,
  CastMatchSidebar,
  CastMatchMainContent,
  CastMatchInputArea,
  CastMatchConversationArea
} from '../../components/layout'

export function CustomSidebarExample() {
  // Custom sidebar content with project management
  const CustomProjectSidebar = () => {
    const projects = [
      { 
        id: '1', 
        name: 'Mumbai Dreams', 
        type: 'Feature Film',
        status: 'Casting',
        deadline: '2025-10-15',
        roles: 12,
        filled: 8
      },
      { 
        id: '2', 
        name: 'Delhi Heights', 
        type: 'Web Series',
        status: 'Pre-production',
        deadline: '2025-11-20',
        roles: 25,
        filled: 10
      },
      { 
        id: '3', 
        name: 'Bangalore Days', 
        type: 'Feature Film',
        status: 'In Review',
        deadline: '2025-09-30',
        roles: 18,
        filled: 18
      }
    ]
    
    const getStatusColor = (status: string) => {
      const colors = {
        'Casting': 'bg-blue-100 text-blue-800',
        'Pre-production': 'bg-yellow-100 text-yellow-800',
        'In Review': 'bg-green-100 text-green-800',
        'Complete': 'bg-gray-100 text-gray-600'
      }
      return colors[status as keyof typeof colors] || colors.Complete
    }
    
    return (
      <div className="h-full flex flex-col">
        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <input
              type="search"
              placeholder="Search projects..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
            <svg 
              className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        
        {/* Projects List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Active Projects
          </h2>
          
          {projects.map(project => (
            <div
              key={project.id}
              className="p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {project.name}
                  </h3>
                  <p className="text-xs text-gray-500">{project.type}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Roles filled</span>
                  <span>{project.filled}/{project.roles}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-gray-600 h-1.5 rounded-full transition-all"
                    style={{ width: `${(project.filled / project.roles) * 100}%` }}
                  />
                </div>
              </div>
              
              {/* Deadline */}
              <div className="mt-2 flex items-center text-xs text-gray-500">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Deadline: {new Date(project.deadline).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
        
        {/* Quick Actions */}
        <div className="p-4 border-t border-gray-200">
          <button className="w-full px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors">
            + New Project
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <CastMatchLayoutProvider>
      <div className="min-h-screen bg-white">
        <CastMatchSidebar>
          <CustomProjectSidebar />
        </CastMatchSidebar>
        
        <CastMatchMainContent>
          <CastMatchConversationArea>
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Select a Project
                </h2>
                <p className="text-gray-500">
                  Choose a project from the sidebar to start casting
                </p>
              </div>
            </div>
          </CastMatchConversationArea>
        </CastMatchMainContent>
        
        <CastMatchInputArea
          placeholder="Describe the talent you're looking for..."
          onSendMessage={(msg) => console.log('Message:', msg)}
        />
      </div>
    </CastMatchLayoutProvider>
  )
}