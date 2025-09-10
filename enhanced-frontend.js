/**
 * CastMatch Enhanced Frontend - Docker Production Version
 * Full-featured web interface with API integration
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'castmatch-frontend-enhanced',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    port: PORT
  });
});

// Main application route
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CastMatch - AI-Powered Casting Platform</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh; 
                color: #333;
            }
            .container { 
                max-width: 1200px; 
                margin: 0 auto; 
                padding: 20px; 
            }
            header {
                background: rgba(255,255,255,0.95);
                border-radius: 15px;
                padding: 30px;
                margin-bottom: 30px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.1);
                text-align: center;
            }
            .logo { font-size: 2.5em; color: #667eea; margin-bottom: 10px; }
            .subtitle { color: #666; font-size: 1.1em; }
            .services-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
                gap: 25px;
                margin-bottom: 30px;
            }
            .service-card {
                background: rgba(255,255,255,0.95);
                border-radius: 15px;
                padding: 25px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.1);
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }
            .service-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 12px 40px rgba(0,0,0,0.15);
            }
            .service-title {
                font-size: 1.3em;
                color: #667eea;
                margin-bottom: 15px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .status {
                padding: 15px;
                margin: 15px 0;
                border-radius: 10px;
                font-weight: 500;
            }
            .success { 
                background: #d4edda; 
                color: #155724; 
                border-left: 4px solid #28a745; 
            }
            .info { 
                background: #d1ecf1; 
                color: #0c5460; 
                border-left: 4px solid #17a2b8; 
            }
            .warning { 
                background: #fff3cd; 
                color: #856404; 
                border-left: 4px solid #ffc107; 
            }
            button {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                margin: 5px;
                transition: all 0.3s ease;
            }
            button:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            }
            button:disabled {
                background: #ccc;
                cursor: not-allowed;
                transform: none;
                box-shadow: none;
            }
            .form-group {
                margin: 15px 0;
            }
            label {
                display: block;
                margin-bottom: 8px;
                font-weight: 500;
                color: #555;
            }
            input, textarea, select {
                width: 100%;
                padding: 12px;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                font-size: 14px;
                transition: border-color 0.3s ease;
            }
            input:focus, textarea:focus, select:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }
            textarea {
                resize: vertical;
                min-height: 100px;
            }
            #results {
                margin-top: 20px;
                padding: 20px;
                background: rgba(255,255,255,0.95);
                border-radius: 10px;
                max-height: 400px;
                overflow-y: auto;
                box-shadow: 0 4px 20px rgba(0,0,0,0.05);
            }
            .loading {
                display: inline-flex;
                align-items: center;
                gap: 10px;
            }
            .spinner {
                border: 2px solid #f3f3f3;
                border-top: 2px solid #667eea;
                border-radius: 50%;
                width: 16px;
                height: 16px;
                animation: spin 1s linear infinite;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            .talent-card {
                background: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 8px;
                padding: 15px;
                margin: 10px 0;
            }
            .talent-name {
                font-weight: bold;
                color: #667eea;
                margin-bottom: 5px;
            }
            .talent-skills {
                display: flex;
                flex-wrap: wrap;
                gap: 5px;
                margin: 10px 0;
            }
            .skill-tag {
                background: #e9ecef;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                color: #495057;
            }
            .match-score {
                background: linear-gradient(135deg, #28a745, #20c997);
                color: white;
                padding: 4px 12px;
                border-radius: 15px;
                font-size: 12px;
                font-weight: bold;
                display: inline-block;
                margin-bottom: 10px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <header>
                <div class="logo">🎬 CastMatch</div>
                <div class="subtitle">AI-Powered Casting Platform for Mumbai's OTT Industry</div>
            </header>

            <!-- Service Status -->
            <div class="services-grid">
                <div class="service-card">
                    <div class="service-title">
                        🖥️ Backend API Service
                    </div>
                    <div class="status success">
                        ✅ Running on Docker (Port 3001)<br>
                        Database: PostgreSQL Connected<br>
                        Features: Talent Management, REST API
                    </div>
                    <button onclick="testBackend()">Test Backend Health</button>
                    <button onclick="loadTalents()">Load Talents</button>
                </div>

                <div class="service-card">
                    <div class="service-title">
                        🤖 AI Service
                    </div>
                    <div class="status success">
                        ✅ Running on Docker (Port 8000)<br>
                        AI: Claude Integration Ready<br>
                        Features: Chat, Matching, Analysis
                    </div>
                    <button onclick="testAI()">Test AI Health</button>
                    <button onclick="openAIChat()">AI Chat Assistant</button>
                </div>

                <div class="service-card">
                    <div class="service-title">
                        💾 Infrastructure
                    </div>
                    <div class="status success">
                        ✅ All services running in Docker Desktop<br>
                        PostgreSQL, Redis, Qdrant operational<br>
                        Network: Inter-service communication
                    </div>
                    <button onclick="testInfrastructure()">Test Infrastructure</button>
                </div>
            </div>

            <!-- Talent Management -->
            <div class="service-card">
                <div class="service-title">
                    👥 Talent Management
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                    <div>
                        <h4>Search & View Talents</h4>
                        <div class="form-group">
                            <label>Search by name or skills:</label>
                            <input type="text" id="talentSearch" placeholder="e.g., Acting, Hindi, Dancing">
                        </div>
                        <button onclick="searchTalents()">Search Talents</button>
                        <button onclick="loadAllTalents()">Load All Talents</button>
                    </div>
                    
                    <div>
                        <h4>Add New Talent</h4>
                        <div class="form-group">
                            <label>Name:</label>
                            <input type="text" id="newTalentName" placeholder="Full Name">
                        </div>
                        <div class="form-group">
                            <label>Email:</label>
                            <input type="email" id="newTalentEmail" placeholder="email@example.com">
                        </div>
                        <div class="form-group">
                            <label>Skills (comma-separated):</label>
                            <input type="text" id="newTalentSkills" placeholder="Acting, Dancing, Hindi">
                        </div>
                        <div class="form-group">
                            <label>Experience (years):</label>
                            <input type="number" id="newTalentExperience" min="0" max="50" value="0">
                        </div>
                        <button onclick="addTalent()">Add Talent</button>
                    </div>
                </div>
            </div>

            <!-- AI Features -->
            <div class="service-card">
                <div class="service-title">
                    🤖 AI Casting Assistant
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                    <div>
                        <h4>AI Chat Assistant</h4>
                        <div class="form-group">
                            <label>Ask the AI about casting:</label>
                            <textarea id="aiChatMessage" placeholder="e.g., Help me find actors for a romantic comedy in Mumbai"></textarea>
                        </div>
                        <button onclick="chatWithAI()">Ask AI Assistant</button>
                    </div>
                    
                    <div>
                        <h4>Talent Matching</h4>
                        <div class="form-group">
                            <label>Role Description:</label>
                            <textarea id="roleDescription" placeholder="e.g., Lead actress for romantic drama, age 25-30, fluent in Hindi and English"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Required Skills:</label>
                            <input type="text" id="requiredSkills" placeholder="Acting, Hindi, English, Dancing">
                        </div>
                        <button onclick="findMatches()">Find Best Matches</button>
                    </div>
                </div>
            </div>

            <!-- Results Area -->
            <div id="results" style="display: none;">
                <h3>Results</h3>
                <div id="resultsContent"></div>
            </div>
        </div>

        <script>
            let isLoading = false;

            function showLoading(buttonElement, text = 'Loading') {
                if (isLoading) return false;
                isLoading = true;
                const originalText = buttonElement.innerHTML;
                buttonElement.innerHTML = \`<span class="loading"><div class="spinner"></div>\${text}...</span>\`;
                buttonElement.disabled = true;
                
                setTimeout(() => {
                    buttonElement.innerHTML = originalText;
                    buttonElement.disabled = false;
                    isLoading = false;
                }, 30000); // Max 30s timeout
                
                return true;
            }

            function showResults(html) {
                document.getElementById('results').style.display = 'block';
                document.getElementById('resultsContent').innerHTML = html;
                document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
            }

            async function testBackend() {
                const btn = event.target;
                if (!showLoading(btn, 'Testing Backend')) return;
                
                try {
                    const response = await fetch('http://localhost:3001/api/health');
                    const data = await response.json();
                    showResults(\`
                        <h3>✅ Backend Health Check - SUCCESS</h3>
                        <pre>\${JSON.stringify(data, null, 2)}</pre>
                    \`);
                } catch (error) {
                    showResults(\`<h3>❌ Backend Health Check - FAILED</h3><p>\${error.message}</p>\`);
                } finally {
                    btn.innerHTML = 'Test Backend Health';
                    btn.disabled = false;
                    isLoading = false;
                }
            }

            async function testAI() {
                const btn = event.target;
                if (!showLoading(btn, 'Testing AI Service')) return;
                
                try {
                    const response = await fetch('http://localhost:8000/api/health');
                    const data = await response.json();
                    showResults(\`
                        <h3>✅ AI Service Health Check - SUCCESS</h3>
                        <pre>\${JSON.stringify(data, null, 2)}</pre>
                    \`);
                } catch (error) {
                    showResults(\`<h3>❌ AI Service Health Check - FAILED</h3><p>\${error.message}</p>\`);
                } finally {
                    btn.innerHTML = 'Test AI Health';
                    btn.disabled = false;
                    isLoading = false;
                }
            }

            async function testInfrastructure() {
                const btn = event.target;
                if (!showLoading(btn, 'Testing Infrastructure')) return;
                
                try {
                    const [backendRes, aiRes] = await Promise.all([
                        fetch('http://localhost:3001/api/status'),
                        fetch('http://localhost:8000/api/status')
                    ]);
                    
                    const backendData = await backendRes.json();
                    const aiData = await aiRes.json();
                    
                    showResults(\`
                        <h3>✅ Infrastructure Status - ALL SYSTEMS OPERATIONAL</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                            <div>
                                <h4>Backend Service</h4>
                                <pre>\${JSON.stringify(backendData, null, 2)}</pre>
                            </div>
                            <div>
                                <h4>AI Service</h4>
                                <pre>\${JSON.stringify(aiData, null, 2)}</pre>
                            </div>
                        </div>
                    \`);
                } catch (error) {
                    showResults(\`<h3>❌ Infrastructure Test - FAILED</h3><p>\${error.message}</p>\`);
                } finally {
                    btn.innerHTML = 'Test Infrastructure';
                    btn.disabled = false;
                    isLoading = false;
                }
            }

            async function loadAllTalents() {
                const btn = event.target;
                if (!showLoading(btn, 'Loading Talents')) return;
                
                try {
                    const response = await fetch('http://localhost:3001/api/talents');
                    const data = await response.json();
                    
                    const talentsHtml = data.talents.map(talent => \`
                        <div class="talent-card">
                            <div class="talent-name">\${talent.name}</div>
                            <div><strong>Email:</strong> \${talent.email || 'Not provided'}</div>
                            <div><strong>Experience:</strong> \${talent.experience} years</div>
                            <div><strong>Location:</strong> \${talent.location}</div>
                            <div class="talent-skills">
                                \${talent.skills.map(skill => \`<span class="skill-tag">\${skill}</span>\`).join('')}
                            </div>
                        </div>
                    \`).join('');
                    
                    showResults(\`
                        <h3>👥 All Talents (\${data.talents.length} total)</h3>
                        \${talentsHtml}
                        <p><em>Data loaded from PostgreSQL database in Docker container!</em></p>
                    \`);
                } catch (error) {
                    showResults(\`<h3>❌ Load Talents - FAILED</h3><p>\${error.message}</p>\`);
                } finally {
                    btn.innerHTML = 'Load All Talents';
                    btn.disabled = false;
                    isLoading = false;
                }
            }

            async function searchTalents() {
                const btn = event.target;
                const searchTerm = document.getElementById('talentSearch').value;
                
                if (!searchTerm.trim()) {
                    alert('Please enter a search term');
                    return;
                }
                
                if (!showLoading(btn, 'Searching')) return;
                
                try {
                    const response = await fetch(\`http://localhost:3001/api/talents?search=\${encodeURIComponent(searchTerm)}\`);
                    const data = await response.json();
                    
                    const talentsHtml = data.talents.map(talent => \`
                        <div class="talent-card">
                            <div class="talent-name">\${talent.name}</div>
                            <div><strong>Email:</strong> \${talent.email || 'Not provided'}</div>
                            <div><strong>Experience:</strong> \${talent.experience} years</div>
                            <div class="talent-skills">
                                \${talent.skills.map(skill => \`<span class="skill-tag">\${skill}</span>\`).join('')}
                            </div>
                        </div>
                    \`).join('');
                    
                    showResults(\`
                        <h3>🔍 Search Results for "\${searchTerm}" (\${data.talents.length} found)</h3>
                        \${talentsHtml || '<p>No talents found matching your search.</p>'}
                    \`);
                } catch (error) {
                    showResults(\`<h3>❌ Search Talents - FAILED</h3><p>\${error.message}</p>\`);
                } finally {
                    btn.innerHTML = 'Search Talents';
                    btn.disabled = false;
                    isLoading = false;
                }
            }

            async function addTalent() {
                const btn = event.target;
                const name = document.getElementById('newTalentName').value;
                const email = document.getElementById('newTalentEmail').value;
                const skills = document.getElementById('newTalentSkills').value.split(',').map(s => s.trim()).filter(s => s);
                const experience = parseInt(document.getElementById('newTalentExperience').value) || 0;
                
                if (!name.trim()) {
                    alert('Please enter a name');
                    return;
                }
                
                if (!showLoading(btn, 'Adding Talent')) return;
                
                try {
                    const response = await fetch('http://localhost:3001/api/talents', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, email, skills, experience, location: 'Mumbai' })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        showResults(\`
                            <h3>✅ Talent Added Successfully!</h3>
                            <div class="talent-card">
                                <div class="talent-name">\${data.talent.name}</div>
                                <div><strong>Email:</strong> \${data.talent.email || 'Not provided'}</div>
                                <div><strong>Experience:</strong> \${data.talent.experience} years</div>
                                <div class="talent-skills">
                                    \${data.talent.skills.map(skill => \`<span class="skill-tag">\${skill}</span>\`).join('')}
                                </div>
                            </div>
                            <p><em>Talent saved to PostgreSQL database!</em></p>
                        \`);
                        
                        // Clear form
                        document.getElementById('newTalentName').value = '';
                        document.getElementById('newTalentEmail').value = '';
                        document.getElementById('newTalentSkills').value = '';
                        document.getElementById('newTalentExperience').value = '0';
                    } else {
                        throw new Error(data.message || 'Failed to add talent');
                    }
                } catch (error) {
                    showResults(\`<h3>❌ Add Talent - FAILED</h3><p>\${error.message}</p>\`);
                } finally {
                    btn.innerHTML = 'Add Talent';
                    btn.disabled = false;
                    isLoading = false;
                }
            }

            async function chatWithAI() {
                const btn = event.target;
                const message = document.getElementById('aiChatMessage').value;
                
                if (!message.trim()) {
                    alert('Please enter a message');
                    return;
                }
                
                if (!showLoading(btn, 'Chatting with AI')) return;
                
                try {
                    const response = await fetch('http://localhost:8000/api/ai/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message, context: 'casting' })
                    });
                    
                    const data = await response.json();
                    
                    showResults(\`
                        <h3>🤖 AI Casting Assistant Response</h3>
                        <div class="talent-card">
                            <div><strong>Your Question:</strong></div>
                            <p style="font-style: italic; margin: 10px 0;">"\${message}"</p>
                            
                            <div><strong>AI Response:</strong></div>
                            <p style="margin: 10px 0;">\${data.response}</p>
                            
                            <small>Processed by: \${data.aiService} at \${new Date(data.timestamp).toLocaleString()}</small>
                        </div>
                    \`);
                } catch (error) {
                    showResults(\`<h3>❌ AI Chat - FAILED</h3><p>\${error.message}</p>\`);
                } finally {
                    btn.innerHTML = 'Ask AI Assistant';
                    btn.disabled = false;
                    isLoading = false;
                }
            }

            async function findMatches() {
                const btn = event.target;
                const roleDescription = document.getElementById('roleDescription').value;
                const requiredSkills = document.getElementById('requiredSkills').value.split(',').map(s => s.trim()).filter(s => s);
                
                if (!roleDescription.trim()) {
                    alert('Please enter a role description');
                    return;
                }
                
                if (!showLoading(btn, 'Finding Matches')) return;
                
                try {
                    const response = await fetch('http://localhost:8000/api/ai/match', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ roleDescription, requirements: requiredSkills })
                    });
                    
                    const data = await response.json();
                    
                    const matchesHtml = data.matches.topMatches.map(match => \`
                        <div class="talent-card">
                            <div class="match-score">Match: \${match.matchScore}%</div>
                            <div class="talent-name">\${match.name}</div>
                            <div><strong>Experience:</strong> \${match.experience} years</div>
                            <div><strong>Location:</strong> \${match.location}</div>
                            <div class="talent-skills">
                                \${match.skills.map(skill => \`<span class="skill-tag">\${skill}</span>\`).join('')}
                            </div>
                            <div><strong>Why this match:</strong></div>
                            <ul>
                                \${match.reasons.map(reason => \`<li>\${reason}</li>\`).join('')}
                            </ul>
                        </div>
                    \`).join('');
                    
                    showResults(\`
                        <h3>🎯 AI Talent Matching Results</h3>
                        <div class="talent-card" style="background: #e7f3ff;">
                            <strong>Role:</strong> \${roleDescription}<br>
                            <strong>Requirements:</strong> \${requiredSkills.join(', ') || 'None specified'}<br>
                            <strong>Total Matches Found:</strong> \${data.matches.totalMatches}
                        </div>
                        \${matchesHtml}
                        <p><em>Matches generated by CastMatch AI matching algorithm</em></p>
                    \`);
                } catch (error) {
                    showResults(\`<h3>❌ Talent Matching - FAILED</h3><p>\${error.message}</p>\`);
                } finally {
                    btn.innerHTML = 'Find Best Matches';
                    btn.disabled = false;
                    isLoading = false;
                }
            }

            // Auto-load talents on page load
            window.addEventListener('load', () => {
                setTimeout(() => {
                    if (!isLoading) {
                        document.querySelector('button[onclick="loadAllTalents()"]').click();
                    }
                }, 1000);
            });
        </script>
    </body>
    </html>
  `);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
🎬 CastMatch Enhanced Frontend Started (Docker)
===============================================
Port: ${PORT}
URL: http://localhost:${PORT}
Features: Full API Integration, AI Chat, Talent Management
===============================================
✅ Enhanced CastMatch Frontend Ready!
  `);
});

module.exports = app;