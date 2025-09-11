'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Command, 
  Search, 
  Navigation, 
  MessageSquare, 
  Mic,
  Settings,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Copy,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useVoiceCommands } from '../../hooks/useVoiceRecognition';
import { cn } from '@/lib/utils';

interface VoiceCommandHelpProps {
  isOpen: boolean;
  onClose: () => void;
  onCommandSelect?: (command: string) => void;
  className?: string;
}

export const VoiceCommandHelp: React.FC<VoiceCommandHelpProps> = ({
  isOpen,
  onClose,
  onCommandSelect,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['Chat & Messaging']);
  const [copiedCommands, setCopiedCommands] = useState<string[]>([]);
  
  const {
    availableCommands,
    getCommandSuggestions,
    getCommandsByCategory,
    getRecentCommands,
    totalCommands,
    commandCategories,
  } = useVoiceCommands();

  const commandsByCategory = getCommandsByCategory();
  const recentCommands = getRecentCommands();
  const suggestions = searchQuery ? getCommandSuggestions(searchQuery) : [];

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const copyCommand = async (command: string) => {
    try {
      await navigator.clipboard.writeText(command);
      setCopiedCommands(prev => [...prev, command]);
      setTimeout(() => {
        setCopiedCommands(prev => prev.filter(c => c !== command));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy command:', err);
    }
  };

  const categoryIcons = {
    'Chat & Messaging': MessageSquare,
    'Navigation': Navigation,
    'Search & Discovery': Search,
    'Casting Actions': Command,
    'Voice Control': Mic,
    'Interface': Settings,
    'Help & Support': HelpCircle,
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'Chat & Messaging': 'bg-blue-500/10 text-blue-700 border-blue-200',
      'Navigation': 'bg-green-500/10 text-green-700 border-green-200',
      'Search & Discovery': 'bg-purple-500/10 text-purple-700 border-purple-200',
      'Casting Actions': 'bg-orange-500/10 text-orange-700 border-orange-200',
      'Voice Control': 'bg-red-500/10 text-red-700 border-red-200',
      'Interface': 'bg-gray-500/10 text-gray-700 border-gray-200',
      'Help & Support': 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-500/10 text-gray-700 border-gray-200';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={cn(
            "bg-background border rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden",
            className
          )}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Command className="h-6 w-6 text-purple-600" />
                  Voice Commands
                </h2>
                <p className="text-muted-foreground mt-1">
                  Control CastMatch with your voice • {totalCommands} commands available
                </p>
              </div>
              <Button variant="ghost" onClick={onClose}>
                ✕
              </Button>
            </div>

            {/* Search */}
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search commands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex h-full max-h-[60vh]">
            {/* Sidebar */}
            <div className="w-64 border-r bg-muted/30 p-4 overflow-y-auto">
              <div className="space-y-4">
                {/* Recent Commands */}
                {recentCommands.length > 0 && (
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground mb-2">
                      Recent Commands
                    </h3>
                    <div className="space-y-1">
                      {recentCommands.map((cmd, index) => (
                        <Button
                          key={index}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-xs h-8"
                          onClick={() => onCommandSelect?.(cmd)}
                        >
                          <span className="truncate">"{cmd}"</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Stats */}
                <Card>
                  <CardContent className="p-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{totalCommands}</div>
                      <div className="text-xs text-muted-foreground">Total Commands</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                      <div className="text-center">
                        <div className="font-medium">{commandCategories.length}</div>
                        <div className="text-muted-foreground">Categories</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">{recentCommands.length}</div>
                        <div className="text-muted-foreground">Recent</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                {/* Search Results */}
                {searchQuery && (
                  <div className="mb-6">
                    <h3 className="font-medium mb-3">
                      Search Results ({suggestions.length})
                    </h3>
                    <div className="grid gap-2">
                      {suggestions.map((command) => (
                        <CommandItem
                          key={command}
                          command={command}
                          onCopy={copyCommand}
                          onSelect={onCommandSelect}
                          isCopied={copiedCommands.includes(command)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Command Categories */}
                {!searchQuery && (
                  <div className="space-y-4">
                    {Object.entries(commandsByCategory).map(([category, commands]) => {
                      const Icon = categoryIcons[category as keyof typeof categoryIcons] || Command;
                      const isExpanded = expandedCategories.includes(category);
                      
                      return (
                        <Card key={category}>
                          <CardHeader className="pb-3">
                            <button
                              onClick={() => toggleCategory(category)}
                              className="flex items-center justify-between w-full text-left"
                            >
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                <CardTitle className="text-base">{category}</CardTitle>
                                <Badge variant="secondary" className={getCategoryColor(category)}>
                                  {commands.length}
                                </Badge>
                              </div>
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          </CardHeader>
                          
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <CardContent className="pt-0">
                                  <div className="grid gap-2">
                                    {commands.map((command) => (
                                      <CommandItem
                                        key={command}
                                        command={command}
                                        onCopy={copyCommand}
                                        onSelect={onCommandSelect}
                                        isCopied={copiedCommands.includes(command)}
                                      />
                                    ))}
                                  </div>
                                </CardContent>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* No Results */}
                {searchQuery && suggestions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No commands found matching "{searchQuery}"</p>
                    <p className="text-sm mt-1">Try a different search term</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Command Item Component
interface CommandItemProps {
  command: string;
  onCopy: (command: string) => void;
  onSelect?: (command: string) => void;
  isCopied: boolean;
}

const CommandItem: React.FC<CommandItemProps> = ({
  command,
  onCopy,
  onSelect,
  isCopied,
}) => {
  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors group">
      <button
        onClick={() => onSelect?.(command)}
        className="flex-1 text-left"
      >
        <code className="text-sm font-mono bg-background px-2 py-1 rounded">
          "{command}"
        </code>
      </button>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCopy(command)}
              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
            >
              {isCopied ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isCopied ? 'Copied!' : 'Copy command'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};