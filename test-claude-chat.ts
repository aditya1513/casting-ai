/**
 * Test Script for Claude Chat API Integration
 * Run with: npx ts-node test-claude-chat.ts
 */

import axios, { AxiosInstance } from 'axios';
import { io, Socket } from 'socket.io-client';

// Configuration
const API_BASE_URL = 'http://localhost:5000/api';
const WS_URL = 'ws://localhost:5000';

// Test user credentials
const TEST_USER = {
  email: 'test.director@castmatch.com',
  password: 'Test@123456',
  firstName: 'Test',
  lastName: 'Director',
  role: 'casting_director',
};

class ClaudeChatTester {
  private api: AxiosInstance;
  private socket?: Socket;
  private authToken?: string;
  private userId?: string;
  private conversationId?: string;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests
    this.api.interceptors.request.use((config) => {
      if (this.authToken) {
        config.headers.Authorization = `Bearer ${this.authToken}`;
      }
      return config;
    });
  }

  /**
   * Register or login test user
   */
  async authenticate(): Promise<void> {
    console.log('\n🔐 Authenticating test user...');
    
    try {
      // Try to login first
      const loginResponse = await this.api.post('/auth/login', {
        email: TEST_USER.email,
        password: TEST_USER.password,
      });
      
      this.authToken = loginResponse.data.data.token;
      this.userId = loginResponse.data.data.user.id;
      console.log('✅ Logged in successfully');
    } catch (error) {
      // If login fails, try to register
      console.log('Login failed, attempting registration...');
      
      try {
        const registerResponse = await this.api.post('/auth/register', TEST_USER);
        this.authToken = registerResponse.data.data.token;
        this.userId = registerResponse.data.data.user.id;
        console.log('✅ Registered and logged in successfully');
      } catch (regError: any) {
        console.error('❌ Authentication failed:', regError.response?.data?.message || regError.message);
        throw regError;
      }
    }
  }

  /**
   * Create a new conversation
   */
  async createConversation(): Promise<void> {
    console.log('\n📝 Creating new conversation...');
    
    try {
      const response = await this.api.post('/conversations/create', {
        title: 'Claude Chat Test - ' + new Date().toISOString(),
        description: 'Testing Claude AI integration for talent discovery',
        context: {
          purpose: 'testing',
          projectType: 'web_series',
        },
      });
      
      this.conversationId = response.data.data.id;
      console.log('✅ Conversation created:', this.conversationId);
    } catch (error: any) {
      console.error('❌ Failed to create conversation:', error.response?.data?.message || error.message);
      throw error;
    }
  }

  /**
   * Connect to WebSocket
   */
  async connectWebSocket(): Promise<void> {
    console.log('\n🔌 Connecting to WebSocket...');
    
    return new Promise((resolve, reject) => {
      this.socket = io(WS_URL, {
        auth: {
          token: this.authToken,
        },
        transports: ['websocket'],
      });
      
      this.socket.on('connect', () => {
        console.log('✅ WebSocket connected');
        
        // Join conversation room
        if (this.conversationId) {
          this.socket?.emit('conversation:join', {
            conversationId: this.conversationId,
          });
        }
        
        resolve();
      });
      
      this.socket.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error.message);
        reject(error);
      });
      
      // Listen for messages
      this.socket.on('message:new', (message) => {
        console.log('📨 New message:', {
          from: message.isAiResponse ? 'AI' : 'User',
          content: message.content.substring(0, 100) + '...',
        });
      });
      
      this.socket.on('ai:typing', (data) => {
        console.log('⌨️ AI typing:', data.isTyping ? 'started' : 'stopped');
      });
      
      this.socket.on('ai:stream', (data) => {
        process.stdout.write(data.content);
      });
      
      this.socket.on('error', (error) => {
        console.error('❌ Socket error:', error);
      });
    });
  }

  /**
   * Test sending a message and getting Claude's response
   */
  async testSendMessage(message: string): Promise<void> {
    console.log(`\n💬 Sending message: "${message}"`);
    
    try {
      const response = await this.api.post(`/conversations/${this.conversationId}/messages/ai`, {
        content: message,
        stream: false,
      });
      
      const { userMessage, aiResponse } = response.data.data;
      
      console.log('\n✅ Message sent successfully');
      console.log('👤 User:', userMessage.content);
      console.log('🤖 Claude:', aiResponse.content);
      
      if (aiResponse.usage) {
        console.log('📊 Token usage:', aiResponse.usage);
      }
    } catch (error: any) {
      console.error('❌ Failed to send message:', error.response?.data?.message || error.message);
      throw error;
    }
  }

  /**
   * Test streaming response
   */
  async testStreamingMessage(message: string): Promise<void> {
    console.log(`\n🌊 Testing streaming with message: "${message}"`);
    
    try {
      const response = await this.api.post(
        `/conversations/${this.conversationId}/messages/ai`,
        {
          content: message,
          stream: true,
        },
        {
          responseType: 'stream',
        }
      );
      
      console.log('🤖 Claude (streaming): ');
      
      return new Promise((resolve, reject) => {
        response.data.on('data', (chunk: Buffer) => {
          const lines = chunk.toString().split('\n');
          lines.forEach(line => {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                console.log('\n✅ Streaming complete');
                resolve();
              } else {
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.type === 'text') {
                    process.stdout.write(parsed.content);
                  }
                } catch (e) {
                  // Ignore parse errors
                }
              }
            }
          });
        });
        
        response.data.on('error', (error: any) => {
          console.error('\n❌ Streaming error:', error);
          reject(error);
        });
      });
    } catch (error: any) {
      console.error('❌ Failed to stream message:', error.response?.data?.message || error.message);
      throw error;
    }
  }

  /**
   * Test talent search via Claude
   */
  async testTalentSearch(): Promise<void> {
    console.log('\n🔍 Testing talent search through Claude...');
    
    const searchQueries = [
      "Find me actors aged 25-35 in Mumbai with dance experience",
      "Show me female leads available for shooting next month",
      "I need a comedian for my web series, preferably with improv skills",
    ];
    
    for (const query of searchQueries) {
      await this.testSendMessage(query);
      await this.delay(2000); // Add delay to avoid rate limiting
    }
  }

  /**
   * Test conversation summary
   */
  async testConversationSummary(): Promise<void> {
    console.log('\n📋 Getting conversation summary...');
    
    try {
      const response = await this.api.get(`/conversations/${this.conversationId}/summary`);
      console.log('✅ Summary:', response.data.data.summary);
    } catch (error: any) {
      console.error('❌ Failed to get summary:', error.response?.data?.message || error.message);
    }
  }

  /**
   * Test rate limit status
   */
  async testRateLimitStatus(): Promise<void> {
    console.log('\n⏱️ Checking rate limit status...');
    
    try {
      const response = await this.api.get('/conversations/ai/rate-limit');
      console.log('✅ Rate limit status:', JSON.stringify(response.data.data, null, 2));
    } catch (error: any) {
      console.error('❌ Failed to get rate limit status:', error.response?.data?.message || error.message);
    }
  }

  /**
   * Test AI health check
   */
  async testHealthCheck(): Promise<void> {
    console.log('\n🏥 Checking Claude AI health...');
    
    try {
      const response = await this.api.get('/conversations/ai/health');
      console.log('✅ AI Health:', response.data.data);
    } catch (error: any) {
      console.error('❌ Failed to check AI health:', error.response?.data?.message || error.message);
    }
  }

  /**
   * Helper delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (this.socket) {
      this.socket.disconnect();
      console.log('\n🧹 WebSocket disconnected');
    }
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Claude Chat API Tests\n');
    console.log('================================');
    
    try {
      // 1. Authentication
      await this.authenticate();
      
      // 2. Create conversation
      await this.createConversation();
      
      // 3. Connect WebSocket
      await this.connectWebSocket();
      await this.delay(1000);
      
      // 4. Test health check
      await this.testHealthCheck();
      
      // 5. Test basic message
      await this.testSendMessage("Hello Claude! Can you help me find talent for my new web series?");
      await this.delay(2000);
      
      // 6. Test talent search
      await this.testTalentSearch();
      
      // 7. Test streaming (commented out as it might interfere with other tests)
      // await this.testStreamingMessage("Explain the casting process for a web series in detail");
      
      // 8. Test conversation summary
      await this.testConversationSummary();
      
      // 9. Test rate limit status
      await this.testRateLimitStatus();
      
      console.log('\n================================');
      console.log('✅ All tests completed successfully!');
    } catch (error) {
      console.error('\n================================');
      console.error('❌ Tests failed:', error);
    } finally {
      this.cleanup();
      process.exit(0);
    }
  }
}

// Run tests
if (require.main === module) {
  const tester = new ClaudeChatTester();
  tester.runAllTests().catch(console.error);
}

export default ClaudeChatTester;