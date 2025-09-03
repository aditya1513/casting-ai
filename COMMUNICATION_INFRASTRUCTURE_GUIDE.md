# CastMatch Communication Infrastructure Guide

This guide provides comprehensive documentation for the CastMatch communication and notification infrastructure, including setup, configuration, and usage instructions.

## 🏗️ Architecture Overview

The CastMatch communication infrastructure consists of several integrated components:

- **Email Service**: Multi-provider email delivery with SendGrid/Mailgun/Resend support
- **SMS Service**: Twilio-based SMS notifications with failover
- **Push Notifications**: Browser push notifications with VAPID
- **WebSocket Service**: Real-time notifications and messaging
- **OAuth Integration**: Secure Google and GitHub authentication
- **Workflow Engine**: Automated communication sequences
- **Monitoring Service**: Comprehensive metrics and alerting

## 📧 Email Service Configuration

### Provider Setup

The email service supports multiple providers with automatic fallback:

1. **SendGrid (Primary)**
2. **Mailgun (Secondary)**
3. **Resend (Tertiary)**
4. **SMTP (Fallback)**

### Environment Variables

```bash
# Email Provider Configuration (Choose one or more)
SENDGRID_API_KEY=your_sendgrid_api_key
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_mailgun_domain
MAILGUN_EU=false  # Set to true for EU region
RESEND_API_KEY=your_resend_api_key

# SMTP Fallback Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_username
SMTP_PASSWORD=your_smtp_password

# Email Settings
EMAIL_FROM=noreply@castmatch.com
EMAIL_FROM_NAME=CastMatch
FRONTEND_URL=https://your-frontend-domain.com
```

### SendGrid Setup

1. Create a SendGrid account at https://sendgrid.com
2. Generate an API key with full access
3. Add your domain for authentication
4. Set up domain authentication (SPF, DKIM, DMARC)

```bash
# Add to .env
SENDGRID_API_KEY=SG.your_api_key_here
EMAIL_FROM=notifications@yourdomain.com
```

### Mailgun Setup

1. Create a Mailgun account at https://mailgun.com
2. Add and verify your domain
3. Get your API key and domain
4. Configure DNS records (MX, SPF, DKIM)

```bash
# Add to .env
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=mg.yourdomain.com
MAILGUN_EU=false  # Set to true if using EU region
```

### Usage Examples

```typescript
import { emailService } from './services/email.service';

// Send welcome email
await emailService.sendWelcomeEmailWithTemplate({
  to: 'user@example.com',
  name: 'John Doe',
  role: 'ACTOR',
  verificationToken: 'verification-token',
});

// Send password reset
await emailService.sendPasswordResetEmailWithTemplate({
  to: 'user@example.com',
  name: 'John Doe',
  resetToken: 'reset-token',
  expiryHours: 2,
});

// Send custom email
await emailService.sendEmail({
  to: 'user@example.com',
  subject: 'Custom Subject',
  html: '<h1>Custom HTML Content</h1>',
  text: 'Custom text content',
  priority: 'high',
  categories: ['custom', 'notification'],
});
```

## 📱 SMS Service Configuration

### Twilio Setup

1. Create a Twilio account at https://twilio.com
2. Get your Account SID and Auth Token
3. Purchase a phone number for SMS
4. Configure webhook endpoints for delivery receipts

```bash
# Add to .env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### Usage Examples

```typescript
import { smsService } from './services/sms.service';

// Send SMS notification
await smsService.sendSMS({
  to: '+919876543210',
  message: 'Your CastMatch verification code is: 123456',
  priority: true,
});

// Send bulk SMS
await smsService.sendBulkSMS({
  recipients: ['+919876543210', '+918765432109'],
  message: 'New casting opportunity available!',
  scheduledFor: new Date('2024-01-15T10:00:00Z'),
});
```

## 🔔 Push Notifications Configuration

### VAPID Keys Setup

Generate VAPID keys for browser push notifications:

```bash
# Generate VAPID keys using web-push library
npx web-push generate-vapid-keys

# Add to .env
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
```

### Client-Side Setup

```javascript
// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

// Subscribe to push notifications
async function subscribeToPush() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: 'your_vapid_public_key'
  });
  
  // Send subscription to server
  await fetch('/api/notifications/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription)
  });
}
```

### Usage Examples

```typescript
import { pushNotificationService } from './services/push-notification.service';

// Send push notification
await pushNotificationService.sendToUser('user-id', {
  title: 'New Audition Opportunity',
  body: 'You have been invited for an audition',
  icon: '/icons/audition-icon.png',
  data: { auditionId: 'audition-123', projectId: 'project-456' },
  actions: [
    { action: 'view', title: 'View Details' },
    { action: 'dismiss', title: 'Dismiss' }
  ]
});
```

## 🔌 WebSocket Service Configuration

### Server Setup

```bash
# WebSocket Configuration
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### Client Connection

```javascript
import io from 'socket.io-client';

const socket = io('wss://your-api-domain.com', {
  auth: {
    token: 'your-jwt-token'
  },
  transports: ['websocket', 'polling']
});

// Listen for notifications
socket.on('notification', (data) => {
  console.log('New notification:', data);
  showNotification(data);
});

// Join room for real-time updates
socket.emit('subscribe', 'project-room-123');

// Send message
socket.emit('message', {
  type: 'message',
  payload: {
    roomId: 'project-room-123',
    content: 'Hello, casting team!'
  }
});
```

## 🔐 OAuth Configuration

### Google OAuth Setup

1. Go to Google Cloud Console
2. Create a new project or select existing
3. Enable Google+ API and Gmail API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs

```bash
# Add to .env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
BACKEND_URL=https://your-api-domain.com
```

### GitHub OAuth Setup

1. Go to GitHub Settings > Developer settings
2. Create a new OAuth App
3. Set authorization callback URL
4. Get client ID and secret

```bash
# Add to .env
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

### Integration Examples

```typescript
import { oauthService } from './config/oauth.config';

// Handle OAuth callback
app.get('/api/auth/google/callback', 
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    const result = await oauthService.handleOAuthCallback(req.user, 'ACTOR');
    
    if (result.isNewUser) {
      // Send welcome email
      await emailService.sendWelcomeEmailWithTemplate({
        to: result.user.email,
        name: result.user.firstName,
        role: result.user.role,
      });
    }
    
    // Generate JWT and redirect
    const token = generateAccessToken(result.user.id);
    res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${token}`);
  }
);
```

## 🔄 Workflow Engine Configuration

### Creating Workflows

Workflows are defined in JSON format and stored in the database:

```json
{
  "name": "Welcome Sequence",
  "type": "welcome_sequence",
  "triggerEvent": "user_registered",
  "steps": [
    {
      "type": "delay",
      "duration": 0
    },
    {
      "type": "email",
      "template": "welcome",
      "priority": "high"
    },
    {
      "type": "delay",
      "duration": 86400000
    },
    {
      "type": "condition",
      "check": "profile_completion < 50"
    },
    {
      "type": "email",
      "template": "profile-completion-reminder"
    }
  ]
}
```

### Usage Examples

```typescript
import { communicationWorkflowService } from './services/communication-workflow.service';

// Trigger workflow
await communicationWorkflowService.triggerWorkflow({
  userId: 'user-123',
  workflowType: 'welcome_sequence',
  data: {
    firstName: 'John',
    role: 'ACTOR',
    email: 'john@example.com'
  }
});

// Check workflow status
const status = await communicationWorkflowService.getWorkflowStatus('execution-id');
```

## 📊 Monitoring and Metrics

### Environment Configuration

```bash
# Monitoring Configuration
ALERT_WEBHOOK_URL=https://your-alert-endpoint.com/webhook
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

### Prometheus Metrics

The system exposes metrics at `/metrics` endpoint:

- `castmatch_emails_total` - Total emails sent by status and provider
- `castmatch_sms_total` - Total SMS sent by status and provider
- `castmatch_push_notifications_total` - Total push notifications
- `castmatch_websocket_connections` - Current WebSocket connections
- `castmatch_workflow_executions_total` - Workflow executions
- `castmatch_provider_response_time_seconds` - Provider response times

### Alert Rules

Configure alert rules for monitoring:

```typescript
// Example alert configuration
const alertRules = [
  {
    name: 'High Email Failure Rate',
    condition: 'email_failure_rate > 10',
    timeWindow: 15, // minutes
    severity: 'high',
    channels: ['email', 'slack']
  }
];
```

## 🗄️ Database Setup

### Running Migrations

```bash
# Run the communication infrastructure migration
psql -d your_database -f prisma/migrations/add_communication_infrastructure.sql

# Or use Prisma
npx prisma migrate deploy
```

### Key Tables

- `Notification` - In-app notifications
- `NotificationPreference` - User notification settings
- `PushSubscription` - Browser push subscriptions
- `EmailTemplate` - Email template storage
- `CommunicationWorkflow` - Workflow definitions
- `WorkflowExecution` - Workflow execution tracking
- `SmsLog` - SMS delivery logs
- `EmailLog` - Email delivery logs

## 🧪 Testing

### Running Tests

```bash
# Run all communication tests
npm test -- --testPathPattern=communication

# Run specific service tests
npm test -- tests/communication/email.service.test.ts
npm test -- tests/communication/sms.service.test.ts
npm test -- tests/communication/websocket.service.test.ts
```

### Test Configuration

```bash
# Test Environment Variables
NODE_ENV=test
TEST_DATABASE_URL=postgresql://test:test@localhost:5432/castmatch_test
REDIS_URL=redis://localhost:6379/1
```

## 🚀 Deployment

### Environment-Specific Configuration

#### Development
```bash
NODE_ENV=development
LOG_LEVEL=debug
EMAIL_PROVIDER=smtp  # Use local SMTP for testing
```

#### Staging
```bash
NODE_ENV=staging
LOG_LEVEL=info
EMAIL_PROVIDER=sendgrid
ENABLE_EMAIL_QUEUE=true
```

#### Production
```bash
NODE_ENV=production
LOG_LEVEL=warn
EMAIL_PROVIDER=sendgrid
ENABLE_EMAIL_QUEUE=true
ENABLE_MONITORING=true
```

### Docker Configuration

```dockerfile
# Dockerfile additions for communication services
ENV SENDGRID_API_KEY=${SENDGRID_API_KEY}
ENV TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
ENV TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}
ENV VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}
ENV VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}
```

## 🔧 Troubleshooting

### Common Issues

#### Email Delivery Problems

1. **Check provider configuration**:
   ```bash
   # Test SendGrid API key
   curl -X GET "https://api.sendgrid.com/v3/user/profile" \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```

2. **Verify DNS settings**:
   - SPF record: `v=spf1 include:sendgrid.net ~all`
   - DKIM record: Provided by SendGrid
   - DMARC record: `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com`

3. **Check email logs**:
   ```sql
   SELECT * FROM "EmailLog" 
   WHERE "status" = 'failed' 
   ORDER BY "createdAt" DESC 
   LIMIT 10;
   ```

#### SMS Delivery Issues

1. **Verify Twilio credentials**:
   ```bash
   curl -X GET "https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID.json" \
     -u "YOUR_ACCOUNT_SID:YOUR_AUTH_TOKEN"
   ```

2. **Check phone number format**:
   - Must include country code (e.g., +919876543210)
   - Remove spaces and special characters

#### WebSocket Connection Problems

1. **Check CORS configuration**:
   - Ensure frontend domain is in CORS_ORIGINS
   - Verify SSL certificates for WSS connections

2. **Monitor connection metrics**:
   ```typescript
   const stats = websocketService.getStatistics();
   console.log('Connected users:', stats.connectedUsers);
   ```

#### OAuth Authentication Issues

1. **Verify redirect URIs**:
   - Google: Must match exactly in Google Cloud Console
   - GitHub: Must be configured in OAuth App settings

2. **Check scope permissions**:
   - Ensure required scopes are requested
   - User must grant all necessary permissions

### Performance Optimization

#### Email Queue Optimization

```typescript
// Configure email queue for high throughput
const emailQueue = new Bull('email-queue', {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
  },
  settings: {
    stalledInterval: 30000,
    maxStalledCount: 1,
  }
});

// Add concurrency
emailQueue.process(5, processEmailJob);
```

#### WebSocket Scaling

```typescript
// Use Redis adapter for multi-server WebSocket
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

## 📝 API Reference

### Email Service API

```typescript
interface EmailService {
  sendEmail(options: EmailOptions): Promise<void>;
  sendWelcomeEmailWithTemplate(data: WelcomeEmailData): Promise<void>;
  sendPasswordResetEmailWithTemplate(data: PasswordResetEmailData): Promise<void>;
  sendEmailVerificationWithTemplate(to: string, name: string, token: string): Promise<void>;
  sendOAuthLinkedNotification(to: string, name: string, provider: string, data: any): Promise<void>;
  sendProfileCompletionReminder(to: string, name: string, data: any): Promise<void>;
}
```

### WebSocket Service API

```typescript
interface WebSocketService {
  sendToUser(userId: string, message: any): Promise<void>;
  broadcastToRoom(roomId: string, message: any): Promise<void>;
  broadcastToRole(role: string, message: any): Promise<void>;
  getStatistics(): WebSocketStatistics;
}
```

### Push Notification Service API

```typescript
interface PushNotificationService {
  subscribe(userId: string, subscription: PushSubscriptionData): Promise<void>;
  unsubscribe(userId: string, endpoint: string): Promise<void>;
  sendToUser(userId: string, payload: PushPayload): Promise<void>;
  sendToUsers(userIds: string[], payload: PushPayload): Promise<void>;
  getVapidPublicKey(): string | null;
}
```

## 🔒 Security Considerations

### Email Security

- Use SPF, DKIM, and DMARC records
- Implement rate limiting for email sending
- Validate email addresses before sending
- Use secure HTTPS endpoints for webhooks

### SMS Security

- Validate phone numbers and regions
- Implement rate limiting to prevent abuse
- Use secure webhook endpoints for delivery receipts
- Monitor for suspicious sending patterns

### WebSocket Security

- Authenticate all connections with JWT tokens
- Validate message content and permissions
- Implement rate limiting per connection
- Use WSS (WebSocket Secure) in production

### OAuth Security

- Use state parameter to prevent CSRF attacks
- Implement proper token refresh mechanisms
- Store tokens securely with encryption
- Regular token rotation and cleanup

## 📈 Scaling Considerations

### High Volume Email

- Use multiple email providers with load balancing
- Implement sophisticated retry mechanisms
- Monitor sender reputation across providers
- Use dedicated IP addresses for high volume

### WebSocket Scaling

- Use Redis adapter for horizontal scaling
- Implement proper session persistence
- Load balance WebSocket connections
- Monitor connection limits and performance

### Database Optimization

- Index notification and log tables properly
- Implement data archiving for old records
- Use read replicas for reporting queries
- Consider partitioning large tables

## 🆘 Support and Maintenance

### Monitoring Checklist

- [ ] Email delivery rates > 95%
- [ ] SMS delivery rates > 98%
- [ ] WebSocket connection errors < 1%
- [ ] Provider response times < 2 seconds
- [ ] Workflow execution success > 95%
- [ ] Database connection pool utilization < 80%

### Regular Maintenance Tasks

1. **Weekly**: Review failed message logs
2. **Monthly**: Clean up expired tokens and subscriptions
3. **Quarterly**: Review and optimize email templates
4. **Annually**: Rotate API keys and secrets

### Emergency Procedures

1. **Email Provider Down**: 
   - Switch to backup provider
   - Update DNS if needed
   - Monitor delivery rates

2. **High Error Rates**:
   - Check provider status pages
   - Review recent configuration changes
   - Scale up resources if needed

3. **WebSocket Issues**:
   - Check Redis connectivity
   - Restart WebSocket service
   - Monitor connection recovery

This comprehensive guide should help you successfully deploy, configure, and maintain the CastMatch communication infrastructure. For additional support, refer to the individual service documentation or contact the development team.