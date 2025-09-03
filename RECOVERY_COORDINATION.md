# CASTMATCH PLATFORM RECOVERY COORDINATION

## IMMEDIATE ACTION ITEMS BY AGENT

### 1. DEVOPS INFRASTRUCTURE DEVELOPER
**PRIORITY: CRITICAL - START IMMEDIATELY**

#### Task 1: Fix Database Permissions (BLOCKING ALL OTHER WORK)
```bash
# Connect to PostgreSQL container
docker exec -it casting-ai-postgres-1 psql -U postgres

# Inside PostgreSQL, run:
GRANT ALL PRIVILEGES ON DATABASE casting_db TO postgres;
GRANT ALL ON SCHEMA public TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
\q

# Verify fix
npx prisma db push --accept-data-loss
```

#### Task 2: Restart Services
```bash
# Backend API
cd /Users/Aditya/Desktop/casting-ai
npm run dev

# Frontend (new terminal)
cd /Users/Aditya/Desktop/casting-ai/frontend
npm run dev
```

#### Task 3: Monitor Logs
```bash
# Check Docker containers
docker ps
docker logs casting-ai-postgres-1 --tail 50
docker logs casting-ai-redis-1 --tail 50

# Monitor application logs
tail -f logs/application.log
```

**SUCCESS METRICS:**
- No Prisma P1010 errors
- Backend running on http://localhost:3000
- Frontend running on http://localhost:3001

---

### 2. BACKEND API DEVELOPER
**PRIORITY: HIGH - START AFTER DATABASE FIX**

#### Task 1: Verify Core Services
```bash
# Test database connection
curl http://localhost:3000/health

# Test API endpoints
curl http://localhost:3000/api/talents
curl http://localhost:3000/api/auditions
curl http://localhost:3000/api/users
```

#### Task 2: Validate New Services
```typescript
// Check these service files are operational:
src/services/talent.service.ts
src/services/ai-matching.service.ts
src/services/calendar.service.ts
src/services/scheduling.service.ts
src/services/embedding.service.ts
src/services/vector.service.ts
src/services/email.service.ts
```

#### Task 3: Fix Any Backend Issues
- Check Redis connection in src/config/redis.ts
- Verify email templates in src/templates/audition-emails.ts
- Test talent routes in src/routes/talent.routes.ts

**SUCCESS METRICS:**
- All endpoints return 200 status
- No TypeScript compilation errors
- Services connecting to external APIs

---

### 3. FRONTEND UI DEVELOPER  
**PRIORITY: HIGH - START AFTER BACKEND RUNNING**

#### Task 1: Verify Dashboard Access
```bash
# Test each dashboard route
http://localhost:3001/dashboard
http://localhost:3001/talents
http://localhost:3001/auditions
```

#### Task 2: Check New Components
```typescript
// Verify these components render:
frontend/components/talent/*
frontend/components/auditions/*
frontend/components/layout/Header.tsx
frontend/components/ui/skeleton.tsx
frontend/components/ui/collapsible.tsx
frontend/components/ui/toaster.tsx
```

#### Task 3: Test API Client
```typescript
// Verify API client connections in:
frontend/lib/api-client.ts
frontend/hooks/*
frontend/auth.ts
```

**SUCCESS METRICS:**
- All dashboards accessible
- No React hydration errors
- API calls successful from UI

---

### 4. TESTING QA DEVELOPER
**PRIORITY: MEDIUM - START AFTER SERVICES STABLE**

#### Task 1: Run Test Suites
```bash
# Unit tests
npm test

# Integration tests  
npm run test:integration

# E2E tests
npm run test:e2e
```

#### Task 2: Validate Critical Paths
- User registration/login flow
- Talent profile creation
- Audition scheduling
- AI matching functionality

#### Task 3: Performance Testing
```bash
# Run load tests
npm run test:load

# Check response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/talents
```

**SUCCESS METRICS:**
- >90% test pass rate
- No critical failures
- Response times <500ms

---

### 5. AI/ML DEVELOPER
**PRIORITY: MEDIUM - START AFTER BACKEND STABLE**

#### Task 1: Verify Vector Database
```typescript
// Check Pinecone connection in:
src/services/vector.service.ts
src/services/embedding.service.ts
```

#### Task 2: Test AI Services
```bash
# Test embedding generation
curl -X POST http://localhost:3000/api/ai/embed \
  -H "Content-Type: application/json" \
  -d '{"text": "Test actor profile"}'

# Test AI matching
curl -X POST http://localhost:3000/api/ai/match \
  -H "Content-Type: application/json" \
  -d '{"roleId": "123", "limit": 10}'
```

#### Task 3: Validate Job Queue
```typescript
// Check job processing in:
src/jobs/*
src/services/embedding-job.service.ts
```

**SUCCESS METRICS:**
- Vector operations successful
- AI matching returns results
- Job queue processing

---

### 6. INTEGRATION WORKFLOW DEVELOPER
**PRIORITY: LOW - START AFTER CORE FEATURES VERIFIED**

#### Task 1: Verify External Integrations
```bash
# Check OAuth configuration
curl http://localhost:3000/api/auth/google
curl http://localhost:3000/api/auth/linkedin

# Test email service
curl -X POST http://localhost:3000/api/test-email
```

#### Task 2: Validate Calendar Integration
```typescript
// Check calendar service in:
src/services/calendar.service.ts
src/services/scheduling.service.ts
```

#### Task 3: Test Webhooks
```bash
# Test webhook endpoints
curl -X POST http://localhost:3000/api/webhooks/calendar
curl -X POST http://localhost:3000/api/webhooks/payment
```

**SUCCESS METRICS:**
- OAuth flows working
- Emails delivering
- Calendar sync functional

---

## COORDINATION TIMELINE

### T+0 to T+15 minutes
- DevOps: Fix database permissions
- All agents: Stand by for database confirmation

### T+15 to T+30 minutes  
- DevOps: Restart services
- Backend: Begin API verification
- Frontend: Prepare for UI testing

### T+30 to T+60 minutes
- Backend & Frontend: Parallel verification
- Testing: Prepare test suites
- AI/ML: Check configurations

### T+60 to T+90 minutes
- Testing: Run all test suites
- AI/ML: Test vector operations
- Integration: Begin integration checks

### T+90 to T+120 minutes
- All agents: Final validation
- DevOps: Commit changes
- Generate status report

---

## COMMUNICATION CHECKPOINTS

### Checkpoint 1 (15 min)
**DevOps reports:** "Database permissions fixed. Services restarting."

### Checkpoint 2 (30 min)  
**Backend reports:** "API operational. All endpoints responding."
**Frontend reports:** "UI accessible. Dashboards loading."

### Checkpoint 3 (60 min)
**Testing reports:** "Test suite results: X% passing."
**AI/ML reports:** "Vector DB connected. AI services operational."

### Checkpoint 4 (90 min)
**Integration reports:** "External services verified."
**All agents:** "System recovery complete."

---

## CONTINGENCY PLANS

### If Database Fix Fails:
```bash
# Alternative: Use trust authentication
docker exec -it casting-ai-postgres-1 bash
echo "host all all 0.0.0.0/0 trust" >> /var/lib/postgresql/data/pg_hba.conf
pg_ctl reload
```

### If Services Won't Start:
```bash
# Kill existing processes
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9
lsof -i :3001 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Clean install
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### If Tests Fail Critically:
1. Isolate failing component
2. Create hotfix branch
3. Apply minimal fix
4. Re-run affected tests only

---

## POST-RECOVERY CHECKLIST

- [ ] All services running without errors
- [ ] Database accepting connections
- [ ] API endpoints responding
- [ ] UI dashboards accessible  
- [ ] Test suite >90% passing
- [ ] No critical errors in logs
- [ ] Changes committed to git
- [ ] Recovery documented
- [ ] Monitoring re-enabled (optional)
- [ ] Team notified of completion

---

## SUCCESS CRITERIA

System is considered RECOVERED when:
1. PostgreSQL accepts connections without P1010 error
2. Backend API responds on port 3000
3. Frontend accessible on port 3001  
4. All dashboards (actor/casting/producer) load successfully
5. API endpoints return 200 status codes
6. Test suite passes with >90% success rate
7. No critical errors appear in application logs
8. All uncommitted changes reviewed and committed

---

## RECOVERY COMPLETION REPORT TEMPLATE

```
CASTMATCH RECOVERY STATUS REPORT
Date: [DATE]
Duration: [TIME]

INFRASTRUCTURE: ✓/✗
- PostgreSQL: [STATUS]
- Redis: [STATUS]  
- Docker: [STATUS]

SERVICES: ✓/✗
- Backend API: [STATUS]
- Frontend UI: [STATUS]
- AI Services: [STATUS]

TESTING: ✓/✗
- Unit Tests: [PASS_RATE]%
- Integration: [PASS_RATE]%
- E2E Tests: [PASS_RATE]%

ISSUES RESOLVED:
1. [ISSUE_1]
2. [ISSUE_2]

REMAINING WORK:
1. [TASK_1]
2. [TASK_2]

RECOVERY COMPLETE: YES/NO
```