'use client';

import { Button } from '@heroui/react';
import MessageBubble from '../Shared/MessageBubble';
import TalentGrid from './TalentGrid';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp?: string;
  talentCards?: any[];
}

interface ChatInterfaceProps {
  messages: Message[];
  isLoading?: boolean;
  onQuickAction?: (action: string) => void;
}

const quickActions = [
  { id: 'find-male-lead', label: 'Find Male Lead', icon: '👤' },
  { id: 'schedule-auditions', label: 'Schedule Auditions', icon: '📅' },
  { id: 'analyze-script', label: 'Analyze Script', icon: '📝' },
  { id: 'budget-planning', label: 'Budget Planning', icon: '💰' },
];

export default function ChatInterface({
  messages,
  isLoading = false,
  onQuickAction,
}: ChatInterfaceProps) {
  const handleViewPortfolio = (talentId: string) => {
    console.log('View portfolio:', talentId);
  };

  const handleBookAudition = (talentId: string) => {
    console.log('Book audition:', talentId);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {messages.length === 0 ? (
          /* Welcome Screen */
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-700 to-gray-900 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <span className="text-white font-bold text-2xl">AI</span>
            </div>

            <h2 className="text-3xl font-semibold text-gray-900 mb-4">
              Welcome to your AI Casting Assistant
            </h2>

            <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
              Find perfect talent for Mumbai Dreams. Ask about actors, schedule auditions, or
              analyze scripts. Your AI assistant is ready to help.
            </p>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
              {quickActions.map(action => (
                <Button
                  key={action.id}
                  variant="bordered"
                  size="lg"
                  className="h-20 flex-col gap-2 border-gray-200 hover:border-teal-300 hover:bg-teal-50 transition-all duration-200"
                  onClick={() => onQuickAction?.(action.id)}
                >
                  <span className="text-2xl">{action.icon}</span>
                  <span className="text-sm font-medium text-gray-700">{action.label}</span>
                </Button>
              ))}
            </div>
          </div>
        ) : (
          /* Messages */
          <div className="space-y-8">
            {messages.map(message => (
              <div key={message.id}>
                <MessageBubble
                  type={message.type}
                  content={message.content}
                  timestamp={message.timestamp}
                />

                {/* Talent Cards */}
                {message.talentCards && message.talentCards.length > 0 && (
                  <div className="mt-6">
                    <TalentGrid
                      talents={message.talentCards}
                      onViewPortfolio={handleViewPortfolio}
                      onBookAudition={handleBookAudition}
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs">AI</span>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-1">
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
