# GitHub OAuth App Setup for CastMatch

## Prerequisites
- GitHub organization or personal account with admin access
- CastMatch domain configured
- Production environment ready

## Step 1: Create GitHub OAuth App

1. Go to GitHub Settings:
   - Organization: `https://github.com/organizations/YOUR_ORG/settings/applications`
   - Personal: `https://github.com/settings/developers`

2. Click "New OAuth App"

3. Fill in application details:
   - Application name: `CastMatch Production`
   - Homepage URL: `https://app.castmatch.com`
   - Application description: `CastMatch - AI-powered casting platform for entertainment industry`

4. Authorization callback URLs:
   ```
   https://app.castmatch.com/api/auth/callback/github
   https://castmatch.com/api/auth/callback/github
   http://localhost:3000/api/auth/callback/github
   ```

5. Click "Register application"

## Step 2: Configure OAuth Settings

1. After creation, note down:
   - Client ID
   - Client Secret (click "Generate a new client secret")

2. Optional Settings:
   - Enable Device Flow: No (unless needed for CLI tools)
   - Request user authorization (OAuth) for: All users
   - Webhook URL: `https://app.castmatch.com/api/webhooks/github` (if needed)

## Step 3: Set Permissions

Configure the following OAuth scopes:
- `user:email` - Access user email addresses
- `read:user` - Read user profile information

## Step 4: Security Configuration

1. Set up IP allowlist (optional):
   - Production server IPs
   - Development team IPs

2. Enable two-factor authentication requirement

3. Set up webhook secret for secure communication:
   ```bash
   GITHUB_WEBHOOK_SECRET=your_secure_random_string
   ```

## Environment Variables

Add to production environment:
```bash
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_WEBHOOK_SECRET=your_webhook_secret
```

## Step 5: Test Configuration

Test OAuth flow with different scenarios:

1. **New user registration via GitHub**
2. **Existing user login via GitHub**
3. **Account linking for existing users**
4. **Error handling for denied permissions**

### Test URLs:
- Development: `http://localhost:3000/auth/signin/github`
- Staging: `https://staging.castmatch.com/auth/signin/github`
- Production: `https://app.castmatch.com/auth/signin/github`

## Monitoring and Analytics

1. Monitor OAuth usage in GitHub Settings
2. Set up alerts for:
   - High authentication failure rates
   - Unusual traffic patterns
   - Rate limit approaching

## Security Best Practices

1. **Credential Management:**
   - Store secrets in AWS Secrets Manager
   - Rotate credentials quarterly
   - Use different apps for different environments

2. **Access Control:**
   - Limit callback URLs to exact matches
   - Implement proper state validation
   - Use PKCE for additional security

3. **Monitoring:**
   - Log all OAuth events
   - Monitor for suspicious patterns
   - Set up fraud detection alerts

## Troubleshooting

Common issues and solutions:

1. **Invalid Callback URL:**
   - Ensure exact URL match in GitHub settings
   - Check for trailing slashes

2. **Invalid Client ID/Secret:**
   - Verify environment variables
   - Check for typos or extra spaces

3. **Permission Denied:**
   - Verify OAuth scopes
   - Check user permissions

## Rate Limits

GitHub OAuth rate limits:
- 5,000 requests per hour per OAuth app
- Monitor usage via GitHub API

## Compliance

Ensure compliance with:
- GitHub Terms of Service
- GDPR (if applicable)
- SOC2 requirements
- Company data protection policies