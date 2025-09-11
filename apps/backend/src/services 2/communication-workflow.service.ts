/**
 * Communication Workflow Service
 * Handles automated email sequences, onboarding flows, and communication workflows
 */

import Bull, { Queue, Job } from 'bull';
import { logger } from '../utils/logger';
import { emailService } from './email.service';
import { notificationService, NotificationType, NotificationChannel } from './notification.service';
import { prisma } from '../config/database';
import { CacheManager, CacheKeys } from '../config/redis';

// Workflow Types
export enum WorkflowType {
  WELCOME_SEQUENCE = 'welcome_sequence',
  PROFILE_COMPLETION = 'profile_completion',
  PASSWORD_RESET = 'password_reset',
  EMAIL_VERIFICATION = 'email_verification',
  OAUTH_INTEGRATION = 'oauth_integration',
  ONBOARDING_SEQUENCE = 'onboarding_sequence',
  SECURITY_ALERT = 'security_alert',
  DIGEST_EMAIL = 'digest_email',
}

export enum WorkflowStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum UserRole {
  ACTOR = 'ACTOR',
  CASTING_DIRECTOR = 'CASTING_DIRECTOR',
  PRODUCER = 'PRODUCER',
  ADMIN = 'ADMIN',
}

interface WorkflowPayload {
  userId: string;
  workflowType: WorkflowType;
  data: Record<string, any>;
  priority?: 'normal' | 'high' | 'urgent';
  scheduledFor?: Date;
  metadata?: Record<string, any>;
}

interface WorkflowStep {
  stepId: string;
  type: 'email' | 'notification' | 'delay' | 'condition';
  delay?: number; // milliseconds
  condition?: (data: any) => boolean;
  emailTemplate?: string;
  notificationType?: NotificationType;
  data?: Record<string, any>;
}

export class CommunicationWorkflowService {
  private workflowQueue: Queue<WorkflowPayload>;
  private sequenceQueue: Queue<any>;

  constructor() {
    this.initializeQueues();
    this.registerWorkflowProcessors();
  }

  private initializeQueues(): void {
    const redisConfig = {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    };

    this.workflowQueue = new Bull<WorkflowPayload>('workflow-queue', redisConfig);
    this.sequenceQueue = new Bull('sequence-queue', redisConfig);
  }

  private registerWorkflowProcessors(): void {
    // Main workflow processor
    this.workflowQueue.process(async (job: Job<WorkflowPayload>) => {
      return await this.processWorkflow(job.data);
    });

    // Sequence step processor
    this.sequenceQueue.process(async (job: Job<any>) => {
      return await this.processSequenceStep(job.data);
    });
  }

  /**
   * Trigger a workflow
   */
  async triggerWorkflow(payload: WorkflowPayload): Promise<void> {
    try {
      const jobOptions = {
        priority: payload.priority === 'urgent' ? 1 : payload.priority === 'high' ? 2 : 3,
        delay: payload.scheduledFor ? payload.scheduledFor.getTime() - Date.now() : 0,
      };

      await this.workflowQueue.add(payload, jobOptions);

      logger.info('Workflow triggered', {
        userId: payload.userId,
        workflowType: payload.workflowType,
        priority: payload.priority,
        scheduledFor: payload.scheduledFor,
      });

    } catch (error) {
      logger.error('Failed to trigger workflow', { error, payload });
      throw error;
    }
  }

  /**
   * Process a workflow
   */
  private async processWorkflow(payload: WorkflowPayload): Promise<void> {
    try {
      const { userId, workflowType, data } = payload;

      // Get user information
      const user = await this.getUserDetails(userId);
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // Execute specific workflow
      switch (workflowType) {
        case WorkflowType.WELCOME_SEQUENCE:
          await this.executeWelcomeSequence(user, data);
          break;
        case WorkflowType.PROFILE_COMPLETION:
          await this.executeProfileCompletionReminder(user, data);
          break;
        case WorkflowType.PASSWORD_RESET:
          await this.executePasswordResetFlow(user, data);
          break;
        case WorkflowType.EMAIL_VERIFICATION:
          await this.executeEmailVerificationFlow(user, data);
          break;
        case WorkflowType.OAUTH_INTEGRATION:
          await this.executeOAuthIntegrationFlow(user, data);
          break;
        case WorkflowType.ONBOARDING_SEQUENCE:
          await this.executeOnboardingSequence(user, data);
          break;
        case WorkflowType.SECURITY_ALERT:
          await this.executeSecurityAlert(user, data);
          break;
        default:
          throw new Error(`Unknown workflow type: ${workflowType}`);
      }

      logger.info('Workflow completed successfully', {
        userId,
        workflowType,
      });

    } catch (error) {
      logger.error('Workflow processing failed', { error, payload });
      throw error;
    }
  }

  /**
   * Welcome sequence workflow
   */
  private async executeWelcomeSequence(user: any, data: any): Promise<void> {
    const templateData = {
      firstName: user.firstName || 'User',
      role: user.role,
      isActor: user.role === UserRole.ACTOR,
      isCastingDirector: user.role === UserRole.CASTING_DIRECTOR,
      isProducer: user.role === UserRole.PRODUCER,
      verificationRequired: !user.emailVerified,
      verificationUrl: data.verificationUrl,
      dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
      currentYear: new Date().getFullYear(),
      facebookUrl: 'https://facebook.com/castmatch',
      twitterUrl: 'https://twitter.com/castmatch',
      instagramUrl: 'https://instagram.com/castmatch',
      linkedinUrl: 'https://linkedin.com/company/castmatch',
    };

    // Send welcome email
    await emailService.sendEmail({
      to: user.email,
      subject: 'Welcome to CastMatch - Your Journey Begins!',
      template: 'welcome',
      templateData,
      priority: 'normal',
      categories: ['welcome', 'onboarding'],
      metadata: {
        workflowType: WorkflowType.WELCOME_SEQUENCE,
        userId: user.id,
      },
    });

    // Schedule follow-up reminders if profile is incomplete
    if (data.profileCompletion < 100) {
      await this.scheduleProfileCompletionReminder(user.id, 24 * 60 * 60 * 1000); // 24 hours
    }

    // Send in-app welcome notification
    await notificationService.sendNotification({
      userId: user.id,
      type: NotificationType.WELCOME,
      title: 'Welcome to CastMatch!',
      message: 'Complete your profile to start receiving casting opportunities',
      channels: [NotificationChannel.IN_APP, NotificationChannel.WEBSOCKET],
      actionUrl: `${process.env.FRONTEND_URL}/profile/edit`,
    });
  }

  /**
   * Profile completion reminder workflow
   */
  private async executeProfileCompletionReminder(user: any, data: any): Promise<void> {
    const profileCompletion = await this.calculateProfileCompletion(user.id);
    
    // Don't send reminder if profile is complete
    if (profileCompletion >= 100) {
      return;
    }

    const templateData = {
      firstName: user.firstName || 'User',
      completionPercentage: Math.round(profileCompletion),
      completedItems: data.completedItems || [],
      pendingItems: data.pendingItems || [],
      profileUrl: `${process.env.FRONTEND_URL}/profile/edit`,
      guideUrl: `${process.env.FRONTEND_URL}/help/profile-guide`,
      unsubscribeUrl: `${process.env.FRONTEND_URL}/unsubscribe?token=${data.unsubscribeToken}`,
      currentYear: new Date().getFullYear(),
    };

    await emailService.sendEmail({
      to: user.email,
      subject: `Complete Your Profile - ${Math.round(profileCompletion)}% Done`,
      template: 'profile-completion-reminder',
      templateData,
      priority: 'normal',
      categories: ['profile', 'reminder'],
      metadata: {
        workflowType: WorkflowType.PROFILE_COMPLETION,
        userId: user.id,
        completionPercentage: profileCompletion,
      },
    });
  }

  /**
   * Password reset workflow
   */
  private async executePasswordResetFlow(user: any, data: any): Promise<void> {
    const templateData = {
      firstName: user.firstName || 'User',
      resetUrl: data.resetUrl,
      expiryHours: data.expiryHours || 2,
      currentYear: new Date().getFullYear(),
    };

    await emailService.sendEmail({
      to: user.email,
      subject: 'Reset Your CastMatch Password',
      template: 'password-reset',
      templateData,
      priority: 'high',
      categories: ['security', 'password-reset'],
      metadata: {
        workflowType: WorkflowType.PASSWORD_RESET,
        userId: user.id,
      },
    });

    // Send security notification
    await notificationService.sendNotification({
      userId: user.id,
      type: NotificationType.SECURITY_ALERT,
      title: 'Password Reset Requested',
      message: 'A password reset was requested for your account',
      channels: [NotificationChannel.IN_APP],
      priority: 'high',
    });
  }

  /**
   * Email verification workflow
   */
  private async executeEmailVerificationFlow(user: any, data: any): Promise<void> {
    const templateData = {
      firstName: user.firstName || 'User',
      email: user.email,
      verificationUrl: data.verificationUrl,
      currentYear: new Date().getFullYear(),
    };

    await emailService.sendEmail({
      to: user.email,
      subject: 'Verify Your CastMatch Email Address',
      template: 'email-verification',
      templateData,
      priority: 'high',
      categories: ['verification', 'onboarding'],
      metadata: {
        workflowType: WorkflowType.EMAIL_VERIFICATION,
        userId: user.id,
      },
    });
  }

  /**
   * OAuth integration workflow
   */
  private async executeOAuthIntegrationFlow(user: any, data: any): Promise<void> {
    const { provider, providerData } = data;
    
    let template = '';
    let templateData: any = {
      firstName: user.firstName || 'User',
      settingsUrl: `${process.env.FRONTEND_URL}/settings/integrations`,
      dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
      profileUrl: `${process.env.FRONTEND_URL}/profile`,
      currentYear: new Date().getFullYear(),
    };

    switch (provider) {
      case 'google':
        template = 'oauth-google-linked';
        templateData.googleEmail = providerData.email;
        break;
      case 'github':
        template = 'oauth-github-linked';
        templateData.githubUsername = providerData.username;
        break;
      default:
        throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    await emailService.sendEmail({
      to: user.email,
      subject: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Account Successfully Linked`,
      template,
      templateData,
      priority: 'normal',
      categories: ['oauth', 'integration'],
      metadata: {
        workflowType: WorkflowType.OAUTH_INTEGRATION,
        userId: user.id,
        provider,
      },
    });
  }

  /**
   * Onboarding sequence workflow (multi-step)
   */
  private async executeOnboardingSequence(user: any, data: any): Promise<void> {
    const steps = this.getOnboardingSteps(user.role);
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const delay = step.delay || 0;

      await this.sequenceQueue.add(
        {
          userId: user.id,
          step,
          stepIndex: i,
          totalSteps: steps.length,
        },
        {
          delay: delay * i, // Progressive delay
        }
      );
    }
  }

  /**
   * Security alert workflow
   */
  private async executeSecurityAlert(user: any, data: any): Promise<void> {
    const { alertType, ipAddress, location, timestamp } = data;
    
    // Send both email and in-app notifications for security alerts
    await Promise.all([
      emailService.sendSecurityAlert({
        to: user.email,
        name: user.firstName || 'User',
        alertType,
        ipAddress,
        location,
        timestamp: timestamp || new Date(),
      }),
      notificationService.sendNotification({
        userId: user.id,
        type: NotificationType.SECURITY_ALERT,
        title: 'Security Alert',
        message: this.getSecurityAlertMessage(alertType),
        channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
        priority: 'urgent',
      }),
    ]);
  }

  /**
   * Process sequence step
   */
  private async processSequenceStep(data: any): Promise<void> {
    const { userId, step, stepIndex } = data;
    
    try {
      const user = await this.getUserDetails(userId);
      if (!user) return;

      switch (step.type) {
        case 'email':
          await this.sendSequenceEmail(user, step);
          break;
        case 'notification':
          await this.sendSequenceNotification(user, step);
          break;
        case 'condition':
          if (step.condition && !step.condition(data)) {
            logger.info('Sequence step condition not met, skipping', { userId, stepIndex });
            return;
          }
          break;
      }

      logger.info('Sequence step completed', { userId, stepIndex });

    } catch (error) {
      logger.error('Sequence step failed', { error, data });
      throw error;
    }
  }

  /**
   * Helper Methods
   */

  private async getUserDetails(userId: string): Promise<any> {
    return await prisma.user.findUnique({
      where: { id: userId },
      include: {
        actor: true,
        castingDirector: true,
        producer: true,
      },
    });
  }

  private async calculateProfileCompletion(userId: string): Promise<number> {
    // This would calculate actual profile completion based on your schema
    // For now, return a placeholder
    const cachedCompletion = await CacheManager.get<number>(
      CacheKeys.userProfileCompletion(userId)
    );
    
    if (cachedCompletion !== null) {
      return cachedCompletion;
    }

    // Calculate completion based on filled fields
    let completion = 0;
    // Implementation would check various profile fields
    // This is a simplified version
    completion = Math.floor(Math.random() * 100); // Placeholder
    
    await CacheManager.set(
      CacheKeys.userProfileCompletion(userId),
      completion,
      3600 // 1 hour cache
    );

    return completion;
  }

  private async scheduleProfileCompletionReminder(userId: string, delay: number): Promise<void> {
    await this.triggerWorkflow({
      userId,
      workflowType: WorkflowType.PROFILE_COMPLETION,
      data: {},
      scheduledFor: new Date(Date.now() + delay),
    });
  }

  private getOnboardingSteps(role: UserRole): WorkflowStep[] {
    const baseSteps: WorkflowStep[] = [
      {
        stepId: 'welcome_notification',
        type: 'notification',
        delay: 0,
        notificationType: NotificationType.WELCOME,
      },
      {
        stepId: 'profile_reminder',
        type: 'email',
        delay: 24 * 60 * 60 * 1000, // 1 day
        emailTemplate: 'profile-completion-reminder',
      },
      {
        stepId: 'tips_and_tricks',
        type: 'email',
        delay: 3 * 24 * 60 * 60 * 1000, // 3 days
        emailTemplate: 'tips-and-tricks',
      },
    ];

    // Add role-specific steps
    if (role === UserRole.ACTOR) {
      baseSteps.push({
        stepId: 'actor_success_tips',
        type: 'email',
        delay: 7 * 24 * 60 * 60 * 1000, // 1 week
        emailTemplate: 'actor-success-tips',
      });
    }

    return baseSteps;
  }

  private async sendSequenceEmail(user: any, step: WorkflowStep): Promise<void> {
    if (!step.emailTemplate) return;

    await emailService.sendEmail({
      to: user.email,
      subject: this.getEmailSubjectForTemplate(step.emailTemplate),
      template: step.emailTemplate,
      templateData: {
        firstName: user.firstName || 'User',
        ...step.data,
      },
    });
  }

  private async sendSequenceNotification(user: any, step: WorkflowStep): Promise<void> {
    if (!step.notificationType) return;

    await notificationService.sendNotification({
      userId: user.id,
      type: step.notificationType,
      title: 'CastMatch Update',
      message: 'Check your dashboard for new opportunities',
      channels: [NotificationChannel.IN_APP],
      ...step.data,
    });
  }

  private getEmailSubjectForTemplate(template: string): string {
    const subjects: Record<string, string> = {
      'profile-completion-reminder': 'Complete Your CastMatch Profile',
      'tips-and-tricks': 'Pro Tips for CastMatch Success',
      'actor-success-tips': 'Insider Tips from Successful Actors',
    };
    return subjects[template] || 'CastMatch Update';
  }

  private getSecurityAlertMessage(alertType: string): string {
    const messages: Record<string, string> = {
      login: 'New login detected on your account',
      password_change: 'Your password was recently changed',
      account_locked: 'Your account has been temporarily locked',
      '2fa_enabled': 'Two-factor authentication has been enabled',
      '2fa_disabled': 'Two-factor authentication has been disabled',
    };
    return messages[alertType] || 'Security alert for your account';
  }

  /**
   * Public API Methods
   */

  async sendWelcomeEmail(userId: string, verificationUrl?: string): Promise<void> {
    await this.triggerWorkflow({
      userId,
      workflowType: WorkflowType.WELCOME_SEQUENCE,
      data: { verificationUrl },
    });
  }

  async sendPasswordResetEmail(userId: string, resetUrl: string, expiryHours: number = 2): Promise<void> {
    await this.triggerWorkflow({
      userId,
      workflowType: WorkflowType.PASSWORD_RESET,
      data: { resetUrl, expiryHours },
      priority: 'high',
    });
  }

  async sendEmailVerification(userId: string, verificationUrl: string): Promise<void> {
    await this.triggerWorkflow({
      userId,
      workflowType: WorkflowType.EMAIL_VERIFICATION,
      data: { verificationUrl },
      priority: 'high',
    });
  }

  async sendOAuthIntegrationNotification(
    userId: string, 
    provider: string, 
    providerData: any
  ): Promise<void> {
    await this.triggerWorkflow({
      userId,
      workflowType: WorkflowType.OAUTH_INTEGRATION,
      data: { provider, providerData },
    });
  }

  async sendProfileCompletionReminder(userId: string): Promise<void> {
    await this.triggerWorkflow({
      userId,
      workflowType: WorkflowType.PROFILE_COMPLETION,
      data: {},
    });
  }

  async startOnboardingSequence(userId: string): Promise<void> {
    await this.triggerWorkflow({
      userId,
      workflowType: WorkflowType.ONBOARDING_SEQUENCE,
      data: {},
    });
  }

  async sendSecurityAlert(
    userId: string, 
    alertType: string, 
    alertData?: any
  ): Promise<void> {
    await this.triggerWorkflow({
      userId,
      workflowType: WorkflowType.SECURITY_ALERT,
      data: { alertType, ...alertData },
      priority: 'urgent',
    });
  }
}

// Export singleton instance
export const communicationWorkflowService = new CommunicationWorkflowService();