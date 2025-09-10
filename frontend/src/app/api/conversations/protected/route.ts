import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken, withApiAuthRequired } from '@auth0/nextjs-auth0';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Protected route that uses Auth0 token to call backend agents
async function protectedHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const { content, projectId } = body;

    // Get the access token from Auth0
    const { accessToken } = await getAccessToken(req);

    console.log('Making authenticated request to backend with token:', accessToken ? 'Present' : 'Missing');

    // Call the backend's protected endpoint with Auth0 token
    const response = await fetch(`${BACKEND_URL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        message: content,
        projectId,
        preferences: {
          useRealAgents: true
        }
      }),
      signal: AbortSignal.timeout(15000) // 15 second timeout
    });

    if (!response.ok) {
      console.error('Backend request failed:', response.status, response.statusText);
      const errorData = await response.text();
      console.error('Error response:', errorData);
      
      return NextResponse.json(
        { 
          error: 'Backend service unavailable', 
          details: `Status: ${response.status}`,
          fallback: true 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      ...data,
      source: 'authenticated_backend_agents',
      authenticated: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Protected chat API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Authentication or service error',
        details: error instanceof Error ? error.message : 'Unknown error',
        fallback: true 
      },
      { status: 500 }
    );
  }
}

export const POST = withApiAuthRequired(protectedHandler);