/**
 * Simple test for the chat endpoint
 * Run with: bun run src/test-simple-chat.ts
 */

import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from './trpc/router';

// Create tRPC client
const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:8000/trpc',
      headers: {
        // Mock auth header for testing
        authorization: 'Bearer test-user-id',
        'x-user-id': 'test-user-123',
      },
    }),
  ],
});

async function testChat() {
  console.log('🧪 Testing Simple Chat Service...\n');

  try {
    // 1. Test the health check
    console.log('1️⃣ Testing health check...');
    const health = await client.simpleChat.test.query();
    console.log('✅ Health check:', health);
    
    if (!health.hasApiKey) {
      console.error('❌ OpenAI API key not configured!');
      console.log('Please set OPENAI_API_KEY in your .env file');
      return;
    }
    
    console.log('\n2️⃣ Testing chat endpoint...');
    
    // 2. Send a test message
    const testMessages = [
      "Hello! Can you help me find actors for a Bollywood movie?",
      "I need a male lead actor, age 25-35, who can dance",
      "What information do you need to help me cast a film?",
    ];
    
    for (const message of testMessages) {
      console.log(`\n📤 User: ${message}`);
      
      try {
        const response = await client.simpleChat.chat.mutate({
          message,
        });
        
        console.log(`🤖 AI: ${response.aiResponse}`);
        console.log(`📝 Conversation ID: ${response.conversationId}`);
      } catch (error: any) {
        console.error('❌ Chat error:', error.message);
      }
    }
    
    console.log('\n✅ Chat test completed!');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error('Make sure the backend is running on port 8000');
  }
}

// Run the test
testChat().then(() => {
  console.log('\n🎉 Test finished!');
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});