/**
 * tRPC Client Configuration for Remix Frontend
 * Type-safe API calls with Clerk authentication
 */

import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import { useAuth } from '@clerk/remix';
import type { AppRouter } from '../../../src/trpc/router';

// Create tRPC React hooks
export const trpc = createTRPCReact<AppRouter>();

// tRPC client instance
export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: 'http://localhost:3001/api/trpc',
      async headers() {
        // This will be called on each request
        // We'll need to get the token from Clerk context
        return {};
      },
    }),
  ],
});

// Hook to create authenticated tRPC client
export function useTRPCClient() {
  const { getToken } = useAuth();
  
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: 'http://localhost:3001/api/trpc',
        async headers() {
          const token = await getToken();
          return {
            authorization: token ? `Bearer ${token}` : '',
          };
        },
      }),
    ],
  });
}