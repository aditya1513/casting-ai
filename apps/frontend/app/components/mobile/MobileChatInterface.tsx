'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Mic, 
  MicOff, 
  Plus, 
  Image, 
  Paperclip, 
  Smile, 
  MoreVertical,
  ChevronDown,
  VolumeX,
  Volume2,
  Settings,
  Zap,
  ArrowUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VoiceButton } from '../voice/VoiceInput';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  content: string;
  type: 'text' | 'voice' | 'image' | 'file';
  sender: 'user' | 'ai';
  timestamp: Date;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  metadata?: {
    agent?: string;
    confidence?: number;
    processingTime?: number;
    voiceProvider?: 'whisper' | 'web-speech';
  };
}

interface MobileChatInterfaceProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  onSendVoice?: (audioBlob: Blob) => void;
  isTyping?: boolean;
  isConnected?: boolean;
  conversationTitle?: string;
  className?: string;
}

export const MobileChatInterface: React.FC<MobileChatInterfaceProps> = ({
  messages,
  onSendMessage,
  onSendVoice,
  isTyping = false,
  isConnected = true,
  conversationTitle = 'CastMatch AI',
  className,
}) => {
  const [inputText, setInputText] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showVoiceOptions, setShowVoiceOptions] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle scroll to show/hide scroll button
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceTranscript = (transcript: string) => {
    setInputText(prev => prev + (prev ? ' ' : '') + transcript);
    inputRef.current?.focus();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const MessageBubble: React.FC<{ message: Message; isLast: boolean }> = ({ message, isLast }) => {
    const isUser = message.sender === 'user';
    const [showMetadata, setShowMetadata] = useState(false);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3 }}
        className={cn(
          'flex w-full mb-4',
          isUser ? 'justify-end' : 'justify-start'
        )}
      >
        <div className={cn('flex gap-2 max-w-[85%]', isUser && 'flex-row-reverse')}>
          {!isUser && (
            <Avatar className="h-8 w-8 mt-auto">
              <AvatarImage src="/ai-avatar.png" alt="CastMatch AI" />
              <AvatarFallback>AI</AvatarFallback>
            </Avatar>
          )}
          
          <div className="space-y-1">
            <motion.div
              className={cn(
                'rounded-2xl px-4 py-3 max-w-full break-words',
                isUser
                  ? 'bg-primary text-primary-foreground ml-2'
                  : 'bg-muted mr-2'
              )}
              whileTap={{ scale: 0.98 }}
              onTap={() => setShowMetadata(!showMetadata)}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>
              
              {message.metadata?.agent && !isUser && (
                <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
                  <Zap className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground capitalize">
                    {message.metadata.agent.replace('_', ' ')} Agent
                  </span>
                  {message.metadata.confidence && (
                    <Badge variant="secondary" className="text-xs ml-1">
                      {Math.round(message.metadata.confidence * 100)}%
                    </Badge>
                  )}
                </div>
              )}
            </motion.div>

            <div className={cn(
              'flex items-center gap-2 text-xs text-muted-foreground px-1',
              isUser ? 'justify-end' : 'justify-start'
            )}>
              <span>{formatTime(message.timestamp)}</span>
              {message.status && isUser && (
                <div className="flex items-center gap-1">
                  {message.status === 'sending' && <div className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse" />}
                  {message.status === 'sent' && <div className="w-1 h-1 bg-primary rounded-full" />}
                  {message.status === 'delivered' && <div className="w-1 h-1 bg-green-500 rounded-full" />}
                  {message.status === 'read' && <div className="w-1 h-1 bg-blue-500 rounded-full" />}
                </div>
              )}
              {message.metadata?.voiceProvider && (
                <Badge variant="outline" className="text-xs">
                  {message.metadata.voiceProvider}
                </Badge>
              )}
            </div>

            {/* Metadata panel */}
            <AnimatePresence>
              {showMetadata && message.metadata && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-accent/50 rounded-lg p-2 text-xs space-y-1"
                >
                  {message.metadata.processingTime && (
                    <div>Processing: {message.metadata.processingTime}ms</div>
                  )}
                  {message.metadata.confidence && (
                    <div>Confidence: {Math.round(message.metadata.confidence * 100)}%</div>
                  )}
                  {message.metadata.agent && (
                    <div>Agent: {message.metadata.agent}</div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    );
  };

  const TypingIndicator = () => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-2 mb-4"
    >
      <Avatar className="h-8 w-8">
        <AvatarImage src="/ai-avatar.png" alt="CastMatch AI" />
        <AvatarFallback>AI</AvatarFallback>
      </Avatar>
      <div className="bg-muted rounded-2xl px-4 py-3">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-muted-foreground rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Header */}
      <div className="mobile-header bg-background/95 backdrop-blur-sm">
        <div className="mobile-header-content">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src="/ai-avatar.png" alt="CastMatch AI" />
              <AvatarFallback>AI</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-sm">{conversationTitle}</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                )} />
                <span>{isConnected ? 'Online' : 'Offline'}</span>
                {isTyping && <span>• AI is typing...</span>}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
            >
              {voiceEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto mobile-content px-4 py-4"
        onScroll={handleScroll}
      >
        <div className="space-y-0">
          {messages.map((message, index) => (
            <MessageBubble 
              key={message.id} 
              message={message} 
              isLast={index === messages.length - 1}
            />
          ))}
          
          <AnimatePresence>
            {isTyping && <TypingIndicator />}
          </AnimatePresence>
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-20 right-4 z-10"
          >
            <Button
              variant="secondary"
              size="sm"
              className="rounded-full h-10 w-10 p-0 shadow-lg"
              onClick={scrollToBottom}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="border-t bg-background p-4 pb-6">
        <div className="flex items-end gap-2">
          {/* Attachment button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0 flex-shrink-0"
            disabled={!isConnected}
          >
            <Plus className="h-5 w-5" />
          </Button>

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={isConnected ? "Type your message..." : "Connecting..."}
              disabled={!isConnected}
              className="w-full min-h-[44px] max-h-[120px] p-3 pr-12 border border-border rounded-2xl bg-muted/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              rows={1}
            />
            
            {/* Emoji button - overlay */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
              disabled={!isConnected}
            >
              <Smile className="h-4 w-4" />
            </Button>
          </div>

          {/* Voice/Send button */}
          {inputText.trim() ? (
            <Button
              size="sm"
              className="h-10 w-10 p-0 flex-shrink-0 rounded-full"
              onClick={handleSend}
              disabled={!isConnected}
            >
              <Send className="h-4 w-4" />
            </Button>
          ) : (
            <VoiceButton
              onTranscript={handleVoiceTranscript}
              disabled={!isConnected}
            />
          )}
        </div>

        {/* Connection status */}
        {!isConnected && (
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground">
            <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse" />
            <span>Reconnecting...</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Chat skeleton loader
export const MobileChatSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header skeleton */}
      <div className="mobile-header">
        <div className="mobile-header-content">
          <div className="flex items-center gap-3">
            <div className="mobile-skeleton w-8 h-8 rounded-full" />
            <div className="space-y-1">
              <div className="mobile-skeleton h-4 w-24" />
              <div className="mobile-skeleton h-3 w-16" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="mobile-skeleton w-8 h-8 rounded" />
            <div className="mobile-skeleton w-8 h-8 rounded" />
          </div>
        </div>
      </div>

      {/* Messages skeleton */}
      <div className="flex-1 mobile-content space-y-4">
        {/* AI message */}
        <div className="flex gap-2">
          <div className="mobile-skeleton w-8 h-8 rounded-full" />
          <div className="mobile-skeleton h-12 w-48 rounded-2xl" />
        </div>
        
        {/* User message */}
        <div className="flex gap-2 justify-end">
          <div className="mobile-skeleton h-8 w-32 rounded-2xl" />
        </div>
        
        {/* AI message */}
        <div className="flex gap-2">
          <div className="mobile-skeleton w-8 h-8 rounded-full" />
          <div className="space-y-2">
            <div className="mobile-skeleton h-6 w-64 rounded-2xl" />
            <div className="mobile-skeleton h-6 w-40 rounded-2xl" />
          </div>
        </div>
      </div>

      {/* Input skeleton */}
      <div className="border-t p-4">
        <div className="flex items-center gap-2">
          <div className="mobile-skeleton w-10 h-10 rounded-full" />
          <div className="mobile-skeleton flex-1 h-11 rounded-2xl" />
          <div className="mobile-skeleton w-10 h-10 rounded-full" />
        </div>
      </div>
    </div>
  );
};