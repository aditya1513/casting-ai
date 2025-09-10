/**
 * Scheduling Service for CastMatch
 * Handles audition slot creation, booking, conflict resolution, and waitlist management
 */

import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { calendarService } from './calendar.service';
import { emailService } from './email.service';
import moment from 'moment-timezone';
import { RRule } from 'rrule';
import Bull from 'bull';
import { AuditionSlot, AuditionBooking, Talent, Project, Character } from '@prisma/client';

interface CreateSlotData {
  projectId: string;
  characterId?: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  duration: number;
  location: string;
  locationType: 'physical' | 'virtual' | 'hybrid';
  venueAddress?: string;
  roomNumber?: string;
  maxParticipants?: number;
  bufferTime?: number;
  setupTime?: number;
  notes?: string;
  requirements?: string[];
  isRecurring?: boolean;
  recurrenceRule?: string;
  recurrenceEndDate?: Date;
  autoCreateMeetingLink?: boolean;
  createdBy: string;
}

interface BookingData {
  slotId: string;
  talentId: string;
  applicationId?: string;
  priority?: 'high' | 'medium' | 'low';
  talentNotes?: string;
  specialRequests?: string;
  confirmationRequired?: boolean;
}

interface SlotAvailability {
  slotId: string;
  isAvailable: boolean;
  bookedCount: number;
  maxParticipants: number;
  availableSpots: number;
  waitlistCount: number;
  conflicts?: string[];
}

interface RescheduleRequest {
  bookingId: string;
  newSlotId: string;
  reason?: string;
  notifyTalent?: boolean;
}

interface WaitlistEntry {
  bookingId: string;
  talentId: string;
  position: number;
  addedAt: Date;
  isNotified: boolean;
}

export class SchedulingService {
  private readonly timeZone: string;
  private readonly reminderQueue: Bull.Queue;
  private readonly syncQueue: Bull.Queue;

  constructor() {
    this.timeZone = process.env.DEFAULT_TIMEZONE || 'Asia/Kolkata';
    
    // Initialize queues for background processing
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    };

    this.reminderQueue = new Bull('audition-reminders', { redis: redisConfig });
    this.syncQueue = new Bull('calendar-sync', { redis: redisConfig });

    this.setupQueueProcessors();
  }

  /**
   * Create audition slot(s)
   */
  async createAuditionSlot(data: CreateSlotData): Promise<string[]> {
    try {
      const slotIds: string[] = [];

      // Validate project and character
      const project = await prisma.project.findUnique({
        where: { id: data.projectId },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      if (data.characterId) {
        const character = await prisma.character.findUnique({
          where: { id: data.characterId },
        });

        if (!character || character.projectId !== data.projectId) {
          throw new Error('Character not found or does not belong to project');
        }
      }

      // Generate meeting link if needed
      let meetingLink: string | undefined;
      if (data.locationType === 'virtual' || data.locationType === 'hybrid') {
        if (data.autoCreateMeetingLink) {
          meetingLink = await calendarService.createMeetingLink(data.createdBy, {
            summary: `Audition: ${project.title}`,
            startTime: data.startTime,
            endTime: data.endTime,
          });
        }
      }

      if (data.isRecurring && data.recurrenceRule && data.recurrenceEndDate) {
        // Create recurring slots
        const recurringDates = calendarService.generateRecurringSlots(
          {
            startTime: data.startTime,
            endTime: data.endTime,
            duration: data.duration,
          },
          data.recurrenceRule,
          data.recurrenceEndDate
        );

        for (const recurrenceDate of recurringDates) {
          const endTime = moment(recurrenceDate).add(data.duration, 'minutes').toDate();
          
          const slot = await prisma.auditionSlot.create({
            data: {
              projectId: data.projectId,
              characterId: data.characterId,
              date: moment(recurrenceDate).startOf('day').toDate(),
              startTime: recurrenceDate,
              endTime,
              duration: data.duration,
              timeZone: this.timeZone,
              location: data.location,
              locationType: data.locationType,
              venueAddress: data.venueAddress,
              roomNumber: data.roomNumber,
              meetingLink,
              maxParticipants: data.maxParticipants || 1,
              isRecurring: true,
              recurrenceRule: data.recurrenceRule,
              recurrenceId: slotIds.length === 0 ? undefined : slotIds[0], // First slot is the parent
              bufferTime: data.bufferTime || 15,
              setupTime: data.setupTime || 0,
              notes: data.notes,
              requirements: data.requirements || [],
              createdBy: data.createdBy,
            },
          });

          slotIds.push(slot.id);

          // Set recurrenceId for the first slot if it's the parent
          if (slotIds.length === 1) {
            await prisma.auditionSlot.update({
              where: { id: slot.id },
              data: { recurrenceId: slot.id },
            });
          }
        }
      } else {
        // Create single slot
        const slot = await prisma.auditionSlot.create({
          data: {
            projectId: data.projectId,
            characterId: data.characterId,
            date: moment(data.startTime).startOf('day').toDate(),
            startTime: data.startTime,
            endTime: data.endTime,
            duration: data.duration,
            timeZone: this.timeZone,
            location: data.location,
            locationType: data.locationType,
            venueAddress: data.venueAddress,
            roomNumber: data.roomNumber,
            meetingLink,
            maxParticipants: data.maxParticipants || 1,
            isRecurring: false,
            bufferTime: data.bufferTime || 15,
            setupTime: data.setupTime || 0,
            notes: data.notes,
            requirements: data.requirements || [],
            createdBy: data.createdBy,
          },
        });

        slotIds.push(slot.id);
      }

      // Schedule calendar sync
      for (const slotId of slotIds) {
        await this.syncQueue.add('sync-slot', {
          userId: data.createdBy,
          slotId,
        });
      }

      logger.info('Audition slots created', {
        projectId: data.projectId,
        characterId: data.characterId,
        slotCount: slotIds.length,
        createdBy: data.createdBy,
      });

      return slotIds;
    } catch (error) {
      logger.error('Error creating audition slot', { error, data });
      throw error;
    }
  }

  /**
   * Book audition slot
   */
  async bookAuditionSlot(data: BookingData): Promise<string> {
    try {
      // Check slot availability
      const availability = await this.checkSlotAvailability(data.slotId);
      
      if (!availability.isAvailable && availability.availableSpots <= 0) {
        // Add to waitlist if requested
        return await this.addToWaitlist(data);
      }

      // Verify talent exists
      const talent = await prisma.talent.findUnique({
        where: { id: data.talentId },
        include: { user: true },
      });

      if (!talent) {
        throw new Error('Talent not found');
      }

      // Get slot details
      const slot = await prisma.auditionSlot.findUnique({
        where: { id: data.slotId },
        include: {
          project: true,
          character: true,
        },
      });

      if (!slot) {
        throw new Error('Audition slot not found');
      }

      // Check for scheduling conflicts
      const hasConflicts = await this.checkTalentConflicts(
        data.talentId,
        slot.startTime,
        slot.endTime
      );

      if (hasConflicts.length > 0) {
        logger.warn('Talent has scheduling conflicts', {
          talentId: data.talentId,
          slotId: data.slotId,
          conflicts: hasConflicts,
        });
        // Continue with booking but log the warning
      }

      // Generate confirmation code
      const confirmationCode = this.generateConfirmationCode();

      // Create booking
      const booking = await prisma.auditionBooking.create({
        data: {
          slotId: data.slotId,
          talentId: data.talentId,
          applicationId: data.applicationId,
          status: data.confirmationRequired === false ? 'confirmed' : 'tentative',
          priority: data.priority,
          confirmationCode,
          talentNotes: data.talentNotes,
          specialRequests: data.specialRequests,
          confirmationSent: false,
          checkedIn: false,
        },
      });

      // Update slot booked count
      await prisma.auditionSlot.update({
        where: { id: data.slotId },
        data: {
          bookedCount: {
            increment: 1,
          },
          isAvailable: availability.availableSpots <= 1 ? false : true,
        },
      });

      // Schedule confirmation email
      await this.scheduleConfirmationEmail(booking.id);

      // Schedule reminders
      await this.scheduleReminders(booking.id);

      // Sync with calendar if talent has integration
      await this.syncQueue.add('sync-booking', {
        bookingId: booking.id,
      });

      logger.info('Audition slot booked', {
        bookingId: booking.id,
        slotId: data.slotId,
        talentId: data.talentId,
        confirmationCode,
      });

      return booking.id;
    } catch (error) {
      logger.error('Error booking audition slot', { error, data });
      throw error;
    }
  }

  /**
   * Check slot availability
   */
  async checkSlotAvailability(slotId: string): Promise<SlotAvailability> {
    try {
      const slot = await prisma.auditionSlot.findUnique({
        where: { id: slotId },
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

      if (!slot) {
        throw new Error('Slot not found');
      }

      const bookedCount = slot.bookings.length;
      const availableSpots = slot.maxParticipants - bookedCount;
      const isAvailable = slot.isActive && availableSpots > 0;

      // Check for waitlisted bookings
      const waitlistCount = await prisma.auditionBooking.count({
        where: {
          slotId,
          isWaitlisted: true,
          status: {
            notIn: ['cancelled'],
          },
        },
      });

      // Check for calendar conflicts
      let conflicts: string[] = [];
      if (slot.googleEventId) {
        // This would need the creator's userId to check conflicts
        // For now, we'll assume no conflicts from calendar
      }

      return {
        slotId,
        isAvailable,
        bookedCount,
        maxParticipants: slot.maxParticipants,
        availableSpots,
        waitlistCount,
        conflicts,
      };
    } catch (error) {
      logger.error('Error checking slot availability', { error, slotId });
      throw error;
    }
  }

  /**
   * Add to waitlist
   */
  private async addToWaitlist(data: BookingData): Promise<string> {
    try {
      // Get current waitlist position
      const waitlistCount = await prisma.auditionBooking.count({
        where: {
          slotId: data.slotId,
          isWaitlisted: true,
          status: {
            notIn: ['cancelled'],
          },
        },
      });

      const confirmationCode = this.generateConfirmationCode();

      const booking = await prisma.auditionBooking.create({
        data: {
          slotId: data.slotId,
          talentId: data.talentId,
          applicationId: data.applicationId,
          status: 'tentative',
          priority: data.priority,
          confirmationCode,
          talentNotes: data.talentNotes,
          specialRequests: data.specialRequests,
          isWaitlisted: true,
          waitlistPosition: waitlistCount + 1,
          waitlistNotified: false,
        },
      });

      // Send waitlist notification
      await this.sendWaitlistNotification(booking.id);

      logger.info('Added to waitlist', {
        bookingId: booking.id,
        slotId: data.slotId,
        talentId: data.talentId,
        position: waitlistCount + 1,
      });

      return booking.id;
    } catch (error) {
      logger.error('Error adding to waitlist', { error, data });
      throw error;
    }
  }

  /**
   * Reschedule booking
   */
  async rescheduleBooking(request: RescheduleRequest): Promise<void> {
    try {
      const booking = await prisma.auditionBooking.findUnique({
        where: { id: request.bookingId },
        include: {
          slot: true,
          talent: { include: { user: true } },
        },
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      // Check new slot availability
      const newSlotAvailability = await this.checkSlotAvailability(request.newSlotId);
      if (!newSlotAvailability.isAvailable) {
        throw new Error('New slot is not available');
      }

      const oldSlotId = booking.slotId;

      // Update booking
      await prisma.auditionBooking.update({
        where: { id: request.bookingId },
        data: {
          slotId: request.newSlotId,
          rescheduledFrom: oldSlotId,
          rescheduledAt: new Date(),
          rescheduleCount: { increment: 1 },
          rescheduleReason: request.reason,
          status: 'confirmed', // Re-confirm after reschedule
        },
      });

      // Update old slot count
      await prisma.auditionSlot.update({
        where: { id: oldSlotId },
        data: {
          bookedCount: { decrement: 1 },
          isAvailable: true,
        },
      });

      // Update new slot count
      await prisma.auditionSlot.update({
        where: { id: request.newSlotId },
        data: {
          bookedCount: { increment: 1 },
          isAvailable: newSlotAvailability.availableSpots <= 1 ? false : true,
        },
      });

      // Process waitlist for old slot
      await this.processWaitlist(oldSlotId);

      // Send reschedule notification
      if (request.notifyTalent !== false) {
        await this.sendRescheduleNotification(request.bookingId);
      }

      // Update calendar events
      await this.syncQueue.add('update-booking-calendar', {
        bookingId: request.bookingId,
      });

      logger.info('Booking rescheduled', {
        bookingId: request.bookingId,
        oldSlotId,
        newSlotId: request.newSlotId,
        reason: request.reason,
      });
    } catch (error) {
      logger.error('Error rescheduling booking', { error, request });
      throw error;
    }
  }

  /**
   * Cancel booking
   */
  async cancelBooking(bookingId: string, reason?: string, notifyTalent = true): Promise<void> {
    try {
      const booking = await prisma.auditionBooking.findUnique({
        where: { id: bookingId },
        include: {
          slot: true,
          talent: { include: { user: true } },
        },
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      // Update booking status
      await prisma.auditionBooking.update({
        where: { id: bookingId },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancellationReason: reason,
        },
      });

      // If not waitlisted, update slot availability
      if (!booking.isWaitlisted) {
        await prisma.auditionSlot.update({
          where: { id: booking.slotId },
          data: {
            bookedCount: { decrement: 1 },
            isAvailable: true,
          },
        });

        // Process waitlist
        await this.processWaitlist(booking.slotId);
      } else {
        // Update waitlist positions
        await this.updateWaitlistPositions(booking.slotId);
      }

      // Send cancellation notification
      if (notifyTalent) {
        await this.sendCancellationNotification(bookingId);
      }

      // Remove from calendar
      await this.syncQueue.add('remove-booking-calendar', {
        bookingId,
      });

      logger.info('Booking cancelled', {
        bookingId,
        slotId: booking.slotId,
        talentId: booking.talentId,
        reason,
      });
    } catch (error) {
      logger.error('Error cancelling booking', { error, bookingId, reason });
      throw error;
    }
  }

  /**
   * Process waitlist when slot becomes available
   */
  private async processWaitlist(slotId: string): Promise<void> {
    try {
      const availability = await this.checkSlotAvailability(slotId);
      if (availability.availableSpots <= 0) {
        return;
      }

      // Get next person on waitlist
      const nextWaitlistBooking = await prisma.auditionBooking.findFirst({
        where: {
          slotId,
          isWaitlisted: true,
          status: 'tentative',
        },
        orderBy: { waitlistPosition: 'asc' },
        include: {
          talent: { include: { user: true } },
        },
      });

      if (!nextWaitlistBooking) {
        return;
      }

      // Move from waitlist to confirmed
      await prisma.auditionBooking.update({
        where: { id: nextWaitlistBooking.id },
        data: {
          status: 'confirmed',
          isWaitlisted: false,
          waitlistPosition: null,
          waitlistNotified: true,
          confirmedAt: new Date(),
        },
      });

      // Update slot
      await prisma.auditionSlot.update({
        where: { id: slotId },
        data: {
          bookedCount: { increment: 1 },
          isAvailable: availability.availableSpots <= 1 ? false : true,
        },
      });

      // Update remaining waitlist positions
      await this.updateWaitlistPositions(slotId);

      // Send confirmation notification
      await this.sendWaitlistConfirmationNotification(nextWaitlistBooking.id);

      logger.info('Waitlist processed', {
        bookingId: nextWaitlistBooking.id,
        slotId,
        talentId: nextWaitlistBooking.talentId,
      });
    } catch (error) {
      logger.error('Error processing waitlist', { error, slotId });
    }
  }

  /**
   * Update waitlist positions after cancellation
   */
  private async updateWaitlistPositions(slotId: string): Promise<void> {
    try {
      const waitlistBookings = await prisma.auditionBooking.findMany({
        where: {
          slotId,
          isWaitlisted: true,
          status: {
            notIn: ['cancelled'],
          },
        },
        orderBy: { waitlistPosition: 'asc' },
      });

      for (let i = 0; i < waitlistBookings.length; i++) {
        await prisma.auditionBooking.update({
          where: { id: waitlistBookings[i].id },
          data: { waitlistPosition: i + 1 },
        });
      }
    } catch (error) {
      logger.error('Error updating waitlist positions', { error, slotId });
    }
  }

  /**
   * Check talent scheduling conflicts
   */
  private async checkTalentConflicts(
    talentId: string,
    startTime: Date,
    endTime: Date
  ): Promise<string[]> {
    try {
      const conflicts: string[] = [];

      // Check existing bookings
      const existingBookings = await prisma.auditionBooking.findMany({
        where: {
          talentId,
          status: {
            in: ['confirmed', 'tentative'],
          },
          slot: {
            OR: [
              {
                startTime: {
                  lt: endTime,
                },
                endTime: {
                  gt: startTime,
                },
              },
            ],
          },
        },
        include: {
          slot: {
            include: {
              project: true,
            },
          },
        },
      });

      for (const booking of existingBookings) {
        conflicts.push(`${booking.slot.project.title} - ${moment(booking.slot.startTime).format('MMMM Do, h:mm A')}`);
      }

      // Check calendar conflicts if talent has integration
      const talent = await prisma.talent.findUnique({
        where: { id: talentId },
        include: {
          user: {
            include: {
              calendarIntegrations: {
                where: { isActive: true },
              },
            },
          },
        },
      });

      if (talent?.user.calendarIntegrations.length > 0) {
        const availability = await calendarService.checkAvailability(
          talent.userId,
          startTime,
          endTime,
          { bufferMinutes: 15 }
        );

        if (availability.conflictsWith) {
          conflicts.push(...availability.conflictsWith);
        }
      }

      return conflicts;
    } catch (error) {
      logger.error('Error checking talent conflicts', { error, talentId, startTime, endTime });
      return [];
    }
  }

  /**
   * Generate unique confirmation code
   */
  private generateConfirmationCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Setup queue processors
   */
  private setupQueueProcessors(): void {
    // Process reminder emails
    this.reminderQueue.process('send-reminder', async (job) => {
      const { bookingId, reminderType } = job.data;
      await this.sendReminderEmail(bookingId, reminderType);
    });

    // Process calendar sync
    this.syncQueue.process('sync-slot', async (job) => {
      const { userId, slotId } = job.data;
      await calendarService.syncAuditionSlot(userId, slotId);
    });

    this.syncQueue.process('sync-booking', async (job) => {
      const { bookingId } = job.data;
      // Implementation for syncing booking with talent's calendar
    });
  }

  /**
   * Schedule confirmation email
   */
  private async scheduleConfirmationEmail(bookingId: string): Promise<void> {
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

      if (!booking) return;

      await emailService.sendAuditionConfirmationEmail({
        to: booking.talent.user.email,
        talentName: `${booking.talent.firstName} ${booking.talent.lastName}`,
        projectTitle: booking.slot.project.title,
        characterName: booking.slot.character?.name,
        auditionDate: booking.slot.startTime,
        location: booking.slot.location,
        confirmationCode: booking.confirmationCode,
        meetingLink: booking.slot.meetingLink,
        specialInstructions: booking.slot.notes,
      });

      await prisma.auditionBooking.update({
        where: { id: bookingId },
        data: { confirmationSent: true },
      });
    } catch (error) {
      logger.error('Error sending confirmation email', { error, bookingId });
    }
  }

  /**
   * Schedule reminder emails
   */
  private async scheduleReminders(bookingId: string): Promise<void> {
    try {
      const booking = await prisma.auditionBooking.findUnique({
        where: { id: bookingId },
        include: { slot: true },
      });

      if (!booking) return;

      const auditionTime = moment.tz(booking.slot.startTime, this.timeZone);

      // Schedule 24-hour reminder
      const reminder24h = auditionTime.clone().subtract(24, 'hours');
      if (reminder24h.isAfter(moment())) {
        await this.reminderQueue.add(
          'send-reminder',
          { bookingId, reminderType: '24h' },
          { delay: reminder24h.diff(moment()) }
        );
      }

      // Schedule 2-hour reminder
      const reminder2h = auditionTime.clone().subtract(2, 'hours');
      if (reminder2h.isAfter(moment())) {
        await this.reminderQueue.add(
          'send-reminder',
          { bookingId, reminderType: '2h' },
          { delay: reminder2h.diff(moment()) }
        );
      }
    } catch (error) {
      logger.error('Error scheduling reminders', { error, bookingId });
    }
  }

  /**
   * Send reminder email
   */
  private async sendReminderEmail(bookingId: string, reminderType: string): Promise<void> {
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

      if (!booking || booking.status === 'cancelled') return;

      await emailService.sendAuditionReminderEmail({
        to: booking.talent.user.email,
        talentName: `${booking.talent.firstName} ${booking.talent.lastName}`,
        projectTitle: booking.slot.project.title,
        characterName: booking.slot.character?.name,
        auditionDate: booking.slot.startTime,
        location: booking.slot.location,
        confirmationCode: booking.confirmationCode,
        meetingLink: booking.slot.meetingLink,
        reminderType,
      });

      // Update reminder tracking
      const reminders = booking.remindersSent as any || {};
      reminders[reminderType] = new Date();

      await prisma.auditionBooking.update({
        where: { id: bookingId },
        data: {
          remindersSent: reminders,
          lastReminderAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Error sending reminder email', { error, bookingId, reminderType });
    }
  }

  /**
   * Send various notification emails
   */
  private async sendWaitlistNotification(bookingId: string): Promise<void> {
    // Implementation for waitlist notification
  }

  private async sendRescheduleNotification(bookingId: string): Promise<void> {
    // Implementation for reschedule notification
  }

  private async sendCancellationNotification(bookingId: string): Promise<void> {
    // Implementation for cancellation notification
  }

  private async sendWaitlistConfirmationNotification(bookingId: string): Promise<void> {
    // Implementation for waitlist confirmation notification
  }

  /**
   * Get upcoming auditions for talent
   */
  async getUpcomingAuditions(talentId: string, limit = 10): Promise<any[]> {
    try {
      return await prisma.auditionBooking.findMany({
        where: {
          talentId,
          status: {
            in: ['confirmed', 'tentative'],
          },
          slot: {
            startTime: {
              gte: new Date(),
            },
          },
        },
        include: {
          slot: {
            include: {
              project: true,
              character: true,
            },
          },
        },
        orderBy: {
          slot: {
            startTime: 'asc',
          },
        },
        take: limit,
      });
    } catch (error) {
      logger.error('Error getting upcoming auditions', { error, talentId });
      return [];
    }
  }

  /**
   * Get auditions for casting director
   */
  async getAuditionsForCastingDirector(userId: string, date?: Date): Promise<any[]> {
    try {
      const whereClause: any = {
        project: {
          OR: [
            { castingDirectorId: userId },
            { producerId: userId },
          ],
        },
      };

      if (date) {
        const startOfDay = moment(date).startOf('day').toDate();
        const endOfDay = moment(date).endOf('day').toDate();
        whereClause.startTime = {
          gte: startOfDay,
          lte: endOfDay,
        };
      }

      return await prisma.auditionSlot.findMany({
        where: whereClause,
        include: {
          project: true,
          character: true,
          bookings: {
            where: {
              status: {
                in: ['confirmed', 'tentative'],
              },
            },
            include: {
              talent: true,
            },
          },
        },
        orderBy: {
          startTime: 'asc',
        },
      });
    } catch (error) {
      logger.error('Error getting auditions for casting director', { error, userId });
      return [];
    }
  }
}

// Use lazy initialization to avoid circular dependency issues
let _schedulingService: SchedulingService;

export const getSchedulingService = (): SchedulingService => {
  if (!_schedulingService) {
    _schedulingService = new SchedulingService();
  }
  return _schedulingService;
};

// For backward compatibility
export const schedulingService = getSchedulingService();