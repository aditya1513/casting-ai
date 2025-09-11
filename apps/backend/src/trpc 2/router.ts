/**
 * Main tRPC Router
 * Combines all API procedures into a single router
 */

import { router } from './trpc';
import { healthRouter } from './routers/health';
import { talentsRouter } from './routers/talents';
import { dashboardRouter } from './routers/dashboard';
// import { aiRouter } from './routers/ai';  // Temporarily disabled - requires OpenAI key
// import { agentsRouter } from './routers/agents';  // Temporarily disabled - requires OpenAI key
import { simpleChatRouter } from './routers/simple-chat';

export const appRouter = router({
  health: healthRouter,
  talents: talentsRouter,
  dashboard: dashboardRouter,
  // ai: aiRouter,  // Temporarily disabled - requires OpenAI key
  // agents: agentsRouter,  // Temporarily disabled - requires OpenAI key
  simpleChat: simpleChatRouter, // NEW: Simple chat endpoint
});

export type AppRouter = typeof appRouter;