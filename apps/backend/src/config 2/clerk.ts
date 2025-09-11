/**
 * Clerk Configuration
 * Initialize Clerk client with environment variables
 */

import { createClerkClient } from '@clerk/backend';
import { config } from './config';

// Initialize Clerk client if configuration is available
export const clerkClient = config.clerk ? createClerkClient({
  secretKey: config.clerk.secretKey,
  publishableKey: config.clerk.publishableKey,
}) : null;

// Export Clerk configuration
export const clerkConfig = config.clerk ? {
  secretKey: config.clerk.secretKey,
  publishableKey: config.clerk.publishableKey,
  signInUrl: config.clerk.signInUrl,
  signUpUrl: config.clerk.signUpUrl,
  afterSignInUrl: config.clerk.afterSignInUrl,
  afterSignUpUrl: config.clerk.afterSignUpUrl,
} : null;

// Guard function to ensure client is available
export const ensureClerkClient = () => {
  if (!clerkClient) {
    throw new Error('Clerk client not initialized. Check CLERK_SECRET_KEY and CLERK_PUBLISHABLE_KEY environment variables.');
  }
  return clerkClient;
};

export default clerkClient;