/**
 * Standalone WebSocket Server for Real-time Chat
 * Runs on separate port from main Hono API server
 */

import { createServer } from 'http';
import { initializeChatWebSocket } from './services/websocket/chat-websocket.service';
import { logger } from './utils/logger';

const WEBSOCKET_PORT = 3002;

// Create HTTP server for WebSocket
const httpServer = createServer((req, res) => {
  // Simple health check for WebSocket server
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy', 
      service: 'websocket-server',
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // For all other requests, return 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// Initialize WebSocket service
const chatWebSocketService = initializeChatWebSocket(httpServer);

// Start WebSocket server
httpServer.listen(WEBSOCKET_PORT, () => {
  logger.info(`
🔌 CastMatch WebSocket Server Started
===================================
Port: ${WEBSOCKET_PORT}
WebSocket URL: ws://localhost:${WEBSOCKET_PORT}/socket.io/
Health Check: http://localhost:${WEBSOCKET_PORT}/health
===================================

🚀 Real-time Features Available:
- Conversational AI Chat
- Live typing indicators  
- Instant AI responses
- Agent handoff notifications
- Real-time casting workflows
- Memory persistence
- Quick action triggers
===================================
`);
});

export { chatWebSocketService };