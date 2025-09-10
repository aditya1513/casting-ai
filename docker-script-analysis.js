#!/usr/bin/env node

/**
 * CastMatch Script Analysis Service - Docker Container
 * Runs the advanced script analysis service in containerized environment
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🎬 Starting CastMatch Script Analysis Service in Docker...\n');

// Environment configuration
const config = {
    port: process.env.SCRIPT_SERVICE_PORT || 8001,
    nodeEnv: process.env.NODE_ENV || 'development',
    containerName: 'castmatch-script-analysis',
    serviceName: 'Script Analysis Service',
    version: '1.0.0'
};

console.log('📋 Configuration:');
console.log(`   Service: ${config.serviceName}`);
console.log(`   Port: ${config.port}`);
console.log(`   Environment: ${config.nodeEnv}`);
console.log(`   Container: ${config.containerName}\n`);

// Function to check if required files exist
function checkRequiredFiles() {
    const requiredFiles = [
        'script-analysis-service.js',
        'script-analysis-frontend.html'
    ];

    console.log('🔍 Checking required files...');
    
    const missingFiles = requiredFiles.filter(file => {
        const exists = fs.existsSync(path.join(__dirname, file));
        console.log(`   ${file}: ${exists ? '✅' : '❌'}`);
        return !exists;
    });

    if (missingFiles.length > 0) {
        console.error('❌ Missing required files:', missingFiles.join(', '));
        process.exit(1);
    }
    
    console.log('✅ All required files present\n');
}

// Function to start the service
function startScriptAnalysisService() {
    console.log('🚀 Launching Script Analysis Service...\n');
    
    const serviceProcess = spawn('node', ['script-analysis-service.js'], {
        stdio: 'inherit',
        env: {
            ...process.env,
            SCRIPT_SERVICE_PORT: config.port,
            NODE_ENV: config.nodeEnv
        }
    });

    serviceProcess.on('error', (error) => {
        console.error('❌ Failed to start Script Analysis Service:', error);
        process.exit(1);
    });

    serviceProcess.on('exit', (code) => {
        console.log(`\n📊 Script Analysis Service exited with code ${code}`);
        if (code !== 0) {
            console.error('❌ Service crashed unexpectedly');
            process.exit(code);
        }
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
        console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
        serviceProcess.kill('SIGTERM');
    });

    process.on('SIGINT', () => {
        console.log('\n🛑 Received SIGINT, shutting down gracefully...');
        serviceProcess.kill('SIGINT');
    });
}

// Function to create health check endpoint info
function displayServiceInfo() {
    console.log('🌐 Service Endpoints:');
    console.log(`   Health Check: http://localhost:${config.port}/health`);
    console.log(`   Script Analysis: http://localhost:${config.port}/api/script/analyze`);
    console.log(`   Character Extraction: http://localhost:${config.port}/api/script/characters`);
    console.log(`   Genre Analysis: http://localhost:${config.port}/api/script/genre`);
    console.log(`   Casting Recommendations: http://localhost:${config.port}/api/script/recommendations`);
    console.log(`   Demo Analysis: http://localhost:${config.port}/api/script/demo`);
    console.log(`   Analytics: http://localhost:${config.port}/api/script/analytics\n`);
    
    console.log('🖥️  Frontend Interface:');
    console.log(`   Open: script-analysis-frontend.html in your browser`);
    console.log(`   Configure API endpoint to: http://localhost:${config.port}\n`);
    
    console.log('📊 Testing Commands:');
    console.log(`   curl -X GET http://localhost:${config.port}/health`);
    console.log(`   curl -X GET http://localhost:${config.port}/api/script/demo`);
    console.log(`   curl -X POST http://localhost:${config.port}/api/script/analyze \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"scriptText": "Your script here..."}'`);
    console.log('');
}

// Function to check system readiness
function checkSystemReadiness() {
    console.log('⚡ System Readiness Check:');
    
    // Check Node.js version
    const nodeVersion = process.version;
    console.log(`   Node.js: ${nodeVersion} ${nodeVersion >= 'v16.0.0' ? '✅' : '⚠️'}`);
    
    // Check memory
    const memUsage = process.memoryUsage();
    const memMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    console.log(`   Memory: ${memMB}MB used ✅`);
    
    // Check environment variables
    const requiredEnvVars = ['ANTHROPIC_API_KEY'];
    requiredEnvVars.forEach(envVar => {
        const exists = !!process.env[envVar];
        console.log(`   ${envVar}: ${exists ? 'Set ✅' : 'Missing ⚠️'}`);
    });
    
    console.log('');
}

// Main execution flow
function main() {
    try {
        console.log('=' .repeat(60));
        console.log('  🎬 CASTMATCH SCRIPT ANALYSIS SERVICE DOCKER  ');
        console.log('=' .repeat(60));
        console.log('');
        
        checkSystemReadiness();
        checkRequiredFiles();
        displayServiceInfo();
        startScriptAnalysisService();
        
    } catch (error) {
        console.error('❌ Startup failed:', error);
        process.exit(1);
    }
}

// Docker container health check endpoint
function createHealthCheckEndpoint() {
    const http = require('http');
    
    const healthServer = http.createServer((req, res) => {
        if (req.url === '/health' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'healthy',
                service: 'CastMatch Script Analysis Service Docker',
                version: config.version,
                timestamp: new Date().toISOString(),
                container: config.containerName,
                port: config.port
            }));
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    });
    
    const healthPort = parseInt(config.port) + 1000; // Health check on different port
    healthServer.listen(healthPort, () => {
        console.log(`🏥 Health check endpoint: http://localhost:${healthPort}/health`);
    });
}

// Start the service
if (require.main === module) {
    main();
    createHealthCheckEndpoint();
}

module.exports = {
    startScriptAnalysisService,
    config
};