#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = 8888;

// Run the analyzer first to generate fresh data
console.log('📊 Generating fresh progress data...');
execSync('node analyze-progress.js', { cwd: __dirname });

const server = http.createServer((req, res) => {
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './real-progress-dashboard.html';
    }

    // Remove query strings
    filePath = filePath.split('?')[0];

    const extname = path.extname(filePath);
    let contentType = 'text/html';

    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.json':
            contentType = 'application/json';
            break;
        case '.css':
            contentType = 'text/css';
            break;
    }

    fs.readFile(path.join(__dirname, filePath), (error, content) => {
        if (error) {
            if (error.code == 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Cache-Control': 'no-cache'
            });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`
🚀 CastMatch Real Progress Dashboard Server
============================================
✅ Server running at: http://localhost:${PORT}
📊 Dashboard URL: http://localhost:${PORT}/real-progress-dashboard.html

The dashboard will auto-refresh every 30 seconds.
Press Ctrl+C to stop the server.
    `);
    
    // Open in browser
    execSync(`open http://localhost:${PORT}/real-progress-dashboard.html`);
});

// Re-generate data every 5 minutes
setInterval(() => {
    console.log(`[${new Date().toLocaleTimeString()}] Updating progress data...`);
    try {
        execSync('node analyze-progress.js', { cwd: __dirname, stdio: 'pipe' });
        console.log(`[${new Date().toLocaleTimeString()}] Progress data updated`);
    } catch (e) {
        console.error('Error updating progress:', e.message);
    }
}, 300000); // 5 minutes