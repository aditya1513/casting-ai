/**
 * tRPC Client Configuration for Frontend
 * Type-safe API calls to Hono + tRPC backend
 */

import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../../src/trpc/router';

// Create tRPC React hooks
export const trpc = createTRPCReact<AppRouter>();

// tRPC client configuration
export function createTRPCClient(getToken: () => string | null) {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: 'http://localhost:3001/api/trpc',
        async headers() {
          const token = getToken();
          return {
            authorization: token ? `Bearer ${token}` : '',
          };
        },
      }),
    ],
  });
}
