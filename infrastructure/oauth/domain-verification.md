# Domain Verification for OAuth Callbacks

## Overview
Proper domain verification ensures secure OAuth callbacks and prevents unauthorized access to your authentication endpoints.

## DNS Configuration

### Primary Domain: castmatch.com

Add the following DNS records:

```bash
# A Records for main domain
castmatch.com.          A    your.server.ip.address
www.castmatch.com.      A    your.server.ip.address

# CNAME for app subdomain
app.castmatch.com.      CNAME castmatch.com.

# MX Records for email
castmatch.com.          MX   10 mail.castmatch.com.

# TXT Records for verification
castmatch.com.          TXT  "google-site-verification=YOUR_GOOGLE_VERIFICATION"
castmatch.com.          TXT  "v=spf1 include:_spf.google.com ~all"
```

### SSL Certificate Configuration

1. **Obtain SSL Certificates:**
   ```bash
   # Using Let's Encrypt with Certbot
   sudo certbot certonly --webroot \
     -w /var/www/html \
     -d castmatch.com \
     -d www.castmatch.com \
     -d app.castmatch.com \
     -d api.castmatch.com
   ```

2. **Certificate Renewal:**
   ```bash
   # Auto-renewal cron job
   0 12 * * * /usr/bin/certbot renew --quiet
   ```

## OAuth Callback URLs

### Approved Callback URLs for Production:

```bash
# Google OAuth
https://app.castmatch.com/api/auth/callback/google
https://castmatch.com/api/auth/callback/google

# GitHub OAuth
https://app.castmatch.com/api/auth/callback/github
https://castmatch.com/api/auth/callback/github

# NextAuth.js callbacks
https://app.castmatch.com/api/auth/callback/credentials
```

### Development/Staging URLs:
```bash
# Local development
http://localhost:3000/api/auth/callback/google
http://localhost:3000/api/auth/callback/github

# Staging environment
https://staging.castmatch.com/api/auth/callback/google
https://staging.castmatch.com/api/auth/callback/github
```

## Security Headers Configuration

Configure these security headers for OAuth endpoints:

```nginx
# Nginx configuration
location /api/auth/ {
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' accounts.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: *.googleusercontent.com; connect-src 'self' api.github.com accounts.google.com; frame-src 'none';" always;
    
    proxy_pass http://backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## CORS Configuration

Allow OAuth domains in CORS policy:

```javascript
// Express.js CORS configuration
const corsOptions = {
  origin: [
    'https://app.castmatch.com',
    'https://castmatch.com',
    'https://accounts.google.com',
    'https://github.com',
    // Development
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-CSRF-Token'
  ]
};
```

## Domain Verification Steps

### Google Search Console
1. Add property: `https://app.castmatch.com`
2. Verify via DNS TXT record or HTML file
3. Submit sitemap: `https://app.castmatch.com/sitemap.xml`

### GitHub Pages (if using)
1. Configure custom domain in repository settings
2. Enable HTTPS enforcement
3. Add CNAME file with domain name

## Monitoring and Alerts

Set up monitoring for:

1. **SSL Certificate Expiry:**
   ```bash
   # Check certificate expiry
   echo | openssl s_client -servername app.castmatch.com -connect app.castmatch.com:443 2>/dev/null | openssl x509 -noout -dates
   ```

2. **DNS Resolution:**
   ```bash
   # Monitor DNS propagation
   dig app.castmatch.com +short
   nslookup app.castmatch.com 8.8.8.8
   ```

3. **OAuth Endpoint Health:**
   ```bash
   # Health check OAuth endpoints
   curl -I https://app.castmatch.com/api/auth/providers
   ```

## Troubleshooting

### Common Issues:

1. **Invalid Redirect URI:**
   - Ensure exact URL match (including protocol, domain, path)
   - Check for trailing slashes

2. **SSL Certificate Issues:**
   - Verify certificate chain
   - Check intermediate certificates
   - Ensure proper cipher suites

3. **CORS Errors:**
   - Verify allowed origins
   - Check preflight request handling
   - Validate credentials flag

### Debug Commands:

```bash
# Test SSL configuration
openssl s_client -connect app.castmatch.com:443 -servername app.castmatch.com

# Check DNS propagation
dig @8.8.8.8 app.castmatch.com
dig @1.1.1.1 app.castmatch.com

# Test OAuth endpoints
curl -v "https://app.castmatch.com/api/auth/providers"
curl -v "https://app.castmatch.com/api/auth/csrf"
```

## Security Checklist

- [ ] SSL certificates installed and valid
- [ ] HSTS headers configured
- [ ] CSRF protection enabled
- [ ] Secure cookie settings
- [ ] Rate limiting on auth endpoints
- [ ] Proper CORS configuration
- [ ] Security headers implemented
- [ ] Domain verification completed
- [ ] Callback URLs whitelisted
- [ ] Monitoring and alerts configured