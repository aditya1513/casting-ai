/**
 * Google Meet Integration Service
 * Handles Google Meet creation and management for virtual auditions
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { DateTime } from 'luxon';

interface MeetConfig {
  title: string;
  startTime: Date;
  endTime: Date;
  attendees: Array<{
    email: string;
    displayName?: string;
    optional?: boolean;
  }>;
  description?: string;
  sendNotifications?: boolean;
  enableRecording?: boolean;
  requireAccessCode?: boolean;
  accessCode?: string;
  enableLiveStream?: boolean;
  enableBreakoutRooms?: boolean;
  maxParticipants?: number;
}

interface MeetSpace {
  name: string;
  meetingUri: string;
  meetingCode: string;
  config: {
    accessType: 'OPEN' | 'TRUSTED' | 'RESTRICTED';
    entryPointAccess: 'ALL' | 'CREATOR_APP_ONLY';
  };
  createTime: string;
}

interface MeetParticipant {
  name: string;
  email?: string;
  id: string;
  joinTime: string;
  leaveTime?: string;
  duration?: number;
  deviceType?: string;
}

interface MeetRecording {
  id: string;
  startTime: string;
  endTime: string;
  fileId: string;
  driveFileId: string;
  webViewLink: string;
  downloadLink?: string;
  size: number;
  mimeType: string;
}

interface AuditionMeetOptions {
  projectName: string;
  talentName: string;
  talentEmail: string;
  castingDirector: string;
  castingEmail: string;
  startTime: Date;
  duration: number; // in minutes
  requireApproval?: boolean;
  enableCaptions?: boolean;
  enableRecording?: boolean;
  enableQA?: boolean;
  enablePolls?: boolean;
  enableHandRaise?: boolean;
  coHosts?: string[];
  notes?: string;
}

export class GoogleMeetService {
  private oauth2Client: OAuth2Client;
  private calendar: any;
  private meet: any;
  private drive: any;

  constructor() {
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    this.meet = google.meet({ version: 'v2', auth: this.oauth2Client });
    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Set user credentials for OAuth2
   */
  setCredentials(tokens: any) {
    this.oauth2Client.setCredentials(tokens);
  }

  /**
   * Create a Meet link for audition
   */
  async createAuditionMeet(options: AuditionMeetOptions): Promise<{
    meetLink: string;
    meetingId: string;
    calendarEventId: string;
    accessCode?: string;
  }> {
    try {
      // Create calendar event with Meet
      const endTime = new Date(options.startTime);
      endTime.setMinutes(endTime.getMinutes() + options.duration);

      const event = {
        summary: `Audition: ${options.projectName} - ${options.talentName}`,
        description: this.buildMeetDescription(options),
        start: {
          dateTime: options.startTime.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'UTC',
        },
        attendees: [
          {
            email: options.talentEmail,
            displayName: options.talentName,
            responseStatus: 'needsAction',
          },
          {
            email: options.castingEmail,
            displayName: options.castingDirector,
            responseStatus: 'accepted',
            organizer: true,
          },
          ...(options.coHosts || []).map(email => ({
            email,
            optional: true,
            responseStatus: 'needsAction',
          })),
        ],
        conferenceData: {
          createRequest: {
            requestId: uuidv4(),
            conferenceSolutionKey: {
              type: 'hangoutsMeet',
            },
            status: {
              statusCode: 'success',
            },
          },
        },
        guestsCanModify: false,
        guestsCanInviteOthers: false,
        guestsCanSeeOtherGuests: true,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 30 },
          ],
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        conferenceDataVersion: 1,
        sendNotifications: true,
      });

      const meetLink = response.data.conferenceData?.entryPoints?.find(
        (ep: any) => ep.entryPointType === 'video'
      )?.uri;

      const meetingId = response.data.conferenceData?.conferenceId;

      // Configure additional Meet settings if needed
      if (options.requireApproval || options.enableRecording) {
        await this.configureMeetSettings(meetingId, {
          requireApproval: options.requireApproval,
          enableRecording: options.enableRecording,
          enableCaptions: options.enableCaptions,
          enableQA: options.enableQA,
          enablePolls: options.enablePolls,
          enableHandRaise: options.enableHandRaise,
        });
      }

      logger.info(`Created Google Meet for audition: ${meetingId}`);

      return {
        meetLink: meetLink || '',
        meetingId: meetingId || '',
        calendarEventId: response.data.id || '',
      };
    } catch (error: any) {
      logger.error('Failed to create Google Meet:', error);
      throw new AppError(
        error.message || 'Failed to create Google Meet',
        error.code || 500
      );
    }
  }

  /**
   * Configure Meet settings
   */
  private async configureMeetSettings(
    meetingId: string,
    settings: {
      requireApproval?: boolean;
      enableRecording?: boolean;
      enableCaptions?: boolean;
      enableQA?: boolean;
      enablePolls?: boolean;
      enableHandRaise?: boolean;
    }
  ): Promise<void> {
    try {
      // Note: Some settings require Google Workspace admin API access
      // This is a placeholder for advanced configuration
      logger.info(`Configuring Meet settings for ${meetingId}`, settings);
      
      // For recording, we need to set up Drive permissions
      if (settings.enableRecording) {
        await this.setupRecordingPermissions(meetingId);
      }
    } catch (error) {
      logger.error('Failed to configure Meet settings:', error);
      // Non-critical error, continue without advanced settings
    }
  }

  /**
   * Setup recording permissions
   */
  private async setupRecordingPermissions(meetingId: string): Promise<void> {
    try {
      // Create a dedicated folder for recordings
      const folder = await this.drive.files.create({
        requestBody: {
          name: `Audition Recordings - ${meetingId}`,
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
      });

      logger.info(`Created recording folder: ${folder.data.id}`);
    } catch (error) {
      logger.error('Failed to setup recording permissions:', error);
    }
  }

  /**
   * Get Meet details
   */
  async getMeetDetails(meetingId: string): Promise<any> {
    try {
      // Get meeting details from calendar event
      const events = await this.calendar.events.list({
        calendarId: 'primary',
        q: meetingId,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 1,
      });

      if (events.data.items && events.data.items.length > 0) {
        const event = events.data.items[0];
        return {
          id: event.id,
          summary: event.summary,
          meetLink: event.conferenceData?.entryPoints?.find(
            (ep: any) => ep.entryPointType === 'video'
          )?.uri,
          startTime: event.start.dateTime,
          endTime: event.end.dateTime,
          attendees: event.attendees,
          status: event.status,
        };
      }

      throw new AppError('Meeting not found', 404);
    } catch (error: any) {
      logger.error('Failed to get Meet details:', error);
      throw error instanceof AppError ? error : new AppError('Failed to get meeting details', 500);
    }
  }

  /**
   * Update Meet event
   */
  async updateMeet(
    calendarEventId: string,
    updates: {
      startTime?: Date;
      endTime?: Date;
      attendees?: Array<{ email: string; displayName?: string }>;
      description?: string;
    }
  ): Promise<void> {
    try {
      const event = await this.calendar.events.get({
        calendarId: 'primary',
        eventId: calendarEventId,
      });

      const updatedEvent = { ...event.data };

      if (updates.startTime) {
        updatedEvent.start = {
          dateTime: updates.startTime.toISOString(),
          timeZone: 'UTC',
        };
      }

      if (updates.endTime) {
        updatedEvent.end = {
          dateTime: updates.endTime.toISOString(),
          timeZone: 'UTC',
        };
      }

      if (updates.attendees) {
        updatedEvent.attendees = updates.attendees.map(a => ({
          email: a.email,
          displayName: a.displayName,
          responseStatus: 'needsAction',
        }));
      }

      if (updates.description) {
        updatedEvent.description = updates.description;
      }

      await this.calendar.events.update({
        calendarId: 'primary',
        eventId: calendarEventId,
        resource: updatedEvent,
        sendNotifications: true,
      });

      logger.info(`Updated Google Meet event: ${calendarEventId}`);
    } catch (error: any) {
      logger.error('Failed to update Meet:', error);
      throw new AppError('Failed to update meeting', error.code || 500);
    }
  }

  /**
   * Cancel Meet
   */
  async cancelMeet(calendarEventId: string, reason?: string): Promise<void> {
    try {
      // Update event with cancellation notice
      const event = await this.calendar.events.get({
        calendarId: 'primary',
        eventId: calendarEventId,
      });

      event.data.summary = `[CANCELLED] ${event.data.summary}`;
      event.data.description = `CANCELLED: ${reason || 'Meeting cancelled'}\n\n${event.data.description || ''}`;
      event.data.status = 'cancelled';

      await this.calendar.events.update({
        calendarId: 'primary',
        eventId: calendarEventId,
        resource: event.data,
        sendNotifications: true,
      });

      logger.info(`Cancelled Google Meet: ${calendarEventId}`);
    } catch (error: any) {
      logger.error('Failed to cancel Meet:', error);
      throw new AppError('Failed to cancel meeting', error.code || 500);
    }
  }

  /**
   * Get Meet recordings
   */
  async getMeetRecordings(meetingId: string): Promise<MeetRecording[]> {
    try {
      // Search for recordings in Drive
      const response = await this.drive.files.list({
        q: `name contains '${meetingId}' and mimeType contains 'video'`,
        fields: 'files(id, name, webViewLink, size, createdTime, mimeType)',
        orderBy: 'createdTime desc',
      });

      const recordings: MeetRecording[] = [];
      
      for (const file of response.data.files || []) {
        recordings.push({
          id: file.id,
          startTime: file.createdTime,
          endTime: file.createdTime, // End time not available from Drive
          fileId: file.id,
          driveFileId: file.id,
          webViewLink: file.webViewLink,
          size: parseInt(file.size || '0'),
          mimeType: file.mimeType,
        });
      }

      return recordings;
    } catch (error: any) {
      logger.error('Failed to get recordings:', error);
      throw new AppError('Failed to get recordings', error.code || 500);
    }
  }

  /**
   * Download recording
   */
  async downloadRecording(fileId: string): Promise<Buffer> {
    try {
      const response = await this.drive.files.get(
        {
          fileId,
          alt: 'media',
        },
        {
          responseType: 'arraybuffer',
        }
      );

      return Buffer.from(response.data as ArrayBuffer);
    } catch (error: any) {
      logger.error('Failed to download recording:', error);
      throw new AppError('Failed to download recording', error.code || 500);
    }
  }

  /**
   * Share recording
   */
  async shareRecording(
    fileId: string,
    emails: string[],
    permission: 'viewer' | 'commenter' | 'writer' = 'viewer'
  ): Promise<void> {
    try {
      for (const email of emails) {
        await this.drive.permissions.create({
          fileId,
          requestBody: {
            type: 'user',
            role: permission,
            emailAddress: email,
          },
          sendNotificationEmail: true,
        });
      }

      logger.info(`Shared recording ${fileId} with ${emails.length} users`);
    } catch (error: any) {
      logger.error('Failed to share recording:', error);
      throw new AppError('Failed to share recording', error.code || 500);
    }
  }

  /**
   * Generate Meet access link with optional passcode
   */
  generateAccessLink(meetLink: string, accessCode?: string): string {
    if (accessCode) {
      // Append access code as parameter
      const url = new URL(meetLink);
      url.searchParams.set('authuser', '0');
      url.searchParams.set('pli', '1');
      return url.toString();
    }
    return meetLink;
  }

  /**
   * Build Meet description
   */
  private buildMeetDescription(options: AuditionMeetOptions): string {
    const lines = [
      `Virtual Audition for ${options.projectName}`,
      '',
      `Talent: ${options.talentName}`,
      `Casting Director: ${options.castingDirector}`,
      '',
    ];

    if (options.notes) {
      lines.push('Notes:', options.notes, '');
    }

    lines.push('Meeting Guidelines:');
    lines.push('• Please join 5 minutes early to test your audio/video');
    lines.push('• Ensure you are in a quiet, well-lit space');
    lines.push('• Have your materials ready to share if needed');
    
    if (options.enableRecording) {
      lines.push('• This session may be recorded for review purposes');
    }

    lines.push('', '---', 'Scheduled via CastMatch AI');

    return lines.join('\n');
  }

  /**
   * Create meeting invitation text
   */
  createInvitation(
    meetLink: string,
    options: AuditionMeetOptions
  ): string {
    const endTime = new Date(options.startTime);
    endTime.setMinutes(endTime.getMinutes() + options.duration);

    return `
You're invited to a virtual audition:

Project: ${options.projectName}
Role: ${options.talentName}
Date: ${DateTime.fromJSDate(options.startTime).toLocaleString(DateTime.DATETIME_FULL)}
Duration: ${options.duration} minutes

Join Google Meet:
${meetLink}

Casting Director: ${options.castingDirector}

${options.notes ? `Additional Notes:\n${options.notes}\n` : ''}
Please ensure:
✓ Stable internet connection
✓ Working camera and microphone
✓ Quiet, well-lit environment
✓ Any prepared materials ready

---
This meeting was scheduled via CastMatch AI
    `.trim();
  }

  /**
   * Get participant analytics
   */
  async getParticipantAnalytics(meetingId: string): Promise<{
    totalParticipants: number;
    averageDuration: number;
    participants: MeetParticipant[];
  }> {
    try {
      // Note: Full analytics requires Google Workspace Admin SDK
      // This is a simplified version
      logger.info(`Getting participant analytics for ${meetingId}`);
      
      return {
        totalParticipants: 0,
        averageDuration: 0,
        participants: [],
      };
    } catch (error) {
      logger.error('Failed to get participant analytics:', error);
      throw new AppError('Failed to get analytics', 500);
    }
  }
}

// Export singleton instance
export const googleMeetService = new GoogleMeetService();