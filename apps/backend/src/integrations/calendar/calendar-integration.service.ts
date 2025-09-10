/**
 * Calendar Integration Service
 * Handles Google Calendar, Outlook Calendar, and Apple Calendar integrations
 * with conflict detection, timezone handling, and bi-directional sync
 */

import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';
import { logger } from '../../utils/logger';
import { CacheManager, CacheKeys } from '../../config/redis';
import { addHours, format, parseISO, differenceInMinutes } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import ical from 'node-ical';
import { RRule } from 'rrule';
import Bull, { Queue, Job } from 'bull';

interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  attendees?: Array<{
    email: string;
    name?: string;
    responseStatus?: 'needsAction' | 'accepted' | 'declined' | 'tentative';
  }>;
  recurrence?: string[];
  reminders?: Array<{
    method: 'email' | 'popup' | 'sms';
    minutes: number;
  }>;
  conferenceData?: {
    type: 'zoom' | 'meet' | 'teams';
    url: string;
    conferenceId?: string;
  };
  metadata?: Record<string, any>;
  timezone?: string;
  isAllDay?: boolean;
  color?: string;
  visibility?: 'public' | 'private';
  status?: 'confirmed' | 'tentative' | 'cancelled';
}

interface CalendarConflict {
  existingEvent: CalendarEvent;
  newEvent: CalendarEvent;
  conflictType: 'overlap' | 'buffer_violation' | 'capacity_exceeded';
  severity: 'high' | 'medium' | 'low';
  resolution?: 'reschedule' | 'cancel' | 'override';
}

interface SyncOptions {
  startDate?: Date;
  endDate?: Date;
  calendars?: string[];
  direction?: 'pull' | 'push' | 'bidirectional';
  conflictResolution?: 'skip' | 'override' | 'merge';
  includeRecurring?: boolean;
}

export class CalendarIntegrationService {
  private googleOAuth2Client: OAuth2Client | null = null;
  private googleCalendarAPI: calendar_v3.Calendar | null = null;
  private microsoftAccessToken: string | null = null;
  private syncQueue: Queue;
  private conflictQueue: Queue;
  private readonly bufferTime = 15; // minutes between auditions
  private readonly defaultTimezone = 'Asia/Kolkata'; // IST for Mumbai

  constructor() {
    this.initializeGoogleCalendar();
    this.initializeMicrosoftCalendar();
    this.initializeSyncQueues();
  }

  /**
   * Initialize Google Calendar API
   */
  private initializeGoogleCalendar(): void {
    try {
      this.googleOAuth2Client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      if (process.env.GOOGLE_REFRESH_TOKEN) {
        this.googleOAuth2Client.setCredentials({
          refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        });
        
        this.googleCalendarAPI = google.calendar({ 
          version: 'v3', 
          auth: this.googleOAuth2Client 
        });
        
        logger.info('Google Calendar API initialized successfully');
      }
    } catch (error) {
      logger.error('Failed to initialize Google Calendar', error);
    }
  }

  /**
   * Initialize Microsoft Calendar (Outlook) API
   */
  private async initializeMicrosoftCalendar(): Promise<void> {
    try {
      if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
        const tokenResponse = await axios.post(
          `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,
          new URLSearchParams({
            client_id: process.env.MICROSOFT_CLIENT_ID!,
            client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
            scope: 'https://graph.microsoft.com/.default',
            grant_type: 'client_credentials',
          })
        );

        this.microsoftAccessToken = tokenResponse.data.access_token;
        logger.info('Microsoft Calendar API initialized successfully');

        // Refresh token before expiry
        setTimeout(() => {
          this.initializeMicrosoftCalendar();
        }, (tokenResponse.data.expires_in - 300) * 1000);
      }
    } catch (error) {
      logger.error('Failed to initialize Microsoft Calendar', error);
    }
  }

  /**
   * Initialize sync queues for background processing
   */
  private initializeSyncQueues(): void {
    const redisConfig = {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    };

    this.syncQueue = new Bull('calendar-sync-queue', redisConfig);
    this.conflictQueue = new Bull('calendar-conflict-queue', redisConfig);

    // Process sync jobs
    this.syncQueue.process(async (job: Job) => {
      const { provider, options } = job.data;
      try {
        await this.performSync(provider, options);
        return { success: true, syncedAt: new Date() };
      } catch (error) {
        logger.error('Calendar sync failed', { error, jobId: job.id });
        throw error;
      }
    });

    // Process conflict resolution jobs
    this.conflictQueue.process(async (job: Job) => {
      const { conflict, resolution } = job.data;
      try {
        await this.resolveConflict(conflict, resolution);
        return { success: true, resolvedAt: new Date() };
      } catch (error) {
        logger.error('Conflict resolution failed', { error, jobId: job.id });
        throw error;
      }
    });
  }

  /**
   * Create a calendar event
   */
  async createEvent(provider: 'google' | 'microsoft' | 'apple', event: CalendarEvent): Promise<string> {
    try {
      switch (provider) {
        case 'google':
          return await this.createGoogleEvent(event);
        case 'microsoft':
          return await this.createMicrosoftEvent(event);
        case 'apple':
          return await this.createAppleEvent(event);
        default:
          throw new Error(`Unsupported calendar provider: ${provider}`);
      }
    } catch (error) {
      logger.error('Failed to create calendar event', { provider, event, error });
      throw error;
    }
  }

  /**
   * Create Google Calendar event
   */
  private async createGoogleEvent(event: CalendarEvent): Promise<string> {
    if (!this.googleCalendarAPI) {
      throw new Error('Google Calendar not initialized');
    }

    const timeZone = event.timezone || this.defaultTimezone;
    
    const googleEvent: calendar_v3.Schema$Event = {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: event.isAllDay
        ? { date: format(event.startTime, 'yyyy-MM-dd') }
        : { 
            dateTime: event.startTime.toISOString(),
            timeZone,
          },
      end: event.isAllDay
        ? { date: format(event.endTime, 'yyyy-MM-dd') }
        : {
            dateTime: event.endTime.toISOString(),
            timeZone,
          },
      attendees: event.attendees?.map(attendee => ({
        email: attendee.email,
        displayName: attendee.name,
        responseStatus: attendee.responseStatus,
      })),
      recurrence: event.recurrence,
      reminders: event.reminders ? {
        useDefault: false,
        overrides: event.reminders,
      } : undefined,
      conferenceData: event.conferenceData ? {
        createRequest: {
          requestId: `castmatch-${Date.now()}`,
          conferenceSolutionKey: {
            type: event.conferenceData.type === 'meet' ? 'hangoutsMeet' : 'addOn',
          },
        },
      } : undefined,
      colorId: this.getGoogleColorId(event.color),
      visibility: event.visibility,
      status: event.status,
      extendedProperties: {
        private: event.metadata,
      },
    };

    const response = await this.googleCalendarAPI.events.insert({
      calendarId: 'primary',
      requestBody: googleEvent,
      conferenceDataVersion: event.conferenceData ? 1 : 0,
    });

    logger.info('Google Calendar event created', { eventId: response.data.id });
    return response.data.id!;
  }

  /**
   * Create Microsoft/Outlook Calendar event
   */
  private async createMicrosoftEvent(event: CalendarEvent): Promise<string> {
    if (!this.microsoftAccessToken) {
      throw new Error('Microsoft Calendar not initialized');
    }

    const timeZone = event.timezone || this.defaultTimezone;
    
    const microsoftEvent = {
      subject: event.title,
      body: {
        contentType: 'HTML',
        content: event.description || '',
      },
      start: {
        dateTime: event.startTime.toISOString(),
        timeZone,
      },
      end: {
        dateTime: event.endTime.toISOString(),
        timeZone,
      },
      location: {
        displayName: event.location,
      },
      attendees: event.attendees?.map(attendee => ({
        emailAddress: {
          address: attendee.email,
          name: attendee.name,
        },
        type: 'required',
      })),
      isAllDay: event.isAllDay,
      reminderMinutesBeforeStart: event.reminders?.[0]?.minutes || 15,
      onlineMeeting: event.conferenceData ? {
        isOnlineMeeting: true,
      } : undefined,
      categories: ['CastMatch', 'Audition'],
      importance: event.status === 'confirmed' ? 'high' : 'normal',
    };

    const response = await axios.post(
      'https://graph.microsoft.com/v1.0/me/events',
      microsoftEvent,
      {
        headers: {
          Authorization: `Bearer ${this.microsoftAccessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info('Microsoft Calendar event created', { eventId: response.data.id });
    return response.data.id;
  }

  /**
   * Create Apple Calendar event (via CalDAV)
   */
  private async createAppleEvent(event: CalendarEvent): Promise<string> {
    // Apple Calendar integration via CalDAV protocol
    // This requires iCloud credentials and CalDAV client setup
    
    const icalEvent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CastMatch//Calendar Integration//EN',
      'BEGIN:VEVENT',
      `UID:${Date.now()}@castmatch.ai`,
      `DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}`,
      `DTSTART:${format(event.startTime, "yyyyMMdd'T'HHmmss'Z'")}`,
      `DTEND:${format(event.endTime, "yyyyMMdd'T'HHmmss'Z'")}`,
      `SUMMARY:${event.title}`,
      event.description ? `DESCRIPTION:${event.description}` : '',
      event.location ? `LOCATION:${event.location}` : '',
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean).join('\r\n');

    // Store in cache for now (actual CalDAV implementation would go here)
    const eventId = `apple-${Date.now()}`;
    await CacheManager.set(
      CacheKeys.calendarEvent(eventId),
      { ...event, icalData: icalEvent },
      86400
    );

    logger.info('Apple Calendar event created (cached)', { eventId });
    return eventId;
  }

  /**
   * Update calendar event
   */
  async updateEvent(
    provider: 'google' | 'microsoft' | 'apple',
    eventId: string,
    updates: Partial<CalendarEvent>
  ): Promise<void> {
    try {
      switch (provider) {
        case 'google':
          await this.updateGoogleEvent(eventId, updates);
          break;
        case 'microsoft':
          await this.updateMicrosoftEvent(eventId, updates);
          break;
        case 'apple':
          await this.updateAppleEvent(eventId, updates);
          break;
        default:
          throw new Error(`Unsupported calendar provider: ${provider}`);
      }
    } catch (error) {
      logger.error('Failed to update calendar event', { provider, eventId, updates, error });
      throw error;
    }
  }

  /**
   * Update Google Calendar event
   */
  private async updateGoogleEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<void> {
    if (!this.googleCalendarAPI) {
      throw new Error('Google Calendar not initialized');
    }

    const existingEvent = await this.googleCalendarAPI.events.get({
      calendarId: 'primary',
      eventId,
    });

    const updatedEvent: calendar_v3.Schema$Event = {
      ...existingEvent.data,
      summary: updates.title || existingEvent.data.summary,
      description: updates.description || existingEvent.data.description,
      location: updates.location || existingEvent.data.location,
    };

    if (updates.startTime) {
      updatedEvent.start = {
        dateTime: updates.startTime.toISOString(),
        timeZone: updates.timezone || this.defaultTimezone,
      };
    }

    if (updates.endTime) {
      updatedEvent.end = {
        dateTime: updates.endTime.toISOString(),
        timeZone: updates.timezone || this.defaultTimezone,
      };
    }

    await this.googleCalendarAPI.events.update({
      calendarId: 'primary',
      eventId,
      requestBody: updatedEvent,
    });

    logger.info('Google Calendar event updated', { eventId });
  }

  /**
   * Update Microsoft Calendar event
   */
  private async updateMicrosoftEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<void> {
    if (!this.microsoftAccessToken) {
      throw new Error('Microsoft Calendar not initialized');
    }

    const microsoftUpdates: any = {};

    if (updates.title) microsoftUpdates.subject = updates.title;
    if (updates.description) {
      microsoftUpdates.body = {
        contentType: 'HTML',
        content: updates.description,
      };
    }
    if (updates.location) {
      microsoftUpdates.location = {
        displayName: updates.location,
      };
    }
    if (updates.startTime) {
      microsoftUpdates.start = {
        dateTime: updates.startTime.toISOString(),
        timeZone: updates.timezone || this.defaultTimezone,
      };
    }
    if (updates.endTime) {
      microsoftUpdates.end = {
        dateTime: updates.endTime.toISOString(),
        timeZone: updates.timezone || this.defaultTimezone,
      };
    }

    await axios.patch(
      `https://graph.microsoft.com/v1.0/me/events/${eventId}`,
      microsoftUpdates,
      {
        headers: {
          Authorization: `Bearer ${this.microsoftAccessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info('Microsoft Calendar event updated', { eventId });
  }

  /**
   * Update Apple Calendar event
   */
  private async updateAppleEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<void> {
    // Update cached event (actual CalDAV implementation would go here)
    const cachedEvent = await CacheManager.get(CacheKeys.calendarEvent(eventId));
    if (cachedEvent) {
      await CacheManager.set(
        CacheKeys.calendarEvent(eventId),
        { ...cachedEvent, ...updates },
        86400
      );
      logger.info('Apple Calendar event updated (cached)', { eventId });
    }
  }

  /**
   * Delete calendar event
   */
  async deleteEvent(provider: 'google' | 'microsoft' | 'apple', eventId: string): Promise<void> {
    try {
      switch (provider) {
        case 'google':
          await this.deleteGoogleEvent(eventId);
          break;
        case 'microsoft':
          await this.deleteMicrosoftEvent(eventId);
          break;
        case 'apple':
          await this.deleteAppleEvent(eventId);
          break;
        default:
          throw new Error(`Unsupported calendar provider: ${provider}`);
      }
    } catch (error) {
      logger.error('Failed to delete calendar event', { provider, eventId, error });
      throw error;
    }
  }

  /**
   * Delete Google Calendar event
   */
  private async deleteGoogleEvent(eventId: string): Promise<void> {
    if (!this.googleCalendarAPI) {
      throw new Error('Google Calendar not initialized');
    }

    await this.googleCalendarAPI.events.delete({
      calendarId: 'primary',
      eventId,
    });

    logger.info('Google Calendar event deleted', { eventId });
  }

  /**
   * Delete Microsoft Calendar event
   */
  private async deleteMicrosoftEvent(eventId: string): Promise<void> {
    if (!this.microsoftAccessToken) {
      throw new Error('Microsoft Calendar not initialized');
    }

    await axios.delete(
      `https://graph.microsoft.com/v1.0/me/events/${eventId}`,
      {
        headers: {
          Authorization: `Bearer ${this.microsoftAccessToken}`,
        },
      }
    );

    logger.info('Microsoft Calendar event deleted', { eventId });
  }

  /**
   * Delete Apple Calendar event
   */
  private async deleteAppleEvent(eventId: string): Promise<void> {
    await CacheManager.del(CacheKeys.calendarEvent(eventId));
    logger.info('Apple Calendar event deleted (cached)', { eventId });
  }

  /**
   * Check for conflicts with existing calendar events
   */
  async checkConflicts(
    provider: 'google' | 'microsoft' | 'apple',
    newEvent: CalendarEvent
  ): Promise<CalendarConflict[]> {
    const conflicts: CalendarConflict[] = [];

    try {
      const existingEvents = await this.getEvents(provider, {
        startDate: addHours(newEvent.startTime, -24),
        endDate: addHours(newEvent.endTime, 24),
      });

      for (const existing of existingEvents) {
        // Check for time overlap
        if (this.eventsOverlap(existing, newEvent)) {
          conflicts.push({
            existingEvent: existing,
            newEvent,
            conflictType: 'overlap',
            severity: existing.status === 'confirmed' ? 'high' : 'medium',
          });
        }

        // Check for buffer time violations
        if (this.violatesBufferTime(existing, newEvent)) {
          conflicts.push({
            existingEvent: existing,
            newEvent,
            conflictType: 'buffer_violation',
            severity: 'low',
            resolution: 'reschedule',
          });
        }
      }

      // Cache conflicts for resolution
      if (conflicts.length > 0) {
        await CacheManager.set(
          CacheKeys.calendarConflicts(newEvent.id || Date.now().toString()),
          conflicts,
          3600
        );
      }

      return conflicts;
    } catch (error) {
      logger.error('Failed to check calendar conflicts', { provider, newEvent, error });
      return [];
    }
  }

  /**
   * Get calendar events
   */
  async getEvents(
    provider: 'google' | 'microsoft' | 'apple',
    options: {
      startDate?: Date;
      endDate?: Date;
      query?: string;
    } = {}
  ): Promise<CalendarEvent[]> {
    try {
      switch (provider) {
        case 'google':
          return await this.getGoogleEvents(options);
        case 'microsoft':
          return await this.getMicrosoftEvents(options);
        case 'apple':
          return await this.getAppleEvents(options);
        default:
          throw new Error(`Unsupported calendar provider: ${provider}`);
      }
    } catch (error) {
      logger.error('Failed to get calendar events', { provider, options, error });
      return [];
    }
  }

  /**
   * Get Google Calendar events
   */
  private async getGoogleEvents(options: {
    startDate?: Date;
    endDate?: Date;
    query?: string;
  }): Promise<CalendarEvent[]> {
    if (!this.googleCalendarAPI) {
      throw new Error('Google Calendar not initialized');
    }

    const response = await this.googleCalendarAPI.events.list({
      calendarId: 'primary',
      timeMin: options.startDate?.toISOString(),
      timeMax: options.endDate?.toISOString(),
      q: options.query,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return (response.data.items || []).map(item => this.mapGoogleEventToCalendarEvent(item));
  }

  /**
   * Get Microsoft Calendar events
   */
  private async getMicrosoftEvents(options: {
    startDate?: Date;
    endDate?: Date;
    query?: string;
  }): Promise<CalendarEvent[]> {
    if (!this.microsoftAccessToken) {
      throw new Error('Microsoft Calendar not initialized');
    }

    let url = 'https://graph.microsoft.com/v1.0/me/events';
    const params: string[] = [];

    if (options.startDate && options.endDate) {
      params.push(`$filter=start/dateTime ge '${options.startDate.toISOString()}' and end/dateTime le '${options.endDate.toISOString()}'`);
    }
    if (options.query) {
      params.push(`$search="${options.query}"`);
    }

    if (params.length > 0) {
      url += '?' + params.join('&');
    }

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${this.microsoftAccessToken}`,
      },
    });

    return (response.data.value || []).map((item: any) => this.mapMicrosoftEventToCalendarEvent(item));
  }

  /**
   * Get Apple Calendar events
   */
  private async getAppleEvents(options: {
    startDate?: Date;
    endDate?: Date;
    query?: string;
  }): Promise<CalendarEvent[]> {
    // Return cached events (actual CalDAV implementation would go here)
    const events: CalendarEvent[] = [];
    
    // This is a placeholder - actual implementation would use CalDAV
    logger.info('Apple Calendar events requested (using cache)', options);
    
    return events;
  }

  /**
   * Sync calendars
   */
  async syncCalendars(
    sourceProvider: 'google' | 'microsoft' | 'apple',
    targetProvider: 'google' | 'microsoft' | 'apple',
    options: SyncOptions = {}
  ): Promise<{ synced: number; conflicts: number; errors: number }> {
    const result = { synced: 0, conflicts: 0, errors: 0 };

    try {
      // Add to sync queue for background processing
      const job = await this.syncQueue.add(
        {
          sourceProvider,
          targetProvider,
          options,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        }
      );

      // Wait for job completion
      const jobResult = await job.finished();
      return jobResult || result;
    } catch (error) {
      logger.error('Calendar sync failed', { sourceProvider, targetProvider, options, error });
      result.errors++;
      return result;
    }
  }

  /**
   * Perform calendar sync
   */
  private async performSync(
    provider: 'google' | 'microsoft' | 'apple',
    options: SyncOptions
  ): Promise<void> {
    // Implementation for actual sync logic
    logger.info('Performing calendar sync', { provider, options });
    
    // Get events from source
    const sourceEvents = await this.getEvents(provider, {
      startDate: options.startDate,
      endDate: options.endDate,
    });

    // Process each event
    for (const event of sourceEvents) {
      try {
        // Check for conflicts
        const conflicts = await this.checkConflicts(provider, event);
        
        if (conflicts.length > 0 && options.conflictResolution === 'skip') {
          continue;
        }

        // Create or update event in target
        if (!event.id) {
          await this.createEvent(provider, event);
        } else {
          await this.updateEvent(provider, event.id, event);
        }
      } catch (error) {
        logger.error('Failed to sync event', { event, error });
      }
    }
  }

  /**
   * Resolve calendar conflict
   */
  private async resolveConflict(
    conflict: CalendarConflict,
    resolution: 'reschedule' | 'cancel' | 'override'
  ): Promise<void> {
    switch (resolution) {
      case 'reschedule':
        // Find next available slot
        const nextSlot = await this.findNextAvailableSlot(
          conflict.newEvent.startTime,
          differenceInMinutes(conflict.newEvent.endTime, conflict.newEvent.startTime)
        );
        
        if (nextSlot) {
          conflict.newEvent.startTime = nextSlot.start;
          conflict.newEvent.endTime = nextSlot.end;
        }
        break;
        
      case 'cancel':
        // Cancel the new event
        conflict.newEvent.status = 'cancelled';
        break;
        
      case 'override':
        // Override existing event
        if (conflict.existingEvent.id) {
          conflict.existingEvent.status = 'cancelled';
        }
        break;
    }

    logger.info('Calendar conflict resolved', { conflict, resolution });
  }

  /**
   * Find next available time slot
   */
  async findNextAvailableSlot(
    startFrom: Date,
    durationMinutes: number
  ): Promise<{ start: Date; end: Date } | null> {
    const maxDays = 30;
    const businessHours = { start: 9, end: 18 }; // 9 AM to 6 PM
    
    for (let day = 0; day < maxDays; day++) {
      const checkDate = addHours(startFrom, day * 24);
      
      // Skip weekends
      if (checkDate.getDay() === 0 || checkDate.getDay() === 6) {
        continue;
      }

      // Check business hours
      const dayStart = new Date(checkDate);
      dayStart.setHours(businessHours.start, 0, 0, 0);
      
      const dayEnd = new Date(checkDate);
      dayEnd.setHours(businessHours.end, 0, 0, 0);

      // Get events for this day
      const dayEvents = await this.getEvents('google', {
        startDate: dayStart,
        endDate: dayEnd,
      });

      // Find available slots
      const slots = this.findAvailableSlots(dayStart, dayEnd, dayEvents, durationMinutes);
      
      if (slots.length > 0) {
        return slots[0];
      }
    }

    return null;
  }

  /**
   * Find available slots in a day
   */
  private findAvailableSlots(
    dayStart: Date,
    dayEnd: Date,
    events: CalendarEvent[],
    durationMinutes: number
  ): Array<{ start: Date; end: Date }> {
    const slots: Array<{ start: Date; end: Date }> = [];
    const sortedEvents = events.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    let currentTime = dayStart;

    for (const event of sortedEvents) {
      const gap = differenceInMinutes(event.startTime, currentTime);
      
      if (gap >= durationMinutes + this.bufferTime * 2) {
        slots.push({
          start: new Date(currentTime.getTime() + this.bufferTime * 60000),
          end: new Date(currentTime.getTime() + (this.bufferTime + durationMinutes) * 60000),
        });
      }
      
      currentTime = event.endTime;
    }

    // Check last slot
    const finalGap = differenceInMinutes(dayEnd, currentTime);
    if (finalGap >= durationMinutes + this.bufferTime) {
      slots.push({
        start: new Date(currentTime.getTime() + this.bufferTime * 60000),
        end: new Date(currentTime.getTime() + (this.bufferTime + durationMinutes) * 60000),
      });
    }

    return slots;
  }

  /**
   * Check if two events overlap
   */
  private eventsOverlap(event1: CalendarEvent, event2: CalendarEvent): boolean {
    return (
      (event1.startTime < event2.endTime && event1.endTime > event2.startTime) ||
      (event2.startTime < event1.endTime && event2.endTime > event1.startTime)
    );
  }

  /**
   * Check if events violate buffer time
   */
  private violatesBufferTime(event1: CalendarEvent, event2: CalendarEvent): boolean {
    const gap = Math.abs(
      Math.min(
        differenceInMinutes(event2.startTime, event1.endTime),
        differenceInMinutes(event1.startTime, event2.endTime)
      )
    );
    
    return gap > 0 && gap < this.bufferTime;
  }

  /**
   * Map Google event to CalendarEvent
   */
  private mapGoogleEventToCalendarEvent(googleEvent: calendar_v3.Schema$Event): CalendarEvent {
    return {
      id: googleEvent.id || undefined,
      title: googleEvent.summary || '',
      description: googleEvent.description,
      location: googleEvent.location,
      startTime: new Date(googleEvent.start?.dateTime || googleEvent.start?.date || ''),
      endTime: new Date(googleEvent.end?.dateTime || googleEvent.end?.date || ''),
      attendees: googleEvent.attendees?.map(attendee => ({
        email: attendee.email || '',
        name: attendee.displayName,
        responseStatus: attendee.responseStatus as any,
      })),
      recurrence: googleEvent.recurrence,
      status: googleEvent.status as any,
      isAllDay: !!googleEvent.start?.date,
    };
  }

  /**
   * Map Microsoft event to CalendarEvent
   */
  private mapMicrosoftEventToCalendarEvent(microsoftEvent: any): CalendarEvent {
    return {
      id: microsoftEvent.id,
      title: microsoftEvent.subject,
      description: microsoftEvent.body?.content,
      location: microsoftEvent.location?.displayName,
      startTime: new Date(microsoftEvent.start.dateTime),
      endTime: new Date(microsoftEvent.end.dateTime),
      attendees: microsoftEvent.attendees?.map((attendee: any) => ({
        email: attendee.emailAddress.address,
        name: attendee.emailAddress.name,
        responseStatus: this.mapMicrosoftResponseStatus(attendee.status?.response),
      })),
      isAllDay: microsoftEvent.isAllDay,
      status: microsoftEvent.isCancelled ? 'cancelled' : 'confirmed',
    };
  }

  /**
   * Map Microsoft response status
   */
  private mapMicrosoftResponseStatus(status?: string): 'needsAction' | 'accepted' | 'declined' | 'tentative' {
    switch (status) {
      case 'accepted': return 'accepted';
      case 'declined': return 'declined';
      case 'tentativelyAccepted': return 'tentative';
      default: return 'needsAction';
    }
  }

  /**
   * Get Google Calendar color ID
   */
  private getGoogleColorId(color?: string): string | undefined {
    const colorMap: Record<string, string> = {
      'red': '11',
      'blue': '9',
      'green': '10',
      'purple': '3',
      'yellow': '5',
      'orange': '6',
      'turquoise': '7',
      'gray': '8',
      'bold-blue': '9',
      'bold-green': '10',
      'bold-red': '11',
    };
    
    return color ? colorMap[color] : undefined;
  }

  /**
   * Schedule recurring auditions
   */
  async scheduleRecurringAuditions(
    provider: 'google' | 'microsoft' | 'apple',
    baseEvent: CalendarEvent,
    recurrenceRule: string // RRULE format
  ): Promise<string[]> {
    const eventIds: string[] = [];

    try {
      const rrule = RRule.fromString(recurrenceRule);
      const occurrences = rrule.between(
        baseEvent.startTime,
        addHours(baseEvent.startTime, 365 * 24), // Next year
        true
      );

      for (const occurrence of occurrences.slice(0, 50)) { // Limit to 50 occurrences
        const duration = differenceInMinutes(baseEvent.endTime, baseEvent.startTime);
        const recurringEvent: CalendarEvent = {
          ...baseEvent,
          startTime: occurrence,
          endTime: addHours(occurrence, duration / 60),
        };

        const eventId = await this.createEvent(provider, recurringEvent);
        eventIds.push(eventId);
      }

      logger.info('Recurring auditions scheduled', { 
        provider, 
        count: eventIds.length,
        recurrenceRule 
      });

      return eventIds;
    } catch (error) {
      logger.error('Failed to schedule recurring auditions', { 
        provider, 
        baseEvent, 
        recurrenceRule, 
        error 
      });
      throw error;
    }
  }

  /**
   * Send calendar invites
   */
  async sendCalendarInvite(
    event: CalendarEvent,
    recipients: string[]
  ): Promise<void> {
    try {
      // Generate iCal format
      const ical = this.generateICalendar(event);

      // Send via email service
      const { emailService } = await import('../../services/email.service');
      
      for (const recipient of recipients) {
        await emailService.sendEmail({
          to: recipient,
          subject: `Calendar Invite: ${event.title}`,
          html: this.generateInviteHTML(event),
          text: this.generateInviteText(event),
          attachments: [
            {
              filename: 'invite.ics',
              content: Buffer.from(ical),
              contentId: 'calendar-invite',
            },
          ],
        });
      }

      logger.info('Calendar invites sent', { 
        eventTitle: event.title, 
        recipients: recipients.length 
      });
    } catch (error) {
      logger.error('Failed to send calendar invites', { event, recipients, error });
      throw error;
    }
  }

  /**
   * Generate iCalendar format
   */
  private generateICalendar(event: CalendarEvent): string {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CastMatch//Calendar Integration//EN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:${event.id || Date.now()}@castmatch.ai`,
      `DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}`,
      `DTSTART:${format(event.startTime, "yyyyMMdd'T'HHmmss'Z'")}`,
      `DTEND:${format(event.endTime, "yyyyMMdd'T'HHmmss'Z'")}`,
      `SUMMARY:${event.title}`,
    ];

    if (event.description) {
      lines.push(`DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`);
    }
    if (event.location) {
      lines.push(`LOCATION:${event.location}`);
    }
    if (event.attendees) {
      event.attendees.forEach(attendee => {
        lines.push(`ATTENDEE;ROLE=REQ-PARTICIPANT;CN="${attendee.name || ''}":mailto:${attendee.email}`);
      });
    }

    lines.push('STATUS:CONFIRMED', 'END:VEVENT', 'END:VCALENDAR');

    return lines.join('\r\n');
  }

  /**
   * Generate invite HTML
   */
  private generateInviteHTML(event: CalendarEvent): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You're Invited: ${event.title}</h2>
        <p><strong>When:</strong> ${format(event.startTime, 'PPpp')}</p>
        <p><strong>Duration:</strong> ${differenceInMinutes(event.endTime, event.startTime)} minutes</p>
        ${event.location ? `<p><strong>Where:</strong> ${event.location}</p>` : ''}
        ${event.description ? `<p><strong>Details:</strong><br>${event.description}</p>` : ''}
        ${event.conferenceData ? `<p><strong>Join Online:</strong> <a href="${event.conferenceData.url}">${event.conferenceData.url}</a></p>` : ''}
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          This invitation includes a calendar file (.ics) that you can import into your calendar application.
        </p>
      </div>
    `;
  }

  /**
   * Generate invite text
   */
  private generateInviteText(event: CalendarEvent): string {
    return `
You're Invited: ${event.title}

When: ${format(event.startTime, 'PPpp')}
Duration: ${differenceInMinutes(event.endTime, event.startTime)} minutes
${event.location ? `Where: ${event.location}` : ''}
${event.description ? `\nDetails:\n${event.description}` : ''}
${event.conferenceData ? `\nJoin Online: ${event.conferenceData.url}` : ''}

This invitation includes a calendar file (.ics) that you can import into your calendar application.
    `.trim();
  }
}

export const calendarIntegrationService = new CalendarIntegrationService();