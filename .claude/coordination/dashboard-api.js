#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = 8890;

// Generate real-time dashboard data
function generateDashboardData() {
    const projectRoot = '/Users/Aditya/Desktop/casting-ai';
    
    try {
        // Get real file counts
        const backendFiles = execSync(`find ${projectRoot}/src -name "*.ts" -type f | wc -l`).toString().trim();
        const frontendFiles = execSync(`find ${projectRoot}/frontend -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" | wc -l`).toString().trim();
        const testFiles = execSync(`find ${projectRoot} -name "*.test.*" -o -name "*.spec.*" | wc -l`).toString().trim();
        
        // Check service status
        const checkPort = (port) => {
            try {
                execSync(`lsof -i:${port}`, { stdio: 'pipe' });
                return true;
            } catch (e) {
                return false;
            }
        };
        
        // Get database table count
        let tableCount = 0;
        try {
            const result = execSync(`PGPASSWORD=castmatch_pass psql -U castmatch_user -h localhost -d castmatch_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null`).toString();
            tableCount = parseInt(result.trim()) || 0;
        } catch (e) {
            tableCount = 0;
        }
        
        return {
            timestamp: new Date().toISOString(),
            metrics: {
                backendFiles: parseInt(backendFiles),
                frontendFiles: parseInt(frontendFiles),
                testFiles: parseInt(testFiles),
                totalFiles: parseInt(backendFiles) + parseInt(frontendFiles),
                estimatedProgress: Math.min(85, Math.round(((parseInt(backendFiles) + parseInt(frontendFiles)) / 200) * 100))
            },
            services: {
                frontend: checkPort(3000),
                backend: checkPort(5002), 
                postgres: checkPort(5432),
                redis: checkPort(6379)
            },
            database: {
                tableCount: tableCount,
                connected: tableCount > 0
            },
            lastUpdate: new Date().toLocaleTimeString()
        };
    } catch (error) {
        return {
            timestamp: new Date().toISOString(),
            error: error.message,
            metrics: {
                backendFiles: 0,
                frontendFiles: 0,
                testFiles: 0,
                totalFiles: 0,
                estimatedProgress: 0
            },
            services: {
                frontend: false,
                backend: false,
                postgres: false,
                redis: false
            },
            database: {
                tableCount: 0,
                connected: false
            },
            lastUpdate: new Date().toLocaleTimeString()
        };
    }
}

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    if (req.url === '/api/dashboard-data' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        const data = generateDashboardData();
        res.end(JSON.stringify(data, null, 2));
        return;
    }
    
    if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
        return;
    }
    
    // Serve static files
    let filePath = path.join(__dirname, req.url === '/' ? 'honest-dashboard.html' : req.url);
    
    if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        const contentTypes = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.json': 'application/json'
        };
        
        res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
        fs.createReadStream(filePath).pipe(res);
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`🚀 Dashboard API Server running at http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/honest-dashboard.html`);
    console.log(`🔌 API: http://localhost:${PORT}/api/dashboard-data`);
});

module.exports = { generateDashboardData };