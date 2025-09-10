/**
 * Agent Integration Test Script
 * Tests the integration between CastMatch backend and AI agents
 */

import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from './src/trpc/router';
import fetch from 'node-fetch';

// Configure tRPC client
const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3001/api/trpc',
      headers: {
        // Add auth token if needed
        'x-user-id': 'test-user-123',
      },
      fetch: fetch as any,
    }),
  ],
});

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Test utilities
function logTest(name: string, status: 'pass' | 'fail' | 'skip', message?: string) {
  const color = status === 'pass' ? colors.green : status === 'fail' ? colors.red : colors.yellow;
  const symbol = status === 'pass' ? '✓' : status === 'fail' ? '✗' : '○';
  console.log(`${color}${symbol} ${name}${colors.reset}${message ? ': ' + message : ''}`);
}

function logSection(title: string) {
  console.log(`\n${colors.bright}${colors.blue}━━━ ${title} ━━━${colors.reset}`);
}

// Test functions
async function testAgentServerHealth() {
  logSection('Agent Server Health Check');
  
  try {
    // Test direct agent server
    const response = await fetch('http://localhost:8080/health');
    const data = await response.json();
    
    if (data.status === 'healthy') {
      logTest('Direct agent server health', 'pass', `${Object.keys(data.agents).length} agents active`);
    } else {
      logTest('Direct agent server health', 'fail', 'Server unhealthy');
    }
    
    // Test through tRPC
    const trpcStatus = await trpc.agents.status.query();
    
    if (trpcStatus.success && trpcStatus.serverHealth) {
      logTest('tRPC agent status', 'pass', 'Agent integration working');
    } else {
      logTest('tRPC agent status', 'fail', trpcStatus.error || 'Integration failed');
    }
    
  } catch (error: any) {
    logTest('Agent server connectivity', 'fail', error.message);
    console.log(`${colors.yellow}Make sure the agent server is running: cd /Users/Aditya/Desktop/casting-ai/agents && node start.js${colors.reset}`);
    return false;
  }
  
  return true;
}

async function testScriptAnalysis() {
  logSection('Script Analysis Agent');
  
  try {
    const mockScript = `
    FADE IN:
    
    INT. COFFEE SHOP - DAY
    
    SARAH (25), an aspiring writer, sits at a corner table with her laptop.
    
    SARAH
    (to herself)
    Just one more chapter...
    
    JAMES (30), a charming barista, approaches with a coffee.
    
    JAMES
    Your usual, extra shot of inspiration?
    
    SARAH
    (smiling)
    You know me too well.
    
    FADE OUT.
    `;
    
    const result = await trpc.agents.analyzeScript.mutate({
      scriptContent: mockScript,
      fileType: 'txt',
      projectContext: {
        type: 'short-film',
        genre: ['romance', 'drama'],
      },
    });
    
    if (result.success && result.analysis) {
      logTest('Script analysis', 'pass', `Found ${result.analysis.characters.length} characters`);
      
      // Display character details
      result.analysis.characters.forEach(char => {
        console.log(`  ${colors.cyan}→ ${char.name}${colors.reset}: ${char.description} (${char.importance})`);
      });
    } else {
      logTest('Script analysis', 'fail', 'No analysis results');
    }
    
    return result.conversationId;
    
  } catch (error: any) {
    logTest('Script analysis', 'fail', error.message);
    return null;
  }
}

async function testTalentDiscovery() {
  logSection('Talent Discovery Agent');
  
  try {
    const result = await trpc.agents.discoverTalent.mutate({
      roleDescription: 'Young female lead for romantic drama, must have strong emotional range',
      physicalRequirements: {
        ageRange: { min: 22, max: 28 },
        gender: 'female',
      },
      experienceLevel: 'experienced',
      budgetRange: { min: 50000, max: 200000 },
      locationPreference: 'Mumbai',
      skills: ['emotional acting', 'dance'],
      languages: ['Hindi', 'English'],
    });
    
    if (result.success && result.candidates) {
      logTest('Talent discovery', 'pass', `Found ${result.candidates.length} candidates`);
      
      // Display top candidates
      const topCandidates = result.candidates.slice(0, 3);
      topCandidates.forEach(candidate => {
        console.log(`  ${colors.cyan}→ ${candidate.name}${colors.reset}: Score ${candidate.matchScore}% (${candidate.fromDatabase ? 'Database' : 'AI'})`);
      });
      
      console.log(`  ${colors.yellow}Database matches: ${result.searchMetrics.databaseMatches}, AI matches: ${result.searchMetrics.aiMatches}${colors.reset}`);
    } else {
      logTest('Talent discovery', 'fail', 'No candidates found');
    }
    
  } catch (error: any) {
    logTest('Talent discovery', 'fail', error.message);
  }
}

async function testCommunicationGeneration() {
  logSection('Communication Agent');
  
  try {
    // Generate invitation
    const invitation = await trpc.agents.generateCommunication.mutate({
      type: 'invitation',
      recipientId: 'clr8vz5b30001d8ogd5v47zyq', // Use a real user ID from your database
      customContext: {
        auditionDate: '2024-01-15',
        auditionTime: '2:00 PM',
        location: 'Mumbai Film City, Studio 5',
      },
    });
    
    if (invitation.success && invitation.message) {
      logTest('Invitation generation', 'pass', 'Message created');
      console.log(`  ${colors.cyan}Subject:${colors.reset} ${invitation.subject}`);
      console.log(`  ${colors.cyan}Preview:${colors.reset} ${invitation.message.substring(0, 100)}...`);
    } else {
      logTest('Invitation generation', 'fail', 'No message generated');
    }
    
  } catch (error: any) {
    logTest('Communication generation', 'fail', error.message);
  }
}

async function testWorkflowExecution() {
  logSection('Complete Workflow Execution');
  
  try {
    console.log(`${colors.yellow}Starting demo workflow...${colors.reset}`);
    
    const result = await trpc.agents.executeWorkflow.mutate({
      workflowType: 'demo',
    });
    
    if (result.success && result.workflow) {
      const workflow = result.workflow;
      logTest('Workflow execution', 'pass', 
        `${workflow.summary.completedSteps}/${workflow.summary.totalSteps} steps completed`);
      
      // Display workflow results
      if (workflow.results.scriptAnalysis) {
        console.log(`  ${colors.cyan}✓ Script Analysis:${colors.reset} ${workflow.results.scriptAnalysis.characters?.length || 0} characters`);
      }
      
      if (workflow.results.talentSearchResults) {
        const totalCandidates = workflow.results.talentSearchResults.reduce(
          (sum, r) => sum + (r.candidates?.length || 0), 0
        );
        console.log(`  ${colors.cyan}✓ Talent Search:${colors.reset} ${totalCandidates} candidates found`);
      }
      
      if (workflow.performance) {
        console.log(`  ${colors.cyan}✓ Performance:${colors.reset} ${workflow.performance.totalTime}ms`);
      }
      
      if (workflow.summary.errors.length > 0) {
        console.log(`  ${colors.red}⚠ Errors:${colors.reset}`);
        workflow.summary.errors.forEach(err => {
          console.log(`    - ${err}`);
        });
      }
      
      if (workflow.summary.recommendations.length > 0) {
        console.log(`  ${colors.green}💡 Recommendations:${colors.reset}`);
        workflow.summary.recommendations.forEach(rec => {
          console.log(`    - ${rec}`);
        });
      }
    } else {
      logTest('Workflow execution', 'fail', 'Workflow failed');
    }
    
  } catch (error: any) {
    logTest('Workflow execution', 'fail', error.message);
  }
}

async function testAgentChat() {
  logSection('Agent Chat Interface');
  
  try {
    const chatResponse = await trpc.agents.chatWithAgent.mutate({
      message: 'I need help finding actors for a new web series',
      agentType: 'talent_discovery',
    });
    
    if (chatResponse.success && chatResponse.response) {
      logTest('Agent chat', 'pass', 'Chat response received');
      console.log(`  ${colors.cyan}Agent:${colors.reset} ${chatResponse.response}`);
      console.log(`  ${colors.yellow}Conversation ID:${colors.reset} ${chatResponse.conversationId}`);
    } else {
      logTest('Agent chat', 'fail', 'No response');
    }
    
  } catch (error: any) {
    logTest('Agent chat', 'fail', error.message);
  }
}

// Main test runner
async function runTests() {
  console.log(`${colors.bright}${colors.green}
╔══════════════════════════════════════════════╗
║     CastMatch Agent Integration Tests       ║
╚══════════════════════════════════════════════╝
${colors.reset}`);

  console.log(`${colors.yellow}Prerequisites:${colors.reset}`);
  console.log('1. Backend server running on port 3001');
  console.log('2. Agent server running on port 8080');
  console.log('3. Database with seeded data\n');

  let allTestsPassed = true;

  // Run tests
  const healthOk = await testAgentServerHealth();
  if (!healthOk) {
    console.log(`\n${colors.red}⚠ Agent server not available. Skipping remaining tests.${colors.reset}`);
    process.exit(1);
  }

  await testScriptAnalysis();
  await testTalentDiscovery();
  await testCommunicationGeneration();
  await testWorkflowExecution();
  await testAgentChat();

  // Summary
  console.log(`\n${colors.bright}${colors.green}━━━ Test Summary ━━━${colors.reset}`);
  if (allTestsPassed) {
    console.log(`${colors.green}✓ All tests passed successfully!${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠ Some tests failed. Check the output above for details.${colors.reset}`);
  }

  console.log(`\n${colors.cyan}Integration URLs:${colors.reset}`);
  console.log(`Backend tRPC: http://localhost:3001/api/trpc`);
  console.log(`Agent Server: http://localhost:8080`);
  console.log(`Agent Health: http://localhost:8080/health`);
  console.log(`Agent Demo: http://localhost:8080/api/demo/complete-workflow`);
}

// Run the tests
runTests().catch(error => {
  console.error(`${colors.red}Test runner failed:${colors.reset}`, error);
  process.exit(1);
});