/**
 * tRPC Client Configuration for Remix Frontend
 */

import { createTRPCClient, httpBatchLink, loggerLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../../backend/src/trpc/router';

// Create tRPC React hooks
export const trpc = createTRPCReact<AppRouter>();

// tRPC client configuration
export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    // Logger link for development
    loggerLink({
      enabled: opts =>
        process.env.NODE_ENV === 'development' ||
        (opts.direction === 'down' && opts.result instanceof Error),
    }),
    // HTTP batch link
    httpBatchLink({
      url: 'http://localhost:3001/api/trpc',
      headers: () => {
        const headers: Record<string, string> = {};

        // Add authorization header if available
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('auth_token');
          if (token) {
            headers.Authorization = `Bearer ${token}`;
          }
        }

        return headers;
      },
    }),
  ],
});

// Utility function for server-side tRPC calls
export const createServerTRPCClient = () => {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: 'http://localhost:3001/api/trpc',
      }),
    ],
  });
};
