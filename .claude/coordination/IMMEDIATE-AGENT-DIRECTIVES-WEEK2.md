# IMMEDIATE AGENT DIRECTIVES - WEEK 2 SPRINT
**Date**: September 6, 2025  
**Time**: 01:20 IST  
**Priority**: CRITICAL - All Agents Must Act Now  
**Deadline**: Week 2 End (6 Days Remaining)

---

## 🚨 CRITICAL PATH ITEMS - DO THESE NOW

### 🧠 AI/ML DEVELOPER - PRIORITY 1
**YOUR IMMEDIATE TASK**: Setup Pinecone Vector Database

```bash
# Step 1: Get Pinecone API Key
# Go to: https://www.pinecone.io/
# Sign up for free tier
# Get API key from dashboard

# Step 2: Create these files NOW
```

```typescript
// src/services/ai/pinecone.service.ts
import { Pinecone } from '@pinecone-database/pinecone';

export class PineconeService {
  private client: Pinecone;
  private indexName = 'castmatch-talents';
  
  async initialize() {
    this.client = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
      environment: process.env.PINECONE_ENVIRONMENT!
    });
    
    // Create index if doesn't exist
    const indexes = await this.client.listIndexes();
    if (!indexes.includes(this.indexName)) {
      await this.client.createIndex({
        name: this.indexName,
        dimension: 1536, // OpenAI embeddings
        metric: 'cosine'
      });
    }
  }
  
  async upsertTalent(talent: any) {
    const index = this.client.index(this.indexName);
    const embedding = await this.generateEmbedding(talent);
    
    await index.upsert({
      vectors: [{
        id: talent.id,
        values: embedding,
        metadata: {
          name: talent.name,
          skills: talent.skills,
          experience: talent.experience
        }
      }]
    });
  }
  
  async searchSimilar(query: string, topK = 10) {
    const index = this.client.index(this.indexName);
    const queryEmbedding = await this.generateEmbedding(query);
    
    const results = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true
    });
    
    return results.matches;
  }
  
  private async generateEmbedding(text: string): Promise<number[]> {
    // Use OpenAI or sentence-transformers
    // Implementation here
    return [];
  }
}
```

**NEXT**: Implement script analysis pipeline

---

### 🎨 FRONTEND UI DEVELOPER - PRIORITY 1
**YOUR IMMEDIATE TASK**: Fix Streaming Infinite Loops

```typescript
// frontend/app/components/chat/ChatContainerV2.tsx
// FIX THIS NOW - Add proper cleanup and dependencies

useEffect(() => {
  const handleStreamChunk = (event: CustomEvent) => {
    if (event.detail.conversationId === conversationId) {
      setStreamingContent(prev => prev + event.detail.chunk);
    }
  };
  
  window.addEventListener('stream-chunk', handleStreamChunk);
  
  // CRITICAL: Add cleanup
  return () => {
    window.removeEventListener('stream-chunk', handleStreamChunk);
  };
}, [conversationId]); // Add proper dependencies

// Add AbortController for fetch
const abortController = useRef<AbortController>();

const sendMessage = async (content: string) => {
  // Abort previous request
  if (abortController.current) {
    abortController.current.abort();
  }
  
  abortController.current = new AbortController();
  
  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      signal: abortController.current.signal,
      // ... rest of config
    });
    // Handle response
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Send message error:', error);
    }
  }
};

// WebSocket cleanup
useEffect(() => {
  return () => {
    if (socket) {
      socket.disconnect();
    }
  };
}, [socket]);
```

**NEXT**: Optimize real-time updates

---

### 🔧 BACKEND API DEVELOPER - PRIORITY 1
**YOUR IMMEDIATE TASK**: Create Memory API Endpoints

```typescript
// src/routes/memory.routes.ts
import { Router } from 'express';
import { MemoryController } from '../controllers/memory.controller';

const router = Router();
const controller = new MemoryController();

// Episodic memory endpoints
router.post('/episodic', controller.storeEpisodic);
router.get('/episodic/:userId', controller.getEpisodic);
router.post('/episodic/consolidate', controller.consolidateEpisodic);

// Semantic memory endpoints  
router.post('/semantic', controller.storeSemantic);
router.get('/semantic/search', controller.searchSemantic);
router.post('/semantic/graph', controller.updateKnowledgeGraph);

// Procedural memory endpoints
router.post('/procedural', controller.learnProcedure);
router.get('/procedural/suggest', controller.suggestWorkflow);

// Memory insights
router.get('/insights/:userId', controller.getInsights);
router.post('/forget', controller.triggerForgetting);

export default router;
```

```typescript
// src/controllers/memory.controller.ts
import { Request, Response } from 'express';
import { EpisodicMemoryService } from '../services/memory/episodic-memory.service';
import { SemanticMemoryService } from '../services/memory/semantic-memory.service';
import { ProceduralMemoryService } from '../services/memory/procedural-memory.service';

export class MemoryController {
  private episodic = new EpisodicMemoryService();
  private semantic = new SemanticMemoryService();
  private procedural = new ProceduralMemoryService();
  
  async storeEpisodic(req: Request, res: Response) {
    try {
      const memory = await this.episodic.store(req.body);
      res.json({ success: true, memory });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  // Implement all other methods...
}
```

**NEXT**: Add caching layer

---

### 🧪 TESTING QA DEVELOPER - PRIORITY 1
**YOUR IMMEDIATE TASK**: Create Critical Path Tests

```typescript
// tests/integration/memory-system.test.ts
describe('Memory System Integration', () => {
  it('should store and retrieve episodic memories', async () => {
    const memory = {
      userId: 'test-user',
      event: 'talent_search',
      context: { query: 'female actor 25-30' },
      timestamp: new Date()
    };
    
    const response = await request(app)
      .post('/api/memory/episodic')
      .send(memory);
      
    expect(response.status).toBe(200);
    expect(response.body.memory).toBeDefined();
  });
  
  it('should consolidate memories after threshold', async () => {
    // Add 10 memories to trigger consolidation
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post('/api/memory/episodic')
        .send({ /* memory data */ });
    }
    
    const consolidation = await request(app)
      .post('/api/memory/episodic/consolidate');
      
    expect(consolidation.body.consolidated).toBe(true);
  });
});

// tests/e2e/talent-search.spec.ts
test('complete talent search flow', async ({ page }) => {
  await page.goto('/chat');
  
  // Type search query
  await page.fill('[data-testid="chat-input"]', 
    'Find me a female actor aged 25-30 for a Netflix series');
  await page.click('[data-testid="send-button"]');
  
  // Wait for AI response
  await page.waitForSelector('[data-testid="ai-message"]');
  
  // Check talent cards appear
  const talentCards = await page.$$('[data-testid="talent-card"]');
  expect(talentCards.length).toBeGreaterThan(0);
  
  // Click view profile
  await page.click('[data-testid="view-profile-0"]');
  
  // Verify profile modal
  await expect(page.locator('[data-testid="profile-modal"]')).toBeVisible();
});
```

**NEXT**: Add performance benchmarks

---

### 🏗️ DEVOPS INFRASTRUCTURE - PRIORITY 1
**YOUR IMMEDIATE TASK**: Add Circuit Breakers

```typescript
// src/middleware/circuit-breaker.ts
import CircuitBreaker from 'opossum';

export class CircuitBreakerMiddleware {
  private breakers = new Map<string, CircuitBreaker>();
  
  getBreaker(name: string, options = {}) {
    if (!this.breakers.has(name)) {
      const breaker = new CircuitBreaker(async function() {}, {
        timeout: 3000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
        ...options
      });
      
      breaker.on('open', () => {
        console.error(`Circuit breaker ${name} is OPEN`);
      });
      
      breaker.on('halfOpen', () => {
        console.log(`Circuit breaker ${name} is HALF-OPEN`);
      });
      
      this.breakers.set(name, breaker);
    }
    
    return this.breakers.get(name)!;
  }
  
  wrap(name: string, fn: Function) {
    const breaker = this.getBreaker(name);
    return breaker.fire.bind(breaker, fn);
  }
}

// Usage in services
const breaker = new CircuitBreakerMiddleware();

// Wrap external API calls
const searchWithBreaker = breaker.wrap('pinecone-search', 
  async (query) => {
    return await pineconeService.search(query);
  }
);

// Wrap database operations
const dbQueryWithBreaker = breaker.wrap('database-query',
  async (sql) => {
    return await db.query(sql);
  }
);
```

**NEXT**: Add resource monitoring

---

### 🔌 INTEGRATION WORKFLOW - PRIORITY 1
**YOUR IMMEDIATE TASK**: Start Calendar Integration

```typescript
// src/integrations/calendar/google-calendar.service.ts
import { google } from 'googleapis';

export class GoogleCalendarService {
  private calendar;
  private oauth2Client;
  
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    this.calendar = google.calendar({ 
      version: 'v3', 
      auth: this.oauth2Client 
    });
  }
  
  async createAudition(data: {
    talentEmail: string;
    castingDirectorEmail: string;
    date: Date;
    duration: number;
    project: string;
  }) {
    const event = {
      summary: `Audition: ${data.project}`,
      description: 'CastMatch scheduled audition',
      start: {
        dateTime: data.date.toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      end: {
        dateTime: new Date(data.date.getTime() + data.duration * 60000).toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      attendees: [
        { email: data.talentEmail },
        { email: data.castingDirectorEmail }
      ],
      conferenceData: {
        createRequest: {
          requestId: `castmatch-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      }
    };
    
    const response = await this.calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 1
    });
    
    return response.data;
  }
}
```

**NEXT**: Setup OAuth flow

---

## 📊 AUTOMATED MONITORING SCRIPT

Create and run this NOW:

```bash
#!/bin/bash
# Save as: .claude/coordination/monitor.sh

while true; do
  echo "=== CastMatch Status Check ==="
  echo "Time: $(date)"
  
  # Check services
  echo -n "Backend: "
  curl -s http://localhost:5002/health && echo "✅" || echo "❌"
  
  echo -n "Frontend: "
  curl -s http://localhost:3001 > /dev/null && echo "✅" || echo "❌"
  
  echo -n "Python AI: "
  curl -s http://localhost:8000/health && echo "✅" || echo "❌"
  
  # Check memory usage
  echo "Memory Usage:"
  ps aux | grep node | awk '{sum+=$4} END {print "Node.js:", sum"%"}'
  
  # Check error logs
  echo "Recent Errors:"
  tail -5 logs/error.log 2>/dev/null || echo "No errors"
  
  echo "================================"
  sleep 300 # Check every 5 minutes
done
```

Run it: `chmod +x .claude/coordination/monitor.sh && ./monitor.sh &`

---

## ⏰ NEXT CHECKPOINT: 03:00 IST (1 hour 40 minutes)

**Expected Deliverables**:
1. Pinecone account created and API key obtained
2. Frontend streaming fixes deployed
3. Memory API endpoints created
4. At least 10 new tests written
5. Circuit breaker middleware implemented
6. Calendar OAuth setup started

**If blocked, immediately escalate to Orchestrator**

---

## 🎯 SUCCESS CRITERIA FOR TODAY

By End of Day (23:59 IST):
- [ ] Semantic search returning results
- [ ] Chat streaming without loops
- [ ] Memory system fully integrated
- [ ] Test coverage > 55%
- [ ] Circuit breakers protecting all external calls
- [ ] Calendar integration POC working

---

**REMINDER**: We have 6 days to complete Week 2. Every hour counts. Focus on your assigned task. Report progress every 2 hours. We can do this!

---

*Generated by CastMatch Workflow Orchestrator*
*16-Agent Autonomous Coordination System*