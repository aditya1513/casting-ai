'use client'

import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Star, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail,
  Plus,
  Trash2,
  GripVertical
} from 'lucide-react'
import { TalentContextMenu } from './ContextMenu'

export interface Talent {
  id: string
  firstName: string
  lastName: string
  age: number
  skills: string[]
  experience: string
  location: string
  phone?: string
  email?: string
  avatar?: string
  rating?: number
  availability: 'available' | 'busy' | 'unavailable'
}

export interface TalentColumn {
  id: string
  title: string
  description?: string
  color?: string
  maxItems?: number
  talents: Talent[]
}

interface DragDropTalentBoardProps {
  columns: TalentColumn[]
  onColumnUpdate: (columns: TalentColumn[]) => void
  onTalentAction: (talent: Talent, action: string) => void
  className?: string
}

interface DragState {
  isDragging: boolean
  draggedItem: Talent | null
  draggedFromColumn: string | null
  dragOverColumn: string | null
}

function TalentCard({ 
  talent, 
  onAction,
  isDragging = false,
  ...props 
}: { 
  talent: Talent
  onAction: (talent: Talent, action: string) => void
  isDragging?: boolean
  [key: string]: any
}) {
  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available': return 'bg-green-500'
      case 'busy': return 'bg-yellow-500'
      case 'unavailable': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <TalentContextMenu
      onEdit={() => onAction(talent, 'edit')}
      onDelete={() => onAction(talent, 'delete')}
      onAddToShortlist={() => onAction(talent, 'shortlist')}
      onScheduleAudition={() => onAction(talent, 'audition')}
      onSendMessage={() => onAction(talent, 'message')}
      onViewProfile={() => onAction(talent, 'view')}
    >
      <Card 
        className={cn(
          "p-4 cursor-move select-none transition-all duration-200",
          "hover:shadow-md hover:scale-[1.02] border border-border",
          isDragging && "opacity-50 rotate-3 scale-105 shadow-lg",
          "active:cursor-grabbing"
        )}
        {...props}
      >
        <div className="flex items-start gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={talent.avatar} />
              <AvatarFallback className="text-sm">
                {talent.firstName[0]}{talent.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div className={cn(
              "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background",
              getAvailabilityColor(talent.availability)
            )} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm truncate">
                {talent.firstName} {talent.lastName}
              </h4>
              {talent.rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs text-muted-foreground">
                    {talent.rating}
                  </span>
                </div>
              )}
            </div>

            <div className="text-xs text-muted-foreground mb-2">
              Age {talent.age} • {talent.experience}
            </div>

            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{talent.location}</span>
            </div>

            <div className="flex flex-wrap gap-1 mb-2">
              {talent.skills.slice(0, 3).map((skill, index) => (
                <Badge 
                  key={index}
                  variant="secondary" 
                  className="text-xs px-1.5 py-0.5"
                >
                  {skill}
                </Badge>
              ))}
              {talent.skills.length > 3 && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                  +{talent.skills.length - 3}
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {talent.phone && (
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <Phone className="h-3 w-3" />
                  </Button>
                )}
                {talent.email && (
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <Mail className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <GripVertical className="h-4 w-4 text-muted-foreground/50" />
            </div>
          </div>
        </div>
      </Card>
    </TalentContextMenu>
  )
}

function DroppableColumn({ 
  column, 
  onDrop, 
  dragState,
  onTalentAction,
  children 
}: {
  column: TalentColumn
  onDrop: (talent: Talent, columnId: string) => void
  dragState: DragState
  onTalentAction: (talent: Talent, action: string) => void
  children: React.ReactNode
}) {
  const [dragOver, setDragOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (dragState.isDragging) {
      setDragOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    if (dragState.draggedItem && dragState.draggedFromColumn !== column.id) {
      onDrop(dragState.draggedItem, column.id)
    }
  }

  const isNearCapacity = column.maxItems && column.talents.length >= column.maxItems * 0.8
  const isAtCapacity = column.maxItems && column.talents.length >= column.maxItems

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-muted/20 rounded-lg border-2 border-dashed transition-all",
        dragOver && dragState.isDragging && "border-primary bg-primary/10 scale-[1.02]",
        !dragOver && "border-transparent",
        isAtCapacity && "border-red-200 bg-red-50/50"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {column.color && (
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: column.color }}
              />
            )}
            <h3 className="font-medium">{column.title}</h3>
            <Badge variant="secondary" className="text-xs">
              {column.talents.length}
              {column.maxItems && `/${column.maxItems}`}
            </Badge>
          </div>
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-8 w-8 p-0"
            onClick={() => onTalentAction({} as Talent, 'add-to-column:' + column.id)}
            disabled={isAtCapacity}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {column.description && (
          <p className="text-sm text-muted-foreground">{column.description}</p>
        )}
        {isNearCapacity && (
          <p className="text-xs text-yellow-600 mt-2">
            {isAtCapacity ? 'Column is full' : 'Approaching capacity limit'}
          </p>
        )}
      </div>

      {/* Column Content */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {children}
        
        {/* Drop Zone Indicator */}
        {dragState.isDragging && dragOver && (
          <div className="border-2 border-dashed border-primary rounded-lg p-8 text-center text-primary">
            <Plus className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm font-medium">Drop talent here</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DragDropTalentBoard({
  columns,
  onColumnUpdate,
  onTalentAction,
  className
}: DragDropTalentBoardProps) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedItem: null,
    draggedFromColumn: null,
    dragOverColumn: null
  })

  const handleDragStart = (talent: Talent, columnId: string) => (e: React.DragEvent) => {
    setDragState({
      isDragging: true,
      draggedItem: talent,
      draggedFromColumn: columnId,
      dragOverColumn: null
    })

    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', '') // Required for Firefox

    // Add some visual feedback
    e.dataTransfer.setDragImage(e.currentTarget as Element, 50, 50)
  }

  const handleDragEnd = () => {
    setDragState({
      isDragging: false,
      draggedItem: null,
      draggedFromColumn: null,
      dragOverColumn: null
    })
  }

  const handleDrop = (talent: Talent, targetColumnId: string) => {
    if (dragState.draggedFromColumn === targetColumnId) {
      return // No change needed
    }

    const updatedColumns = columns.map(column => {
      if (column.id === dragState.draggedFromColumn) {
        // Remove talent from source column
        return {
          ...column,
          talents: column.talents.filter(t => t.id !== talent.id)
        }
      } else if (column.id === targetColumnId) {
        // Add talent to target column (check capacity)
        if (column.maxItems && column.talents.length >= column.maxItems) {
          return column // Don't add if at capacity
        }
        return {
          ...column,
          talents: [...column.talents, talent]
        }
      }
      return column
    })

    onColumnUpdate(updatedColumns)
    
    // Trigger analytics event
    onTalentAction(talent, `moved-to-${targetColumnId}`)
  }

  return (
    <div className={cn("flex gap-6 h-full overflow-x-auto pb-4", className)}>
      {columns.map((column) => (
        <div key={column.id} className="flex-shrink-0 w-80 h-full">
          <DroppableColumn
            column={column}
            onDrop={handleDrop}
            dragState={dragState}
            onTalentAction={onTalentAction}
          >
            {column.talents.map((talent) => (
              <div
                key={talent.id}
                draggable
                onDragStart={handleDragStart(talent, column.id)}
                onDragEnd={handleDragEnd}
              >
                <TalentCard
                  talent={talent}
                  onAction={onTalentAction}
                  isDragging={
                    dragState.isDragging && dragState.draggedItem?.id === talent.id
                  }
                />
              </div>
            ))}
          </DroppableColumn>
        </div>
      ))}
    </div>
  )
}