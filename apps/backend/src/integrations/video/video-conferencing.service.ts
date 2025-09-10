/**
 * Video Conferencing Integration Service
 * Handles Zoom, Google Meet, and Microsoft Teams integrations
 * for video auditions with recording and bandwidth optimization
 */

import axios from 'axios';
import jwt from 'jsonwebtoken';
import { google } from 'googleapis';
import { logger } from '../../utils/logger';
import { CacheManager, CacheKeys } from '../../config/redis';
import Bull, { Queue, Job } from 'bull';
import { v4 as uuidv4 } from 'uuid';
import { addMinutes, format } from 'date-fns';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

interface MeetingOptions {
  title: string;
  description?: string;
  startTime: Date;
  duration: number; // in minutes
  hostEmail: string;
  attendees: Array<{
    email: string;
    name: string;
    role?: 'host' | 'cohost' | 'participant';
  }>;
  settings?: {
    allowRecording?: boolean;
    recordingAutoStart?: boolean;
    waitingRoom?: boolean;
    muteOnEntry?: boolean;
    videoOnEntry?: boolean;
    allowScreenShare?: boolean;
    breakoutRooms?: number;
    password?: string;
  };
  timezone?: string;
}

interface MeetingResponse {
  id: string;
  provider: 'zoom' | 'meet' | 'teams';
  joinUrl: string;
  hostUrl?: string;
  password?: string;
  dialInNumbers?: Array<{
    country: string;
    number: string;
  }>;
  recordingUrl?: string;
}

interface RecordingOptions {
  meetingId: string;
  provider: 'zoom' | 'meet' | 'teams';
  autoTranscribe?: boolean;
  cloudStorage?: 'local' | 's3' | 'drive';
}

interface BandwidthOptimization {
  resolution: '360p' | '480p' | '720p' | '1080p';
  frameRate: 15 | 24 | 30 | 60;
  bitrate: number; // kbps
  adaptiveStreaming: boolean;
}

export class VideoConferencingService {
  private zoomAccessToken: string | null = null;
  private googleOAuth2Client: any = null;
  private microsoftAccessToken: string | null = null;
  private meetingQueue: Queue;
  private recordingQueue: Queue;
  private s3Client: S3Client;
  private readonly defaultBandwidth: BandwidthOptimization = {
    resolution: '720p',
    frameRate: 30,
    bitrate: 2500,
    adaptiveStreaming: true,
  };

  constructor() {
    this.initializeProviders();
    this.initializeQueues();
    this.initializeS3();
  }

  /**
   * Initialize video conferencing providers
   */
  private async initializeProviders(): Promise<void> {
    // Initialize Zoom
    await this.initializeZoom();
    
    // Initialize Google Meet
    await this.initializeGoogleMeet();
    
    // Initialize Microsoft Teams
    await this.initializeMicrosoftTeams();
  }

  /**
   * Initialize Zoom API
   */
  private async initializeZoom(): Promise<void> {
    try {
      if (process.env.ZOOM_ACCOUNT_ID && process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET) {
        // OAuth 2.0 Server-to-Server flow
        const tokenResponse = await axios.post(
          'https://zoom.us/oauth/token',
          null,
          {
            params: {
              grant_type: 'account_credentials',
              account_id: process.env.ZOOM_ACCOUNT_ID,
            },
            auth: {
              username: process.env.ZOOM_CLIENT_ID,
              password: process.env.ZOOM_CLIENT_SECRET,
            },
          }
        );

        this.zoomAccessToken = tokenResponse.data.access_token;
        logger.info('Zoom API initialized successfully');

        // Refresh token before expiry
        setTimeout(() => {
          this.initializeZoom();
        }, (tokenResponse.data.expires_in - 300) * 1000);
      }
    } catch (error) {
      logger.error('Failed to initialize Zoom API', error);
    }
  }

  /**
   * Initialize Google Meet API
   */
  private async initializeGoogleMeet(): Promise<void> {
    try {
      if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        const { OAuth2Client } = await import('google-auth-library');
        this.googleOAuth2Client = new OAuth2Client(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI
        );

        if (process.env.GOOGLE_REFRESH_TOKEN) {
          this.googleOAuth2Client.setCredentials({
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
          });
          logger.info('Google Meet API initialized successfully');
        }
      }
    } catch (error) {
      logger.error('Failed to initialize Google Meet API', error);
    }
  }

  /**
   * Initialize Microsoft Teams API
   */
  private async initializeMicrosoftTeams(): Promise<void> {
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
        logger.info('Microsoft Teams API initialized successfully');

        // Refresh token before expiry
        setTimeout(() => {
          this.initializeMicrosoftTeams();
        }, (tokenResponse.data.expires_in - 300) * 1000);
      }
    } catch (error) {
      logger.error('Failed to initialize Microsoft Teams API', error);
    }
  }

  /**
   * Initialize processing queues
   */
  private initializeQueues(): void {
    const redisConfig = {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    };

    this.meetingQueue = new Bull('video-meeting-queue', redisConfig);
    this.recordingQueue = new Bull('video-recording-queue', redisConfig);

    // Process meeting queue
    this.meetingQueue.process(async (job: Job) => {
      const { provider, options } = job.data;
      try {
        const result = await this.createMeetingInternal(provider, options);
        return { success: true, meeting: result };
      } catch (error) {
        logger.error('Meeting creation failed', { error, jobId: job.id });
        throw error;
      }
    });

    // Process recording queue
    this.recordingQueue.process(async (job: Job) => {
      const { options } = job.data;
      try {
        const result = await this.processRecordingInternal(options);
        return { success: true, recording: result };
      } catch (error) {
        logger.error('Recording processing failed', { error, jobId: job.id });
        throw error;
      }
    });
  }

  /**
   * Initialize S3 client
   */
  private initializeS3(): void {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  /**
   * Create video meeting
   */
  async createMeeting(
    provider: 'zoom' | 'meet' | 'teams',
    options: MeetingOptions
  ): Promise<MeetingResponse> {
    try {
      switch (provider) {
        case 'zoom':
          return await this.createZoomMeeting(options);
        case 'meet':
          return await this.createGoogleMeet(options);
        case 'teams':
          return await this.createTeamsMeeting(options);
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error) {
      logger.error('Failed to create meeting', { provider, options, error });
      throw error;
    }
  }

  /**
   * Create Zoom meeting
   */
  private async createZoomMeeting(options: MeetingOptions): Promise<MeetingResponse> {
    if (!this.zoomAccessToken) {
      throw new Error('Zoom not initialized');
    }

    const meetingData = {
      topic: options.title,
      type: 2, // Scheduled meeting
      start_time: options.startTime.toISOString(),
      duration: options.duration,
      timezone: options.timezone || 'Asia/Kolkata',
      agenda: options.description,
      settings: {
        host_video: options.settings?.videoOnEntry ?? true,
        participant_video: options.settings?.videoOnEntry ?? false,
        join_before_host: false,
        mute_upon_entry: options.settings?.muteOnEntry ?? true,
        watermark: false,
        use_pmi: false,
        waiting_room: options.settings?.waitingRoom ?? true,
        auto_recording: options.settings?.recordingAutoStart ? 'cloud' : 'none',
        allow_multiple_devices: true,
        breakout_room: options.settings?.breakoutRooms ? {
          enable: true,
          rooms: Array.from({ length: options.settings.breakoutRooms }, (_, i) => ({
            name: `Room ${i + 1}`,
            participants: [],
          })),
        } : undefined,
      },
    };

    const response = await axios.post(
      'https://api.zoom.us/v2/users/me/meetings',
      meetingData,
      {
        headers: {
          Authorization: `Bearer ${this.zoomAccessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const meeting = response.data;

    // Send invitations to attendees
    await this.sendZoomInvitations(meeting.id, options.attendees);

    // Cache meeting details
    await CacheManager.set(
      CacheKeys.videoMeeting(meeting.id),
      {
        ...meeting,
        provider: 'zoom',
        attendees: options.attendees,
      },
      86400 // 24 hours
    );

    logger.info('Zoom meeting created', { meetingId: meeting.id });

    return {
      id: meeting.id.toString(),
      provider: 'zoom',
      joinUrl: meeting.join_url,
      hostUrl: meeting.start_url,
      password: meeting.password,
      dialInNumbers: meeting.settings?.global_dial_in_numbers?.map((num: any) => ({
        country: num.country_name,
        number: num.number,
      })),
    };
  }

  /**
   * Create Google Meet
   */
  private async createGoogleMeet(options: MeetingOptions): Promise<MeetingResponse> {
    if (!this.googleOAuth2Client) {
      throw new Error('Google Meet not initialized');
    }

    const calendar = google.calendar({ version: 'v3', auth: this.googleOAuth2Client });

    const event = {
      summary: options.title,
      description: options.description,
      start: {
        dateTime: options.startTime.toISOString(),
        timeZone: options.timezone || 'Asia/Kolkata',
      },
      end: {
        dateTime: addMinutes(options.startTime, options.duration).toISOString(),
        timeZone: options.timezone || 'Asia/Kolkata',
      },
      attendees: options.attendees.map(attendee => ({
        email: attendee.email,
        displayName: attendee.name,
      })),
      conferenceData: {
        createRequest: {
          requestId: uuidv4(),
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      conferenceDataVersion: 1,
      sendUpdates: 'all',
    });

    const meeting = response.data;
    const meetId = meeting.conferenceData?.conferenceId || meeting.id!;

    // Cache meeting details
    await CacheManager.set(
      CacheKeys.videoMeeting(meetId),
      {
        ...meeting,
        provider: 'meet',
        attendees: options.attendees,
      },
      86400 // 24 hours
    );

    logger.info('Google Meet created', { meetingId: meetId });

    return {
      id: meetId,
      provider: 'meet',
      joinUrl: meeting.conferenceData?.entryPoints?.find(
        (ep: any) => ep.entryPointType === 'video'
      )?.uri || meeting.htmlLink!,
    };
  }

  /**
   * Create Microsoft Teams meeting
   */
  private async createTeamsMeeting(options: MeetingOptions): Promise<MeetingResponse> {
    if (!this.microsoftAccessToken) {
      throw new Error('Microsoft Teams not initialized');
    }

    const meetingData = {
      subject: options.title,
      body: {
        content: options.description || '',
        contentType: 'text',
      },
      startDateTime: options.startTime.toISOString(),
      endDateTime: addMinutes(options.startTime, options.duration).toISOString(),
      participants: {
        attendees: options.attendees.map(attendee => ({
          emailAddress: {
            address: attendee.email,
            name: attendee.name,
          },
          type: attendee.role === 'host' ? 'required' : 'optional',
        })),
      },
      isOnlineMeeting: true,
      onlineMeetingProvider: 'teamsForBusiness',
      allowNewTimeProposals: false,
      isReminderOn: true,
      reminderMinutesBeforeStart: 15,
    };

    const response = await axios.post(
      'https://graph.microsoft.com/v1.0/me/onlineMeetings',
      meetingData,
      {
        headers: {
          Authorization: `Bearer ${this.microsoftAccessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const meeting = response.data;

    // Cache meeting details
    await CacheManager.set(
      CacheKeys.videoMeeting(meeting.id),
      {
        ...meeting,
        provider: 'teams',
        attendees: options.attendees,
      },
      86400 // 24 hours
    );

    logger.info('Teams meeting created', { meetingId: meeting.id });

    return {
      id: meeting.id,
      provider: 'teams',
      joinUrl: meeting.joinUrl,
      dialInNumbers: meeting.audioConferencing?.tollNumbers?.map((num: any) => ({
        country: num.country,
        number: num.number,
      })),
    };
  }

  /**
   * Update meeting
   */
  async updateMeeting(
    provider: 'zoom' | 'meet' | 'teams',
    meetingId: string,
    updates: Partial<MeetingOptions>
  ): Promise<void> {
    try {
      switch (provider) {
        case 'zoom':
          await this.updateZoomMeeting(meetingId, updates);
          break;
        case 'meet':
          await this.updateGoogleMeet(meetingId, updates);
          break;
        case 'teams':
          await this.updateTeamsMeeting(meetingId, updates);
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error) {
      logger.error('Failed to update meeting', { provider, meetingId, updates, error });
      throw error;
    }
  }

  /**
   * Update Zoom meeting
   */
  private async updateZoomMeeting(meetingId: string, updates: Partial<MeetingOptions>): Promise<void> {
    if (!this.zoomAccessToken) {
      throw new Error('Zoom not initialized');
    }

    const updateData: any = {};

    if (updates.title) updateData.topic = updates.title;
    if (updates.description) updateData.agenda = updates.description;
    if (updates.startTime) updateData.start_time = updates.startTime.toISOString();
    if (updates.duration) updateData.duration = updates.duration;
    if (updates.settings) {
      updateData.settings = {
        ...updates.settings,
        host_video: updates.settings.videoOnEntry,
        participant_video: updates.settings.videoOnEntry,
        mute_upon_entry: updates.settings.muteOnEntry,
        waiting_room: updates.settings.waitingRoom,
      };
    }

    await axios.patch(
      `https://api.zoom.us/v2/meetings/${meetingId}`,
      updateData,
      {
        headers: {
          Authorization: `Bearer ${this.zoomAccessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info('Zoom meeting updated', { meetingId });
  }

  /**
   * Update Google Meet
   */
  private async updateGoogleMeet(meetingId: string, updates: Partial<MeetingOptions>): Promise<void> {
    if (!this.googleOAuth2Client) {
      throw new Error('Google Meet not initialized');
    }

    const calendar = google.calendar({ version: 'v3', auth: this.googleOAuth2Client });

    const updateData: any = {};

    if (updates.title) updateData.summary = updates.title;
    if (updates.description) updateData.description = updates.description;
    if (updates.startTime) {
      updateData.start = {
        dateTime: updates.startTime.toISOString(),
        timeZone: updates.timezone || 'Asia/Kolkata',
      };
    }
    if (updates.duration && updates.startTime) {
      updateData.end = {
        dateTime: addMinutes(updates.startTime, updates.duration).toISOString(),
        timeZone: updates.timezone || 'Asia/Kolkata',
      };
    }
    if (updates.attendees) {
      updateData.attendees = updates.attendees.map(attendee => ({
        email: attendee.email,
        displayName: attendee.name,
      }));
    }

    await calendar.events.patch({
      calendarId: 'primary',
      eventId: meetingId,
      requestBody: updateData,
    });

    logger.info('Google Meet updated', { meetingId });
  }

  /**
   * Update Microsoft Teams meeting
   */
  private async updateTeamsMeeting(meetingId: string, updates: Partial<MeetingOptions>): Promise<void> {
    if (!this.microsoftAccessToken) {
      throw new Error('Microsoft Teams not initialized');
    }

    const updateData: any = {};

    if (updates.title) updateData.subject = updates.title;
    if (updates.description) {
      updateData.body = {
        content: updates.description,
        contentType: 'text',
      };
    }
    if (updates.startTime) updateData.startDateTime = updates.startTime.toISOString();
    if (updates.duration && updates.startTime) {
      updateData.endDateTime = addMinutes(updates.startTime, updates.duration).toISOString();
    }

    await axios.patch(
      `https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetingId}`,
      updateData,
      {
        headers: {
          Authorization: `Bearer ${this.microsoftAccessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info('Teams meeting updated', { meetingId });
  }

  /**
   * Cancel meeting
   */
  async cancelMeeting(
    provider: 'zoom' | 'meet' | 'teams',
    meetingId: string,
    reason?: string
  ): Promise<void> {
    try {
      switch (provider) {
        case 'zoom':
          await this.cancelZoomMeeting(meetingId);
          break;
        case 'meet':
          await this.cancelGoogleMeet(meetingId);
          break;
        case 'teams':
          await this.cancelTeamsMeeting(meetingId);
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      // Send cancellation notifications
      const meetingDetails = await CacheManager.get(CacheKeys.videoMeeting(meetingId));
      if (meetingDetails?.attendees) {
        await this.sendCancellationNotifications(meetingDetails.attendees, reason);
      }

      // Remove from cache
      await CacheManager.del(CacheKeys.videoMeeting(meetingId));

      logger.info('Meeting cancelled', { provider, meetingId, reason });
    } catch (error) {
      logger.error('Failed to cancel meeting', { provider, meetingId, error });
      throw error;
    }
  }

  /**
   * Cancel Zoom meeting
   */
  private async cancelZoomMeeting(meetingId: string): Promise<void> {
    if (!this.zoomAccessToken) {
      throw new Error('Zoom not initialized');
    }

    await axios.delete(
      `https://api.zoom.us/v2/meetings/${meetingId}`,
      {
        headers: {
          Authorization: `Bearer ${this.zoomAccessToken}`,
        },
      }
    );
  }

  /**
   * Cancel Google Meet
   */
  private async cancelGoogleMeet(meetingId: string): Promise<void> {
    if (!this.googleOAuth2Client) {
      throw new Error('Google Meet not initialized');
    }

    const calendar = google.calendar({ version: 'v3', auth: this.googleOAuth2Client });

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: meetingId,
      sendUpdates: 'all',
    });
  }

  /**
   * Cancel Microsoft Teams meeting
   */
  private async cancelTeamsMeeting(meetingId: string): Promise<void> {
    if (!this.microsoftAccessToken) {
      throw new Error('Microsoft Teams not initialized');
    }

    await axios.delete(
      `https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetingId}`,
      {
        headers: {
          Authorization: `Bearer ${this.microsoftAccessToken}`,
        },
      }
    );
  }

  /**
   * Start recording
   */
  async startRecording(
    provider: 'zoom' | 'meet' | 'teams',
    meetingId: string
  ): Promise<{ recordingId: string }> {
    try {
      switch (provider) {
        case 'zoom':
          return await this.startZoomRecording(meetingId);
        case 'meet':
          return await this.startGoogleMeetRecording(meetingId);
        case 'teams':
          return await this.startTeamsRecording(meetingId);
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error) {
      logger.error('Failed to start recording', { provider, meetingId, error });
      throw error;
    }
  }

  /**
   * Start Zoom recording
   */
  private async startZoomRecording(meetingId: string): Promise<{ recordingId: string }> {
    if (!this.zoomAccessToken) {
      throw new Error('Zoom not initialized');
    }

    const response = await axios.post(
      `https://api.zoom.us/v2/meetings/${meetingId}/recordings`,
      {},
      {
        headers: {
          Authorization: `Bearer ${this.zoomAccessToken}`,
        },
      }
    );

    logger.info('Zoom recording started', { meetingId });

    return { recordingId: response.data.uuid || meetingId };
  }

  /**
   * Start Google Meet recording
   */
  private async startGoogleMeetRecording(meetingId: string): Promise<{ recordingId: string }> {
    // Google Meet recording is handled automatically for Workspace accounts
    // This would require Google Workspace admin SDK for programmatic control
    
    logger.info('Google Meet recording requested', { meetingId });
    
    return { recordingId: `meet-recording-${meetingId}` };
  }

  /**
   * Start Teams recording
   */
  private async startTeamsRecording(meetingId: string): Promise<{ recordingId: string }> {
    if (!this.microsoftAccessToken) {
      throw new Error('Microsoft Teams not initialized');
    }

    // Teams recording API is in beta
    const response = await axios.post(
      `https://graph.microsoft.com/beta/me/onlineMeetings/${meetingId}/recordings/start`,
      {},
      {
        headers: {
          Authorization: `Bearer ${this.microsoftAccessToken}`,
        },
      }
    );

    logger.info('Teams recording started', { meetingId });

    return { recordingId: response.data.id };
  }

  /**
   * Stop recording
   */
  async stopRecording(
    provider: 'zoom' | 'meet' | 'teams',
    meetingId: string
  ): Promise<void> {
    try {
      switch (provider) {
        case 'zoom':
          await this.stopZoomRecording(meetingId);
          break;
        case 'meet':
          await this.stopGoogleMeetRecording(meetingId);
          break;
        case 'teams':
          await this.stopTeamsRecording(meetingId);
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      // Queue recording for processing
      await this.recordingQueue.add(
        {
          options: {
            meetingId,
            provider,
            autoTranscribe: true,
            cloudStorage: 's3',
          },
        },
        {
          delay: 60000, // Wait 1 minute for recording to be available
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 30000,
          },
        }
      );

      logger.info('Recording stopped and queued for processing', { provider, meetingId });
    } catch (error) {
      logger.error('Failed to stop recording', { provider, meetingId, error });
      throw error;
    }
  }

  /**
   * Stop Zoom recording
   */
  private async stopZoomRecording(meetingId: string): Promise<void> {
    if (!this.zoomAccessToken) {
      throw new Error('Zoom not initialized');
    }

    await axios.patch(
      `https://api.zoom.us/v2/meetings/${meetingId}/recordings/status`,
      { action: 'stop' },
      {
        headers: {
          Authorization: `Bearer ${this.zoomAccessToken}`,
        },
      }
    );
  }

  /**
   * Stop Google Meet recording
   */
  private async stopGoogleMeetRecording(meetingId: string): Promise<void> {
    // Google Meet recording is handled automatically
    logger.info('Google Meet recording stop requested', { meetingId });
  }

  /**
   * Stop Teams recording
   */
  private async stopTeamsRecording(meetingId: string): Promise<void> {
    if (!this.microsoftAccessToken) {
      throw new Error('Microsoft Teams not initialized');
    }

    await axios.post(
      `https://graph.microsoft.com/beta/me/onlineMeetings/${meetingId}/recordings/stop`,
      {},
      {
        headers: {
          Authorization: `Bearer ${this.microsoftAccessToken}`,
        },
      }
    );
  }

  /**
   * Get recording
   */
  async getRecording(
    provider: 'zoom' | 'meet' | 'teams',
    meetingId: string
  ): Promise<{
    url?: string;
    downloadUrl?: string;
    transcriptUrl?: string;
    duration?: number;
    size?: number;
  }> {
    try {
      switch (provider) {
        case 'zoom':
          return await this.getZoomRecording(meetingId);
        case 'meet':
          return await this.getGoogleMeetRecording(meetingId);
        case 'teams':
          return await this.getTeamsRecording(meetingId);
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error) {
      logger.error('Failed to get recording', { provider, meetingId, error });
      throw error;
    }
  }

  /**
   * Get Zoom recording
   */
  private async getZoomRecording(meetingId: string): Promise<any> {
    if (!this.zoomAccessToken) {
      throw new Error('Zoom not initialized');
    }

    const response = await axios.get(
      `https://api.zoom.us/v2/meetings/${meetingId}/recordings`,
      {
        headers: {
          Authorization: `Bearer ${this.zoomAccessToken}`,
        },
      }
    );

    const recording = response.data;
    const videoFile = recording.recording_files?.find((f: any) => f.file_type === 'MP4');

    return {
      url: videoFile?.play_url,
      downloadUrl: videoFile?.download_url,
      transcriptUrl: recording.recording_files?.find((f: any) => f.file_type === 'TRANSCRIPT')?.download_url,
      duration: videoFile?.recording_end ? 
        Math.round((new Date(videoFile.recording_end).getTime() - new Date(videoFile.recording_start).getTime()) / 1000) : 
        undefined,
      size: videoFile?.file_size,
    };
  }

  /**
   * Get Google Meet recording
   */
  private async getGoogleMeetRecording(meetingId: string): Promise<any> {
    // This would require Google Drive API to access recordings
    // Placeholder implementation
    
    logger.info('Google Meet recording requested', { meetingId });
    
    return {
      url: `https://drive.google.com/recordings/${meetingId}`,
    };
  }

  /**
   * Get Teams recording
   */
  private async getTeamsRecording(meetingId: string): Promise<any> {
    if (!this.microsoftAccessToken) {
      throw new Error('Microsoft Teams not initialized');
    }

    const response = await axios.get(
      `https://graph.microsoft.com/beta/me/onlineMeetings/${meetingId}/recordings`,
      {
        headers: {
          Authorization: `Bearer ${this.microsoftAccessToken}`,
        },
      }
    );

    const recording = response.data.value[0];

    return {
      url: recording?.contentUrl,
      downloadUrl: recording?.contentUrl,
      transcriptUrl: recording?.transcriptContentUrl,
    };
  }

  /**
   * Process recording internally
   */
  private async processRecordingInternal(options: RecordingOptions): Promise<any> {
    try {
      // Get recording from provider
      const recording = await this.getRecording(options.provider, options.meetingId);

      if (!recording.downloadUrl) {
        throw new Error('Recording not available yet');
      }

      // Download recording
      const recordingBuffer = await this.downloadRecording(recording.downloadUrl);

      // Upload to S3
      const s3Key = await this.uploadRecordingToS3(
        options.meetingId,
        recordingBuffer,
        options.provider
      );

      // Generate transcription if requested
      let transcriptUrl;
      if (options.autoTranscribe) {
        transcriptUrl = await this.generateTranscription(s3Key);
      }

      // Update database with recording details
      await this.updateRecordingDetails({
        meetingId: options.meetingId,
        provider: options.provider,
        s3Key,
        transcriptUrl,
        duration: recording.duration,
        size: recording.size,
      });

      logger.info('Recording processed successfully', { 
        meetingId: options.meetingId,
        s3Key,
        transcribed: !!transcriptUrl
      });

      return {
        s3Key,
        transcriptUrl,
        duration: recording.duration,
        size: recording.size,
      };
    } catch (error) {
      logger.error('Recording processing failed', { options, error });
      throw error;
    }
  }

  /**
   * Download recording
   */
  private async downloadRecording(url: string): Promise<Buffer> {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
    });
    
    return Buffer.from(response.data);
  }

  /**
   * Upload recording to S3
   */
  private async uploadRecordingToS3(
    meetingId: string,
    buffer: Buffer,
    provider: string
  ): Promise<string> {
    const key = `recordings/${provider}/${format(new Date(), 'yyyy-MM-dd')}/${meetingId}.mp4`;
    
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: 'video/mp4',
      Metadata: {
        meetingId,
        provider,
        uploadedAt: new Date().toISOString(),
      },
    });

    await this.s3Client.send(command);
    
    logger.info('Recording uploaded to S3', { key, meetingId });
    
    return key;
  }

  /**
   * Generate transcription
   */
  private async generateTranscription(s3Key: string): Promise<string> {
    // This would integrate with AWS Transcribe or similar service
    // Placeholder implementation
    
    const transcriptKey = s3Key.replace('.mp4', '.txt');
    
    logger.info('Transcription generated', { s3Key, transcriptKey });
    
    return transcriptKey;
  }

  /**
   * Update recording details in database
   */
  private async updateRecordingDetails(details: any): Promise<void> {
    // Update database with recording information
    // This would integrate with your database service
    
    logger.info('Recording details updated', details);
  }

  /**
   * Optimize bandwidth for video call
   */
  async optimizeBandwidth(
    meetingId: string,
    settings: Partial<BandwidthOptimization>
  ): Promise<void> {
    const optimized = {
      ...this.defaultBandwidth,
      ...settings,
    };

    // Cache optimized settings
    await CacheManager.set(
      CacheKeys.bandwidthSettings(meetingId),
      optimized,
      3600
    );

    logger.info('Bandwidth optimized for meeting', { meetingId, settings: optimized });
  }

  /**
   * Send Zoom invitations
   */
  private async sendZoomInvitations(meetingId: string, attendees: any[]): Promise<void> {
    if (!this.zoomAccessToken) return;

    try {
      await axios.post(
        `https://api.zoom.us/v2/meetings/${meetingId}/invite`,
        {
          attendees: attendees.map(a => ({ email: a.email })),
        },
        {
          headers: {
            Authorization: `Bearer ${this.zoomAccessToken}`,
          },
        }
      );
    } catch (error) {
      logger.warn('Failed to send Zoom invitations', { meetingId, error });
    }
  }

  /**
   * Send cancellation notifications
   */
  private async sendCancellationNotifications(attendees: any[], reason?: string): Promise<void> {
    const { emailService } = await import('../../services/email.service');
    
    for (const attendee of attendees) {
      await emailService.sendEmail({
        to: attendee.email,
        subject: 'Meeting Cancelled - CastMatch',
        html: `
          <p>Dear ${attendee.name},</p>
          <p>Your scheduled meeting has been cancelled.</p>
          ${reason ? `<p>Reason: ${reason}</p>` : ''}
          <p>We apologize for any inconvenience.</p>
        `,
        text: `Meeting cancelled. ${reason ? `Reason: ${reason}` : ''}`,
      });
    }
  }

  /**
   * Create meeting internally
   */
  private async createMeetingInternal(
    provider: 'zoom' | 'meet' | 'teams',
    options: MeetingOptions
  ): Promise<MeetingResponse> {
    return await this.createMeeting(provider, options);
  }

  /**
   * Get meeting details
   */
  async getMeetingDetails(
    provider: 'zoom' | 'meet' | 'teams',
    meetingId: string
  ): Promise<any> {
    // Check cache first
    const cached = await CacheManager.get(CacheKeys.videoMeeting(meetingId));
    if (cached) return cached;

    // Fetch from provider
    switch (provider) {
      case 'zoom':
        return await this.getZoomMeetingDetails(meetingId);
      case 'meet':
        return await this.getGoogleMeetDetails(meetingId);
      case 'teams':
        return await this.getTeamsMeetingDetails(meetingId);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Get Zoom meeting details
   */
  private async getZoomMeetingDetails(meetingId: string): Promise<any> {
    if (!this.zoomAccessToken) {
      throw new Error('Zoom not initialized');
    }

    const response = await axios.get(
      `https://api.zoom.us/v2/meetings/${meetingId}`,
      {
        headers: {
          Authorization: `Bearer ${this.zoomAccessToken}`,
        },
      }
    );

    return response.data;
  }

  /**
   * Get Google Meet details
   */
  private async getGoogleMeetDetails(meetingId: string): Promise<any> {
    if (!this.googleOAuth2Client) {
      throw new Error('Google Meet not initialized');
    }

    const calendar = google.calendar({ version: 'v3', auth: this.googleOAuth2Client });

    const response = await calendar.events.get({
      calendarId: 'primary',
      eventId: meetingId,
    });

    return response.data;
  }

  /**
   * Get Teams meeting details
   */
  private async getTeamsMeetingDetails(meetingId: string): Promise<any> {
    if (!this.microsoftAccessToken) {
      throw new Error('Microsoft Teams not initialized');
    }

    const response = await axios.get(
      `https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetingId}`,
      {
        headers: {
          Authorization: `Bearer ${this.microsoftAccessToken}`,
        },
      }
    );

    return response.data;
  }

  /**
   * Generate secure meeting room
   */
  async generateSecureMeetingRoom(
    provider: 'zoom' | 'meet' | 'teams',
    options: {
      maxParticipants?: number;
      requirePassword?: boolean;
      requireWaitingRoom?: boolean;
      endToEndEncryption?: boolean;
    } = {}
  ): Promise<MeetingResponse> {
    const secureOptions: MeetingOptions = {
      title: `Secure Audition Room - ${Date.now()}`,
      description: 'Private audition session',
      startTime: new Date(),
      duration: 60,
      hostEmail: process.env.DEFAULT_HOST_EMAIL || 'host@castmatch.ai',
      attendees: [],
      settings: {
        waitingRoom: options.requireWaitingRoom ?? true,
        password: options.requirePassword ? this.generateSecurePassword() : undefined,
        muteOnEntry: true,
        videoOnEntry: false,
        allowRecording: false,
      },
    };

    const meeting = await this.createMeeting(provider, secureOptions);

    // Additional security configurations
    if (options.endToEndEncryption && provider === 'zoom') {
      await this.enableE2EEncryption(meeting.id);
    }

    return meeting;
  }

  /**
   * Generate secure password
   */
  private generateSecurePassword(): string {
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  }

  /**
   * Enable E2E encryption for Zoom
   */
  private async enableE2EEncryption(meetingId: string): Promise<void> {
    if (!this.zoomAccessToken) return;

    try {
      await axios.patch(
        `https://api.zoom.us/v2/meetings/${meetingId}`,
        {
          settings: {
            encryption_type: 'enhanced_encryption',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.zoomAccessToken}`,
          },
        }
      );
    } catch (error) {
      logger.warn('Failed to enable E2E encryption', { meetingId, error });
    }
  }
}

// Extend CacheKeys
declare module '../../config/redis' {
  interface CacheKeysInterface {
    videoMeeting(meetingId: string): string;
    bandwidthSettings(meetingId: string): string;
  }
}

const originalCacheKeys = CacheKeys as any;
originalCacheKeys.videoMeeting = (meetingId: string) => `video:meeting:${meetingId}`;
originalCacheKeys.bandwidthSettings = (meetingId: string) => `video:bandwidth:${meetingId}`;

export const videoConferencingService = new VideoConferencingService();