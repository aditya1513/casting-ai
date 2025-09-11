/**
 * Zoom Video Conferencing Integration Service
 * Handles Zoom meeting creation, management, and recording for virtual auditions
 */

import axios, { AxiosInstance } from 'axios';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

interface ZoomMeeting {
  id: number;
  uuid: string;
  host_id: string;
  topic: string;
  type: number;
  start_time?: string;
  duration?: number;
  timezone?: string;
  password?: string;
  agenda?: string;
  start_url: string;
  join_url: string;
  settings?: ZoomMeetingSettings;
}

interface ZoomMeetingSettings {
  host_video?: boolean;
  participant_video?: boolean;
  cn_meeting?: boolean;
  in_meeting?: boolean;
  join_before_host?: boolean;
  mute_upon_entry?: boolean;
  watermark?: boolean;
  use_pmi?: boolean;
  approval_type?: number;
  registration_type?: number;
  audio?: 'both' | 'telephony' | 'voip';
  auto_recording?: 'local' | 'cloud' | 'none';
  enforce_login?: boolean;
  waiting_room?: boolean;
  authenticated_domains?: string;
  show_share_button?: boolean;
  allow_multiple_devices?: boolean;
  encryption_type?: 'enhanced_encryption' | 'e2ee';
  breakout_room?: {
    enable: boolean;
    rooms?: Array<{
      name: string;
      participants?: string[];
    }>;
  };
}

interface ZoomUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  type: number;
  status: string;
  timezone?: string;
}

interface ZoomRecording {
  uuid: string;
  id: number;
  account_id: string;
  host_id: string;
  topic: string;
  start_time: string;
  duration: number;
  total_size: number;
  recording_count: number;
  recording_files: ZoomRecordingFile[];
}

interface ZoomRecordingFile {
  id: string;
  meeting_id: string;
  recording_start: string;
  recording_end: string;
  file_type: string;
  file_size: number;
  play_url?: string;
  download_url?: string;
  status: string;
  recording_type: string;
}

interface ZoomWebhookEvent {
  event: string;
  payload: {
    account_id: string;
    object: any;
  };
  event_ts: number;
}

interface AuditionMeetingOptions {
  projectName: string;
  talentName: string;
  castingDirector: string;
  startTime: Date;
  duration: number; // in minutes
  enableWaitingRoom?: boolean;
  enableRecording?: boolean;
  recordingType?: 'cloud' | 'local';
  requireRegistration?: boolean;
  breakoutRooms?: Array<{
    name: string;
    participants?: string[];
  }>;
  coHosts?: string[];
  interpreters?: Array<{
    email: string;
    languages: string[];
  }>;
}

export class ZoomService {
  private axiosInstance: AxiosInstance;
  private accountId: string;
  private clientId: string;
  private clientSecret: string;
  private webhookToken: string;
  private accessToken?: string;
  private tokenExpiry?: number;

  constructor() {
    this.accountId = process.env.ZOOM_ACCOUNT_ID || '';
    this.clientId = process.env.ZOOM_CLIENT_ID || '';
    this.clientSecret = process.env.ZOOM_CLIENT_SECRET || '';
    this.webhookToken = process.env.ZOOM_WEBHOOK_TOKEN || '';

    this.axiosInstance = axios.create({
      baseURL: 'https://api.zoom.us/v2',
      timeout: 30000,
    });

    // Add request interceptor to include auth token
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        const token = await this.getAccessToken();
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired, refresh and retry
          this.accessToken = undefined;
          const originalRequest = error.config;
          const token = await this.getAccessToken();
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return this.axiosInstance(originalRequest);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get OAuth access token
   */
  private async getAccessToken(): Promise<string> {
    try {
      // Check if we have a valid token
      if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.accessToken;
      }

      // Request new token
      const response = await axios.post(
        'https://zoom.us/oauth/token',
        null,
        {
          params: {
            grant_type: 'account_credentials',
            account_id: this.accountId,
          },
          auth: {
            username: this.clientId,
            password: this.clientSecret,
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // Refresh 1 min early

      logger.info('Obtained new Zoom access token');
      return this.accessToken;
    } catch (error) {
      logger.error('Failed to get Zoom access token:', error);
      throw new AppError('Failed to authenticate with Zoom', 401);
    }
  }

  /**
   * Create an audition meeting
   */
  async createAuditionMeeting(options: AuditionMeetingOptions): Promise<ZoomMeeting> {
    try {
      const meetingData = {
        topic: `Audition: ${options.projectName} - ${options.talentName}`,
        type: 2, // Scheduled meeting
        start_time: options.startTime.toISOString(),
        duration: options.duration,
        timezone: 'UTC',
        password: this.generateSecurePassword(),
        agenda: `Virtual audition for ${options.projectName}\nTalent: ${options.talentName}\nCasting Director: ${options.castingDirector}`,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true,
          watermark: false,
          use_pmi: false,
          approval_type: 2, // No registration required
          audio: 'both' as const,
          auto_recording: options.enableRecording ? (options.recordingType || 'cloud') : 'none' as const,
          waiting_room: options.enableWaitingRoom !== false,
          meeting_authentication: false,
          show_share_button: true,
          allow_multiple_devices: false,
          encryption_type: 'enhanced_encryption' as const,
          breakout_room: options.breakoutRooms ? {
            enable: true,
            rooms: options.breakoutRooms,
          } : undefined,
          alternative_hosts: options.coHosts?.join(','),
          language_interpretation: options.interpreters ? {
            enable: true,
            interpreters: options.interpreters,
          } : undefined,
        },
      };

      const response = await this.axiosInstance.post('/users/me/meetings', meetingData);
      const meeting = response.data;

      logger.info(`Created Zoom audition meeting: ${meeting.id}`);
      return meeting;
    } catch (error: any) {
      logger.error('Failed to create Zoom meeting:', error);
      throw new AppError(
        error.response?.data?.message || 'Failed to create Zoom meeting',
        error.response?.status || 500
      );
    }
  }

  /**
   * Update meeting settings
   */
  async updateMeeting(meetingId: number, updates: Partial<ZoomMeeting>): Promise<void> {
    try {
      await this.axiosInstance.patch(`/meetings/${meetingId}`, updates);
      logger.info(`Updated Zoom meeting: ${meetingId}`);
    } catch (error: any) {
      logger.error('Failed to update Zoom meeting:', error);
      throw new AppError('Failed to update meeting', error.response?.status || 500);
    }
  }

  /**
   * Delete a meeting
   */
  async deleteMeeting(meetingId: number): Promise<void> {
    try {
      await this.axiosInstance.delete(`/meetings/${meetingId}`);
      logger.info(`Deleted Zoom meeting: ${meetingId}`);
    } catch (error: any) {
      logger.error('Failed to delete Zoom meeting:', error);
      throw new AppError('Failed to delete meeting', error.response?.status || 500);
    }
  }

  /**
   * Get meeting details
   */
  async getMeeting(meetingId: number): Promise<ZoomMeeting> {
    try {
      const response = await this.axiosInstance.get(`/meetings/${meetingId}`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to get Zoom meeting:', error);
      throw new AppError('Failed to get meeting details', error.response?.status || 500);
    }
  }

  /**
   * Get meeting recording
   */
  async getMeetingRecording(meetingId: string): Promise<ZoomRecording> {
    try {
      const response = await this.axiosInstance.get(`/meetings/${meetingId}/recordings`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to get meeting recording:', error);
      throw new AppError('Failed to get recording', error.response?.status || 500);
    }
  }

  /**
   * Download recording file
   */
  async downloadRecording(downloadUrl: string): Promise<Buffer> {
    try {
      const token = await this.getAccessToken();
      const response = await axios.get(downloadUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'arraybuffer',
      });
      return Buffer.from(response.data);
    } catch (error: any) {
      logger.error('Failed to download recording:', error);
      throw new AppError('Failed to download recording', 500);
    }
  }

  /**
   * Start cloud recording
   */
  async startRecording(meetingId: number): Promise<void> {
    try {
      await this.axiosInstance.patch(`/meetings/${meetingId}/recordings/status`, {
        action: 'start',
      });
      logger.info(`Started recording for meeting: ${meetingId}`);
    } catch (error: any) {
      logger.error('Failed to start recording:', error);
      throw new AppError('Failed to start recording', error.response?.status || 500);
    }
  }

  /**
   * Stop cloud recording
   */
  async stopRecording(meetingId: number): Promise<void> {
    try {
      await this.axiosInstance.patch(`/meetings/${meetingId}/recordings/status`, {
        action: 'stop',
      });
      logger.info(`Stopped recording for meeting: ${meetingId}`);
    } catch (error: any) {
      logger.error('Failed to stop recording:', error);
      throw new AppError('Failed to stop recording', error.response?.status || 500);
    }
  }

  /**
   * Add registrant to meeting
   */
  async addRegistrant(
    meetingId: number,
    registrant: {
      email: string;
      first_name: string;
      last_name: string;
    }
  ): Promise<{ registrant_id: string; join_url: string }> {
    try {
      const response = await this.axiosInstance.post(
        `/meetings/${meetingId}/registrants`,
        registrant
      );
      return response.data;
    } catch (error: any) {
      logger.error('Failed to add registrant:', error);
      throw new AppError('Failed to add registrant', error.response?.status || 500);
    }
  }

  /**
   * Get meeting participants
   */
  async getParticipants(meetingId: string): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get(`/past_meetings/${meetingId}/participants`);
      return response.data.participants || [];
    } catch (error: any) {
      logger.error('Failed to get participants:', error);
      throw new AppError('Failed to get participants', error.response?.status || 500);
    }
  }

  /**
   * Create waiting room message
   */
  async updateWaitingRoomSettings(
    meetingId: number,
    settings: {
      title?: string;
      description?: string;
      logo_url?: string;
    }
  ): Promise<void> {
    try {
      await this.axiosInstance.patch(`/meetings/${meetingId}`, {
        settings: {
          waiting_room: true,
          waiting_room_options: settings,
        },
      });
      logger.info(`Updated waiting room settings for meeting: ${meetingId}`);
    } catch (error: any) {
      logger.error('Failed to update waiting room:', error);
      throw new AppError('Failed to update waiting room', error.response?.status || 500);
    }
  }

  /**
   * Handle webhook events
   */
  async handleWebhook(
    event: ZoomWebhookEvent,
    signature: string,
    timestamp: string
  ): Promise<void> {
    try {
      // Verify webhook signature
      if (!this.verifyWebhookSignature(event, signature, timestamp)) {
        throw new AppError('Invalid webhook signature', 401);
      }

      // Process different event types
      switch (event.event) {
        case 'meeting.started':
          await this.handleMeetingStarted(event.payload.object);
          break;
        case 'meeting.ended':
          await this.handleMeetingEnded(event.payload.object);
          break;
        case 'meeting.participant_joined':
          await this.handleParticipantJoined(event.payload.object);
          break;
        case 'meeting.participant_left':
          await this.handleParticipantLeft(event.payload.object);
          break;
        case 'recording.completed':
          await this.handleRecordingCompleted(event.payload.object);
          break;
        default:
          logger.info(`Unhandled Zoom webhook event: ${event.event}`);
      }
    } catch (error) {
      logger.error('Failed to handle Zoom webhook:', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  private verifyWebhookSignature(
    event: ZoomWebhookEvent,
    signature: string,
    timestamp: string
  ): boolean {
    const message = `v0:${timestamp}:${JSON.stringify(event)}`;
    const hash = crypto
      .createHmac('sha256', this.webhookToken)
      .update(message)
      .digest('hex');
    const expectedSignature = `v0=${hash}`;
    return signature === expectedSignature;
  }

  /**
   * Handle meeting started event
   */
  private async handleMeetingStarted(meeting: any): Promise<void> {
    logger.info(`Meeting started: ${meeting.id}`, {
      topic: meeting.topic,
      host_id: meeting.host_id,
    });
    // Update database, send notifications, etc.
  }

  /**
   * Handle meeting ended event
   */
  private async handleMeetingEnded(meeting: any): Promise<void> {
    logger.info(`Meeting ended: ${meeting.id}`, {
      topic: meeting.topic,
      duration: meeting.duration,
    });
    // Update database, process recording, etc.
  }

  /**
   * Handle participant joined event
   */
  private async handleParticipantJoined(data: any): Promise<void> {
    logger.info(`Participant joined meeting: ${data.meeting.id}`, {
      participant: data.participant.user_name,
    });
    // Track attendance, send notifications, etc.
  }

  /**
   * Handle participant left event
   */
  private async handleParticipantLeft(data: any): Promise<void> {
    logger.info(`Participant left meeting: ${data.meeting.id}`, {
      participant: data.participant.user_name,
    });
    // Update attendance records, etc.
  }

  /**
   * Handle recording completed event
   */
  private async handleRecordingCompleted(recording: any): Promise<void> {
    logger.info(`Recording completed: ${recording.id}`, {
      topic: recording.topic,
      total_size: recording.total_size,
    });
    // Download recording, process video, store in S3, etc.
  }

  /**
   * Generate secure meeting password
   */
  private generateSecurePassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Get user details
   */
  async getUser(userId: string = 'me'): Promise<ZoomUser> {
    try {
      const response = await this.axiosInstance.get(`/users/${userId}`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to get Zoom user:', error);
      throw new AppError('Failed to get user details', error.response?.status || 500);
    }
  }

  /**
   * List upcoming meetings
   */
  async listMeetings(userId: string = 'me', type: 'scheduled' | 'live' | 'upcoming' = 'upcoming'): Promise<ZoomMeeting[]> {
    try {
      const response = await this.axiosInstance.get(`/users/${userId}/meetings`, {
        params: { type },
      });
      return response.data.meetings || [];
    } catch (error: any) {
      logger.error('Failed to list meetings:', error);
      throw new AppError('Failed to list meetings', error.response?.status || 500);
    }
  }

  /**
   * Create meeting invitation
   */
  createMeetingInvitation(meeting: ZoomMeeting): string {
    return `
You're invited to a Zoom meeting:

Topic: ${meeting.topic}
Time: ${meeting.start_time}
Duration: ${meeting.duration} minutes

Join Zoom Meeting:
${meeting.join_url}

Meeting ID: ${meeting.id}
Passcode: ${meeting.password}

---
This meeting was scheduled via CastMatch AI
    `.trim();
  }
}

// Export singleton instance
export const zoomService = new ZoomService();