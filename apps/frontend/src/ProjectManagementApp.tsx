import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProjectManagement from '@/components/ProjectManagement';
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

// Mock user for now (will replace with real auth)
const mockUser = {
  firstName: 'Rajesh',
  lastName: 'Kumar',
  role: 'Casting Director',
  email: 'rajesh@castmatch.com',
};

function Header() {
  return (
    <header className="border-b bg-card sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="text-2xl font-bold text-primary">🎬 CastMatch</div>
            <span className="text-muted-foreground">|</span>
            <h1 className="text-xl font-semibold">Project Management</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="relative">
              <MessageCircle className="h-6 w-6" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive rounded-full text-xs text-destructive-foreground flex items-center justify-center">
                3
              </span>
            </Button>
            <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-semibold">RK</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function ProjectManagementDashboard() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <ProjectManagement />
      </main>
    </div>
  );
}

// Main app with tRPC provider
export default function ProjectManagementApp() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ProjectManagementDashboard />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
