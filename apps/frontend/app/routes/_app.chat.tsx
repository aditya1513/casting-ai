/**
 * AI Chat Route - AI Assistant interface
 * Migrated from src/AIChatApp.tsx
 */

import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { useState } from 'react';
import { Send, Bot, User, Sparkles, Info } from 'lucide-react';
import { trpc } from '~/lib/trpc';

export async function loader({ request }: LoaderFunctionArgs) {
  // TODO: Add authentication check
  return json({
    user: { name: 'Casting Director', role: 'casting_director' },
    timestamp: new Date().toISOString(),
  });
}

export default function Chat() {
  const { user } = useLoaderData<typeof loader>();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: '1',
      type: 'ai' as const,
      content: 'Hello! I\'m your AI casting assistant. I can help you find talented actors, analyze scripts, schedule auditions, and much more. What would you like to work on today?',
      timestamp: new Date().toISOString(),
    },
  ]);

  // Connect to real tRPC AI endpoint
  const sendMessage = trpc.simpleChat.sendMessage.useMutation();

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: message,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = message;
    setMessage('');

    try {
      // Call real AI API
      const result = await sendMessage.mutateAsync({
        message: currentMessage,
        sessionId: 'session_' + Date.now(),
      });

      const aiResponse = {
        id: result.sessionId,
        type: 'ai' as const,
        content: result.response,
        timestamp: result.timestamp,
        metadata: result.metadata,
      };
      
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('AI chat error:', error);
      const errorResponse = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorResponse]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const suggestedQuestions = [
    "Find me a lead actress for a romantic drama",
    "What are current market rates for OTT actors?",
    "Help me schedule auditions for next week",
    "Analyze this script for character requirements",
  ];

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex-1 max-w-4xl mx-auto w-full flex flex-col">
        {/* Chat Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">AI Casting Assistant</h1>
              <p className="text-slate-400 text-sm">Powered by advanced AI for Mumbai's entertainment industry</p>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex space-x-3 max-w-3xl ${msg.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.type === 'user' 
                    ? 'bg-blue-600' 
                    : 'bg-gradient-to-r from-purple-500 to-pink-500'
                }`}>
                  {msg.type === 'user' ? (
                    <User className="h-4 w-4 text-white" />
                  ) : (
                    <Bot className="h-4 w-4 text-white" />
                  )}
                </div>
                <div className={`rounded-lg p-4 ${
                  msg.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-100 border border-slate-700'
                }`}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  <div className={`text-xs mt-2 ${
                    msg.type === 'user' ? 'text-blue-100' : 'text-slate-400'
                  }`}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Suggested Questions */}
        {messages.length === 1 && (
          <div className="p-6 border-t border-slate-700">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Try asking:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => setMessage(question)}
                  className="text-left p-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 hover:border-slate-600 transition-colors text-sm"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Input */}
        <div className="p-6 border-t border-slate-700">
          <div className="flex space-x-3">
            <div className="flex-1">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me about casting, talent discovery, auditions, or anything else..."
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={1}
                style={{ minHeight: '44px', maxHeight: '120px' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                }}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!message.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
          
          <div className="mt-2 text-xs text-slate-500">
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>

        {/* Development Notice */}
        <div className="mx-6 mb-6 bg-green-900/50 border border-green-700 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-green-400" />
            <p className="text-green-100 text-sm">
              ✅ Live AI Chat: Connected to GPT-4 via tRPC! Real AI responses for Mumbai casting industry.
              {sendMessage.isPending && ' 🤖 AI is thinking...'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}