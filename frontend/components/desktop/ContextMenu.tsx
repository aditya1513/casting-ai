'use client'

import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  Copy,
  Edit,
  Trash2,
  Star,
  Calendar,
  MessageSquare,
  Download,
  Share,
  Archive,
  Eye,
  Users,
  Plus
} from 'lucide-react'

export interface ContextMenuItem {
  id: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  shortcut?: string
  action: () => void
  disabled?: boolean
  separator?: boolean
  destructive?: boolean
}

interface ContextMenuProps {
  children: React.ReactNode
  items: ContextMenuItem[]
  className?: string
}

export function ContextMenu({ children, items, className }: ContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) {
      setPosition({
        x: e.clientX,
        y: e.clientY
      })
      setIsOpen(true)
    }
  }

  const handleClickOutside = (e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setIsOpen(false)
    }
  }

  const handleItemClick = (item: ContextMenuItem) => {
    if (!item.disabled) {
      item.action()
      setIsOpen(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('contextmenu', handleClickOutside)
      
      // Adjust position if menu would go off-screen
      if (menuRef.current) {
        const menuRect = menuRef.current.getBoundingClientRect()
        const windowWidth = window.innerWidth
        const windowHeight = window.innerHeight
        
        let adjustedX = position.x
        let adjustedY = position.y
        
        if (position.x + menuRect.width > windowWidth) {
          adjustedX = position.x - menuRect.width
        }
        
        if (position.y + menuRect.height > windowHeight) {
          adjustedY = position.y - menuRect.height
        }
        
        if (adjustedX !== position.x || adjustedY !== position.y) {
          setPosition({ x: adjustedX, y: adjustedY })
        }
      }

      return () => {
        document.removeEventListener('click', handleClickOutside)
        document.removeEventListener('contextmenu', handleClickOutside)
      }
    }
  }, [isOpen, position])

  return (
    <div className={cn("relative", className)}>
      <div
        ref={triggerRef}
        onContextMenu={handleContextMenu}
        className="cursor-context-menu"
      >
        {children}
      </div>

      {isOpen && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-popover border border-border rounded-md shadow-lg py-1 min-w-[200px]"
          style={{
            left: position.x,
            top: position.y
          }}
        >
          {items.map((item, index) => (
            <React.Fragment key={item.id}>
              {item.separator && index > 0 && (
                <div className="h-px bg-border mx-2 my-1" />
              )}
              <div
                className={cn(
                  "flex items-center justify-between px-3 py-2 text-sm cursor-pointer select-none",
                  "hover:bg-accent hover:text-accent-foreground",
                  item.disabled && "opacity-50 cursor-not-allowed",
                  item.destructive && "text-destructive hover:bg-destructive hover:text-destructive-foreground"
                )}
                onClick={() => handleItemClick(item)}
              >
                <div className="flex items-center gap-2">
                  {item.icon && (
                    <item.icon className="h-4 w-4" />
                  )}
                  <span>{item.label}</span>
                </div>
                {item.shortcut && (
                  <span className="text-xs text-muted-foreground font-mono">
                    {item.shortcut}
                  </span>
                )}
              </div>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  )
}

// Pre-configured context menus for common CastMatch scenarios
export function TalentContextMenu({ 
  children, 
  onEdit, 
  onDelete, 
  onAddToShortlist, 
  onScheduleAudition,
  onSendMessage,
  onViewProfile 
}: {
  children: React.ReactNode
  onEdit: () => void
  onDelete: () => void
  onAddToShortlist: () => void
  onScheduleAudition: () => void
  onSendMessage: () => void
  onViewProfile: () => void
}) {
  const items: ContextMenuItem[] = [
    {
      id: 'view',
      label: 'View Profile',
      icon: Eye,
      shortcut: 'Enter',
      action: onViewProfile
    },
    {
      id: 'edit',
      label: 'Edit Talent',
      icon: Edit,
      shortcut: 'Ctrl+E',
      action: onEdit
    },
    {
      id: 'separator1',
      label: '',
      separator: true,
      action: () => {}
    },
    {
      id: 'shortlist',
      label: 'Add to Shortlist',
      icon: Star,
      shortcut: 'Ctrl+L',
      action: onAddToShortlist
    },
    {
      id: 'audition',
      label: 'Schedule Audition',
      icon: Calendar,
      shortcut: 'Ctrl+A',
      action: onScheduleAudition
    },
    {
      id: 'message',
      label: 'Send Message',
      icon: MessageSquare,
      shortcut: 'Ctrl+M',
      action: onSendMessage
    },
    {
      id: 'separator2',
      label: '',
      separator: true,
      action: () => {}
    },
    {
      id: 'delete',
      label: 'Delete Talent',
      icon: Trash2,
      shortcut: 'Del',
      destructive: true,
      action: onDelete
    }
  ]

  return (
    <ContextMenu items={items}>
      {children}
    </ContextMenu>
  )
}

export function ProjectContextMenu({ 
  children, 
  onEdit, 
  onDelete, 
  onDuplicate,
  onArchive,
  onShare,
  onExport,
  onViewTalents 
}: {
  children: React.ReactNode
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
  onArchive: () => void
  onShare: () => void
  onExport: () => void
  onViewTalents: () => void
}) {
  const items: ContextMenuItem[] = [
    {
      id: 'edit',
      label: 'Edit Project',
      icon: Edit,
      shortcut: 'Ctrl+E',
      action: onEdit
    },
    {
      id: 'duplicate',
      label: 'Duplicate Project',
      icon: Copy,
      shortcut: 'Ctrl+D',
      action: onDuplicate
    },
    {
      id: 'separator1',
      label: '',
      separator: true,
      action: () => {}
    },
    {
      id: 'talents',
      label: 'View Talents',
      icon: Users,
      shortcut: 'Ctrl+T',
      action: onViewTalents
    },
    {
      id: 'share',
      label: 'Share Project',
      icon: Share,
      shortcut: 'Ctrl+S',
      action: onShare
    },
    {
      id: 'export',
      label: 'Export Data',
      icon: Download,
      shortcut: 'Ctrl+Shift+E',
      action: onExport
    },
    {
      id: 'separator2',
      label: '',
      separator: true,
      action: () => {}
    },
    {
      id: 'archive',
      label: 'Archive Project',
      icon: Archive,
      action: onArchive
    },
    {
      id: 'delete',
      label: 'Delete Project',
      icon: Trash2,
      shortcut: 'Del',
      destructive: true,
      action: onDelete
    }
  ]

  return (
    <ContextMenu items={items}>
      {children}
    </ContextMenu>
  )
}