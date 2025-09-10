#!/usr/bin/env ts-node

/**
 * Comprehensive Test Runner
 * Orchestrates all testing phases with detailed reporting
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { TestReporter, CoverageAnalyzer, testReporter } from '../tests/utils/test-reports';
import { setupTestEnvironment, cleanupTestEnvironment } from '../tests/setup/test-environment';

interface TestPhase {
  name: string;
  command: string;
  description: string;
  required: boolean;
  timeout: number;
}

class ComprehensiveTestRunner {
  private phases: TestPhase[] = [
    {
      name: 'lint',
      command: 'npm run lint',
      description: 'Code linting and style checks',
      required: true,
      timeout: 30000
    },
    {
      name: 'unit',
      command: 'npm run test:unit',
      description: 'Unit tests with high coverage',
      required: true,
      timeout: 120000
    },
    {
      name: 'integration',
      command: 'npm run test:integration',
      description: 'Integration tests for API endpoints',
      required: true,
      timeout: 180000
    },
    {
      name: 'security',
      command: 'npm run test:security',
      description: 'Security vulnerability tests',
      required: true,
      timeout: 120000
    },
    {
      name: 'performance',
      command: 'npm run test:performance',
      description: 'Performance and load tests',
      required: false,
      timeout: 300000
    },
    {
      name: 'e2e',
      command: 'npm run test:e2e',
      description: 'End-to-end workflow tests',
      required: true,
      timeout: 600000
    }
  ];

  private results: Array<{
    phase: string;
    success: boolean;
    duration: number;
    error?: string;
    coverage?: any;
  }> = [];

  public async run(options: {
    phases?: string[];
    skipOptional?: boolean;
    generateReport?: boolean;
    uploadResults?: boolean;
  } = {}): Promise<void> {
    console.log('\n🚀 Starting Comprehensive Test Suite for CastMatch\n');
    
    const startTime = Date.now();
    testReporter.startSession();

    try {
      // Setup test environment
      console.log('📦 Setting up test environment...');
      await setupTestEnvironment();
      
      // Filter phases to run
      const phasesToRun = this.getPhases(options);
      
      console.log(`📋 Running ${phasesToRun.length} test phases:\n`);
      phasesToRun.forEach((phase, index) => {
        console.log(`  ${index + 1}. ${phase.name}: ${phase.description}`);
      });
      console.log('');

      // Run each phase
      for (const phase of phasesToRun) {
        await this.runPhase(phase);
      }

      // Generate reports
      if (options.generateReport !== false) {
        await this.generateReports(options);
      }

      const totalTime = Date.now() - startTime;
      const successfulPhases = this.results.filter(r => r.success).length;
      const failedPhases = this.results.filter(r => !r.success).length;

      console.log('\n' + '='.repeat(60));
      console.log('📊 COMPREHENSIVE TEST RESULTS');
      console.log('='.repeat(60));
      console.log(`✅ Successful phases: ${successfulPhases}`);
      console.log(`❌ Failed phases: ${failedPhases}`);
      console.log(`⏱️  Total duration: ${(totalTime / 1000 / 60).toFixed(1)} minutes`);
      console.log('='.repeat(60));

      if (failedPhases > 0) {
        console.log('\n❌ Some test phases failed:');
        this.results
          .filter(r => !r.success)
          .forEach(result => {
            console.log(`  • ${result.phase}: ${result.error || 'Unknown error'}`);
          });
        
        process.exit(1);
      } else {
        console.log('\n🎉 All test phases completed successfully!');
      }

    } catch (error) {
      console.error('\n💥 Test runner failed:', error);
      process.exit(1);
    } finally {
      testReporter.endSession();
      
      // Cleanup
      try {
        await cleanupTestEnvironment();
      } catch (cleanupError) {
        console.warn('⚠️  Warning: Cleanup failed:', cleanupError);
      }
    }
  }

  private getPhases(options: any): TestPhase[] {
    let phases = this.phases;

    // Filter by specific phases if requested
    if (options.phases && options.phases.length > 0) {
      phases = phases.filter(p => options.phases.includes(p.name));
    }

    // Skip optional phases if requested
    if (options.skipOptional) {
      phases = phases.filter(p => p.required);
    }

    return phases;
  }

  private async runPhase(phase: TestPhase): Promise<void> {
    console.log(`\n🧪 Running ${phase.name} tests...`);
    console.log(`   ${phase.description}`);
    
    const startTime = Date.now();
    
    try {
      // Set environment variables for the test phase
      const env = {
        ...process.env,
        NODE_ENV: 'test',
        TEST_PHASE: phase.name.toUpperCase(),
        CI: process.env.CI || 'false'
      };

      // Run the test command
      const output = execSync(phase.command, {
        encoding: 'utf-8',
        timeout: phase.timeout,
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const duration = Date.now() - startTime;
      
      this.results.push({
        phase: phase.name,
        success: true,
        duration
      });

      console.log(`   ✅ ${phase.name} completed in ${(duration / 1000).toFixed(1)}s`);
      
      // Parse coverage from output if available
      const coverageMatch = output.match(/All files[|\s]*(\d+\.?\d*)/);
      if (coverageMatch) {
        console.log(`   📊 Coverage: ${coverageMatch[1]}%`);
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.results.push({
        phase: phase.name,
        success: false,
        duration,
        error: errorMessage
      });

      console.log(`   ❌ ${phase.name} failed after ${(duration / 1000).toFixed(1)}s`);
      
      if (phase.required) {
        console.log(`   💥 Required phase failed: ${errorMessage}`);
        // Continue to run other phases for complete reporting
      } else {
        console.log(`   ⚠️  Optional phase failed: ${errorMessage}`);
      }
    }
  }

  private async generateReports(options: any): Promise<void> {
    console.log('\n📊 Generating test reports...');

    try {
      // Generate HTML report
      const htmlReport = await testReporter.generateHTMLReport();
      console.log(`   📄 HTML report: ${htmlReport}`);

      // Generate JSON report
      const jsonReport = await testReporter.generateJSONReport();
      console.log(`   📄 JSON report: ${jsonReport}`);

      // Generate coverage report
      try {
        const coverageReport = await CoverageAnalyzer.generateCoverageReport();
        console.log(`   📄 Coverage report: ${coverageReport}`);
      } catch (coverageError) {
        console.warn('   ⚠️  Could not generate coverage report:', coverageError.message);
      }

      // Generate Slack notification if webhook is provided
      if (process.env.SLACK_WEBHOOK_URL) {
        await testReporter.sendToSlack(process.env.SLACK_WEBHOOK_URL);
        console.log('   📱 Slack notification sent');
      }

      // Upload results if requested (to S3, GitHub, etc.)
      if (options.uploadResults && process.env.UPLOAD_ENDPOINT) {
        await this.uploadResults();
      }

    } catch (reportError) {
      console.warn('⚠️  Report generation failed:', reportError);
    }
  }

  private async uploadResults(): Promise<void> {
    // This would upload results to cloud storage or CI system
    console.log('   ☁️  Uploading results to cloud storage...');
    
    try {
      const reportData = {
        timestamp: new Date().toISOString(),
        results: this.results,
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          ci: process.env.CI === 'true'
        }
      };

      // In a real implementation, this would upload to S3, GCS, or similar
      const uploadPath = path.join(process.cwd(), 'temp', 'test-results-upload.json');
      await fs.mkdir(path.dirname(uploadPath), { recursive: true });
      await fs.writeFile(uploadPath, JSON.stringify(reportData, null, 2));
      
      console.log(`   ☁️  Results prepared for upload: ${uploadPath}`);
    } catch (uploadError) {
      console.warn('   ⚠️  Upload failed:', uploadError);
    }
  }

  public async runSingle(phaseName: string): Promise<void> {
    const phase = this.phases.find(p => p.name === phaseName);
    if (!phase) {
      throw new Error(`Unknown test phase: ${phaseName}`);
    }

    await this.run({
      phases: [phaseName],
      generateReport: false
    });
  }

  public async runContinuous(): Promise<void> {
    console.log('🔄 Starting continuous testing mode...');
    console.log('Press Ctrl+C to stop\n');

    const runTests = async () => {
      try {
        await this.run({
          skipOptional: true,
          generateReport: false
        });
        console.log('\n⏰ Waiting 30 seconds before next run...\n');
      } catch (error) {
        console.error('Test run failed:', error);
      }
    };

    // Run tests immediately
    await runTests();

    // Then run every 30 seconds
    const interval = setInterval(runTests, 30000);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n👋 Stopping continuous testing...');
      clearInterval(interval);
      process.exit(0);
    });
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const runner = new ComprehensiveTestRunner();

  try {
    if (args.includes('--help') || args.includes('-h')) {
      printHelp();
      return;
    }

    if (args.includes('--continuous')) {
      await runner.runContinuous();
      return;
    }

    const phases = args.filter(arg => !arg.startsWith('--'));
    const options = {
      phases: phases.length > 0 ? phases : undefined,
      skipOptional: args.includes('--skip-optional'),
      generateReport: !args.includes('--no-report'),
      uploadResults: args.includes('--upload')
    };

    await runner.run(options);

  } catch (error) {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
🎭 CastMatch Comprehensive Test Runner

Usage:
  npm run test:comprehensive [phases...] [options]

Phases:
  lint          - Code linting and style checks
  unit          - Unit tests with high coverage
  integration   - Integration tests for API endpoints  
  security      - Security vulnerability tests
  performance   - Performance and load tests (optional)
  e2e           - End-to-end workflow tests

Options:
  --skip-optional   Skip optional test phases
  --no-report      Skip report generation
  --upload         Upload results to cloud storage
  --continuous     Run tests continuously
  --help, -h       Show this help message

Examples:
  npm run test:comprehensive
  npm run test:comprehensive unit integration
  npm run test:comprehensive --skip-optional
  npm run test:comprehensive --continuous
  
Environment Variables:
  SLACK_WEBHOOK_URL    - Send results to Slack
  UPLOAD_ENDPOINT      - Upload results endpoint
  TEST_DATABASE_URL    - Test database connection
  REDIS_TEST_DB        - Redis test database number
`);
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

export { ComprehensiveTestRunner };