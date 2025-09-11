/**
 * Google Calendar Integration Service
 * Handles calendar synchronization and audition scheduling
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import crypto from 'crypto';
import { DateTime } from 'luxon';

interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
    optional?: boolean;
  }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup' | 'sms';
      minutes: number;
    }>;
  };
  conferenceData?: {
    createRequest?: {
      requestId: string;
      conferenceSolutionKey: {
        type: 'hangoutsMeet' | 'eventHangout' | 'eventNamedHangout';
      };
    };
    entryPoints?: Array<{
      entryPointType: string;
      uri: string;
      label?: string;
    }>;
  };
  extendedProperties?: {
    private?: Record<string, string>;
    shared?: Record<string, string>;
  };
  recurrence?: string[];
  recurringEventId?: string;
}

interface ConflictCheckResult {
  hasConflict: boolean;
  conflictingEvents: Array<{
    id: string;
    summary: string;
    start: string;
    end: string;
  }>;
  suggestion?: {
    start: Date;
    end: Date;
  };
}

interface WebhookConfig {
  id: string;
  resourceId: string;
  resourceUri: string;
  token: string;
  expiration: number;
  address: string;
  params?: Record<string, string>;
}

interface AuditionDetails {
  projectName: string;
  projectId?: string;
  talentName: string;
  talentEmail: string;
  castingDirector: string;
  castingEmail: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  notes?: string;
  meetingLink?: string;
  isVirtual?: boolean;
  auditionType?: 'in-person' | 'virtual' | 'self-tape';
  timezone?: string;
}

export class GoogleCalendarService {
  private oauth2Client: OAuth2Client;
  private calendar: any;
  private webhookChannels: Map<string, WebhookConfig> = new Map();
  private conflictBuffer: number = 15; // 15 minutes buffer between events

  constructor() {
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Set user credentials for OAuth2
   */
  setCredentials(tokens: any) {
    this.oauth2Client.setCredentials(tokens);
  }

  /**
   * Generate OAuth2 authorization URL
   */
  getAuthUrl(state?: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ],
      state,
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokens(code: string): Promise<any> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      return tokens;
    } catch (error) {
      logger.error('Failed to exchange auth code for tokens:', error);
      throw new AppError('Failed to authenticate with Google', 401);
    }
  }

  /**
   * Create an audition event with conflict detection
   */
  async createAuditionEvent(details: AuditionDetails): Promise<string> {
    try {
      // Check for conflicts before creating the event
      const conflictCheck = await this.checkForConflicts(
        details.startTime,
        details.endTime,
        [details.talentEmail, details.castingEmail]
      );

      if (conflictCheck.hasConflict) {
        logger.warn('Scheduling conflict detected', conflictCheck);
        
        // If auto-resolve is enabled and we have a suggestion
        if (conflictCheck.suggestion) {
          details.startTime = conflictCheck.suggestion.start;
          details.endTime = conflictCheck.suggestion.end;
          logger.info('Auto-resolved conflict with new time', conflictCheck.suggestion);
        } else {
          throw new AppError(
            `Scheduling conflict detected with ${conflictCheck.conflictingEvents.length} events`,
            409
          );
        }
      }

      const event: CalendarEvent = {
        summary: `Audition: ${details.projectName} - ${details.talentName}`,
        description: this.buildEventDescription(details),
        location: details.location || details.meetingLink || 'TBD',
        start: {
          dateTime: details.startTime.toISOString(),
          timeZone: this.getTimezone(details),
        },
        end: {
          dateTime: details.endTime.toISOString(),
          timeZone: this.getTimezone(details),
        },
        attendees: [
          {
            email: details.talentEmail,
            displayName: details.talentName,
            optional: false,
          },
          {
            email: details.castingEmail,
            displayName: details.castingDirector,
            optional: false,
          },
        ],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'email', minutes: 60 }, // 1 hour before
            { method: 'popup', minutes: 30 }, // 30 minutes before
          ],
        },
        extendedProperties: {
          private: {
            castmatchId: uuidv4(),
            projectId: details.projectId || '',
            auditionType: details.auditionType || 'in-person',
          },
        },
      };

      // Add video conferencing if it's a virtual audition
      if (details.isVirtual || details.meetingLink) {
        event.conferenceData = {
          createRequest: {
            requestId: uuidv4(),
            conferenceSolutionKey: {
              type: 'hangoutsMeet',
            },
          },
        };
      }

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        sendNotifications: true,
        conferenceDataVersion: details.isVirtual ? 1 : 0,
      });

      logger.info(`Created audition event: ${response.data.id}`);
      return response.data.id;
    } catch (error) {
      logger.error('Failed to create audition event:', error);
      throw error instanceof AppError ? error : new AppError('Failed to schedule audition', 500);
    }
  }

  /**
   * Update an existing audition event
   */
  async updateAuditionEvent(eventId: string, updates: Partial<AuditionDetails>): Promise<void> {
    try {
      const existingEvent = await this.calendar.events.get({
        calendarId: 'primary',
        eventId,
      });

      const updatedEvent = { ...existingEvent.data };

      if (updates.startTime) {
        updatedEvent.start = {
          dateTime: updates.startTime.toISOString(),
          timeZone: 'America/Los_Angeles',
        };
      }

      if (updates.endTime) {
        updatedEvent.end = {
          dateTime: updates.endTime.toISOString(),
          timeZone: 'America/Los_Angeles',
        };
      }

      if (updates.location || updates.meetingLink) {
        updatedEvent.location = updates.location || updates.meetingLink;
      }

      if (updates.notes) {
        updatedEvent.description = this.buildEventDescription(updates as AuditionDetails);
      }

      await this.calendar.events.update({
        calendarId: 'primary',
        eventId,
        resource: updatedEvent,
        sendNotifications: true,
      });

      logger.info(`Updated audition event: ${eventId}`);
    } catch (error) {
      logger.error('Failed to update audition event:', error);
      throw new AppError('Failed to update audition', 500);
    }
  }

  /**
   * Cancel an audition event
   */
  async cancelAuditionEvent(eventId: string, reason?: string): Promise<void> {
    try {
      // First, update the event with cancellation notice
      const event = await this.calendar.events.get({
        calendarId: 'primary',
        eventId,
      });

      event.data.summary = `[CANCELLED] ${event.data.summary}`;
      event.data.description = `CANCELLED: ${reason || 'Scheduling conflict'}\n\n${event.data.description}`;

      await this.calendar.events.update({
        calendarId: 'primary',
        eventId,
        resource: event.data,
        sendNotifications: true,
      });

      // Then delete the event
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId,
        sendNotifications: true,
      });

      logger.info(`Cancelled audition event: ${eventId}`);
    } catch (error) {
      logger.error('Failed to cancel audition event:', error);
      throw new AppError('Failed to cancel audition', 500);
    }
  }

  /**
   * Get available time slots for scheduling
   */
  async getAvailableSlots(
    startDate: Date,
    endDate: Date,
    duration: number = 60
  ): Promise<Array<{ start: Date; end: Date }>> {
    try {
      const busyTimes = await this.calendar.freebusy.query({
        resource: {
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
          items: [{ id: 'primary' }],
        },
      });

      const busy = busyTimes.data.calendars.primary.busy || [];
      const availableSlots: Array<{ start: Date; end: Date }> = [];

      // Convert busy times to available slots
      let currentTime = new Date(startDate);
      
      for (const busySlot of busy) {
        const busyStart = new Date(busySlot.start);
        
        // If there's a gap before this busy slot, it's available
        if (currentTime < busyStart) {
          const slotEnd = new Date(Math.min(busyStart.getTime(), endDate.getTime()));
          
          // Check if the gap is long enough for the duration
          if (slotEnd.getTime() - currentTime.getTime() >= duration * 60 * 1000) {
            availableSlots.push({
              start: new Date(currentTime),
              end: slotEnd,
            });
          }
        }
        
        currentTime = new Date(busySlot.end);
      }

      // Check for availability after the last busy slot
      if (currentTime < endDate) {
        availableSlots.push({
          start: new Date(currentTime),
          end: new Date(endDate),
        });
      }

      return availableSlots;
    } catch (error) {
      logger.error('Failed to get available slots:', error);
      throw new AppError('Failed to check availability', 500);
    }
  }

  /**
   * Get upcoming auditions
   */
  async getUpcomingAuditions(days: number = 7): Promise<any[]> {
    try {
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: now.toISOString(),
        timeMax: futureDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        q: 'Audition',
      });

      return response.data.items || [];
    } catch (error) {
      logger.error('Failed to get upcoming auditions:', error);
      throw new AppError('Failed to fetch auditions', 500);
    }
  }

  /**
   * Sync calendar events with database
   */
  async syncWithDatabase(userId: string): Promise<void> {
    try {
      const events = await this.getUpcomingAuditions(30);
      
      // TODO: Implement database sync logic
      // This would update the auditions table with calendar events
      
      logger.info(`Synced ${events.length} calendar events for user ${userId}`);
    } catch (error) {
      logger.error('Failed to sync calendar with database:', error);
      throw error;
    }
  }

  /**
   * Build event description from audition details
   */
  private buildEventDescription(details: AuditionDetails): string {
    const lines = [
      `Project: ${details.projectName}`,
      `Talent: ${details.talentName}`,
      `Casting Director: ${details.castingDirector}`,
    ];

    if (details.meetingLink) {
      lines.push(`\nMeeting Link: ${details.meetingLink}`);
    }

    if (details.notes) {
      lines.push(`\nNotes:\n${details.notes}`);
    }

    lines.push('\n---\nScheduled via CastMatch AI');

    return lines.join('\n');
  }

  /**
   * Create a recurring audition series
   */
  async createRecurringAudition(
    details: AuditionDetails,
    recurrence: {
      frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
      count?: number;
      until?: Date;
      interval?: number;
    }
  ): Promise<string> {
    try {
      const rrule = this.buildRecurrenceRule(recurrence);
      
      const event: any = {
        summary: `Audition Series: ${details.projectName}`,
        description: this.buildEventDescription(details),
        location: details.location || details.meetingLink || 'TBD',
        start: {
          dateTime: details.startTime.toISOString(),
          timeZone: 'America/Los_Angeles',
        },
        end: {
          dateTime: details.endTime.toISOString(),
          timeZone: 'America/Los_Angeles',
        },
        recurrence: [rrule],
        attendees: [
          {
            email: details.talentEmail,
            displayName: details.talentName,
          },
        ],
      };

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        sendNotifications: true,
      });

      logger.info(`Created recurring audition series: ${response.data.id}`);
      return response.data.id;
    } catch (error) {
      logger.error('Failed to create recurring audition:', error);
      throw new AppError('Failed to schedule recurring audition', 500);
    }
  }

  /**
   * Build recurrence rule string
   */
  private buildRecurrenceRule(recurrence: any): string {
    let rule = `RRULE:FREQ=${recurrence.frequency}`;
    
    if (recurrence.interval) {
      rule += `;INTERVAL=${recurrence.interval}`;
    }
    
    if (recurrence.count) {
      rule += `;COUNT=${recurrence.count}`;
    } else if (recurrence.until) {
      const untilDate = recurrence.until.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      rule += `;UNTIL=${untilDate}`;
    }
    
    if (recurrence.byDay) {
      rule += `;BYDAY=${recurrence.byDay.join(',')}`;
    }
    
    return rule;
  }

  /**
   * Check for scheduling conflicts
   */
  async checkForConflicts(
    startTime: Date,
    endTime: Date,
    attendeeEmails: string[]
  ): Promise<ConflictCheckResult> {
    try {
      const conflicts: any[] = [];
      
      // Check each attendee's calendar
      const freeBusyRequest = {
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        items: attendeeEmails.map(email => ({ id: email })),
      };

      const freeBusyResponse = await this.calendar.freebusy.query({
        resource: freeBusyRequest,
      });

      // Analyze busy times for conflicts
      for (const [email, calendar] of Object.entries(freeBusyResponse.data.calendars || {})) {
        const busyTimes = (calendar as any).busy || [];
        
        for (const busy of busyTimes) {
          const busyStart = new Date(busy.start);
          const busyEnd = new Date(busy.end);
          
          // Check if there's an overlap
          if (
            (startTime >= busyStart && startTime < busyEnd) ||
            (endTime > busyStart && endTime <= busyEnd) ||
            (startTime <= busyStart && endTime >= busyEnd)
          ) {
            conflicts.push({
              id: `conflict-${Date.now()}`,
              summary: `Busy time for ${email}`,
              start: busy.start,
              end: busy.end,
            });
          }
        }
      }

      // If conflicts found, try to find an alternative time
      let suggestion;
      if (conflicts.length > 0) {
        suggestion = await this.findAlternativeTime(
          startTime,
          endTime,
          attendeeEmails,
          endTime.getTime() - startTime.getTime()
        );
      }

      return {
        hasConflict: conflicts.length > 0,
        conflictingEvents: conflicts,
        suggestion,
      };
    } catch (error) {
      logger.error('Failed to check for conflicts:', error);
      // Return no conflict on error to allow scheduling
      return {
        hasConflict: false,
        conflictingEvents: [],
      };
    }
  }

  /**
   * Find alternative time slot
   */
  private async findAlternativeTime(
    originalStart: Date,
    originalEnd: Date,
    attendeeEmails: string[],
    duration: number
  ): Promise<{ start: Date; end: Date } | undefined> {
    try {
      const searchStart = new Date(originalStart);
      const searchEnd = new Date(originalStart);
      searchEnd.setDate(searchEnd.getDate() + 7); // Search within next 7 days

      const availableSlots = await this.getAvailableSlots(
        searchStart,
        searchEnd,
        duration / (60 * 1000)
      );

      // Find first available slot that works for all attendees
      for (const slot of availableSlots) {
        const conflictCheck = await this.checkForConflicts(
          slot.start,
          slot.end,
          attendeeEmails
        );

        if (!conflictCheck.hasConflict) {
          return slot;
        }
      }

      return undefined;
    } catch (error) {
      logger.error('Failed to find alternative time:', error);
      return undefined;
    }
  }

  /**
   * Setup webhook for calendar changes
   */
  async setupWebhook(calendarId: string = 'primary', webhookUrl: string): Promise<WebhookConfig> {
    try {
      const channelId = uuidv4();
      const token = crypto.randomBytes(32).toString('hex');
      const expiration = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

      const response = await this.calendar.events.watch({
        calendarId,
        requestBody: {
          id: channelId,
          type: 'web_hook',
          address: webhookUrl,
          token,
          expiration: expiration.toString(),
          params: {
            ttl: '604800', // 7 days in seconds
          },
        },
      });

      const webhookConfig: WebhookConfig = {
        id: response.data.id,
        resourceId: response.data.resourceId,
        resourceUri: response.data.resourceUri,
        token,
        expiration,
        address: webhookUrl,
      };

      // Store webhook configuration
      this.webhookChannels.set(channelId, webhookConfig);

      logger.info(`Setup webhook for calendar ${calendarId}:`, webhookConfig);
      return webhookConfig;
    } catch (error) {
      logger.error('Failed to setup webhook:', error);
      throw new AppError('Failed to setup calendar webhook', 500);
    }
  }

  /**
   * Handle webhook notification
   */
  async handleWebhookNotification(
    channelId: string,
    resourceId: string,
    token: string,
    syncToken?: string
  ): Promise<any[]> {
    try {
      // Verify webhook token
      const webhookConfig = this.webhookChannels.get(channelId);
      if (!webhookConfig || webhookConfig.token !== token) {
        throw new AppError('Invalid webhook token', 401);
      }

      // Get incremental changes since last sync
      const changes = await this.getIncrementalChanges('primary', syncToken);
      
      // Process each change
      for (const event of changes.items || []) {
        await this.processEventChange(event);
      }

      return changes.items || [];
    } catch (error) {
      logger.error('Failed to handle webhook notification:', error);
      throw error;
    }
  }

  /**
   * Get incremental changes
   */
  private async getIncrementalChanges(calendarId: string, syncToken?: string): Promise<any> {
    try {
      const params: any = {
        calendarId,
      };

      if (syncToken) {
        params.syncToken = syncToken;
      } else {
        // If no sync token, get changes from last 7 days
        const timeMin = new Date();
        timeMin.setDate(timeMin.getDate() - 7);
        params.timeMin = timeMin.toISOString();
      }

      const response = await this.calendar.events.list(params);
      return {
        items: response.data.items,
        nextSyncToken: response.data.nextSyncToken,
      };
    } catch (error) {
      logger.error('Failed to get incremental changes:', error);
      throw error;
    }
  }

  /**
   * Process event change from webhook
   */
  private async processEventChange(event: any): Promise<void> {
    try {
      // Check if this is a CastMatch event
      if (event.extendedProperties?.private?.castmatchId) {
        const castmatchId = event.extendedProperties.private.castmatchId;
        
        // Update database with event changes
        // This would integrate with your database service
        logger.info(`Processing CastMatch event change: ${castmatchId}`, {
          status: event.status,
          updated: event.updated,
        });

        // Handle different event statuses
        if (event.status === 'cancelled') {
          // Handle cancellation
          await this.handleEventCancellation(event);
        } else if (event.status === 'confirmed') {
          // Handle confirmation
          await this.handleEventConfirmation(event);
        }
      }
    } catch (error) {
      logger.error('Failed to process event change:', error);
    }
  }

  /**
   * Handle event cancellation
   */
  private async handleEventCancellation(event: any): Promise<void> {
    // Implement cancellation logic
    logger.info(`Event cancelled: ${event.id}`);
    // Send notifications, update database, etc.
  }

  /**
   * Handle event confirmation
   */
  private async handleEventConfirmation(event: any): Promise<void> {
    // Implement confirmation logic
    logger.info(`Event confirmed: ${event.id}`);
    // Send notifications, update database, etc.
  }

  /**
   * Get timezone for event
   */
  private getTimezone(details: any): string {
    return details.timezone || process.env.DEFAULT_TIMEZONE || 'America/Los_Angeles';
  }

  /**
   * Refresh OAuth token if expired
   */
  async refreshTokenIfNeeded(): Promise<void> {
    try {
      const token = this.oauth2Client.credentials;
      if (token && token.expiry_date && token.expiry_date <= Date.now()) {
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        this.oauth2Client.setCredentials(credentials);
        logger.info('Refreshed OAuth token');
      }
    } catch (error) {
      logger.error('Failed to refresh token:', error);
      throw new AppError('Failed to refresh authentication', 401);
    }
  }
}

// Export singleton instance
export const googleCalendarService = new GoogleCalendarService();