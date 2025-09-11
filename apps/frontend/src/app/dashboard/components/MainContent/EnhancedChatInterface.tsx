'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@heroui/react';
import { PlusCircleIcon, SparklesIcon } from '@heroicons/react/24/outline';
import MessageBubble from '../Shared/MessageBubble';
import TalentGrid from './TalentGrid';

interface EnhancedMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp?: string;
  metadata?: {
    agentType?: string;
    workflowStep?: string;
    talentCards?: any[];
    castingData?: any;
    sessionId?: string;
    agentHandoffs?: number;
    toolsUsed?: number;
  };
}

interface EnhancedChatInterfaceProps {
  messages: EnhancedMessage[];
  isLoading?: boolean;
  onQuickAction?: (action: string) => void;
  onSendMessage?: (message: string) => Promise<void>;
  userId?: string;
}

const enhancedQuickActions = [
  { 
    id: 'complete-casting', 
    label: 'Complete Casting Workflow', 
    icon: '🎬',
    description: 'End-to-end casting with AI orchestration'
  },
  { 
    id: 'talent-discovery', 
    label: 'AI Talent Discovery', 
    icon: '🔍',
    description: 'Advanced talent search with ML matching'
  },
  { 
    id: 'script-analysis', 
    label: 'Deep Script Analysis', 
    icon: '📝',
    description: 'Character extraction and casting requirements'
  },
  { 
    id: 'schedule-optimization', 
    label: 'Schedule Optimization', 
    icon: '📅',
    description: 'AI-powered audition scheduling'
  },
];

const conversationStarters = [
  "Find male lead actors for a romantic thriller set in Mumbai",
  "I need to cast supporting roles for a web series about tech startups",
  "Analyze this script and suggest character requirements",
  "Help me schedule 50 auditions over the next two weeks",
  "Find diverse talent for an upcoming commercial shoot",
  "Create a complete casting strategy for my new project"
];

export default function EnhancedChatInterface({
  messages,
  isLoading = false,
  onQuickAction,
  onSendMessage,
  userId,
}: EnhancedChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || !onSendMessage) return;

    const message = input.trim();
    setInput('');
    setIsTyping(false);

    try {
      await onSendMessage(message);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickActionClick = (action: string) => {
    if (onQuickAction) {
      onQuickAction(action);
    }
  };

  const handleConversationStarter = (starter: string) => {
    setInput(starter);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleViewPortfolio = (talentId: string) => {
    console.log('View portfolio:', talentId);
  };

  const handleBookAudition = (talentId: string) => {
    console.log('Book audition:', talentId);
  };

  const getCurrentAgent = () => {
    const lastMessage = messages[messages.length - 1];
    return lastMessage?.metadata?.agentType || 'Casting Director';
  };

  const getSessionStats = () => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.metadata) {
      return {
        agentHandoffs: lastMessage.metadata.agentHandoffs || 0,
        toolsUsed: lastMessage.metadata.toolsUsed || 0,
        sessionId: lastMessage.metadata.sessionId,
      };
    }
    return null;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Enhanced Header with Agent Status */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
              <SparklesIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                AI Casting Assistant
              </h2>
              <p className="text-sm text-gray-600">
                Current Agent: {getCurrentAgent()}
                {getSessionStats() && (
                  <span className="ml-2 text-xs text-purple-600">
                    • {getSessionStats()?.agentHandoffs} handoffs • {getSessionStats()?.toolsUsed} tools
                  </span>
                )}
              </p>
            </div>
          </div>
          
          {userId && (
            <div className="text-sm text-gray-500">
              Connected as {userId.slice(0, 8)}...
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {messages.length === 0 ? (
            /* Enhanced Welcome Screen */
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <SparklesIcon className="w-12 h-12 text-white" />
              </div>

              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Welcome to Enhanced AI Casting
              </h2>

              <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
                Experience the future of casting with our AI-powered platform. Start a conversation to access 
                advanced workflows, intelligent talent matching, and automated casting processes.
              </p>

              {/* Enhanced Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto mb-12">
                {enhancedQuickActions.map(action => (
                  <Button
                    key={action.id}
                    variant="bordered"
                    size="lg"
                    className="h-24 flex-col gap-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 transition-all duration-200 p-4"
                    onClick={() => handleQuickActionClick(action.id)}
                  >
                    <span className="text-2xl">{action.icon}</span>
                    <div className="text-center">
                      <div className="text-sm font-semibold text-gray-800">{action.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{action.description}</div>
                    </div>
                  </Button>
                ))}
              </div>

              {/* Conversation Starters */}
              <div className="max-w-3xl mx-auto">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Try these conversation starters:
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {conversationStarters.map((starter, index) => (
                    <button
                      key={index}
                      onClick={() => handleConversationStarter(starter)}
                      className="text-left p-4 bg-white border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all duration-200 text-sm text-gray-700"
                    >
                      "{starter}"
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Enhanced Messages */
            <div className="space-y-8">
              {messages.map(message => (
                <div key={message.id} className="group">
                  <MessageBubble
                    type={message.type}
                    content={message.content}
                    timestamp={message.timestamp}
                  />

                  {/* Enhanced Metadata Display */}
                  {message.metadata && message.type === 'ai' && (
                    <div className="mt-3 ml-12 flex flex-wrap gap-2">
                      {message.metadata.agentType && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                          Agent: {message.metadata.agentType}
                        </span>
                      )}
                      {message.metadata.agentHandoffs && message.metadata.agentHandoffs > 0 && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {message.metadata.agentHandoffs} handoffs
                        </span>
                      )}
                      {message.metadata.toolsUsed && message.metadata.toolsUsed > 0 && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                          {message.metadata.toolsUsed} tools used
                        </span>
                      )}
                    </div>
                  )}

                  {/* Enhanced Talent Cards */}
                  {message.metadata?.talentCards && message.metadata.talentCards.length > 0 && (
                    <div className="mt-6">
                      <TalentGrid
                        talents={message.metadata.talentCards}
                        onViewPortfolio={handleViewPortfolio}
                        onBookAudition={handleBookAudition}
                      />
                    </div>
                  )}
                </div>
              ))}

              {/* Enhanced Loading Indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                      <SparklesIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <div
                            className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                            style={{ animationDelay: '0ms' }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                            style={{ animationDelay: '150ms' }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                            style={{ animationDelay: '300ms' }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600 ml-2">
                          AI agents processing...
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Input Area */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about casting, talent discovery, schedules, or start any workflow..."
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none min-h-[48px] max-h-32"
                  rows={1}
                  disabled={isLoading}
                />
                <div className="absolute right-3 bottom-3 text-xs text-gray-400">
                  {input.length > 0 && `${input.length} chars`}
                </div>
              </div>
            </div>
            
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Send'
              )}
            </Button>
          </div>
          
          <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
            <span>Press Enter to send, Shift+Enter for new line</span>
            <span>Powered by Enhanced AI Agents</span>
          </div>
        </div>
      </div>
    </div>
  );
}