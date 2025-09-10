import { jest } from '@jest/globals';

export interface EmailMockOptions {
  shouldFail?: boolean;
  delay?: number;
  trackCalls?: boolean;
}

export class EmailServiceMock {
  private static sentEmails: any[] = [];
  private static options: EmailMockOptions = {};

  static setup(options: EmailMockOptions = {}) {
    this.options = options;
    this.sentEmails = [];
  }

  static async sendEmail(to: string, subject: string, html: string, text?: string) {
    if (this.options.delay) {
      await new Promise(resolve => setTimeout(resolve, this.options.delay));
    }

    if (this.options.shouldFail) {
      throw new Error('Email service unavailable');
    }

    const email = {
      to,
      subject,
      html,
      text,
      timestamp: new Date(),
      messageId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    if (this.options.trackCalls) {
      this.sentEmails.push(email);
    }

    return {
      messageId: email.messageId,
      accepted: [to],
      rejected: [],
      pending: []
    };
  }

  static async sendVerificationEmail(to: string, token: string) {
    const verificationUrl = `http://localhost:3001/verify-email?token=${token}`;
    const html = `
      <h1>Verify Your Email</h1>
      <p>Click the link below to verify your email address:</p>
      <a href="${verificationUrl}">Verify Email</a>
      <p>Or copy this link: ${verificationUrl}</p>
    `;
    
    return this.sendEmail(to, 'Verify Your Email - CastMatch', html);
  }

  static async sendPasswordResetEmail(to: string, token: string) {
    const resetUrl = `http://localhost:3001/reset-password?token=${token}`;
    const html = `
      <h1>Reset Your Password</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;
    
    return this.sendEmail(to, 'Password Reset Request - CastMatch', html);
  }

  static async sendAuditionNotification(to: string, auditionDetails: any) {
    const html = `
      <h1>New Audition Scheduled</h1>
      <h2>${auditionDetails.projectTitle}</h2>
      <p><strong>Role:</strong> ${auditionDetails.roleName}</p>
      <p><strong>Date:</strong> ${auditionDetails.date}</p>
      <p><strong>Time:</strong> ${auditionDetails.time}</p>
      <p><strong>Location:</strong> ${auditionDetails.location}</p>
      <p><strong>Type:</strong> ${auditionDetails.type}</p>
      <p>Please prepare accordingly and arrive 15 minutes early.</p>
    `;
    
    return this.sendEmail(to, `Audition Scheduled: ${auditionDetails.projectTitle}`, html);
  }

  static async sendWelcomeEmail(to: string, userName: string) {
    const html = `
      <h1>Welcome to CastMatch, ${userName}!</h1>
      <p>Thank you for joining Mumbai's premier casting platform.</p>
      <h2>Getting Started:</h2>
      <ul>
        <li>Complete your profile to get discovered</li>
        <li>Upload your headshots and showreel</li>
        <li>Browse available roles and apply</li>
        <li>Set up audition alerts</li>
      </ul>
      <p>If you need any help, our support team is here for you.</p>
    `;
    
    return this.sendEmail(to, 'Welcome to CastMatch!', html);
  }

  static async sendRoleMatchNotification(to: string, matches: any[]) {
    const matchList = matches.map(m => 
      `<li><strong>${m.projectTitle}</strong> - ${m.roleName} (${m.matchScore}% match)</li>`
    ).join('');
    
    const html = `
      <h1>New Role Matches Found!</h1>
      <p>We found ${matches.length} roles that match your profile:</p>
      <ul>${matchList}</ul>
      <p>Log in to view details and apply.</p>
    `;
    
    return this.sendEmail(to, `${matches.length} New Role Matches`, html);
  }

  static getSentEmails() {
    return this.sentEmails;
  }

  static getLastEmail() {
    return this.sentEmails[this.sentEmails.length - 1];
  }

  static findEmail(predicate: (email: any) => boolean) {
    return this.sentEmails.find(predicate);
  }

  static clearSentEmails() {
    this.sentEmails = [];
  }

  static getEmailCount() {
    return this.sentEmails.length;
  }

  static hasEmailBeenSent(to: string, subject?: string) {
    return this.sentEmails.some(email => 
      email.to === to && (!subject || email.subject === subject)
    );
  }

  static extractTokenFromEmail(email: any, tokenPattern: RegExp = /token=([a-zA-Z0-9-_]+)/): string | null {
    const match = email.html.match(tokenPattern);
    return match ? match[1] : null;
  }

  static reset() {
    this.sentEmails = [];
    this.options = {};
  }
}

// Jest mock implementation
export const createEmailServiceMock = () => {
  return {
    sendEmail: jest.fn().mockImplementation(EmailServiceMock.sendEmail.bind(EmailServiceMock)),
    sendVerificationEmail: jest.fn().mockImplementation(EmailServiceMock.sendVerificationEmail.bind(EmailServiceMock)),
    sendPasswordResetEmail: jest.fn().mockImplementation(EmailServiceMock.sendPasswordResetEmail.bind(EmailServiceMock)),
    sendAuditionNotification: jest.fn().mockImplementation(EmailServiceMock.sendAuditionNotification.bind(EmailServiceMock)),
    sendWelcomeEmail: jest.fn().mockImplementation(EmailServiceMock.sendWelcomeEmail.bind(EmailServiceMock)),
    sendRoleMatchNotification: jest.fn().mockImplementation(EmailServiceMock.sendRoleMatchNotification.bind(EmailServiceMock))
  };
};