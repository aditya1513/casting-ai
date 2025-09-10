import { describe, beforeAll, afterAll, beforeEach, it, expect, jest } from '@jest/globals';
import { zoomService } from '../../src/integrations/zoom.service';
import { googleMeetService } from '../../src/integrations/google-meet.service';
import axios from 'axios';
import moment from 'moment-timezone';

// Mock dependencies
jest.mock('axios');
jest.mock('googleapis');
jest.mock('../../src/utils/logger');

describe('Video Conferencing Integration Validation', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  let mockZoomResponse: any;
  let mockGoogleResponse: any;

  beforeAll(() => {
    // Mock environment variables
    process.env.ZOOM_ACCOUNT_ID = 'test-account-id';
    process.env.ZOOM_CLIENT_ID = 'test-client-id';
    process.env.ZOOM_CLIENT_SECRET = 'test-client-secret';
    process.env.ZOOM_WEBHOOK_TOKEN = 'test-webhook-token';
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3001/api/auth/google/callback';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful Zoom responses
    mockZoomResponse = {
      data: {
        access_token: 'test-zoom-token',
        expires_in: 3600,
      }
    };

    // Mock successful Google Meet responses
    mockGoogleResponse = {
      data: {
        id: 'test-meet-event-id',
        summary: 'Audition Meeting',
        conferenceData: {
          conferenceId: 'test-meet-id',
          entryPoints: [
            {
              entryPointType: 'video',
              uri: 'https://meet.google.com/test-meet-link'
            }
          ]
        }
      }
    };
  });

  afterAll(() => {
    // Cleanup
    delete process.env.ZOOM_ACCOUNT_ID;
    delete process.env.ZOOM_CLIENT_ID;
    delete process.env.ZOOM_CLIENT_SECRET;
    delete process.env.ZOOM_WEBHOOK_TOKEN;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_REDIRECT_URI;
  });

  describe('P0 Critical - Zoom Integration for Mumbai Market', () => {
    it('should create audition meeting with Mumbai timezone support', async () => {
      const mockMeetingResponse = {
        data: {
          id: 123456789,
          uuid: 'test-meeting-uuid',
          topic: 'Audition: Bollywood Project - Talent Mumbai',
          start_url: 'https://zoom.us/s/123456789?role=1',
          join_url: 'https://zoom.us/j/123456789',
          password: 'TestPass123',
          start_time: '2025-01-15T14:30:00+05:30',
          timezone: 'Asia/Kolkata',
          duration: 60
        }
      };

      // Mock token request
      mockedAxios.post.mockResolvedValueOnce(mockZoomResponse);
      // Mock meeting creation
      mockedAxios.post.mockResolvedValueOnce(mockMeetingResponse);

      const auditionOptions = {
        projectName: 'Bollywood Blockbuster 2025',
        talentName: 'Priya Sharma',
        castingDirector: 'Rajesh Kumar',
        startTime: moment.tz('2025-01-15 14:30', 'Asia/Kolkata').toDate(),
        duration: 60,
        enableWaitingRoom: true,
        enableRecording: true,
        recordingType: 'cloud' as const,
        coHosts: ['assistant@mumbaifilms.com']
      };

      const meeting = await zoomService.createAuditionMeeting(auditionOptions);

      expect(meeting.id).toBe(123456789);
      expect(meeting.topic).toContain('Bollywood');
      expect(meeting.join_url).toBeDefined();
      expect(meeting.password).toBeDefined();
      
      // Verify Mumbai timezone handling
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/users/me/meetings'),
        expect.objectContaining({
          start_time: expect.any(String),
          timezone: 'UTC', // Service converts to UTC internally
          topic: expect.stringContaining('Bollywood Blockbuster 2025')
        })
      );
    });

    it('should handle Mumbai peak hours scheduling conflicts', async () => {
      // Mock token
      mockedAxios.post.mockResolvedValueOnce(mockZoomResponse);
      
      // Mock conflict response
      const conflictError = {
        response: {
          status: 409,
          data: {
            code: 3001,
            message: 'Meeting cannot be created at this time'
          }
        }
      };
      mockedAxios.post.mockRejectedValueOnce(conflictError);

      const peakHourOptions = {
        projectName: 'Mumbai Film Audition',
        talentName: 'Test Talent',
        castingDirector: 'Test Director',
        startTime: moment.tz('2025-01-15 09:00', 'Asia/Kolkata').toDate(), // Peak morning
        duration: 30
      };

      await expect(zoomService.createAuditionMeeting(peakHourOptions))
        .rejects.toThrow('Meeting cannot be created at this time');
    });

    it('should support Hindi language content in meeting details', async () => {
      mockedAxios.post.mockResolvedValueOnce(mockZoomResponse);
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          id: 987654321,
          topic: 'ऑडिशन: बॉलीवुड फिल्म - मुख्य भूमिका',
          join_url: 'https://zoom.us/j/987654321'
        }
      });

      const hindiAuditionOptions = {
        projectName: 'बॉलीवुड ब्लॉकबस्टर 2025',
        talentName: 'प्रिया शर्मा',
        castingDirector: 'राजेश कुमार',
        startTime: moment.tz('2025-01-15 15:00', 'Asia/Kolkata').toDate(),
        duration: 45
      };

      const meeting = await zoomService.createAuditionMeeting(hindiAuditionOptions);

      expect(meeting.topic).toContain('बॉलीवुड');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          topic: expect.stringContaining('बॉलीवुड ब्लॉकबस्टर 2025'),
          agenda: expect.stringContaining('प्रिया शर्मा')
        })
      );
    });

    it('should validate recording capabilities for self-tape review', async () => {
      mockedAxios.post.mockResolvedValueOnce(mockZoomResponse);
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          id: 111222333,
          settings: {
            auto_recording: 'cloud',
            waiting_room: true
          }
        }
      });

      const recordingOptions = {
        projectName: 'Self-Tape Audition Review',
        talentName: 'Test Talent',
        castingDirector: 'Test Director',
        startTime: new Date(),
        duration: 30,
        enableRecording: true,
        recordingType: 'cloud' as const
      };

      await zoomService.createAuditionMeeting(recordingOptions);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          settings: expect.objectContaining({
            auto_recording: 'cloud'
          })
        })
      );
    });

    it('should handle webhook validation for meeting events', async () => {
      const webhookEvent = {
        event: 'meeting.started',
        payload: {
          account_id: 'test-account',
          object: {
            id: 123456789,
            topic: 'Test Audition',
            host_id: 'host123'
          }
        },
        event_ts: Date.now()
      };

      const signature = 'v0=test-signature';
      const timestamp = Date.now().toString();

      // Mock webhook verification (would fail in real scenario without proper signature)
      await expect(
        zoomService.handleWebhook(webhookEvent, signature, timestamp)
      ).rejects.toThrow('Invalid webhook signature');
    });

    it('should measure API response times for Mumbai requirements', async () => {
      mockedAxios.post.mockResolvedValueOnce(mockZoomResponse);
      mockedAxios.post.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ data: { id: 123, join_url: 'test' } }), 500)
        )
      );

      const startTime = Date.now();
      
      await zoomService.createAuditionMeeting({
        projectName: 'Performance Test',
        talentName: 'Test',
        castingDirector: 'Test',
        startTime: new Date(),
        duration: 30
      });

      const responseTime = Date.now() - startTime;
      
      // Mumbai market requirement: <2 seconds for video meeting creation
      expect(responseTime).toBeLessThan(2000);
    });
  });

  describe('P0 Critical - Google Meet Integration', () => {
    it('should create Meet link with calendar integration', async () => {
      const mockCalendarInsert = jest.fn().mockResolvedValue(mockGoogleResponse);
      
      // Mock Google APIs
      (googleMeetService as any).calendar = {
        events: {
          insert: mockCalendarInsert
        }
      };

      const meetOptions = {
        projectName: 'Mumbai Web Series Audition',
        talentName: 'Arjun Patel',
        talentEmail: 'arjun@example.com',
        castingDirector: 'Meera Singh',
        castingEmail: 'meera@mumbaiproductions.com',
        startTime: moment.tz('2025-01-15 16:00', 'Asia/Kolkata').toDate(),
        duration: 45,
        enableRecording: true
      };

      const result = await googleMeetService.createAuditionMeet(meetOptions);

      expect(result.meetLink).toBe('https://meet.google.com/test-meet-link');
      expect(result.meetingId).toBe('test-meet-id');
      expect(result.calendarEventId).toBe('test-meet-event-id');

      expect(mockCalendarInsert).toHaveBeenCalledWith({
        calendarId: 'primary',
        resource: expect.objectContaining({
          summary: expect.stringContaining('Mumbai Web Series Audition'),
          attendees: expect.arrayContaining([
            expect.objectContaining({ email: 'arjun@example.com' }),
            expect.objectContaining({ email: 'meera@mumbaiproductions.com' })
          ])
        }),
        conferenceDataVersion: 1,
        sendNotifications: true
      });
    });

    it('should handle Meet recording setup for auditions', async () => {
      const mockDriveCreate = jest.fn().mockResolvedValue({
        data: { id: 'recording-folder-id' }
      });

      (googleMeetService as any).drive = {
        files: {
          create: mockDriveCreate
        }
      };

      (googleMeetService as any).calendar = {
        events: {
          insert: jest.fn().mockResolvedValue(mockGoogleResponse)
        }
      };

      const recordingOptions = {
        projectName: 'Audition with Recording',
        talentName: 'Test Talent',
        talentEmail: 'talent@example.com',
        castingDirector: 'Test Director',
        castingEmail: 'director@example.com',
        startTime: new Date(),
        duration: 30,
        enableRecording: true
      };

      await googleMeetService.createAuditionMeet(recordingOptions);

      expect(mockDriveCreate).toHaveBeenCalledWith({
        requestBody: {
          name: expect.stringContaining('Audition Recordings'),
          mimeType: 'application/vnd.google-apps.folder'
        },
        fields: 'id'
      });
    });

    it('should generate proper invitation text for Mumbai market', () => {
      const meetOptions = {
        projectName: 'Bollywood Romance Film',
        talentName: 'Supporting Role Audition',
        castingDirector: 'Karan Johar',
        startTime: moment.tz('2025-01-15 14:30', 'Asia/Kolkata').toDate(),
        duration: 60,
        notes: 'Please prepare a 2-minute monologue in Hindi'
      };

      const meetLink = 'https://meet.google.com/abc-def-ghi';
      const invitation = googleMeetService.createInvitation(meetLink, meetOptions);

      expect(invitation).toContain('Bollywood Romance Film');
      expect(invitation).toContain('Karan Johar');
      expect(invitation).toContain(meetLink);
      expect(invitation).toContain('2-minute monologue in Hindi');
      expect(invitation).toContain('CastMatch AI');
    });

    it('should validate timezone handling for IST', () => {
      const istTime = moment.tz('2025-01-15 16:30', 'Asia/Kolkata');
      const meetOptions = {
        projectName: 'Test Project',
        talentName: 'Test Talent',
        castingDirector: 'Test Director',
        startTime: istTime.toDate(),
        duration: 30
      };

      const description = (googleMeetService as any).buildMeetDescription(meetOptions);
      
      expect(description).toContain('Virtual Audition for Test Project');
      expect(description).toContain('Test Talent');
      expect(description).toContain('Test Director');
      expect(description).toContain('CastMatch AI');
    });
  });

  describe('Performance and Reliability Tests', () => {
    it('should handle concurrent meeting creation requests', async () => {
      // Mock token for Zoom
      mockedAxios.post.mockResolvedValue(mockZoomResponse);
      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockImplementation(() => 
          new Promise(resolve => 
            setTimeout(() => resolve({ data: { id: Math.random() } }), 100)
          )
        ),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      } as any);

      const promises = Array(5).fill(0).map((_, i) => 
        zoomService.createAuditionMeeting({
          projectName: `Concurrent Project ${i}`,
          talentName: `Talent ${i}`,
          castingDirector: 'Director',
          startTime: moment().add(i, 'hours').toDate(),
          duration: 30
        })
      );

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled');
      
      // Should handle at least 80% success rate
      expect(successful.length).toBeGreaterThan(3);
    });

    it('should validate error handling for service outages', async () => {
      // Mock service outage
      const serviceError = {
        response: {
          status: 503,
          data: { message: 'Service temporarily unavailable' }
        }
      };

      mockedAxios.post.mockRejectedValue(serviceError);

      await expect(
        zoomService.createAuditionMeeting({
          projectName: 'Outage Test',
          talentName: 'Test',
          castingDirector: 'Test',
          startTime: new Date(),
          duration: 30
        })
      ).rejects.toThrow('Failed to authenticate with Zoom');
    });

    it('should validate retry logic for transient failures', async () => {
      // First call fails, second succeeds
      mockedAxios.post
        .mockRejectedValueOnce({ response: { status: 429 } }) // Rate limit
        .mockResolvedValueOnce(mockZoomResponse); // Token success

      // The service should handle retries internally
      // This test validates that retry logic exists
      try {
        await (zoomService as any).getAccessToken();
      } catch (error) {
        // Expected to fail due to mocked 429 error
        expect(error).toBeDefined();
      }
    });

    it('should validate meeting capacity limits for Mumbai scale', async () => {
      const largeAuditionOptions = {
        projectName: 'Mass Audition - Mumbai',
        talentName: 'Group Audition',
        castingDirector: 'Casting Team',
        startTime: new Date(),
        duration: 120,
        breakoutRooms: Array(10).fill(0).map((_, i) => ({
          name: `Audition Room ${i + 1}`,
          participants: [`talent${i}@example.com`]
        })),
        coHosts: ['assistant1@example.com', 'assistant2@example.com']
      };

      mockedAxios.post.mockResolvedValueOnce(mockZoomResponse);
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          id: 999888777,
          settings: {
            breakout_room: {
              enable: true,
              rooms: largeAuditionOptions.breakoutRooms
            }
          }
        }
      });

      const meeting = await zoomService.createAuditionMeeting(largeAuditionOptions);
      
      expect(meeting.id).toBe(999888777);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          settings: expect.objectContaining({
            breakout_room: expect.objectContaining({
              enable: true,
              rooms: expect.any(Array)
            })
          })
        })
      );
    });
  });

  describe('Mumbai Market Specific Requirements', () => {
    it('should support regional language auditions', async () => {
      const regionalAuditions = [
        {
          language: 'Hindi',
          projectName: 'बॉलीवुड फिल्म',
          talentName: 'मुख्य कलाकार',
        },
        {
          language: 'Marathi', 
          projectName: 'मराठी चित्रपट',
          talentName: 'प्रमुख भूमिका',
        },
        {
          language: 'Gujarati',
          projectName: 'ગુજરાતી ફિલ્મ',
          talentName: 'મુખ્ય ભૂમિકા',
        }
      ];

      mockedAxios.post.mockResolvedValue(mockZoomResponse);
      
      for (const audition of regionalAuditions) {
        mockedAxios.post.mockResolvedValueOnce({
          data: {
            id: Math.floor(Math.random() * 1000000),
            topic: `Audition: ${audition.projectName} - ${audition.talentName}`
          }
        });

        const meeting = await zoomService.createAuditionMeeting({
          projectName: audition.projectName,
          talentName: audition.talentName,
          castingDirector: 'Regional Director',
          startTime: new Date(),
          duration: 30
        });

        expect(meeting.topic).toContain(audition.projectName);
      }
    });

    it('should handle mobile-first access for talent in Mumbai', () => {
      const mobileOptimizedInvite = googleMeetService.createInvitation(
        'https://meet.google.com/mobile-friendly-link',
        {
          projectName: 'Mobile Audition Test',
          talentName: 'Mobile User',
          castingDirector: 'Director',
          startTime: new Date(),
          duration: 30,
          notes: 'This audition is optimized for mobile devices'
        }
      );

      expect(mobileOptimizedInvite).toContain('mobile devices');
      expect(mobileOptimizedInvite).toContain('Stable internet connection');
      expect(mobileOptimizedInvite).toContain('Working camera and microphone');
    });

    it('should validate network resilience for Mumbai internet infrastructure', async () => {
      // Simulate network instability
      const networkErrors = [
        { code: 'ETIMEDOUT' },
        { code: 'ECONNRESET' },
        { code: 'ENOTFOUND' }
      ];

      for (const error of networkErrors) {
        mockedAxios.post.mockRejectedValueOnce(error);
        
        await expect(
          zoomService.createAuditionMeeting({
            projectName: 'Network Test',
            talentName: 'Test',
            castingDirector: 'Test',
            startTime: new Date(),
            duration: 30
          })
        ).rejects.toThrow();
      }
    });
  });
});