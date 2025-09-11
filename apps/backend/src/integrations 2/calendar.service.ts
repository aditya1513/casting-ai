import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { logger } from '../utils/logger';
import { queueManager } from '../queues/queue.manager';
import moment from 'moment-timezone';
import Redis from 'ioredis';

/**
 * Calendar Service Integration (Google Calendar API)
 * Handles audition scheduling, availability checking, and reminders
 */

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  }>;
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{
      method: 'email' | 'popup' | 'sms';
      minutes: number;
    }>;
  };
  recurrence?: string[];
  conferenceData?: {
    createRequest?: {
      requestId: string;
      conferenceSolutionKey: {
        type: 'hangoutsMeet' | 'zoom';
      };
    };
  };
  metadata?: Record<string, any>;
}

export interface AvailabilityQuery {
  timeMin: Date;
  timeMax: Date;
  duration: number; // in minutes
  timeZone?: string;
  excludeWeekends?: boolean;
  workingHours?: {
    start: string; // "09:00"
    end: string;   // "17:00"
  };
}

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictingEvents?: calendar_v3.Schema$Event[];
}

// Event templates for different audition types
const EVENT_TEMPLATES = {
  AUDITION: {
    colorId: '9', // Blue
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // 1 day before
        { method: 'email', minutes: 60 },      // 1 hour before
        { method: 'popup', minutes: 15 },      // 15 minutes before
      ],
    },
  },
  CALLBACK: {
    colorId: '5', // Yellow
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // 1 day before
        { method: 'email', minutes: 2 * 60 },  // 2 hours before
        { method: 'popup', minutes: 30 },      // 30 minutes before
      ],
    },
  },
  REHEARSAL: {
    colorId: '2', // Green
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 48 * 60 }, // 2 days before
        { method: 'email', minutes: 4 * 60 },  // 4 hours before
      ],
    },
  },
  MEETING: {
    colorId: '7', // Cyan
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 60 },      // 1 hour before
        { method: 'popup', minutes: 15 },      // 15 minutes before
      ],
    },
  },
};

class CalendarService {
  private oauth2Client: OAuth2Client;
  private calendar: calendar_v3.Calendar | null = null;
  private redis: Redis;
  private isInitialized: boolean = false;
  private calendarId: string = 'primary';

  constructor() {
    // Initialize Redis for caching
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || 'castmatch_redis_password',
      maxRetriesPerRequest: 3,
    });

    // Initialize OAuth2 client
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/google/callback'
    );

    this.initialize();
  }

  private async initialize() {
    try {
      // Check if we have stored tokens
      const tokens = await this.getStoredTokens();
      if (tokens) {
        this.oauth2Client.setCredentials(tokens);
        this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
        this.isInitialized = true;
        logger.info('Google Calendar service initialized with stored tokens');
        
        // Schedule token refresh
        this.scheduleTokenRefresh();
      } else {
        logger.warn('Google Calendar tokens not found. Authorization required.');
      }
    } catch (error) {
      logger.error('Error initializing Google Calendar service:', error);
    }
  }

  /**
   * Get authorization URL for OAuth2 flow
   */
  getAuthorizationUrl(state?: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state,
      prompt: 'consent', // Force consent to get refresh token
    });
  }

  /**
   * Handle OAuth2 callback and store tokens
   */
  async handleAuthCallback(code: string): Promise<void> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      
      // Store tokens
      await this.storeTokens(tokens);
      
      // Initialize calendar
      this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      this.isInitialized = true;
      
      logger.info('Google Calendar authorized successfully');
      
      // Schedule token refresh
      this.scheduleTokenRefresh();
    } catch (error) {
      logger.error('Error handling auth callback:', error);
      throw error;
    }
  }

  /**
   * Create calendar event
   */
  async createEvent(event: CalendarEvent, eventType: keyof typeof EVENT_TEMPLATES = 'AUDITION'): Promise<calendar_v3.Schema$Event> {
    if (!this.isInitialized || !this.calendar) {
      throw new Error('Calendar service not initialized');
    }

    const template = EVENT_TEMPLATES[eventType];
    
    // Build event object
    const calendarEvent: calendar_v3.Schema$Event = {
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: event.start,
      end: event.end,
      attendees: event.attendees,
      reminders: event.reminders || template.reminders,
      colorId: template.colorId,
      conferenceData: event.conferenceData,
    };

    // Add recurrence if specified
    if (event.recurrence) {
      calendarEvent.recurrence = event.recurrence;
    }

    // Add extended properties for metadata
    if (event.metadata) {
      calendarEvent.extendedProperties = {
        private: event.metadata,
      };
    }

    try {
      const response = await this.calendar.events.insert({
        calendarId: this.calendarId,
        requestBody: calendarEvent,
        conferenceDataVersion: event.conferenceData ? 1 : undefined,
        sendUpdates: 'all', // Send notifications to attendees
      });

      logger.info(`Calendar event created: ${response.data.id}`);
      
      // Queue reminder jobs
      if (response.data.reminders?.overrides) {
        await this.scheduleReminders(response.data);
      }

      // Invalidate availability cache
      await this.invalidateAvailabilityCache();

      return response.data;
    } catch (error) {
      logger.error('Error creating calendar event:', error);
      throw error;
    }
  }

  /**
   * Update calendar event
   */
  async updateEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<calendar_v3.Schema$Event> {
    if (!this.isInitialized || !this.calendar) {
      throw new Error('Calendar service not initialized');
    }

    try {
      // Get existing event
      const existing = await this.calendar.events.get({
        calendarId: this.calendarId,
        eventId,
      });

      // Merge updates
      const updatedEvent = {
        ...existing.data,
        ...updates,
      };

      const response = await this.calendar.events.update({
        calendarId: this.calendarId,
        eventId,
        requestBody: updatedEvent,
        sendUpdates: 'all',
      });

      logger.info(`Calendar event updated: ${eventId}`);
      
      // Invalidate availability cache
      await this.invalidateAvailabilityCache();

      return response.data;
    } catch (error) {
      logger.error('Error updating calendar event:', error);
      throw error;
    }
  }

  /**
   * Delete calendar event
   */
  async deleteEvent(eventId: string, sendNotifications: boolean = true): Promise<void> {
    if (!this.isInitialized || !this.calendar) {
      throw new Error('Calendar service not initialized');
    }

    try {
      await this.calendar.events.delete({
        calendarId: this.calendarId,
        eventId,
        sendUpdates: sendNotifications ? 'all' : 'none',
      });

      logger.info(`Calendar event deleted: ${eventId}`);
      
      // Invalidate availability cache
      await this.invalidateAvailabilityCache();
    } catch (error) {
      logger.error('Error deleting calendar event:', error);
      throw error;
    }
  }

  /**
   * Get event by ID
   */
  async getEvent(eventId: string): Promise<calendar_v3.Schema$Event | null> {
    if (!this.isInitialized || !this.calendar) {
      throw new Error('Calendar service not initialized');
    }

    try {
      const response = await this.calendar.events.get({
        calendarId: this.calendarId,
        eventId,
      });
      return response.data;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      logger.error('Error getting calendar event:', error);
      throw error;
    }
  }

  /**
   * List events in time range
   */
  async listEvents(
    timeMin: Date,
    timeMax: Date,
    query?: string,
    maxResults: number = 250
  ): Promise<calendar_v3.Schema$Event[]> {
    if (!this.isInitialized || !this.calendar) {
      throw new Error('Calendar service not initialized');
    }

    try {
      const response = await this.calendar.events.list({
        calendarId: this.calendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        q: query,
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items || [];
    } catch (error) {
      logger.error('Error listing calendar events:', error);
      throw error;
    }
  }

  /**
   * Check for conflicts
   */
  async checkConflicts(start: Date, end: Date): Promise<ConflictCheckResult> {
    if (!this.isInitialized || !this.calendar) {
      throw new Error('Calendar service not initialized');
    }

    try {
      const events = await this.listEvents(start, end);
      
      const conflictingEvents = events.filter(event => {
        const eventStart = new Date(event.start?.dateTime || event.start?.date || '');
        const eventEnd = new Date(event.end?.dateTime || event.end?.date || '');
        
        // Check for overlap
        return !(eventEnd <= start || eventStart >= end);
      });

      return {
        hasConflict: conflictingEvents.length > 0,
        conflictingEvents,
      };
    } catch (error) {
      logger.error('Error checking conflicts:', error);
      throw error;
    }
  }

  /**
   * Find available time slots
   */
  async findAvailableSlots(query: AvailabilityQuery): Promise<TimeSlot[]> {
    const cacheKey = `availability:${JSON.stringify(query)}`;
    
    // Check cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    if (!this.isInitialized || !this.calendar) {
      throw new Error('Calendar service not initialized');
    }

    const slots: TimeSlot[] = [];
    const { timeMin, timeMax, duration, timeZone = 'UTC', excludeWeekends = true, workingHours } = query;

    try {
      // Get busy times
      const response = await this.calendar.freebusy.query({
        requestBody: {
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          timeZone,
          items: [{ id: this.calendarId }],
        },
      });

      const busyPeriods = response.data.calendars?.[this.calendarId]?.busy || [];
      
      // Convert to moment objects for easier manipulation
      const start = moment.tz(timeMin, timeZone);
      const end = moment.tz(timeMax, timeZone);
      const slotDuration = moment.duration(duration, 'minutes');

      // Generate potential slots
      let current = start.clone();
      while (current.clone().add(slotDuration).isSameOrBefore(end)) {
        // Skip weekends if requested
        if (excludeWeekends && (current.day() === 0 || current.day() === 6)) {
          current.add(1, 'day').startOf('day');
          if (workingHours) {
            current.hours(parseInt(workingHours.start.split(':')[0]));
            current.minutes(parseInt(workingHours.start.split(':')[1]));
          }
          continue;
        }

        // Check working hours
        if (workingHours) {
          const slotStart = current.clone();
          const slotEnd = current.clone().add(slotDuration);
          const workStart = current.clone().hours(parseInt(workingHours.start.split(':')[0]))
                                          .minutes(parseInt(workingHours.start.split(':')[1]));
          const workEnd = current.clone().hours(parseInt(workingHours.end.split(':')[0]))
                                        .minutes(parseInt(workingHours.end.split(':')[1]));

          // Skip if outside working hours
          if (slotStart.isBefore(workStart) || slotEnd.isAfter(workEnd)) {
            // Move to next working hour or next day
            if (slotEnd.isAfter(workEnd)) {
              current = current.clone().add(1, 'day').hours(parseInt(workingHours.start.split(':')[0]))
                                                    .minutes(parseInt(workingHours.start.split(':')[1]));
            } else {
              current.add(30, 'minutes'); // Move by 30 minute increments
            }
            continue;
          }
        }

        const slotStart = current.clone().toDate();
        const slotEnd = current.clone().add(slotDuration).toDate();

        // Check if slot conflicts with busy periods
        const isAvailable = !busyPeriods.some(busy => {
          const busyStart = new Date(busy.start || '');
          const busyEnd = new Date(busy.end || '');
          return !(slotEnd <= busyStart || slotStart >= busyEnd);
        });

        slots.push({
          start: slotStart,
          end: slotEnd,
          available: isAvailable,
        });

        // Move to next slot (30 minute increments)
        current.add(30, 'minutes');
      }

      // Cache results for 5 minutes
      await this.redis.setex(cacheKey, 300, JSON.stringify(slots));

      return slots;
    } catch (error) {
      logger.error('Error finding available slots:', error);
      throw error;
    }
  }

  /**
   * Sync events with local database
   */
  async syncEvents(syncToken?: string): Promise<{ events: calendar_v3.Schema$Event[]; nextSyncToken: string }> {
    if (!this.isInitialized || !this.calendar) {
      throw new Error('Calendar service not initialized');
    }

    try {
      const response = await this.calendar.events.list({
        calendarId: this.calendarId,
        syncToken: syncToken,
        maxResults: 100,
      });

      const events = response.data.items || [];
      const nextSyncToken = response.data.nextSyncToken || '';

      // Queue sync processing job
      if (events.length > 0) {
        await queueManager.addJob('CALENDAR_SYNC', {
          events,
          operation: 'sync',
        });
      }

      logger.info(`Synced ${events.length} calendar events`);
      return { events, nextSyncToken };
    } catch (error: any) {
      if (error.code === 410) {
        // Sync token expired, do full sync
        logger.info('Sync token expired, performing full sync');
        return this.syncEvents();
      }
      logger.error('Error syncing calendar events:', error);
      throw error;
    }
  }

  /**
   * Watch for calendar changes (webhooks)
   */
  async watchCalendar(webhookUrl: string): Promise<calendar_v3.Schema$Channel> {
    if (!this.isInitialized || !this.calendar) {
      throw new Error('Calendar service not initialized');
    }

    const channelId = `castmatch-${Date.now()}`;
    const expiration = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days

    try {
      const response = await this.calendar.events.watch({
        calendarId: this.calendarId,
        requestBody: {
          id: channelId,
          type: 'web_hook',
          address: webhookUrl,
          expiration: expiration.toString(),
        },
      });

      logger.info(`Calendar watch channel created: ${channelId}`);
      return response.data;
    } catch (error) {
      logger.error('Error setting up calendar watch:', error);
      throw error;
    }
  }

  /**
   * Stop watching calendar
   */
  async stopWatching(channelId: string, resourceId: string): Promise<void> {
    if (!this.isInitialized || !this.calendar) {
      throw new Error('Calendar service not initialized');
    }

    try {
      await this.calendar.channels.stop({
        requestBody: {
          id: channelId,
          resourceId,
        },
      });
      logger.info(`Calendar watch channel stopped: ${channelId}`);
    } catch (error) {
      logger.error('Error stopping calendar watch:', error);
    }
  }

  /**
   * Schedule reminder notifications
   */
  private async scheduleReminders(event: calendar_v3.Schema$Event) {
    if (!event.reminders?.overrides || !event.start?.dateTime) return;

    const eventTime = new Date(event.start.dateTime);
    
    for (const reminder of event.reminders.overrides) {
      const reminderTime = new Date(eventTime.getTime() - reminder.minutes * 60000);
      
      // Skip if reminder time has passed
      if (reminderTime <= new Date()) continue;

      // Calculate delay until reminder
      const delay = reminderTime.getTime() - Date.now();

      // Queue reminder notification
      await queueManager.addJob(
        'NOTIFICATION_DISPATCH',
        {
          type: reminder.method === 'email' ? 'email' : 'in-app',
          eventId: event.id,
          eventSummary: event.summary,
          eventTime: eventTime.toISOString(),
          reminderMinutes: reminder.minutes,
          attendees: event.attendees,
        },
        { delay }
      );
    }
  }

  /**
   * Token management
   */
  private async getStoredTokens() {
    const tokens = await this.redis.get('google:calendar:tokens');
    return tokens ? JSON.parse(tokens) : null;
  }

  private async storeTokens(tokens: any) {
    await this.redis.set('google:calendar:tokens', JSON.stringify(tokens));
  }

  private scheduleTokenRefresh() {
    // Refresh token every 45 minutes (tokens expire in 60 minutes)
    setInterval(async () => {
      try {
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        this.oauth2Client.setCredentials(credentials);
        await this.storeTokens(credentials);
        logger.info('Google Calendar token refreshed');
      } catch (error) {
        logger.error('Error refreshing Google Calendar token:', error);
      }
    }, 45 * 60 * 1000);
  }

  /**
   * Cache management
   */
  private async invalidateAvailabilityCache() {
    const keys = await this.redis.keys('availability:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
      logger.debug(`Invalidated ${keys.length} availability cache entries`);
    }
  }
}

// Export singleton instance
export const calendarService = new CalendarService();

// Export types
export { EVENT_TEMPLATES };