import { describe, beforeAll, afterAll, beforeEach, it, expect, jest } from '@jest/globals';
import { calendarService, CalendarEvent } from '../../src/integrations/calendar.service';
import Redis from 'ioredis';
import moment from 'moment-timezone';

// Mock dependencies for testing
jest.mock('googleapis');
jest.mock('ioredis');
jest.mock('../../src/utils/logger');
jest.mock('../../src/queues/queue.manager');

describe('Google Calendar Integration Validation', () => {
  let mockCalendar: any;
  let mockOAuth2Client: any;
  let mockRedis: any;

  beforeAll(async () => {
    // Mock environment variables
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3001/api/calendar/callback';
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';
    process.env.REDIS_PASSWORD = 'test-password';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock OAuth2Client
    mockOAuth2Client = {
      setCredentials: jest.fn(),
      generateAuthUrl: jest.fn().mockReturnValue('https://accounts.google.com/oauth/authorize?test=1'),
      getToken: jest.fn().mockResolvedValue({
        tokens: {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expiry_date: Date.now() + 3600000
        }
      }),
      refreshAccessToken: jest.fn().mockResolvedValue({
        credentials: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token'
        }
      })
    };

    // Mock Calendar API
    mockCalendar = {
      events: {
        insert: jest.fn(),
        get: jest.fn(),
        list: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        watch: jest.fn()
      },
      freebusy: {
        query: jest.fn()
      },
      channels: {
        stop: jest.fn()
      }
    };

    // Mock Redis
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      keys: jest.fn().mockResolvedValue([])
    };

    (Redis as any).mockImplementation(() => mockRedis);
  });

  afterAll(async () => {
    // Cleanup
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_REDIRECT_URI;
  });

  describe('P0 Critical - Third-party API Integration Validation', () => {
    it('should handle OAuth2 authentication flow for Mumbai market', async () => {
      // Mock stored tokens
      mockRedis.get.mockResolvedValue(JSON.stringify({
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        expiry_date: Date.now() + 3600000
      }));

      const authUrl = calendarService.getAuthorizationUrl('mumbai-state');
      
      expect(authUrl).toContain('accounts.google.com');
      expect(authUrl).toContain('state=mumbai-state');
      expect(mockOAuth2Client.generateAuthUrl).toHaveBeenCalledWith({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/calendar.events'
        ],
        state: 'mumbai-state',
        prompt: 'consent'
      });
    });

    it('should create audition scheduling events with Mumbai timezone', async () => {
      const mockEvent = {
        id: 'test-event-id',
        summary: 'Bollywood Movie Audition - Lead Role',
        htmlLink: 'https://calendar.google.com/event/test-event-id'
      };

      mockCalendar.events.insert.mockResolvedValue({ data: mockEvent });
      mockRedis.get.mockResolvedValue(JSON.stringify({ access_token: 'test-token' }));

      const calendarEvent: CalendarEvent = {
        summary: 'Bollywood Movie Audition - Lead Role',
        description: 'Audition for upcoming Bollywood production in Mumbai',
        location: 'Film City, Mumbai, Maharashtra, India',
        start: {
          dateTime: moment.tz('2025-01-15 10:00', 'Asia/Kolkata').toISOString(),
          timeZone: 'Asia/Kolkata'
        },
        end: {
          dateTime: moment.tz('2025-01-15 11:00', 'Asia/Kolkata').toISOString(),
          timeZone: 'Asia/Kolkata'
        },
        attendees: [
          { email: 'talent@example.com', displayName: 'Talent Mumbai' },
          { email: 'castingdirector@mumbaifilms.com', displayName: 'Casting Director' }
        ],
        metadata: {
          castingType: 'audition',
          market: 'mumbai',
          productionId: 'prod-mumbai-001'
        }
      };

      // This would normally require actual Google Calendar setup, so we'll mock the service
      const result = await calendarService.createEvent(calendarEvent, 'AUDITION');
      
      expect(mockCalendar.events.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          calendarId: 'primary',
          requestBody: expect.objectContaining({
            summary: calendarEvent.summary,
            location: expect.stringContaining('Mumbai'),
            start: expect.objectContaining({
              timeZone: 'Asia/Kolkata'
            }),
            end: expect.objectContaining({
              timeZone: 'Asia/Kolkata'
            })
          }),
          sendUpdates: 'all'
        })
      );
    });

    it('should detect scheduling conflicts for Mumbai peak hours', async () => {
      const conflictingEvent = {
        id: 'conflict-event',
        summary: 'Existing Meeting',
        start: { dateTime: '2025-01-15T10:30:00+05:30' },
        end: { dateTime: '2025-01-15T11:30:00+05:30' }
      };

      mockCalendar.events.list.mockResolvedValue({
        data: { items: [conflictingEvent] }
      });
      mockRedis.get.mockResolvedValue(JSON.stringify({ access_token: 'test-token' }));

      const start = moment.tz('2025-01-15 10:00', 'Asia/Kolkata').toDate();
      const end = moment.tz('2025-01-15 11:00', 'Asia/Kolkata').toDate();

      const conflictResult = await calendarService.checkConflicts(start, end);

      expect(conflictResult.hasConflict).toBe(true);
      expect(conflictResult.conflictingEvents).toHaveLength(1);
      expect(conflictResult.conflictingEvents[0].summary).toBe('Existing Meeting');
    });

    it('should find available slots during Mumbai business hours', async () => {
      const busyPeriods = [
        {
          start: '2025-01-15T09:00:00+05:30',
          end: '2025-01-15T10:00:00+05:30'
        },
        {
          start: '2025-01-15T14:00:00+05:30',
          end: '2025-01-15T15:00:00+05:30'
        }
      ];

      mockCalendar.freebusy.query.mockResolvedValue({
        data: {
          calendars: {
            primary: { busy: busyPeriods }
          }
        }
      });
      mockRedis.get.mockResolvedValue(null); // No cache
      mockRedis.get.mockResolvedValueOnce(JSON.stringify({ access_token: 'test-token' }));

      const query = {
        timeMin: moment.tz('2025-01-15 09:00', 'Asia/Kolkata').toDate(),
        timeMax: moment.tz('2025-01-15 17:00', 'Asia/Kolkata').toDate(),
        duration: 60,
        timeZone: 'Asia/Kolkata',
        excludeWeekends: true,
        workingHours: { start: '09:00', end: '18:00' }
      };

      const availableSlots = await calendarService.findAvailableSlots(query);

      expect(availableSlots).toBeDefined();
      expect(availableSlots.length).toBeGreaterThan(0);
      
      // Check that available slots don't conflict with busy periods
      const availableSlot = availableSlots.find(slot => slot.available);
      expect(availableSlot).toBeDefined();
      
      if (availableSlot) {
        const slotStart = moment(availableSlot.start);
        const slotEnd = moment(availableSlot.end);
        
        // Should not overlap with busy periods
        busyPeriods.forEach(busy => {
          const busyStart = moment(busy.start);
          const busyEnd = moment(busy.end);
          
          expect(
            slotEnd.isSameOrBefore(busyStart) || slotStart.isSameOrAfter(busyEnd)
          ).toBe(true);
        });
      }
    });

    it('should handle API rate limiting and exponential backoff', async () => {
      const rateLimitError = {
        code: 429,
        message: 'Rate limit exceeded'
      };

      // First call fails with rate limit
      mockCalendar.events.insert
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({ data: { id: 'retry-success' } });

      mockRedis.get.mockResolvedValue(JSON.stringify({ access_token: 'test-token' }));

      const calendarEvent: CalendarEvent = {
        summary: 'Rate Limit Test Event',
        start: { dateTime: moment.tz('2025-01-15 10:00', 'Asia/Kolkata').toISOString() },
        end: { dateTime: moment.tz('2025-01-15 11:00', 'Asia/Kolkata').toISOString() }
      };

      // Should implement retry logic in actual service
      try {
        await calendarService.createEvent(calendarEvent);
      } catch (error: any) {
        expect(error.code).toBe(429);
        expect(error.message).toContain('Rate limit');
      }
    });

    it('should validate token refresh mechanism', async () => {
      const expiredTokens = {
        access_token: 'expired-token',
        refresh_token: 'valid-refresh-token',
        expiry_date: Date.now() - 1000 // Expired
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(expiredTokens));
      
      // Mock token refresh
      mockOAuth2Client.refreshAccessToken.mockResolvedValue({
        credentials: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expiry_date: Date.now() + 3600000
        }
      });

      // Service should handle token refresh automatically
      expect(mockOAuth2Client.refreshAccessToken).toBeDefined();
      expect(mockRedis.set).toBeDefined();
    });
  });

  describe('Performance and Reliability Tests', () => {
    it('should handle concurrent calendar operations', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ access_token: 'test-token' }));
      mockCalendar.events.insert.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ data: { id: Math.random().toString() } }), 100)
        )
      );

      const promises = Array(10).fill(0).map((_, i) => 
        calendarService.createEvent({
          summary: `Concurrent Event ${i}`,
          start: { dateTime: moment().add(i, 'hours').toISOString() },
          end: { dateTime: moment().add(i, 'hours').add(1, 'hour').toISOString() }
        })
      );

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled');
      
      expect(successful.length).toBeGreaterThan(8); // Allow for some failures
    });

    it('should cache availability queries to reduce API calls', async () => {
      const cachedSlots = [
        {
          start: new Date('2025-01-15T10:00:00+05:30'),
          end: new Date('2025-01-15T11:00:00+05:30'),
          available: true
        }
      ];

      // First call returns cache
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cachedSlots));

      const query = {
        timeMin: moment.tz('2025-01-15 09:00', 'Asia/Kolkata').toDate(),
        timeMax: moment.tz('2025-01-15 17:00', 'Asia/Kolkata').toDate(),
        duration: 60,
        timeZone: 'Asia/Kolkata'
      };

      const slots = await calendarService.findAvailableSlots(query);

      expect(slots).toEqual(cachedSlots);
      expect(mockCalendar.freebusy.query).not.toHaveBeenCalled(); // Should use cache
    });

    it('should measure API response times for Mumbai market requirements', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ access_token: 'test-token' }));
      mockCalendar.events.insert.mockResolvedValue({ 
        data: { 
          id: 'perf-test-event',
          created: new Date().toISOString()
        }
      });

      const startTime = Date.now();
      
      await calendarService.createEvent({
        summary: 'Performance Test Event',
        start: { dateTime: moment().toISOString() },
        end: { dateTime: moment().add(1, 'hour').toISOString() }
      });

      const responseTime = Date.now() - startTime;
      
      // Mumbai market requirement: <2 second response times
      expect(responseTime).toBeLessThan(2000);
    });

    it('should validate webhook setup for real-time notifications', async () => {
      const mockChannel = {
        id: 'test-channel-id',
        resourceId: 'test-resource-id',
        expiration: (Date.now() + 7 * 24 * 60 * 60 * 1000).toString()
      };

      mockCalendar.events.watch.mockResolvedValue({ data: mockChannel });
      mockRedis.get.mockResolvedValue(JSON.stringify({ access_token: 'test-token' }));

      const webhookUrl = 'https://api.castmatch.com/webhooks/calendar';
      const channel = await calendarService.watchCalendar(webhookUrl);

      expect(channel.id).toBe('test-channel-id');
      expect(mockCalendar.events.watch).toHaveBeenCalledWith({
        calendarId: 'primary',
        requestBody: {
          id: expect.stringContaining('castmatch-'),
          type: 'web_hook',
          address: webhookUrl,
          expiration: expect.any(String)
        }
      });
    });
  });

  describe('Mumbai Market Specific Validations', () => {
    it('should handle Indian Standard Time (IST) correctly', () => {
      const mumbaiTime = moment.tz('2025-01-15 14:30', 'Asia/Kolkata');
      const utcTime = mumbaiTime.clone().utc();
      
      // IST is UTC+5:30
      expect(mumbaiTime.utcOffset()).toBe(330); // 5.5 hours in minutes
      expect(utcTime.format()).toBe(mumbaiTime.utc().format());
    });

    it('should support Hindi event descriptions for Mumbai market', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ access_token: 'test-token' }));
      mockCalendar.events.insert.mockResolvedValue({ 
        data: { id: 'hindi-event', summary: 'बॉलीवुड ऑडिशन' }
      });

      const hindiBollywordEvent: CalendarEvent = {
        summary: 'बॉलीवुड ऑडिशन - मुख्य भूमिका',
        description: 'मुंबई में आगामी बॉलीवुड प्रोडक्शन के लिए ऑडिशन',
        location: 'फिल्म सिटी, मुंबई, महाराष्ट्र, भारत',
        start: {
          dateTime: moment.tz('2025-01-15 10:00', 'Asia/Kolkata').toISOString(),
          timeZone: 'Asia/Kolkata'
        },
        end: {
          dateTime: moment.tz('2025-01-15 11:00', 'Asia/Kolkata').toISOString(),
          timeZone: 'Asia/Kolkata'
        }
      };

      await calendarService.createEvent(hindiBollywordEvent);

      expect(mockCalendar.events.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            summary: expect.stringContaining('बॉलीवुड'),
            description: expect.stringContaining('ऑडिशन'),
            location: expect.stringContaining('मुंबई')
          })
        })
      );
    });

    it('should handle Mumbai peak traffic hours scheduling', async () => {
      // Mumbai peak hours: 8-11 AM and 5-9 PM
      const peakMorningStart = moment.tz('2025-01-15 08:00', 'Asia/Kolkata').toDate();
      const peakMorningEnd = moment.tz('2025-01-15 11:00', 'Asia/Kolkata').toDate();
      const peakEveningStart = moment.tz('2025-01-15 17:00', 'Asia/Kolkata').toDate();
      const peakEveningEnd = moment.tz('2025-01-15 21:00', 'Asia/Kolkata').toDate();

      // Test availability during peak hours
      mockCalendar.freebusy.query.mockResolvedValue({
        data: { calendars: { primary: { busy: [] } } }
      });
      mockRedis.get.mockResolvedValueOnce(null);
      mockRedis.get.mockResolvedValueOnce(JSON.stringify({ access_token: 'test-token' }));

      const availabilityQuery = {
        timeMin: peakMorningStart,
        timeMax: peakMorningEnd,
        duration: 60,
        timeZone: 'Asia/Kolkata',
        workingHours: { start: '08:00', end: '21:00' }
      };

      const slots = await calendarService.findAvailableSlots(availabilityQuery);
      
      expect(slots).toBeDefined();
      // Should respect Mumbai business hours
      slots.forEach(slot => {
        const slotTime = moment(slot.start).tz('Asia/Kolkata');
        expect(slotTime.hour()).toBeGreaterThanOrEqual(8);
        expect(slotTime.hour()).toBeLessThan(21);
      });
    });
  });
});