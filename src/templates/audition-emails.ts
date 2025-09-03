/**
 * Audition Email Templates for CastMatch
 * Beautiful HTML email templates using inline CSS for compatibility with Resend
 */

import moment from 'moment-timezone';
import { calendarService } from '../services/calendar.service';

const baseStyles = `
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 32px;
      font-weight: 700;
    }
    .header p {
      margin: 0;
      font-size: 16px;
      opacity: 0.9;
    }
    .content {
      padding: 40px 30px;
    }
    .audition-card {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 30px;
      margin: 30px 0;
      border-left: 5px solid #667eea;
    }
    .audition-details {
      display: table;
      width: 100%;
      margin: 20px 0;
    }
    .detail-row {
      display: table-row;
    }
    .detail-label {
      display: table-cell;
      font-weight: 600;
      color: #666;
      padding: 8px 20px 8px 0;
      vertical-align: top;
      width: 120px;
    }
    .detail-value {
      display: table-cell;
      color: #333;
      padding: 8px 0;
      vertical-align: top;
    }
    .button {
      display: inline-block;
      padding: 14px 28px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
    }
    .button:hover {
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
      transform: translateY(-1px);
    }
    .button-secondary {
      background: #f8f9fa;
      color: #333 !important;
      border: 2px solid #dee2e6;
    }
    .confirmation-code {
      background: #e3f2fd;
      border: 2px solid #2196f3;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
      margin: 25px 0;
      font-size: 24px;
      font-weight: 700;
      color: #1976d2;
      letter-spacing: 2px;
    }
    .alert {
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .alert-info {
      background-color: #e3f2fd;
      border: 1px solid #2196f3;
      color: #0d47a1;
    }
    .alert-warning {
      background-color: #fff3e0;
      border: 1px solid #ff9800;
      color: #e65100;
    }
    .alert-success {
      background-color: #e8f5e8;
      border: 1px solid #4caf50;
      color: #1b5e20;
    }
    .reminder-badge {
      display: inline-block;
      background: #ff5722;
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .footer {
      background: #f8f9fa;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #dee2e6;
    }
    .footer p {
      margin: 5px 0;
      color: #666;
      font-size: 14px;
    }
    .social-links {
      margin: 20px 0;
    }
    .social-links a {
      display: inline-block;
      margin: 0 10px;
      color: #667eea;
      text-decoration: none;
      font-size: 14px;
    }
    @media (max-width: 600px) {
      .container {
        margin: 0;
        box-shadow: none;
      }
      .header, .content, .footer {
        padding: 20px;
      }
      .audition-card {
        padding: 20px;
        margin: 20px 0;
      }
      .detail-label, .detail-value {
        display: block;
        width: 100%;
        padding: 5px 0;
      }
      .detail-label {
        font-weight: 600;
        color: #667eea;
      }
    }
  </style>
`;

export interface AuditionEmailData {
  to: string;
  talentName: string;
  projectTitle: string;
  characterName?: string;
  auditionDate: Date;
  location: string;
  confirmationCode: string;
  meetingLink?: string;
  specialInstructions?: string;
  venueAddress?: string;
  contactPerson?: string;
  contactPhone?: string;
}

export interface ReminderEmailData extends AuditionEmailData {
  reminderType: '24h' | '2h' | '30m';
}

export interface RescheduleEmailData {
  to: string;
  talentName: string;
  projectTitle: string;
  characterName?: string;
  oldDate: Date;
  newDate: Date;
  location: string;
  confirmationCode: string;
  reason?: string;
  meetingLink?: string;
}

export interface CancellationEmailData {
  to: string;
  talentName: string;
  projectTitle: string;
  characterName?: string;
  auditionDate: Date;
  reason?: string;
  contactPerson?: string;
  contactPhone?: string;
}

/**
 * Generate audition confirmation email HTML
 */
export function generateAuditionConfirmationEmail(data: AuditionEmailData): { html: string; text: string; attachments?: any[] } {
  const auditionDateTime = moment.tz(data.auditionDate, 'Asia/Kolkata');
  const formattedDate = auditionDateTime.format('dddd, MMMM Do, YYYY');
  const formattedTime = auditionDateTime.format('h:mm A');

  // Generate calendar invite
  const icsData = calendarService.generateICSInvite({
    summary: `Audition: ${data.projectTitle}${data.characterName ? ` - ${data.characterName}` : ''}`,
    description: `CastMatch Audition\\n\\nProject: ${data.projectTitle}\\n${data.characterName ? `Character: ${data.characterName}\\n` : ''}Location: ${data.location}\\n\\nConfirmation Code: ${data.confirmationCode}${data.specialInstructions ? `\\n\\nSpecial Instructions: ${data.specialInstructions}` : ''}`,
    startTime: data.auditionDate,
    endTime: moment(data.auditionDate).add(1, 'hour').toDate(),
    location: data.location,
    meetingLink: data.meetingLink,
  });

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Audition Confirmation - ${data.projectTitle}</title>
      ${baseStyles}
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎬 CastMatch</h1>
          <p>Audition Confirmed!</p>
        </div>
        
        <div class="content">
          <h2>Hello ${data.talentName},</h2>
          
          <p>Great news! Your audition has been confirmed. We're excited to see your performance!</p>
          
          <div class="audition-card">
            <h3 style="margin-top: 0; color: #667eea; font-size: 24px;">
              ${data.projectTitle}${data.characterName ? ` - ${data.characterName}` : ''}
            </h3>
            
            <div class="audition-details">
              <div class="detail-row">
                <div class="detail-label">📅 Date:</div>
                <div class="detail-value">${formattedDate}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">⏰ Time:</div>
                <div class="detail-value">${formattedTime} IST</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">📍 Location:</div>
                <div class="detail-value">${data.location}</div>
              </div>
              ${data.venueAddress ? `
              <div class="detail-row">
                <div class="detail-label">🏢 Address:</div>
                <div class="detail-value">${data.venueAddress}</div>
              </div>
              ` : ''}
              ${data.meetingLink ? `
              <div class="detail-row">
                <div class="detail-label">💻 Meeting Link:</div>
                <div class="detail-value"><a href="${data.meetingLink}" style="color: #667eea;">${data.meetingLink}</a></div>
              </div>
              ` : ''}
            </div>
            
            <div class="confirmation-code">
              Confirmation Code: ${data.confirmationCode}
            </div>
          </div>
          
          ${data.specialInstructions ? `
          <div class="alert alert-info">
            <h4 style="margin-top: 0;">📋 Special Instructions:</h4>
            <p style="margin-bottom: 0;">${data.specialInstructions}</p>
          </div>
          ` : ''}
          
          <div class="alert alert-warning">
            <h4 style="margin-top: 0;">⚠️ Important Reminders:</h4>
            <ul style="margin-bottom: 0; padding-left: 20px;">
              <li>Please arrive 15 minutes early for check-in</li>
              <li>Bring a valid government ID for verification</li>
              <li>Have your confirmation code ready: <strong>${data.confirmationCode}</strong></li>
              <li>Dress appropriately for the character you're auditioning for</li>
              <li>Stay hydrated and get plenty of rest before your audition</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 40px 0;">
            ${data.meetingLink ? `
            <a href="${data.meetingLink}" class="button" style="margin-right: 15px;">Join Virtual Audition</a>
            ` : ''}
            <a href="tel:${data.contactPhone || '+91-7045638819'}" class="button button-secondary">Contact Support</a>
          </div>
          
          ${data.contactPerson ? `
          <div class="alert alert-info">
            <h4 style="margin-top: 0;">📞 Contact Information:</h4>
            <p><strong>Contact Person:</strong> ${data.contactPerson}</p>
            ${data.contactPhone ? `<p><strong>Phone:</strong> <a href="tel:${data.contactPhone}">${data.contactPhone}</a></p>` : ''}
          </div>
          ` : ''}
          
          <p>We wish you the best of luck with your audition. Break a leg! 🌟</p>
          
          <p>If you need to reschedule or have any questions, please contact us as soon as possible.</p>
        </div>
        
        <div class="footer">
          <p><strong>CastMatch</strong> - AI-Powered Casting Platform</p>
          <p>Connecting talent with opportunities in Mumbai's OTT industry</p>
          <div class="social-links">
            <a href="https://castmatch.ai">Website</a>
            <a href="mailto:support@castmatch.ai">Support</a>
            <a href="https://instagram.com/castmatch">Instagram</a>
            <a href="https://linkedin.com/company/castmatch">LinkedIn</a>
          </div>
          <p style="font-size: 12px; color: #999;">
            © ${new Date().getFullYear()} CastMatch. All rights reserved.<br>
            This is an automated email. Please do not reply directly to this message.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    CastMatch - Audition Confirmation
    
    Hello ${data.talentName},
    
    Your audition has been confirmed!
    
    Project: ${data.projectTitle}${data.characterName ? ` - ${data.characterName}` : ''}
    Date: ${formattedDate}
    Time: ${formattedTime} IST
    Location: ${data.location}
    ${data.venueAddress ? `Address: ${data.venueAddress}` : ''}
    ${data.meetingLink ? `Meeting Link: ${data.meetingLink}` : ''}
    
    Confirmation Code: ${data.confirmationCode}
    
    ${data.specialInstructions ? `Special Instructions: ${data.specialInstructions}` : ''}
    
    Important Reminders:
    - Arrive 15 minutes early
    - Bring valid government ID
    - Have your confirmation code ready
    - Dress appropriately for the character
    
    ${data.contactPerson ? `Contact: ${data.contactPerson}${data.contactPhone ? ` (${data.contactPhone})` : ''}` : ''}
    
    Best of luck!
    
    CastMatch Team
    support@castmatch.ai
  `;

  return {
    html,
    text,
    attachments: [
      {
        filename: `audition-${data.projectTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`,
        content: Buffer.from(icsData),
        contentType: 'text/calendar',
      },
    ],
  };
}

/**
 * Generate audition reminder email HTML
 */
export function generateAuditionReminderEmail(data: ReminderEmailData): { html: string; text: string } {
  const auditionDateTime = moment.tz(data.auditionDate, 'Asia/Kolkata');
  const formattedDate = auditionDateTime.format('dddd, MMMM Do, YYYY');
  const formattedTime = auditionDateTime.format('h:mm A');
  const timeUntil = auditionDateTime.fromNow();

  const reminderMessages = {
    '24h': {
      badge: '24 Hours',
      message: 'Your audition is tomorrow!',
      urgency: 'info',
    },
    '2h': {
      badge: '2 Hours',
      message: 'Your audition is in 2 hours!',
      urgency: 'warning',
    },
    '30m': {
      badge: '30 Minutes',
      message: 'Your audition is starting soon!',
      urgency: 'success',
    },
  };

  const reminder = reminderMessages[data.reminderType];

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Audition Reminder - ${data.projectTitle}</title>
      ${baseStyles}
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎬 CastMatch</h1>
          <p><span class="reminder-badge">${reminder.badge} Reminder</span></p>
        </div>
        
        <div class="content">
          <h2>Hello ${data.talentName},</h2>
          
          <div class="alert alert-${reminder.urgency}">
            <h3 style="margin-top: 0;">⏰ ${reminder.message}</h3>
            <p style="margin-bottom: 0; font-size: 18px; font-weight: 600;">
              ${data.projectTitle}${data.characterName ? ` - ${data.characterName}` : ''}
            </p>
          </div>
          
          <div class="audition-card">
            <div class="audition-details">
              <div class="detail-row">
                <div class="detail-label">📅 Date:</div>
                <div class="detail-value">${formattedDate}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">⏰ Time:</div>
                <div class="detail-value">${formattedTime} IST (${timeUntil})</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">📍 Location:</div>
                <div class="detail-value">${data.location}</div>
              </div>
              ${data.meetingLink ? `
              <div class="detail-row">
                <div class="detail-label">💻 Meeting Link:</div>
                <div class="detail-value"><a href="${data.meetingLink}" style="color: #667eea;">${data.meetingLink}</a></div>
              </div>
              ` : ''}
            </div>
            
            <div class="confirmation-code">
              Confirmation Code: ${data.confirmationCode}
            </div>
          </div>
          
          <div class="alert alert-info">
            <h4 style="margin-top: 0;">📝 Final Checklist:</h4>
            <ul style="margin-bottom: 0; padding-left: 20px;">
              <li>✅ Government ID ready for verification</li>
              <li>✅ Confirmation code noted down</li>
              <li>✅ Appropriate attire selected</li>
              <li>✅ Script/sides reviewed</li>
              <li>✅ Route to venue planned</li>
              ${data.meetingLink ? '<li>✅ Video call setup tested</li>' : ''}
            </ul>
          </div>
          
          <div style="text-align: center; margin: 40px 0;">
            ${data.meetingLink ? `
            <a href="${data.meetingLink}" class="button">Join Audition Now</a>
            ` : `
            <a href="https://maps.google.com/?q=${encodeURIComponent(data.location)}" class="button">Get Directions</a>
            `}
          </div>
          
          <p>We're looking forward to seeing your performance. You've got this! 🌟</p>
        </div>
        
        <div class="footer">
          <p><strong>CastMatch</strong> - AI-Powered Casting Platform</p>
          <p>Need help? Contact us at <a href="tel:+91-7045638819">+91-7045638819</a></p>
          <p style="font-size: 12px; color: #999;">
            © ${new Date().getFullYear()} CastMatch. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    CastMatch - Audition Reminder (${reminder.badge})
    
    Hello ${data.talentName},
    
    ${reminder.message}
    
    Project: ${data.projectTitle}${data.characterName ? ` - ${data.characterName}` : ''}
    Date: ${formattedDate}
    Time: ${formattedTime} IST (${timeUntil})
    Location: ${data.location}
    ${data.meetingLink ? `Meeting Link: ${data.meetingLink}` : ''}
    
    Confirmation Code: ${data.confirmationCode}
    
    Final Checklist:
    - Government ID ready
    - Confirmation code noted
    - Appropriate attire selected
    - Script reviewed
    - Route planned
    ${data.meetingLink ? '- Video call setup tested' : ''}
    
    You've got this! 🌟
    
    CastMatch Team
    +91-7045638819
  `;

  return { html, text };
}

/**
 * Generate audition reschedule email HTML
 */
export function generateAuditionRescheduleEmail(data: RescheduleEmailData): { html: string; text: string; attachments?: any[] } {
  const oldDateTime = moment.tz(data.oldDate, 'Asia/Kolkata');
  const newDateTime = moment.tz(data.newDate, 'Asia/Kolkata');
  
  const oldFormatted = {
    date: oldDateTime.format('dddd, MMMM Do, YYYY'),
    time: oldDateTime.format('h:mm A'),
  };
  
  const newFormatted = {
    date: newDateTime.format('dddd, MMMM Do, YYYY'),
    time: newDateTime.format('h:mm A'),
  };

  // Generate new calendar invite
  const icsData = calendarService.generateICSInvite({
    summary: `Audition: ${data.projectTitle}${data.characterName ? ` - ${data.characterName}` : ''}`,
    description: `CastMatch Audition (Rescheduled)\\n\\nProject: ${data.projectTitle}\\n${data.characterName ? `Character: ${data.characterName}\\n` : ''}Location: ${data.location}\\n\\nConfirmation Code: ${data.confirmationCode}${data.reason ? `\\n\\nReschedule Reason: ${data.reason}` : ''}`,
    startTime: data.newDate,
    endTime: moment(data.newDate).add(1, 'hour').toDate(),
    location: data.location,
    meetingLink: data.meetingLink,
  });

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Audition Rescheduled - ${data.projectTitle}</title>
      ${baseStyles}
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎬 CastMatch</h1>
          <p>Audition Rescheduled</p>
        </div>
        
        <div class="content">
          <h2>Hello ${data.talentName},</h2>
          
          <p>Your audition has been rescheduled. Please note the new date and time below.</p>
          
          <div class="alert alert-warning">
            <h4 style="margin-top: 0;">📅 Schedule Change</h4>
            <p><strong>Previous:</strong> ${oldFormatted.date} at ${oldFormatted.time}</p>
            <p><strong>New:</strong> ${newFormatted.date} at ${newFormatted.time}</p>
            ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
          </div>
          
          <div class="audition-card">
            <h3 style="margin-top: 0; color: #667eea; font-size: 24px;">
              ${data.projectTitle}${data.characterName ? ` - ${data.characterName}` : ''}
            </h3>
            
            <div class="audition-details">
              <div class="detail-row">
                <div class="detail-label">📅 New Date:</div>
                <div class="detail-value">${newFormatted.date}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">⏰ New Time:</div>
                <div class="detail-value">${newFormatted.time} IST</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">📍 Location:</div>
                <div class="detail-value">${data.location}</div>
              </div>
              ${data.meetingLink ? `
              <div class="detail-row">
                <div class="detail-label">💻 Meeting Link:</div>
                <div class="detail-value"><a href="${data.meetingLink}" style="color: #667eea;">${data.meetingLink}</a></div>
              </div>
              ` : ''}
            </div>
            
            <div class="confirmation-code">
              Confirmation Code: ${data.confirmationCode}
            </div>
          </div>
          
          <div class="alert alert-success">
            <p style="margin: 0;"><strong>Your audition is automatically confirmed for the new time.</strong> No further action is required on your part.</p>
          </div>
          
          <div style="text-align: center; margin: 40px 0;">
            ${data.meetingLink ? `
            <a href="${data.meetingLink}" class="button">Join Virtual Audition</a>
            ` : `
            <a href="https://maps.google.com/?q=${encodeURIComponent(data.location)}" class="button">Get Directions</a>
            `}
          </div>
          
          <p>We apologize for any inconvenience caused by this reschedule. We look forward to seeing you at the new time!</p>
        </div>
        
        <div class="footer">
          <p><strong>CastMatch</strong> - AI-Powered Casting Platform</p>
          <p>Questions? Contact us at <a href="mailto:support@castmatch.ai">support@castmatch.ai</a></p>
          <p style="font-size: 12px; color: #999;">
            © ${new Date().getFullYear()} CastMatch. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    CastMatch - Audition Rescheduled
    
    Hello ${data.talentName},
    
    Your audition has been rescheduled.
    
    Previous: ${oldFormatted.date} at ${oldFormatted.time}
    New: ${newFormatted.date} at ${newFormatted.time}
    ${data.reason ? `Reason: ${data.reason}` : ''}
    
    Project: ${data.projectTitle}${data.characterName ? ` - ${data.characterName}` : ''}
    Location: ${data.location}
    ${data.meetingLink ? `Meeting Link: ${data.meetingLink}` : ''}
    
    Confirmation Code: ${data.confirmationCode}
    
    Your audition is automatically confirmed for the new time.
    
    We apologize for any inconvenience.
    
    CastMatch Team
    support@castmatch.ai
  `;

  return {
    html,
    text,
    attachments: [
      {
        filename: `audition-rescheduled-${data.projectTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`,
        content: Buffer.from(icsData),
        contentType: 'text/calendar',
      },
    ],
  };
}

/**
 * Generate audition cancellation email HTML
 */
export function generateAuditionCancellationEmail(data: CancellationEmailData): { html: string; text: string } {
  const auditionDateTime = moment.tz(data.auditionDate, 'Asia/Kolkata');
  const formattedDate = auditionDateTime.format('dddd, MMMM Do, YYYY');
  const formattedTime = auditionDateTime.format('h:mm A');

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Audition Cancelled - ${data.projectTitle}</title>
      ${baseStyles}
    </head>
    <body>
      <div class="container">
        <div class="header" style="background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);">
          <h1>🎬 CastMatch</h1>
          <p>Audition Cancelled</p>
        </div>
        
        <div class="content">
          <h2>Hello ${data.talentName},</h2>
          
          <p>We regret to inform you that your scheduled audition has been cancelled.</p>
          
          <div class="audition-card">
            <h3 style="margin-top: 0; color: #f44336; font-size: 24px;">
              ${data.projectTitle}${data.characterName ? ` - ${data.characterName}` : ''}
            </h3>
            
            <div class="audition-details">
              <div class="detail-row">
                <div class="detail-label">📅 Date:</div>
                <div class="detail-value">${formattedDate}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">⏰ Time:</div>
                <div class="detail-value">${formattedTime} IST</div>
              </div>
              ${data.reason ? `
              <div class="detail-row">
                <div class="detail-label">📝 Reason:</div>
                <div class="detail-value">${data.reason}</div>
              </div>
              ` : ''}
            </div>
          </div>
          
          <div class="alert alert-info">
            <h4 style="margin-top: 0;">💡 What's Next?</h4>
            <ul style="margin-bottom: 0; padding-left: 20px;">
              <li>Keep an eye on your CastMatch dashboard for new opportunities</li>
              <li>We'll notify you of any future auditions for similar roles</li>
              <li>Your profile remains active and searchable by casting directors</li>
              <li>Consider this great practice for your next audition!</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="https://castmatch.ai/auditions" class="button">Browse New Auditions</a>
          </div>
          
          <p>We sincerely apologize for any inconvenience caused. The entertainment industry can be unpredictable, but your talent and dedication will lead to the right opportunity.</p>
          
          ${data.contactPerson ? `
          <div class="alert alert-info">
            <p style="margin: 0;">
              <strong>Questions?</strong> Contact ${data.contactPerson}${data.contactPhone ? ` at <a href="tel:${data.contactPhone}">${data.contactPhone}</a>` : ''}
            </p>
          </div>
          ` : ''}
        </div>
        
        <div class="footer">
          <p><strong>CastMatch</strong> - AI-Powered Casting Platform</p>
          <p>Keep going! Your next big break is just around the corner 🌟</p>
          <div class="social-links">
            <a href="https://castmatch.ai">Website</a>
            <a href="mailto:support@castmatch.ai">Support</a>
            <a href="https://instagram.com/castmatch">Instagram</a>
            <a href="https://linkedin.com/company/castmatch">LinkedIn</a>
          </div>
          <p style="font-size: 12px; color: #999;">
            © ${new Date().getFullYear()} CastMatch. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    CastMatch - Audition Cancelled
    
    Hello ${data.talentName},
    
    We regret to inform you that your scheduled audition has been cancelled.
    
    Project: ${data.projectTitle}${data.characterName ? ` - ${data.characterName}` : ''}
    Date: ${formattedDate}
    Time: ${formattedTime} IST
    ${data.reason ? `Reason: ${data.reason}` : ''}
    
    What's Next?
    - Keep checking your dashboard for new opportunities
    - We'll notify you of similar auditions
    - Your profile remains active
    - Consider this practice for your next audition!
    
    We sincerely apologize for any inconvenience.
    
    ${data.contactPerson ? `Questions? Contact ${data.contactPerson}${data.contactPhone ? ` (${data.contactPhone})` : ''}` : ''}
    
    Keep going! Your next big break is around the corner.
    
    CastMatch Team
    support@castmatch.ai
  `;

  return { html, text };
}