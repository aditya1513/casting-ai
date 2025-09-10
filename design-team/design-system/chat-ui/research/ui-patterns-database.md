# UI Patterns Database
*Comprehensive Chat Interface Pattern Library for CastMatch*

## Pattern Classification System

### Message Container Patterns

#### 1. Basic Text Message Pattern
```typescript
interface BasicTextMessage {
  // Visual Structure
  container: {
    padding: '16px 20px',
    backgroundColor: 'var(--message-bg)',
    borderRadius: '16px 16px 16px 4px', // Sent
    maxWidth: '70%',
    wordBreak: 'break-word'
  },
  typography: {
    fontSize: '14px',
    lineHeight: '1.5',
    fontFamily: 'Inter, system-ui',
    color: 'var(--text-primary)'
  },
  metadata: {
    timestamp: {
      fontSize: '11px',
      color: 'var(--text-secondary)',
      position: 'bottom-right'
    }
  }
}
```

**Implementation Example:**
```css
.message-container {
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;
  animation: messageSlideIn 200ms ease-out;
}

.message-sent {
  align-self: flex-end;
  background: linear-gradient(135deg, #007AFF 0%, #005BD1 100%);
  color: white;
  border-radius: 16px 16px 4px 16px;
}

.message-received {
  align-self: flex-start;
  background: var(--surface-2);
  color: var(--text-primary);
  border-radius: 4px 16px 16px 16px;
}

@keyframes messageSlideIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
```

**Best Practices from Analysis:**
- **WhatsApp**: Tail pointer indicates message direction
- **Claude**: Consistent 16px border radius for modern feel
- **ChatGPT**: Max-width constraint prevents reading strain
- **Slack**: Clear visual separation between consecutive messages

#### 2. Media Message Pattern
```typescript
interface MediaMessage extends BasicTextMessage {
  media: {
    container: {
      borderRadius: '12px',
      overflow: 'hidden',
      aspectRatio: 'auto',
      maxHeight: '400px'
    },
    overlay: {
      playButton: 'center-positioned',
      progressBar: 'bottom-positioned',
      duration: 'top-right-overlay'
    }
  }
}
```

**Implementation for Casting Platform:**
```css
.media-message {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background: var(--surface-1);
}

.media-thumbnail {
  width: 100%;
  height: auto;
  max-height: 300px;
  object-fit: cover;
  cursor: pointer;
}

.media-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, rgba(0,0,0,0.3) 0%, transparent 50%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.play-button {
  width: 48px;
  height: 48px;
  background: rgba(255,255,255,0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
  transition: transform 150ms ease;
}

.play-button:hover {
  transform: scale(1.1);
}
```

**Industry-Specific Adaptations:**
- **Portfolio Reels**: Auto-preview with play overlay
- **Headshots**: High-resolution display with zoom capability
- **Document Previews**: PDF/DOC thumbnails with download actions

#### 3. File Attachment Pattern
```typescript
interface FileAttachment {
  container: {
    padding: '12px 16px',
    border: '1px solid var(--border-subtle)',
    borderRadius: '8px',
    backgroundColor: 'var(--surface-2)'
  },
  fileInfo: {
    name: string,
    size: string,
    type: 'document' | 'image' | 'video' | 'audio',
    uploadStatus: 'uploading' | 'completed' | 'failed'
  },
  actions: {
    download: boolean,
    preview: boolean,
    remove: boolean
  }
}
```

**Progress Indicator Implementation:**
```css
.file-upload-container {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--surface-2);
  border: 1px dashed var(--border-default);
  border-radius: 8px;
  transition: border-color 200ms ease;
}

.file-upload-container:hover {
  border-color: var(--primary);
}

.file-progress {
  width: 100%;
  height: 4px;
  background: var(--surface-3);
  border-radius: 2px;
  overflow: hidden;
}

.file-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--primary) 0%, var(--primary-light) 100%);
  border-radius: 2px;
  transition: width 150ms ease;
  animation: progressShimmer 2s infinite;
}

@keyframes progressShimmer {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}
```

**Casting Platform Optimizations:**
- **Drag-and-Drop**: Multi-file selection for portfolio uploads
- **Compression Preview**: Show file size reduction for video uploads
- **Batch Operations**: Upload multiple headshots simultaneously
- **Preview Generation**: Automatic thumbnail creation

#### 4. System Message Pattern
```typescript
interface SystemMessage {
  visual: {
    alignment: 'center',
    backgroundColor: 'transparent',
    textAlign: 'center',
    fontSize: '12px',
    color: 'var(--text-tertiary)'
  },
  types: {
    'user-joined': 'User joined the conversation',
    'file-shared': 'Shared portfolio document',
    'status-update': 'Updated casting status',
    'scheduling': 'Audition scheduled for tomorrow'
  }
}
```

**Implementation:**
```css
.system-message {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 16px 0;
  font-size: 12px;
  color: var(--text-tertiary);
  text-align: center;
}

.system-message::before,
.system-message::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border-subtle);
  margin: 0 16px;
}

.system-message-content {
  background: var(--surface-1);
  padding: 4px 12px;
  border-radius: 12px;
  white-space: nowrap;
}
```

### Navigation Patterns

#### 1. Conversation List Pattern
```typescript
interface ConversationList {
  container: {
    width: '300px', // Desktop
    height: '100vh',
    background: 'var(--surface-1)',
    borderRight: '1px solid var(--border-default)'
  },
  searchBar: {
    position: 'sticky',
    top: 0,
    padding: '16px',
    background: 'inherit'
  },
  conversationItem: {
    height: '72px',
    padding: '12px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid var(--border-subtle)'
  }
}
```

**Responsive Implementation:**
```css
.conversation-sidebar {
  width: 300px;
  background: var(--surface-1);
  border-right: 1px solid var(--border-default);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

@media (max-width: 768px) {
  .conversation-sidebar {
    width: 100vw;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 100;
    transform: translateX(-100%);
    transition: transform 250ms ease;
  }
  
  .conversation-sidebar.open {
    transform: translateX(0);
  }
}

.conversation-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 150ms ease;
  border-bottom: 1px solid var(--border-subtle);
}

.conversation-item:hover {
  background: var(--surface-hover);
}

.conversation-item.active {
  background: var(--primary-subtle);
  border-right: 3px solid var(--primary);
}

.conversation-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--primary-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 16px;
}

.conversation-details {
  flex: 1;
  min-width: 0; /* Allows text truncation */
}

.conversation-name {
  font-weight: 500;
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conversation-preview {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conversation-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.conversation-timestamp {
  font-size: 11px;
  color: var(--text-tertiary);
}

.conversation-badge {
  background: var(--primary);
  color: white;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 600;
  min-width: 16px;
  text-align: center;
}
```

#### 2. Thread Navigation Pattern
```typescript
interface ThreadNavigation {
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 16px',
    background: 'var(--surface-2)',
    borderBottom: '1px solid var(--border-subtle)'
  },
  threadIndicator: {
    borderLeft: '3px solid var(--primary)',
    paddingLeft: '12px',
    marginLeft: '16px'
  }
}
```

**Thread Visual Hierarchy:**
```css
.thread-container {
  position: relative;
}

.thread-indicator {
  position: absolute;
  left: 8px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--primary);
  border-radius: 1px;
}

.thread-message {
  margin-left: 24px;
  padding-left: 16px;
  border-left: 1px solid var(--border-subtle);
}

.thread-reply {
  margin-top: 8px;
  padding: 8px 12px;
  background: var(--surface-2);
  border-radius: 8px;
  border-left: 3px solid var(--primary);
}

.thread-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border-subtle);
  font-size: 12px;
  color: var(--text-secondary);
}

.breadcrumb-separator {
  color: var(--text-tertiary);
}
```

### Input Patterns

#### 1. Message Input Pattern
```typescript
interface MessageInput {
  container: {
    position: 'sticky',
    bottom: 0,
    padding: '16px 20px',
    background: 'var(--surface-1)',
    borderTop: '1px solid var(--border-default)'
  },
  textarea: {
    minHeight: '20px',
    maxHeight: '120px',
    resize: 'none',
    border: 'none',
    outline: 'none'
  },
  actions: {
    position: 'right',
    display: 'flex',
    gap: '8px'
  }
}
```

**Auto-expanding Implementation:**
```css
.message-input-container {
  position: sticky;
  bottom: 0;
  padding: 16px 20px;
  background: var(--surface-1);
  border-top: 1px solid var(--border-default);
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.message-input {
  flex: 1;
  min-height: 20px;
  max-height: 120px;
  resize: none;
  border: 1px solid var(--border-default);
  border-radius: 20px;
  padding: 10px 16px;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.4;
  background: var(--surface-2);
  transition: border-color 150ms ease;
  overflow-y: auto;
}

.message-input:focus {
  border-color: var(--primary);
  outline: none;
  box-shadow: 0 0 0 3px var(--primary-alpha);
}

.message-input::placeholder {
  color: var(--text-placeholder);
}

.input-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.action-button {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: var(--surface-3);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms ease;
}

.action-button:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
  transform: scale(1.05);
}

.send-button {
  background: var(--primary);
  color: white;
}

.send-button:disabled {
  background: var(--surface-3);
  color: var(--text-disabled);
  cursor: not-allowed;
  transform: none;
}
```

#### 2. Attachment Upload Pattern
```typescript
interface AttachmentUpload {
  dragDrop: {
    overlay: true,
    acceptedTypes: ['.jpg', '.png', '.pdf', '.doc', '.mp4'],
    maxSize: '50MB',
    multiple: true
  },
  preview: {
    thumbnail: true,
    fileName: true,
    fileSize: true,
    removeAction: true
  }
}
```

**Drag-and-Drop Implementation:**
```css
.upload-dropzone {
  position: relative;
  border: 2px dashed var(--border-default);
  border-radius: 8px;
  padding: 32px;
  text-align: center;
  background: var(--surface-1);
  transition: all 200ms ease;
  cursor: pointer;
}

.upload-dropzone:hover,
.upload-dropzone.drag-over {
  border-color: var(--primary);
  background: var(--primary-alpha);
  transform: scale(1.02);
}

.upload-dropzone.drag-over::after {
  content: 'Drop files here';
  position: absolute;
  inset: 0;
  background: var(--primary-alpha);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  color: var(--primary);
  border-radius: 6px;
}

.file-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: var(--surface-2);
  border-radius: 6px;
  margin-top: 8px;
}

.file-thumbnail {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  background: var(--surface-3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.file-details {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 11px;
  color: var(--text-secondary);
}

.file-remove {
  width: 20px;
  height: 20px;
  border: none;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms ease;
}

.file-remove:hover {
  background: var(--error-alpha);
  color: var(--error);
}
```

### Status Indicator Patterns

#### 1. Online Presence Pattern
```typescript
interface OnlinePresence {
  indicator: {
    size: '8px' | '12px' | '16px',
    position: 'bottom-right' | 'top-right',
    colors: {
      online: '#22C55E',
      away: '#F59E0B',
      busy: '#EF4444',
      offline: '#6B7280'
    }
  }
}
```

**Implementation:**
```css
.presence-indicator {
  position: relative;
}

.presence-indicator::after {
  content: '';
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid var(--surface-1);
  bottom: -2px;
  right: -2px;
}

.presence-indicator.online::after {
  background: #22C55E;
}

.presence-indicator.away::after {
  background: #F59E0B;
}

.presence-indicator.busy::after {
  background: #EF4444;
}

.presence-indicator.offline::after {
  background: #6B7280;
}

.presence-text {
  font-size: 12px;
  color: var(--text-secondary);
  margin-left: 4px;
}
```

#### 2. Message Status Pattern
```typescript
interface MessageStatus {
  states: {
    sending: 'clock-icon',
    sent: 'single-checkmark',
    delivered: 'double-checkmark',
    read: 'double-checkmark-blue'
  },
  position: 'bottom-right-message',
  size: '14px'
}
```

**WhatsApp-inspired Implementation:**
```css
.message-status {
  display: inline-flex;
  align-items: center;
  margin-left: 8px;
  font-size: 14px;
}

.status-sending {
  color: var(--text-tertiary);
}

.status-sent {
  color: var(--text-secondary);
}

.status-delivered {
  color: var(--text-secondary);
}

.status-read {
  color: var(--primary);
}

.checkmark-double {
  position: relative;
}

.checkmark-double::after {
  content: '✓';
  position: absolute;
  left: 2px;
}
```

### Typing Indicator Pattern

```typescript
interface TypingIndicator {
  animation: 'dots-pulse' | 'dots-bounce',
  duration: '1.5s',
  position: 'conversation-area',
  maxUsers: 3
}
```

**Implementation:**
```css
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  margin: 8px 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.typing-dots {
  display: flex;
  gap: 2px;
}

.typing-dot {
  width: 4px;
  height: 4px;
  background: var(--text-secondary);
  border-radius: 50%;
  animation: typingPulse 1.5s infinite;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typingPulse {
  0%, 60%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  30% {
    opacity: 1;
    transform: scale(1.2);
  }
}
```

## Performance Optimization Patterns

### Virtual Scrolling Pattern
```typescript
interface VirtualScrolling {
  implementation: 'react-window' | 'react-virtualized',
  itemHeight: 'variable' | 'fixed',
  overscan: number,
  threshold: 'conversation-length > 100'
}
```

### Message Batching Pattern
```typescript
interface MessageBatching {
  batchSize: 20,
  loadTrigger: 'scroll-to-top',
  caching: 'in-memory + localStorage',
  preloader: 'skeleton-messages'
}
```

### Image Lazy Loading Pattern
```css
.message-image {
  background: var(--surface-2);
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.message-image img {
  width: 100%;
  height: auto;
  opacity: 0;
  transition: opacity 300ms ease;
}

.message-image img.loaded {
  opacity: 1;
}

.image-placeholder {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, var(--surface-2) 0%, var(--surface-3) 50%, var(--surface-2) 100%);
  background-size: 200% 100%;
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

## Accessibility Patterns

### Keyboard Navigation
```typescript
interface KeyboardNavigation {
  shortcuts: {
    'Enter': 'send-message',
    'Shift+Enter': 'new-line',
    'Escape': 'close-modal',
    'ArrowUp': 'edit-last-message',
    'Tab': 'navigate-actions'
  }
}
```

### Screen Reader Support
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.message-container {
  role: 'article';
  aria-label: 'Message from {username} at {timestamp}';
}

.conversation-list {
  role: 'navigation';
  aria-label: 'Conversation list';
}

.message-input {
  aria-label: 'Type your message';
  aria-describedby: 'input-help';
}
```

## Responsive Design Patterns

### Mobile-First Breakpoints
```css
/* Mobile First: 320px - 767px */
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-height: 100vh;
}

.conversation-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: var(--surface-1);
  border-bottom: 1px solid var(--border-default);
}

/* Tablet: 768px - 1023px */
@media (min-width: 768px) {
  .chat-container {
    flex-direction: row;
  }
  
  .conversation-sidebar {
    display: flex;
    width: 320px;
    flex-shrink: 0;
  }
}

/* Desktop: 1024px+ */
@media (min-width: 1024px) {
  .chat-container {
    max-width: 1400px;
    margin: 0 auto;
  }
  
  .conversation-sidebar {
    width: 360px;
  }
  
  .chat-main {
    flex: 1;
    max-width: 800px;
  }
}
```

### Touch Optimization
```css
.touch-target {
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.message-actions {
  opacity: 0;
  transition: opacity 200ms ease;
}

.message-container:hover .message-actions,
.message-container:focus-within .message-actions {
  opacity: 1;
}

/* Touch devices show actions on tap */
@media (hover: none) and (pointer: coarse) {
  .message-actions {
    opacity: 1;
  }
  
  .message-container {
    padding-bottom: 8px;
  }
}
```

## Animation Patterns

### Message Entrance
```css
@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.message-container.new {
  animation: messageSlideIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### Loading States
```css
.skeleton-message {
  background: linear-gradient(90deg, var(--surface-2) 0%, var(--surface-3) 50%, var(--surface-2) 100%);
  background-size: 200% 100%;
  animation: skeleton-pulse 2s infinite;
  border-radius: 4px;
}

@keyframes skeleton-pulse {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

## Industry-Specific Patterns

### Casting Portfolio Integration
```typescript
interface PortfolioMessage {
  type: 'portfolio-share',
  content: {
    thumbnails: string[],
    title: string,
    description: string,
    actions: ['view-full', 'download', 'comment']
  }
}
```

### Audition Scheduling Pattern
```css
.scheduling-message {
  background: var(--info-bg);
  border: 1px solid var(--info-border);
  border-radius: 8px;
  padding: 16px;
  margin: 8px 0;
}

.schedule-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.schedule-button {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms ease;
}

.schedule-accept {
  background: var(--success);
  color: white;
}

.schedule-decline {
  background: var(--error);
  color: white;
}

.schedule-reschedule {
  background: var(--warning);
  color: white;
}
```

## Quality Standards

### Performance Metrics
- Message render time: <100ms
- Scroll performance: 60fps maintained
- Image loading: Progressive with blur placeholder
- Animation frame rate: Consistent 60fps

### Accessibility Compliance
- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility
- Color contrast ratio: Minimum 4.5:1

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers: iOS 14+, Android 10+

*Pattern Library Version: 1.0*
*Last Updated: September 4, 2025*
*Next Review: Monthly pattern updates*