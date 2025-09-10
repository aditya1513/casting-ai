import { Router } from 'express';
import * as aiController from '../controllers/aiController';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body, param, query } from 'express-validator';

const router = Router();

const eventValidation = [
  body('userId').isString().notEmpty().withMessage('User ID is required'),
  body('sessionId').isString().notEmpty().withMessage('Session ID is required'),
  body('eventType').isString().notEmpty().withMessage('Event type is required'),
  body('eventData').isObject().withMessage('Event data must be an object'),
];

const userIdValidation = [
  param('userId').isString().notEmpty().withMessage('User ID is required'),
];

const notificationValidation = [
  body('content.subject').isString().notEmpty().withMessage('Subject is required'),
  body('content.body').isString().notEmpty().withMessage('Body is required'),
  body('content.priority').isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
];

const consentValidation = [
  body('consentType').isIn(['dataCollection', 'analytics', 'marketing', 'thirdPartySharing']).withMessage('Invalid consent type'),
  body('granted').isBoolean().withMessage('Granted must be a boolean'),
];

router.post(
  '/track',
  authenticate,
  eventValidation,
  validateRequest,
  aiController.trackUserBehavior
);

router.get(
  '/profile/:userId/analyze',
  authenticate,
  userIdValidation,
  validateRequest,
  aiController.analyzeProfile
);

router.get(
  '/profile/:userId/validate',
  authenticate,
  userIdValidation,
  validateRequest,
  aiController.validateProfileWithExplanation
);

router.get(
  '/profile/:userId/infer',
  authenticate,
  userIdValidation,
  validateRequest,
  aiController.inferProfileData
);

router.post(
  '/notifications/:userId/send',
  authenticate,
  userIdValidation,
  notificationValidation,
  validateRequest,
  aiController.sendSmartNotification
);

router.post(
  '/notifications/:userId/personalize',
  authenticate,
  userIdValidation,
  body('baseContent').isObject().withMessage('Base content is required'),
  validateRequest,
  aiController.personalizeContent
);

router.post(
  '/notifications/:userId/timing',
  authenticate,
  userIdValidation,
  body('content').isObject().withMessage('Content is required'),
  validateRequest,
  aiController.predictOptimalTiming
);

router.get(
  '/analytics/:userId/churn',
  authenticate,
  userIdValidation,
  validateRequest,
  aiController.predictChurn
);

router.get(
  '/analytics/:userId/segments',
  authenticate,
  userIdValidation,
  validateRequest,
  aiController.identifyUserSegments
);

router.get(
  '/analytics/:userId/journey',
  authenticate,
  userIdValidation,
  validateRequest,
  aiController.getUserJourney
);

router.post(
  '/security/threat-assessment',
  authenticate,
  body('ipAddress').optional().isIP().withMessage('Invalid IP address'),
  validateRequest,
  aiController.assessSecurityThreat
);

router.post(
  '/security/:userId/fraud-detection',
  authenticate,
  userIdValidation,
  body('transactionData').isObject().withMessage('Transaction data is required'),
  validateRequest,
  aiController.detectFraud
);

router.get(
  '/platform/metrics',
  authenticate,
  aiController.getPlatformMetrics
);

router.get(
  '/platform/health',
  authenticate,
  aiController.getPlatformHealth
);

router.get(
  '/platform/features/:featureName/adoption',
  authenticate,
  param('featureName').isString().notEmpty().withMessage('Feature name is required'),
  validateRequest,
  aiController.analyzeFeatureAdoption
);

router.get(
  '/platform/business-insights',
  authenticate,
  aiController.generateBusinessInsights
);

router.post(
  '/privacy/:userId/consent',
  authenticate,
  userIdValidation,
  consentValidation,
  validateRequest,
  aiController.updateUserConsent
);

router.post(
  '/privacy/:userId/delete',
  authenticate,
  userIdValidation,
  body('dataTypes').optional().isArray().withMessage('Data types must be an array'),
  validateRequest,
  aiController.requestDataDeletion
);

router.get(
  '/privacy/:userId/report',
  authenticate,
  userIdValidation,
  validateRequest,
  aiController.generatePrivacyReport
);

router.post(
  '/privacy/:userId/anonymize',
  authenticate,
  userIdValidation,
  validateRequest,
  aiController.anonymizeUserData
);

router.post(
  '/testing/ab-test',
  authenticate,
  body('testConfig').isObject().withMessage('Test config is required'),
  body('testConfig.name').isString().notEmpty().withMessage('Test name is required'),
  body('testConfig.variants').isArray().withMessage('Variants must be an array'),
  validateRequest,
  aiController.runABTest
);

router.get(
  '/insights',
  authenticate,
  query('scope').optional().isIn(['user', 'platform', 'security']).withMessage('Invalid scope'),
  validateRequest,
  aiController.getAIInsights
);

router.get(
  '/status',
  authenticate,
  aiController.getServiceStatus
);

export default router;