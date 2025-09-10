# Google OAuth App Setup for CastMatch

## Prerequisites
- Google Cloud Console access
- CastMatch domain ownership verification
- Production domain configured

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a Project" → "New Project"
3. Project Name: `castmatch-production`
4. Organization: Select appropriate organization
5. Click "Create"

## Step 2: Enable Google+ API

1. Navigate to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click "Enable"

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" (for public app)
3. Fill in required information:
   - App name: `CastMatch`
   - User support email: `support@castmatch.com`
   - Developer contact email: `tech@castmatch.com`
   - App domain: `https://app.castmatch.com`
   - Privacy policy: `https://app.castmatch.com/privacy`
   - Terms of service: `https://app.castmatch.com/terms`

4. Add authorized domains:
   - `castmatch.com`
   - `app.castmatch.com`

5. Scopes to add:
   - `email`
   - `profile`
   - `openid`

## Step 4: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. Application type: "Web application"
4. Name: `CastMatch Production App`

5. Add Authorized redirect URIs:
   ```
   https://app.castmatch.com/api/auth/callback/google
   https://castmatch.com/api/auth/callback/google
   http://localhost:3000/api/auth/callback/google (for development)
   ```

6. Copy the generated:
   - Client ID
   - Client Secret

## Step 5: Domain Verification

1. Go to "Google Search Console"
2. Add property: `https://app.castmatch.com`
3. Verify ownership using DNS record or HTML file upload
4. Add DNS verification:
   ```
   TXT record: google-site-verification=YOUR_VERIFICATION_CODE
   ```

## Environment Variables

Add to production environment:
```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## Security Notes

- Store credentials in AWS Secrets Manager or secure vault
- Rotate secrets regularly (quarterly)
- Monitor OAuth usage in Google Cloud Console
- Set up fraud detection alerts
- Implement proper CSRF protection

## Testing

Test OAuth flow:
1. Local development: `http://localhost:3000/auth/login`
2. Staging: `https://staging.castmatch.com/auth/login`
3. Production: `https://app.castmatch.com/auth/login`