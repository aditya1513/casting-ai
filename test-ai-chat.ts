/**
 * Test script for AI Chat Service
 * Tests structured outputs and talent search functionality
 */

import { AIChatService } from './src/services/ai-chat.service';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testAIChatService() {
  console.log('🎬 Testing CastMatch AI Chat Service\n');
  
  const aiService = new AIChatService();
  
  const testQueries = [
    {
      name: "Talent Search",
      message: "Find me actors in Mumbai aged 25-35 with dance experience",
      expectedAction: "search"
    },
    {
      name: "Recommendation Request",
      message: "Can you recommend some talented actresses for a romantic lead role?",
      expectedAction: "recommend"
    },
    {
      name: "General Query",
      message: "How does the casting process work?",
      expectedAction: "general"
    },
    {
      name: "Specific Search",
      message: "Show me female singers available for next month",
      expectedAction: "search"
    }
  ];

  const context = {
    userId: 'test-user-123',
    projectId: 'bollywood-project-1',
    conversationHistory: [],
    preferences: {
      location: 'Mumbai',
      industry: 'Bollywood'
    }
  };

  for (const test of testQueries) {
    console.log(`\n📝 Test: ${test.name}`);
    console.log(`   Query: "${test.message}"`);
    
    try {
      const response = await aiService.processMessage(test.message, context);
      
      console.log(`   ✅ Action Type: ${response.action_type}`);
      console.log(`   📊 Talents Found: ${response.talents.length}`);
      console.log(`   💬 Response: ${response.message.substring(0, 100)}...`);
      console.log(`   💡 Suggestions: ${response.suggestions.length} items`);
      
      if (response.filters_applied) {
        console.log(`   🔍 Filters Applied:`, response.filters_applied);
      }
      
      // Add to conversation history
      context.conversationHistory.push(
        { role: 'user', content: test.message },
        { role: 'assistant', content: response.message }
      );
      
    } catch (error) {
      console.error(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  console.log('\n\n🎥 Testing Streaming Response...\n');
  
  const streamQuery = "Find me the best action heroes in Mumbai";
  console.log(`Query: "${streamQuery}"`);
  
  try {
    let stepCount = 0;
    for await (const chunk of aiService.streamResponse(streamQuery, context)) {
      stepCount++;
      console.log(`Step ${stepCount} - ${chunk.type}: ${
        typeof chunk.content === 'string' 
          ? chunk.content 
          : JSON.stringify(chunk.content).substring(0, 50) + '...'
      }`);
    }
  } catch (error) {
    console.error(`Streaming Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  console.log('\n\n✨ AI Chat Service Test Complete!\n');
}

// Run tests if this file is executed directly
if (require.main === module) {
  testAIChatService().catch(console.error);
}