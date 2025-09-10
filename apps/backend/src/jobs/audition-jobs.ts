/**
 * Background Jobs for Audition System
 * Handles reminders, calendar sync, and cleanup tasks
 */

import Bull, { Job, Queue } from 'bull';
import { prisma } from '../config/database';
import { emailService } from '../services/email.service';
import { calendarService } from '../services/calendar.service';
import { logger } from '../utils/logger';
import moment from 'moment-timezone';
import cron from 'node-cron';

// Queue configurations
const redisConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
};

// Initialize job queues
export const auditionReminderQueue = new Bull('audition-reminders', redisConfig);
export const calendarSyncQueue = new Bull('calendar-sync', redisConfig);
export const cleanupQueue = new Bull('audition-cleanup', redisConfig);
export const notificationQueue = new Bull('audition-notifications', redisConfig);

/**
 * =============================
 * REMINDER JOBS
 * =============================
 */

// Process reminder jobs
auditionReminderQueue.process('send-reminder', async (job: Job) => {
  const { bookingId, reminderType } = job.data;
  
  try {
    logger.info('Processing reminder job', { bookingId, reminderType });

    const booking = await prisma.auditionBooking.findUnique({
      where: { id: bookingId },
      include: {
        talent: { include: { user: true } },
        slot: {
          include: {
            project: true,
            character: true,
          },
        },
      },
    });

    if (!booking) {
      logger.warn('Booking not found for reminder', { bookingId });
      return { success: false, error: 'Booking not found' };
    }

    if (booking.status === 'cancelled') {
      logger.info('Skipping reminder for cancelled booking', { bookingId });
      return { success: true, skipped: 'cancelled' };
    }

    // Check if reminder already sent for this type
    const remindersSent = booking.remindersSent as any || {};
    if (remindersSent[reminderType]) {
      logger.info('Reminder already sent', { bookingId, reminderType });
      return { success: true, skipped: 'already_sent' };
    }

    // Send reminder email
    await emailService.sendAuditionReminderEmail({
      to: booking.talent.user.email,
      talentName: `${booking.talent.firstName} ${booking.talent.lastName}`,
      projectTitle: booking.slot.project.title,
      characterName: booking.slot.character?.name,
      auditionDate: booking.slot.startTime,
      location: booking.slot.location,
      confirmationCode: booking.confirmationCode,
      meetingLink: booking.slot.meetingLink || undefined,
      reminderType,
    });

    // Update reminder tracking
    const updatedReminders = { ...remindersSent, [reminderType]: new Date() };
    await prisma.auditionBooking.update({
      where: { id: bookingId },
      data: {
        remindersSent: updatedReminders,
        lastReminderAt: new Date(),
      },
    });

    logger.info('Reminder sent successfully', { bookingId, reminderType });
    return { success: true, reminderType };
    
  } catch (error) {
    logger.error('Failed to send reminder', { error, bookingId, reminderType });
    throw error;
  }
});

// Schedule reminders for a booking
export async function scheduleAuditionReminders(bookingId: string, auditionDate: Date) {
  try {
    const auditionMoment = moment.tz(auditionDate, 'Asia/Kolkata');
    const now = moment.tz('Asia/Kolkata');

    // Schedule 24-hour reminder
    const reminder24h = auditionMoment.clone().subtract(24, 'hours');
    if (reminder24h.isAfter(now)) {
      await auditionReminderQueue.add(
        'send-reminder',
        { bookingId, reminderType: '24h' },
        {
          delay: reminder24h.diff(now),
          attempts: 3,
          backoff: { type: 'exponential', delay: 30000 },
          removeOnComplete: true,
          removeOnFail: false,
        }
      );
      logger.info('Scheduled 24h reminder', { bookingId, scheduledFor: reminder24h.format() });
    }

    // Schedule 2-hour reminder
    const reminder2h = auditionMoment.clone().subtract(2, 'hours');
    if (reminder2h.isAfter(now)) {
      await auditionReminderQueue.add(
        'send-reminder',
        { bookingId, reminderType: '2h' },
        {
          delay: reminder2h.diff(now),
          attempts: 3,
          backoff: { type: 'exponential', delay: 30000 },
          removeOnComplete: true,
          removeOnFail: false,
        }
      );
      logger.info('Scheduled 2h reminder', { bookingId, scheduledFor: reminder2h.format() });
    }

    // Schedule 30-minute reminder
    const reminder30m = auditionMoment.clone().subtract(30, 'minutes');
    if (reminder30m.isAfter(now)) {
      await auditionReminderQueue.add(
        'send-reminder',
        { bookingId, reminderType: '30m' },
        {
          delay: reminder30m.diff(now),
          attempts: 2,
          backoff: { type: 'exponential', delay: 15000 },
          removeOnComplete: true,
          removeOnFail: false,
        }
      );
      logger.info('Scheduled 30m reminder', { bookingId, scheduledFor: reminder30m.format() });
    }

  } catch (error) {
    logger.error('Failed to schedule reminders', { error, bookingId });
    throw error;
  }
}

/**
 * =============================
 * CALENDAR SYNC JOBS
 * =============================
 */

// Process calendar sync jobs
calendarSyncQueue.process('sync-audition-slot', async (job: Job) => {
  const { userId, slotId, operation = 'create' } = job.data;
  
  try {
    logger.info('Processing calendar sync job', { userId, slotId, operation });

    const slot = await prisma.auditionSlot.findUnique({
      where: { id: slotId },
      include: {
        project: true,
        character: true,
      },
    });

    if (!slot) {
      logger.warn('Slot not found for calendar sync', { slotId });
      return { success: false, error: 'Slot not found' };
    }

    // Check if user has calendar integration
    const integration = await prisma.calendarIntegration.findFirst({
      where: { userId, isActive: true },
    });

    if (!integration) {
      logger.info('No calendar integration found, skipping sync', { userId });
      return { success: true, skipped: 'no_integration' };
    }

    let eventId: string | null = null;

    switch (operation) {
      case 'create':
        eventId = await calendarService.createEvent(userId, {
          summary: `Audition: ${slot.project.title}${slot.character ? ` - ${slot.character.name}` : ''}`,
          description: `CastMatch Audition\n\nProject: ${slot.project.title}\n${slot.character ? `Character: ${slot.character.name}\n` : ''}Location: ${slot.location}\n\n${slot.notes || ''}`,
          startTime: slot.startTime,
          endTime: slot.endTime,
          location: slot.location,
          meetingLink: slot.meetingLink || undefined,
        });
        
        if (eventId) {
          await prisma.auditionSlot.update({
            where: { id: slotId },
            data: { googleEventId: eventId },
          });
        }
        break;

      case 'update':
        if (slot.googleEventId) {
          await calendarService.updateEvent(userId, slot.googleEventId, {
            summary: `Audition: ${slot.project.title}${slot.character ? ` - ${slot.character.name}` : ''}`,
            description: `CastMatch Audition\n\nProject: ${slot.project.title}\n${slot.character ? `Character: ${slot.character.name}\n` : ''}Location: ${slot.location}\n\n${slot.notes || ''}`,
            startTime: slot.startTime,
            endTime: slot.endTime,
            location: slot.location,
            meetingLink: slot.meetingLink || undefined,
          });
        }
        break;

      case 'delete':
        if (slot.googleEventId) {
          await calendarService.deleteEvent(userId, slot.googleEventId);
          await prisma.auditionSlot.update({
            where: { id: slotId },
            data: { googleEventId: null },
          });
        }
        break;
    }

    logger.info('Calendar sync completed', { userId, slotId, operation, eventId });
    return { success: true, operation, eventId };
    
  } catch (error) {
    logger.error('Calendar sync failed', { error, userId, slotId, operation });
    throw error;
  }
});

// Process talent calendar sync
calendarSyncQueue.process('sync-talent-booking', async (job: Job) => {
  const { bookingId, operation = 'create' } = job.data;
  
  try {
    const booking = await prisma.auditionBooking.findUnique({
      where: { id: bookingId },
      include: {
        talent: { include: { user: true } },
        slot: {
          include: {
            project: true,
            character: true,
          },
        },
      },
    });

    if (!booking) {
      return { success: false, error: 'Booking not found' };
    }

    const userId = booking.talent.userId;
    
    // Check calendar integration
    const integration = await prisma.calendarIntegration.findFirst({
      where: { userId, isActive: true },
    });

    if (!integration) {
      return { success: true, skipped: 'no_integration' };
    }

    let eventId: string | null = null;

    switch (operation) {
      case 'create':
        eventId = await calendarService.createEvent(userId, {
          summary: `Audition: ${booking.slot.project.title}`,
          description: `CastMatch Audition\n\nProject: ${booking.slot.project.title}\n${booking.slot.character ? `Character: ${booking.slot.character.name}\n` : ''}Confirmation Code: ${booking.confirmationCode}\n\nLocation: ${booking.slot.location}`,
          startTime: booking.slot.startTime,
          endTime: booking.slot.endTime,
          location: booking.slot.location,
          meetingLink: booking.slot.meetingLink || undefined,
        });
        
        if (eventId) {
          await prisma.auditionBooking.update({
            where: { id: bookingId },
            data: { googleEventId: eventId, calendarSynced: true },
          });
        }
        break;

      case 'update':
        if (booking.googleEventId) {
          await calendarService.updateEvent(userId, booking.googleEventId, {
            summary: `Audition: ${booking.slot.project.title}`,
            startTime: booking.slot.startTime,
            endTime: booking.slot.endTime,
            location: booking.slot.location,
          });
        }
        break;

      case 'delete':
        if (booking.googleEventId) {
          await calendarService.deleteEvent(userId, booking.googleEventId);
          await prisma.auditionBooking.update({
            where: { id: bookingId },
            data: { googleEventId: null, calendarSynced: false },
          });
        }
        break;
    }

    return { success: true, operation, eventId };
    
  } catch (error) {
    logger.error('Talent calendar sync failed', { error, bookingId, operation });
    throw error;
  }
});

/**
 * =============================
 * CLEANUP JOBS
 * =============================
 */

// Process cleanup jobs
cleanupQueue.process('cleanup-expired-slots', async (job: Job) => {
  try {
    logger.info('Processing expired slots cleanup');

    const expiredSlots = await prisma.auditionSlot.findMany({
      where: {
        endTime: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // More than 24 hours ago
        },
        isActive: true,
      },
      include: {
        bookings: {
          where: {
            status: {
              in: ['confirmed', 'tentative'],
            },
          },
        },
      },
    });

    let cleanedCount = 0;

    for (const slot of expiredSlots) {
      // If no active bookings, mark slot as inactive
      if (slot.bookings.length === 0) {
        await prisma.auditionSlot.update({
          where: { id: slot.id },
          data: { isActive: false },
        });
        cleanedCount++;
      }
    }

    logger.info('Expired slots cleanup completed', { cleanedCount });
    return { success: true, cleanedCount };
    
  } catch (error) {
    logger.error('Cleanup job failed', { error });
    throw error;
  }
});

cleanupQueue.process('cleanup-old-bookings', async (job: Job) => {
  try {
    logger.info('Processing old bookings cleanup');

    // Clean up cancelled bookings older than 30 days
    const result = await prisma.auditionBooking.updateMany({
      where: {
        status: 'cancelled',
        cancelledAt: {
          lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      data: {
        // Archive old data but keep for analytics
        talentNotes: null,
        specialRequests: null,
        internalNotes: null,
      },
    });

    logger.info('Old bookings cleanup completed', { cleanedCount: result.count });
    return { success: true, cleanedCount: result.count };
    
  } catch (error) {
    logger.error('Booking cleanup job failed', { error });
    throw error;
  }
});

/**
 * =============================
 * NOTIFICATION JOBS
 * =============================
 */

// Process notification jobs
notificationQueue.process('send-waitlist-notification', async (job: Job) => {
  const { bookingId } = job.data;
  
  try {
    const booking = await prisma.auditionBooking.findUnique({
      where: { id: bookingId },
      include: {
        talent: { include: { user: true } },
        slot: {
          include: {
            project: true,
            character: true,
          },
        },
      },
    });

    if (!booking || !booking.isWaitlisted) {
      return { success: false, error: 'Invalid waitlist booking' };
    }

    await emailService.sendWaitlistNotificationEmail({
      to: booking.talent.user.email,
      talentName: `${booking.talent.firstName} ${booking.talent.lastName}`,
      projectTitle: booking.slot.project.title,
      characterName: booking.slot.character?.name,
      auditionDate: booking.slot.startTime,
      position: booking.waitlistPosition || 1,
    });

    await prisma.auditionBooking.update({
      where: { id: bookingId },
      data: { waitlistNotified: true },
    });

    return { success: true };
    
  } catch (error) {
    logger.error('Waitlist notification job failed', { error, bookingId });
    throw error;
  }
});

notificationQueue.process('send-confirmation-available', async (job: Job) => {
  const { bookingId } = job.data;
  
  try {
    const booking = await prisma.auditionBooking.findUnique({
      where: { id: bookingId },
      include: {
        talent: { include: { user: true } },
        slot: {
          include: {
            project: true,
            character: true,
          },
        },
      },
    });

    if (!booking) {
      return { success: false, error: 'Booking not found' };
    }

    // This is when someone moves from waitlist to confirmed
    await emailService.sendWaitlistConfirmationEmail({
      to: booking.talent.user.email,
      talentName: `${booking.talent.firstName} ${booking.talent.lastName}`,
      projectTitle: booking.slot.project.title,
      characterName: booking.slot.character?.name,
      auditionDate: booking.slot.startTime,
      location: booking.slot.location,
      confirmationCode: booking.confirmationCode,
      meetingLink: booking.slot.meetingLink || undefined,
    });

    return { success: true };
    
  } catch (error) {
    logger.error('Confirmation available notification failed', { error, bookingId });
    throw error;
  }
});

/**
 * =============================
 * CRON JOBS
 * =============================
 */

// Schedule cleanup jobs
export function initializeCronJobs() {
  // Clean up expired slots every day at 2 AM
  cron.schedule('0 2 * * *', async () => {
    logger.info('Starting daily cleanup cron job');
    await cleanupQueue.add('cleanup-expired-slots', {}, {
      attempts: 2,
      removeOnComplete: true,
    });
  }, {
    timezone: 'Asia/Kolkata'
  });

  // Clean up old bookings every week
  cron.schedule('0 3 * * 0', async () => {
    logger.info('Starting weekly booking cleanup cron job');
    await cleanupQueue.add('cleanup-old-bookings', {}, {
      attempts: 2,
      removeOnComplete: true,
    });
  }, {
    timezone: 'Asia/Kolkata'
  });

  // Validate calendar integrations every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    logger.info('Starting calendar integration validation');
    
    const integrations = await prisma.calendarIntegration.findMany({
      where: { isActive: true },
      select: { userId: true },
    });

    for (const integration of integrations) {
      try {
        const isValid = await calendarService.validateIntegration(integration.userId);
        if (!isValid) {
          logger.warn('Calendar integration validation failed', { userId: integration.userId });
        }
      } catch (error) {
        logger.error('Calendar validation error', { error, userId: integration.userId });
      }
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  logger.info('Cron jobs initialized');
}

/**
 * =============================
 * QUEUE EVENT HANDLERS
 * =============================
 */

// Handle job failures
[auditionReminderQueue, calendarSyncQueue, cleanupQueue, notificationQueue].forEach(queue => {
  queue.on('failed', (job, err) => {
    logger.error(`Job failed in ${queue.name}`, {
      jobId: job.id,
      jobData: job.data,
      error: err.message,
      attempts: job.attemptsMade,
    });
  });

  queue.on('completed', (job) => {
    logger.info(`Job completed in ${queue.name}`, {
      jobId: job.id,
      jobData: job.data,
      result: job.returnvalue,
    });
  });

  queue.on('stalled', (job) => {
    logger.warn(`Job stalled in ${queue.name}`, {
      jobId: job.id,
      jobData: job.data,
    });
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down job queues gracefully');
  
  await Promise.all([
    auditionReminderQueue.close(),
    calendarSyncQueue.close(),
    cleanupQueue.close(),
    notificationQueue.close(),
  ]);
  
  logger.info('All job queues closed');
});

// Export utility functions with aliases to avoid duplicate exports
export {
  auditionReminderQueue as reminderQueue,
  calendarSyncQueue as syncQueue,
};