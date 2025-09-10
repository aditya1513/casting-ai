# URGENT: Backend API Priority Shift Required

## @backend-api-developer - IMMEDIATE ACTION

### CRITICAL BLOCKER ALERT
Frontend team is BLOCKED at 40% progress waiting for `/api/talents` endpoint.

### IMMEDIATE ACTIONS (Complete within 15 minutes):

1. **STOP** current work on `/api/projects/route.ts`
2. **SWITCH** to `/app/api/talents/route.ts` immediately

### Required Implementation:

```typescript
// Minimal viable /api/talents endpoint
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  
  // If DB not ready, use mock data
  const talents = await getTalentsWithFallback(page, limit);
  
  return NextResponse.json({
    data: talents,
    pagination: {
      page,
      limit,
      total: talents.length
    }
  });
}
```

### API Contract to Share with Frontend:

```typescript
interface TalentResponse {
  data: Talent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

interface Talent {
  id: string;
  name: string;
  email: string;
  skills: string[];
  experience: number;
  portfolio: string;
  availability: 'available' | 'busy' | 'unavailable';
}
```

### Mock Data Fallback:

```typescript
const MOCK_TALENTS: Talent[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    skills: ['Acting', 'Voice Over', 'Motion Capture'],
    experience: 5,
    portfolio: 'https://portfolio.example.com/john',
    availability: 'available'
  },
  // Add 10-15 mock talents for testing
];
```

## Timeline:
- **NOW**: Switch to talents endpoint
- **+5 min**: Implement basic GET with mock data
- **+10 min**: Share TypeScript interfaces with Frontend
- **+15 min**: Test and confirm endpoint is working

## Success Criteria:
- [ ] GET /api/talents returns 200 status
- [ ] Pagination parameters work
- [ ] TypeScript interfaces shared
- [ ] Frontend unblocked and can continue

---
**Coordination Time**: 03:52 AM
**Expected Completion**: 04:07 AM
**Frontend Dependency Resolved By**: 04:10 AM