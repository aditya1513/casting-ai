'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { KeyboardShortcut, useKeyboardShortcutsHelp } from '@/hooks/useKeyboardShortcuts'

interface KeyboardShortcutsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shortcuts: KeyboardShortcut[]
}

export function KeyboardShortcutsModal({
  open,
  onOpenChange,
  shortcuts
}: KeyboardShortcutsModalProps) {
  const { getShortcutDisplay, getShortcutsByCategory } = useKeyboardShortcutsHelp(shortcuts)
  const categorizedShortcuts = getShortcutsByCategory()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Keyboard Shortcuts
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Use these shortcuts to navigate CastMatch more efficiently
          </p>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {Object.entries(categorizedShortcuts).map(([category, shortcuts]) => (
              <div key={category} className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {category}
                </h3>
                <div className="grid gap-2">
                  {shortcuts.map((shortcut, index) => (
                    <div
                      key={`${category}-${index}`}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {getShortcutDisplay(shortcut).split(' + ').map((key, keyIndex) => (
                          <React.Fragment key={keyIndex}>
                            {keyIndex > 0 && (
                              <span className="text-xs text-muted-foreground">+</span>
                            )}
                            <Badge 
                              variant="outline" 
                              className="px-2 py-1 text-xs font-mono bg-muted"
                            >
                              {key}
                            </Badge>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            Press <Badge variant="outline" className="text-xs">Ctrl</Badge> + 
            <Badge variant="outline" className="text-xs ml-1">/</Badge> to open this dialog
          </div>
          <div className="text-xs text-muted-foreground">
            Press <Badge variant="outline" className="text-xs">Esc</Badge> to close
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Compact shortcut display component for inline use
export function ShortcutBadge({ 
  shortcut, 
  className 
}: { 
  shortcut: KeyboardShortcut
  className?: string 
}) {
  const { getShortcutDisplay } = useKeyboardShortcutsHelp([shortcut])
  
  return (
    <Badge variant="outline" className={`text-xs font-mono ${className}`}>
      {getShortcutDisplay(shortcut)}
    </Badge>
  )
}