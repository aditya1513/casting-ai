// UXerflow AI Platform Patterns - React + Tailwind Implementation
// For CastMatch Entertainment Platform

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Command } from 'cmdk';
import { 
  SparklesIcon, 
  UserIcon, 
  CalendarIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  FilmIcon,
  MicrophoneIcon,
  PaperClipIcon,
  ArrowUpIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

// ========================================
// Design Tokens
// ========================================

const tokens = {
  colors: {
    primary: {
      50: '#EEF2FF',
      100: '#E0E7FF',
      200: '#C7D2FE',
      300: '#A5B4FC',
      400: '#818CF8',
      500: '#6366F1',
      600: '#4F46E5',
      700: '#4338CA',
      800: '#3730A3',
      900: '#312E81',
      950: '#1E1B4B'
    },
    neutral: {
      50: '#FAFAFA',
      100: '#F4F4F5',
      200: '#E4E4E7',
      300: '#D4D4D8',
      400: '#A1A1AA',
      500: '#71717A',
      600: '#52525B',
      700: '#3F3F46',
      800: '#27272A',
      900: '#18181B',
      950: '#0A0A0B'
    },
    ai: {
      thinking: '#A78BFA',
      active: '#34D399',
      idle: '#94A3B8',
      glow: 'rgba(139, 92, 246, 0.3)'
    }
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px'
  },
  animation: {
    instant: '100ms',
    fast: '200ms',
    normal: '300ms',
    slow: '500ms',
    slower: '700ms'
  }
};

// ========================================
// 1. AI Message Bubble Component
// ========================================

interface AIMessageProps {
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  isStreaming?: boolean;
  status?: 'thinking' | 'typing' | 'complete';
}

export const AIMessage: React.FC<AIMessageProps> = ({
  content,
  role,
  timestamp,
  isStreaming = false,
  status = 'complete'
}) => {
  const [displayedContent, setDisplayedContent] = useState(isStreaming ? '' : content);
  
  useEffect(() => {
    if (isStreaming) {
      let index = 0;
      const interval = setInterval(() => {
        if (index < content.length) {
          setDisplayedContent(content.slice(0, index + 1));
          index++;
        } else {
          clearInterval(interval);
        }
      }, 20);
      return () => clearInterval(interval);
    }
  }, [content, isStreaming]);

  const messageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  return (
    <motion.div
      variants={messageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`flex gap-3 max-w-[70%] ${role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className={`
            w-10 h-10 rounded-full flex items-center justify-center
            ${role === 'assistant' 
              ? 'bg-gradient-to-br from-violet-500 to-indigo-500 shadow-lg shadow-violet-500/20' 
              : role === 'user'
              ? 'bg-neutral-700'
              : 'bg-amber-500/20'
            }
          `}>
            {role === 'assistant' && <SparklesIcon className="w-5 h-5 text-white" />}
            {role === 'user' && <UserIcon className="w-5 h-5 text-neutral-300" />}
            {role === 'system' && <ExclamationCircleIcon className="w-5 h-5 text-amber-500" />}
          </div>
          
          {/* Status Indicator */}
          {role === 'assistant' && status !== 'complete' && (
            <div className="relative -mt-2 -mr-2">
              <span className="flex h-3 w-3">
                <span className={`
                  animate-ping absolute inline-flex h-full w-full rounded-full opacity-75
                  ${status === 'thinking' ? 'bg-violet-400' : 'bg-green-400'}
                `}></span>
                <span className={`
                  relative inline-flex rounded-full h-3 w-3
                  ${status === 'thinking' ? 'bg-violet-500' : 'bg-green-500'}
                `}></span>
              </span>
            </div>
          )}
        </div>

        {/* Message Content */}
        <div className="flex flex-col gap-1">
          <div className={`
            px-4 py-3 rounded-2xl relative
            ${role === 'user' 
              ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white rounded-tr-sm' 
              : role === 'assistant'
              ? 'bg-neutral-800/80 backdrop-blur-sm text-neutral-100 rounded-tl-sm border border-neutral-700/50'
              : 'bg-amber-500/10 text-amber-200 border border-amber-500/20'
            }
          `}>
            {/* AI Glow Effect */}
            {role === 'assistant' && (
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 to-indigo-600/10 blur-xl -z-10 rounded-2xl" />
            )}
            
            <p className="text-sm leading-relaxed">
              {displayedContent}
              {isStreaming && <span className="inline-block w-1 h-4 ml-1 bg-current animate-pulse" />}
            </p>
            
            {/* Thinking Dots */}
            {status === 'thinking' && (
              <div className="flex gap-1 mt-2">
                <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            )}
          </div>
          
          {/* Timestamp */}
          <span className="text-xs text-neutral-500 px-2">
            {timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

// ========================================
// 2. Agent Card Component
// ========================================

interface AgentCardProps {
  name: string;
  description: string;
  avatar: string;
  capabilities: string[];
  metrics: {
    accuracy: number;
    speed: number;
    usage: number;
  };
  status: 'online' | 'busy' | 'offline';
  onSelect: () => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({
  name,
  description,
  avatar,
  capabilities,
  metrics,
  status,
  onSelect
}) => {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="
        w-80 h-[400px] p-6
        bg-neutral-900/60 backdrop-blur-xl
        border border-neutral-800 rounded-2xl
        shadow-xl shadow-black/20
        cursor-pointer relative overflow-hidden
        flex flex-col
      "
      onClick={onSelect}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-indigo-500" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] " />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="flex items-center gap-4">
          {/* Avatar with Status */}
          <div className="relative">
            <img 
              src={avatar} 
              alt={name}
              className="w-16 h-16 rounded-full border-2 border-violet-500/50"
            />
            <span className={`
              absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-neutral-900
              ${status === 'online' ? 'bg-green-500' : status === 'busy' ? 'bg-amber-500' : 'bg-neutral-500'}
            `} />
          </div>
          
          {/* Name and Status */}
          <div>
            <h3 className="text-lg font-semibold text-white">{name}</h3>
            <span className={`
              text-xs font-medium
              ${status === 'online' ? 'text-green-400' : status === 'busy' ? 'text-amber-400' : 'text-neutral-400'}
            `}>
              {status === 'online' ? 'Available' : status === 'busy' ? 'Processing' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-neutral-400 mb-4 flex-grow">
        {description}
      </p>

      {/* Capabilities */}
      <div className="mb-4">
        <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">Capabilities</p>
        <div className="flex flex-wrap gap-2">
          {capabilities.map((cap, index) => (
            <span 
              key={index}
              className="px-3 py-1 bg-violet-500/10 text-violet-300 rounded-full text-xs font-medium border border-violet-500/20"
            >
              {cap}
            </span>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{metrics.accuracy}%</p>
          <p className="text-xs text-neutral-500">Accuracy</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{metrics.speed}ms</p>
          <p className="text-xs text-neutral-500">Avg Speed</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{metrics.usage}k</p>
          <p className="text-xs text-neutral-500">Requests</p>
        </div>
      </div>

      {/* Action Button */}
      <button className="
        w-full py-3 mt-auto
        bg-gradient-to-r from-violet-500 to-indigo-500
        text-white font-medium rounded-xl
        hover:shadow-lg hover:shadow-violet-500/25
        transition-all duration-300
      ">
        Start Conversation
      </button>
    </motion.div>
  );
};

// ========================================
// 3. Command Palette Component
// ========================================

export const CastingCommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const commands = [
    {
      category: 'AI Actions',
      items: [
        { icon: SparklesIcon, label: 'Find perfect match for lead role', shortcut: '⌘P' },
        { icon: CalendarIcon, label: 'Schedule auditions with AI', shortcut: '⌘S' },
        { icon: ChartBarIcon, label: 'Analyze talent performance', shortcut: '⌘A' }
      ]
    },
    {
      category: 'Casting',
      items: [
        { icon: UserIcon, label: 'Add new talent', shortcut: '⌘N' },
        { icon: FilmIcon, label: 'Create new project', shortcut: '⌘⇧N' },
        { icon: MicrophoneIcon, label: 'Start voice audition', shortcut: '⌘V' }
      ]
    }
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={() => setOpen(false)}
          />
          
          {/* Command Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-2xl bg-neutral-950/95 backdrop-blur-xl border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-neutral-800">
                <SparklesIcon className="w-5 h-5 text-violet-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search talents, create auditions, or ask AI..."
                  className="flex-1 bg-transparent text-white placeholder-neutral-500 outline-none text-base"
                  autoFocus
                />
                <kbd className="px-2 py-1 bg-neutral-800 rounded text-xs text-neutral-400">ESC</kbd>
              </div>
              
              {/* Command List */}
              <div className="max-h-96 overflow-y-auto p-2">
                {commands.map((group, groupIndex) => (
                  <div key={groupIndex} className="mb-4">
                    <p className="px-3 py-1 text-xs text-neutral-500 uppercase tracking-wider">
                      {group.category}
                    </p>
                    {group.items.map((item, itemIndex) => (
                      <button
                        key={itemIndex}
                        className="
                          w-full flex items-center justify-between gap-3 px-3 py-3 rounded-lg
                          hover:bg-neutral-900 transition-colors duration-150
                          group cursor-pointer
                        "
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="w-5 h-5 text-neutral-400 group-hover:text-violet-400 transition-colors" />
                          <span className="text-neutral-200 group-hover:text-white transition-colors">
                            {item.label}
                          </span>
                        </div>
                        <kbd className="px-2 py-1 bg-neutral-800 rounded text-xs text-neutral-500">
                          {item.shortcut}
                        </kbd>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              
              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-3 border-t border-neutral-800 text-xs text-neutral-500">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-neutral-800 rounded">↑</kbd>
                    <kbd className="px-1.5 py-0.5 bg-neutral-800 rounded">↓</kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-neutral-800 rounded">↵</kbd>
                    Select
                  </span>
                </div>
                <span>Powered by CastMatch AI</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ========================================
// 4. Chat Input Component with AI Features
// ========================================

interface ChatInputProps {
  onSend: (message: string, attachments?: File[]) => void;
  isAIResponding?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, isAIResponding = false }) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (message.trim() && !isAIResponding) {
      onSend(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative px-6 py-4 bg-neutral-950 border-t border-neutral-800">
      <div className="relative flex items-center gap-3 p-3 bg-neutral-900 rounded-2xl border border-neutral-800">
        {/* Attachment Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-neutral-400 hover:text-white transition-colors"
        >
          <PaperClipIcon className="w-5 h-5" />
        </button>
        <input ref={fileInputRef} type="file" multiple hidden />

        {/* Input Field */}
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={isAIResponding ? "AI is thinking..." : "Ask about talent, schedules, or projects..."}
          disabled={isAIResponding}
          className="
            flex-1 bg-transparent text-white placeholder-neutral-500 outline-none
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        />

        {/* Voice Button */}
        <button
          onClick={() => setIsRecording(!isRecording)}
          className={`
            p-2 transition-all duration-200
            ${isRecording 
              ? 'text-red-500 bg-red-500/10 rounded-full animate-pulse' 
              : 'text-neutral-400 hover:text-white'
            }
          `}
        >
          <MicrophoneIcon className="w-5 h-5" />
        </button>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!message.trim() || isAIResponding}
          className={`
            p-2 rounded-xl transition-all duration-200
            ${message.trim() && !isAIResponding
              ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-lg shadow-violet-500/25'
              : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
            }
          `}
        >
          <ArrowUpIcon className="w-5 h-5" />
        </button>
      </div>

      {/* AI Status Indicator */}
      {isAIResponding && (
        <div className="absolute -top-8 left-6 flex items-center gap-2 text-xs text-violet-400">
          <span className="flex gap-1">
            <span className="w-1 h-1 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-1 h-1 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-1 h-1 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </span>
          AI is analyzing your request...
        </div>
      )}
    </div>
  );
};

// ========================================
// 5. Dashboard KPI Card
// ========================================

interface KPICardProps {
  title: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  sparklineData?: number[];
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  change,
  trend,
  sparklineData = [40, 45, 42, 48, 51, 49, 54, 58, 56, 60, 63, 61]
}) => {
  const max = Math.max(...sparklineData);
  const min = Math.min(...sparklineData);
  const range = max - min;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="
        p-5 bg-neutral-900/50 backdrop-blur-sm
        border border-neutral-800 rounded-xl
        hover:border-neutral-700 transition-all duration-300
      "
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-neutral-500 uppercase tracking-wider">{title}</p>
        <div className={`
          flex items-center gap-1 text-xs font-medium
          ${trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-neutral-400'}
        `}>
          {trend === 'up' && '↑'}
          {trend === 'down' && '↓'}
          {Math.abs(change)}%
        </div>
      </div>

      {/* Value */}
      <div className="mb-4">
        <p className="text-3xl font-bold text-white">{value}</p>
      </div>

      {/* Sparkline */}
      <div className="h-10 flex items-end gap-0.5">
        {sparklineData.map((point, index) => {
          const height = ((point - min) / range) * 100;
          return (
            <div
              key={index}
              className="flex-1 bg-gradient-to-t from-violet-500/50 to-violet-500 rounded-t"
              style={{ height: `${height}%` }}
            />
          );
        })}
      </div>
    </motion.div>
  );
};

// ========================================
// 6. Full Chat Interface Layout
// ========================================

export const CastMatchAIInterface: React.FC = () => {
  const [messages, setMessages] = useState<AIMessageProps[]>([
    {
      content: "Hello! I'm your AI Casting Assistant. I can help you find perfect talent matches, schedule auditions, and analyze performance data. How can I assist you today?",
      role: 'assistant',
      timestamp: new Date(),
      status: 'complete'
    }
  ]);
  const [isAIResponding, setIsAIResponding] = useState(false);

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: AIMessageProps = {
      content,
      role: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    
    // Simulate AI response
    setIsAIResponding(true);
    
    // Add thinking message
    const thinkingMessage: AIMessageProps = {
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      status: 'thinking'
    };
    setMessages(prev => [...prev, thinkingMessage]);
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Replace thinking message with actual response
    const aiResponse: AIMessageProps = {
      content: `I've analyzed your request. Based on your criteria, I found 3 perfect matches for your project. Would you like me to show you their profiles and availability?`,
      role: 'assistant',
      timestamp: new Date(),
      isStreaming: true,
      status: 'complete'
    };
    
    setMessages(prev => [...prev.slice(0, -1), aiResponse]);
    setIsAIResponding(false);
  };

  return (
    <div className="h-screen flex bg-neutral-950">
      {/* Sidebar - Agent Selection */}
      <aside className="w-80 border-r border-neutral-800 p-6 overflow-y-auto">
        <h2 className="text-lg font-semibold text-white mb-6">AI Agents</h2>
        <div className="space-y-4">
          <AgentCard
            name="Casting Director AI"
            description="Expert in talent matching and audition scheduling"
            avatar="/api/placeholder/64/64"
            capabilities={['Talent Matching', 'Schedule Optimization', 'Script Analysis']}
            metrics={{ accuracy: 94, speed: 230, usage: 12.5 }}
            status="online"
            onSelect={() => console.log('Agent selected')}
          />
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {/* Chat Header */}
        <header className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
              <SparklesIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-medium">Casting Director AI</h3>
              <p className="text-xs text-green-400">Online • Ready to assist</p>
            </div>
          </div>
          <button className="p-2 text-neutral-400 hover:text-white transition-colors">
            <ChatBubbleLeftRightIcon className="w-5 h-5" />
          </button>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {messages.map((message, index) => (
            <AIMessage key={index} {...message} />
          ))}
        </div>

        {/* Input Area */}
        <ChatInput onSend={handleSendMessage} isAIResponding={isAIResponding} />
      </main>

      {/* Right Panel - Talent Recommendations */}
      <aside className="w-96 border-l border-neutral-800 p-6 overflow-y-auto">
        <h3 className="text-lg font-semibold text-white mb-4">AI Recommendations</h3>
        
        {/* KPI Cards */}
        <div className="space-y-4">
          <KPICard
            title="Talents Matched"
            value="847"
            change={12}
            trend="up"
          />
          <KPICard
            title="Auditions Today"
            value="23"
            change={-5}
            trend="down"
          />
          <KPICard
            title="Success Rate"
            value="92%"
            change={3}
            trend="up"
          />
        </div>
      </aside>

      {/* Command Palette */}
      <CastingCommandPalette />
    </div>
  );
};

// Export all components
export default {
  AIMessage,
  AgentCard,
  CastingCommandPalette,
  ChatInput,
  KPICard,
  CastMatchAIInterface,
  tokens
};