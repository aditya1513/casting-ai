/**
 * WebSocket Client Service for Real-time Chat
 * Connects to CastMatch backend WebSocket for instant messaging
 */

import { io, Socket } from 'socket.io-client';

interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    agentType?: string;
    workflowStep?: string;
    talentCards?: any[];
    castingData?: any;
  };
}

interface WebSocketEventHandlers {
  onMessage: (message: ChatMessage) => void;
  onTyping: (data: { userId: string; isTyping: boolean }) => void;
  onAITyping: (data: { isTyping: boolean }) => void;
  onAuthenticated: (data: { userId: string; status: string }) => void;
  onConversationJoined: (data: { sessionId: string; history: ChatMessage[]; currentAgent?: string }) => void;
  onAgentHandoff: (data: { newAgent: string; reason: string }) => void;
  onError: (error: { message: string }) => void;
  onQuickActionExecuted: (data: { action: string; message: string }) => void;
  onNotification: (notification: any) => void;
}

export class WebSocketService {
  private socket: Socket | null = null;
  private handlers: Partial<WebSocketEventHandlers> = {};
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private currentUserId: string | null = null;
  private currentSessionId: string | null = null;

  constructor() {
    // TEMP: Disable WebSocket for now, implement as enhanced HTTP polling first
    console.log('💬 WebSocket service initialized (HTTP mode)');
  }

  private connect() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    
    this.socket = io(backendUrl, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: this.maxReconnectAttempts,
      timeout: 20000,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('🔌 WebSocket connected:', this.socket?.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Re-authenticate if we have a user
      if (this.currentUserId) {
        this.authenticate(this.currentUserId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 WebSocket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('🔌 Max reconnection attempts reached');
        this.handlers.onError?.({ message: 'Connection failed after multiple attempts' });
      }
    });

    // Authentication events
    this.socket.on('authenticated', (data: { userId: string; status: string }) => {
      console.log('🔐 User authenticated:', data);
      this.handlers.onAuthenticated?.(data);
    });

    this.socket.on('authentication_error', (data: { message: string }) => {
      console.error('🔐 Authentication failed:', data);
      this.handlers.onError?.(data);
    });

    // Conversation events
    this.socket.on('conversation_joined', (data: { sessionId: string; history: ChatMessage[]; currentAgent?: string }) => {
      console.log('💬 Conversation joined:', data.sessionId);
      this.currentSessionId = data.sessionId;
      this.handlers.onConversationJoined?.(data);
    });

    this.socket.on('message', (message: ChatMessage) => {
      console.log('📝 New message:', message);
      this.handlers.onMessage?.(message);
    });

    // Typing indicators
    this.socket.on('user_typing', (data: { userId: string; isTyping: boolean }) => {
      this.handlers.onTyping?.(data);
    });

    this.socket.on('ai_typing', (data: { isTyping: boolean }) => {
      this.handlers.onAITyping?.(data);
    });

    // AI events
    this.socket.on('agent_handoff', (data: { newAgent: string; reason: string }) => {
      console.log('🤖 Agent handoff:', data);
      this.handlers.onAgentHandoff?.(data);
    });

    // Quick actions
    this.socket.on('quick_action_executed', (data: { action: string; message: string }) => {
      console.log('⚡ Quick action executed:', data);
      this.handlers.onQuickActionExecuted?.(data);
    });

    // Notifications
    this.socket.on('notification', (notification: any) => {
      console.log('🔔 Notification:', notification);
      this.handlers.onNotification?.(notification);
    });

    // Error handling
    this.socket.on('error', (error: { message: string }) => {
      console.error('❌ WebSocket error:', error);
      this.handlers.onError?.(error);
    });
  }

  // Public methods
  public authenticate(userId: string, token?: string) {
    if (!this.socket) return;
    
    this.currentUserId = userId;
    this.socket.emit('authenticate', { userId, token });
  }

  public joinConversation(sessionId?: string, workflowType?: string) {
    if (!this.socket) return;
    
    this.socket.emit('join_conversation', { sessionId, workflowType });
  }

  public sendMessage(content: string, projectId?: string) {
    if (!this.socket) return;
    
    this.socket.emit('send_message', { content, projectId });
  }

  public executeQuickAction(action: string, context?: any) {
    if (!this.socket) return;
    
    this.socket.emit('quick_action', { action, context });
  }

  public startTyping() {
    if (!this.socket) return;
    
    this.socket.emit('typing_start');
  }

  public stopTyping() {
    if (!this.socket) return;
    
    this.socket.emit('typing_stop');
  }

  public setEventHandlers(handlers: Partial<WebSocketEventHandlers>) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.currentUserId = null;
      this.currentSessionId = null;
    }
  }

  public reconnect() {
    if (this.socket) {
      this.socket.connect();
    } else {
      this.connect();
    }
  }

  // Getters
  public get connected(): boolean {
    return this.isConnected;
  }

  public get userId(): string | null {
    return this.currentUserId;
  }

  public get sessionId(): string | null {
    return this.currentSessionId;
  }
}

// Singleton instance
let webSocketService: WebSocketService | null = null;

export const getWebSocketService = (): WebSocketService => {
  if (!webSocketService) {
    webSocketService = new WebSocketService();
  }
  return webSocketService;
};

export const initializeWebSocket = (): WebSocketService => {
  return getWebSocketService();
};

// React hook for using WebSocket service
export const useWebSocket = () => {
  const service = getWebSocketService();
  
  return {
    service,
    connected: service.connected,
    userId: service.userId,
    sessionId: service.sessionId,
    authenticate: service.authenticate.bind(service),
    joinConversation: service.joinConversation.bind(service),
    sendMessage: service.sendMessage.bind(service),
    executeQuickAction: service.executeQuickAction.bind(service),
    startTyping: service.startTyping.bind(service),
    stopTyping: service.stopTyping.bind(service),
    setEventHandlers: service.setEventHandlers.bind(service),
    disconnect: service.disconnect.bind(service),
    reconnect: service.reconnect.bind(service),
  };
};