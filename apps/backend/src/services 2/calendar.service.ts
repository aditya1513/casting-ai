/**
 * Calendar Service for CastMatch
 * Handles Google Calendar integration, event management, and availability checking
 */

import { google, calendar_v3 } from 'googleapis';
import ical from 'ical-generator';
import { RRule, RRuleSet } from 'rrule';
import moment from 'moment-timezone';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { OAuth2Client } from 'google-auth-library';
import { CalendarIntegration } from '@prisma/client';

interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees?: string[];
  meetingLink?: string;
  timeZone?: string;
  recurrence?: string[];
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
}

interface AvailabilitySlot {
  start: Date;
  end: Date;
  isAvailable: boolean;
  conflictsWith?: string[];
}

interface ConflictDetectionOptions {
  excludeEventIds?: string[];
  bufferMinutes?: number;
  includePrivateEvents?: boolean;
}

export class CalendarService {
  private readonly timeZone: string;
  private readonly defaultReminders = [
    { method: 'email' as const, minutes: 24 * 60 }, // 24 hours before
    { method: 'popup' as const, minutes: 30 }, // 30 minutes before
  ];

  constructor() {
    this.timeZone = process.env.DEFAULT_TIMEZONE || 'Asia/Kolkata';
  }

  /**
   * Get OAuth2 client for a user's calendar integration
   */
  private async getOAuth2Client(userId: string, provider = 'google'): Promise<OAuth2Client | null> {
    try {
      const integration = await prisma.calendarIntegration.findFirst({
        where: {
          userId,
          provider,
          isActive: true,
        },
      });

      if (!integration) {
        logger.warn('No active calendar integration found', { userId, provider });
        return null;
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      // Decrypt tokens (assuming they're base64 encoded for now)
      const accessToken = Buffer.from(integration.accessToken, 'base64').toString('utf-8');
      const refreshToken = integration.refreshToken 
        ? Buffer.from(integration.refreshToken, 'base64').toString('utf-8')
        : null;

      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      // Check if token needs refresh
      if (integration.tokenExpiry && new Date() >= integration.tokenExpiry) {
        await this.refreshAccessToken(integration.id);
        // Get updated integration
        const updatedIntegration = await prisma.calendarIntegration.findUnique({
          where: { id: integration.id },
        });
        if (updatedIntegration) {
          const newAccessToken = Buffer.from(updatedIntegration.accessToken, 'base64').toString('utf-8');
          oauth2Client.setCredentials({
            access_token: newAccessToken,
            refresh_token: refreshToken,
          });
        }
      }

      return oauth2Client;
    } catch (error) {
      logger.error('Error getting OAuth2 client', { error, userId, provider });
      return null;
    }
  }

  /**
   * Refresh access token
   */
  private async refreshAccessToken(integrationId: string): Promise<void> {
    try {
      const integration = await prisma.calendarIntegration.findUnique({
        where: { id: integrationId },
      });

      if (!integration || !integration.refreshToken) {
        throw new Error('No refresh token available');
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      const refreshToken = Buffer.from(integration.refreshToken, 'base64').toString('utf-8');
      oauth2Client.setCredentials({ refresh_token: refreshToken });

      const { credentials } = await oauth2Client.refreshAccessToken();

      if (credentials.access_token) {
        const encryptedAccessToken = Buffer.from(credentials.access_token).toString('base64');
        const tokenExpiry = credentials.expiry_date 
          ? new Date(credentials.expiry_date) 
          : new Date(Date.now() + 3600 * 1000); // 1 hour default

        await prisma.calendarIntegration.update({
          where: { id: integrationId },
          data: {
            accessToken: encryptedAccessToken,
            tokenExpiry,
            lastSyncStatus: 'success',
            lastSyncError: null,
          },
        });

        logger.info('Access token refreshed successfully', { integrationId });
      }
    } catch (error) {
      logger.error('Error refreshing access token', { error, integrationId });
      
      await prisma.calendarIntegration.update({
        where: { id: integrationId },
        data: {
          lastSyncStatus: 'error',
          lastSyncError: error instanceof Error ? error.message : 'Token refresh failed',
        },
      });
      
      throw error;
    }
  }

  /**
   * Create calendar event
   */
  async createEvent(userId: string, event: CalendarEvent): Promise<string | null> {
    try {
      const oauth2Client = await this.getOAuth2Client(userId);
      if (!oauth2Client) {
        throw new Error('No calendar integration found');
      }

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const integration = await prisma.calendarIntegration.findFirst({
        where: { userId, provider: 'google', isActive: true },
      });

      const calendarId = integration?.primaryCalendarId || 'primary';

      const googleEvent: calendar_v3.Schema$Event = {
        summary: event.summary,
        description: event.description,
        location: event.location,
        start: {
          dateTime: event.startTime.toISOString(),
          timeZone: event.timeZone || this.timeZone,
        },
        end: {
          dateTime: event.endTime.toISOString(),
          timeZone: event.timeZone || this.timeZone,
        },
        attendees: event.attendees?.map(email => ({ email })),
        reminders: event.reminders || {
          useDefault: false,
          overrides: this.defaultReminders,
        },
        conferenceData: event.meetingLink ? {
          entryPoints: [{
            entryPointType: 'video',
            uri: event.meetingLink,
          }],
        } : undefined,
      };

      if (event.recurrence) {
        googleEvent.recurrence = event.recurrence;
      }

      const response = await calendar.events.insert({
        calendarId,
        requestBody: googleEvent,
        conferenceDataVersion: event.meetingLink ? 1 : 0,
      });

      logger.info('Calendar event created', {
        userId,
        eventId: response.data.id,
        summary: event.summary,
      });

      return response.data.id || null;
    } catch (error) {
      logger.error('Error creating calendar event', { error, userId, event: event.summary });
      throw error;
    }
  }

  /**
   * Update calendar event
   */
  async updateEvent(userId: string, eventId: string, updates: Partial<CalendarEvent>): Promise<void> {
    try {
      const oauth2Client = await this.getOAuth2Client(userId);
      if (!oauth2Client) {
        throw new Error('No calendar integration found');
      }

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const integration = await prisma.calendarIntegration.findFirst({
        where: { userId, provider: 'google', isActive: true },
      });

      const calendarId = integration?.primaryCalendarId || 'primary';

      const updateData: Partial<calendar_v3.Schema$Event> = {};

      if (updates.summary) updateData.summary = updates.summary;
      if (updates.description) updateData.description = updates.description;
      if (updates.location) updateData.location = updates.location;
      if (updates.startTime && updates.endTime) {
        updateData.start = {
          dateTime: updates.startTime.toISOString(),
          timeZone: updates.timeZone || this.timeZone,
        };
        updateData.end = {
          dateTime: updates.endTime.toISOString(),
          timeZone: updates.timeZone || this.timeZone,
        };
      }
      if (updates.attendees) {
        updateData.attendees = updates.attendees.map(email => ({ email }));
      }

      await calendar.events.update({
        calendarId,
        eventId,
        requestBody: updateData,
      });

      logger.info('Calendar event updated', { userId, eventId });
    } catch (error) {
      logger.error('Error updating calendar event', { error, userId, eventId });
      throw error;
    }
  }

  /**
   * Delete calendar event
   */
  async deleteEvent(userId: string, eventId: string): Promise<void> {
    try {
      const oauth2Client = await this.getOAuth2Client(userId);
      if (!oauth2Client) {
        throw new Error('No calendar integration found');
      }

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const integration = await prisma.calendarIntegration.findFirst({
        where: { userId, provider: 'google', isActive: true },
      });

      const calendarId = integration?.primaryCalendarId || 'primary';

      await calendar.events.delete({
        calendarId,
        eventId,
      });

      logger.info('Calendar event deleted', { userId, eventId });
    } catch (error) {
      logger.error('Error deleting calendar event', { error, userId, eventId });
      throw error;
    }
  }

  /**
   * Check availability for a time slot
   */
  async checkAvailability(
    userId: string,
    startTime: Date,
    endTime: Date,
    options: ConflictDetectionOptions = {}
  ): Promise<AvailabilitySlot> {
    try {
      const oauth2Client = await this.getOAuth2Client(userId);
      if (!oauth2Client) {
        // If no calendar integration, assume available
        return {
          start: startTime,
          end: endTime,
          isAvailable: true,
        };
      }

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const integration = await prisma.calendarIntegration.findFirst({
        where: { userId, provider: 'google', isActive: true },
      });

      const calendarId = integration?.primaryCalendarId || 'primary';
      const bufferMinutes = options.bufferMinutes || 0;

      // Adjust times with buffer
      const checkStart = moment(startTime).subtract(bufferMinutes, 'minutes').toDate();
      const checkEnd = moment(endTime).add(bufferMinutes, 'minutes').toDate();

      const response = await calendar.events.list({
        calendarId,
        timeMin: checkStart.toISOString(),
        timeMax: checkEnd.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const conflicts: string[] = [];
      let isAvailable = true;

      if (response.data.items) {
        for (const event of response.data.items) {
          // Skip excluded events
          if (options.excludeEventIds?.includes(event.id || '')) {
            continue;
          }

          // Skip if privacy settings don't include private events
          if (!options.includePrivateEvents && event.visibility === 'private') {
            continue;
          }

          // Skip all-day events or events without specific times
          if (!event.start?.dateTime || !event.end?.dateTime) {
            continue;
          }

          const eventStart = new Date(event.start.dateTime);
          const eventEnd = new Date(event.end.dateTime);

          // Check for overlap
          if (
            (startTime < eventEnd && endTime > eventStart) ||
            (checkStart < eventEnd && checkEnd > eventStart)
          ) {
            isAvailable = false;
            conflicts.push(event.summary || 'Untitled Event');
          }
        }
      }

      return {
        start: startTime,
        end: endTime,
        isAvailable,
        conflictsWith: conflicts.length > 0 ? conflicts : undefined,
      };
    } catch (error) {
      logger.error('Error checking availability', { error, userId, startTime, endTime });
      // On error, assume not available for safety
      return {
        start: startTime,
        end: endTime,
        isAvailable: false,
        conflictsWith: ['Error checking calendar'],
      };
    }
  }

  /**
   * Get availability for a date range
   */
  async getAvailability(
    userId: string,
    startDate: Date,
    endDate: Date,
    duration: number = 60, // minutes
    workingHours: { start: string; end: string } = { start: '09:00', end: '18:00' }
  ): Promise<AvailabilitySlot[]> {
    try {
      const availableSlots: AvailabilitySlot[] = [];
      const current = moment.tz(startDate, this.timeZone);
      const end = moment.tz(endDate, this.timeZone);

      while (current.isBefore(end)) {
        // Skip weekends (can be configurable)
        if (current.day() === 0 || current.day() === 6) {
          current.add(1, 'day');
          continue;
        }

        // Generate slots for working hours
        const dayStart = current.clone().hour(parseInt(workingHours.start.split(':')[0]))
          .minute(parseInt(workingHours.start.split(':')[1]));
        const dayEnd = current.clone().hour(parseInt(workingHours.end.split(':')[0]))
          .minute(parseInt(workingHours.end.split(':')[1]));

        const slotStart = dayStart.clone();
        while (slotStart.clone().add(duration, 'minutes').isBefore(dayEnd)) {
          const slotEnd = slotStart.clone().add(duration, 'minutes');
          
          const availability = await this.checkAvailability(
            userId,
            slotStart.toDate(),
            slotEnd.toDate(),
            { bufferMinutes: 15 }
          );

          availableSlots.push(availability);
          slotStart.add(duration, 'minutes');
        }

        current.add(1, 'day');
      }

      return availableSlots;
    } catch (error) {
      logger.error('Error getting availability', { error, userId, startDate, endDate });
      return [];
    }
  }

  /**
   * Generate ICS calendar invite
   */
  generateICSInvite(event: CalendarEvent): string {
    const cal = ical({
      domain: 'castmatch.ai',
      name: 'CastMatch Audition',
      timezone: this.timeZone,
    });

    const icalEvent = cal.createEvent({
      start: moment.tz(event.startTime, this.timeZone).toDate(),
      end: moment.tz(event.endTime, this.timeZone).toDate(),
      summary: event.summary,
      description: event.description || '',
      location: event.location || '',
      url: event.meetingLink || '',
      organizer: {
        name: 'CastMatch',
        email: process.env.EMAIL_FROM || 'noreply@castmatch.ai',
      },
    });

    if (event.attendees) {
      event.attendees.forEach(email => {
        icalEvent.createAttendee({
          email,
          name: email.split('@')[0],
          rsvp: true,
        });
      });
    }

    return cal.toString();
  }

  /**
   * Create Google Meet link
   */
  async createMeetingLink(userId: string, eventData: CalendarEvent): Promise<string | null> {
    try {
      const oauth2Client = await this.getOAuth2Client(userId);
      if (!oauth2Client) {
        return null;
      }

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const integration = await prisma.calendarIntegration.findFirst({
        where: { userId, provider: 'google', isActive: true },
      });

      const calendarId = integration?.primaryCalendarId || 'primary';

      const event = await calendar.events.insert({
        calendarId,
        conferenceDataVersion: 1,
        requestBody: {
          summary: eventData.summary,
          start: {
            dateTime: eventData.startTime.toISOString(),
            timeZone: this.timeZone,
          },
          end: {
            dateTime: eventData.endTime.toISOString(),
            timeZone: this.timeZone,
          },
          conferenceData: {
            createRequest: {
              requestId: `castmatch-${Date.now()}`,
              conferenceSolutionKey: {
                type: 'hangoutsMeet',
              },
            },
          },
        },
      });

      const meetingLink = event.data.conferenceData?.entryPoints?.find(
        ep => ep.entryPointType === 'video'
      )?.uri;

      return meetingLink || null;
    } catch (error) {
      logger.error('Error creating meeting link', { error, userId });
      return null;
    }
  }

  /**
   * Sync audition slots with external calendar
   */
  async syncAuditionSlot(userId: string, slotId: string): Promise<void> {
    try {
      const slot = await prisma.auditionSlot.findUnique({
        where: { id: slotId },
        include: {
          project: true,
          character: true,
        },
      });

      if (!slot) {
        throw new Error('Audition slot not found');
      }

      const eventData: CalendarEvent = {
        summary: `Audition: ${slot.project.title}${slot.character ? ` - ${slot.character.name}` : ''}`,
        description: `CastMatch Audition\n\nProject: ${slot.project.title}\n${slot.character ? `Character: ${slot.character.name}\n` : ''}Duration: ${slot.duration} minutes\n\n${slot.notes || ''}`,
        startTime: slot.startTime,
        endTime: slot.endTime,
        location: slot.location,
        meetingLink: slot.meetingLink || undefined,
      };

      const eventId = await this.createEvent(userId, eventData);
      
      if (eventId) {
        await prisma.auditionSlot.update({
          where: { id: slotId },
          data: { googleEventId: eventId },
        });
      }
    } catch (error) {
      logger.error('Error syncing audition slot', { error, userId, slotId });
      throw error;
    }
  }

  /**
   * Create recurring audition slots
   */
  generateRecurringSlots(
    baseSlot: {
      startTime: Date;
      endTime: Date;
      duration: number;
    },
    recurrenceRule: string,
    until: Date
  ): Date[] {
    try {
      const rule = RRule.fromString(recurrenceRule);
      const rruleSet = new RRuleSet();
      rruleSet.rrule(rule);

      const occurrences = rruleSet.between(baseSlot.startTime, until);
      
      return occurrences.map(occurrence => {
        // Maintain the same time of day
        const originalTime = moment.tz(baseSlot.startTime, this.timeZone);
        const newOccurrence = moment.tz(occurrence, this.timeZone)
          .hour(originalTime.hour())
          .minute(originalTime.minute())
          .second(originalTime.second());
        
        return newOccurrence.toDate();
      });
    } catch (error) {
      logger.error('Error generating recurring slots', { error, baseSlot, recurrenceRule });
      return [];
    }
  }

  /**
   * Validate calendar integration
   */
  async validateIntegration(userId: string): Promise<boolean> {
    try {
      const oauth2Client = await this.getOAuth2Client(userId);
      if (!oauth2Client) {
        return false;
      }

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      
      // Try to access the calendar
      await calendar.calendars.get({ calendarId: 'primary' });
      
      // Update last sync status
      await prisma.calendarIntegration.updateMany({
        where: { userId, provider: 'google', isActive: true },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: 'success',
          lastSyncError: null,
        },
      });

      return true;
    } catch (error) {
      logger.error('Calendar integration validation failed', { error, userId });
      
      // Update error status
      await prisma.calendarIntegration.updateMany({
        where: { userId, provider: 'google', isActive: true },
        data: {
          lastSyncStatus: 'error',
          lastSyncError: error instanceof Error ? error.message : 'Validation failed',
        },
      });

      return false;
    }
  }
}

// Use lazy initialization to avoid circular dependency issues
let _calendarService: CalendarService;

export const getCalendarService = (): CalendarService => {
  if (!_calendarService) {
    _calendarService = new CalendarService();
  }
  return _calendarService;
};

// For backward compatibility
export const calendarService = getCalendarService();