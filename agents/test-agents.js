#!/usr/bin/env node

/**
 * CastMatch Agents Testing Script
 * Tests all core agents and demonstrates their functionality
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';

const API_BASE = 'http://localhost:8080/api';
const DEMO_SCRIPT = `
FADE IN:

EXT. MUMBAI STREET - DAY

ARJUN SHARMA (28), a fearless investigative journalist with sharp eyes and determined expression, hurries through the crowded lanes of Mumbai. His phone buzzes.

ARJUN
(answering urgently)
Priya, I have the documents. This corruption case goes deeper than we thought.

INT. TECH STARTUP OFFICE - DAY

PRIYA PATEL (25), a brilliant cyber security expert with short hair and confident demeanor, types rapidly on multiple screens. Code scrolls across monitors.

PRIYA
(worried)
Arjun, they've traced my hack. We need to meet immediately.

EXT. MARINE DRIVE - SUNSET

Arjun and Priya meet at a secluded spot overlooking the ocean.

ARJUN
(intense)
The minister's entire network is involved. If we publish this story, we'll expose corruption worth 500 crores.

PRIYA
(determined)
Then we publish. The people deserve to know the truth.

In the background, a BLACK SUV parks nearby. Two SHADOWY FIGURES step out.

ARJUN
(noticing)
We're not alone.

They start running as the camera pulls back to show the chase beginning.

FADE OUT.
`;

class AgentTester {
  constructor() {
    this.results = {
      tests: [],
      passed: 0,
      failed: 0,
      totalTime: 0,
    };
  }

  async runAllTests() {
    console.log('🎬 Starting CastMatch Agents Testing Suite\n');
    console.log('=' .repeat(60));

    const tests = [
      { name: 'Health Check', fn: () => this.testHealthCheck() },
      { name: 'Script Analysis', fn: () => this.testScriptAnalysis() },
      { name: 'Talent Discovery', fn: () => this.testTalentDiscovery() },
      { name: 'Application Screening', fn: () => this.testApplicationScreening() },
      { name: 'Audition Scheduling', fn: () => this.testAuditionScheduling() },
      { name: 'Script to Shortlist Workflow', fn: () => this.testScriptToShortlist() },
      { name: 'Complete Workflow Demo', fn: () => this.testCompleteWorkflow() },
    ];

    const startTime = Date.now();

    for (const test of tests) {
      await this.runTest(test.name, test.fn);
    }

    this.results.totalTime = Date.now() - startTime;
    this.printSummary();
  }

  async runTest(name, testFn) {
    console.log(`\n📋 Testing: ${name}`);
    console.log('-'.repeat(40));

    const testStartTime = Date.now();
    
    try {
      const result = await testFn();
      const duration = Date.now() - testStartTime;
      
      this.results.tests.push({
        name,
        status: 'PASSED',
        duration,
        result,
      });
      
      this.results.passed++;
      console.log(`✅ ${name} - PASSED (${duration}ms)`);
      
      if (result && typeof result === 'object') {
        console.log(`   📊 Result: ${JSON.stringify(this.summarizeResult(result), null, 2)}`);
      }
      
    } catch (error) {
      const duration = Date.now() - testStartTime;
      
      this.results.tests.push({
        name,
        status: 'FAILED',
        duration,
        error: error.message,
      });
      
      this.results.failed++;
      console.log(`❌ ${name} - FAILED (${duration}ms)`);
      console.log(`   💥 Error: ${error.message}`);
    }
  }

  async testHealthCheck() {
    const response = await fetch(`${API_BASE}/../health`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }
    
    if (data.status !== 'healthy') {
      throw new Error('Service not healthy');
    }
    
    return { status: data.status, agents: Object.keys(data.agents).length };
  }

  async testScriptAnalysis() {
    const requestData = {
      scriptContent: Buffer.from(DEMO_SCRIPT).toString('base64'),
      fileType: 'txt',
      projectContext: {
        type: 'web-series',
        genre: ['thriller', 'drama'],
        budgetTier: 'medium',
      },
    };

    const response = await fetch(`${API_BASE}/agents/script-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Script analysis failed');
    }

    if (!data.data.characters || data.data.characters.length === 0) {
      throw new Error('No characters extracted from script');
    }

    return {
      charactersFound: data.data.characters.length,
      genres: data.data.genres.length,
      budgetEstimate: data.data.budgetEstimate.castingCost,
    };
  }

  async testTalentDiscovery() {
    const searchParams = {
      roleDescription: 'Investigative journalist, male, 25-35 years old, confident and determined',
      physicalRequirements: {
        ageRange: { min: 25, max: 35 },
        gender: 'male',
        height: 'medium',
        build: 'athletic',
      },
      experienceLevel: 'experienced',
      budgetRange: { min: 20000, max: 100000 },
      locationPreference: 'Mumbai',
      availabilityWindow: {
        start: new Date().toISOString(),
        end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      },
      specialSkills: ['acting', 'dialogue_delivery'],
      languages: ['Hindi', 'English'],
    };

    const response = await fetch(`${API_BASE}/agents/talent-discovery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchParams),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Talent discovery failed');
    }

    return {
      candidatesFound: data.data.candidates?.length || 0,
      searchTime: data.data.searchMetrics?.searchTime || 0,
      filtersApplied: data.data.searchMetrics?.filters?.length || 0,
    };
  }

  async testApplicationScreening() {
    // Mock application data
    const mockApplications = [
      {
        id: 'app_001',
        talentId: 'talent_001',
        roleId: 'role_001',
        projectId: 'test_project',
        submittedAt: new Date().toISOString(),
        talentProfile: {
          id: 'talent_001',
          personalInfo: {
            name: 'Arjun Kumar',
            age: 28,
            gender: 'male',
            location: 'Mumbai',
            contact: { email: 'arjun@example.com', phone: '+91 9876543210' },
          },
          physicalAttributes: {
            height: '5\'10"',
            weight: '70kg',
            eyeColor: 'Brown',
            hairColor: 'Black',
            build: 'Athletic',
          },
          professional: {
            experience: ['TV serials', 'Web series', 'Theatre'],
            skills: ['Method acting', 'Dialogue delivery', 'Fight sequences'],
            training: ['NSD Delhi', 'Lee Strasberg Theatre'],
            rates: { dailyRate: 25000, currency: 'INR' },
          },
          portfolio: {
            headshots: ['headshot1.jpg'],
            reels: ['reel1.mp4'],
            resumeUrl: 'resume.pdf',
          },
          availability: {
            isAvailable: true,
            blackoutDates: [],
            preferredLocations: ['Mumbai'],
          },
        },
        applicationMaterials: {
          coverLetter: 'I am very interested in playing the role of investigative journalist.',
        },
        status: 'submitted',
      },
    ];

    const roleRequirement = {
      id: 'role_001',
      characterName: 'Arjun Sharma',
      description: 'Investigative journalist, fearless and determined',
      importance: 'lead',
      ageRange: { min: 25, max: 35 },
      gender: 'male',
      skills: ['acting', 'dialogue_delivery'],
      experience: 'experienced',
      budgetRange: { min: 20000, max: 50000 },
      availability: {
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        location: 'Mumbai',
      },
    };

    const requestData = {
      applications: mockApplications,
      roleRequirement,
      screeningCriteria: {
        minimumScore: 70,
        autoRejectThreshold: 40,
        priorityFactors: ['experience', 'skills', 'physical_fit'],
        batchSize: 10,
      },
    };

    const response = await fetch(`${API_BASE}/agents/application-screening`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Application screening failed');
    }

    return {
      applicationsProcessed: data.data.summary.totalProcessed,
      shortlisted: data.data.summary.shortlisted,
      avgScore: data.data.summary.avgScore,
      processingTime: data.data.summary.processingTime,
    };
  }

  async testAuditionScheduling() {
    const schedulingRequest = {
      projectId: 'test_project',
      roleId: 'role_001',
      candidates: ['talent_001', 'talent_002', 'talent_003'],
      preferences: {
        dateRange: {
          start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        timeSlots: [
          { start: '09:00', end: '17:00' },
        ],
        duration: 30,
        bufferTime: 15,
        location: 'CastMatch Studios, Mumbai',
        auditionType: 'in-person',
      },
      constraints: {
        maxAuditionsPerDay: 8,
        priorityCandidates: ['talent_001'],
      },
    };

    const response = await fetch(`${API_BASE}/agents/audition-scheduling`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schedulingRequest),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Audition scheduling failed');
    }

    return {
      auditionsScheduled: data.data.scheduledAuditions?.length || 0,
      conflicts: data.data.conflicts?.length || 0,
      suggestions: data.data.suggestions?.length || 0,
    };
  }

  async testScriptToShortlist() {
    const requestData = {
      scriptFile: Buffer.from(DEMO_SCRIPT).toString('base64'),
      fileType: 'txt',
      projectContext: {
        type: 'web-series',
        genre: ['thriller', 'drama'],
        budgetTier: 'medium',
      },
      maxCandidatesPerRole: 5,
    };

    const response = await fetch(`${API_BASE}/agents/script-to-shortlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Script to shortlist workflow failed');
    }

    return {
      rolesProcessed: data.data.shortlists?.length || 0,
      totalCandidates: data.data.shortlists?.reduce((sum, role) => sum + role.candidates.length, 0) || 0,
      charactersFound: data.data.scriptAnalysis?.characters?.length || 0,
    };
  }

  async testCompleteWorkflow() {
    console.log('   🚀 Running complete workflow demo...');
    
    const response = await fetch(`${API_BASE}/demo/complete-workflow`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Complete workflow demo failed');
    }

    return {
      status: data.data.status,
      duration: data.data.timeline.duration,
      stepsCompleted: data.data.summary.completedSteps,
      charactersFound: data.performance.charactersFound,
      recommendationsGenerated: data.performance.recommendationsGenerated,
    };
  }

  summarizeResult(result) {
    if (typeof result !== 'object') return result;
    
    const summary = {};
    for (const [key, value] of Object.entries(result)) {
      if (typeof value === 'number') {
        summary[key] = value;
      } else if (typeof value === 'string' && value.length < 50) {
        summary[key] = value;
      } else if (Array.isArray(value)) {
        summary[key] = `${value.length} items`;
      }
    }
    return summary;
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('🏆 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`✅ Tests Passed: ${this.results.passed}`);
    console.log(`❌ Tests Failed: ${this.results.failed}`);
    console.log(`⏱️  Total Time: ${this.results.totalTime}ms`);
    console.log(`📊 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);
    
    console.log('\n📋 Detailed Results:');
    this.results.tests.forEach(test => {
      const status = test.status === 'PASSED' ? '✅' : '❌';
      console.log(`   ${status} ${test.name} (${test.duration}ms)`);
      if (test.error) {
        console.log(`      💥 ${test.error}`);
      }
    });

    if (this.results.failed === 0) {
      console.log('\n🎉 All tests passed! CastMatch Agents are ready for production.');
      console.log('\n🚀 Quick Start:');
      console.log('   1. Start the server: npm start');
      console.log('   2. Try the demo: http://localhost:8080/api/demo/complete-workflow');
      console.log('   3. Check status: http://localhost:8080/api/agents/status');
    } else {
      console.log('\n⚠️  Some tests failed. Please check the errors above.');
    }

    console.log('\n' + '='.repeat(60));
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new AgentTester();
  
  // Check if server is running
  try {
    await fetch(`${API_BASE}/../health`);
    console.log('🔗 Server detected, running tests...\n');
    await tester.runAllTests();
  } catch (error) {
    console.log('❌ Server not running. Please start the server first:');
    console.log('   npm start\n');
    console.log('Then run the tests again:');
    console.log('   node test-agents.js\n');
    process.exit(1);
  }
}

export { AgentTester };