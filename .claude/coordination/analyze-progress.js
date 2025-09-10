#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Base path for the project
const PROJECT_ROOT = '/Users/Aditya/Desktop/casting-ai';

// Function to count files accurately
function countFiles(dir, patterns, excludeDirs = ['node_modules', '.git', 'dist', 'build']) {
    try {
        const excludeArgs = excludeDirs.map(d => `-path "*/${d}" -prune -o`).join(' ');
        const patternArgs = patterns.map(p => `-name "${p}"`).join(' -o ');
        const cmd = `find ${path.join(PROJECT_ROOT, dir)} ${excludeArgs} -type f \\( ${patternArgs} \\) -print 2>/dev/null | wc -l`;
        const result = execSync(cmd, { encoding: 'utf-8' });
        return parseInt(result.trim()) || 0;
    } catch (e) {
        console.error(`Error counting files in ${dir}:`, e.message);
        return 0;
    }
}

// Function to check if specific files exist
function checkFilesExist(files) {
    return files.map(file => {
        const fullPath = path.join(PROJECT_ROOT, file);
        return {
            path: file,
            exists: fs.existsSync(fullPath),
            size: fs.existsSync(fullPath) ? fs.statSync(fullPath).size : 0
        };
    });
}

// Function to check service status
function checkServiceStatus(port, serviceName) {
    try {
        const result = execSync(`lsof -i :${port} 2>/dev/null | grep LISTEN`, { encoding: 'utf-8' });
        const isRunning = result.length > 0;
        
        // Try to get more info if running
        let health = 'unknown';
        if (isRunning) {
            try {
                // Attempt health check for known services
                if (port === 5002) {
                    execSync(`curl -s http://localhost:${port}/health`, { timeout: 2000 });
                    health = 'healthy';
                } else if (port === 3000 || port === 3001) {
                    execSync(`curl -s http://localhost:${port}`, { timeout: 2000 });
                    health = 'healthy';
                }
            } catch (e) {
                health = 'running';
            }
        }
        
        return {
            port,
            name: serviceName,
            running: isRunning,
            health
        };
    } catch (e) {
        return {
            port,
            name: serviceName,
            running: false,
            health: 'stopped'
        };
    }
}

// Function to analyze API routes
function analyzeAPIRoutes() {
    const routeFiles = [
        'src/routes/talent-direct.routes.ts',
        'src/api/routes/aiRoutes.ts',
        'src/api/routes/auth.routes.ts',
        'src/api/routes/conversation.routes.ts',
        'src/routes/chat.routes.ts',
        'src/routes/audition.routes.ts',
        'src/routes/social-auth.routes.ts',
        'src/routes/talent-simple.routes.ts'
    ];
    
    const routes = routeFiles.map(file => {
        const fullPath = path.join(PROJECT_ROOT, file);
        const exists = fs.existsSync(fullPath);
        let endpointCount = 0;
        
        if (exists) {
            try {
                const content = fs.readFileSync(fullPath, 'utf-8');
                // Count route definitions
                const getRoutes = (content.match(/\.get\(/g) || []).length;
                const postRoutes = (content.match(/\.post\(/g) || []).length;
                const putRoutes = (content.match(/\.put\(/g) || []).length;
                const deleteRoutes = (content.match(/\.delete\(/g) || []).length;
                endpointCount = getRoutes + postRoutes + putRoutes + deleteRoutes;
            } catch (e) {
                // Ignore read errors
            }
        }
        
        return {
            file: file.split('/').pop(),
            exists,
            endpoints: endpointCount
        };
    });
    
    return {
        total: routes.filter(r => r.exists).length,
        files: routes,
        totalEndpoints: routes.reduce((sum, r) => sum + r.endpoints, 0)
    };
}

// Function to analyze database schema
function analyzeDatabaseSchema() {
    const schemaFiles = [
        'drizzle/schema.ts',
        'src/db/schema.ts',
        'src/models',
        'prisma/schema.prisma'
    ];
    
    const schemas = checkFilesExist(schemaFiles);
    const hasSchema = schemas.some(s => s.exists);
    
    // Check if migrations exist
    const hasMigrations = fs.existsSync(path.join(PROJECT_ROOT, 'drizzle/migrations')) ||
                         fs.existsSync(path.join(PROJECT_ROOT, 'prisma/migrations'));
    
    return {
        hasSchema,
        hasMigrations,
        schemas: schemas.filter(s => s.exists),
        configured: hasSchema && hasMigrations
    };
}

// Function to analyze test coverage
function analyzeTests() {
    const testDirs = ['tests', 'src/tests', '__tests__'];
    let totalTests = 0;
    
    const testTypes = {
        unit: 0,
        integration: 0,
        e2e: 0,
        performance: 0,
        security: 0
    };
    
    testDirs.forEach(dir => {
        const fullPath = path.join(PROJECT_ROOT, dir);
        if (fs.existsSync(fullPath)) {
            testTypes.unit += countFiles(dir, ['*.test.ts', '*.test.js', '*.spec.ts', '*.spec.js']);
            
            if (fs.existsSync(path.join(fullPath, 'integration'))) {
                testTypes.integration = countFiles(path.join(dir, 'integration'), ['*.test.ts', '*.test.js']);
            }
            if (fs.existsSync(path.join(fullPath, 'e2e'))) {
                testTypes.e2e = countFiles(path.join(dir, 'e2e'), ['*.spec.ts', '*.spec.js']);
            }
            if (fs.existsSync(path.join(fullPath, 'performance'))) {
                testTypes.performance = countFiles(path.join(dir, 'performance'), ['*.test.ts', '*.yml']);
            }
            if (fs.existsSync(path.join(fullPath, 'security'))) {
                testTypes.security = countFiles(path.join(dir, 'security'), ['*.test.ts']);
            }
        }
    });
    
    totalTests = Object.values(testTypes).reduce((sum, val) => sum + val, 0);
    
    return {
        total: totalTests,
        types: testTypes,
        coverage: totalTests > 50 ? 'comprehensive' : totalTests > 20 ? 'moderate' : totalTests > 5 ? 'basic' : 'minimal'
    };
}

// Function to get git statistics
function getGitStats() {
    try {
        const totalCommits = execSync('git rev-list --count HEAD 2>/dev/null', { encoding: 'utf-8' }).trim();
        const modifiedFiles = execSync('git status --porcelain 2>/dev/null | wc -l', { encoding: 'utf-8' }).trim();
        const lastCommitTime = execSync('git log -1 --format=%cd --date=relative 2>/dev/null', { encoding: 'utf-8' }).trim();
        const lastCommitMessage = execSync('git log -1 --pretty=format:"%s" 2>/dev/null', { encoding: 'utf-8' }).trim();
        const currentBranch = execSync('git branch --show-current 2>/dev/null', { encoding: 'utf-8' }).trim();
        
        // Get recent activity
        const recentCommits = execSync('git log --oneline -5 --pretty=format:"%h %s" 2>/dev/null', { encoding: 'utf-8' })
            .trim()
            .split('\n')
            .filter(line => line.length > 0);
        
        return {
            totalCommits: parseInt(totalCommits) || 0,
            modifiedFiles: parseInt(modifiedFiles) || 0,
            lastCommitTime,
            lastCommitMessage,
            currentBranch,
            recentCommits
        };
    } catch (e) {
        return {
            totalCommits: 0,
            modifiedFiles: 0,
            lastCommitTime: 'Unknown',
            lastCommitMessage: '',
            currentBranch: 'main',
            recentCommits: []
        };
    }
}

// Main analysis function
function analyzeProgress() {
    console.log('🔍 Performing REAL analysis of CastMatch project...\n');
    
    const timestamp = new Date().toISOString();
    
    // Get actual file counts
    const backendFiles = countFiles('src', ['*.ts', '*.js']);
    const frontendAppFiles = countFiles('frontend/app', ['*.tsx', '*.ts', '*.jsx', '*.js']);
    const frontendComponentFiles = countFiles('frontend/components', ['*.tsx', '*.ts']);
    const testFiles = countFiles('tests', ['*.test.ts', '*.spec.ts', '*.test.js', '*.spec.js']);
    
    // Check services
    const services = {
        backend: checkServiceStatus(5002, 'Backend API'),
        frontend: checkServiceStatus(3000, 'Frontend Next.js'),
        database: checkServiceStatus(5432, 'PostgreSQL'),
        redis: checkServiceStatus(6379, 'Redis Cache'),
        dashboard: checkServiceStatus(8888, 'Progress Dashboard')
    };
    
    // Analyze components in detail
    const apiRoutes = analyzeAPIRoutes();
    const database = analyzeDatabaseSchema();
    const tests = analyzeTests();
    const gitStats = getGitStats();
    
    // Calculate realistic progress for each component
    const components = {
        'Backend API': {
            files: backendFiles,
            progress: calculateBackendProgress(backendFiles, apiRoutes, services.backend.running),
            status: services.backend.running ? 'ACTIVE' : 'CONFIGURED',
            details: {
                totalFiles: backendFiles,
                routes: apiRoutes.total,
                endpoints: apiRoutes.totalEndpoints,
                controllers: countFiles('src/controllers', ['*.ts']),
                services: countFiles('src/services', ['*.ts']),
                middleware: countFiles('src/middleware', ['*.ts'])
            }
        },
        'Frontend UI': {
            files: frontendAppFiles + frontendComponentFiles,
            progress: calculateFrontendProgress(frontendAppFiles, frontendComponentFiles, services.frontend.running),
            status: services.frontend.running ? 'ACTIVE' : 'IN_PROGRESS',
            details: {
                appFiles: frontendAppFiles,
                components: frontendComponentFiles,
                pages: countFiles('frontend/app', ['page.tsx']),
                layouts: countFiles('frontend/app', ['layout.tsx']),
                hooks: countFiles('frontend/app/hooks', ['*.ts', '*.tsx']),
                stores: countFiles('frontend/lib/stores', ['*.ts'])
            }
        },
        'Database': {
            files: database.schemas.length,
            progress: calculateDatabaseProgress(database, services.database.running),
            status: services.database.running ? 'ACTIVE' : 'CONFIGURED',
            details: {
                hasSchema: database.hasSchema,
                hasMigrations: database.hasMigrations,
                isRunning: services.database.running,
                schemas: database.schemas
            }
        },
        'AI/ML Services': {
            files: countFiles('python-ai-service', ['*.py']) + countFiles('src/services', ['*ai*.ts', '*claude*.ts']),
            progress: calculateAIProgress(),
            status: 'IN_PROGRESS',
            details: {
                pythonFiles: countFiles('python-ai-service', ['*.py']),
                aiServices: countFiles('src/services', ['*ai*.ts', '*claude*.ts']),
                vectorDB: fs.existsSync(path.join(PROJECT_ROOT, 'src/services/memory.service.ts'))
            }
        },
        'Testing': {
            files: tests.total,
            progress: calculateTestProgress(tests),
            status: tests.total > 20 ? 'ACTIVE' : 'IN_PROGRESS',
            details: tests
        },
        'Infrastructure': {
            files: countFiles('.', ['docker-compose*.yml', 'Dockerfile*']),
            progress: calculateInfraProgress(services),
            status: 'ACTIVE',
            details: {
                dockerFiles: countFiles('.', ['docker-compose*.yml', 'Dockerfile*']),
                configFiles: countFiles('.', ['*.config.ts', '*.config.js']),
                envFiles: checkFilesExist(['.env', '.env.example', '.env.local']).filter(f => f.exists).length,
                runningServices: Object.values(services).filter(s => s.running).length
            }
        }
    };
    
    // Calculate overall REAL progress
    const componentProgress = Object.values(components).map(c => c.progress);
    const overallProgress = Math.round(componentProgress.reduce((a, b) => a + b, 0) / componentProgress.length);
    
    // Determine project phase based on real progress
    const phase = determineProjectPhase(overallProgress, components);
    
    // Generate the data structure
    const progressData = {
        timestamp,
        overallProgress,
        phase,
        realMetrics: {
            totalBackendFiles: backendFiles,
            totalFrontendFiles: frontendAppFiles + frontendComponentFiles,
            totalTestFiles: tests.total,
            totalAPIEndpoints: apiRoutes.totalEndpoints,
            runningServices: Object.values(services).filter(s => s.running).length,
            totalServices: Object.keys(services).length
        },
        gitStats,
        components,
        services,
        apiRoutes: apiRoutes.files,
        criticalIssues: identifyCriticalIssues(components, services),
        achievements: identifyAchievements(components, services),
        nextSteps: generateNextSteps(components, services)
    };
    
    // Save to JSON
    fs.writeFileSync(
        path.join(PROJECT_ROOT, '.claude/coordination/real-progress-data.json'),
        JSON.stringify(progressData, null, 2)
    );
    
    // Print detailed summary
    console.log('📊 REAL PROJECT STATUS');
    console.log('=' .repeat(50));
    console.log(`Overall Progress: ${overallProgress}% (${phase})`);
    console.log(`Git: ${gitStats.totalCommits} commits | ${gitStats.modifiedFiles} modified files`);
    console.log(`Last commit: ${gitStats.lastCommitTime} - "${gitStats.lastCommitMessage}"`);
    console.log();
    
    console.log('📁 ACTUAL FILE COUNTS:');
    console.log(`  Backend: ${backendFiles} files`);
    console.log(`  Frontend: ${frontendAppFiles + frontendComponentFiles} files`);
    console.log(`  Tests: ${tests.total} files`);
    console.log(`  API Endpoints: ${apiRoutes.totalEndpoints} endpoints`);
    console.log();
    
    console.log('🔧 COMPONENT STATUS:');
    for (const [name, component] of Object.entries(components)) {
        const bar = '█'.repeat(Math.floor(component.progress / 10)) + '░'.repeat(10 - Math.floor(component.progress / 10));
        console.log(`  ${name}: ${bar} ${component.progress}% [${component.status}]`);
    }
    console.log();
    
    console.log('🚀 SERVICES:');
    for (const [name, service] of Object.entries(services)) {
        const status = service.running ? '✅ Running' : '❌ Stopped';
        console.log(`  ${service.name} (port ${service.port}): ${status}`);
    }
    console.log();
    
    if (progressData.criticalIssues.length > 0) {
        console.log('⚠️  CRITICAL ISSUES:');
        progressData.criticalIssues.forEach(issue => {
            console.log(`  - ${issue}`);
        });
        console.log();
    }
    
    if (progressData.achievements.length > 0) {
        console.log('✨ ACHIEVEMENTS:');
        progressData.achievements.forEach(achievement => {
            console.log(`  ✓ ${achievement}`);
        });
        console.log();
    }
    
    console.log('📋 NEXT STEPS:');
    progressData.nextSteps.forEach((step, i) => {
        console.log(`  ${i + 1}. ${step}`);
    });
    
    return progressData;
}

// Helper functions for progress calculation
function calculateBackendProgress(files, apiRoutes, isRunning) {
    // More realistic calculation based on actual implementation
    // 167 files suggests ~70% backend completion (target 240 files for full implementation)
    const fileScore = Math.min((files / 240) * 35, 35); // 240+ files = 35%
    const routeScore = Math.min((apiRoutes.total / 12) * 25, 25); // 12+ route files = 25%
    const endpointScore = Math.min((apiRoutes.totalEndpoints / 100) * 25, 25); // 100+ endpoints = 25%
    const runningScore = isRunning ? 15 : 5; // Running = 15%
    
    return Math.round(fileScore + routeScore + endpointScore + runningScore);
}

function calculateFrontendProgress(appFiles, componentFiles, isRunning) {
    const totalFiles = appFiles + componentFiles;
    // 90 files is good but not complete (target 150+ for full implementation)
    const fileScore = Math.min((totalFiles / 150) * 30, 30); // 150+ files = 30%
    const componentScore = Math.min((componentFiles / 80) * 25, 25); // 80+ components = 25%
    const pageScore = Math.min((appFiles / 50) * 25, 25); // 50+ app files = 25%
    const runningScore = isRunning ? 20 : 5; // Running = 20%
    
    return Math.round(fileScore + componentScore + pageScore + runningScore);
}

function calculateDatabaseProgress(database, isRunning) {
    const schemaScore = database.hasSchema ? 35 : 0;
    const migrationScore = database.hasMigrations ? 25 : 0;
    const runningScore = isRunning ? 25 : 0;
    // Deduct points if we know there are table issues
    const healthPenalty = 15; // Known table creation issues
    
    return Math.max(0, schemaScore + migrationScore + runningScore - healthPenalty);
}

function calculateAIProgress() {
    // Check for AI-related files and services
    const aiFiles = countFiles('src/services', ['*ai*.ts', '*claude*.ts']);
    const pythonFiles = countFiles('python-ai-service', ['*.py']);
    
    // Python files might include venv, so cap impact
    const actualPythonFiles = Math.min(pythonFiles, 50);
    const fileScore = Math.min(((aiFiles + actualPythonFiles) / 30) * 40, 40);
    const integrationScore = aiFiles > 3 ? 25 : 10;
    const vectorDBScore = fs.existsSync(path.join(PROJECT_ROOT, 'src/services/memory.service.ts')) ? 20 : 0;
    
    return Math.round(fileScore + integrationScore + vectorDBScore);
}

function calculateTestProgress(tests) {
    // 63 tests is decent but needs more for production
    const totalScore = Math.min((tests.total / 100) * 35, 35); // 100+ tests = 35%
    const coverageScore = tests.total > 60 ? 25 : tests.total > 30 ? 15 : 5;
    const typeScore = Object.values(tests.types).filter(v => v > 0).length * 5; // Each test type = 5%
    const e2eBonus = tests.types.e2e > 5 ? 10 : 0; // E2E test bonus
    
    return Math.round(totalScore + coverageScore + typeScore + e2eBonus);
}

function calculateInfraProgress(services) {
    const runningServices = Object.values(services).filter(s => s.running).length;
    const totalServices = Object.keys(services).length;
    const serviceScore = Math.round((runningServices / totalServices) * 70);
    
    // Check for Docker and CI/CD setup
    const hasDocker = fs.existsSync(path.join(PROJECT_ROOT, 'docker-compose.yml'));
    const hasCI = fs.existsSync(path.join(PROJECT_ROOT, '.github/workflows'));
    const dockerScore = hasDocker ? 15 : 0;
    const ciScore = hasCI ? 15 : 0;
    
    return serviceScore + dockerScore + ciScore;
}

function determineProjectPhase(progress, components) {
    // More nuanced phase determination based on actual component status
    const hasRunningServices = components['Backend API'].status === 'ACTIVE' && 
                              components['Frontend UI'].status === 'ACTIVE';
    const hasGoodTests = components['Testing'].files > 50;
    const aiReady = components['AI/ML Services'].progress > 60;
    
    if (progress >= 85 && hasGoodTests) return 'Production Ready';
    if (progress >= 70 && hasRunningServices) return 'Beta Testing';
    if (progress >= 55) return 'Integration & Testing';
    if (progress >= 40) return 'Core Development';
    if (progress >= 25) return 'Foundation Building';
    return 'Initial Setup';
}

function identifyCriticalIssues(components, services) {
    const issues = [];
    
    if (!services.database.running) {
        issues.push('PostgreSQL database is not running');
    }
    if (!services.backend.running) {
        issues.push('Backend API server is not running');
    }
    if (components['Testing'].files < 10) {
        issues.push('Insufficient test coverage (less than 10 test files)');
    }
    if (components['AI/ML Services'].progress < 30) {
        issues.push('AI/ML services need significant development');
    }
    
    return issues;
}

function identifyAchievements(components, services) {
    const achievements = [];
    
    if (components['Backend API'].files > 100) {
        achievements.push(`Comprehensive backend with ${components['Backend API'].files} files implemented`);
    }
    if (components['Frontend UI'].files > 50) {
        achievements.push(`Rich frontend with ${components['Frontend UI'].files} UI files`);
    }
    if (services.backend.running && services.frontend.running) {
        achievements.push('Full stack services running successfully');
    }
    if (components['Testing'].files > 20) {
        achievements.push(`Good test coverage with ${components['Testing'].files} test files`);
    }
    
    return achievements;
}

function generateNextSteps(components, services) {
    const steps = [];
    
    // Priority 1: Critical services
    if (!services.database.running) {
        steps.push('Start PostgreSQL database service');
    }
    if (!services.backend.running) {
        steps.push('Fix and start backend API server');
    }
    
    // Priority 2: Low progress components
    const lowProgressComponents = Object.entries(components)
        .filter(([name, comp]) => comp.progress < 50)
        .sort((a, b) => a[1].progress - b[1].progress);
    
    lowProgressComponents.slice(0, 2).forEach(([name, comp]) => {
        steps.push(`Improve ${name} (currently at ${comp.progress}%)`);
    });
    
    // Priority 3: Testing
    if (components['Testing'].progress < 60) {
        steps.push('Add more comprehensive test coverage');
    }
    
    return steps.slice(0, 5); // Return top 5 next steps
}

// Auto-refresh functionality
function startAutoRefresh(intervalSeconds = 30) {
    console.log(`\n🔄 Auto-refresh enabled (every ${intervalSeconds} seconds)`);
    
    // Initial analysis
    analyzeProgress();
    
    // Set up interval
    setInterval(() => {
        console.log('\n' + '='.repeat(50));
        console.log(`🔄 Refreshing at ${new Date().toLocaleTimeString()}`);
        console.log('='.repeat(50) + '\n');
        analyzeProgress();
    }, intervalSeconds * 1000);
}

// Run if called directly
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--auto') || args.includes('-a')) {
        const intervalIndex = args.findIndex(arg => arg === '--interval' || arg === '-i');
        const interval = intervalIndex !== -1 && args[intervalIndex + 1] 
            ? parseInt(args[intervalIndex + 1]) 
            : 30;
        startAutoRefresh(interval);
    } else {
        analyzeProgress();
    }
}

module.exports = { analyzeProgress, startAutoRefresh };