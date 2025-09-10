/**
 * Auth0 Configuration for Next.js
 * Replaces NextAuth with Auth0 authentication
 */

import { initAuth0 } from '@auth0/nextjs-auth0';

// Auth0 configuration
export default initAuth0({
  auth0: {
    domain: process.env.AUTH0_DOMAIN!,
    clientId: process.env.AUTH0_CLIENT_ID!,
    clientSecret: process.env.AUTH0_CLIENT_SECRET!,
    issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
    baseURL: process.env.AUTH0_BASE_URL || 'http://localhost:3000',
    secret: process.env.AUTH0_SECRET || 'change-this-in-production',
  },
  routes: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    callback: '/api/auth/callback',
    postLogoutRedirect: '/',
  },
  session: {
    rollingDuration: 24 * 60 * 60, // 24 hours
    absoluteDuration: 7 * 24 * 60 * 60, // 7 days
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  },
  authorizationParams: {
    response_type: 'code',
    audience: process.env.AUTH0_AUDIENCE,
    scope: 'openid profile email read:talents write:talents',
  },
  identityClaimFilter: [
    'aud',
    'iss',
    'iat', 
    'exp',
    'sub',
    'azp',
    'at_hash',
    'nonce',
  ],
});

// Custom login URL with parameters
export const getLoginUrl = (returnTo?: string) => {
  const params = new URLSearchParams({
    returnTo: returnTo || '/',
    prompt: 'login',
  });
  return `/api/auth/login?${params.toString()}`;
};

// Custom logout URL
export const getLogoutUrl = (returnTo?: string) => {
  const params = new URLSearchParams({
    returnTo: returnTo || '/',
  });
  return `/api/auth/logout?${params.toString()}`;
};