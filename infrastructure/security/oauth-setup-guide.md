# OAuth Provider Setup Guide for CastMatch

## Table of Contents
1. [Overview](#overview)
2. [Google OAuth 2.0](#google-oauth-20)
3. [Facebook Login](#facebook-login)
4. [Apple Sign In](#apple-sign-in)
5. [LinkedIn OAuth](#linkedin-oauth)
6. [Security Best Practices](#security-best-practices)
7. [Environment Configuration](#environment-configuration)
8. [Troubleshooting](#troubleshooting)

## Overview

This guide provides step-by-step instructions for setting up OAuth authentication providers for the CastMatch platform. Each provider requires specific configuration and has unique requirements.

### Required Information
- **Production URL**: https://castmatch.com
- **Staging URL**: https://staging.castmatch.com
- **Development URL**: http://localhost:3000
- **API Endpoints**: https://api.castmatch.com

## Google OAuth 2.0

### Step 1: Create Google Cloud Project

1. Navigate to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Project Name: `CastMatch Production`
4. Project ID: `castmatch-prod-2025`

### Step 2: Enable APIs

```bash
# Using gcloud CLI
gcloud services enable oauth2.googleapis.com
gcloud services enable people.googleapis.com
gcloud services enable gmail.googleapis.com
```

### Step 3: Configure OAuth Consent Screen

1. Navigate to **APIs & Services > OAuth consent screen**
2. Choose **External** user type
3. Fill in application details:

```yaml
App Information:
  App name: CastMatch
  User support email: support@castmatch.com
  App logo: Upload 120x120px logo
  
App Domain:
  Application home page: https://castmatch.com
  Privacy policy: https://castmatch.com/privacy
  Terms of service: https://castmatch.com/terms
  
Authorized domains:
  - castmatch.com
  - api.castmatch.com
  - app.castmatch.com
  
Developer contact: dev@castmatch.com
```

### Step 4: Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Application type: **Web application**

#### Production Configuration:
```yaml
Name: CastMatch Production
Authorized JavaScript origins:
  - https://castmatch.com
  - https://www.castmatch.com
  - https://app.castmatch.com
  
Authorized redirect URIs:
  - https://castmatch.com/api/auth/callback/google
  - https://app.castmatch.com/api/auth/callback/google
  - https://api.castmatch.com/auth/google/callback
```

#### Staging Configuration:
```yaml
Name: CastMatch Staging
Authorized JavaScript origins:
  - https://staging.castmatch.com
  - https://app-staging.castmatch.com
  
Authorized redirect URIs:
  - https://staging.castmatch.com/api/auth/callback/google
  - https://api-staging.castmatch.com/auth/google/callback
```

#### Development Configuration:
```yaml
Name: CastMatch Development
Authorized JavaScript origins:
  - http://localhost:3000
  - http://localhost:3001
  - http://127.0.0.1:3000
  
Authorized redirect URIs:
  - http://localhost:3000/api/auth/callback/google
  - http://localhost:3001/auth/google/callback
```

### Step 5: Obtain Credentials

After creation, you'll receive:
```bash
GOOGLE_CLIENT_ID=123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-1234567890abcdefghijklmn
```

### Step 6: Configure Scopes

Required scopes for CastMatch:
```javascript
const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];
```

## Facebook Login

### Step 1: Create Facebook App

1. Navigate to [Facebook Developers](https://developers.facebook.com)
2. Click **My Apps > Create App**
3. Choose **Consumer** app type
4. App Name: `CastMatch`
5. App Contact Email: `dev@castmatch.com`

### Step 2: Add Facebook Login Product

1. In App Dashboard, click **Add Product**
2. Select **Facebook Login > Set Up**
3. Choose **Web** platform
4. Site URL: `https://castmatch.com`

### Step 3: Configure Facebook Login Settings

Navigate to **Facebook Login > Settings**:

```yaml
Client OAuth Settings:
  Client OAuth Login: Yes
  Web OAuth Login: Yes
  Force Web OAuth Reauthentication: No
  Use Strict Mode for Redirect URIs: Yes
  Enforce HTTPS: Yes
  Embedded Browser OAuth Login: Yes
  
Valid OAuth Redirect URIs:
  - https://castmatch.com/api/auth/callback/facebook
  - https://staging.castmatch.com/api/auth/callback/facebook
  - http://localhost:3000/api/auth/callback/facebook
  
Allowed Domains for the JavaScript SDK:
  - castmatch.com
  - staging.castmatch.com
  - localhost
  
Deauthorize Callback URL:
  - https://api.castmatch.com/auth/facebook/deauthorize
```

### Step 4: App Review and Permissions

Required permissions:
- `email` (default)
- `public_profile` (default)
- `user_photos` (requires app review)

### Step 5: Obtain Credentials

From **Settings > Basic**:
```bash
FACEBOOK_APP_ID=1234567890123456
FACEBOOK_APP_SECRET=abcdef1234567890abcdef1234567890
```

### Step 6: Configure App Domains

In **Settings > Basic**:
```yaml
App Domains:
  - castmatch.com
  - staging.castmatch.com
  
Privacy Policy URL: https://castmatch.com/privacy
Terms of Service URL: https://castmatch.com/terms
Data Deletion Instructions URL: https://castmatch.com/data-deletion
```

## Apple Sign In

### Step 1: Enroll in Apple Developer Program

1. Navigate to [Apple Developer](https://developer.apple.com)
2. Enroll in Apple Developer Program ($99/year)
3. Wait for approval (24-48 hours)

### Step 2: Create App ID

1. Navigate to **Certificates, Identifiers & Profiles**
2. Click **Identifiers > +**
3. Select **App IDs** > **App**

```yaml
Description: CastMatch
Bundle ID: com.castmatch.app
Capabilities:
  - Sign In with Apple (enable)
```

### Step 3: Create Service ID

1. Click **Identifiers > +**
2. Select **Services IDs**

```yaml
Description: CastMatch Web Service
Identifier: com.castmatch.web
Sign In with Apple: Configure
  Primary App ID: com.castmatch.app
  
Domains and Subdomains:
  - castmatch.com
  - staging.castmatch.com
  - api.castmatch.com
  
Return URLs:
  - https://castmatch.com/api/auth/callback/apple
  - https://staging.castmatch.com/api/auth/callback/apple
  - https://api.castmatch.com/auth/apple/callback
```

### Step 4: Create Private Key

1. Navigate to **Keys > +**
2. Key Name: `CastMatch Auth Key`
3. Enable **Sign in with Apple**
4. Configure:
   - Primary App ID: `com.castmatch.app`
5. Download the key file (`.p8`)

### Step 5: Configuration Values

```bash
APPLE_TEAM_ID=ABCDEF1234
APPLE_KEY_ID=GHIJKL5678
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
-----END PRIVATE KEY-----"
APPLE_CLIENT_ID=com.castmatch.web
```

### Step 6: Generate Client Secret

```javascript
// generate-apple-secret.js
const jwt = require('jsonwebtoken');
const fs = require('fs');

const privateKey = fs.readFileSync('AuthKey_GHIJKL5678.p8');
const teamId = 'ABCDEF1234';
const clientId = 'com.castmatch.web';
const keyId = 'GHIJKL5678';

const headers = {
  kid: keyId,
  typ: undefined
};

const claims = {
  iss: teamId,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 86400 * 180, // 6 months
  aud: 'https://appleid.apple.com',
  sub: clientId
};

const token = jwt.sign(claims, privateKey, {
  algorithm: 'ES256',
  header: headers
});

console.log('Client Secret:', token);
```

## LinkedIn OAuth

### Step 1: Create LinkedIn App

1. Navigate to [LinkedIn Developers](https://www.linkedin.com/developers)
2. Click **Create app**

```yaml
App name: CastMatch
Company: CastMatch Inc.
Privacy policy URL: https://castmatch.com/privacy
Business email: business@castmatch.com
App logo: Upload square logo
```

### Step 2: Configure OAuth 2.0 Settings

Navigate to **Auth** tab:

```yaml
Authorized redirect URLs:
  - https://castmatch.com/api/auth/callback/linkedin
  - https://staging.castmatch.com/api/auth/callback/linkedin
  - http://localhost:3000/api/auth/callback/linkedin
```

### Step 3: Request Access to APIs

Products to request:
- Sign In with LinkedIn
- Share on LinkedIn (optional)
- Marketing Developer Platform (if needed)

### Step 4: Obtain Credentials

From **Auth** tab:
```bash
LINKEDIN_CLIENT_ID=86abcdef123456
LINKEDIN_CLIENT_SECRET=WPL_AP1.abcdefghijklmnop.qrstuvwxyz123456
```

### Step 5: Configure Scopes

```javascript
const LINKEDIN_SCOPES = [
  'r_liteprofile',
  'r_emailaddress',
  'w_member_social' // optional, for sharing
];
```

## Security Best Practices

### 1. Credential Management

```bash
# Use AWS Secrets Manager for production
aws secretsmanager create-secret \
  --name castmatch/oauth/google \
  --secret-string '{
    "client_id":"...",
    "client_secret":"..."
  }'

# Or HashiCorp Vault
vault kv put secret/castmatch/oauth/google \
  client_id="..." \
  client_secret="..."
```

### 2. Environment Isolation

```javascript
// config/oauth.js
const config = {
  production: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID_PROD,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET_PROD,
      callbackURL: 'https://castmatch.com/api/auth/callback/google'
    }
  },
  staging: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID_STAGING,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET_STAGING,
      callbackURL: 'https://staging.castmatch.com/api/auth/callback/google'
    }
  },
  development: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID_DEV,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET_DEV,
      callbackURL: 'http://localhost:3000/api/auth/callback/google'
    }
  }
};

module.exports = config[process.env.NODE_ENV || 'development'];
```

### 3. State Parameter Validation

```javascript
// Prevent CSRF attacks
const crypto = require('crypto');

function generateState() {
  return crypto.randomBytes(32).toString('hex');
}

function validateState(sessionState, receivedState) {
  return crypto.timingSafeEqual(
    Buffer.from(sessionState),
    Buffer.from(receivedState)
  );
}
```

### 4. Token Storage

```javascript
// Use secure, httpOnly cookies
res.cookie('auth_token', token, {
  httpOnly: true,
  secure: true, // HTTPS only
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  signed: true
});
```

### 5. Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter);
```

## Environment Configuration

### Production (.env.production)
```bash
# Google OAuth
GOOGLE_CLIENT_ID=prod-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-prod-secret
GOOGLE_CALLBACK_URL=https://castmatch.com/api/auth/callback/google

# Facebook OAuth
FACEBOOK_APP_ID=prod-app-id
FACEBOOK_APP_SECRET=prod-app-secret
FACEBOOK_CALLBACK_URL=https://castmatch.com/api/auth/callback/facebook

# Apple Sign In
APPLE_TEAM_ID=TEAM123456
APPLE_KEY_ID=KEY789012
APPLE_PRIVATE_KEY_PATH=/secrets/apple/AuthKey.p8
APPLE_CLIENT_ID=com.castmatch.web
APPLE_CALLBACK_URL=https://castmatch.com/api/auth/callback/apple

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=prod-linkedin-id
LINKEDIN_CLIENT_SECRET=prod-linkedin-secret
LINKEDIN_CALLBACK_URL=https://castmatch.com/api/auth/callback/linkedin

# OAuth Settings
OAUTH_STATE_TTL=600000 # 10 minutes
OAUTH_SESSION_SECRET=random-64-character-string
OAUTH_ALLOWED_DOMAINS=castmatch.com,www.castmatch.com
```

### Staging (.env.staging)
```bash
# Similar structure with staging-specific values
```

### Development (.env.local)
```bash
# Google OAuth
GOOGLE_CLIENT_ID=dev-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-dev-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/callback/google

# Other providers with localhost URLs
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Redirect URI Mismatch

**Error**: `redirect_uri_mismatch`

**Solution**:
- Ensure exact match including protocol (http/https)
- Check for trailing slashes
- Verify environment-specific URLs

```bash
# Debug redirect URI
console.log('Expected:', process.env.GOOGLE_CALLBACK_URL);
console.log('Actual:', req.url);
```

#### 2. Invalid Client

**Error**: `invalid_client`

**Solution**:
- Verify client ID and secret
- Check if credentials match environment
- Ensure app is not in sandbox/development mode

#### 3. Scope Not Authorized

**Error**: `invalid_scope`

**Solution**:
- Request only approved scopes
- Submit app for review if additional scopes needed
- Use incremental authorization

#### 4. CORS Issues

**Solution**:
```javascript
app.use(cors({
  origin: [
    'https://castmatch.com',
    'https://staging.castmatch.com',
    'http://localhost:3000'
  ],
  credentials: true
}));
```

#### 5. Session Issues

**Solution**:
```javascript
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: new RedisStore({ client: redisClient }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
}));
```

### Testing OAuth Flow

```bash
# Test Google OAuth
curl -X GET "https://accounts.google.com/o/oauth2/v2/auth?\
client_id=${GOOGLE_CLIENT_ID}&\
redirect_uri=${GOOGLE_CALLBACK_URL}&\
response_type=code&\
scope=openid%20email%20profile&\
state=test123"

# Test token exchange
curl -X POST "https://oauth2.googleapis.com/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "code=${AUTH_CODE}" \
  -d "client_id=${GOOGLE_CLIENT_ID}" \
  -d "client_secret=${GOOGLE_CLIENT_SECRET}" \
  -d "redirect_uri=${GOOGLE_CALLBACK_URL}" \
  -d "grant_type=authorization_code"
```

### Monitoring OAuth

```javascript
// Track OAuth metrics
const promClient = require('prom-client');

const oauthCounter = new promClient.Counter({
  name: 'oauth_attempts_total',
  help: 'Total OAuth authentication attempts',
  labelNames: ['provider', 'status']
});

// Usage
oauthCounter.inc({ provider: 'google', status: 'success' });
oauthCounter.inc({ provider: 'facebook', status: 'failed' });
```

## Scripts

### OAuth Setup Script

```bash
#!/bin/bash
# setup-oauth.sh

echo "Setting up OAuth providers for CastMatch..."

# Check environment
ENV=${1:-development}
echo "Environment: $ENV"

# Load environment variables
source .env.$ENV

# Validate Google OAuth
echo "Validating Google OAuth..."
curl -s "https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=test" \
  | grep -q "invalid_token" && echo "✓ Google OAuth endpoint accessible"

# Validate Facebook OAuth
echo "Validating Facebook OAuth..."
curl -s "https://graph.facebook.com/oauth/access_token?\
client_id=${FACEBOOK_APP_ID}&\
client_secret=${FACEBOOK_APP_SECRET}&\
grant_type=client_credentials" \
  | grep -q "access_token" && echo "✓ Facebook OAuth configured"

# Generate state secret if not exists
if [ -z "$OAUTH_SESSION_SECRET" ]; then
  echo "Generating session secret..."
  SECRET=$(openssl rand -base64 48)
  echo "OAUTH_SESSION_SECRET=$SECRET" >> .env.$ENV
  echo "✓ Session secret generated"
fi

echo "OAuth setup complete!"
```

---

**Document Version:** 1.0  
**Last Updated:** 2025-09-02  
**Maintained By:** CastMatch Infrastructure Team