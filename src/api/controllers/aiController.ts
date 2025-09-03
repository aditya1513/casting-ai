import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import AIService from '../../services/ai/aiService';
import { UserBehaviorEvent } from '../../services/ai/types';

const prisma = new PrismaClient();
let aiService: AIService;

const initializeAI = async () => {
  if (!aiService) {
    aiService = new AIService();
    await aiService.initialize();
  }
  return aiService;
};

export const trackUserBehavior = async (req: Request, res: Response) => {
  try {
    const ai = await initializeAI();
    const { userId, sessionId, eventType, eventData, metadata } = req.body;

    const event: UserBehaviorEvent = {
      userId,
      sessionId,
      eventType,
      eventData,
      timestamp: new Date(),
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || '',
        ...metadata,
      },
    };

    await ai.trackUserBehavior(event);

    res.status(200).json({
      success: true,
      message: 'Event tracked successfully',
    });
  } catch (error) {
    console.error('Error tracking user behavior:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track user behavior',
    });
  }
};

export const analyzeProfile = async (req: Request, res: Response) => {
  try {
    const ai = await initializeAI();
    const { userId } = req.params;

    if (!userId) {
      throw new Error('User ID is required');
    }
    const profileAnalysis = await ai.analyzeProfileQuality(userId);

    res.status(200).json({
      success: true,
      data: profileAnalysis,
    });
  } catch (error) {
    console.error('Error analyzing profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze profile',
    });
  }
};

export const validateProfileWithExplanation = async (req: Request, res: Response) => {
  try {
    const ai = await initializeAI();
    const { userId } = req.params;

    if (!userId) {
      throw new Error('User ID is required');
    }
    const validation = await ai.validateProfileWithExplanation(userId);

    res.status(200).json({
      success: true,
      data: validation,
    });
  } catch (error) {
    console.error('Error validating profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate profile',
    });
  }
};

export const inferProfileData = async (req: Request, res: Response) => {
  try {
    const ai = await initializeAI();
    const { userId } = req.params;

    if (!userId) {
      throw new Error('User ID is required');
    }
    const inferences = await ai.inferProfileData(userId);

    res.status(200).json({
      success: true,
      data: inferences,
    });
  } catch (error) {
    console.error('Error inferring profile data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to infer profile data',
    });
  }
};

export const sendSmartNotification = async (req: Request, res: Response) => {
  try {
    const ai = await initializeAI();
    const { userId } = req.params;
    const { content, options } = req.body;

    if (!userId) {
      throw new Error('User ID is required');
    }
    await ai.sendSmartNotification(userId, content, options);

    res.status(200).json({
      success: true,
      message: 'Notification sent successfully',
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send notification',
    });
  }
};

export const personalizeContent = async (req: Request, res: Response) => {
  try {
    const ai = await initializeAI();
    const { userId } = req.params;
    const { baseContent } = req.body;

    if (!userId) {
      throw new Error('User ID is required');
    }
    const personalized = await ai.personalizeNotificationContent(userId, baseContent);

    res.status(200).json({
      success: true,
      data: personalized,
    });
  } catch (error) {
    console.error('Error personalizing content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to personalize content',
    });
  }
};

export const predictOptimalTiming = async (req: Request, res: Response) => {
  try {
    const ai = await initializeAI();
    const { userId } = req.params;
    const { content } = req.body;

    if (!userId) {
      throw new Error('User ID is required');
    }
    const timing = await ai.predictOptimalNotificationTiming(userId, content);

    res.status(200).json({
      success: true,
      data: timing,
    });
  } catch (error) {
    console.error('Error predicting timing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to predict optimal timing',
    });
  }
};

export const predictChurn = async (req: Request, res: Response) => {
  try {
    const ai = await initializeAI();
    const { userId } = req.params;

    if (!userId) {
      throw new Error('User ID is required');
    }
    const churnPrediction = await ai.predictChurn(userId);

    res.status(200).json({
      success: true,
      data: churnPrediction,
    });
  } catch (error) {
    console.error('Error predicting churn:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to predict churn',
    });
  }
};

export const identifyUserSegments = async (req: Request, res: Response) => {
  try {
    const ai = await initializeAI();
    const { userId } = req.params;

    if (!userId) {
      throw new Error('User ID is required');
    }
    const segments = await ai.identifyUserSegments(userId);

    res.status(200).json({
      success: true,
      data: segments,
    });
  } catch (error) {
    console.error('Error identifying user segments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to identify user segments',
    });
  }
};

export const getUserJourney = async (req: Request, res: Response) => {
  try {
    const ai = await initializeAI();
    const { userId } = req.params;

    if (!userId) {
      throw new Error('User ID is required');
    }
    const journey = await ai.getUserJourney(userId);

    res.status(200).json({
      success: true,
      data: journey,
    });
  } catch (error) {
    console.error('Error getting user journey:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user journey',
    });
  }
};

export const assessSecurityThreat = async (req: Request, res: Response) => {
  try {
    const ai = await initializeAI();
    const { ipAddress, userAgent } = req.body;

    const threat = await ai.assessSecurityThreat(
      ipAddress || req.ip,
      userAgent || req.get('User-Agent')
    );

    res.status(200).json({
      success: true,
      data: threat,
    });
  } catch (error) {
    console.error('Error assessing security threat:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assess security threat',
    });
  }
};

export const detectFraud = async (req: Request, res: Response) => {
  try {
    const ai = await initializeAI();
    const { userId } = req.params;
    const { transactionData } = req.body;

    if (!userId) {
      throw new Error('User ID is required');
    }
    const fraudScore = await ai.detectFraud(userId, transactionData);

    res.status(200).json({
      success: true,
      data: { fraudScore },
    });
  } catch (error) {
    console.error('Error detecting fraud:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect fraud',
    });
  }
};

export const getPlatformMetrics = async (req: Request, res: Response) => {
  try {
    const ai = await initializeAI();
    const metrics = await ai.getPlatformMetrics();

    res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Error getting platform metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get platform metrics',
    });
  }
};

export const getPlatformHealth = async (req: Request, res: Response) => {
  try {
    const ai = await initializeAI();
    const healthCheck = await ai.getPlatformHealthCheck();

    res.status(200).json({
      success: true,
      data: healthCheck,
    });
  } catch (error) {
    console.error('Error getting platform health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get platform health',
    });
  }
};

export const analyzeFeatureAdoption = async (req: Request, res: Response) => {
  try {
    const ai = await initializeAI();
    const { featureName } = req.params;

    if (!featureName) {
      throw new Error('Feature name is required');
    }
    const adoption = await ai.analyzeFeatureAdoption(featureName);

    res.status(200).json({
      success: true,
      data: adoption,
    });
  } catch (error) {
    console.error('Error analyzing feature adoption:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze feature adoption',
    });
  }
};

export const generateBusinessInsights = async (req: Request, res: Response) => {
  try {
    const ai = await initializeAI();
    const insights = await ai.generateBusinessInsights();

    res.status(200).json({
      success: true,
      data: insights,
    });
  } catch (error) {
    console.error('Error generating business insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate business insights',
    });
  }
};

export const updateUserConsent = async (req: Request, res: Response) => {
  try {
    const ai = await initializeAI();
    const { userId } = req.params;
    const { consentType, granted } = req.body;

    if (!userId) {
      throw new Error('User ID is required');
    }
    await ai.updateUserConsent(userId, consentType, granted);

    res.status(200).json({
      success: true,
      message: 'User consent updated successfully',
    });
  } catch (error) {
    console.error('Error updating user consent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user consent',
    });
  }
};

export const requestDataDeletion = async (req: Request, res: Response) => {
  try {
    const ai = await initializeAI();
    const { userId } = req.params;
    const { dataTypes } = req.body;

    if (!userId) {
      throw new Error('User ID is required');
    }
    const deletionRequest = await ai.requestDataDeletion(userId, dataTypes);

    res.status(200).json({
      success: true,
      data: deletionRequest,
    });
  } catch (error) {
    console.error('Error requesting data deletion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to request data deletion',
    });
  }
};

export const generatePrivacyReport = async (req: Request, res: Response) => {
  try {
    const ai = await initializeAI();
    const { userId } = req.params;

    if (!userId) {
      throw new Error('User ID is required');
    }
    const report = await ai.generatePrivacyReport(userId);

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error generating privacy report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate privacy report',
    });
  }
};

export const anonymizeUserData = async (req: Request, res: Response) => {
  try {
    const ai = await initializeAI();
    const { userId } = req.params;

    if (!userId) {
      throw new Error('User ID is required');
    }
    await ai.anonymizeUserData(userId);

    res.status(200).json({
      success: true,
      message: 'User data anonymized successfully',
    });
  } catch (error) {
    console.error('Error anonymizing user data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to anonymize user data',
    });
  }
};

export const runABTest = async (req: Request, res: Response) => {
  try {
    const ai = await initializeAI();
    const { testConfig } = req.body;

    await ai.runABTest(testConfig);

    res.status(200).json({
      success: true,
      message: 'A/B test started successfully',
    });
  } catch (error) {
    console.error('Error running A/B test:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run A/B test',
    });
  }
};

export const getAIInsights = async (req: Request, res: Response) => {
  try {
    const ai = await initializeAI();
    const { scope = 'platform' } = req.query as { scope?: 'user' | 'platform' | 'security' };

    const insights = await ai.getAIInsights(scope);

    res.status(200).json({
      success: true,
      data: insights,
    });
  } catch (error) {
    console.error('Error getting AI insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get AI insights',
    });
  }
};

export const getServiceStatus = async (req: Request, res: Response) => {
  try {
    const ai = await initializeAI();
    const status = await ai.getServiceStatus();

    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Error getting service status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get service status',
    });
  }
};

export const cleanupAI = async () => {
  if (aiService) {
    await aiService.cleanup();
  }
};

process.on('SIGTERM', cleanupAI);
process.on('SIGINT', cleanupAI);