// Push Notification Service for CastMatch PWA
// Handles push notifications for casting updates, auditions, and messages

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: any;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
}

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

class PushNotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

  // Initialize push notification service
  async initialize(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return false;
    }

    try {
      // Register service worker
      this.swRegistration = await navigator.serviceWorker.ready;
      
      // Check notification permission
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission not granted');
        return false;
      }

      // Subscribe to push notifications
      await this.subscribeToPush();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  // Request notification permission
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return Notification.permission;
  }

  // Subscribe to push notifications
  private async subscribeToPush(): Promise<PushSubscription | null> {
    if (!this.swRegistration) {
      throw new Error('Service worker not registered');
    }

    try {
      // Check existing subscription
      let subscription = await this.swRegistration.pushManager.getSubscription();
      
      if (!subscription) {
        // Create new subscription
        const convertedVapidKey = this.urlBase64ToUint8Array(this.vapidPublicKey);
        
        subscription = await this.swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });

        // Send subscription to backend
        await this.sendSubscriptionToServer(subscription);
      }

      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  // Convert VAPID key
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  }

  // Send subscription to server
  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription,
          userAgent: navigator.userAgent,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription on server');
      }
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
    }
  }

  // Show local notification
  async showNotification(payload: NotificationPayload): Promise<void> {
    if (!this.swRegistration) {
      throw new Error('Service worker not registered');
    }

    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    const options: NotificationOptions = {
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/badge-72x72.png',
      image: payload.image,
      tag: payload.tag || 'castmatch-notification',
      data: payload.data,
      actions: payload.actions,
      requireInteraction: payload.requireInteraction ?? false,
      vibrate: [200, 100, 200],
      timestamp: Date.now()
    };

    await this.swRegistration.showNotification(payload.title, options);
  }

  // Unsubscribe from push notifications
  async unsubscribe(): Promise<boolean> {
    if (!this.swRegistration) {
      return false;
    }

    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      
      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe();
        
        // Remove subscription from server
        await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint
          })
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  // Check if push notifications are supported
  isSupported(): boolean {
    return 'serviceWorker' in navigator && 
           'PushManager' in window && 
           'Notification' in window;
  }

  // Get current permission status
  getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  // Check if subscribed to push
  async isSubscribed(): Promise<boolean> {
    if (!this.swRegistration) {
      return false;
    }

    const subscription = await this.swRegistration.pushManager.getSubscription();
    return subscription !== null;
  }
}

// Notification templates for common scenarios
export const NotificationTemplates = {
  newAudition: (auditionTitle: string): NotificationPayload => ({
    title: 'New Audition Opportunity',
    body: `A new audition for "${auditionTitle}" matches your profile`,
    icon: '/icons/audition-icon.png',
    tag: 'new-audition',
    actions: [
      { action: 'view', title: 'View Details' },
      { action: 'apply', title: 'Apply Now' }
    ],
    requireInteraction: true
  }),

  auditionReminder: (auditionTitle: string, time: string): NotificationPayload => ({
    title: 'Audition Reminder',
    body: `Your audition for "${auditionTitle}" is scheduled at ${time}`,
    icon: '/icons/reminder-icon.png',
    tag: 'audition-reminder',
    actions: [
      { action: 'view', title: 'View Details' },
      { action: 'directions', title: 'Get Directions' }
    ],
    requireInteraction: true
  }),

  newMessage: (senderName: string): NotificationPayload => ({
    title: 'New Message',
    body: `${senderName} sent you a message`,
    icon: '/icons/message-icon.png',
    tag: 'new-message',
    actions: [
      { action: 'view', title: 'View Message' },
      { action: 'reply', title: 'Reply' }
    ]
  }),

  profileView: (viewerName: string, viewerRole: string): NotificationPayload => ({
    title: 'Profile Viewed',
    body: `${viewerName} (${viewerRole}) viewed your profile`,
    icon: '/icons/profile-view-icon.png',
    tag: 'profile-view'
  }),

  shortlisted: (projectName: string): NotificationPayload => ({
    title: 'You\'ve Been Shortlisted!',
    body: `Congratulations! You've been shortlisted for "${projectName}"`,
    icon: '/icons/shortlist-icon.png',
    tag: 'shortlisted',
    requireInteraction: true
  }),

  callbackRequest: (projectName: string, date: string): NotificationPayload => ({
    title: 'Callback Request',
    body: `You have a callback for "${projectName}" on ${date}`,
    icon: '/icons/callback-icon.png',
    tag: 'callback',
    actions: [
      { action: 'accept', title: 'Accept' },
      { action: 'reschedule', title: 'Reschedule' }
    ],
    requireInteraction: true
  })
};

// Export singleton instance
export const pushNotificationService = new PushNotificationService();

// Export types
export type { NotificationPayload, NotificationAction };