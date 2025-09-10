"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEmailServiceMock = exports.EmailServiceMock = void 0;
const globals_1 = require("@jest/globals");
class EmailServiceMock {
    static sentEmails = [];
    static options = {};
    static setup(options = {}) {
        this.options = options;
        this.sentEmails = [];
    }
    static async sendEmail(to, subject, html, text) {
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
    static async sendVerificationEmail(to, token) {
        const verificationUrl = `http://localhost:3001/verify-email?token=${token}`;
        const html = `
      <h1>Verify Your Email</h1>
      <p>Click the link below to verify your email address:</p>
      <a href="${verificationUrl}">Verify Email</a>
      <p>Or copy this link: ${verificationUrl}</p>
    `;
        return this.sendEmail(to, 'Verify Your Email - CastMatch', html);
    }
    static async sendPasswordResetEmail(to, token) {
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
    static async sendAuditionNotification(to, auditionDetails) {
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
    static async sendWelcomeEmail(to, userName) {
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
    static async sendRoleMatchNotification(to, matches) {
        const matchList = matches.map(m => `<li><strong>${m.projectTitle}</strong> - ${m.roleName} (${m.matchScore}% match)</li>`).join('');
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
    static findEmail(predicate) {
        return this.sentEmails.find(predicate);
    }
    static clearSentEmails() {
        this.sentEmails = [];
    }
    static getEmailCount() {
        return this.sentEmails.length;
    }
    static hasEmailBeenSent(to, subject) {
        return this.sentEmails.some(email => email.to === to && (!subject || email.subject === subject));
    }
    static extractTokenFromEmail(email, tokenPattern = /token=([a-zA-Z0-9-_]+)/) {
        const match = email.html.match(tokenPattern);
        return match ? match[1] : null;
    }
    static reset() {
        this.sentEmails = [];
        this.options = {};
    }
}
exports.EmailServiceMock = EmailServiceMock;
const createEmailServiceMock = () => {
    return {
        sendEmail: globals_1.jest.fn().mockImplementation(EmailServiceMock.sendEmail.bind(EmailServiceMock)),
        sendVerificationEmail: globals_1.jest.fn().mockImplementation(EmailServiceMock.sendVerificationEmail.bind(EmailServiceMock)),
        sendPasswordResetEmail: globals_1.jest.fn().mockImplementation(EmailServiceMock.sendPasswordResetEmail.bind(EmailServiceMock)),
        sendAuditionNotification: globals_1.jest.fn().mockImplementation(EmailServiceMock.sendAuditionNotification.bind(EmailServiceMock)),
        sendWelcomeEmail: globals_1.jest.fn().mockImplementation(EmailServiceMock.sendWelcomeEmail.bind(EmailServiceMock)),
        sendRoleMatchNotification: globals_1.jest.fn().mockImplementation(EmailServiceMock.sendRoleMatchNotification.bind(EmailServiceMock))
    };
};
exports.createEmailServiceMock = createEmailServiceMock;
//# sourceMappingURL=emailService.mock.js.map