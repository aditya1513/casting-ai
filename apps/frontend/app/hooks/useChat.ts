'use client';

import { useState, useCallback, useRef } from 'react';

// Type definitions for the chat API
export interface ChatMessage {
  id: string;
  content: string;
  type: 'user' | 'ai' | 'system';
  timestamp: Date;
  avatar?: string;
  userId?: string;
  userName?: string;
  isTyping?: boolean;
  talents?: TalentProfile[];
  suggestions?: string[];
  action_type?: 'search' | 'recommend' | 'explain' | 'filter' | 'general';
}

export interface TalentProfile {
  id: string;
  name: string;
  age: number;
  location: string;
  skills: string[];
  experience: string;
  availability: boolean;
  headshot_url?: string;
  match_score?: number;
}

export interface ChatResponse {
  success: boolean;
  data: {
    message: string;
    talents: TalentProfile[];
    suggestions: string[];
    filters_applied?: {
      age_range?: [number, number];
      location?: string;
      skills?: string[];
      availability?: boolean;
    };
    action_type: 'search' | 'recommend' | 'explain' | 'filter' | 'general';
  };
  metadata: {
    response_time_ms: number;
    talents_searched: number;
    query_intent?: string;
  };
}

export interface ChatRequest {
  message: string;
  conversation_history?: {
    role: 'user' | 'assistant' | 'system';
    content: string;
  }[];
  user_preferences?: Record<string, any>;
  project_id?: string;
}

interface UseChatOptions {
  apiUrl?: string;
  fallbackApiUrl?: string;
  maxRetries?: number;
  retryDelay?: number;
}

interface ChatError {
  message: string;
  type: 'network' | 'api' | 'validation' | 'unknown';
  details?: any;
}

export interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: ChatError | null;
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => void;
  retryLastMessage: () => Promise<void>;
  isConnected: boolean;
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const {
    apiUrl = '/api/ai/chat',
    fallbackApiUrl = 'http://localhost:5002/api/ai/chat',
    maxRetries = 3,
    retryDelay = 1000,
  } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ChatError | null>(null);
  const [isConnected, setIsConnected] = useState(true);

  const lastMessageRef = useRef<string>('');
  const retryCountRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const updateLastMessage = useCallback((updates: Partial<ChatMessage>) => {
    setMessages(prev => {
      const lastIndex = prev.length - 1;
      if (lastIndex < 0) return prev;

      const updatedMessages = [...prev];
      updatedMessages[lastIndex] = { ...updatedMessages[lastIndex], ...updates };
      return updatedMessages;
    });
  }, []);

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const callApi = async (endpoint: string, request: ChatRequest): Promise<ChatResponse> => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'API request failed');
      }

      return data as ChatResponse;
    } finally {
      abortControllerRef.current = null;
    }
  };

  const sendMessageWithRetry = async (messageContent: string, retryCount = 0): Promise<void> => {
    try {
      // Build conversation history
      const conversationHistory = messages.map(msg => ({
        role: msg.type === 'user' ? 'user' : ('assistant' as const),
        content: msg.content,
      }));

      const request: ChatRequest = {
        message: messageContent,
        conversation_history: conversationHistory,
        user_preferences: {},
      };

      // Try primary API first, then fallback
      const endpoints = [apiUrl, fallbackApiUrl];
      let lastError: Error | null = null;

      for (const endpoint of endpoints) {
        try {
          const response = await callApi(endpoint, request);

          // Create AI response message with talents
          const aiMessage: ChatMessage = {
            id: `ai-${Date.now()}`,
            content: response.data.message,
            type: 'ai',
            timestamp: new Date(),
            talents: response.data.talents,
            suggestions: response.data.suggestions,
            action_type: response.data.action_type,
          };

          addMessage(aiMessage);
          setError(null);
          setIsConnected(true);
          retryCountRef.current = 0;
          return;
        } catch (apiError) {
          console.warn(`API call failed for ${endpoint}:`, apiError);
          lastError = apiError as Error;
          continue;
        }
      }

      // If all endpoints failed, throw the last error
      throw lastError || new Error('All API endpoints failed');
    } catch (err) {
      console.error('Send message error:', err);

      if (retryCount < maxRetries) {
        await sleep(retryDelay * Math.pow(2, retryCount)); // Exponential backoff
        return sendMessageWithRetry(messageContent, retryCount + 1);
      }

      // Max retries exceeded
      const errorType: ChatError['type'] =
        err instanceof Error && err.message.includes('fetch')
          ? 'network'
          : err instanceof Error && err.message.includes('HTTP')
            ? 'api'
            : 'unknown';

      const chatError: ChatError = {
        message: err instanceof Error ? err.message : 'Unknown error occurred',
        type: errorType,
        details: err,
      };

      setError(chatError);
      setIsConnected(false);

      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        content:
          "I'm sorry, I'm having trouble connecting right now. Please check your connection and try again.",
        type: 'ai',
        timestamp: new Date(),
        suggestions: [
          'Check your internet connection',
          'Try rephrasing your question',
          'Wait a moment and try again',
        ],
      };

      addMessage(errorMessage);
    }
  };

  const sendMessage = useCallback(
    async (messageContent: string) => {
      if (!messageContent.trim() || isLoading) return;

      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const trimmedMessage = messageContent.trim();
      lastMessageRef.current = trimmedMessage;

      // Add user message
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        content: trimmedMessage,
        type: 'user',
        timestamp: new Date(),
        userName: 'You',
      };

      addMessage(userMessage);
      setIsLoading(true);
      setError(null);

      // Add typing indicator
      const typingMessage: ChatMessage = {
        id: `typing-${Date.now()}`,
        content: '',
        type: 'ai',
        timestamp: new Date(),
        isTyping: true,
      };

      addMessage(typingMessage);

      try {
        await sendMessageWithRetry(trimmedMessage);
      } finally {
        setIsLoading(false);
        // Remove typing indicator
        setMessages(prev => prev.filter(msg => !msg.isTyping));
      }
    },
    [isLoading, messages, apiUrl, fallbackApiUrl, maxRetries, retryDelay]
  );

  const retryLastMessage = useCallback(async () => {
    if (!lastMessageRef.current || isLoading) return;

    // Remove the last error message if it exists
    setMessages(prev => {
      const filtered = prev.filter(
        msg => msg.type !== 'ai' || !msg.content.includes('trouble connecting')
      );
      return filtered;
    });

    await sendMessage(lastMessageRef.current);
  }, [sendMessage, isLoading]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    retryLastMessage,
    isConnected,
  };
}

export default useChat;
