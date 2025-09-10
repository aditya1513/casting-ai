# 🚨🚨 EMERGENCY: TALENTS API NOT CREATED 🚨🚨

## @backend-api-developer - CRITICAL INTERVENTION REQUIRED

### EMERGENCY ALERT
**THE /api/talents ENDPOINT DOES NOT EXIST**
Frontend has been blocked for 14 minutes waiting for this!

## IMMEDIATE ACTION - CREATE THIS FILE NOW:

### File: `/app/api/talents/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

// MOCK DATA - Replace with database later
const MOCK_TALENTS = [
  {
    id: '1',
    name: 'Emma Stone',
    email: 'emma@example.com',
    skills: ['Acting', 'Comedy', 'Drama'],
    experience: 8,
    portfolio: 'https://portfolio.example.com/emma',
    availability: 'available',
    profileImage: 'https://via.placeholder.com/150',
    rating: 4.8
  },
  {
    id: '2',
    name: 'Ryan Gosling',
    email: 'ryan@example.com',
    skills: ['Acting', 'Action', 'Drama'],
    experience: 10,
    portfolio: 'https://portfolio.example.com/ryan',
    availability: 'busy',
    profileImage: 'https://via.placeholder.com/150',
    rating: 4.9
  },
  {
    id: '3',
    name: 'Zendaya Coleman',
    email: 'zendaya@example.com',
    skills: ['Acting', 'Singing', 'Dance'],
    experience: 6,
    portfolio: 'https://portfolio.example.com/zendaya',
    availability: 'available',
    profileImage: 'https://via.placeholder.com/150',
    rating: 4.7
  },
  {
    id: '4',
    name: 'Michael B. Jordan',
    email: 'michael@example.com',
    skills: ['Acting', 'Action', 'Voice Over'],
    experience: 9,
    portfolio: 'https://portfolio.example.com/michael',
    availability: 'available',
    profileImage: 'https://via.placeholder.com/150',
    rating: 4.8
  },
  {
    id: '5',
    name: 'Anya Taylor-Joy',
    email: 'anya@example.com',
    skills: ['Acting', 'Drama', 'Period Pieces'],
    experience: 5,
    portfolio: 'https://portfolio.example.com/anya',
    availability: 'unavailable',
    profileImage: 'https://via.placeholder.com/150',
    rating: 4.6
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const skills = searchParams.get('skills')?.split(',') || [];
    
    // Filter talents based on search
    let filteredTalents = MOCK_TALENTS;
    
    if (search) {
      filteredTalents = filteredTalents.filter(talent => 
        talent.name.toLowerCase().includes(search.toLowerCase()) ||
        talent.email.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (skills.length > 0) {
      filteredTalents = filteredTalents.filter(talent =>
        skills.some(skill => talent.skills.includes(skill))
      );
    }
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTalents = filteredTalents.slice(startIndex, endIndex);
    
    return NextResponse.json({
      success: true,
      data: paginatedTalents,
      pagination: {
        page,
        limit,
        total: filteredTalents.length,
        totalPages: Math.ceil(filteredTalents.length / limit)
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch talents' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Mock creation - just return the new talent with an ID
    const newTalent = {
      id: String(MOCK_TALENTS.length + 1),
      ...body,
      createdAt: new Date().toISOString()
    };
    
    return NextResponse.json({
      success: true,
      data: newTalent
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create talent' },
      { status: 500 }
    );
  }
}
```

## THEN CREATE TYPES FILE:

### File: `/types/talent.ts`

```typescript
export interface Talent {
  id: string;
  name: string;
  email: string;
  skills: string[];
  experience: number;
  portfolio: string;
  availability: 'available' | 'busy' | 'unavailable';
  profileImage?: string;
  rating?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TalentResponse {
  success: boolean;
  data: Talent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

## SHARE WITH FRONTEND IMMEDIATELY:

Send this message to @frontend-ui-developer:

```
TALENTS API READY!

Endpoint: GET /api/talents
Query params:
- page (number)
- limit (number)  
- search (string)
- skills (comma-separated string)

Example: /api/talents?page=1&limit=10&search=emma&skills=Acting,Drama

TypeScript types available in /types/talent.ts
```

## VERIFICATION:
```bash
# Test the endpoint
curl http://localhost:3000/api/talents?page=1&limit=5
```

---
**EMERGENCY TIME**: 03:59 AM
**MUST BE COMPLETE BY**: 04:05 AM
**FRONTEND WAITING SINCE**: 03:45 AM (14 MINUTES!)