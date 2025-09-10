import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORGANIZATION,
});

export const AGENT_CONFIG = {
  model: 'gpt-4-turbo-preview',
  temperature: 0.3,
  maxTokens: 4096,
  responseFormat: { type: 'json_object' as const },
  timeout: 60000,
};

export const CASTMATCH_CONFIG = {
  apiUrl: process.env.CASTMATCH_API_URL || 'http://localhost:3001/api',
  dbUrl: process.env.CASTMATCH_DB_URL,
  maxConcurrentTasks: parseInt(process.env.AGENT_MAX_CONCURRENT_TASKS || '10'),
};

export const INTEGRATION_CONFIG = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
  },
};