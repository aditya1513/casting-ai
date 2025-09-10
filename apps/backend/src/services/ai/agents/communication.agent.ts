/**
 * Communication Agent
 * Generates professional messages and responses for the casting industry
 */

import { z } from 'zod';
import { getOpenAIClient, AI_MODELS, SYSTEM_PROMPTS, withRetry } from '../config';
import { logger } from '../../../utils/logger';

// Message type enum
export const MessageTypeEnum = z.enum([
  'audition_invitation',
  'selection_notification',
  'rejection_notification',
  'schedule_update',
  'reminder',
  'follow_up',
  'thank_you',
  'inquiry_response',
  'general_update',
  'contract_discussion',
]);

// Input schema
export const CommunicationInput = z.object({
  messageType: MessageTypeEnum,
  recipient: z.object({
    name: z.string(),
    role: z.enum(['talent', 'casting_director', 'producer', 'agent']),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }),
  context: z.object({
    projectName: z.string().optional(),
    roleName: z.string().optional(),
    auditionDate: z.string().datetime().optional(),
    location: z.string().optional(),
    additionalInfo: z.record(z.any()).optional(),
  }),
  tone: z.enum(['formal', 'friendly', 'urgent', 'celebratory']).default('formal'),
  language: z.enum(['en', 'hi', 'en-hi']).default('en'), // English, Hindi, or Mixed
  includeSignature: z.boolean().default(true),
  customMessage: z.string().optional(), // For custom content
});

export type CommunicationInputType = z.infer<typeof CommunicationInput>;

// Output schema
export const GeneratedMessage = z.object({
  subject: z.string(),
  body: z.string(),
  smsVersion: z.string().optional(), // Shorter version for SMS
  whatsappVersion: z.string().optional(), // WhatsApp formatted
  emailHtml: z.string().optional(), // HTML version for email
  tags: z.array(z.string()),
  estimatedReadTime: z.number(), // in seconds
  culturalNotes: z.array(z.string()).optional(),
});

export type GeneratedMessageType = z.infer<typeof GeneratedMessage>;

export class CommunicationAgent {
  private openai = getOpenAIClient();
  
  /**
   * Generate a professional message
   */
  async generateMessage(input: CommunicationInputType): Promise<GeneratedMessageType> {
    try {
      const prompt = this.buildMessagePrompt(input);
      
      const response = await withRetry(async () => {
        return await this.openai.chat.completions.create({
          model: AI_MODELS.chat,
          messages: [
            { role: 'system', content: SYSTEM_PROMPTS.communication },
            { role: 'user', content: prompt }
        ],
        temperature: AI_MODELS.parameters.chat.temperature,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      });
    });
    
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from AI');
    }
    
    const result = JSON.parse(content);
    return this.validateMessageResult(result);
    } catch (error) {
      logger.error('Message generation failed:', error);
      throw error;
    }
  }
  
  /**
   * Build message generation prompt
   */
  private buildMessagePrompt(input: CommunicationInputType): string {
    const templates = this.getMessageTemplates();
    const template = templates[input.messageType] || templates.general_update;
    
    return `Generate a professional ${input.tone} message for the Mumbai entertainment industry.

Message Type: ${input.messageType}
Recipient: ${input.recipient.name} (${input.recipient.role})
Language: ${this.getLanguageDescription(input.language)}

Context:
${JSON.stringify(input.context, null, 2)}

${input.customMessage ? `Additional Instructions: ${input.customMessage}` : ''}

Template Guide:
${template}

Generate a message and return as JSON:
{
  "subject": "Email subject line",
  "body": "Full message body with proper formatting",
  "smsVersion": "Short 160-character version for SMS",
  "whatsappVersion": "WhatsApp formatted with emojis if appropriate",
  "emailHtml": "HTML formatted email with proper styling",
  "tags": ["tag1", "tag2"],
  "estimatedReadTime": 30,
  "culturalNotes": ["Consider festival timing", "Use respectful salutation"]
}

Ensure the message is:
1. Culturally appropriate for Mumbai/Indian context
2. Professional yet warm
3. Clear and concise
4. ${input.includeSignature ? 'Includes appropriate signature' : 'No signature needed'}
5. ${input.language === 'hi' ? 'In Hindi with Devanagari script' : input.language === 'en-hi' ? 'Mix of English and Hindi (Hinglish)' : 'In English'}`;
  }
  
  /**
   * Get message templates
   */
  private getMessageTemplates(): Record<string, string> {
    return {
      audition_invitation: `
        - Congratulate on being shortlisted
        - Provide audition details (date, time, location)
        - Mention what to prepare/bring
        - Include contact for questions
        - Add motivational closing`,
      
      selection_notification: `
        - Congratulations on selection
        - Role and project details
        - Next steps
        - Contract/payment discussion timeline
        - Celebratory tone`,
      
      rejection_notification: `
        - Thank for participation
        - Acknowledge their talent
        - Provide constructive feedback if appropriate
        - Encourage future applications
        - Professional and respectful tone`,
      
      schedule_update: `
        - Apologize for any inconvenience
        - New schedule details
        - Reason for change (if appropriate)
        - Confirmation request
        - Alternative options if available`,
      
      reminder: `
        - Friendly reminder tone
        - Event/audition details
        - What to prepare
        - Contact information
        - Looking forward to meeting`,
      
      follow_up: `
        - Reference previous interaction
        - Purpose of follow-up
        - Action items
        - Timeline
        - Professional closing`,
      
      thank_you: `
        - Express gratitude
        - Highlight specific contributions
        - Future collaboration mention
        - Warm closing`,
      
      inquiry_response: `
        - Acknowledge inquiry
        - Provide requested information
        - Additional resources
        - Invitation for further questions
        - Professional tone`,
      
      general_update: `
        - Clear subject/purpose
        - Relevant information
        - Action items if any
        - Timeline
        - Contact for questions`,
      
      contract_discussion: `
        - Professional greeting
        - Contract/terms overview
        - Key points to discuss
        - Meeting/call proposal
        - Legal considerations note`,
    };
  }
  
  /**
   * Get language description
   */
  private getLanguageDescription(language: string): string {
    switch (language) {
      case 'hi':
        return 'Pure Hindi in Devanagari script';
      case 'en-hi':
        return 'Hinglish - Natural mix of English and Hindi as commonly used in Mumbai';
      default:
        return 'Professional English';
    }
  }
  
  /**
   * Validate message result
   */
  private validateMessageResult(result: any): GeneratedMessageType {
    return {
      subject: result.subject || 'Message from CastMatch',
      body: result.body || '',
      smsVersion: result.smsVersion || this.truncateForSMS(result.body),
      whatsappVersion: result.whatsappVersion || result.body,
      emailHtml: result.emailHtml || this.convertToHtml(result.body),
      tags: result.tags || [],
      estimatedReadTime: result.estimatedReadTime || this.estimateReadTime(result.body),
      culturalNotes: result.culturalNotes || [],
    };
  }
  
  /**
   * Truncate message for SMS
   */
  private truncateForSMS(message: string): string {
    if (message.length <= 160) return message;
    return message.substring(0, 157) + '...';
  }
  
  /**
   * Convert plain text to HTML
   */
  private convertToHtml(text: string): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          ${text.split('\n').map(para => `<p>${para}</p>`).join('')}
        </body>
      </html>
    `;
  }
  
  /**
   * Estimate reading time
   */
  private estimateReadTime(text: string): number {
    const wordsPerMinute = 200;
    const wordCount = text.split(/\s+/).length;
    return Math.ceil((wordCount / wordsPerMinute) * 60);
  }
  
  /**
   * Generate bulk messages
   */
  async generateBulkMessages(
    recipients: Array<{ name: string; email: string; context: any }>,
    template: CommunicationInputType
  ): Promise<GeneratedMessageType[]> {
    const messages: GeneratedMessageType[] = [];
    
    // Process in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      const batchPromises = batch.map(recipient =>
        this.generateMessage({
          ...template,
          recipient: {
            ...template.recipient,
            name: recipient.name,
            email: recipient.email,
          },
          context: {
            ...template.context,
            ...recipient.context,
          },
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      messages.push(...batchResults);
      
      // Add delay between batches
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return messages;
  }
  
  /**
   * Generate email signature
   */
  async generateSignature(
    name: string,
    role: string,
    company: string = 'CastMatch'
  ): Promise<string> {
    return `
Best regards,
${name}
${role}
${company}
Mumbai, India

---
This email was sent through CastMatch - Your AI-powered casting platform
    `.trim();
  }
  
  /**
   * Translate message
   */
  async translateMessage(
    message: string,
    fromLang: string,
    toLang: string
  ): Promise<string> {
    const prompt = `Translate this ${fromLang} message to ${toLang}. Maintain the professional tone and context for the Mumbai entertainment industry:

"${message}"

Provide only the translation, no explanations.`;
    
    const response = await withRetry(async () => {
      return await this.openai.chat.completions.create({
        model: AI_MODELS.chat,
        messages: [
          { role: 'system', content: 'You are a professional translator for the entertainment industry.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });
    });
    
    return response.choices[0].message.content || message;
  }
}