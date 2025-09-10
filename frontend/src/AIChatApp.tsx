import React, { useState, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import { 
  Send, Bot, User, Sparkles, Search, Film, Users, 
  MessageCircle, Clock, ChevronLeft, Mic, MicOff,
  Copy, ThumbsUp, ThumbsDown, RefreshCw
} from 'lucide-react';
import type { AppRouter } from './types/trpc';

// Create tRPC React hooks
const trpc = createTRPCReact<AppRouter>();

// tRPC client configuration
const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3001/api/trpc',
    }),
  ],
});

interface Message {
  id: string;
  content: string;
  type: 'user' | 'assistant';
  timestamp: Date;
  suggestions?: string[];
  isStreaming?: boolean;
}

function ChatMessage({ message }: { message: Message }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className={`flex max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start space-x-3`}>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          message.type === 'user' ? 'bg-blue-600' : 'bg-purple-600'
        }`}>
          {message.type === 'user' ? (
            <User className="h-4 w-4 text-white" />
          ) : (
            <Bot className="h-4 w-4 text-white" />
          )}
        </div>
        
        <div className={`rounded-lg p-4 ${
          message.type === 'user' 
            ? 'bg-blue-600 text-white' 
            : 'bg-slate-700 text-slate-100'
        }`}>
          <div className="whitespace-pre-wrap">{message.content}</div>
          
          {message.suggestions && message.suggestions.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-slate-300 font-semibold">Suggested follow-ups:</p>
              {message.suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  className="block w-full text-left px-3 py-2 bg-slate-600 hover:bg-slate-500 rounded text-sm transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
          
          <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
            <span>{message.timestamp.toLocaleTimeString()}</span>
            {message.type === 'assistant' && (
              <div className="flex items-center space-x-2">
                <button 
                  onClick={handleCopy}
                  className="hover:text-slate-300 transition-colors"
                >
                  <Copy className="h-3 w-3" />
                </button>
                <button className="hover:text-green-400 transition-colors">
                  <ThumbsUp className="h-3 w-3" />
                </button>
                <button className="hover:text-red-400 transition-colors">
                  <ThumbsDown className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatSidebar({ onClose, onPromptSelect }: { onClose: () => void; onPromptSelect: (prompt: string) => void }) {
  const quickPrompts = [
    {
      category: "Talent Search",
      icon: Search,
      prompts: [
        "Find actresses aged 25-35 for romantic comedy",
        "Search for male actors with martial arts experience",
        "Show me character actors for web series"
      ]
    },
    {
      category: "Script Analysis", 
      icon: Film,
      prompts: [
        "Analyze this script for character requirements",
        "Extract age demographics from screenplay",
        "Identify key personality traits for lead role"
      ]
    },
    {
      category: "Casting Insights",
      icon: Users, 
      prompts: [
        "What's the current market rate for lead actors?",
        "Suggest casting combinations for ensemble piece",
        "Compare actor profiles for similar roles"
      ]
    }
  ];

  return (
    <div className="w-80 bg-slate-800 border-r border-slate-700 p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Chat Assistant</h3>
        <button 
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      </div>
      
      <div className="space-y-6">
        {quickPrompts.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.category}>
              <div className="flex items-center space-x-2 mb-3">
                <Icon className="h-4 w-4 text-blue-400" />
                <h4 className="text-sm font-semibold text-white">{section.category}</h4>
              </div>
              <div className="space-y-2">
                {section.prompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => onPromptSelect(prompt)}
                    className="w-full text-left px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm text-slate-300 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AIChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hi! I'm your CastMatch AI assistant. I can help you with talent search, script analysis, casting insights, and more. What would you like to explore today?",
      type: 'assistant',
      timestamp: new Date(),
      suggestions: [
        "Search for talent in Mumbai for action movie",
        "Analyze character requirements for my script",
        "What are current industry casting trends?"
      ]
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // AI Chat mutation hook
  const aiChatMutation = trpc.ai.chat.useMutation({
    onSuccess: (data) => {
      const aiResponse: Message = {
        id: Date.now().toString(),
        content: data.data.message,
        type: 'assistant',
        timestamp: new Date(),
        suggestions: data.data.suggestions
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    },
    onError: (error) => {
      const errorResponse: Message = {
        id: Date.now().toString(),
        content: `I apologize, but I'm experiencing some technical difficulties. ${error.message}. Please try again or contact support if the issue persists.`,
        type: 'assistant',
        timestamp: new Date(),
        suggestions: [
          "Try a different question",
          "Refresh the page",
          "Contact technical support"
        ]
      };
      setMessages(prev => [...prev, errorResponse]);
      setIsLoading(false);
    }
  });

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      type: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    const currentMessage = inputMessage;
    setInputMessage('');
    setIsLoading(true);
    
    // Determine context type based on message content
    let contextType: 'talent_search' | 'script_analysis' | 'casting_insights' = 'casting_insights';
    if (currentMessage.toLowerCase().includes('search') || currentMessage.toLowerCase().includes('find') || currentMessage.toLowerCase().includes('actor') || currentMessage.toLowerCase().includes('talent')) {
      contextType = 'talent_search';
    } else if (currentMessage.toLowerCase().includes('script') || currentMessage.toLowerCase().includes('character') || currentMessage.toLowerCase().includes('analyze')) {
      contextType = 'script_analysis';
    }
    
    // Make AI chat API call
    try {
      await aiChatMutation.mutateAsync({
        message: currentMessage,
        context: { type: contextType }
      });
    } catch (error) {
      // Error handled in onError callback
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleVoiceInput = () => {
    setIsListening(!isListening);
    // Voice input implementation would go here
  };

  return (
    <div className="flex h-screen bg-slate-900">
      {showSidebar && (
        <ChatSidebar 
          onClose={() => setShowSidebar(false)} 
          onPromptSelect={(prompt) => {
            setInputMessage(prompt);
            setTimeout(() => handleSendMessage(), 100);
          }}
        />
      )}
      
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-slate-800 border-b border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-600 rounded-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">CastMatch AI Assistant</h2>
                <p className="text-sm text-slate-400">Powered by advanced casting intelligence</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                <span className="text-sm text-green-400">Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          
          {isLoading && (
            <div className="flex justify-start mb-6">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-slate-700 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />
                    <span className="text-slate-300">AI is analyzing your request...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-slate-800 border-t border-slate-700 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end space-x-4">
              <div className="flex-1 relative">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about talent search, script analysis, casting insights..."
                  className="w-full px-4 py-3 pr-12 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none resize-none"
                  rows={1}
                  style={{ minHeight: '44px' }}
                />
                <button
                  onClick={toggleVoiceInput}
                  className={`absolute right-3 top-3 p-1 rounded transition-colors ${
                    isListening ? 'text-red-400 hover:text-red-300' : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                <Send className="h-4 w-4" />
                <span>Send</span>
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center">
              Press Enter to send • Shift + Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AIChatApp() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 1000,
        refetchOnWindowFocus: false,
        retry: 3,
      },
    },
  }));

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AIChatInterface />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export default AIChatApp;