import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Search,
  Film,
  Users,
  MessageCircle,
  Clock,
  ChevronLeft,
  Mic,
  MicOff,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Star,
  Calendar,
  MapPin,
  Award,
  Menu,
  X,
  ArrowDown,
  Loader2,
  CheckCircle,
  AlertCircle,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AppRouter } from '../types/trpc';

// Import Shadcn/UI components
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Textarea } from './ui/textarea';
import { cn } from '../lib/utils';

// Create tRPC React hooks
const trpc = createTRPCReact<AppRouter>();

// tRPC client configuration
const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3001/api/trpc',
      headers: () => {
        const headers: Record<string, string> = {};
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('auth_token');
          if (token) {
            headers.Authorization = `Bearer ${token}`;
          }
        }
        return headers;
      },
    }),
  ],
});

interface Message {
  id: string;
  content: string;
  type: 'user' | 'assistant' | 'system';
  timestamp: Date;
  suggestions?: string[];
  isStreaming?: boolean;
  talent?: TalentCard;
  error?: boolean;
}

interface TalentCard {
  id: string;
  name: string;
  role: string;
  image?: string;
  rating: number;
  experience: string;
  location: string;
  skills: string[];
  availability: string;
}

// Beautiful animated message component
const ChatMessage: React.FC<{
  message: Message;
  onSuggestionClick?: (suggestion: string) => void;
}> = ({ message, onSuggestionClick }) => {
  const [copied, setCopied] = useState(false);
  const [reaction, setReaction] = useState<'like' | 'dislike' | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const messageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
  };

  return (
    <motion.div
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'flex w-full gap-3 px-4 py-3',
        message.type === 'user' ? 'justify-end' : 'justify-start'
      )}
    >
      {message.type !== 'user' && (
        <Avatar className="h-8 w-8 border-2 border-purple-500/20">
          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
            {message.type === 'system' ? <Info className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn('flex flex-col gap-2 max-w-[70%]', message.type === 'user' && 'items-end')}
      >
        <Card
          className={cn(
            'transition-all duration-200',
            message.type === 'user'
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-400/20'
              : message.error
                ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-lg'
          )}
        >
          <CardContent className="p-3">
            {message.isStreaming ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Analyzing your request...</span>
              </div>
            ) : (
              <>
                <p
                  className={cn(
                    'text-sm whitespace-pre-wrap',
                    message.type === 'user' ? 'text-white' : 'text-slate-700 dark:text-slate-200'
                  )}
                >
                  {message.content}
                </p>

                {/* Talent Card Display */}
                {message.talent && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mt-3"
                  >
                    <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-700">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12 border-2 border-white shadow-md">
                              <AvatarImage src={message.talent.image} alt={message.talent.name} />
                              <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white font-bold">
                                {message.talent.name
                                  .split(' ')
                                  .map(n => n[0])
                                  .join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <CardTitle className="text-base">{message.talent.name}</CardTitle>
                              <CardDescription className="text-xs">
                                {message.talent.role}
                              </CardDescription>
                            </div>
                          </div>
                          <Badge variant="warning" className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-current" />
                            {message.talent.rating}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-2">
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge variant="outline" className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {message.talent.location}
                          </Badge>
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Award className="h-3 w-3" />
                            {message.talent.experience}
                          </Badge>
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {message.talent.availability}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {message.talent.skills.map((skill, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                      <CardFooter className="pt-2">
                        <Button
                          size="sm"
                          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                        >
                          View Full Profile
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                )}

                {/* Suggestions */}
                {message.suggestions && message.suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-3 space-y-2"
                  >
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Suggested follow-ups:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {message.suggestions.map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => onSuggestionClick?.(suggestion)}
                          className="text-xs hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 dark:hover:border-purple-700 transition-all"
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </CardContent>

          {/* Message Actions */}
          {message.type === 'assistant' && !message.isStreaming && (
            <CardFooter className="p-2 pt-0 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 w-7 p-0">
                  {copied ? (
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReaction(reaction === 'like' ? null : 'like')}
                  className={cn('h-7 w-7 p-0', reaction === 'like' && 'text-green-500')}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReaction(reaction === 'dislike' ? null : 'dislike')}
                  className={cn('h-7 w-7 p-0', reaction === 'dislike' && 'text-red-500')}
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>

        {message.type === 'user' && (
          <span className="text-xs text-slate-400 px-2">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {message.type === 'user' && (
        <Avatar className="h-8 w-8 border-2 border-blue-500/20">
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </motion.div>
  );
};

// Sidebar with quick actions
const ChatSidebar: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onPromptSelect: (prompt: string) => void;
}> = ({ isOpen, onClose, onPromptSelect }) => {
  const quickPrompts = [
    {
      category: 'Talent Discovery',
      icon: Search,
      color: 'from-blue-500 to-cyan-500',
      prompts: [
        'Find actresses aged 25-35 for a romantic comedy in Mumbai',
        'Search for male actors with martial arts experience',
        'Show me character actors for a period drama web series',
        'Find child actors aged 8-12 for commercial shoot',
      ],
    },
    {
      category: 'Script Analysis',
      icon: Film,
      color: 'from-purple-500 to-pink-500',
      prompts: [
        'Analyze this script for character requirements',
        'Extract age demographics from screenplay',
        'Identify key personality traits for lead role',
        'Break down casting needs by scene',
      ],
    },
    {
      category: 'Casting Strategy',
      icon: Users,
      color: 'from-green-500 to-emerald-500',
      prompts: [
        "What's the current market rate for lead actors?",
        'Suggest casting combinations for ensemble piece',
        'Compare actor profiles for similar roles',
        'Create casting budget breakdown',
      ],
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-40 lg:hidden"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 h-full w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 z-50 overflow-hidden flex flex-col"
          >
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">Quick Actions</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Select or customize
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-6">
                {quickPrompts.map(section => {
                  const Icon = section.icon;
                  return (
                    <div key={section.category}>
                      <div className="flex items-center gap-2 mb-3">
                        <div
                          className={cn(
                            'p-1.5 rounded-lg bg-gradient-to-br text-white',
                            section.color
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                          {section.category}
                        </h4>
                      </div>
                      <div className="space-y-2">
                        {section.prompts.map((prompt, index) => (
                          <motion.button
                            key={index}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              onPromptSelect(prompt);
                              onClose();
                            }}
                            className="w-full text-left p-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          >
                            <p className="text-sm text-slate-700 dark:text-slate-200">{prompt}</p>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Main Chat Interface
const AIChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content:
        "Welcome to CastMatch AI! I'm your intelligent casting assistant, specialized in helping you find the perfect talent for your productions. I can help you with:\n\n• Talent discovery and search\n• Script analysis for casting requirements\n• Industry insights and recommendations\n• Budget planning and negotiations\n\nHow can I assist you today?",
      type: 'assistant',
      timestamp: new Date(),
      suggestions: [
        'Find actors for upcoming Bollywood film',
        'Analyze my script for casting needs',
        'Show current industry rates',
      ],
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [autoScroll]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Check connection status
  const connectionTest = trpc.simpleChat.test.useQuery(undefined, {
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Chat mutation
  const chatMutation = trpc.simpleChat.chat.useMutation({
    onMutate: () => {
      setIsLoading(true);
      // Add loading message
      const loadingMessage: Message = {
        id: `loading-${Date.now()}`,
        content: '',
        type: 'assistant',
        timestamp: new Date(),
        isStreaming: true,
      };
      setMessages(prev => [...prev, loadingMessage]);
    },
    onSuccess: data => {
      // Remove loading message and add response
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isStreaming);

        // Create sample talent card if response mentions talent
        const talent =
          data.response?.toLowerCase().includes('actor') ||
          data.response?.toLowerCase().includes('actress')
            ? {
                id: '1',
                name: 'Priya Sharma',
                role: 'Lead Actress',
                image: undefined,
                rating: 4.8,
                experience: '8 years',
                location: 'Mumbai',
                skills: ['Drama', 'Comedy', 'Dance', 'Hindi', 'English'],
                availability: 'Available',
              }
            : undefined;

        const aiResponse: Message = {
          id: Date.now().toString(),
          content: data.response || 'I found some great options for you!',
          type: 'assistant',
          timestamp: new Date(),
          suggestions: [
            'Tell me more about this talent',
            'Show similar profiles',
            'Check availability',
          ],
          talent,
        };
        return [...filtered, aiResponse];
      });
      setIsLoading(false);
    },
    onError: error => {
      // Remove loading message and add error
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isStreaming);
        const errorResponse: Message = {
          id: Date.now().toString(),
          content: `I apologize, but I encountered an error: ${error.message}. Please try again or contact support if the issue persists.`,
          type: 'assistant',
          timestamp: new Date(),
          error: true,
          suggestions: ['Try a different question', 'Refresh the page', 'Contact support'],
        };
        return [...filtered, errorResponse];
      });
      setIsLoading(false);
    },
  });

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      type: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = inputMessage;
    setInputMessage('');

    // Send to backend
    await chatMutation.mutateAsync({
      message: currentMessage,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
    setTimeout(() => handleSendMessage(), 100);
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // Voice recording implementation would go here
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <ChatSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onPromptSelect={handleSuggestionClick}
      />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    CastMatch AI Assistant
                  </h2>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={connectionTest.data?.hasApiKey ? 'success' : 'destructive'}
                      className="text-xs"
                    >
                      {connectionTest.data?.status === 'ok' ? 'Connected' : 'Disconnected'}
                    </Badge>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Powered by advanced AI
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoScroll(!autoScroll)}
                className={cn(autoScroll && 'bg-purple-50 dark:bg-purple-900/20')}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setMessages([messages[0]])}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1" ref={scrollAreaRef}>
          <div className="py-4">
            <AnimatePresence initial={false}>
              {messages.map(message => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onSuggestionClick={handleSuggestionClick}
                />
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Textarea
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about talent, scripts, casting strategies..."
                  className="min-h-[52px] max-h-32 resize-none pr-12 bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
                  disabled={isLoading}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleRecording}
                  className={cn('absolute right-2 top-2', isRecording && 'text-red-500')}
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Press Enter to send • Shift + Enter for new line
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(true)}
                  className="text-xs"
                >
                  <MessageCircle className="h-3 w-3 mr-1" />
                  Quick Actions
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main App wrapper with providers
function AIChatApp() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 1000,
            refetchOnWindowFocus: false,
            retry: 3,
          },
        },
      })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AIChatInterface />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export default AIChatApp;
