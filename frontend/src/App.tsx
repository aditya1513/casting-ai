import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';

// Import the AppRouter type
import type { AppRouter } from './types/trpc';

// Create tRPC React hooks
const trpc = createTRPCReact<AppRouter>();

// tRPC client configuration
const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3001/api/trpc',
    }),
  ],
});

function TalentList() {
  // Test the talents.list endpoint
  const { data, isLoading, error } = trpc.talents.list.useQuery({
    page: 1,
    limit: 5
  });

  if (isLoading) return <div className="text-white">Loading talents...</div>;
  if (error) return <div className="text-red-400">Error: {error.message}</div>;

  return (
    <div className="text-white">
      <h2 className="text-2xl font-bold mb-4">Real Talent Data from Backend:</h2>
      {data?.data?.map((talent: any) => (
        <div key={talent.id} className="bg-slate-800 p-4 mb-4 rounded-lg">
          <h3 className="text-xl font-semibold text-blue-400">{talent.name}</h3>
          <p className="text-gray-300">Location: {talent.location}</p>
          <p className="text-gray-300">Experience: {talent.experience}</p>
          <p className="text-gray-300">Languages: {talent.languages?.join(', ')}</p>
          <p className="text-gray-300">Skills: {talent.skills?.join(', ')}</p>
          <p className="text-gray-300">Rating: {talent.rating}/5</p>
        </div>
      ))}
      <div className="text-sm text-gray-400 mt-4">
        Total: {data?.pagination?.total} | Page: {data?.pagination?.page} | Has Next: {data?.pagination?.hasNext ? 'Yes' : 'No'}
      </div>
    </div>
  );
}

function HealthCheck() {
  const { data, isLoading, error } = trpc.health.check.useQuery();
  
  if (isLoading) return <div className="text-white">Checking backend health...</div>;
  if (error) return <div className="text-red-400">Backend Error: {error.message}</div>;

  return (
    <div className="bg-green-900 p-4 rounded-lg mb-6">
      <h2 className="text-green-400 font-bold">✅ Backend Status: {data?.status}</h2>
      <p className="text-green-300">Server: {data?.server}</p>
      <p className="text-green-300">Database: {data?.database}</p>
      <p className="text-green-300">Uptime: {data?.uptime?.toFixed(2)}s</p>
    </div>
  );
}

function App() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-slate-900 p-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-white mb-8">
              🎬 CastMatch - Backend Integration Test
            </h1>
            
            <HealthCheck />
            <TalentList />
            
            <div className="mt-8 text-sm text-gray-500">
              <p>Testing tRPC connection between React frontend (port 3000) and Hono backend (port 3001)</p>
            </div>
          </div>
        </div>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export default App;