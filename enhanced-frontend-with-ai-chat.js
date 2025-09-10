const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'castmatch-frontend-ai-chat',
    timestamp: new Date().toISOString(),
    version: '3.0.0',
    port: PORT
  });
});

// Enhanced HTML page with AI Chat Interface
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CastMatch - AI Casting Director</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                padding: 20px;
            }
            
            .container {
                max-width: 1400px;
                margin: 0 auto;
                display: grid;
                grid-template-columns: 1fr 450px;
                gap: 20px;
                height: calc(100vh - 40px);
            }
            
            .main-panel {
                background: white;
                border-radius: 15px;
                padding: 30px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.1);
                overflow-y: auto;
            }
            
            .chat-panel {
                background: white;
                border-radius: 15px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.1);
                display: flex;
                flex-direction: column;
                height: 100%;
            }
            
            h1 {
                color: #2d3748;
                margin-bottom: 30px;
                font-size: 2.5em;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            
            .status-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-bottom: 40px;
            }
            
            .status-card {
                padding: 20px;
                border-radius: 12px;
                border: 1px solid #e2e8f0;
                transition: all 0.3s ease;
            }
            
            .status-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            }
            
            .success {
                background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
                color: #155724;
                border-color: #c3e6cb;
            }
            
            .info {
                background: linear-gradient(135deg, #d1ecf1 0%, #bee5eb 100%);
                color: #0c5460;
                border-color: #bee5eb;
            }
            
            .warning {
                background: linear-gradient(135deg, #fff3cd 0%, #fdeaa7 100%);
                color: #856404;
                border-color: #fdeaa7;
            }
            
            .api-testing {
                margin-top: 30px;
            }
            
            .api-buttons {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin-bottom: 20px;
            }
            
            button {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 15px 20px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s ease;
            }
            
            button:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
            }
            
            button:active {
                transform: translateY(0);
            }
            
            #results {
                margin-top: 20px;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 10px;
                border: 1px solid #e9ecef;
                font-family: 'Courier New', monospace;
                font-size: 14px;
                max-height: 300px;
                overflow-y: auto;
            }
            
            /* Chat Panel Styles */
            .chat-header {
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 15px 15px 0 0;
                text-align: center;
            }
            
            .chat-header h2 {
                margin-bottom: 5px;
            }
            
            .chat-status {
                font-size: 0.9em;
                opacity: 0.9;
            }
            
            .chat-messages {
                flex: 1;
                padding: 20px;
                overflow-y: auto;
                background: #f8f9fa;
            }
            
            .message {
                margin-bottom: 15px;
                animation: fadeInUp 0.3s ease;
            }
            
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .message.user {
                text-align: right;
            }
            
            .message.assistant {
                text-align: left;
            }
            
            .message-bubble {
                display: inline-block;
                max-width: 80%;
                padding: 12px 18px;
                border-radius: 20px;
                word-wrap: break-word;
                line-height: 1.4;
            }
            
            .message.user .message-bubble {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-bottom-right-radius: 5px;
            }
            
            .message.assistant .message-bubble {
                background: white;
                color: #2d3748;
                border: 1px solid #e2e8f0;
                border-bottom-left-radius: 5px;
                white-space: pre-line;
            }
            
            .message-info {
                font-size: 0.75em;
                color: #718096;
                margin-top: 5px;
            }
            
            .chat-input-area {
                padding: 20px;
                background: white;
                border-top: 1px solid #e2e8f0;
                border-radius: 0 0 15px 15px;
            }
            
            .chat-input-container {
                display: flex;
                gap: 10px;
                align-items: flex-end;
            }
            
            #chatInput {
                flex: 1;
                padding: 12px 15px;
                border: 2px solid #e2e8f0;
                border-radius: 25px;
                font-size: 16px;
                resize: none;
                max-height: 100px;
                min-height: 44px;
                transition: border-color 0.3s ease;
            }
            
            #chatInput:focus {
                outline: none;
                border-color: #667eea;
            }
            
            #sendButton {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border: none;
                border-radius: 50%;
                width: 44px;
                height: 44px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
            }
            
            #sendButton:hover {
                transform: scale(1.05);
                box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
            }
            
            .typing-indicator {
                display: none;
                padding: 12px 18px;
                background: #e2e8f0;
                border-radius: 20px 20px 20px 5px;
                color: #718096;
                font-style: italic;
                animation: pulse 1.5s ease-in-out infinite alternate;
            }
            
            @keyframes pulse {
                from { opacity: 0.6; }
                to { opacity: 1; }
            }
            
            .chat-stats {
                background: #f0f4f8;
                padding: 15px 20px;
                border-top: 1px solid #e2e8f0;
                font-size: 0.85em;
                color: #4a5568;
                text-align: center;
            }
            
            .conversation-controls {
                padding: 15px 20px;
                background: #f8f9fa;
                border-top: 1px solid #e2e8f0;
                display: flex;
                gap: 10px;
                justify-content: center;
            }
            
            .control-btn {
                background: #6c757d;
                color: white;
                border: none;
                padding: 8px 15px;
                border-radius: 20px;
                cursor: pointer;
                font-size: 0.85em;
                transition: all 0.3s ease;
            }
            
            .control-btn:hover {
                background: #5a6268;
                transform: translateY(-1px);
            }
            
            @media (max-width: 768px) {
                .container {
                    grid-template-columns: 1fr;
                    grid-template-rows: auto 1fr;
                    height: auto;
                    min-height: calc(100vh - 40px);
                }
                
                .chat-panel {
                    height: 70vh;
                    min-height: 500px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="main-panel">
                <h1>🎬 CastMatch AI Platform</h1>
                
                <div class="status-grid">
                    <div class="status-card success">
                        <h3>✅ Frontend AI Chat</h3>
                        <p>Enhanced UI with conversational AI integration</p>
                    </div>
                    
                    <div class="status-card success">
                        <h3>✅ Backend AI Engine</h3>
                        <p>Claude-powered casting conversations with memory</p>
                    </div>
                    
                    <div class="status-card success">
                        <h3>✅ Docker Infrastructure</h3>
                        <p>PostgreSQL, Redis, AI services containerized</p>
                    </div>
                    
                    <div class="status-card info">
                        <h3>🤖 Conversation AI</h3>
                        <p>Mumbai OTT casting expertise with context memory</p>
                    </div>
                </div>
                
                <div class="api-testing">
                    <h2>🔧 System Testing</h2>
                    <div class="api-buttons">
                        <button onclick="testBackendHealth()">Backend Health</button>
                        <button onclick="testTalents()">Talents Database</button>
                        <button onclick="testAIConversation()">AI Conversation Test</button>
                        <button onclick="testConversationMetrics()">AI Metrics</button>
                    </div>
                </div>
                
                <div id="results"></div>
            </div>
            
            <div class="chat-panel">
                <div class="chat-header">
                    <h2>🎭 Claude AI Casting Director</h2>
                    <div class="chat-status" id="chatStatus">Ready to help with your casting needs</div>
                </div>
                
                <div class="chat-messages" id="chatMessages">
                    <div class="message assistant">
                        <div class="message-bubble">
                            👋 Hello! I'm Claude, your AI casting director specialized in Mumbai's OTT industry. I can help you with:
                            
• Talent discovery and matching
• Character analysis and role breakdowns  
• Audition strategy and planning
• Budget guidance and market insights
• Script analysis and casting recommendations

What casting project are you working on today?
                        </div>
                        <div class="message-info">Claude • Just now</div>
                    </div>
                </div>
                
                <div class="typing-indicator" id="typingIndicator">
                    Claude is thinking...
                </div>
                
                <div class="conversation-controls">
                    <button class="control-btn" onclick="clearConversation()">Clear Chat</button>
                    <button class="control-btn" onclick="exportConversation()">Export</button>
                    <button class="control-btn" onclick="showConversationStats()">Stats</button>
                </div>
                
                <div class="chat-stats" id="chatStats">
                    Session: New conversation • Messages: 1 • Status: Active
                </div>
                
                <div class="chat-input-area">
                    <div class="chat-input-container">
                        <textarea 
                            id="chatInput" 
                            placeholder="Ask about casting, talent, budgets, auditions..."
                            rows="1"
                        ></textarea>
                        <button id="sendButton" onclick="sendMessage()">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <script>
            // Chat functionality
            let currentSessionId = null;
            let messageCount = 1;
            let conversationActive = true;
            
            // Auto-resize textarea
            const chatInput = document.getElementById('chatInput');
            chatInput.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = this.scrollHeight + 'px';
            });
            
            // Send message on Enter (Shift+Enter for new line)
            chatInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
            
            async function sendMessage() {
                const input = document.getElementById('chatInput');
                const message = input.value.trim();
                
                if (!message) return;
                
                // Clear input
                input.value = '';
                input.style.height = 'auto';
                
                // Add user message to chat
                addMessageToChat('user', message);
                
                // Show typing indicator
                showTypingIndicator();
                
                try {
                    // Start session if needed
                    if (!currentSessionId) {
                        await startConversationSession();
                    }
                    
                    // Send message to backend
                    const response = await fetch('http://localhost:3001/api/conversation/message', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            sessionId: currentSessionId,
                            message: message,
                            userId: 'frontend-user'
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        // Add Claude's response
                        hideTypingIndicator();
                        addMessageToChat('assistant', data.response);
                        
                        // Update stats
                        updateChatStats(data.metadata);
                        
                        // Update conversation stage in header
                        updateChatStatus(data.metadata);
                    } else {
                        hideTypingIndicator();
                        addMessageToChat('assistant', 'Sorry, I encountered an error. Please try again.');
                    }
                    
                } catch (error) {
                    console.error('Chat error:', error);
                    hideTypingIndicator();
                    addMessageToChat('assistant', 'I\\'m having connection issues. Please check if the backend is running and try again.');
                }
            }
            
            async function startConversationSession() {
                try {
                    const response = await fetch('http://localhost:3001/api/conversation/start', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: 'frontend-user' })
                    });
                    
                    const data = await response.json();
                    if (data.success) {
                        currentSessionId = data.sessionId;
                        document.getElementById('chatStatus').textContent = 'Connected and ready to help';
                        updateChatStats({ messageCount: 1 });
                    }
                } catch (error) {
                    console.error('Session start error:', error);
                }
            }
            
            function addMessageToChat(role, content) {
                const messagesContainer = document.getElementById('chatMessages');
                
                const messageDiv = document.createElement('div');
                messageDiv.className = \`message \${role}\`;
                
                const now = new Date().toLocaleTimeString();
                const sender = role === 'user' ? 'You' : 'Claude';
                
                messageDiv.innerHTML = \`
                    <div class="message-bubble">\${content}</div>
                    <div class="message-info">\${sender} • \${now}</div>
                \`;
                
                messagesContainer.appendChild(messageDiv);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                
                messageCount++;
            }
            
            function showTypingIndicator() {
                document.getElementById('typingIndicator').style.display = 'block';
                const messagesContainer = document.getElementById('chatMessages');
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
            
            function hideTypingIndicator() {
                document.getElementById('typingIndicator').style.display = 'none';
            }
            
            function updateChatStats(metadata) {
                const stats = document.getElementById('chatStats');
                const sessionId = currentSessionId ? currentSessionId.split('-')[1] : 'New';
                const messageCount = metadata?.messageCount || messageCount;
                const projectType = metadata?.projectType || 'General inquiry';
                
                stats.textContent = \`Session: \${sessionId} • Messages: \${messageCount} • Project: \${projectType} • Status: Active\`;
            }
            
            function updateChatStatus(metadata) {
                const statusElement = document.getElementById('chatStatus');
                const stage = metadata?.conversationStage || 'greeting';
                const statusMessages = {
                    greeting: 'Ready to help with your casting needs',
                    discovery: 'Learning about your project requirements',
                    recommendation: 'Providing casting recommendations',
                    refinement: 'Fine-tuning casting strategy'
                };
                
                statusElement.textContent = statusMessages[stage] || 'Assisting with your casting project';
            }
            
            function clearConversation() {
                if (confirm('Clear this conversation? This will start a new session.')) {
                    document.getElementById('chatMessages').innerHTML = \`
                        <div class="message assistant">
                            <div class="message-bubble">
                                👋 Hello! I'm Claude, your AI casting director specialized in Mumbai's OTT industry. I can help you with:
                                
• Talent discovery and matching
• Character analysis and role breakdowns  
• Audition strategy and planning
• Budget guidance and market insights
• Script analysis and casting recommendations

What casting project are you working on today?
                            </div>
                            <div class="message-info">Claude • Just now</div>
                        </div>
                    \`;
                    
                    currentSessionId = null;
                    messageCount = 1;
                    document.getElementById('chatStatus').textContent = 'Ready to help with your casting needs';
                    updateChatStats({ messageCount: 1 });
                }
            }
            
            async function exportConversation() {
                if (!currentSessionId) {
                    alert('No conversation to export yet!');
                    return;
                }
                
                try {
                    const response = await fetch(\`http://localhost:3001/api/conversation/\${currentSessionId}/history\`);
                    const data = await response.json();
                    
                    if (data.success) {
                        const conversations = data.messages.map(msg => 
                            \`[\${msg.role.toUpperCase()}] \${msg.content}\`
                        ).join('\\n\\n');
                        
                        const blob = new Blob([conversations], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = \`castmatch-conversation-\${currentSessionId}.txt\`;
                        a.click();
                        URL.revokeObjectURL(url);
                    }
                } catch (error) {
                    console.error('Export error:', error);
                    alert('Export failed. Please try again.');
                }
            }
            
            async function showConversationStats() {
                try {
                    const response = await fetch('http://localhost:3001/api/conversation/metrics');
                    const data = await response.json();
                    
                    if (data.success) {
                        const stats = data.metrics;
                        alert(\`Conversation Statistics:
                        
Active Sessions: \${stats.activeSessions}
Total Messages: \${stats.totalMessages}
Average Messages per Session: \${stats.averageMessagesPerSession.toFixed(1)}
                        
System Status: Operational\`);
                    }
                } catch (error) {
                    console.error('Stats error:', error);
                    alert('Could not fetch conversation statistics.');
                }
            }
            
            // System testing functions
            async function testBackendHealth() {
                try {
                    const response = await fetch('http://localhost:3001/api/health');
                    const data = await response.json();
                    document.getElementById('results').innerHTML = 
                        '<h3>Backend Health Check:</h3><pre>' + JSON.stringify(data, null, 2) + '</pre>';
                } catch (error) {
                    document.getElementById('results').innerHTML = 
                        '<h3>Backend Error:</h3><p>' + error.message + '</p>';
                }
            }
            
            async function testTalents() {
                try {
                    const response = await fetch('http://localhost:3001/api/talents');
                    const data = await response.json();
                    document.getElementById('results').innerHTML = 
                        '<h3>Talents Database:</h3><pre>' + JSON.stringify(data, null, 2) + '</pre>';
                } catch (error) {
                    document.getElementById('results').innerHTML = 
                        '<h3>Talents Error:</h3><p>' + error.message + '</p>';
                }
            }
            
            async function testAIConversation() {
                try {
                    const response = await fetch('http://localhost:3001/api/conversation/test-claude');
                    const data = await response.json();
                    document.getElementById('results').innerHTML = 
                        '<h3>AI Conversation Test:</h3><pre>' + JSON.stringify(data, null, 2) + '</pre>';
                } catch (error) {
                    document.getElementById('results').innerHTML = 
                        '<h3>AI Test Error:</h3><p>' + error.message + '</p>';
                }
            }
            
            async function testConversationMetrics() {
                try {
                    const response = await fetch('http://localhost:3001/api/conversation/metrics');
                    const data = await response.json();
                    document.getElementById('results').innerHTML = 
                        '<h3>Conversation Metrics:</h3><pre>' + JSON.stringify(data, null, 2) + '</pre>';
                } catch (error) {
                    document.getElementById('results').innerHTML = 
                        '<h3>Metrics Error:</h3><p>' + error.message + '</p>';
                }
            }
        </script>
    </body>
    </html>
  `);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
🎬 CastMatch Frontend with AI Chat Interface
==========================================
Port: ${PORT}
URL: http://localhost:${PORT}
Version: 3.0.0 - Full AI Chat Integration

✨ NEW FEATURES:
- Real-time AI chat with Claude
- Conversation memory and context
- Mumbai OTT casting expertise
- Session management and export
- Live conversation metrics

🤖 Chat Features:
- Context-aware conversations
- Casting project detection
- Budget and audition guidance
- Talent matching advice
- Export conversation history

==========================================
🚀 Enhanced CastMatch Frontend Ready!
  `);
});

module.exports = app;