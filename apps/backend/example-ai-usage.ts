/**
 * CastMatch AI Service - Example Usage
 * This demonstrates how to use the AI service in production
 */

import { appRouter } from './src/trpc/router';
import { createContext } from './src/trpc/context';
import { AgentType } from './src/services/ai/agent-router';

// Example 1: Create a conversation and send a message
async function exampleConversation() {
  console.log('\n📝 Example 1: AI Conversation\n');
  
  // Create a mock context (in production, this comes from auth)
  const ctx = await createContext({
    req: {
      headers: {
        get: () => null,
      },
    } as any,
  });
  
  // Override with test user (in production, this comes from auth)
  ctx.userId = 'test-user-123';
  
  // Create a new conversation
  const conversation = await appRouter.ai.createConversation({
    ctx,
    input: {
      title: 'Finding lead actor for romantic comedy',
      description: 'Need to cast the male lead for upcoming rom-com',
    },
    rawInput: {} as any,
    type: 'mutation',
    path: 'ai.createConversation',
  });
  
  console.log('✅ Created conversation:', conversation.id);
  
  // Send a message
  const response = await appRouter.ai.sendMessage({
    ctx,
    input: {
      conversationId: conversation.id,
      content: 'I need to find a male actor aged 25-35 for a romantic comedy lead. He should be fluent in Hindi and English, with good comic timing.',
      type: 'text',
      preferredAgent: AgentType.TALENT_MATCHING,
    },
    rawInput: {} as any,
    type: 'mutation',
    path: 'ai.sendMessage',
  });
  
  console.log('✅ AI Response:', response);
}

// Example 2: Direct talent search
async function exampleTalentSearch() {
  console.log('\n🎭 Example 2: Direct Talent Search\n');
  
  const ctx = await createContext({
    req: {
      headers: {
        get: () => null,
      },
    } as any,
  });
  ctx.userId = 'test-user-123';
  
  const matches = await appRouter.ai.findTalentMatches({
    ctx,
    input: {
      requirements: {
        ageMin: 25,
        ageMax: 35,
        gender: 'male',
        languages: ['Hindi', 'English'],
        skills: ['comedy', 'romance'],
        location: 'Mumbai',
      },
      characterDescription: 'Charming romantic lead with comedic skills',
      limit: 5,
    },
    rawInput: {} as any,
    type: 'query',
    path: 'ai.findTalentMatches',
  });
  
  console.log('✅ Found talent matches:', matches);
}

// Example 3: Script analysis
async function exampleScriptAnalysis() {
  console.log('\n📜 Example 3: Script Analysis\n');
  
  const ctx = await createContext({
    req: {
      headers: {
        get: () => null,
      },
    } as any,
  });
  ctx.userId = 'test-user-123';
  
  const analysis = await appRouter.ai.analyzeScript({
    ctx,
    input: {
      scriptContent: `
        SCENE 1
        INT. COFFEE SHOP - DAY
        
        RAJ (28, charming but clumsy) spills coffee on PRIYA (26, elegant and witty).
        
        RAJ
        (embarrassed)
        I'm so sorry! Let me help—
        
        PRIYA
        (laughing)
        It's okay. At least now we have a story to tell at parties.
        
        They share a moment of laughter.
      `,
      projectId: 'test-project-123',
    },
    rawInput: {} as any,
    type: 'mutation',
    path: 'ai.analyzeScript',
  });
  
  console.log('✅ Script analysis:', analysis);
}

// Example 4: Schedule optimization
async function exampleScheduling() {
  console.log('\n📅 Example 4: Schedule Optimization\n');
  
  const ctx = await createContext({
    req: {
      headers: {
        get: () => null,
      },
    } as any,
  });
  ctx.userId = 'test-user-123';
  
  const schedule = await appRouter.ai.optimizeSchedule({
    ctx,
    input: {
      auditions: [
        {
          talentId: 'talent-1',
          talentName: 'Actor 1',
          estimatedDuration: 30,
          priority: 'high',
        },
        {
          talentId: 'talent-2',
          talentName: 'Actor 2',
          estimatedDuration: 45,
          priority: 'medium',
        },
      ],
      constraints: {
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T18:00:00Z',
        location: 'Mumbai Studio',
        breakDuration: 15,
      },
    },
    rawInput: {} as any,
    type: 'mutation',
    path: 'ai.optimizeSchedule',
  });
  
  console.log('✅ Optimized schedule:', schedule);
}

// Example 5: Generate communication
async function exampleCommunication() {
  console.log('\n💬 Example 5: Generate Communication\n');
  
  const ctx = await createContext({
    req: {
      headers: {
        get: () => null,
      },
    } as any,
  });
  ctx.userId = 'test-user-123';
  
  const message = await appRouter.ai.generateMessage({
    ctx,
    input: {
      type: 'audition_invitation',
      recipient: {
        name: 'Raj Kumar',
        role: 'actor',
        language: 'Hindi',
      },
      context: {
        projectName: 'Romantic Comedy Film',
        auditionDate: '2024-01-20',
        auditionTime: '3:00 PM',
        location: 'Film City, Mumbai',
        role: 'Lead Actor',
      },
    },
    rawInput: {} as any,
    type: 'mutation',
    path: 'ai.generateMessage',
  });
  
  console.log('✅ Generated message:', message);
}

// Example 6: Get analytics insights
async function exampleAnalytics() {
  console.log('\n📊 Example 6: Analytics Insights\n');
  
  const ctx = await createContext({
    req: {
      headers: {
        get: () => null,
      },
    } as any,
  });
  ctx.userId = 'test-user-123';
  
  const analytics = await appRouter.ai.getAnalytics({
    ctx,
    input: {
      type: 'talent_pool',
      filters: {
        ageRange: [20, 40],
        languages: ['Hindi', 'English'],
        location: 'Mumbai',
      },
      metrics: ['diversity', 'availability', 'budget_range'],
    },
    rawInput: {} as any,
    type: 'query',
    path: 'ai.getAnalytics',
  });
  
  console.log('✅ Analytics insights:', analytics);
}

// Main function to run all examples
async function runExamples() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║           CastMatch AI Service - Usage Examples               ║
╚════════════════════════════════════════════════════════════════╝
`);
  
  try {
    // Check if OpenAI key is configured
    const { config } = await import('./src/config/config');
    
    if (!config.openai?.apiKey) {
      console.error(`
⚠️  WARNING: OpenAI API key not configured!
   Please set OPENAI_API_KEY in your .env file
   
   Example:
   OPENAI_API_KEY=sk-your-key-here
`);
      return;
    }
    
    // Run examples (comment out any you don't want to run)
    
    // await exampleConversation();
    // await exampleTalentSearch();
    // await exampleScriptAnalysis();
    // await exampleScheduling();
    // await exampleCommunication();
    // await exampleAnalytics();
    
    console.log(`
📌 NOTE: Examples are commented out to prevent API usage.
   Uncomment the examples you want to run in the runExamples() function.
`);
    
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Run if called directly
if (require.main === module) {
  runExamples();
}

export {
  exampleConversation,
  exampleTalentSearch,
  exampleScriptAnalysis,
  exampleScheduling,
  exampleCommunication,
  exampleAnalytics,
};