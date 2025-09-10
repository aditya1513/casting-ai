# CastMatch Agent Task Assignments - Week 2, Day 8
## Generated: 2025-09-05 20:02 UTC

## CRITICAL BLOCKERS (P0 - Fix Immediately)

### 1. @agent-ai-ml-developer
**CRITICAL ISSUE**: Python AI service failing due to scipy compilation error (missing Fortran)
```bash
# File: python-ai-service/requirements.txt
# Action: Replace scipy==1.12.0 with scipy==1.11.4
# Also add: numpy<2.0 to prevent compatibility issues
```
**Time Estimate**: 30 minutes
**Acceptance Criteria**:
- Python AI service starts without scipy build errors
- Port 8000 conflict resolved
- Health endpoint responds at http://localhost:8000/health

### 2. @agent-devops-infrastructure-developer  
**CRITICAL ISSUE**: Port 8000 already in use
```bash
# Commands to execute:
lsof -i :8000  # Find process
kill -9 <PID>  # Kill process
# Update docker-compose.yml to use port 8001 for Python service
```
**Time Estimate**: 15 minutes
**Dependencies**: Must complete before AI/ML developer can test

---

## HIGH PRIORITY TASKS (P1 - Complete Today)

### 3. @agent-frontend-ui-developer
**Issue**: Infinite loop in chat streaming
**Files to Fix**:
- `/Users/Aditya/Desktop/casting-ai/python-ai-service/frontend/app/chat-v2/page.tsx`
- `/Users/Aditya/Desktop/casting-ai/python-ai-service/frontend/lib/websocket-context.tsx`

**Specific Changes**:
```typescript
// Add proper cleanup and error boundaries
// Implement exponential backoff for reconnection
// Add maximum retry limits
```
**Time Estimate**: 2 hours
**Acceptance Criteria**:
- No infinite loops in console
- WebSocket reconnects gracefully
- Chat messages stream properly

### 4. @agent-backend-api-developer
**Task**: Create Memory API endpoints
**Files to Create**:
- `/Users/Aditya/Desktop/casting-ai/python-ai-service/src/api/routes/memory.routes.ts`
- `/Users/Aditya/Desktop/casting-ai/python-ai-service/src/services/memory-crud.service.ts`

**Endpoints Required**:
```typescript
POST   /api/memory/store
GET    /api/memory/retrieve/:userId
DELETE /api/memory/clear/:userId
GET    /api/memory/search?query=
```
**Time Estimate**: 3 hours
**Dependencies**: Database must be accessible

### 5. @agent-testing-qa-developer
**Task**: Increase test coverage from 45% to 80%
**Priority Files**:
1. `/Users/Aditya/Desktop/casting-ai/python-ai-service/tests/unit/services/ai-chat.service.test.ts`
2. `/Users/Aditya/Desktop/casting-ai/python-ai-service/tests/integration/api-endpoints.test.ts`
3. `/Users/Aditya/Desktop/casting-ai/python-ai-service/tests/e2e/critical-user-journeys.spec.ts`

**Coverage Targets**:
- Unit tests: 90% coverage
- Integration tests: 75% coverage  
- E2E tests: Core user journeys
**Time Estimate**: 4 hours

---

## DESIGN TRACK TASKS (P1 - Parallel Work)

### 6. @agent-visual-systems-architect
**Task**: Finalize design tokens
**Files**:
- `/Users/Aditya/Desktop/casting-ai/python-ai-service/design-system/tokens/tokens.json`
- `/Users/Aditya/Desktop/casting-ai/python-ai-service/design-system/themes/dark.json`

**Token Categories**:
```json
{
  "colors": { "primary", "secondary", "error", "success" },
  "spacing": { "xs": "4px", "sm": "8px", "md": "16px" },
  "typography": { "sizes", "weights", "lineHeights" },
  "shadows": { "sm", "md", "lg" },
  "borderRadius": { "sm", "md", "lg" }
}
```
**Time Estimate**: 2 hours
**Blocks**: All frontend UI work

### 7. @agent-typography-content-designer
**Task**: Typography system for chat
**Files**:
- `/Users/Aditya/Desktop/casting-ai/python-ai-service/design-system/typography/scales.json`
- `/Users/Aditya/Desktop/casting-ai/python-ai-service/frontend/components/chat/typography.module.css`

**Requirements**:
- Base size: 16px
- Scale: 1.25 (Major Third)
- Chat message hierarchy
- Code block styling
**Time Estimate**: 2 hours
**Dependencies**: Needs design tokens

### 8. @agent-layout-grid-engineer
**Task**: 8-point grid system
**Files**:
- `/Users/Aditya/Desktop/casting-ai/python-ai-service/frontend/app/styles/grid.module.css`
- `/Users/Aditya/Desktop/casting-ai/python-ai-service/frontend/components/layout/grid/GridContainer.tsx`

**Grid Specs**:
```css
--grid-unit: 8px;
--container-max: 1280px;
--columns: 12;
--gutter: calc(var(--grid-unit) * 3);
```
**Time Estimate**: 3 hours

### 9. @agent-motion-ui-specialist
**Task**: Chat animations
**Files**:
- `/Users/Aditya/Desktop/casting-ai/python-ai-service/frontend/components/chat/animations.tsx`
- `/Users/Aditya/Desktop/casting-ai/python-ai-service/frontend/app/styles/transitions.css`

**Animations Required**:
- Message fade-in (200ms)
- Typing indicator pulse
- Loading skeleton shimmer
- Page transitions (300ms)
**Time Estimate**: 3 hours
**Dependencies**: After layout grid

### 10. @agent-interaction-design-specialist
**Task**: Micro-interactions
**Files**:
- `/Users/Aditya/Desktop/casting-ai/python-ai-service/frontend/components/ui/interactions/Button.tsx`
- `/Users/Aditya/Desktop/casting-ai/python-ai-service/frontend/app/styles/interactions.css`

**Interactions**:
- Button hover/press states
- Input focus animations
- Checkbox/radio transitions
- Tooltip appearances
**Time Estimate**: 2 hours

---

## MEDIUM PRIORITY TASKS (P2 - Complete by Tomorrow)

### 11. @agent-integration-workflow-developer
**Tasks**:
1. Google Calendar sync (`/src/integrations/calendar.service.ts`)
2. Email notifications (`/src/integrations/email.service.ts`)
3. SMS notifications (`/src/integrations/sms.service.ts`)

**Time Estimate**: 4 hours total
**Dependencies**: OAuth must be configured

### 12. @agent-ux-wireframe-architect
**Tasks**:
1. Talent search user flows
2. Advanced filter wireframes
3. Casting director dashboard

**Deliverables**:
- `/Users/Aditya/Desktop/casting-ai/python-ai-service/.claude/design/user-flows/talent-search.md`
- `/Users/Aditya/Desktop/casting-ai/python-ai-service/.claude/design/wireframes/filters.svg`

**Time Estimate**: 3 hours

### 13. @agent-design-research-analyst
**Task**: Competitor analysis
**Platforms to Analyze**:
- Casting Networks
- Backstage
- Actors Access
- StarNow

**Deliverable**: `/Users/Aditya/Desktop/casting-ai/python-ai-service/.claude/design/competitor-analysis.md`
**Time Estimate**: 2 hours

### 14. @agent-design-review-qa
**Tasks**:
1. Accessibility audit of chat UI
2. Create quality gates checklist
3. Review color contrast ratios

**Deliverables**:
- `/Users/Aditya/Desktop/casting-ai/python-ai-service/.claude/design/quality-gates.md`
- `/Users/Aditya/Desktop/casting-ai/python-ai-service/.claude/design/accessibility-report.md`

**Time Estimate**: 3 hours

---

## DEPENDENCY CHAINS

### Critical Path 1: AI Service Recovery
1. DevOps kills port 8000 (15 min)
2. AI/ML fixes scipy (30 min)  
3. AI/ML implements search (2 hrs)
4. Backend creates memory APIs (3 hrs)
5. Frontend integrates (2 hrs)

### Critical Path 2: Design System
1. Visual Systems completes tokens (2 hrs)
2. Typography defines scales (2 hrs)
3. Layout creates grid (3 hrs)
4. Motion adds animations (3 hrs)
5. Frontend implements (4 hrs)

### Critical Path 3: Testing
1. Testing writes unit tests (2 hrs)
2. Testing adds integration tests (2 hrs)
3. Testing creates E2E tests (2 hrs)
4. Achieves 80% coverage

---

## SUCCESS METRICS FOR TODAY

✅ Python AI service running without errors
✅ Port conflicts resolved
✅ Chat streaming fixed (no loops)
✅ Memory API endpoints created
✅ Design tokens finalized
✅ Test coverage > 65%
✅ Grid system implemented
✅ Typography scales defined

---

## AUTOMATION TRIGGERS

### On scipy fix completion:
- Auto-test semantic search
- Verify vector DB connection
- Run health checks

### On design token completion:
- Notify all frontend devs
- Update Storybook
- Generate CSS variables

### On test coverage milestone:
- Generate coverage report
- Update dashboard
- Notify team lead

---

## COORDINATION NOTES

1. **AI/ML and DevOps** must coordinate on port fix IMMEDIATELY
2. **Visual Systems** blocks all UI work - prioritize token completion
3. **Frontend** should prepare for design system integration while waiting
4. **Backend** can work independently on memory APIs
5. **Testing** can start unit tests immediately

## ESCALATION PROTOCOLS

If blocked for > 30 minutes:
1. Check dependency chain
2. Reassign to unblocked task
3. Document blocker
4. Notify orchestrator

If critical error:
1. Stop current work
2. Document error state
3. Implement rollback
4. Alert team

---

Generated by Workflow Orchestrator
CastMatch Development - Week 2, Day 8