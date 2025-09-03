# Real-Time Messaging System Architecture for CastMatch Platform

## Executive Summary

This document outlines the comprehensive design for a real-time messaging system that enables direct communication between users (actors, casting directors, producers) on the CastMatch platform. The system builds upon existing WebSocket infrastructure, leverages Redis for pub/sub and caching, and integrates seamlessly with the current PostgreSQL database and authentication system.

### Key Features
- Real-time messaging with Socket.io
- Message persistence and threading
- File attachment support via S3
- Presence and typing indicators  
- Read receipts and message status tracking
- Group conversations for project teams
- Push notifications for offline users
- Message search and filtering capabilities
- End-to-end encryption for sensitive conversations

## Requirements Analysis

### Functional Requirements

1. **Direct Messaging**
   - One-to-one conversations between any two users
   - Message threading for organized conversations
   - Support for text, images, documents, and media files
   - Message editing and deletion capabilities
   - Message reactions and replies

2. **Group Conversations**
   - Project-based group chats with team members
   - Role-based permissions within groups
   - Admin controls for adding/removing participants
   - Group information and settings management

3. **Real-Time Features**
   - Instant message delivery via WebSocket
   - Online/offline presence indicators
   - Typing indicators with timeout
   - Message delivery and read receipts
   - Connection status tracking

4. **File Sharing**
   - Upload progress indicators
   - File type validation and size limits
   - Secure S3 integration for media storage
   - Thumbnail generation for images/videos
   - Document preview capabilities

5. **Search and History**
   - Full-text search across message content
   - Advanced filtering by date, user, file type
   - Pagination for message history
   - Conversation archival and restoration

### Non-Functional Requirements

1. **Performance**
   - Sub-100ms message delivery latency
   - Support for 10,000+ concurrent connections
   - Message throughput of 1000+ messages/second
   - 99.9% uptime availability

2. **Scalability**
   - Horizontal scaling across multiple server instances
   - Redis clustering for high availability
   - Database optimization for message queries
   - CDN integration for media delivery

3. **Security**
   - End-to-end encryption for sensitive conversations
   - Role-based access control
   - Message audit trails
   - Rate limiting and abuse prevention
   - Content moderation capabilities

## Technical Architecture

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway   │    │   WebSocket     │
│   (React/Next)  │◄──►│   (Express)     │◄──►│   Server        │
└─────────────────┘    └─────────────────┘    │   (Socket.io)   │
         │                       │             └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Message UI    │    │   REST APIs     │    │   Redis Pub/Sub │
│   Components    │    │   (CRUD Ops)    │    │   & Caching     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   File Upload   │    │   PostgreSQL    │    │   Background    │
│   (S3 Direct)   │    │   Database      │    │   Jobs (Bull)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Database Schema Design

#### New Tables for Messaging System

```sql
-- Conversations table for organizing messages
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL DEFAULT 'direct', -- 'direct', 'group', 'project'
  title VARCHAR(255), -- For group conversations
  description TEXT, -- For group conversations
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  created_by_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  is_encrypted BOOLEAN DEFAULT false,
  encryption_key_id VARCHAR(255), -- For E2E encryption
  metadata JSONB, -- Additional conversation settings
  last_message_id UUID, -- For quick access to latest message
  last_message_at TIMESTAMP WITH TIME ZONE,
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation participants
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member', -- 'admin', 'moderator', 'member'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  permissions JSONB, -- Specific permissions for this participant
  notification_settings JSONB, -- Per-conversation notification preferences
  
  UNIQUE(conversation_id, user_id)
);

-- Messages table for storing all conversation messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  parent_message_id UUID REFERENCES messages(id) ON DELETE CASCADE, -- For threading/replies
  type VARCHAR(20) NOT NULL DEFAULT 'text', -- 'text', 'image', 'file', 'system', 'call'
  content TEXT, -- Message text content
  metadata JSONB, -- Type-specific data (file info, call details, etc.)
  
  -- Message status tracking
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by VARCHAR(255) REFERENCES users(id),
  
  -- Encryption
  encrypted_content TEXT, -- E2E encrypted content
  encryption_key_id VARCHAR(255),
  
  -- Delivery tracking
  delivery_status VARCHAR(20) DEFAULT 'sent', -- 'sending', 'sent', 'delivered', 'failed'
  delivered_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message attachments for file/media sharing
CREATE TABLE message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  
  -- File details
  filename VARCHAR(500) NOT NULL,
  original_filename VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT NOT NULL, -- Size in bytes
  
  -- Storage details
  storage_provider VARCHAR(20) DEFAULT 's3', -- 's3', 'local'
  storage_path TEXT NOT NULL, -- S3 key or file path
  public_url TEXT, -- CDN or public access URL
  thumbnail_url TEXT, -- For images/videos
  
  -- Media metadata
  dimensions VARCHAR(20), -- "1920x1080" for images/videos
  duration INTEGER, -- Duration in seconds for audio/video
  
  -- Upload tracking
  upload_status VARCHAR(20) DEFAULT 'uploading', -- 'uploading', 'completed', 'failed'
  upload_progress INTEGER DEFAULT 0, -- 0-100
  
  -- Security
  is_scanned BOOLEAN DEFAULT false, -- Virus scan status
  scan_result VARCHAR(50), -- clean, infected, suspicious
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message read receipts for tracking who read what
CREATE TABLE message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(message_id, user_id)
);

-- User presence tracking
CREATE TABLE user_presence (
  user_id VARCHAR(255) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'offline', -- 'online', 'away', 'busy', 'offline'
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  socket_id VARCHAR(255), -- Current socket connection ID
  device_info JSONB, -- Device/browser information
  location_info JSONB, -- Optional location data
  custom_status TEXT, -- User-defined status message
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Typing indicators (Redis-backed, but table for persistence)
CREATE TABLE typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '10 seconds'),
  
  UNIQUE(conversation_id, user_id)
);

-- Message reactions for emoji responses
CREATE TABLE message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction VARCHAR(10) NOT NULL, -- Emoji or reaction identifier
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(message_id, user_id, reaction)
);

-- Conversation settings and preferences
CREATE TABLE conversation_settings (
  conversation_id UUID PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
  
  -- General settings
  allow_new_participants BOOLEAN DEFAULT true,
  require_approval_to_join BOOLEAN DEFAULT false,
  max_participants INTEGER,
  
  -- Message settings
  allow_file_sharing BOOLEAN DEFAULT true,
  max_file_size BIGINT DEFAULT 104857600, -- 100MB
  allowed_file_types TEXT[], -- ['image/*', 'application/pdf', etc.]
  message_retention_days INTEGER, -- Auto-delete after N days
  
  -- Moderation settings
  require_message_approval BOOLEAN DEFAULT false,
  auto_moderate BOOLEAN DEFAULT true,
  blocked_words TEXT[],
  
  -- Encryption
  encryption_enabled BOOLEAN DEFAULT false,
  encryption_level VARCHAR(20), -- 'transport', 'end_to_end'
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blocked users/conversations for preventing harassment
CREATE TABLE conversation_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  reason TEXT,
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Either block a user globally or in specific conversation
  CHECK ((blocked_user_id IS NOT NULL AND conversation_id IS NULL) OR 
         (blocked_user_id IS NULL AND conversation_id IS NOT NULL))
);

-- Indexes for optimal query performance
CREATE INDEX idx_conversations_project_id ON conversations(project_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_active ON conversation_participants(conversation_id, is_active);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id, created_at DESC);
CREATE INDEX idx_messages_parent ON messages(parent_message_id);
CREATE INDEX idx_messages_type ON messages(type);
CREATE INDEX idx_messages_search ON messages USING gin(to_tsvector('english', content));

CREATE INDEX idx_message_reads_user ON message_reads(user_id, read_at DESC);
CREATE INDEX idx_message_reads_message ON message_reads(message_id);
CREATE INDEX idx_message_reads_conversation ON message_reads(conversation_id, user_id);

CREATE INDEX idx_user_presence_status ON user_presence(status, last_seen);
CREATE INDEX idx_typing_indicators_conversation ON typing_indicators(conversation_id, expires_at);

CREATE INDEX idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX idx_conversation_blocks_user ON conversation_blocks(user_id);
```

### WebSocket Events Specification

#### Client → Server Events

```typescript
// Connection and authentication
interface ConnectEvent {
  token: string; // JWT token for authentication
  deviceInfo?: {
    type: 'mobile' | 'desktop' | 'tablet';
    name: string;
    os: string;
    browser?: string;
  };
}

// Join/leave conversations
interface JoinConversationEvent {
  conversationId: string;
}

interface LeaveConversationEvent {
  conversationId: string;
}

// Sending messages
interface SendMessageEvent {
  conversationId: string;
  type: 'text' | 'image' | 'file' | 'system';
  content: string;
  parentMessageId?: string; // For replies/threading
  metadata?: Record<string, any>;
  tempId: string; // Client-side temporary ID for tracking
}

// Typing indicators
interface TypingStartEvent {
  conversationId: string;
}

interface TypingStopEvent {
  conversationId: string;
}

// Message actions
interface MarkMessageReadEvent {
  messageId: string;
  conversationId: string;
}

interface EditMessageEvent {
  messageId: string;
  newContent: string;
}

interface DeleteMessageEvent {
  messageId: string;
  reason?: string;
}

interface ReactToMessageEvent {
  messageId: string;
  reaction: string; // emoji or reaction identifier
  action: 'add' | 'remove';
}

// Presence updates
interface UpdatePresenceEvent {
  status: 'online' | 'away' | 'busy' | 'offline';
  customStatus?: string;
}

// File upload events
interface FileUploadStartEvent {
  conversationId: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  tempId: string;
}

interface FileUploadProgressEvent {
  tempId: string;
  progress: number; // 0-100
}

interface FileUploadCompleteEvent {
  tempId: string;
  fileUrl: string;
  attachmentId: string;
}
```

#### Server → Client Events

```typescript
// Connection status
interface ConnectedEvent {
  socketId: string;
  userId: string;
  timestamp: Date;
}

interface DisconnectedEvent {
  reason: string;
  reconnectIn?: number;
}

// Incoming messages
interface NewMessageEvent {
  id: string;
  conversationId: string;
  senderId: string;
  senderInfo: {
    name: string;
    avatar?: string;
    role: string;
  };
  type: string;
  content: string;
  parentMessageId?: string;
  metadata?: Record<string, any>;
  attachments?: Array<{
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    url: string;
    thumbnailUrl?: string;
  }>;
  reactions?: Array<{
    reaction: string;
    count: number;
    users: string[];
  }>;
  isEdited: boolean;
  deliveryStatus: string;
  createdAt: Date;
  tempId?: string; // Echo back client's tempId
}

// Message status updates
interface MessageDeliveredEvent {
  messageId: string;
  conversationId: string;
  deliveredAt: Date;
}

interface MessageReadEvent {
  messageId: string;
  conversationId: string;
  readBy: string;
  readAt: Date;
}

interface MessageEditedEvent {
  messageId: string;
  conversationId: string;
  newContent: string;
  editedAt: Date;
  editedBy: string;
}

interface MessageDeletedEvent {
  messageId: string;
  conversationId: string;
  deletedAt: Date;
  deletedBy: string;
}

// Typing indicators
interface TypingUpdateEvent {
  conversationId: string;
  userId: string;
  userInfo: {
    name: string;
    avatar?: string;
  };
  isTyping: boolean;
}

// Presence updates
interface PresenceUpdateEvent {
  userId: string;
  status: string;
  lastSeen?: Date;
  customStatus?: string;
}

// Conversation events
interface ConversationCreatedEvent {
  conversation: {
    id: string;
    type: string;
    title?: string;
    participants: Array<{
      userId: string;
      name: string;
      avatar?: string;
      role: string;
    }>;
    createdAt: Date;
  };
}

interface ParticipantJoinedEvent {
  conversationId: string;
  participant: {
    userId: string;
    name: string;
    avatar?: string;
    role: string;
  };
  joinedAt: Date;
}

interface ParticipantLeftEvent {
  conversationId: string;
  userId: string;
  leftAt: Date;
}

// Error events
interface ErrorEvent {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// File upload events
interface FileUploadProgressEvent {
  tempId: string;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
}

// Push notification events
interface PushNotificationEvent {
  title: string;
  body: string;
  data: {
    type: 'new_message' | 'conversation_created';
    conversationId: string;
    messageId?: string;
  };
}
```

### Message Service Architecture

#### Core Messaging Service

```typescript
// Core interface for the messaging service
interface IMessagingService {
  // Conversation management
  createConversation(data: CreateConversationDto): Promise<Conversation>;
  getConversation(id: string, userId: string): Promise<Conversation>;
  getConversations(userId: string, options: PaginationOptions): Promise<PaginatedResult<Conversation>>;
  updateConversation(id: string, updates: UpdateConversationDto): Promise<Conversation>;
  archiveConversation(id: string, userId: string): Promise<void>;
  
  // Participant management
  addParticipant(conversationId: string, userId: string, role?: string): Promise<void>;
  removeParticipant(conversationId: string, userId: string): Promise<void>;
  updateParticipantRole(conversationId: string, userId: string, role: string): Promise<void>;
  
  // Message operations
  sendMessage(data: SendMessageDto): Promise<Message>;
  getMessage(id: string): Promise<Message>;
  getMessages(conversationId: string, options: MessageQueryOptions): Promise<PaginatedResult<Message>>;
  editMessage(id: string, newContent: string): Promise<Message>;
  deleteMessage(id: string, userId: string): Promise<void>;
  
  // Message reactions
  addReaction(messageId: string, userId: string, reaction: string): Promise<void>;
  removeReaction(messageId: string, userId: string, reaction: string): Promise<void>;
  
  // Read receipts
  markMessageAsRead(messageId: string, userId: string): Promise<void>;
  markConversationAsRead(conversationId: string, userId: string): Promise<void>;
  getReadReceipts(messageId: string): Promise<ReadReceipt[]>;
  
  // Search and filtering
  searchMessages(query: SearchMessagesDto): Promise<PaginatedResult<Message>>;
  
  // File attachments
  uploadAttachment(file: Express.Multer.File, messageId: string): Promise<MessageAttachment>;
  deleteAttachment(attachmentId: string): Promise<void>;
  
  // Presence and typing
  updatePresence(userId: string, status: PresenceStatus): Promise<void>;
  getPresence(userId: string): Promise<UserPresence>;
  startTyping(conversationId: string, userId: string): Promise<void>;
  stopTyping(conversationId: string, userId: string): Promise<void>;
  
  // Blocking and moderation
  blockUser(userId: string, blockedUserId: string, reason?: string): Promise<void>;
  unblockUser(userId: string, blockedUserId: string): Promise<void>;
  reportMessage(messageId: string, reporterId: string, reason: string): Promise<void>;
}
```

#### Service Implementation Structure

```
src/services/messaging/
├── core/
│   ├── MessagingService.ts           # Main service implementation
│   ├── ConversationService.ts        # Conversation-specific operations
│   ├── MessageService.ts             # Message-specific operations
│   └── PresenceService.ts            # Presence and typing indicators
├── websocket/
│   ├── MessageSocketHandler.ts       # WebSocket event handlers
│   ├── PresenceSocketHandler.ts      # Presence WebSocket handlers
│   └── FileUploadSocketHandler.ts    # File upload WebSocket handlers
├── processors/
│   ├── MessageProcessor.ts           # Message processing and validation
│   ├── NotificationProcessor.ts      # Push notification processing
│   └── FileProcessor.ts              # File upload and processing
├── repositories/
│   ├── ConversationRepository.ts     # Database operations for conversations
│   ├── MessageRepository.ts          # Database operations for messages
│   └── PresenceRepository.ts         # Redis operations for presence
├── validation/
│   ├── message.schemas.ts            # Zod schemas for message validation
│   └── conversation.schemas.ts       # Zod schemas for conversations
└── types/
    ├── message.types.ts              # TypeScript interfaces
    └── websocket.types.ts            # WebSocket event types
```

### Security Considerations

#### Authentication & Authorization

1. **JWT Token Validation**
   ```typescript
   // Enhanced WebSocket authentication middleware
   io.use(async (socket, next) => {
     try {
       const token = socket.handshake.auth.token;
       const decoded = jwt.verify(token, process.env.JWT_SECRET!);
       
       // Verify user is active and has messaging permissions
       const user = await prisma.user.findFirst({
         where: { 
           id: decoded.userId, 
           isActive: true,
           isDeleted: false 
         },
         select: { id: true, role: true, permissions: true }
       });
       
       if (!user) {
         return next(new Error('Invalid user'));
       }
       
       socket.data.userId = user.id;
       socket.data.userRole = user.role;
       socket.data.permissions = user.permissions;
       
       next();
     } catch (error) {
       next(new Error('Authentication failed'));
     }
   });
   ```

2. **Role-Based Access Control**
   ```typescript
   // Conversation access control
   async function checkConversationAccess(
     conversationId: string, 
     userId: string, 
     action: 'read' | 'write' | 'admin'
   ): Promise<boolean> {
     const participant = await prisma.conversationParticipant.findFirst({
       where: {
         conversationId,
         userId,
         isActive: true
       },
       include: {
         conversation: true
       }
     });
     
     if (!participant) return false;
     
     switch (action) {
       case 'read':
         return true; // All participants can read
       case 'write':
         return !participant.conversation.isArchived;
       case 'admin':
         return participant.role === 'admin';
       default:
         return false;
     }
   }
   ```

3. **Rate Limiting**
   ```typescript
   // Message rate limiting
   const messageRateLimit = new Map<string, number[]>();
   const MAX_MESSAGES_PER_MINUTE = 30;
   
   function checkMessageRateLimit(userId: string): boolean {
     const now = Date.now();
     const userMessages = messageRateLimit.get(userId) || [];
     
     // Remove messages older than 1 minute
     const recentMessages = userMessages.filter(time => now - time < 60000);
     
     if (recentMessages.length >= MAX_MESSAGES_PER_MINUTE) {
       return false;
     }
     
     recentMessages.push(now);
     messageRateLimit.set(userId, recentMessages);
     return true;
   }
   ```

#### Content Security

1. **Message Sanitization**
   ```typescript
   import DOMPurify from 'dompurify';
   import { JSDOM } from 'jsdom';
   
   const window = new JSDOM('').window;
   const purify = DOMPurify(window);
   
   function sanitizeMessage(content: string): string {
     // Remove potentially dangerous HTML/scripts
     const cleaned = purify.sanitize(content, {
       ALLOWED_TAGS: ['b', 'i', 'u', 'em', 'strong', 'a', 'br'],
       ALLOWED_ATTR: ['href', 'title']
     });
     
     return cleaned;
   }
   ```

2. **File Upload Security**
   ```typescript
   const ALLOWED_MIME_TYPES = [
     'image/jpeg', 'image/png', 'image/gif', 'image/webp',
     'application/pdf', 'text/plain',
     'video/mp4', 'video/webm',
     'audio/mpeg', 'audio/wav'
   ];
   
   const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
   
   function validateFile(file: Express.Multer.File): ValidationResult {
     if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
       return { valid: false, error: 'File type not allowed' };
     }
     
     if (file.size > MAX_FILE_SIZE) {
       return { valid: false, error: 'File too large' };
     }
     
     return { valid: true };
   }
   ```

3. **End-to-End Encryption (Optional)**
   ```typescript
   // For sensitive casting discussions
   interface EncryptedMessage {
     encryptedContent: string;
     keyId: string;
     algorithm: string;
     iv: string;
   }
   
   class MessageEncryption {
     async encryptMessage(
       content: string, 
       conversationKey: string
     ): Promise<EncryptedMessage> {
       const iv = crypto.randomBytes(16);
       const cipher = crypto.createCipher('aes-256-gcm', conversationKey);
       
       let encrypted = cipher.update(content, 'utf8', 'hex');
       encrypted += cipher.final('hex');
       
       return {
         encryptedContent: encrypted,
         keyId: 'conv_key_1',
         algorithm: 'aes-256-gcm',
         iv: iv.toString('hex')
       };
     }
     
     async decryptMessage(
       encrypted: EncryptedMessage, 
       conversationKey: string
     ): Promise<string> {
       const decipher = crypto.createDecipher('aes-256-gcm', conversationKey);
       
       let decrypted = decipher.update(encrypted.encryptedContent, 'hex', 'utf8');
       decrypted += decipher.final('utf8');
       
       return decrypted;
     }
   }
   ```

### File Attachment System

#### S3 Integration Strategy

```typescript
interface FileUploadConfig {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  cdnDomain?: string;
}

class S3FileUploadService {
  private s3: AWS.S3;
  
  constructor(config: FileUploadConfig) {
    this.s3 = new AWS.S3({
      region: config.region,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    });
  }
  
  async uploadFile(
    file: Express.Multer.File,
    conversationId: string,
    userId: string
  ): Promise<MessageAttachment> {
    const fileKey = `conversations/${conversationId}/${Date.now()}-${file.originalname}`;
    
    // Generate presigned URL for direct upload
    const presignedUrl = this.s3.getSignedUrl('putObject', {
      Bucket: this.config.bucket,
      Key: fileKey,
      ContentType: file.mimetype,
      Expires: 3600 // 1 hour
    });
    
    // Store attachment record in database
    const attachment = await prisma.messageAttachment.create({
      data: {
        filename: fileKey,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        storageProvider: 's3',
        storagePath: fileKey,
        uploadStatus: 'uploading'
      }
    });
    
    return {
      ...attachment,
      uploadUrl: presignedUrl
    };
  }
  
  async generateThumbnail(attachment: MessageAttachment): Promise<string> {
    if (!attachment.mimeType.startsWith('image/')) {
      return '';
    }
    
    // Use Sharp for thumbnail generation
    const originalImage = await this.s3.getObject({
      Bucket: this.config.bucket,
      Key: attachment.storagePath
    }).promise();
    
    const thumbnailBuffer = await sharp(originalImage.Body)
      .resize(300, 300, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ quality: 80 })
      .toBuffer();
    
    const thumbnailKey = `thumbnails/${attachment.filename}`;
    
    await this.s3.putObject({
      Bucket: this.config.bucket,
      Key: thumbnailKey,
      Body: thumbnailBuffer,
      ContentType: 'image/jpeg'
    }).promise();
    
    return thumbnailKey;
  }
}
```

#### File Processing Pipeline

```typescript
// Background job for processing uploaded files
export class FileProcessingJob {
  async process(job: Job<{attachmentId: string}>) {
    const { attachmentId } = job.data;
    
    const attachment = await prisma.messageAttachment.findUnique({
      where: { id: attachmentId }
    });
    
    if (!attachment) return;
    
    try {
      // 1. Virus scan
      const scanResult = await this.scanFile(attachment);
      if (scanResult.infected) {
        await this.quarantineFile(attachment);
        return;
      }
      
      // 2. Generate thumbnails/previews
      let thumbnailUrl = '';
      if (attachment.mimeType.startsWith('image/')) {
        thumbnailUrl = await this.generateImageThumbnail(attachment);
      } else if (attachment.mimeType.startsWith('video/')) {
        thumbnailUrl = await this.generateVideoThumbnail(attachment);
      }
      
      // 3. Extract metadata
      const metadata = await this.extractMetadata(attachment);
      
      // 4. Update attachment record
      await prisma.messageAttachment.update({
        where: { id: attachmentId },
        data: {
          uploadStatus: 'completed',
          thumbnailUrl,
          metadata: metadata,
          isScanned: true,
          scanResult: scanResult.status
        }
      });
      
      // 5. Notify via WebSocket
      io.to(`conversation:${attachment.message.conversationId}`)
        .emit('file:processed', {
          attachmentId,
          thumbnailUrl,
          status: 'completed'
        });
        
    } catch (error) {
      await prisma.messageAttachment.update({
        where: { id: attachmentId },
        data: { uploadStatus: 'failed' }
      });
      
      logger.error('File processing failed:', error);
    }
  }
}
```

### Performance Optimization

#### Database Optimization

1. **Efficient Message Queries**
   ```sql
   -- Optimized query for conversation messages with read status
   SELECT 
     m.*,
     json_build_object(
       'id', u.id,
       'name', COALESCE(a.first_name || ' ' || a.last_name, cd.first_name || ' ' || cd.last_name),
       'avatar', COALESCE(a.profile_image_url, cd.profile_image_url),
       'role', u.role
     ) as sender_info,
     CASE WHEN mr.id IS NOT NULL THEN true ELSE false END as is_read_by_user,
     mr.read_at
   FROM messages m
   LEFT JOIN users u ON m.sender_id = u.id
   LEFT JOIN actors a ON u.id = a.user_id
   LEFT JOIN casting_directors cd ON u.id = cd.user_id
   LEFT JOIN message_reads mr ON (m.id = mr.message_id AND mr.user_id = $2)
   WHERE m.conversation_id = $1
     AND m.is_deleted = false
   ORDER BY m.created_at DESC
   LIMIT $3 OFFSET $4;
   ```

2. **Redis Caching Strategy**
   ```typescript
   class MessageCacheManager {
     // Cache recent messages for fast access
     async cacheRecentMessages(conversationId: string, messages: Message[]): Promise<void> {
       const cacheKey = `conversation:${conversationId}:messages:recent`;
       await redis.setex(cacheKey, 3600, JSON.stringify(messages));
     }
     
     // Cache conversation metadata
     async cacheConversationInfo(conversation: Conversation): Promise<void> {
       const cacheKey = `conversation:${conversation.id}:info`;
       await redis.setex(cacheKey, 1800, JSON.stringify({
         id: conversation.id,
         title: conversation.title,
         participantCount: conversation.participants.length,
         lastMessageAt: conversation.lastMessageAt
       }));
     }
     
     // Cache user presence globally
     async cacheUserPresence(userId: string, presence: UserPresence): Promise<void> {
       const cacheKey = `presence:${userId}`;
       await redis.setex(cacheKey, 300, JSON.stringify(presence));
     }
   }
   ```

3. **Connection Pooling and Scaling**
   ```typescript
   // Redis Cluster for horizontal scaling
   const redisCluster = new Redis.Cluster([
     { host: 'redis-1.internal', port: 6379 },
     { host: 'redis-2.internal', port: 6379 },
     { host: 'redis-3.internal', port: 6379 }
   ], {
     enableReadyCheck: true,
     redisOptions: {
       password: process.env.REDIS_PASSWORD
     }
   });
   
   // Socket.io Redis adapter for multi-server support
   io.adapter(createAdapter(redisCluster));
   ```

### Integration Points

#### Project-Based Conversations

```typescript
// Automatically create conversations for project teams
export class ProjectConversationIntegration {
  async onProjectCreated(project: Project): Promise<void> {
    // Create main project discussion group
    const conversation = await messagingService.createConversation({
      type: 'project',
      title: `${project.title} - Team Discussion`,
      projectId: project.id,
      createdById: project.castingDirectorId
    });
    
    // Add casting director as admin
    await messagingService.addParticipant(
      conversation.id, 
      project.castingDirectorId, 
      'admin'
    );
    
    // Add producer if present
    if (project.producerId) {
      await messagingService.addParticipant(
        conversation.id, 
        project.producerId, 
        'admin'
      );
    }
  }
  
  async onAuditionScheduled(audition: Audition): Promise<void> {
    // Create private conversation between CD and talent
    const conversation = await messagingService.createConversation({
      type: 'direct',
      title: `Audition Discussion - ${audition.project.title}`,
      createdById: audition.castingDirectorId
    });
    
    // Add participants
    await messagingService.addParticipant(conversation.id, audition.castingDirectorId);
    await messagingService.addParticipant(conversation.id, audition.talent.userId);
    
    // Send automated welcome message
    await messagingService.sendMessage({
      conversationId: conversation.id,
      type: 'system',
      content: `Audition scheduled for ${audition.scheduledAt.toLocaleDateString()}. Feel free to discuss any questions or preparation notes here.`,
      senderId: 'system'
    });
  }
}
```

#### Notification System Integration

```typescript
// Integration with existing notification service
export class MessagingNotificationIntegration {
  async onNewMessage(message: Message): Promise<void> {
    const conversation = await prisma.conversation.findUnique({
      where: { id: message.conversationId },
      include: { participants: true }
    });
    
    if (!conversation) return;
    
    // Send notifications to all participants except sender
    const recipients = conversation.participants
      .filter(p => p.userId !== message.senderId && p.isActive)
      .map(p => p.userId);
    
    for (const userId of recipients) {
      // Check if user is currently online in this conversation
      const isOnline = await this.isUserOnlineInConversation(userId, conversation.id);
      
      if (!isOnline) {
        // Send push notification for offline users
        await notificationService.sendNotification({
          userId,
          type: NotificationType.NEW_MESSAGE,
          title: conversation.title || 'New Message',
          message: this.getPreviewText(message),
          data: {
            conversationId: conversation.id,
            messageId: message.id,
            senderId: message.senderId
          },
          actionUrl: `/messages/${conversation.id}`,
          channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP]
        });
      }
    }
  }
  
  private async isUserOnlineInConversation(
    userId: string, 
    conversationId: string
  ): Promise<boolean> {
    // Check if user has active WebSocket connection for this conversation
    const presence = await redis.get(`presence:${userId}:conversation:${conversationId}`);
    return !!presence;
  }
  
  private getPreviewText(message: Message): string {
    switch (message.type) {
      case 'text':
        return message.content.substring(0, 100);
      case 'image':
        return '📷 Sent an image';
      case 'file':
        return `📄 Sent a file: ${message.metadata?.filename}`;
      default:
        return 'New message';
    }
  }
}
```

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
**Status: Priority 1 - Core Infrastructure**

#### Week 1: Database & Core Services
- [ ] Implement database schema migration
- [ ] Create core messaging service interfaces
- [ ] Set up Redis clustering configuration
- [ ] Implement basic conversation CRUD operations
- [ ] Create message persistence layer

#### Week 2: WebSocket Infrastructure
- [ ] Enhance existing WebSocket service for messaging
- [ ] Implement authentication and authorization middleware
- [ ] Create basic message sending/receiving flow
- [ ] Add connection management and presence tracking
- [ ] Implement typing indicators

### Phase 2: Core Features (Weeks 3-4)
**Status: Priority 1 - Essential Messaging**

#### Week 3: Message Features
- [ ] Implement message threading and replies
- [ ] Add message editing and deletion
- [ ] Create read receipts system
- [ ] Implement message reactions
- [ ] Add conversation participant management

#### Week 4: File Sharing
- [ ] Integrate S3 direct upload for files
- [ ] Implement file processing pipeline
- [ ] Add thumbnail generation for images/videos
- [ ] Create file validation and security scanning
- [ ] Implement upload progress tracking

### Phase 3: Advanced Features (Weeks 5-6)
**Status: Priority 2 - Enhanced User Experience**

#### Week 5: Search & History
- [ ] Implement full-text search across messages
- [ ] Add advanced filtering capabilities
- [ ] Create message pagination system
- [ ] Implement conversation archival
- [ ] Add message export functionality

#### Week 6: Notifications & Integration
- [ ] Integrate with existing notification service
- [ ] Implement push notifications for offline users
- [ ] Create project-based auto-conversations
- [ ] Add email digest for missed messages
- [ ] Implement Do Not Disturb settings

### Phase 4: Security & Performance (Weeks 7-8)
**Status: Priority 2 - Production Readiness**

#### Week 7: Security Enhancements
- [ ] Implement message encryption for sensitive conversations
- [ ] Add content moderation and filtering
- [ ] Create user blocking and reporting system
- [ ] Implement comprehensive audit logging
- [ ] Add rate limiting and abuse prevention

#### Week 8: Performance & Monitoring
- [ ] Implement database query optimization
- [ ] Add comprehensive caching strategies
- [ ] Create performance monitoring dashboard
- [ ] Implement automated scaling triggers
- [ ] Add backup and disaster recovery

### Phase 5: Polish & Launch (Weeks 9-10)
**Status: Priority 3 - Launch Preparation**

#### Week 9: Testing & Quality Assurance
- [ ] Comprehensive unit and integration testing
- [ ] Load testing for 10,000+ concurrent users
- [ ] Security penetration testing
- [ ] User acceptance testing with beta users
- [ ] Performance optimization based on test results

#### Week 10: Deployment & Launch
- [ ] Production deployment with zero downtime
- [ ] Documentation for API and WebSocket events
- [ ] User onboarding and help documentation
- [ ] Monitoring and alerting setup
- [ ] Post-launch support and bug fixes

## Risk Mitigation

### Technical Risks

1. **High Concurrent Load**
   - **Risk**: System performance degradation under high load
   - **Mitigation**: Implement Redis clustering, database sharding, and horizontal scaling
   - **Monitoring**: Real-time performance metrics and auto-scaling triggers

2. **Message Delivery Reliability**
   - **Risk**: Messages lost during network issues
   - **Mitigation**: Implement message queuing with Bull, acknowledgment system, and offline sync
   - **Fallback**: Email notifications for critical messages

3. **Database Performance**
   - **Risk**: Slow queries as message volume grows
   - **Mitigation**: Proper indexing, query optimization, and read replicas
   - **Monitoring**: Query performance tracking and automated index suggestions

### Security Risks

1. **Data Breaches**
   - **Risk**: Unauthorized access to private conversations
   - **Mitigation**: End-to-end encryption, strict access controls, and audit logging
   - **Detection**: Anomaly detection for unusual access patterns

2. **Spam and Abuse**
   - **Risk**: Platform abuse through spam messages
   - **Mitigation**: Rate limiting, content filtering, and user reporting system
   - **Response**: Automated detection and manual review processes

### Business Risks

1. **User Adoption**
   - **Risk**: Low adoption of messaging features
   - **Mitigation**: Gradual rollout, user education, and seamless integration with existing workflows
   - **Measurement**: Usage analytics and user feedback collection

2. **Operational Costs**
   - **Risk**: High infrastructure costs for real-time messaging
   - **Mitigation**: Efficient resource utilization, caching strategies, and cost monitoring
   - **Optimization**: Regular cost analysis and optimization opportunities

## Success Metrics

### Technical Metrics
- **Message Delivery Latency**: < 100ms for 95% of messages
- **System Uptime**: 99.9% availability
- **Concurrent Users**: Support for 10,000+ simultaneous connections
- **Database Performance**: < 50ms average query response time
- **File Upload Success Rate**: > 99% completion rate

### User Experience Metrics
- **User Adoption Rate**: 70% of active users try messaging within 30 days
- **Daily Active Messagers**: 40% of daily active users send at least one message
- **Message Volume**: Average 5 messages per active conversation per day
- **User Satisfaction**: 4.5+ star rating in user feedback
- **Feature Usage**: 80% of conversations use file sharing within first week

### Business Metrics
- **User Engagement**: 25% increase in daily active users
- **Session Duration**: 15% increase in average session length
- **Project Collaboration**: 60% of active projects use team messaging
- **Support Ticket Reduction**: 20% reduction in communication-related support requests
- **Revenue Impact**: 10% increase in premium subscriptions due to enhanced communication

## Conclusion

This comprehensive real-time messaging system will significantly enhance user engagement and collaboration on the CastMatch platform. By building upon the existing WebSocket infrastructure and leveraging proven technologies like Socket.io, Redis, and PostgreSQL, we can deliver a robust, scalable, and secure messaging solution.

The phased implementation approach ensures critical features are delivered early while allowing time for proper testing and optimization. The system's design prioritizes user experience while maintaining strong security and performance characteristics essential for a professional casting platform.

Key success factors include:
- Seamless integration with existing project workflows
- Reliable message delivery and real-time synchronization
- Intuitive user interface that enhances rather than complicates the casting process
- Robust security measures to protect sensitive casting discussions
- Scalable architecture that grows with the platform

The messaging system will serve as a foundation for future collaboration features, including video calling, screen sharing, and advanced project management tools, positioning CastMatch as a comprehensive solution for the entire casting workflow.