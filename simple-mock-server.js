// Standalone mock server for CastMatch localhost development
const http = require('http')
const url = require('url')

const PORT = 8000

// Mock data
const mockTalents = [
  {
    id: 'vikram-001',
    name: 'Vikram Rathod',
    matchScore: 91,
    quote: '₹10L',
    location: 'South Mumbai',
    language: 'Fluent Marathi',
    experience: 'Male in Heaven - The Right Manager',
    availability: 'November dates open'
  },
  {
    id: 'priya-002', 
    name: 'Priya Sharma',
    matchScore: 85,
    quote: '₹8L',
    location: 'Bandra West',
    language: 'Hindi, English',
    experience: 'Regional Cinema - 5+ films',
    availability: 'Available immediately'
  }
]

const mockProjects = [
  {
    id: 'mumbai-dreams',
    name: 'Mumbai Dreams',
    status: 'active',
    type: 'Lead Character Casting',
    budget: 1500000,
    description: 'Male lead similar to Irrfan Khan intensity'
  },
  {
    id: 'regional-series',
    name: 'Regional Series', 
    status: 'draft',
    type: 'Supporting Cast',
    budget: 800000,
    description: 'Supporting characters for web series'
  }
]

// Helper functions
function setCORSHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
}

function sendJSON(res, data, statusCode = 200) {
  setCORSHeaders(res)
  res.writeHead(statusCode, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

function parseBody(req, callback) {
  let body = ''
  req.on('data', chunk => body += chunk.toString())
  req.on('end', () => {
    try {
      const parsed = body ? JSON.parse(body) : {}
      callback(null, parsed)
    } catch (err) {
      callback(err, null)
    }
  })
}

// Request handler
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true)
  const path = parsedUrl.pathname
  const method = req.method

  console.log(`${method} ${path}`)

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    setCORSHeaders(res)
    res.writeHead(200)
    res.end()
    return
  }

  // Routes
  if (path === '/api/health' && method === 'GET') {
    sendJSON(res, { status: 'OK', message: 'CastMatch Mock Server Running' })
  }
  else if (path === '/api/projects' && method === 'GET') {
    sendJSON(res, mockProjects)
  }
  else if (path.match(/^\/api\/projects\/(.+)$/) && method === 'GET') {
    const projectId = path.match(/^\/api\/projects\/(.+)$/)[1]
    const project = mockProjects.find(p => p.id === projectId)
    if (project) {
      sendJSON(res, project)
    } else {
      sendJSON(res, { error: 'Project not found' }, 404)
    }
  }
  else if (path === '/api/conversations' && method === 'GET') {
    const projectId = parsedUrl.query.projectId || 'mumbai-dreams'
    const conversations = [
      {
        id: 'conv-1',
        projectId: projectId,
        title: 'Lead Character Casting',
        lastMessage: {
          content: "I've analyzed 127 profiles matching your criteria...",
          timestamp: new Date().toISOString()
        },
        createdAt: new Date().toISOString()
      }
    ]
    sendJSON(res, conversations)
  }
  else if (path === '/api/conversations/messages' && method === 'POST') {
    parseBody(req, (err, body) => {
      if (err) {
        sendJSON(res, { error: 'Invalid JSON' }, 400)
        return
      }
      
      const response = {
        id: `msg-${Date.now()}`,
        content: "I've analyzed 127 profiles matching your criteria. Here are the top 3 matches who embody that Irrfan Khan intensity you're looking for:",
        sender: 'ai',
        timestamp: new Date(),
        talentCards: [mockTalents[0]]
      }
      
      setTimeout(() => {
        sendJSON(res, response)
      }, 1500)
    })
  }
  else if (path === '/api/talents/search' && method === 'POST') {
    sendJSON(res, {
      talents: mockTalents,
      total: mockTalents.length,
      hasMore: false
    })
  }
  else if (path === '/api/ai/chat' && method === 'POST') {
    parseBody(req, (err, body) => {
      if (err) {
        sendJSON(res, { error: 'Invalid JSON' }, 400)
        return
      }
      
      const aiResponse = {
        response: "I've analyzed 127 profiles matching your criteria. Here are the top 3 matches who embody that Irrfan Khan intensity you're looking for:",
        talentRecommendations: [mockTalents[0]],
        actions: ['View Reel', 'Book Look Test', 'Generate Budget']
      }
      
      setTimeout(() => {
        sendJSON(res, aiResponse)  
      }, 1000)
    })
  }
  else {
    sendJSON(res, { error: 'Not found' }, 404)
  }
})

// Start server
server.listen(PORT, () => {
  console.log(`🚀 CastMatch Mock Server running on http://localhost:${PORT}`)
  console.log('📋 Available endpoints:')
  console.log('   GET  /api/health')
  console.log('   GET  /api/projects')
  console.log('   GET  /api/conversations')
  console.log('   POST /api/conversations/messages')
  console.log('   POST /api/talents/search')  
  console.log('   POST /api/ai/chat')
  console.log('\n✅ Frontend should be running at http://localhost:3000')
})

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down mock server...')
  server.close(() => {
    process.exit(0)
  })
})