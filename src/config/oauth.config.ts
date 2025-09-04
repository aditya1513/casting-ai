/**
 * OAuth Configuration
 * Configuration for OAuth providers (Google, GitHub)
 */

export const oauthConfig = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5002/api/auth/google/callback',
    authorizationURL: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenURL: 'https://oauth2.googleapis.com/token',
    userInfoURL: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scopes: ['openid', 'email', 'profile'],
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    redirectUri: process.env.GITHUB_REDIRECT_URI || 'http://localhost:5002/api/auth/github/callback',
    authorizationURL: 'https://github.com/login/oauth/authorize',
    tokenURL: 'https://github.com/login/oauth/access_token',
    userInfoURL: 'https://api.github.com/user',
    emailsURL: 'https://api.github.com/user/emails',
    scopes: ['user:email'],
  },
};

/**
 * Generate OAuth authorization URL
 */
export function generateAuthorizationUrl(provider: 'google' | 'github', state: string): string {
  const config = oauthConfig[provider];
  
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state,
    ...(provider === 'google' && { access_type: 'offline', prompt: 'consent' }),
  });

  return `${config.authorizationURL}?${params.toString()}`;
}

/**
 * Validate OAuth configuration
 */
export function validateOAuthConfig(provider: 'google' | 'github'): boolean {
  const config = oauthConfig[provider];
  return !!(config.clientId && config.clientSecret);
}