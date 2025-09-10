/**
 * Screenshot Validation Script
 * Validates captured screenshots for quality and attribution
 */

const fs = require('fs').promises;
const path = require('path');

// Validation thresholds
const THRESHOLDS = {
  minFileSize: 50 * 1024,      // 50KB minimum
  maxFileSize: 5 * 1024 * 1024, // 5MB maximum
  minWidth: 800,
  minHeight: 600,
  requiredMetadataFields: ['profile', 'shotUrl', 'captureTime', 'qualityChecks']
};

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// Helper functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function getFileSize(filePath) {
  const stats = await fs.stat(filePath);
  return stats.size;
}

async function validateFile(filePath, profileName) {
  const results = {
    path: filePath,
    valid: true,
    issues: [],
    warnings: []
  };
  
  const filename = path.basename(filePath);
  
  try {
    // Check 1: File exists and is accessible
    await fs.access(filePath);
    
    // Check 2: File size
    const fileSize = await getFileSize(filePath);
    if (fileSize < THRESHOLDS.minFileSize) {
      results.issues.push(`File too small: ${(fileSize / 1024).toFixed(1)}KB`);
      results.valid = false;
    } else if (fileSize > THRESHOLDS.maxFileSize) {
      results.warnings.push(`File very large: ${(fileSize / 1024 / 1024).toFixed(1)}MB`);
    }
    
    // Check 3: Filename format
    const filenamePattern = new RegExp(`^${profileName}_\\d{3}_\\d{6}_[a-z0-9-]+\\.png$`);
    if (!filenamePattern.test(filename)) {
      results.warnings.push('Filename doesn\'t match expected pattern');
    }
    
    // Check 4: Profile name in filename
    if (!filename.includes(profileName)) {
      results.issues.push(`Profile name '${profileName}' not in filename`);
      results.valid = false;
    }
    
  } catch (error) {
    results.issues.push(`File access error: ${error.message}`);
    results.valid = false;
  }
  
  return results;
}

async function validateMetadata(metadataPath) {
  const results = {
    path: metadataPath,
    valid: true,
    issues: [],
    stats: {}
  };
  
  try {
    const content = await fs.readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(content);
    
    // Check required fields
    for (const field of THRESHOLDS.requiredMetadataFields) {
      if (!(field in metadata)) {
        results.issues.push(`Missing required field: ${field}`);
        results.valid = false;
      }
    }
    
    // Extract statistics
    if (metadata.captures && Array.isArray(metadata.captures)) {
      results.stats = {
        totalCaptures: metadata.captures.length,
        successRate: metadata.successfulCaptures / metadata.totalShots * 100,
        averageAttempts: metadata.averageAttempts || 1
      };
      
      // Check quality metrics
      const failedQualityChecks = metadata.captures.filter(c => {
        if (!c.qualityCheck || !c.qualityCheck.checks) return true;
        const checks = c.qualityCheck.checks;
        return !checks.imagesLoaded || !checks.noLoaders || !checks.contentVisible;
      });
      
      if (failedQualityChecks.length > 0) {
        results.issues.push(`${failedQualityChecks.length} captures failed quality checks`);
      }
    }
    
  } catch (error) {
    results.issues.push(`Metadata parse error: ${error.message}`);
    results.valid = false;
  }
  
  return results;
}

async function validateDirectory(dirPath) {
  const results = {
    directory: dirPath,
    totalFiles: 0,
    validFiles: 0,
    invalidFiles: 0,
    warnings: 0,
    fileResults: [],
    metadataResults: []
  };
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    // Extract profile name from directory path
    const profileName = path.basename(path.dirname(dirPath));
    
    // Process image files
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.png')) {
        results.totalFiles++;
        const filePath = path.join(dirPath, entry.name);
        const validation = await validateFile(filePath, profileName);
        
        results.fileResults.push(validation);
        
        if (validation.valid) {
          results.validFiles++;
        } else {
          results.invalidFiles++;
        }
        
        if (validation.warnings.length > 0) {
          results.warnings += validation.warnings.length;
        }
      }
    }
    
    // Check for metadata files
    const metadataDir = path.join(path.dirname(path.dirname(dirPath)), '_metadata');
    try {
      const metadataFiles = await fs.readdir(metadataDir);
      const relevantMetadata = metadataFiles.filter(f => 
        f.includes(profileName) && f.endsWith('.json')
      );
      
      for (const metaFile of relevantMetadata) {
        const metaPath = path.join(metadataDir, metaFile);
        const metaValidation = await validateMetadata(metaPath);
        results.metadataResults.push(metaValidation);
      }
    } catch (error) {
      // Metadata directory might not exist
    }
    
  } catch (error) {
    log(`Error reading directory: ${error.message}`, 'red');
  }
  
  return results;
}

function generateReport(results) {
  console.log('\n' + '='.repeat(60));
  log('SCREENSHOT VALIDATION REPORT', 'bright');
  console.log('='.repeat(60));
  
  console.log(`\nDirectory: ${results.directory}`);
  console.log(`Date: ${new Date().toISOString()}\n`);
  
  // Summary statistics
  log('SUMMARY', 'blue');
  console.log('-'.repeat(40));
  console.log(`Total Screenshots: ${results.totalFiles}`);
  console.log(`Valid: ${results.validFiles} (${(results.validFiles / results.totalFiles * 100).toFixed(1)}%)`);
  console.log(`Invalid: ${results.invalidFiles} (${(results.invalidFiles / results.totalFiles * 100).toFixed(1)}%)`);
  console.log(`Warnings: ${results.warnings}`);
  
  // Success rate evaluation
  const successRate = results.validFiles / results.totalFiles * 100;
  console.log('\nQuality Assessment:');
  if (successRate >= 95) {
    log('✅ EXCEPTIONAL - Success rate >= 95%', 'green');
  } else if (successRate >= 90) {
    log('✅ TARGET MET - Success rate >= 90%', 'green');
  } else if (successRate >= 70) {
    log('⚠️  MINIMUM MET - Success rate >= 70%', 'yellow');
  } else {
    log('❌ BELOW MINIMUM - Success rate < 70%', 'red');
  }
  
  // Invalid files details
  if (results.invalidFiles > 0) {
    console.log('\n');
    log('INVALID FILES', 'red');
    console.log('-'.repeat(40));
    
    results.fileResults.filter(r => !r.valid).forEach(result => {
      console.log(`\n❌ ${path.basename(result.path)}`);
      result.issues.forEach(issue => {
        console.log(`   - ${issue}`);
      });
    });
  }
  
  // Warnings
  const filesWithWarnings = results.fileResults.filter(r => r.warnings.length > 0);
  if (filesWithWarnings.length > 0) {
    console.log('\n');
    log('WARNINGS', 'yellow');
    console.log('-'.repeat(40));
    
    filesWithWarnings.forEach(result => {
      console.log(`\n⚠️  ${path.basename(result.path)}`);
      result.warnings.forEach(warning => {
        console.log(`   - ${warning}`);
      });
    });
  }
  
  // Metadata analysis
  if (results.metadataResults.length > 0) {
    console.log('\n');
    log('METADATA ANALYSIS', 'blue');
    console.log('-'.repeat(40));
    
    results.metadataResults.forEach(meta => {
      console.log(`\n📊 ${path.basename(meta.path)}`);
      if (meta.valid) {
        if (meta.stats.totalCaptures) {
          console.log(`   Success Rate: ${meta.stats.successRate.toFixed(1)}%`);
          console.log(`   Average Attempts: ${meta.stats.averageAttempts.toFixed(1)}`);
        }
      } else {
        meta.issues.forEach(issue => {
          console.log(`   ❌ ${issue}`);
        });
      }
    });
  }
  
  // Recommendations
  console.log('\n');
  log('RECOMMENDATIONS', 'blue');
  console.log('-'.repeat(40));
  
  if (results.invalidFiles > 0) {
    console.log('• Review and re-capture invalid screenshots');
    console.log('• Check wait times in capture script');
    console.log('• Verify profile ownership validation is working');
  }
  
  if (results.warnings > 5) {
    console.log('• Review filename generation logic');
    console.log('• Check for consistency in capture process');
  }
  
  if (successRate < 90) {
    console.log('• Increase wait times for page loading');
    console.log('• Add more robust quality checks');
    console.log('• Consider reducing capture batch size');
  }
  
  if (successRate >= 95) {
    console.log('• Excellent capture quality! Process is working well.');
    console.log('• Consider documenting current settings as baseline.');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('END OF REPORT');
  console.log('='.repeat(60) + '\n');
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    log('Usage: node validate-screenshots.js <directory_path>', 'yellow');
    log('Example: node validate-screenshots.js screenshots/glebich/2025-01-13/', 'yellow');
    process.exit(1);
  }
  
  const targetDir = path.resolve(args[0]);
  
  try {
    await fs.access(targetDir);
  } catch (error) {
    log(`Error: Directory not found: ${targetDir}`, 'red');
    process.exit(1);
  }
  
  log('Starting screenshot validation...', 'blue');
  
  const results = await validateDirectory(targetDir);
  generateReport(results);
  
  // Exit with appropriate code
  const successRate = results.validFiles / results.totalFiles * 100;
  if (successRate < 70) {
    process.exit(1); // Failure
  }
  process.exit(0); // Success
}

if (require.main === module) {
  main().catch(error => {
    log(`Fatal error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = {
  validateFile,
  validateMetadata,
  validateDirectory
};