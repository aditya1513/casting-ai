'use client'

import React from 'react'
import { CastMatchLayoutProvider } from './CastMatchLayoutProvider'
import { CastMatchSidebar } from './CastMatchSidebar'
import { CastMatchMainContent } from './CastMatchMainContent'
import { CastMatchInputArea } from './CastMatchInputArea'
import { CastMatchConversationArea } from './CastMatchConversationArea'

/**
 * CastMatch Complete Layout Component
 * Orchestrates all layout components with proper structure
 * Implements the precise responsive architecture from design specifications
 */

interface CastMatchLayoutProps {
  children?: React.ReactNode
  sidebarContent?: React.ReactNode
  conversationContent?: React.ReactNode
  onSendMessage?: (message: string) => void
  onAttachment?: () => void
  onVoiceRecord?: () => void
  showInputArea?: boolean
  showConversation?: boolean
  className?: string
}

export function CastMatchLayout({
  children,
  sidebarContent,
  conversationContent,
  onSendMessage,
  onAttachment,
  onVoiceRecord,
  showInputArea = true,
  showConversation = true,
  className = ''
}: CastMatchLayoutProps) {
  return (
    <CastMatchLayoutProvider>
      <div className={`castmatch-layout min-h-screen bg-white ${className}`}>
        {/* Sidebar Navigation */}
        <CastMatchSidebar>
          {sidebarContent}
        </CastMatchSidebar>
        
        {/* Main Content Area */}
        <CastMatchMainContent>
          {showConversation ? (
            <CastMatchConversationArea>
              {conversationContent || children}
            </CastMatchConversationArea>
          ) : (
            children
          )}
        </CastMatchMainContent>
        
        {/* Fixed Input Area */}
        {showInputArea && (
          <CastMatchInputArea
            onSendMessage={onSendMessage}
            onAttachment={onAttachment}
            onVoiceRecord={onVoiceRecord}
          />
        )}
      </div>
    </CastMatchLayoutProvider>
  )
}

/**
 * Preset Layout: Casting Director Dashboard
 * Pre-configured layout for the casting director interface
 */
interface CastingDirectorLayoutProps {
  messages?: Array<{
    id: string
    content: React.ReactNode
    sender: 'user' | 'ai'
    timestamp?: Date
  }>
  onSendMessage?: (message: string) => void
  projects?: Array<{
    id: string | number
    name: string
    status: string
    count?: number
  }>
}

export function CastingDirectorLayout({
  messages = [],
  onSendMessage,
  projects
}: CastingDirectorLayoutProps) {
  return (
    <CastMatchLayoutProvider defaultSidebarOpen={true}>
      <div className="castmatch-dashboard min-h-screen bg-white">
        {/* Sidebar with Projects */}
        <CastMatchSidebar>
          <ProjectsSidebar projects={projects} />
        </CastMatchSidebar>
        
        {/* Main Conversation Area */}
        <CastMatchMainContent>
          <CastMatchConversationArea>
            <ConversationMessages messages={messages} />
          </CastMatchConversationArea>
        </CastMatchMainContent>
        
        {/* Input Area */}
        <CastMatchInputArea
          onSendMessage={onSendMessage}
          placeholder="Describe the talent you're looking for..."
        />
      </div>
    </CastMatchLayoutProvider>
  )
}

/**
 * Projects Sidebar Content
 */
function ProjectsSidebar({ 
  projects = [] 
}: { 
  projects?: CastingDirectorLayoutProps['projects'] 
}) {
  const defaultProjects = projects?.length ? projects : [
    { id: 1, name: 'Mumbai Dreams', status: 'active', count: 42 },
    { id: 2, name: 'Delhi Heights', status: 'review', count: 18 },
    { id: 3, name: 'Bangalore Days', status: 'casting', count: 67 }
  ]
  
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    review: 'bg-yellow-100 text-yellow-800',
    casting: 'bg-blue-100 text-blue-800',
    complete: 'bg-gray-100 text-gray-600'
  }
  
  return (
    <div className="space-y-6">
      <div className="relative">
        <input
          type="search"
          placeholder="Search projects..."
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
        />
      </div>
      
      <nav className="space-y-1">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Projects
        </h2>
        {defaultProjects.map(project => (
          <button
            key={project.id}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {project.name}
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  statusColors[project.status as keyof typeof statusColors] || statusColors.complete
                }`}>
                  {project.status}
                </span>
              </div>
              {project.count && project.count > 0 && (
                <span className="text-sm text-gray-500 ml-2">
                  {project.count}
                </span>
              )}
            </div>
          </button>
        ))}
      </nav>
    </div>
  )
}

/**
 * Conversation Messages Display
 */
function ConversationMessages({ 
  messages 
}: { 
  messages: CastingDirectorLayoutProps['messages'] 
}) {
  if (!messages?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="mb-4">
          <svg className="w-16 h-16 text-gray-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Start a Conversation
        </h3>
        <p className="text-sm text-gray-500 max-w-sm">
          Describe the talent you're looking for and I'll help you find the perfect match for your project.
        </p>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {messages.map(message => (
        <MessageBubble key={message.id} {...message} />
      ))}
    </div>
  )
}

/**
 * Message Bubble Component
 */
function MessageBubble({
  content,
  sender,
  timestamp = new Date()
}: {
  content: React.ReactNode
  sender: 'user' | 'ai'
  timestamp?: Date
}) {
  const isUser = sender === 'user'
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className={`flex gap-3 max-w-3xl ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className="flex-shrink-0">
          <div className={`
            w-10 h-10 rounded-full flex items-center justify-center
            ${isUser ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}
          `}>
            {isUser ? 'U' : 'AI'}
          </div>
        </div>
        
        <div className={`flex-1 ${isUser ? 'text-right' : 'text-left'}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-500">
              {timestamp.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
          
          <div className={`
            inline-block px-4 py-3 rounded-2xl
            ${isUser 
              ? 'bg-gray-900 text-white rounded-tr-sm' 
              : 'bg-gray-100 text-gray-900 rounded-tl-sm'
            }
          `}>
            {content}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Export all layout components for flexible usage
 */
export {
  CastMatchLayoutProvider,
  CastMatchSidebar,
  CastMatchMainContent,
  CastMatchInputArea,
  CastMatchConversationArea
} from './index'