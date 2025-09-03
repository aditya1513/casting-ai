# CastMatch Communication Systems

## 🚀 Overview

CastMatch now has a comprehensive communication infrastructure with Resend email integration, real-time WebSocket notifications, push notifications, and automated workflow sequences. This system handles all user communications from welcome emails to security alerts.

## 📧 Email Service Features

### Resend Integration
- **Primary Provider**: Resend for production-grade email delivery
- **Fallback**: SMTP for development and backup scenarios
- **Template System**: HTML and text versions for all email types
- **Delivery Tracking**: Comprehensive analytics and error handling
- **Tags**: Organized email types for better tracking

### Email Templates
Professional email templates located in `/src/templates/emails/`:

- **Welcome Email** (`welcome.html/.txt`)
  - Role-specific content for Actors, Casting Directors, Producers
  - Email verification integration
  - Feature highlights and getting started guide

- **Password Reset** (`password-reset.html/.txt`)
  - Security-focused design with expiry warnings
  - Best practices and security tips
  - Professional error handling messaging

- **Email Verification** (`email-verification.html/.txt`)
  - Urgent call-to-action design
  - Benefits of verification clearly outlined
  - Troubleshooting guidance included

- **OAuth Integration** (`oauth-google-linked.html`, `oauth-github-linked.html`)
  - Confirmation of successful account linking
  - Feature explanations and privacy notices
  - Integration management instructions

- **Profile Completion** (`profile-completion-reminder.html`)
  - Progress tracking with visual indicators
  - Personalized completion checklist
  - Pro tips and best practices

## 🔔 Notification System

### Multi-Channel Delivery
- **In-App Notifications**: Stored in database with read/unread tracking
- **WebSocket**: Real-time updates to connected clients
- **Email**: Template-based email notifications
- **SMS**: Integration ready (service configuration needed)
- **Push Notifications**: Browser notifications with VAPID

### Notification Types
- Casting-related: New calls, invitations, audition scheduling
- Profile-related: Views, likes, completion reminders
- Communication: New messages, video call requests
- System: Welcome, verification, password changes
- Social: Connection requests, mentions, comments

### User Preferences
- **Channel Control**: Enable/disable specific notification channels
- **Quiet Hours**: Time-based notification suppression
- **Frequency Settings**: Real-time vs. digest preferences
- **Type Filtering**: Granular control over notification types

## 🌐 Real-Time Features

### WebSocket Integration
- **Authentication**: Token-based socket authentication
- **User Rooms**: Automatic user-specific room joining
- **Real-Time Events**: Instant notification delivery
- **Connection Management**: Automatic reconnection handling
- **Event Handling**: Mark read, preferences updates

### Push Notifications
- **VAPID Support**: Secure push notification delivery
- **Multi-Device**: Support for multiple browser subscriptions
- **Rich Notifications**: Images, actions, and custom data
- **Subscription Management**: Database-backed subscription tracking
- **Error Handling**: Automatic cleanup of expired subscriptions

## ⚙️ Automated Workflows

### Communication Workflows
The `CommunicationWorkflowService` handles automated email sequences:

- **Welcome Sequence**: Multi-step onboarding with role-specific content
- **Profile Completion**: Progressive reminders based on completion percentage
- **Password Security**: Reset confirmations and security alerts
- **OAuth Integration**: Confirmation and feature explanation emails
- **Onboarding**: Timed sequence of tips, tutorials, and encouragement

### Queue Management
- **Bull/Redis**: Reliable message queue processing
- **Retry Logic**: Exponential backoff for failed deliveries
- **Scheduling**: Delayed and scheduled message delivery
- **Priority Handling**: Urgent, high, and normal priority queues

## 🛠️ Setup Instructions

### 1. Environment Configuration
Add to your `.env` file:

```bash
# Resend Configuration
RESEND_API_KEY=your_resend_api_key_here
EMAIL_FROM=noreply@castmatch.com
EMAIL_FROM_NAME=CastMatch

# Push Notification Configuration
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key

# Frontend URL
FRONTEND_URL=http://localhost:3001
```

### 2. Resend Setup
1. Create account at [Resend](https://resend.com/)
2. Generate API key with email sending permissions
3. Add your domain and verify sender authentication
4. Update `RESEND_API_KEY` in environment

### 3. VAPID Keys Generation
Generate VAPID keys for push notifications:

```bash
npx web-push generate-vapid-keys
```

Add the generated keys to your environment file.

### 4. Database Schema
Ensure these tables exist in your database:
- `notifications` - Store in-app notifications
- `notificationPreferences` - User preference settings
- `pushSubscriptions` - Browser push subscriptions
- `notificationLogs` - Analytics and tracking

## 📚 API Endpoints

### Notification Management
- `GET /api/notifications` - Get user notifications (paginated)
- `PATCH /api/notifications/:id/read` - Mark notification as read
- `PATCH /api/notifications/read-all` - Mark all as read
- `GET /api/notifications/preferences` - Get user preferences
- `PUT /api/notifications/preferences` - Update preferences

### Push Notifications  
- `POST /api/notifications/push/subscribe` - Subscribe to push notifications
- `POST /api/notifications/push/unsubscribe` - Unsubscribe from push
- `GET /api/notifications/push/vapid-key` - Get VAPID public key

### Testing & Administration
- `POST /api/notifications/test` - Send test notification
- `POST /api/notifications/workflow` - Trigger communication workflow

## 🎯 Usage Examples

### Send Welcome Email
```typescript
await communicationWorkflowService.sendWelcomeEmail(
  userId,
  verificationUrl // optional
);
```

### Send Push Notification
```typescript
await pushNotificationService.sendToUser(userId, {
  title: 'New Casting Call',
  body: 'A new role matching your profile is available',
  data: { castingId: '123', url: '/casting/123' },
  actions: [
    { action: 'view', title: 'View Details' },
    { action: 'apply', title: 'Apply Now' }
  ]
});
```

### Real-Time Notification
```typescript
await notificationService.sendNotification({
  userId,
  type: NotificationType.NEW_CASTING_CALL,
  title: 'New Casting Opportunity',
  message: 'A new role matches your profile',
  channels: [NotificationChannel.WEBSOCKET, NotificationChannel.PUSH],
  actionUrl: '/casting/123'
});
```

## 🔐 Security Features

- **VAPID Authentication**: Secure push notification delivery
- **Token Validation**: WebSocket connection authentication
- **Rate Limiting**: API endpoint protection
- **Input Validation**: Zod schema validation for all inputs
- **Error Handling**: Comprehensive error logging and user feedback
- **Privacy Controls**: User preference management and unsubscribe options

## 📊 Monitoring & Analytics

- **Email Delivery Tracking**: Resend analytics integration
- **Notification Logs**: Database logging for all notifications
- **Error Tracking**: Comprehensive error logging with context
- **Performance Metrics**: Cache usage and queue processing stats
- **User Engagement**: Read rates and preference analytics

## 🚀 Production Considerations

1. **Resend Domain Verification**: Set up proper domain authentication
2. **VAPID Keys Security**: Store VAPID keys securely in production
3. **Redis Scaling**: Configure Redis for high availability
4. **Queue Monitoring**: Set up monitoring for Bull queues
5. **Error Alerting**: Implement error alerting for failed communications
6. **Rate Limiting**: Configure appropriate rate limits for API endpoints

## 📱 Frontend Integration

The system is ready for frontend integration with:
- WebSocket client connection handling
- Push notification subscription management
- Notification preference UI components  
- Real-time notification display
- Unread count tracking and updates

All communication systems are now operational and ready for production use!