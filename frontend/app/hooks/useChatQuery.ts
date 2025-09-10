'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { Message } from '@/app/components/chat/MessageBubble';
import { toast } from 'sonner';

interface ChatResponse {
  success: boolean;
  data: {
    message: string;
    talents?: any[];
    suggestions?: string[];
    action_type?: string;
  };
  metadata?: {
    response_time_ms: number;
    query_intent?: string;
  };
}

interface MessagesResponse {
  messages: Message[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
}

interface UseChatQueryOptions {
  conversationId: string;
  enabled?: boolean;
  onMessageReceived?: (message: Message) => void;
  onStreamChunk?: (chunk: string) => void;
}

export function useChatQuery({
  conversationId,
  enabled = true,
  onMessageReceived,
  onStreamChunk
}: UseChatQueryOptions) {
  const queryClient = useQueryClient();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  // Fetch paginated messages with infinite query
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
    refetch
  } = useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: async ({ pageParam = null }) => {
      const params = new URLSearchParams();
      if (pageParam) params.append('cursor', pageParam);
      params.append('limit', '20');

      const response = await fetch(
        `/api/conversations/${conversationId}/messages?${params.toString()}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      return response.json() as Promise<MessagesResponse>;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: enabled && !!conversationId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    initialPageParam: null
  });

  // Flatten all pages of messages
  const allMessages = data?.pages.flatMap(page => page.messages) || [];

  // Send message mutation with streaming support
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const tempUserMessage: Message = {
        id: `temp-user-${Date.now()}`,
        content,
        type: 'user',
        timestamp: new Date(),
        userName: 'You'
      };

      const tempAiMessageId = `temp-ai-${Date.now()}`;
      const tempAiMessage: Message = {
        id: tempAiMessageId,
        content: '',
        type: 'ai',
        timestamp: new Date(),
        isTyping: true
      };

      // Optimistically add messages
      queryClient.setQueryData(['messages', conversationId], (oldData: any) => {
        if (!oldData) return oldData;
        
        const newPages = [...oldData.pages];
        const lastPageIndex = newPages.length - 1;
        
        if (lastPageIndex >= 0) {
          newPages[lastPageIndex] = {
            ...newPages[lastPageIndex],
            messages: [
              ...newPages[lastPageIndex].messages,
              tempUserMessage,
              tempAiMessage
            ]
          };
        }
        
        return {
          ...oldData,
          pages: newPages
        };
      });

      setIsStreaming(true);
      setStreamingMessageId(tempAiMessageId);

      try {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: content,
            conversationId,
            stream: true
          })
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        // Handle streaming response
        if (response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let accumulatedContent = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            accumulatedContent += chunk;
            
            // Update the AI message content
            queryClient.setQueryData(['messages', conversationId], (oldData: any) => {
              if (!oldData) return oldData;
              
              const newPages = [...oldData.pages];
              const lastPageIndex = newPages.length - 1;
              
              if (lastPageIndex >= 0) {
                newPages[lastPageIndex] = {
                  ...newPages[lastPageIndex],
                  messages: newPages[lastPageIndex].messages.map((msg: Message) =>
                    msg.id === tempAiMessageId
                      ? { ...msg, content: accumulatedContent, isTyping: false }
                      : msg
                  )
                };
              }
              
              return {
                ...oldData,
                pages: newPages
              };
            });

            onStreamChunk?.(chunk);
          }

          // Parse final response
          try {
            const finalResponse: ChatResponse = JSON.parse(accumulatedContent);
            
            // Update with final structured data
            queryClient.setQueryData(['messages', conversationId], (oldData: any) => {
              if (!oldData) return oldData;
              
              const newPages = [...oldData.pages];
              const lastPageIndex = newPages.length - 1;
              
              if (lastPageIndex >= 0) {
                newPages[lastPageIndex] = {
                  ...newPages[lastPageIndex],
                  messages: newPages[lastPageIndex].messages.map((msg: Message) =>
                    msg.id === tempAiMessageId
                      ? {
                          ...msg,
                          content: finalResponse.data.message,
                          talents: finalResponse.data.talents,
                          suggestions: finalResponse.data.suggestions,
                          action_type: finalResponse.data.action_type,
                          isTyping: false
                        }
                      : msg
                  )
                };
              }
              
              return {
                ...oldData,
                pages: newPages
              };
            });

            const finalMessage: Message = {
              id: tempAiMessageId,
              content: finalResponse.data.message,
              type: 'ai',
              timestamp: new Date(),
              talents: finalResponse.data.talents,
              suggestions: finalResponse.data.suggestions,
              action_type: finalResponse.data.action_type as any
            };

            onMessageReceived?.(finalMessage);
            
            return finalResponse;
          } catch (e) {
            // If not JSON, treat as plain text response
            const finalMessage: Message = {
              id: tempAiMessageId,
              content: accumulatedContent,
              type: 'ai',
              timestamp: new Date()
            };

            onMessageReceived?.(finalMessage);
            
            return {
              success: true,
              data: { message: accumulatedContent }
            };
          }
        }

        throw new Error('No response body');
      } finally {
        setIsStreaming(false);
        setStreamingMessageId(null);
      }
    },
    onError: (error) => {
      toast.error('Failed to send message. Please try again.');
      console.error('Send message error:', error);
      
      // Revert optimistic update
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    }
  });

  // Clear messages
  const clearMessages = useCallback(() => {
    queryClient.setQueryData(['messages', conversationId], {
      pages: [{
        messages: [],
        nextCursor: null,
        hasMore: false,
        total: 0
      }],
      pageParams: [null]
    });
  }, [conversationId, queryClient]);

  // Mark messages as read
  const markAsRead = useCallback(async (messageIds: string[]) => {
    try {
      await fetch(`/api/conversations/${conversationId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds })
      });
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  }, [conversationId]);

  // Listen for external message events (WebSocket)
  useEffect(() => {
    const handleNewMessage = (event: CustomEvent<Message>) => {
      if (event.detail.conversationId === conversationId) {
        queryClient.setQueryData(['messages', conversationId], (oldData: any) => {
          if (!oldData) return oldData;
          
          const newPages = [...oldData.pages];
          const lastPageIndex = newPages.length - 1;
          
          if (lastPageIndex >= 0) {
            newPages[lastPageIndex] = {
              ...newPages[lastPageIndex],
              messages: [...newPages[lastPageIndex].messages, event.detail]
            };
          }
          
          return {
            ...oldData,
            pages: newPages
          };
        });
        
        onMessageReceived?.(event.detail);
      }
    };

    window.addEventListener('new-message' as any, handleNewMessage);
    return () => window.removeEventListener('new-message' as any, handleNewMessage);
  }, [conversationId, queryClient, onMessageReceived]);

  return {
    messages: allMessages,
    isLoading: status === 'pending',
    isFetchingMore: isFetchingNextPage,
    isStreaming,
    streamingMessageId,
    error,
    hasMore: hasNextPage || false,
    sendMessage: sendMessageMutation.mutate,
    sendMessageAsync: sendMessageMutation.mutateAsync,
    loadMore: fetchNextPage,
    clearMessages,
    markAsRead,
    refetch,
    isConnected: true // This could be connected to WebSocket status
  };
}

export default useChatQuery;