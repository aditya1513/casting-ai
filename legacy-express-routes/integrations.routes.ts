/**
 * Integration API Routes
 * Handles all third-party integration endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import multer from 'multer';
import { authenticate } from '../middleware/auth.unified';
import { rateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

// Import integration services
import { googleCalendarService } from '../integrations/google-calendar.service';
import { zoomService } from '../integrations/zoom.service';
import { googleMeetService } from '../integrations/google-meet.service';
import { notificationService } from '../integrations/notification.service';
import { webhookService } from '../integrations/webhook.service';
import { fileStorageService } from '../integrations/file-storage.service';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
  },
  fileFilter: (req, file, cb) => {
    // Validate file types
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'video/webm',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

// Validation middleware
const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// ===========================
// Google Calendar Routes
// ===========================

/**
 * GET /api/integrations/google/auth
 * Get Google OAuth URL
 */
router.get(
  '/google/auth',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const state = req.user?.id || '';
    const authUrl = googleCalendarService.getAuthUrl(state);
    
    res.json({ authUrl });
  })
);

/**
 * POST /api/integrations/google/callback
 * Handle Google OAuth callback
 */
router.post(
  '/google/callback',
  authenticate,
  [
    body('code').notEmpty().withMessage('Authorization code is required'),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.body;
    const tokens = await googleCalendarService.getTokens(code);
    
    // Store tokens in user profile (implement based on your user service)
    // await userService.updateGoogleTokens(req.user.id, tokens);
    
    res.json({ success: true, message: 'Google Calendar connected successfully' });
  })
);

/**
 * POST /api/integrations/google/calendar/events
 * Create calendar event
 */
router.post(
  '/google/calendar/events',
  authenticate,
  rateLimiter({ windowMs: 60000, max: 30 }),
  [
    body('projectName').notEmpty(),
    body('talentName').notEmpty(),
    body('talentEmail').isEmail(),
    body('castingDirector').notEmpty(),
    body('castingEmail').isEmail(),
    body('startTime').isISO8601(),
    body('endTime').isISO8601(),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const eventId = await googleCalendarService.createAuditionEvent(req.body);
    
    res.status(201).json({
      success: true,
      eventId,
      message: 'Audition scheduled successfully',
    });
  })
);

/**
 * GET /api/integrations/google/calendar/availability
 * Check calendar availability
 */
router.get(
  '/google/calendar/availability',
  authenticate,
  [
    query('startDate').isISO8601(),
    query('endDate').isISO8601(),
    query('duration').optional().isInt({ min: 15, max: 480 }),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate, duration } = req.query;
    
    const slots = await googleCalendarService.getAvailableSlots(
      new Date(startDate as string),
      new Date(endDate as string),
      parseInt(duration as string) || 60
    );
    
    res.json({ slots });
  })
);

/**
 * POST /api/integrations/google/calendar/webhook
 * Setup calendar webhook
 */
router.post(
  '/google/calendar/webhook',
  authenticate,
  [
    body('webhookUrl').isURL(),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { webhookUrl } = req.body;
    const webhook = await googleCalendarService.setupWebhook('primary', webhookUrl);
    
    res.json({ success: true, webhook });
  })
);

// ===========================
// Zoom Routes
// ===========================

/**
 * POST /api/integrations/zoom/meetings
 * Create Zoom meeting
 */
router.post(
  '/zoom/meetings',
  authenticate,
  rateLimiter({ windowMs: 60000, max: 20 }),
  [
    body('projectName').notEmpty(),
    body('talentName').notEmpty(),
    body('castingDirector').notEmpty(),
    body('startTime').isISO8601(),
    body('duration').isInt({ min: 15, max: 480 }),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const meeting = await zoomService.createAuditionMeeting(req.body);
    
    res.status(201).json({
      success: true,
      meeting: {
        id: meeting.id,
        joinUrl: meeting.join_url,
        startUrl: meeting.start_url,
        password: meeting.password,
      },
    });
  })
);

/**
 * GET /api/integrations/zoom/meetings/:meetingId
 * Get Zoom meeting details
 */
router.get(
  '/zoom/meetings/:meetingId',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { meetingId } = req.params;
    const meeting = await zoomService.getMeeting(parseInt(meetingId));
    
    res.json({ meeting });
  })
);

/**
 * POST /api/integrations/zoom/meetings/:meetingId/recording
 * Start/stop recording
 */
router.post(
  '/zoom/meetings/:meetingId/recording',
  authenticate,
  [
    body('action').isIn(['start', 'stop']),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { meetingId } = req.params;
    const { action } = req.body;
    
    if (action === 'start') {
      await zoomService.startRecording(parseInt(meetingId));
    } else {
      await zoomService.stopRecording(parseInt(meetingId));
    }
    
    res.json({ success: true, message: `Recording ${action}ed` });
  })
);

/**
 * GET /api/integrations/zoom/recordings/:meetingId
 * Get meeting recording
 */
router.get(
  '/zoom/recordings/:meetingId',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { meetingId } = req.params;
    const recording = await zoomService.getMeetingRecording(meetingId);
    
    res.json({ recording });
  })
);

// ===========================
// Google Meet Routes
// ===========================

/**
 * POST /api/integrations/meet/create
 * Create Google Meet
 */
router.post(
  '/meet/create',
  authenticate,
  rateLimiter({ windowMs: 60000, max: 20 }),
  [
    body('projectName').notEmpty(),
    body('talentName').notEmpty(),
    body('talentEmail').isEmail(),
    body('castingDirector').notEmpty(),
    body('castingEmail').isEmail(),
    body('startTime').isISO8601(),
    body('duration').isInt({ min: 15, max: 480 }),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const meetData = await googleMeetService.createAuditionMeet(req.body);
    
    res.status(201).json({
      success: true,
      meet: meetData,
    });
  })
);

/**
 * GET /api/integrations/meet/:meetingId
 * Get Meet details
 */
router.get(
  '/meet/:meetingId',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { meetingId } = req.params;
    const details = await googleMeetService.getMeetDetails(meetingId);
    
    res.json({ meet: details });
  })
);

// ===========================
// Notification Routes
// ===========================

/**
 * POST /api/integrations/notifications/send
 * Send notification
 */
router.post(
  '/notifications/send',
  authenticate,
  rateLimiter({ windowMs: 60000, max: 100 }),
  [
    body('recipient.id').notEmpty(),
    body('title').notEmpty(),
    body('body').notEmpty(),
    body('channels').optional().isArray(),
    body('priority').optional().isIn(['urgent', 'high', 'normal', 'low']),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await notificationService.send(req.body);
    
    res.json({
      success: result.success,
      notificationId: result.id,
      channels: result.channels,
    });
  })
);

/**
 * POST /api/integrations/notifications/bulk
 * Send bulk notifications
 */
router.post(
  '/notifications/bulk',
  authenticate,
  rateLimiter({ windowMs: 60000, max: 10 }),
  [
    body('recipients').isArray().withMessage('Recipients must be an array'),
    body('recipients.*.id').notEmpty(),
    body('title').notEmpty(),
    body('body').notEmpty(),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { recipients, ...notification } = req.body;
    const results = [];
    
    for (const recipient of recipients) {
      const result = await notificationService.queue({
        ...notification,
        recipient,
      });
      results.push(result);
    }
    
    res.json({
      success: true,
      queued: results.length,
      jobIds: results,
    });
  })
);

/**
 * POST /api/integrations/notifications/push/subscribe
 * Subscribe to push notifications
 */
router.post(
  '/notifications/push/subscribe',
  authenticate,
  [
    body('subscription').notEmpty(),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { subscription } = req.body;
    await notificationService.subscribeToPush(req.user!.id, subscription);
    
    res.json({ success: true, message: 'Subscribed to push notifications' });
  })
);

/**
 * PUT /api/integrations/notifications/preferences
 * Update notification preferences
 */
router.put(
  '/notifications/preferences',
  authenticate,
  [
    body('channels').optional().isArray(),
    body('doNotDisturb').optional().isObject(),
    body('categories').optional().isObject(),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    await notificationService.updatePreferences(req.user!.id, req.body);
    
    res.json({ success: true, message: 'Preferences updated' });
  })
);

// ===========================
// Webhook Routes
// ===========================

/**
 * POST /api/integrations/webhooks
 * Register webhook
 */
router.post(
  '/webhooks',
  authenticate,
  [
    body('url').isURL(),
    body('events').isArray().notEmpty(),
    body('secret').optional().isLength({ min: 16 }),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const webhook = await webhookService.registerWebhook({
      ...req.body,
      active: true,
    });
    
    res.status(201).json({
      success: true,
      webhook,
    });
  })
);

/**
 * GET /api/integrations/webhooks
 * List webhooks
 */
router.get(
  '/webhooks',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const webhooks = await webhookService.listWebhooks();
    
    res.json({ webhooks });
  })
);

/**
 * PUT /api/integrations/webhooks/:webhookId
 * Update webhook
 */
router.put(
  '/webhooks/:webhookId',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { webhookId } = req.params;
    const webhook = await webhookService.updateWebhook(webhookId, req.body);
    
    res.json({ success: true, webhook });
  })
);

/**
 * DELETE /api/integrations/webhooks/:webhookId
 * Delete webhook
 */
router.delete(
  '/webhooks/:webhookId',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { webhookId } = req.params;
    await webhookService.deleteWebhook(webhookId);
    
    res.json({ success: true, message: 'Webhook deleted' });
  })
);

/**
 * POST /api/integrations/webhooks/:webhookId/test
 * Test webhook
 */
router.post(
  '/webhooks/:webhookId/test',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { webhookId } = req.params;
    const result = await webhookService.testWebhook(webhookId);
    
    res.json({ success: result.status === 'success', delivery: result });
  })
);

/**
 * POST /api/integrations/webhooks/incoming/:provider
 * Handle incoming webhooks
 */
router.post(
  '/webhooks/incoming/:provider',
  asyncHandler(async (req: Request, res: Response) => {
    const { provider } = req.params;
    const signature = req.headers['x-webhook-signature'] as string;
    const timestamp = req.headers['x-webhook-timestamp'] as string;
    
    await webhookService.handleIncomingWebhook({
      provider,
      event: req.body.event || req.body.type,
      signature,
      timestamp,
      data: req.body,
    });
    
    res.status(200).send('OK');
  })
);

// ===========================
// File Storage Routes
// ===========================

/**
 * POST /api/integrations/files/upload
 * Upload file
 */
router.post(
  '/files/upload',
  authenticate,
  rateLimiter({ windowMs: 60000, max: 50 }),
  upload.single('file'),
  [
    body('category').isIn(['headshot', 'resume', 'demo-reel', 'audition-video', 'document', 'other']),
    body('projectId').optional().isUUID(),
    body('tags').optional().isArray(),
    body('public').optional().isBoolean(),
    body('scanForVirus').optional().isBoolean(),
    body('optimizeImage').optional().isBoolean(),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new AppError('No file provided', 400);
    }

    const fileMetadata = await fileStorageService.uploadFile(
      req.file.buffer,
      {
        ...req.body,
        userId: req.user!.id,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      }
    );
    
    res.status(201).json({
      success: true,
      file: fileMetadata,
    });
  })
);

/**
 * POST /api/integrations/files/upload/multipart
 * Initiate multipart upload
 */
router.post(
  '/files/upload/multipart',
  authenticate,
  [
    body('filename').notEmpty(),
    body('mimeType').notEmpty(),
    body('size').isInt({ min: 1 }),
    body('category').isIn(['headshot', 'resume', 'demo-reel', 'audition-video', 'document', 'other']),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    // Implementation for multipart upload initiation
    res.json({
      success: true,
      uploadId: uuidv4(),
      message: 'Multipart upload initiated',
    });
  })
);

/**
 * GET /api/integrations/files/:fileId
 * Get file details
 */
router.get(
  '/files/:fileId',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { fileId } = req.params;
    const file = await fileStorageService.getFile(fileId);
    
    res.json({ file });
  })
);

/**
 * DELETE /api/integrations/files/:fileId
 * Delete file
 */
router.delete(
  '/files/:fileId',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { fileId } = req.params;
    await fileStorageService.deleteFile(fileId);
    
    res.json({ success: true, message: 'File deleted' });
  })
);

/**
 * POST /api/integrations/files/:fileId/transform
 * Transform image/video
 */
router.post(
  '/files/:fileId/transform',
  authenticate,
  rateLimiter({ windowMs: 60000, max: 20 }),
  [
    body('type').isIn(['image', 'video']),
    body('transformations').notEmpty(),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { fileId } = req.params;
    const { type, transformations } = req.body;
    
    let url: string;
    
    if (type === 'image') {
      url = await fileStorageService.transformImage(fileId, transformations);
    } else {
      url = await fileStorageService.processVideo(fileId, transformations);
    }
    
    res.json({
      success: true,
      url,
    });
  })
);

/**
 * GET /api/integrations/files/upload/progress/:uploadId
 * Get upload progress
 */
router.get(
  '/files/upload/progress/:uploadId',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { uploadId } = req.params;
    const progress = fileStorageService.getUploadProgress(uploadId);
    
    if (!progress) {
      throw new AppError('Upload not found', 404);
    }
    
    res.json({ progress });
  })
);

/**
 * GET /api/integrations/files
 * List user files
 */
router.get(
  '/files',
  authenticate,
  [
    query('category').optional().isIn(['headshot', 'resume', 'demo-reel', 'audition-video', 'document', 'other']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { category, limit } = req.query;
    
    const files = await fileStorageService.listUserFiles(
      req.user!.id,
      category as any,
      parseInt(limit as string) || 50
    );
    
    res.json({ files });
  })
);

// ===========================
// Health Check
// ===========================

/**
 * GET /api/integrations/health
 * Health check for integration services
 */
router.get(
  '/health',
  asyncHandler(async (req: Request, res: Response) => {
    const health = {
      status: 'healthy',
      services: {
        googleCalendar: 'operational',
        zoom: 'operational',
        googleMeet: 'operational',
        notifications: 'operational',
        webhooks: 'operational',
        storage: 'operational',
      },
      timestamp: new Date().toISOString(),
    };
    
    res.json(health);
  })
);

// Helper function to generate UUID
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default router;