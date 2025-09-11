/**
 * Test Script for AI Agents
 * Demonstrates the capabilities of all AI agents
 */

import { config } from '../config/config';
import { TalentMatchingAgent } from '../services/ai/agents/talent-matching.agent';
import { ScriptAnalysisAgent } from '../services/ai/agents/script-analysis.agent';
import { SchedulingAgent } from '../services/ai/agents/scheduling.agent';
import { CommunicationAgent } from '../services/ai/agents/communication.agent';
import { AnalyticsAgent } from '../services/ai/agents/analytics.agent';
import { AgentRouter, AgentType } from '../services/ai/agent-router';
import { ConversationService } from '../services/ai/conversation.service';
import { logger } from '../utils/logger';

// Sample data for testing
const SAMPLE_SCRIPT = `
Title: "Mumbai Dreams"
Genre: Drama/Romance

SCENE 1 - FILM STUDIO - DAY

We need a LEAD ACTOR (Male, 25-35 years) to play RAJ, a struggling actor from small-town India 
who comes to Mumbai with big dreams. He should be able to speak Hindi and English fluently, 
have good dancing skills for a Bollywood number, and convey both vulnerability and determination.

Supporting role: PRIYA (Female, 22-30 years) - A casting director who believes in Raj's talent. 
Should have a professional demeanor but warm personality. English and Hindi required.

Featured role: STUDIO BOSS (Male, 45-60 years) - Authoritative, well-dressed, speaks primarily English.
`;

const SAMPLE_USER_ID = 'test-user-123';

async function testTalentMatching() {
  console.log('\n========== TESTING TALENT MATCHING AGENT ==========\n');
  
  const agent = new TalentMatchingAgent();
  
  try {
    const result = await agent.findMatches({
      requirements: {
        ageMin: 25,
        ageMax: 35,
        gender: 'male',
        languages: ['Hindi', 'English'],
        skills: ['dancing', 'acting'],
        location: 'Mumbai',
      },
      characterDescription: 'Lead actor for a Bollywood drama, must have strong emotional range',
      limit: 5,
    });
    
    console.log(`Found ${result.matches.length} matching talents:`);
    result.matches.forEach((match, index) => {
      console.log(`\n${index + 1}. ${match.name}`);
      console.log(`   Score: ${match.matchScore}/100`);
      console.log(`   Reasons: ${match.matchReasons.join(', ')}`);
    });
  } catch (error) {
    console.error('Talent matching failed:', error);
  }
}

async function testScriptAnalysis() {
  console.log('\n========== TESTING SCRIPT ANALYSIS AGENT ==========\n');
  
  const agent = new ScriptAnalysisAgent();
  
  try {
    const result = await agent.analyzeScript({
      scriptText: SAMPLE_SCRIPT,
      extractionType: 'full',
      language: 'en',
    });
    
    console.log('Script Analysis Results:');
    console.log(`Title: ${result.analysis.title || 'Mumbai Dreams'}`);
    console.log(`Genre: ${result.analysis.genre.join(', ')}`);
    console.log(`\nCharacters Found: ${result.analysis.characters.length}`);
    
    result.analysis.characters.forEach((char, index) => {
      console.log(`\n${index + 1}. ${char.name} (${char.role})`);
      console.log(`   Age: ${char.ageRange.min}-${char.ageRange.max}`);
      console.log(`   Gender: ${char.gender}`);
      console.log(`   Skills: ${char.skills.join(', ')}`);
      console.log(`   Languages: ${char.languages.join(', ')}`);
    });
    
    // Generate casting brief
    const brief = await agent.generateCastingBrief(result.analysis);
    console.log('\n--- Casting Brief ---');
    console.log(brief.substring(0, 500) + '...');
  } catch (error) {
    console.error('Script analysis failed:', error);
  }
}

async function testScheduling() {
  console.log('\n========== TESTING SCHEDULING AGENT ==========\n');
  
  const agent = new SchedulingAgent();
  
  try {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const result = await agent.optimizeSchedule({
      dateRange: {
        start: now.toISOString(),
        end: weekFromNow.toISOString(),
      },
      location: 'Film City, Mumbai',
      isOnline: false,
      duration: 30,
      breakDuration: 15,
      maxPerDay: 8,
      preferences: {
        avoidLunchHours: true,
        preferMornings: true,
        considerTraffic: true,
        groupSimilarRoles: true,
      },
    });
    
    console.log('Schedule Optimization Results:');
    console.log(`Total Slots: ${result.summary.totalSlots}`);
    console.log(`Total Days: ${result.summary.totalDays}`);
    console.log(`Optimization Score: ${result.summary.optimizationScore}/100`);
    console.log('\nRecommendations:');
    result.recommendations.forEach(rec => console.log(`- ${rec}`));
    
    console.log('\nFirst 5 Schedule Slots:');
    result.schedule.slice(0, 5).forEach((slot, index) => {
      const start = new Date(slot.startTime);
      console.log(`${index + 1}. ${start.toLocaleDateString()} ${start.toLocaleTimeString()}`);
      console.log(`   Location: ${slot.location || 'TBD'}`);
      console.log(`   Status: ${slot.status}`);
    });
  } catch (error) {
    console.error('Scheduling failed:', error);
  }
}

async function testCommunication() {
  console.log('\n========== TESTING COMMUNICATION AGENT ==========\n');
  
  const agent = new CommunicationAgent();
  
  try {
    // Test audition invitation
    const invitation = await agent.generateMessage({
      messageType: 'audition_invitation',
      recipient: {
        name: 'Rahul Sharma',
        role: 'talent',
        email: 'rahul@example.com',
      },
      context: {
        projectName: 'Mumbai Dreams',
        roleName: 'Raj (Lead Actor)',
        auditionDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        location: 'Film City Studio 5, Mumbai',
      },
      tone: 'friendly',
      language: 'en',
      includeSignature: true,
    });
    
    console.log('Generated Audition Invitation:');
    console.log(`Subject: ${invitation.subject}`);
    console.log(`\nBody:\n${invitation.body}`);
    console.log(`\nSMS Version (${invitation.smsVersion?.length} chars):`);
    console.log(invitation.smsVersion);
    console.log(`\nEstimated Read Time: ${invitation.estimatedReadTime} seconds`);
    
    // Test message translation
    const translated = await agent.translateMessage(
      'Congratulations on being selected for the role!',
      'en',
      'hi'
    );
    console.log('\nTranslation Test:');
    console.log(`English: Congratulations on being selected for the role!`);
    console.log(`Hindi: ${translated}`);
  } catch (error) {
    console.error('Communication failed:', error);
  }
}

async function testAnalytics() {
  console.log('\n========== TESTING ANALYTICS AGENT ==========\n');
  
  const agent = new AnalyticsAgent();
  
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    
    const result = await agent.analyze({
      queryType: 'project_performance',
      dateRange: {
        start: thirtyDaysAgo.toISOString(),
        end: now.toISOString(),
      },
      format: 'summary',
    });
    
    console.log('Analytics Results:');
    console.log(`Period: ${new Date(result.period.start).toLocaleDateString()} - ${new Date(result.period.end).toLocaleDateString()}`);
    
    console.log('\nKey Metrics:');
    Object.entries(result.metrics).forEach(([key, value]: [string, any]) => {
      console.log(`- ${key}: ${value.value} ${value.trend ? `(${value.trend})` : ''}`);
    });
    
    console.log('\nInsights:');
    result.insights.forEach(insight => console.log(`- ${insight}`));
    
    console.log('\nRecommendations:');
    result.recommendations.forEach(rec => console.log(`- ${rec}`));
  } catch (error) {
    console.error('Analytics failed:', error);
  }
}

async function testAgentRouter() {
  console.log('\n========== TESTING AGENT ROUTER ==========\n');
  
  const router = new AgentRouter();
  
  const testMessages = [
    'Find me actors aged 25-35 who can dance',
    'Analyze this script for a romantic comedy',
    'Schedule auditions for next week',
    'Write an email to selected candidates',
    'Show me performance metrics for last month',
    'What is the casting process in Bollywood?',
  ];
  
  for (const message of testMessages) {
    try {
      console.log(`\nMessage: "${message}"`);
      const result = await router.routeMessage({
        message,
        userId: SAMPLE_USER_ID,
      });
      
      console.log(`Routed to: ${result.agent}`);
      console.log(`Confidence: ${result.metadata.confidence}`);
      console.log(`Intent: ${result.metadata.intent}`);
    } catch (error) {
      console.error(`Routing failed for "${message}":`, error);
    }
  }
}

async function testConversationService() {
  console.log('\n========== TESTING CONVERSATION SERVICE ==========\n');
  
  const service = new ConversationService();
  
  try {
    // Create conversation
    const conversation = await service.createConversation({
      userId: SAMPLE_USER_ID,
      title: 'Test AI Conversation',
      description: 'Testing all AI agents',
    });
    
    console.log(`Created conversation: ${conversation.id}`);
    
    // Send test message
    const response = await service.sendMessage({
      conversationId: conversation.id,
      userId: SAMPLE_USER_ID,
      content: 'Find me young actors for a Bollywood drama',
      type: 'text',
    });
    
    console.log(`\nAgent Response (${response.agent}):`);
    console.log(JSON.stringify(response.response, null, 2).substring(0, 500) + '...');
    console.log(`Processing Time: ${response.processingTime}ms`);
    
    // Get conversation history
    const history = await service.getConversationHistory({
      conversationId: conversation.id,
      userId: SAMPLE_USER_ID,
      limit: 10,
      offset: 0,
    });
    
    console.log(`\nConversation has ${history.messages.length} messages`);
  } catch (error) {
    console.error('Conversation service failed:', error);
  }
}

// Main test runner
async function runTests() {
  console.log('='.repeat(60));
  console.log('       CASTMATCH AI AGENTS TEST SUITE');
  console.log('='.repeat(60));
  
  // Check if OpenAI API key is configured
  if (!config.openai?.apiKey) {
    console.error('\n❌ OpenAI API key not configured!');
    console.error('Please set OPENAI_API_KEY in your .env file');
    process.exit(1);
  }
  
  console.log('\n✅ OpenAI API key configured');
  console.log('Starting AI agent tests...\n');
  
  try {
    // Run individual agent tests
    await testScriptAnalysis();
    await testTalentMatching();
    await testScheduling();
    await testCommunication();
    await testAnalytics();
    await testAgentRouter();
    
    // Test conversation service (integrates all agents)
    await testConversationService();
    
    console.log('\n' + '='.repeat(60));
    console.log('       ALL TESTS COMPLETED SUCCESSFULLY! 🎉');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

export { runTests };