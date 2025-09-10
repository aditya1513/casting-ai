# WEEK 2 - DAY 8-9 AGENT DIRECTIVES
**Date**: September 5, 2025  
**Time**: 00:35 IST  
**Mission**: Advanced Memory System Implementation  

## ⚠️ CRITICAL RULE: NO GENERAL-PURPOSE AGENTS ⚠️
All agents MUST be specialized CastMatch agents. No exceptions.

---

## IMMEDIATE AGENT ASSIGNMENTS

### 🧠 AI-ML-DEVELOPER - PRIMARY ASSIGNMENT
**Priority**: CRITICAL  
**Timeline**: Next 48 hours (Day 8-9)  

#### Memory System Implementation Tasks:

**1. Episodic Memory Layer** (Priority: HIGH)
```python
# Location: src/services/memory/episodic-memory.service.ts
- Create emotional valence calculation
- Implement time-decay algorithm (forgetting curve)
- Build similar episode recall system
- Add memory importance scoring
- Setup memory consolidation triggers
```

**2. Semantic Knowledge Graph** (Priority: HIGH)
```python
# Location: src/services/memory/semantic-memory.service.ts
- Initialize NetworkX graph structure
- Build actor relationship networks
- Create genre preference patterns
- Implement concept relationship mapping
- Setup automated knowledge extraction
```

**3. Procedural Memory System** (Priority: MEDIUM)
```python
# Location: src/services/memory/procedural-memory.service.ts
- Detect action sequence patterns
- Memorize successful workflows
- Build user-specific optimizations
- Create automated suggestion engine
- Track workflow success rates
```

**Deliverables by End of Day 9:**
- ✅ All three memory types functional
- ✅ Memory consolidation service running
- ✅ Pattern recognition active
- ✅ Memory APIs integrated

---

### 🔧 BACKEND-API-DEVELOPER - SUPPORT ASSIGNMENT
**Priority**: HIGH  
**Timeline**: Parallel with AI-ML work  

#### API Integration Tasks:

**1. Memory API Endpoints** (Priority: CRITICAL)
```typescript
// Location: src/routes/memory.routes.ts
POST /api/memory/episodic    // Store episodic memory
GET  /api/memory/recall       // Retrieve relevant memories
POST /api/memory/consolidate // Trigger consolidation
GET  /api/memory/insights     // Memory analytics
```

**2. Database Schema Updates** (Priority: HIGH)
```sql
-- Location: drizzle/schema/memory.ts
- episodic_memories table
- semantic_knowledge table
- procedural_patterns table
- memory_connections table
```

**3. Caching Strategy** (Priority: MEDIUM)
```typescript
// Location: src/services/cache/memory-cache.service.ts
- Redis memory cache layer
- Hot memory fast retrieval
- Memory preloading strategy
- Cache invalidation rules
```

**Deliverables by End of Day 9:**
- ✅ All memory endpoints operational
- ✅ Database schemas migrated
- ✅ Caching layer active
- ✅ API documentation complete

---

### 🧪 TESTING-QA-DEVELOPER - CONTINUOUS ASSIGNMENT
**Priority**: HIGH  
**Timeline**: Throughout Day 8-9  

#### Testing Requirements:

**1. Memory System Tests**
```typescript
// Location: tests/unit/memory/
- Episodic memory storage/retrieval
- Semantic graph operations
- Procedural pattern detection
- Memory decay calculations
- Consolidation triggers
```

**2. Integration Tests**
```typescript
// Location: tests/integration/memory/
- API endpoint validation
- Database operation tests
- Cache performance tests
- Memory-to-AI integration
```

**3. Performance Benchmarks**
- Memory retrieval: <100ms
- Pattern detection: <500ms
- Consolidation: <2s
- Graph queries: <200ms

**Deliverables:**
- ✅ 85%+ test coverage
- ✅ All tests passing
- ✅ Performance validated
- ✅ Load testing complete

---

### 🏗️ DEVOPS-INFRASTRUCTURE-DEVELOPER - MONITORING
**Priority**: MEDIUM  
**Timeline**: Continuous  

#### Infrastructure Tasks:

**1. Resource Monitoring**
- Memory usage tracking
- CPU utilization checks
- Database connection pools
- Redis memory allocation

**2. Service Health**
- Memory service uptime
- API response times
- Error rate monitoring
- Performance metrics

**3. Scaling Preparation**
- Memory service containers
- Redis cluster config
- Database optimization
- Load balancer setup

---

## COORDINATION CHECKPOINTS

### Day 8 Checkpoints:
- **09:00**: Memory architecture review with ai-ml-developer
- **13:00**: API design sync with backend-api-developer
- **17:00**: Testing strategy with testing-qa-developer
- **21:00**: Day 8 progress assessment

### Day 9 Checkpoints:
- **09:00**: Integration status check
- **13:00**: Performance testing results
- **17:00**: Memory system demo
- **21:00**: Quality gate review

---

## DEPENDENCY MANAGEMENT

### Critical Path:
```
1. Memory Schema (backend-api-developer) → 
2. Memory Implementation (ai-ml-developer) → 
3. API Integration (backend-api-developer) → 
4. Testing (testing-qa-developer)
```

### Parallel Work:
- ai-ml-developer: Core memory algorithms
- backend-api-developer: Database and APIs
- testing-qa-developer: Test suite development
- devops-infrastructure-developer: Monitoring

---

## SUCCESS CRITERIA - DAY 8-9

### Must Complete ✅
- [ ] Episodic memory functional
- [ ] Semantic graph operational
- [ ] Memory APIs working
- [ ] Basic tests passing
- [ ] No system crashes

### Should Complete 🎯
- [ ] Procedural memory active
- [ ] Consolidation automated
- [ ] 85% test coverage
- [ ] Performance targets met
- [ ] Documentation updated

### Could Complete 💫
- [ ] Advanced patterns
- [ ] Memory visualization
- [ ] Optimization complete
- [ ] Load testing done
- [ ] UI preview ready

---

## BLOCKER PROTOCOL

If any agent encounters blockers:
1. **Immediate notification** to orchestrator
2. **Quick diagnosis** of root cause
3. **Reallocation** if needed
4. **Parallel work** continues
5. **No idle time** permitted

---

## QUALITY ENFORCEMENT

### Code Standards:
- TypeScript strict mode
- Comprehensive error handling
- Detailed logging
- Performance monitoring
- Security best practices

### Review Process:
1. Self-review by developer
2. Automated testing pass
3. testing-qa-developer validation
4. Performance verification
5. Integration confirmation

---

## AGENT COMMUNICATION

### Handoff Protocol:
```
ai-ml-developer → "Memory core complete" → backend-api-developer
backend-api-developer → "APIs ready" → testing-qa-developer
testing-qa-developer → "Tests passing" → devops-infrastructure-developer
```

### Status Updates:
- Every 4 hours minimum
- Immediate on completion
- Instant on blockers
- Daily summary at 22:00

---

## NEXT PHASE PREPARATION

While Day 8-9 focuses on memory, prepare for:
- **Day 10-11**: Semantic search with Pinecone
- **Day 12-13**: Script analysis engine
- **Day 14**: Talent matching algorithms

---

**Remember**: 
- NO general-purpose agents
- ONLY specialized CastMatch agents
- MAINTAIN quality standards
- DELIVER on schedule

---
**Orchestrator**: CastMatch Workflow System  
**Status**: ACTIVELY COORDINATING  
**Next Check**: 4 hours (04:30 IST)