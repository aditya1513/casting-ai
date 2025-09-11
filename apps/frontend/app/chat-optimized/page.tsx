'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';
import {
  ChatContainer,
  ChatErrorBoundary,
  WebSocketProvider,
  PerformanceDashboard,
} from '@/app/components/chat/index.optimized';
import { AuthProvider } from '@/lib/auth-context';

// Create a query client with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 2,
      retryDelay: 1000,
    },
  },
});

export default function OptimizedChatPage() {
  const handleTalentAction = {
    onViewProfile: (talentId: string) => {
      console.log('View profile:', talentId);
      // Navigate to talent profile
    },
    onScheduleAudition: (talentId: string) => {
      console.log('Schedule audition:', talentId);
      // Open audition scheduler
    },
    onAddToShortlist: (talentId: string) => {
      console.log('Add to shortlist:', talentId);
      // Add to shortlist
    },
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WebSocketProvider>
          <ChatErrorBoundary
            onError={(error, errorInfo) => {
              console.error('Chat error:', error, errorInfo);
              // Send to error tracking service
            }}
          >
            <div className="chat-page">
              <div className="chat-page__header">
                <h1 className="chat-page__title">CastMatch AI Chat - Optimized Version</h1>
                <p className="chat-page__subtitle">
                  Experience blazing-fast chat with improved performance and reliability
                </p>
              </div>

              <div className="chat-page__container">
                <ChatContainer
                  conversationId="optimized-chat"
                  title="CastMatch AI Assistant"
                  subtitle="Find perfect talent with AI-powered search"
                  onTalentAction={handleTalentAction}
                  className="chat-page__chat"
                />
              </div>

              {/* Performance Dashboard - Only in development */}
              <PerformanceDashboard
                show={process.env.NODE_ENV === 'development'}
                position="bottom-right"
                compact={false}
              />

              {/* Toast notifications */}
              <Toaster position="top-center" richColors closeButton duration={4000} theme="dark" />

              {/* React Query Devtools - Only in development */}
              {process.env.NODE_ENV === 'development' && (
                <ReactQueryDevtools initialIsOpen={false} position="bottom-left" />
              )}
            </div>
          </ChatErrorBoundary>
        </WebSocketProvider>
      </AuthProvider>

      <style jsx>{`
        .chat-page {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2rem;
        }
        
        .chat-page__header {
          text-align: center;
          margin-bottom: 2rem;
          color: white;
        }
        
        .chat-page__title {
          font-size: 2.5rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        }
        
        .chat-page__subtitle {
          font-size: 1.1rem;
          opacity: 0.9;
        }
        
        .chat-page__container {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 0;
        }
        
        .chat-page__chat {
          width: 100%;
          max-width: 900px;
          height: 100%;
          max-height: 700px;
          background: white;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          overflow: hidden;
        }
        
        @media (max-width: 768px) {
          .chat-page {
            padding: 1rem;
          }
          
          .chat-page__title {
            font-size: 1.8rem;
          }
          
          .chat-page__subtitle {
            font-size: 0.9rem;
          }
          
          .chat-page__chat {
            max-width: 100%;
            max-height: 100%;
            border-radius: 12px;
          }
        }
        
        /* High performance mode styles */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
        
        /* GPU acceleration for smooth scrolling */
        .chat-page__chat {
          will-change: transform;
          transform: translateZ(0);
          -webkit-transform: translateZ(0);
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
      `}</style>
    </QueryClientProvider>
  );
}
