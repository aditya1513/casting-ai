/**
 * Real-Time Monitoring Dashboard
 * Web-based dashboard for live agent activity visualization
 */

import express from 'express';
import { Server as SocketServer } from 'socket.io';
import { createServer } from 'http';
import { liveMonitor, AgentActivity } from './live-agent-monitor';
import path from 'path';

export class RealTimeDashboard {
  private app: express.Application;
  private server: any;
  private io: SocketServer;
  private port: number;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(port: number = 3001) {
    this.port = port;
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketServer(this.server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    this.setupRoutes();
    this.setupSocketHandlers();
  }

  private setupRoutes(): void {
    // Serve static dashboard
    this.app.get('/', (req, res) => {
      res.send(this.generateDashboardHTML());
    });

    // API endpoints
    this.app.get('/api/agents', (req, res) => {
      const agents = Array.from(liveMonitor.getSnapshot().values());
      res.json(agents);
    });

    this.app.get('/api/metrics', (req, res) => {
      res.json(liveMonitor.getMetrics());
    });

    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date() });
    });
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`📱 Dashboard client connected: ${socket.id}`);

      // Send initial data
      const agents = Array.from(liveMonitor.getSnapshot().values());
      socket.emit('agents:update', agents);
      socket.emit('metrics:update', liveMonitor.getMetrics());

      socket.on('disconnect', () => {
        console.log(`📱 Dashboard client disconnected: ${socket.id}`);
      });
    });

    // Listen to monitor events and broadcast to clients
    liveMonitor.on('polling:complete', (data) => {
      this.io.emit('agents:update', data.agents);
      this.io.emit('metrics:update', liveMonitor.getMetrics());
      this.io.emit('polling:timestamp', data.timestamp);
    });

    liveMonitor.on('monitoring:started', (data) => {
      this.io.emit('monitoring:status', { status: 'started', ...data });
    });

    liveMonitor.on('monitoring:stopped', (data) => {
      this.io.emit('monitoring:status', { status: 'stopped', ...data });
    });
  }

  private generateDashboardHTML(): string {
    return \`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CastMatch - Live Agent Monitoring Dashboard</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #fff;
            padding: 20px;
            min-height: 100vh;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        .header {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        h1 {
            font-size: 28px;
            font-weight: 600;
        }
        .status-indicator {
            display: flex;
            align-items: center;
            gap: 10px;
            background: rgba(255,255,255,0.2);
            padding: 8px 15px;
            border-radius: 20px;
        }
        .pulse {
            width: 10px;
            height: 10px;
            background: #00ff00;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.2); }
            100% { opacity: 1; transform: scale(1); }
        }
        .metrics-bar {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        .metric-card {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }
        .metric-value {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .metric-label {
            font-size: 12px;
            opacity: 0.8;
            text-transform: uppercase;
        }
        .agents-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
            gap: 20px;
        }
        .agent-card {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border-radius: 10px;
            padding: 20px;
            transition: transform 0.3s;
        }
        .agent-card:hover {
            transform: translateY(-5px);
        }
        .agent-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid rgba(255,255,255,0.2);
        }
        .agent-name {
            font-size: 18px;
            font-weight: 600;
        }
        .agent-status {
            padding: 4px 10px;
            border-radius: 15px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .status-active { background: #00ff00; color: #000; }
        .status-idle { background: #ffff00; color: #000; }
        .status-blocked { background: #ff0000; color: #fff; }
        .status-error { background: #ff00ff; color: #fff; }
        .agent-details {
            margin-top: 15px;
        }
        .detail-row {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
            font-size: 14px;
        }
        .detail-icon {
            width: 20px;
            margin-right: 10px;
        }
        .progress-bar {
            width: 100%;
            height: 8px;
            background: rgba(255,255,255,0.2);
            border-radius: 4px;
            overflow: hidden;
            margin-top: 5px;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #00ff00, #00aa00);
            transition: width 0.5s ease;
        }
        .code-snippet {
            background: rgba(0,0,0,0.3);
            padding: 10px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            margin-top: 10px;
            max-height: 100px;
            overflow-y: auto;
        }
        .tools-list {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 10px;
        }
        .tool-badge {
            background: rgba(255,255,255,0.2);
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 11px;
        }
        .error-box {
            background: rgba(255,0,0,0.2);
            border: 1px solid rgba(255,0,0,0.5);
            padding: 10px;
            border-radius: 5px;
            margin-top: 10px;
            font-size: 12px;
        }
        .timestamp {
            text-align: center;
            opacity: 0.7;
            margin-top: 20px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎬 CastMatch Live Agent Monitor</h1>
            <div class="status-indicator">
                <div class="pulse"></div>
                <span id="connection-status">Connecting...</span>
                <span id="last-update"></span>
            </div>
        </div>

        <div class="metrics-bar" id="metrics">
            <div class="metric-card">
                <div class="metric-value" id="active-agents">0</div>
                <div class="metric-label">Active Agents</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" id="tool-calls">0</div>
                <div class="metric-label">Tool Calls</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" id="files-edited">0</div>
                <div class="metric-label">Files Edited</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" id="errors-count">0</div>
                <div class="metric-label">Errors</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" id="avg-progress">0%</div>
                <div class="metric-label">Avg Progress</div>
            </div>
        </div>

        <div class="agents-grid" id="agents-container">
            <!-- Agent cards will be dynamically inserted here -->
        </div>

        <div class="timestamp" id="timestamp">
            Waiting for first update...
        </div>
    </div>

    <script>
        const socket = io();
        let agents = [];
        let metrics = {};

        socket.on('connect', () => {
            document.getElementById('connection-status').textContent = 'Connected';
            console.log('Connected to monitoring server');
        });

        socket.on('disconnect', () => {
            document.getElementById('connection-status').textContent = 'Disconnected';
        });

        socket.on('agents:update', (data) => {
            agents = data;
            updateAgentCards();
            updateLastUpdate();
        });

        socket.on('metrics:update', (data) => {
            metrics = data;
            updateMetrics();
        });

        socket.on('polling:timestamp', (timestamp) => {
            document.getElementById('timestamp').textContent = 
                'Last poll: ' + new Date(timestamp).toLocaleString();
        });

        function updateMetrics() {
            const activeAgents = agents.filter(a => a.status === 'active').length;
            document.getElementById('active-agents').textContent = activeAgents;
            document.getElementById('tool-calls').textContent = metrics.totalToolCalls || 0;
            document.getElementById('files-edited').textContent = metrics.totalFileEdits || 0;
            document.getElementById('errors-count').textContent = metrics.totalErrors || 0;
            
            const avgProgress = agents.reduce((sum, a) => sum + a.progressPercentage, 0) / agents.length;
            document.getElementById('avg-progress').textContent = (avgProgress || 0).toFixed(0) + '%';
        }

        function updateAgentCards() {
            const container = document.getElementById('agents-container');
            container.innerHTML = '';

            agents.forEach(agent => {
                const card = createAgentCard(agent);
                container.appendChild(card);
            });
        }

        function createAgentCard(agent) {
            const card = document.createElement('div');
            card.className = 'agent-card';
            
            const toolsHtml = Object.entries(agent.toolUsage || {})
                .map(([tool, count]) => \`<span class="tool-badge">\${tool}: \${count}</span>\`)
                .join('');

            const errorsHtml = (agent.errors || [])
                .map(err => \`
                    <div class="error-box">
                        ❌ \${err.error}
                        \${err.resolution ? \`<br>✅ \${err.resolution}\` : ''}
                    </div>
                \`).join('');

            card.innerHTML = \`
                <div class="agent-header">
                    <div class="agent-name">\${agent.agentName}</div>
                    <div class="agent-status status-\${agent.status}">\${agent.status}</div>
                </div>
                <div class="agent-details">
                    \${agent.activeTask ? \`
                        <div class="detail-row">
                            <span class="detail-icon">📋</span>
                            <span>\${agent.activeTask}</span>
                        </div>
                    \` : ''}
                    \${agent.currentFile ? \`
                        <div class="detail-row">
                            <span class="detail-icon">📁</span>
                            <span>\${agent.currentFile}:\${agent.currentLineNumber || 0}</span>
                        </div>
                    \` : ''}
                    \${agent.currentOperation ? \`
                        <div class="detail-row">
                            <span class="detail-icon">🔧</span>
                            <span>\${agent.currentOperation}</span>
                        </div>
                    \` : ''}
                    <div class="detail-row">
                        <span class="detail-icon">📊</span>
                        <span>Progress: \${agent.progressPercentage}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: \${agent.progressPercentage}%"></div>
                    </div>
                    \${agent.codeChanges ? \`
                        <div class="code-snippet">
                            +\${agent.codeChanges.additions} -\${agent.codeChanges.deletions} 
                            (\${agent.codeChanges.modified.length} files modified)
                        </div>
                    \` : ''}
                    \${toolsHtml ? \`<div class="tools-list">\${toolsHtml}</div>\` : ''}
                    \${errorsHtml}
                    \${agent.blockers && agent.blockers.length > 0 ? \`
                        <div class="error-box">
                            ⚠️ Blockers: \${agent.blockers.join(', ')}
                        </div>
                    \` : ''}
                </div>
            \`;
            
            return card;
        }

        function updateLastUpdate() {
            const now = new Date().toLocaleTimeString();
            document.getElementById('last-update').textContent = 'Updated: ' + now;
        }

        // Auto-refresh every 5 seconds for smooth updates
        setInterval(() => {
            socket.emit('request:update');
        }, 5000);
    </script>
</body>
</html>
    \`;
  }

  public start(): void {
    this.server.listen(this.port, () => {
      console.log(\`🌐 Real-Time Dashboard running at http://localhost:\${this.port}\`);
      console.log(\`📊 Open in browser to view live agent activity\`);
    });
  }

  public stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.server.close();
  }
}

export const dashboard = new RealTimeDashboard();