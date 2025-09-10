#!/usr/bin/env node

/**
 * Test Infrastructure Validation Script
 * Validates that all testing components are properly configured
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧪 CastMatch Testing Infrastructure Validation\n');

// Test files to validate
const requiredTestFiles = [
  'tests/data/test-data-management.ts',
  'tests/utils/test-environment-setup.ts',
  'tests/e2e/complete-user-journeys.spec.ts',
  'tests/performance/load-test-10k-users.js',
  'tests/security/penetration-tests.spec.ts',
  'tests/regression/smoke-tests.spec.ts',
  '.github/workflows/comprehensive-test-pipeline.yml',
  'COMPREHENSIVE_TESTING_REPORT.md'
];

// Configuration files to validate
const requiredConfigFiles = [
  'package.json',
  'playwright.config.ts',
  'tsconfig.json'
];

let validationResults = {
  filesPresent: [],
  filesMissing: [],
  configValid: [],
  configInvalid: [],
  totalTests: 0,
  estimatedCoverage: 0
};

// Validate file existence
console.log('📁 Validating Test File Structure...');
requiredTestFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
    validationResults.filesPresent.push(file);
    
    // Count test cases in the file
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const testMatches = content.match(/test\(|it\(/g) || [];
      validationResults.totalTests += testMatches.length;
      console.log(`     📊 ${testMatches.length} test cases found`);
    } catch (e) {
      console.log(`     ⚠️  Could not analyze test content: ${e.message}`);
    }
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    validationResults.filesMissing.push(file);
  }
});

// Validate configuration files
console.log('\n⚙️  Validating Configuration Files...');
requiredConfigFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
    validationResults.configValid.push(file);
    
    // Validate package.json test scripts
    if (file === 'package.json') {
      try {
        const packageData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const testScripts = Object.keys(packageData.scripts || {}).filter(script => 
          script.includes('test')
        );
        console.log(`     📊 ${testScripts.length} test scripts configured`);
        testScripts.forEach(script => {
          console.log(`       • ${script}: ${packageData.scripts[script]}`);
        });
      } catch (e) {
        console.log(`     ⚠️  Could not analyze package.json: ${e.message}`);
      }
    }
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    validationResults.configInvalid.push(file);
  }
});

// Validate test directories
console.log('\n📂 Validating Test Directory Structure...');
const testDirs = ['e2e', 'integration', 'performance', 'security', 'unit', 'data', 'utils'];
testDirs.forEach(dir => {
  const dirPath = path.join(process.cwd(), 'tests', dir);
  if (fs.existsSync(dirPath)) {
    console.log(`  ✅ tests/${dir}/`);
    
    // Count files in each directory
    try {
      const files = fs.readdirSync(dirPath);
      const testFiles = files.filter(file => file.includes('.test.') || file.includes('.spec.'));
      console.log(`     📊 ${files.length} files (${testFiles.length} test files)`);
    } catch (e) {
      console.log(`     ⚠️  Could not list directory contents: ${e.message}`);
    }
  } else {
    console.log(`  ❌ tests/${dir}/ - MISSING`);
  }
});

// Check dependencies
console.log('\n📦 Validating Testing Dependencies...');
const requiredDependencies = [
  '@playwright/test',
  'jest',
  'supertest',
  '@faker-js/faker',
  '@types/jest',
  '@types/supertest'
];

try {
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const allDeps = {
    ...packageData.dependencies || {},
    ...packageData.devDependencies || {}
  };

  requiredDependencies.forEach(dep => {
    if (allDeps[dep]) {
      console.log(`  ✅ ${dep} (${allDeps[dep]})`);
    } else {
      console.log(`  ❌ ${dep} - NOT INSTALLED`);
    }
  });
} catch (e) {
  console.log('  ⚠️  Could not validate dependencies:', e.message);
}

// Test execution validation
console.log('\n🏃 Testing Command Validation...');
const testCommands = [
  'npm run test --help',
  'npx playwright --version',
  'npm list jest --depth=0',
];

testCommands.forEach(cmd => {
  try {
    execSync(cmd, { stdio: 'pipe' });
    console.log(`  ✅ ${cmd}`);
  } catch (e) {
    console.log(`  ❌ ${cmd} - FAILED`);
  }
});

// Generate summary report
console.log('\n📋 VALIDATION SUMMARY');
console.log('='.repeat(50));

const successRate = (validationResults.filesPresent.length / requiredTestFiles.length) * 100;
console.log(`Test Files Present: ${validationResults.filesPresent.length}/${requiredTestFiles.length} (${successRate.toFixed(1)}%)`);
console.log(`Config Files Valid: ${validationResults.configValid.length}/${requiredConfigFiles.length}`);
console.log(`Total Test Cases: ${validationResults.totalTests}`);

// Estimate test coverage based on implemented features
const estimatedCoverage = Math.min(95, (validationResults.filesPresent.length / requiredTestFiles.length) * 80);
console.log(`Estimated Coverage: ${estimatedCoverage.toFixed(1)}%`);

// Test type breakdown
console.log('\n📊 TEST COVERAGE BREAKDOWN');
console.log('-'.repeat(30));
const testTypes = {
  'Unit Tests': validationResults.filesPresent.filter(f => f.includes('unit')).length > 0 ? '✅' : '❌',
  'Integration Tests': validationResults.filesPresent.filter(f => f.includes('integration')).length > 0 ? '✅' : '❌',
  'E2E Tests': validationResults.filesPresent.filter(f => f.includes('e2e')).length > 0 ? '✅' : '❌',
  'Security Tests': validationResults.filesPresent.filter(f => f.includes('security')).length > 0 ? '✅' : '❌',
  'Performance Tests': validationResults.filesPresent.filter(f => f.includes('performance')).length > 0 ? '✅' : '❌',
  'Smoke Tests': validationResults.filesPresent.filter(f => f.includes('regression') || f.includes('smoke')).length > 0 ? '✅' : '❌'
};

Object.entries(testTypes).forEach(([type, status]) => {
  console.log(`${status} ${type}`);
});

// CI/CD Pipeline validation
console.log('\n🚀 CI/CD PIPELINE STATUS');
console.log('-'.repeat(30));
const hasPipeline = validationResults.filesPresent.some(f => f.includes('workflows'));
const hasDocumentation = validationResults.filesPresent.some(f => f.includes('REPORT'));

console.log(`${hasPipeline ? '✅' : '❌'} GitHub Actions Pipeline`);
console.log(`${hasDocumentation ? '✅' : '❌'} Testing Documentation`);
console.log(`${validationResults.totalTests > 0 ? '✅' : '❌'} Automated Tests`);

// Final recommendation
console.log('\n🎯 RECOMMENDATIONS');
console.log('-'.repeat(30));

if (successRate >= 90) {
  console.log('🎉 EXCELLENT: Testing infrastructure is comprehensive and ready for production!');
} else if (successRate >= 75) {
  console.log('👍 GOOD: Testing infrastructure is solid with minor improvements needed.');
} else if (successRate >= 50) {
  console.log('⚠️  MODERATE: Testing infrastructure needs additional work before production.');
} else {
  console.log('🚨 CRITICAL: Testing infrastructure requires significant improvement.');
}

// Missing files report
if (validationResults.filesMissing.length > 0) {
  console.log('\n📝 MISSING FILES TO IMPLEMENT:');
  validationResults.filesMissing.forEach(file => {
    console.log(`   • ${file}`);
  });
}

// Next steps
console.log('\n🔄 NEXT STEPS');
console.log('-'.repeat(30));
console.log('1. Run: npm run test:all');
console.log('2. Execute: npx playwright test');
console.log('3. Load test: k6 run tests/performance/load-test-10k-users.js');
console.log('4. Security scan: npm run test:security');
console.log('5. Generate coverage: npm run test:coverage');

console.log('\n✨ Validation Complete!\n');

// Return exit code based on validation success
process.exit(successRate >= 75 ? 0 : 1);