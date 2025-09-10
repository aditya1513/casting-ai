// Simple mock server for CastMatch localhost development
const express = require('express')
const cors = require('cors')

const app = express()
const PORT = 8000

// Enable CORS for frontend
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}))

app.use(express.json())

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

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'CastMatch Mock Server Running' })
})

app.get('/api/projects', (req, res) => {
  res.json(mockProjects)
})

app.get('/api/projects/:id', (req, res) => {
  const project = mockProjects.find(p => p.id === req.params.id)
  if (!project) {
    return res.status(404).json({ error: 'Project not found' })
  }
  res.json(project)
})

app.get('/api/conversations', (req, res) => {
  const { projectId } = req.query
  
  // Mock conversation data matching wireframe
  const conversations = [
    {
      id: 'conv-1',
      projectId: projectId || 'mumbai-dreams',
      title: 'Lead Character Casting',
      lastMessage: {
        content: "I've analyzed 127 profiles matching your criteria...",
        timestamp: new Date().toISOString()
      },
      createdAt: new Date().toISOString()
    }
  ]
  
  res.json(conversations)
})

app.post('/api/conversations/messages', (req, res) => {
  const { content, projectId } = req.body
  
  // Mock AI response matching wireframe
  const response = {
    id: `msg-${Date.now()}`,
    content: "I've analyzed 127 profiles matching your criteria. Here are the top 3 matches who embody that Irrfan Khan intensity you're looking for:",
    sender: 'ai',
    timestamp: new Date(),
    talentCards: [mockTalents[0]] // Return Vikram's profile
  }
  
  setTimeout(() => {
    res.json(response)
  }, 1500) // Simulate API delay
})

app.post('/api/talents/search', (req, res) => {
  const { query } = req.body
  
  res.json({
    talents: mockTalents,
    total: mockTalents.length,
    hasMore: false
  })
})

app.post('/api/ai/chat', (req, res) => {
  const { message } = req.body
  
  const aiResponse = {
    response: "I've analyzed 127 profiles matching your criteria. Here are the top 3 matches who embody that Irrfan Khan intensity you're looking for:",
    talentRecommendations: [mockTalents[0]],
    actions: ['View Reel', 'Book Look Test', 'Generate Budget']
  }
  
  setTimeout(() => {
    res.json(aiResponse)  
  }, 1000)
})

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 CastMatch Mock Server running on http://localhost:${PORT}`)
  console.log('📋 Available endpoints:')
  console.log('   GET  /api/health')
  console.log('   GET  /api/projects')
  console.log('   GET  /api/conversations')
  console.log('   POST /api/conversations/messages')
  console.log('   POST /api/talents/search')  
  console.log('   POST /api/ai/chat')
})

module.exports = app